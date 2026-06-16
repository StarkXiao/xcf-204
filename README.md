# ⚡ 都市异能协作站

都市异能题材的角色档案与事件协作管理系统。

## 技术栈

### 前端
- React 18 + TypeScript
- Vite
- React Router DOM
- Axios

### 后端
- Node.js + Express + TypeScript
- Prisma ORM
- SQLite
- JWT 认证
- Zod 数据验证

## 项目结构

```
xcf-204/
├── frontend/          # 前端项目
│   ├── src/
│   │   ├── pages/     # 页面组件
│   │   ├── components/ # 通用组件
│   │   ├── api/       # API 接口
│   │   ├── types/     # 类型定义
│   │   ├── hooks/     # 自定义 Hooks
│   │   └── styles/    # 全局样式
│   └── ...
├── backend/           # 后端项目
│   ├── src/
│   │   ├── routes/    # 路由
│   │   ├── controllers/ # 控制器
│   │   ├── middleware/ # 中间件
│   │   └── types/     # 类型定义
│   ├── prisma/        # 数据库模型
│   └── ...
└── package.json       # 根目录配置
```

## 快速开始

### 1. 安装依赖

```bash
npm run install:all
```

### 2. 初始化数据库

```bash
npm run db:init
```

### 3. 启动开发服务器

```bash
npm run dev
```

- 前端运行在: http://localhost:5173
- 后端运行在: http://localhost:3002

### 4. 单独启动

```bash
# 只启动后端
npm run dev:backend

# 只启动前端
npm run dev:frontend
```

## 默认账号

- 管理员: `admin` / `admin123`

## 功能模块

1. **🏠 首页世界观** - 展示世界观设定和统计数据
2. **👤 角色管理** - 异能者档案管理（CRUD）
3. **📋 事件记录** - 异能事件记录管理
4. **📅 任务日历** - 任务管理，支持日历和列表视图
5. **🔐 权限登录** - JWT 认证，管理员/普通用户权限区分

## API 接口

- `POST /api/auth/login` - 登录
- `POST /api/auth/register` - 注册
- `GET /api/auth/profile` - 获取用户信息
- `GET /api/worldview` - 获取世界观
- `GET/POST/PUT/DELETE /api/characters` - 角色管理
- `GET/POST/PUT/DELETE /api/events` - 事件管理
- `GET/POST/PUT/DELETE /api/missions` - 任务管理

## 构建生产版本

```bash
npm run build
```
