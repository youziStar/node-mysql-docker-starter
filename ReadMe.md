# Docker化 Node.js + MySQL 开发环境

![Docker](https://img.shields.io/badge/Docker-20.10%2B-blue)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)
![MySQL](https://img.shields.io/badge/MySQL-8.0-orange)

## 📖 项目概述

本仓库是个人练习完整的全栈开发环境模板，包含：
- 🐳 Docker Compose 编排的容器化环境
- ⚡ Node.js 服务端应用（带nodemon热重载）
- 🗃️ MySQL 数据库服务
- 📁 持久化数据存储配置
- 🔒 环境变量安全配置

专为快速启动和便捷调试设计，适合作为微服务架构的入门模板。

## 🗂️ 文件结构

```bash
.
├── app/                   # Node.js 应用代码
│   ├── index.js           # 主入口文件
│   ├── package.json       # 依赖管理
│   └── package-lock.json
├── docker-compose.yml     # 多容器编排配置
├── Dockerfile             # Node应用镜像构建文件
├── init.sql               # 数据库初始化脚本
├── mysql-data/            # 数据库持久化存储
├── .env.example           # 环境变量模板
└── dev.sh                 # 一键部署脚本
```

## 🛠️ 快速开始

### 前置要求
- Docker 20.10+
- Docker Compose 2.0+

### 启动步骤
1. 克隆仓库
   ```bash
   git clone <repository-url>
   cd <project-directory>
   ```

2. 启动容器
   ```bash
   chmod +x dev.sh  # 添加执行权限
   ./dev.sh          # 自动清理旧容器并启动新实例
   ```

3. 访问服务
   - ~~Node应用: http://localhost:3000~~
   - Node应用: 无网页，请查看容器log
   - MySQL管理: 
     ```bash
     mysql -h 127.0.0.1 -P 3306 -u <用户名> -p
     ```
4. Node日志：
    ```
    2025-02-24 13:57:40 [nodemon] clean exit - waiting for changes before restart
    2025-02-24 14:06:00 [nodemon] restarting due to changes...
    2025-02-24 14:06:00 [nodemon] starting `node index.js`
    2025-02-24 14:06:00 ✅ [2025-02-24T06:06:00.849Z] 成功建立数据库连接
    2025-02-24 14:06:00 
    2025-02-24 14:06:00 📊 初始查询结果:
    2025-02-24 14:06:00 ┌─────────┬────┬────────────────┬────────────────────────────┐
    2025-02-24 14:06:00 │ (index) │ ID │ Value          │ 创建时间                   │
    2025-02-24 14:06:00 ├─────────┼────┼────────────────┼────────────────────────────┤
    2025-02-24 14:06:00 │ 0       │ 16 │ 'Hello Docker' │ '2025-02-24T05:57:40.000Z' │
    2025-02-24 14:06:00 └─────────┴────┴────────────────┴────────────────────────────┘
    2025-02-24 14:06:00 📥 插入数据成功，ID: 17
    2025-02-24 14:06:00 
    2025-02-24 14:06:00 📊 最新记录:
    2025-02-24 14:06:00 ┌─────────┬────┬───────────────────────────────────────┬────────────────────────────┐
    2025-02-24 14:06:00 │ (index) │ ID │ Value                                 │ 创建时间                   │
    2025-02-24 14:06:00 ├─────────┼────┼───────────────────────────────────────┼────────────────────────────┤
    2025-02-24 14:06:00 │ 0       │ 17 │ 'Docker测试@2025-02-24T06:06:00.862Z' │ '2025-02-24T06:06:00.000Z' │
    2025-02-24 14:06:00 └─────────┴────┴───────────────────────────────────────┴────────────────────────────┘
    2025-02-24 14:06:00 
    2025-02-24 14:06:00 🏁 操作流程完成
    2025-02-24 14:06:00 ✅ 服务正常启动
    2025-02-24 14:06:00 [nodemon] clean exit - waiting for changes before restart
    ```
## ⚙️ 技术架构

本项目采用以下技术架构：

- **Docker Host**：主机运行 Docker 容器
  - **Docker Network**：自定义桥接网络 `my-network`
    - **MySQL**：MySQL 8.0 数据库容器，包含健康检查
    - **NodeApp**：基于 `node:20-alpine` 的 Node.js 应用容器，连接 MySQL 数据库
  - **挂载卷**：
    - **AppVolumes**：挂载本地目录 `app/` 到容器 `/app`，隔离依赖到 `/app/node_modules`
    - **MySQLVolumes**：挂载本地目录 `mysql-data/` 到容器 `/var/lib/mysql`，初始化脚本 `init.sql` 到 `/docker-entrypoint-initdb.d`
  - **端口映射**：
    - **MySQL**：映射本地端口 `3306` 到容器端口 `3306`
    - **NodeApp**：~~映射本地端口 `3000` 到容器端口 `3000`~~

### 组件说明

- **MySQL**：
  - 镜像：`mysql:8.0`
  - 挂载卷：`./mysql-data:/var/lib/mysql`
  - 初始化脚本：`./init.sql:/docker-entrypoint-initdb.d`
  - 端口：`3306:3306`

- **NodeApp**：
  - 镜像：`node:20-alpine`
  - 挂载卷：`./app:/app`
  - 依赖隔离：`/app/node_modules`
  - 端口：~~`3000:3000`~~

### 网络配置

- **网络名称**：`my-network`
- **网络类型**：桥接（bridge）

### 挂载卷配置

- **应用挂载卷**：
  - 本地目录：`app/`
  - 容器目录：`/app`
  - 依赖隔离：`/app/node_modules`

- **MySQL 挂载卷**：
  - 数据持久化：`./mysql-data:/var/lib/mysql`
  - 初始化脚本：`./init.sql:/docker-entrypoint-initdb.d`

### 端口映射

- **MySQL**：`3306:3306`
- **NodeApp**：~~`3000:3000`~~

## 🔄 开发工作流

- **热重载机制**：nodemon 会监控 `*.js` 文件变动自动重启服务
- **数据库迁移**：修改 `init.sql` 后需重新构建容器
- **日志查看**：
  ```bash
  docker-compose logs -f node_app
  ```

## 📌 注意事项

1. 首次启动时MySQL初始化需要约30秒
2. `mysql-data/` 目录用于持久化存储，删除前请备份
3. 生产环境需修改：
   - 禁用nodemon
   - 移除调试端口
   - 强化数据库密码

## 📜 许可协议

[MIT License](LICENSE) © 2023 [youzi]
---
ReadMe 由AI整理生成