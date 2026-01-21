# 文峰 AI 海外服务器部署指南

> 最后更新: 2026-01-21
> 项目: WenfengAI - NotebookLM PPT 生成平台

---

## 📋 部署前准备清单

### 必须准备的文件

| 文件 | 位置 | 说明 |
|------|------|------|
| `storage_state.json` | `~/.notebooklm/storage_state.json` | ⚠️ **最关键！** Google 登录凭据 |
| `.env` | 项目根目录 | Supabase 配置 |

### 你的 Supabase 配置

```env
VITE_SUPABASE_URL=https://wligoqkigjcbpbjgqyww.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=你的密钥
```

---

## 🚀 方案一：Docker 部署（推荐）

### 步骤 1: 打包项目

在本地 Mac 上执行：

```bash
# 进入项目目录
cd /Users/kingsley/Documents/next/wenfengAI/wenfengai-main

# 打包（排除不需要的文件）
tar -czf wenfengai.tar.gz \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='notebooklm-py-main/.venv' \
  --exclude='backend/__pycache__' \
  .
```

### 步骤 2: 上传到服务器

```bash
# 上传项目
scp wenfengai.tar.gz root@你的服务器IP:~/

# 上传 NotebookLM 认证文件 (非常重要！)
scp ~/.notebooklm/storage_state.json root@你的服务器IP:~/
```

### 步骤 3: 服务器上解压和配置

```bash
# SSH 登录服务器
ssh root@你的服务器IP

# 创建项目目录
mkdir -p /opt/wenfengai
cd /opt/wenfengai

# 解压
tar -xzf ~/wenfengai.tar.gz

# 创建认证目录并复制认证文件
mkdir -p notebooklm-auth
cp ~/storage_state.json notebooklm-auth/

# 创建环境变量文件
cat > .env << 'EOF'
VITE_SUPABASE_URL=https://wligoqkigjcbpbjgqyww.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=你的Supabase密钥
VITE_BACKEND_URL=http://你的服务器IP:8000
EOF
```

### 步骤 4: 安装 Docker

```bash
# 安装 Docker
curl -fsSL https://get.docker.com | sh

# 安装 Docker Compose
apt update && apt install -y docker-compose
```

### 步骤 5: 启动服务

```bash
# 构建并启动
docker-compose up -d --build

# 查看日志
docker-compose logs -f

# 检查服务状态
docker-compose ps
```

### 步骤 6: 验证

```bash
# 测试后端健康检查
curl http://localhost:8000/api/health

# 测试前端
curl http://localhost
```

---

## 🔧 方案二：直接运行（无 Docker）

如果服务器不支持 Docker，可以直接运行：

### 安装依赖

```bash
# 安装 Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 安装 Python 3.11+
apt install -y python3.11 python3.11-venv python3-pip

# 安装 Playwright 依赖
apt install -y libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
  libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2
```

### 部署后端

```bash
cd /opt/wenfengai/backend

# 创建虚拟环境
python3.11 -m venv venv
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt
pip install "notebooklm-py[browser]"
playwright install chromium --with-deps

# 复制认证文件
mkdir -p ~/.notebooklm
cp /opt/wenfengai/notebooklm-auth/storage_state.json ~/.notebooklm/

# 启动后端（使用 screen 保持运行）
screen -S wenfeng-backend
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000
# 按 Ctrl+A 然后 D 退出 screen
```

### 部署前端

```bash
cd /opt/wenfengai

# 安装依赖
npm install

# 构建
export VITE_BACKEND_URL=http://你的服务器IP:8000
export VITE_SUPABASE_URL=https://wligoqkigjcbpbjgqyww.supabase.co
export VITE_SUPABASE_PUBLISHABLE_KEY=你的密钥
npm run build

# 安装 Nginx
apt install -y nginx

# 复制构建产物
cp -r dist/* /var/www/html/

# 配置 Nginx
cp nginx.conf /etc/nginx/sites-available/wenfengai
ln -sf /etc/nginx/sites-available/wenfengai /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx
```

---

## ⚠️ 关键问题和解决方案

### 问题 1: NotebookLM 认证过期

**症状**: 
```
Authentication expired or invalid. Run 'notebooklm login' to re-authenticate.
```

**解决方案**:
1. 在**本地电脑**重新运行 `notebooklm login`
2. 登录完成后，复制新的认证文件到服务器：
   ```bash
   scp ~/.notebooklm/storage_state.json root@服务器IP:/opt/wenfengai/notebooklm-auth/
   
   # 如果用 Docker
   docker-compose restart backend
   
   # 如果直接运行
   # 重启后端服务
   ```

> 💡 **提示**: 认证大约每 1-2 周过期一次

### 问题 2: Google 拒绝请求 (403)

**可能原因**:
- 服务器 IP 被 Google 风控
- 请求过于频繁

**解决方案**:
- 等待一段时间后重试
- 尝试更换服务器 IP
- 减少请求频率

### 问题 3: PDF 生成失败

**检查步骤**:
```bash
# 查看后端日志
docker-compose logs backend

# 或者
tail -f /var/log/wenfeng-backend.log
```

---

## 🔐 安全配置

### 配置 HTTPS（推荐）

```bash
# 安装 Certbot
apt install -y certbot python3-certbot-nginx

# 获取 SSL 证书（需要域名）
certbot --nginx -d your-domain.com

# 自动续期
certbot renew --dry-run
```

### 配置防火墙

```bash
# 只开放必要端口
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS
ufw enable
```

---

## 📊 运维命令

```bash
# 查看所有服务状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 重启特定服务
docker-compose restart backend
docker-compose restart frontend

# 停止所有服务
docker-compose down

# 重新构建并启动
docker-compose up -d --build

# 清理未使用的镜像
docker system prune -f
```

---

## 🔄 更新部署

当需要更新代码时：

```bash
# 本地打包新版本
tar -czf wenfengai-update.tar.gz --exclude='node_modules' --exclude='.git' .

# 上传到服务器
scp wenfengai-update.tar.gz root@服务器IP:/opt/

# 在服务器上
cd /opt/wenfengai
docker-compose down
tar -xzf /opt/wenfengai-update.tar.gz
docker-compose up -d --build
```

---

## 📞 故障排查

如果遇到问题，按以下顺序检查：

1. **检查服务状态**: `docker-compose ps`
2. **查看日志**: `docker-compose logs backend`
3. **检查认证**: 确认 `storage_state.json` 存在且未过期
4. **测试网络**: `curl https://notebooklm.google.com` 是否通
5. **重启服务**: `docker-compose restart`

---

## 📝 你的项目特定信息

- **GitHub 仓库**: https://github.com/Kingsley188/wenfengai
- **Supabase 项目 ID**: wligoqkigjcbpbjgqyww
- **前端端口**: 80 (HTTP) / 443 (HTTPS)
- **后端端口**: 8000
- **认证文件位置**: `/opt/wenfengai/notebooklm-auth/storage_state.json`
