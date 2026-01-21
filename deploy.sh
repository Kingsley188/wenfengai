#!/bin/bash

# ==============================================
# 文峰 AI 海外服务器部署脚本
# ==============================================

set -e

echo "🚀 文峰 AI 部署脚本"
echo "===================="

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，正在安装..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
    echo "✅ Docker 安装完成，请重新登录后再运行此脚本"
    exit 1
fi

# 检查 Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose 未安装，正在安装..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

echo "✅ Docker 和 Docker Compose 已就绪"

# 创建必要目录
mkdir -p notebooklm-auth
mkdir -p generated

# 检查 NotebookLM 认证文件
if [ ! -f "notebooklm-auth/storage_state.json" ]; then
    echo ""
    echo "⚠️  NotebookLM 认证文件缺失！"
    echo ""
    echo "请从本地电脑复制认证文件到服务器："
    echo ""
    echo "  scp ~/.notebooklm/storage_state.json user@your-server:$(pwd)/notebooklm-auth/"
    echo ""
    echo "复制完成后，重新运行此脚本。"
    exit 1
fi

echo "✅ NotebookLM 认证文件已就绪"

# 检查环境变量
if [ -z "$VITE_SUPABASE_URL" ] || [ -z "$VITE_SUPABASE_PUBLISHABLE_KEY" ]; then
    echo ""
    echo "⚠️  请设置 Supabase 环境变量："
    echo ""
    echo "  export VITE_SUPABASE_URL='your-supabase-url'"
    echo "  export VITE_SUPABASE_PUBLISHABLE_KEY='your-supabase-key'"
    echo ""
    echo "或者创建 .env 文件包含这些变量。"
    
    # 检查 .env 文件
    if [ -f ".env" ]; then
        echo "✅ 发现 .env 文件，将使用其中的配置"
        source .env
    else
        exit 1
    fi
fi

# 设置后端 URL（根据你的域名修改）
export VITE_BACKEND_URL=${VITE_BACKEND_URL:-"http://$(curl -s ifconfig.me):8000"}
echo "📡 后端 URL: $VITE_BACKEND_URL"

# 构建并启动
echo ""
echo "🔨 正在构建 Docker 镜像..."
docker-compose build

echo ""
echo "🚀 正在启动服务..."
docker-compose up -d

echo ""
echo "=================================="
echo "🎉 部署完成！"
echo "=================================="
echo ""
echo "前端访问地址: http://$(curl -s ifconfig.me)"
echo "后端 API 地址: http://$(curl -s ifconfig.me):8000"
echo "API 文档: http://$(curl -s ifconfig.me):8000/docs"
echo ""
echo "查看日志: docker-compose logs -f"
echo "停止服务: docker-compose down"
echo ""
