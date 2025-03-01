#!/bin/bash
# Docker 开发环境一键重置脚本

function run() {
    echo -e "\033[34m▶️ 正在清理旧容器和卷...\033[0m"
    docker-compose down -v --remove-orphans

    echo -e "\033[34m🚀 重建并启动开发环境...\033[0m"
    docker compose -f ./docker-compose.yml up --build -d

    echo -e "\n\033[32m✅ 开发环境已就绪！\033[0m"
    echo -e "查看运行中容器：\ndocker ps"
    echo -e "监控日志命令：\ndocker-compose logs -f node_app"
}

# 安全确认
echo -e "\033[33m⚠️  即将执行以下操作：\033[0m"
echo "1. 删除所有相关容器"
echo "2. 清理 Docker 卷数据"
echo "3. 重建并启动开发环境"
read -p "确定继续执行吗？(y/N) " -n 1 -r

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo && run
else
    echo -e "\n\033[31m❌ 操作已取消\033[0m"
fi