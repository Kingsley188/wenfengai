"""
WenfengAI 后端服务
调用 NotebookLM API 生成 PPT/PDF
"""

import os
import asyncio
import tempfile
import uuid
from pathlib import Path
from typing import Optional
from datetime import datetime

from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

app = FastAPI(
    title="WenfengAI 后端",
    description="调用 NotebookLM API 生成 PPT/PDF",
    version="0.1.0"
)

# Static files for generated PDFs
public_dir = Path(__file__).parent / "public" / "generated"
public_dir.mkdir(parents=True, exist_ok=True)
app.mount("/generated", StaticFiles(directory=public_dir), name="generated")

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应限制为具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 任务状态存储（生产环境应使用 Redis）
tasks: dict = {}


class TaskStatus(BaseModel):
    task_id: str
    status: str  # pending, processing, completed, failed
    progress: int  # 0-100
    result_url: Optional[str] = None
    error: Optional[str] = None
    created_at: str
    updated_at: str


class GenerateRequest(BaseModel):
    notebook_id: Optional[str] = None
    title: str = "WenfengAI 生成"


@app.get("/api/health")
async def health_check():
    """健康检查"""
    return {"status": "ok", "timestamp": datetime.now().isoformat()}


@app.get("/test")
async def test_page():
    """测试页面 - 直接测试 NotebookLM 生成"""
    return FileResponse(Path(__file__).parent / "test_page.html")



@app.post("/api/generate-slides")
async def generate_slides(
    files: list[UploadFile] = File(...),
    background_tasks: BackgroundTasks = None,
    title: str = "WenfengAI 生成"
):
    """
    上传文件并生成 Slide Deck PDF
    
    流程：
    1. 接收上传的文件
    2. 创建 NotebookLM 笔记本
    3. 添加文件作为源
    4. 生成 Slide Deck
    5. 下载 PDF 并上传到 Supabase Storage
    6. 返回 PDF URL
    """
    if not files:
        raise HTTPException(status_code=400, detail="请上传至少一个文件")
    
    # 创建任务
    task_id = str(uuid.uuid4())
    now = datetime.now().isoformat()
    tasks[task_id] = TaskStatus(
        task_id=task_id,
        status="pending",
        progress=0,
        created_at=now,
        updated_at=now
    )
    
    # 保存上传的文件到临时目录
    temp_dir = tempfile.mkdtemp()
    file_paths = []
    
    for file in files:
        file_path = Path(temp_dir) / file.filename
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
        file_paths.append(str(file_path))
    
    # 在后台执行生成任务
    if background_tasks:
        background_tasks.add_task(
            process_generation,
            task_id=task_id,
            file_paths=file_paths,
            title=title,
            temp_dir=temp_dir
        )
    else:
        # 如果没有后台任务支持，直接执行（阻塞）
        asyncio.create_task(
            process_generation(
                task_id=task_id,
                file_paths=file_paths,
                title=title,
                temp_dir=temp_dir
            )
        )
    
    return {
        "task_id": task_id,
        "status": "pending",
        "message": "生成任务已创建，请通过 /api/status/{task_id} 查询进度"
    }


async def process_generation(
    task_id: str,
    file_paths: list[str],
    title: str,
    temp_dir: str
):
    """
    后台处理生成任务
    """
    try:
        # 更新状态：处理中
        tasks[task_id].status = "processing"
        tasks[task_id].progress = 10
        tasks[task_id].updated_at = datetime.now().isoformat()
        
        # 导入 NotebookLM 客户端
        from notebooklm import NotebookLMClient
        
        async with await NotebookLMClient.from_storage() as client:
            # 0. 强制设置输出语言为中文
            await client.settings.set_output_language("zh_Hans")
            
            # 1. 创建笔记本
            tasks[task_id].progress = 20
            nb = await client.notebooks.create(title)
            
            # 2. 添加文件作为源 (使用 wait=True 等待处理完成)
            for i, file_path in enumerate(file_paths):
                tasks[task_id].progress = 20 + int(30 * (i + 1) / len(file_paths))
                # wait=True 确保文件处理完成后再继续，避免 "Slide Deck generation failed"
                await client.sources.add_file(nb.id, Path(file_path), wait=True, wait_timeout=180)
            
            # 3. 生成 Slide Deck
            tasks[task_id].progress = 60
            status = await client.artifacts.generate_slide_deck(
                nb.id,
                instructions="请生成一份详细的演示文稿，使用简体中文，包含丰富的内容和专业的结构。"
            )
            
            # 4. 等待生成完成（最多 10 分钟）
            tasks[task_id].progress = 70
            await client.artifacts.wait_for_completion(
                nb.id, 
                status.task_id, 
                timeout=600
            )
            
            # 5. 下载 PDF
            tasks[task_id].progress = 85
            output_path = Path(temp_dir) / f"{task_id}.pdf"
            await client.artifacts.download_slide_deck(nb.id, str(output_path))
            
            # 6. TODO: 上传到 Supabase Storage
            # 目前先返回本地路径（后续需要实现上传）
            tasks[task_id].progress = 95
            
            # 临时：将文件复制到 public 目录
            public_path = public_dir / f"{task_id}.pdf"
            
            import shutil
            shutil.copy(output_path, public_path)
            
            # 更新状态：完成
            tasks[task_id].status = "completed"
            tasks[task_id].progress = 100
            tasks[task_id].result_url = f"/generated/{task_id}.pdf"
            tasks[task_id].updated_at = datetime.now().isoformat()
            
    except Exception as e:
        # 更新状态：失败
        tasks[task_id].status = "failed"
        tasks[task_id].error = str(e)
        tasks[task_id].updated_at = datetime.now().isoformat()
        
    finally:
        # 清理临时文件
        import shutil
        try:
            shutil.rmtree(temp_dir)
        except:
            pass


@app.get("/api/status/{task_id}")
async def get_task_status(task_id: str):
    """查询任务状态"""
    if task_id not in tasks:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    return tasks[task_id]


@app.get("/api/tasks")
async def list_tasks():
    """列出所有任务（调试用）"""
    return list(tasks.values())


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
