# 文峰 AI - Zeabur 部署指南

> 专门针对 Zeabur 平台的部署说明

---

## 📋 部署架构

在 Zeabur 上需要部署 **两个服务**：

| 服务 | 类型 | 端口 | 说明 |
|------|------|------|------|
| **后端** | Docker | 8000 | FastAPI + NotebookLM |
| **前端** | Node.js/Static | 80 | React 静态网站 |

---

## 🚀 Zeabur 部署步骤

### 步骤 1: 准备认证文件 (关键！)

首先需要将本地的 NotebookLM 认证文件转换为 base64：

```bash
# 在本地执行
cat ~/.notebooklm/storage_state.json | base64
```

**复制输出的整段 base64 字符串**，稍后需要配置到 Zeabur 环境变量。

---

### 步骤 2: 在 Zeabur 创建项目

1. 登录 [Zeabur Dashboard](https://dash.zeabur.com)
2. 点击 **Create Project**
3. 选择区域（推荐 **Silicon Valley** 或 **Singapore**）

---

### 步骤 3: 部署后端服务

#### 方法 A: 从 GitHub 部署（推荐）

1. 点击 **Add Service** → **Git**
2. 选择你的仓库 `Kingsley188/wenfengai`
3. 选择分支 `main`
4. **Root Directory** 设置为: `/` (根目录)
5. Zeabur 会自动检测 `Dockerfile.backend`

#### 方法 B: 使用 Docker Image

如果方法 A 不工作，可以手动构建：

```bash
# 本地构建并推送到 Docker Hub
docker build -f Dockerfile.backend -t yourusername/wenfengai-backend .
docker push yourusername/wenfengai-backend

# 在 Zeabur 选择 Docker Image 部署
```

#### 配置后端环境变量

在 Zeabur 服务设置中添加：

| 变量名 | 值 | 必须 |
|--------|-----|------|
| `NOTEBOOKLM_AUTH` | (步骤1生成的base64字符串) | ✅ |

---

### 步骤 4: 部署前端服务

1. 点击 **Add Service** → **Git**
2. 选择同一个仓库
3. **Root Directory** 保持默认 `/`
4. Zeabur 会检测到这是一个 Node.js/Vite 项目

#### 配置前端环境变量

| 变量名 | 值 | 必须 |
|--------|-----|------|
| `VITE_BACKEND_URL` | `https://你的后端域名` | ✅ |
| `VITE_SUPABASE_URL` | `https://wligoqkigjcbpbjgqyww.supabase.co` | ✅ |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | 你的 Supabase 密钥 | ✅ |

---

### 步骤 5: 配置域名

1. 点击后端服务 → **Networking** → **Add Domain**
2. 可以使用 Zeabur 提供的免费域名，如: `wenfeng-api.zeabur.app`
3. 同样为前端配置域名: `wenfeng.zeabur.app`

---

### 步骤 6: 更新前端 VITE_BACKEND_URL

获得后端域名后，更新前端环境变量：

```
VITE_BACKEND_URL=https://wenfeng-api.zeabur.app
```

重新部署前端服务。

---

## ⚠️ 重要注意事项

### 1. NotebookLM 认证会过期

每 1-2 周需要更新认证：

```bash
# 本地重新登录
notebooklm login

# 生成新的 base64
cat ~/.notebooklm/storage_state.json | base64

# 在 Zeabur 更新 NOTEBOOKLM_AUTH 环境变量
# 然后重启后端服务
```

### 2. 后端构建可能较慢

后端需要安装 Playwright + Chromium，首次构建可能需要 5-10 分钟。

### 3. 检查日志

如果出现问题：
1. 在 Zeabur 点击服务 → **Logs**
2. 查看是否有认证错误

---

## 🔧 故障排查

### 问题: 后端部署失败

**检查点**:
- Dockerfile.backend 是否正确
- requirements.txt 是否存在

### 问题: 认证错误 403

**解决**: 
1. 本地重新运行 `notebooklm login`
2. 更新 `NOTEBOOKLM_AUTH` 环境变量
3. 重启后端服务

### 问题: 前端无法连接后端

**检查**:
1. 后端服务是否正常运行
2. `VITE_BACKEND_URL` 是否正确
3. 后端域名是否配置了 HTTPS

---

## 📝 你的配置摘要

```
GitHub 仓库: https://github.com/Kingsley188/wenfengai
Supabase URL: https://wligoqkigjcbpbjgqyww.supabase.co

后端服务:
  - Dockerfile: Dockerfile.backend
  - 端口: 8000
  - 环境变量: NOTEBOOKLM_AUTH

前端服务:
  - 类型: Node.js/Vite
  - 环境变量: VITE_BACKEND_URL, VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY
```

---

## 🎯 快速命令

```bash
# 生成认证 base64
cat ~/.notebooklm/storage_state.json | base64 | pbcopy
echo "✅ 已复制到剪贴板"

# 测试后端健康
curl https://你的后端域名/api/health
```
