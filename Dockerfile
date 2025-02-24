# # 使用Node.js官方镜像
# FROM node:20-alpine

# # 设置工作目录
# WORKDIR /app

# # 复制依赖文件并安装
# COPY app/package.json .
# RUN npm install


# # 复制应用代码
# COPY app/ .

# # 启动命令
# CMD ["node", "index.js"]


FROM node:20-alpine

WORKDIR /app

# 分离依赖安装与代码复制
COPY app/package*.json ./
# 安装开发依赖
RUN npm install --include=dev  

# 生产环境构建时复制代码
# COPY . .

# 开发环境使用卷映射，不需要复制代码
CMD ["npm", "run", "dev"]