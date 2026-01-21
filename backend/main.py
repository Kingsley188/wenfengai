"""
WenfengAI 后端服务 (MySQL 版)
调用 NotebookLM API 生成 PPT/PDF，使用本地 MySQL 存储
"""

import os
import asyncio
import tempfile
import uuid
from pathlib import Path
from typing import Optional, List
from datetime import datetime, timedelta

from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv

from sqlalchemy.orm import Session
from passlib.context import CryptContext
from jose import JWTError, jwt
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm

from database import engine, Base, get_db
from models import User, PPT

# 加载环境变量
load_dotenv()

# 初始化数据库表
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="WenfengAI 后端 (MySQL)",
    description="调用 NotebookLM API 生成 PPT/PDF，本地 MySQL 存储",
    version="0.2.0"
)

# 静态文件
# 静态文件
public_dir = Path(__file__).parent / "public" / "generated"
public_dir.mkdir(parents=True, exist_ok=True)
app.mount("/generated", StaticFiles(directory=public_dir), name="generated")

# Mount /static for manually synced outputs or other static assets
static_dir = Path(__file__).parent.parent / "static"
static_dir.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 认证配置 ---
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 300

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/token")

# --- Pydantic Models ---
class UserCreate(BaseModel):
    username: str
    password: str
    email: Optional[str] = None

class UserOut(BaseModel):
    id: int
    username: str
    email: Optional[str] = None
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class TaskStatus(BaseModel):
    id: str
    title: str
    status: str
    progress: int
    result_url: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# --- 辅助函数 ---
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    user = db.query(User).filter(User.username == token_data.username).first()
    if user is None:
        raise credentials_exception
    return user

