# WenfengAI 后端服务

基于 FastAPI 的后端服务，用于调用 NotebookLM API 生成 PPT/PDF。

## 安装

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## 运行

```bash
uvicorn main:app --reload --port 8000
```

## API 端点

- `POST /api/generate-slides` - 上传文件并生成 Slide Deck PDF
- `GET /api/status/{task_id}` - 查询生成任务状态
- `GET /api/health` - 健康检查
