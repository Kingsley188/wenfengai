# 文峰 AI - Zeabur 部署指南

> 适用于 **全量迁移**（前端 + 后端 + 数据库）到 Zeabur 的部署说明

---

## 📋 部署架构

- **后端**：Docker（FastAPI + NotebookLM），端口 `8000`
- **前端**：Vite 静态站点
- **数据库**：Zeabur MySQL
- **PDF 存储**：Zeabur Volume 挂载到 `/app/public/generated`

---

## 🚀 Zeabur 部署步骤

### 步骤 1：准备 NotebookLM 认证（必需）

```bash
# 本地执行（生成 base64）
cat ~/.notebooklm/storage_state.json | base64
```

复制整段输出，稍后填入 `NOTEBOOKLM_AUTH`。

---

### 步骤 2：创建 Zeabur 项目（美国区）

在 Zeabur 创建项目，区域选择 **美国（Silicon Valley）** 或你已有的美国机房区域。

---

### 步骤 3：创建 MySQL 服务

在项目里新增 **MySQL 服务**，Zeabur 会自动提供变量（如 `MYSQL_HOST`、`MYSQL_USER` 等）。

后端 `DATABASE_URL` 推荐拼接：

```
mysql+pymysql://${MYSQL_USER}:${MYSQL_PASSWORD}@${MYSQL_HOST}:${MYSQL_PORT}/${MYSQL_DATABASE}
```

---

### 步骤 4：部署后端（Docker）

1. **Add Service → Git**，选择仓库与 `main` 分支  
2. 根目录 `/`，Zeabur 会识别 `Dockerfile.backend`  
3. 设置环境变量（示例）：

```
NOTEBOOKLM_AUTH=（步骤1生成的 base64）
DATABASE_URL=（步骤3拼接的连接串）
SECRET_KEY=（你自己的随机字符串）
```

> ⚠️ 不需要再设置 `NOTEBOOKLM_HOMEPAGE_URL` / `NOTEBOOKLM_*_URL` 代理变量（海外环境直接访问 Google）。

---

### 步骤 5：挂载 Volume（PDF 持久化）

后端需要把生成的 PDF 写入 `/app/public/generated`。  
请在后端服务中 **挂载 Volume** 到：

```
/app/public/generated
```

> 注意：  
> - 不挂载会导致重启或重建后 PDF 丢失  
> - 挂载时目录会被 Volume 覆盖，若有旧文件请先备份

---

### 步骤 6：部署前端（静态）

1. **Add Service → Git**，选择同一仓库  
2. 根目录 `/`  
3. 设置环境变量：

```
ZBPACK_OUTPUT_DIR=dist
VITE_BACKEND_URL=https://你的后端域名
VITE_SUPABASE_URL=https://wligoqkigjcbpbjgqyww.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=你的 Supabase Key
```

> 如果你暂时不用 Supabase，可先不填 `VITE_SUPABASE_*`。

---

### 步骤 7：配置域名

为后端和前端分别绑定域名（或使用 Zeabur 提供的域名）。

---

### 步骤 8：验证

```bash
curl https://你的后端域名/api/health
```

前端打开页面，上传文件 → 生成 PDF → 下载测试。

---

## ⚠️ 重要注意事项

### 1. NotebookLM 认证会过期

建议每 1–2 周更新一次：

```bash
notebooklm login
cat ~/.notebooklm/storage_state.json | base64
```

更新 Zeabur 的 `NOTEBOOKLM_AUTH` 并重启后端。

### 2. 后端构建较慢

Playwright + Chromium 首次构建可能需要 5–10 分钟。

### 3. PDF 存储是本地卷

PDF 仅保存在挂载的 Volume 里，注意备份策略。

---

## 🔧 故障排查

### 后端部署失败

检查：
- `Dockerfile.backend` 是否存在
- `requirements.txt` 是否完整
- 环境变量是否配置

### 认证错误 / 下载失败

重新生成 `NOTEBOOKLM_AUTH`，更新后端环境变量并重启。

### 前端无法调用后端

检查：
- `VITE_BACKEND_URL` 是否指向正确域名
- 后端是否正常运行
- 后端域名是否已启用 HTTPS

---

## 📝 配置摘要（示例）

```
后端环境变量:
  NOTEBOOKLM_AUTH=base64(...)
  DATABASE_URL=mysql+pymysql://...
  SECRET_KEY=...

前端环境变量:
  ZBPACK_OUTPUT_DIR=dist
  VITE_BACKEND_URL=https://api.example.com
  VITE_SUPABASE_URL=https://wligoqkigjcbpbjgqyww.supabase.co
  VITE_SUPABASE_PUBLISHABLE_KEY=...

后端 Volume:
  /app/public/generated
```