# --- Auth Routes ---
@app.post("/api/auth/register", response_model=UserOut)
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = get_password_hash(user.password)
    new_user = User(
        username=user.username,
        email=user.email if user.email else None,  # 使用 None 代替空字符串
        hashed_password=hashed_password
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/api/auth/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/auth/me", response_model=UserOut)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

# --- NotebookLM Auth Routes ---
@app.get("/api/auth/notebooklm/status")
async def get_notebooklm_status(current_user: User = Depends(get_current_user)):
    """检查 NotebookLM 登录状态"""
    auth_path = Path.home() / ".notebooklm" / "storage_state.json"
    exists = auth_path.exists()
    
    info = {
        "is_connected": exists,
        "last_modified": None,
        "error": None,
        "account_info": None
    }
    
    if exists:
        try:
            mtime = auth_path.stat().st_mtime
            info["last_modified"] = datetime.fromtimestamp(mtime).isoformat()
            
            # 基础文件检查
            if auth_path.stat().st_size < 100:
                info["is_connected"] = False
                info["error"] = "认证文件无效或未登录成功"
            else:
                # 尝试从 cookie 中提取一个标识（如 HSID 的前几位）来证明已同步
                import json
                with open(auth_path, 'r') as f:
                    data = json.load(f)
                    # 查找包含 goog 的 cookie
                    cookies = data.get('cookies', [])
                    for c in cookies:
                        if c.get('name') == 'OSID': # OSID 经常存在于 Google 认证中
                            info["account_info"] = "Google 会话已加密同步"
                            break
                    if not info["account_info"] and cookies:
                         info["account_info"] = f"已链接 ({len(cookies)} 个凭证)"
                
        except Exception as e:
            info["is_connected"] = False
            info["error"] = str(e)
            
    return info

@app.post("/api/auth/notebooklm/login")
async def trigger_notebooklm_login(current_user: User = Depends(get_current_user)):
    """触发本地浏览器进行的 NotebookLM 登录"""
    try:
        # 在本地环境下运行 notebooklm login
        # 注意：这会打开一个交互式 CLI，但在 FastAPI 中我们只想触发它弹出浏览器
        # notebooklm login 命令通常会打开浏览器
        import subprocess
        
        # 使用 Popen 防止阻塞，但这个命令需要终端交互以完成最后一步。
        # 不过用户已经在机器上了，他可以直接在弹出的浏览器里操作。
        # 如果是远程服务器，这种方式无效。
        process = subprocess.Popen(
            ["notebooklm", "login", "--auto"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        return {"message": "浏览器已启动，请完成登录操作。", "status": "started"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"无法启动登录流程: {str(e)}")

# --- Task Routes ---
@app.get("/api/health")
async def health_check():
    return {"status": "ok", "timestamp": datetime.now().isoformat(), "db": "mysql"}

@app.get("/api/tasks", response_model=List[TaskStatus])
async def list_tasks(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """列出当前用户的所有任务"""
    tasks = db.query(PPT).filter(PPT.owner_id == current_user.id).order_by(PPT.created_at.desc()).all()
    return tasks

@app.get("/api/status/{task_id}", response_model=TaskStatus)
async def get_task_status(
    task_id: str, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """查询任务状态"""
    task = db.query(PPT).filter(PPT.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    if task.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权访问此任务")
    return task

@app.post("/api/generate-slides")
async def generate_slides(
    files: list[UploadFile] = File(...),
    background_tasks: BackgroundTasks = None,
    title: str = "WenfengAI 生成",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not files:
        raise HTTPException(status_code=400, detail="请上传至少一个文件")
    
    # 创建任务记录
    task_id = str(uuid.uuid4())
    new_task = PPT(
        id=task_id,
        title=title,
        status="pending",
        progress=0,
        owner_id=current_user.id
    )
    db.add(new_task)
    db.commit()
    
    # 保存上传文件
    temp_dir = tempfile.mkdtemp()
    file_paths = []
    
    for file in files:
        file_path = Path(temp_dir) / file.filename
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
        file_paths.append(str(file_path))
    
    # 后台处理
    background_tasks.add_task(
        process_generation,
        task_id=task_id,
        file_paths=file_paths,
        title=title,
        temp_dir=temp_dir
    )
    
    return {
        "task_id": task_id,
        "status": "pending",
        "message": "生成任务已创建"
    }

async def process_generation(
    task_id: str,
    file_paths: list[str],
    title: str,
    temp_dir: str
):
    # 获取新的 DB Session (后台任务中)
    db = next(get_db())
    task = db.query(PPT).filter(PPT.id == task_id).first()
    
    try:
        # 更新状态：处理中
        task.status = "processing"
        task.progress = 10
        db.commit()
        
        # 导入 NotebookLM 客户端
        from notebooklm import NotebookLMClient
        
        # 使用更长的超时以应对 NotebookLM API 的慢速响应
        async with await NotebookLMClient.from_storage(timeout=300) as client:
            # 安全设置输出语言 (如果 API 支持)
            if hasattr(client, "settings"):
                try:
                    await client.settings.set_output_language("zh_Hans")
                except Exception as se:
                    logger.warning(f"Failed to set output language: {se}")
            
            # 1. 创建笔记本
            task.progress = 20
            db.commit()
            nb = await client.notebooks.create(title)
            
            # 2. 添加文件
            for i, file_path in enumerate(file_paths):
                task.progress = 20 + int(30 * (i + 1) / len(file_paths))
                db.commit()
                await client.sources.add_file(nb.id, Path(file_path), wait=True, wait_timeout=600)
            
            # 3. 生成 Slide Deck
            task.progress = 60
            db.commit()
            status = await client.artifacts.generate_slide_deck(
                nb.id,
                instructions="请生成一份详细的演示文稿，使用简体中文，包含丰富的内容和专业的结构。"
            )
            
            # 4. 等待生成
            task.progress = 70
            db.commit()
            
            # 使用超级长的超时（30分钟），因为服务器生成可能很慢
            # NotebookLM 可能会在生成过程中稍作暂停，所以我们需要长轮询
            await client.artifacts.wait_for_completion(nb.id, status.task_id, timeout=1800)
            
            # 5. 下载 PDF
            task.progress = 85
            db.commit()
            output_path = Path(temp_dir) / f"{task_id}.pdf"
            await client.artifacts.download_slide_deck(nb.id, str(output_path))
            
            # 6. 移动到 public 目录
            task.progress = 95
            db.commit()
            public_path = public_dir / f"{task_id}.pdf"
            import shutil
            shutil.copy(output_path, public_path)
            
            # 完成
            task.status = "completed"
            task.progress = 100
            task.result_url = f"/generated/{task_id}.pdf"
            task.error_message = None
            db.commit()
            
    except Exception as e:
        task.status = "failed"
        task.error_message = str(e)
        db.commit()
        
    finally:
        db.close()
        import shutil
        try:
            shutil.rmtree(temp_dir)
        except:
            pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
