# 桌面应用规格书

# 1. 文档概述

## 1.1 文档目的

本文档明确本桌面应用的功能需求、界面规格、技术架构、开发标准及部署要求，作为开发、测试、验收的核心依据，确保开发过程贴合需求，最终交付符合预期的桌面应用。

## 1.2 应用定位

本应用为跨平台桌面端管理类应用，支持 Windows、macOS 系统，以"轻量高效、功能完备"为核心，提供用户登录、系统维护、账户管理、角色管理等基础管理功能，同时预留扩展接口，适配后续功能迭代，满足日常管理场景的使用需求。

## 1.3 适用范围

本文档适用于本桌面应用的开发人员、测试人员、产品人员及相关验收人员，明确各角色的工作依据和验收标准。

## 1.4 技术栈说明

| 层次 | 技术选型 | 说明 |
|------|----------|------|
| 桌面壳 | Tauri 2.x (Rust) | 窗口管理、系统调用、跨平台适配、前后端通信 |
| 前端 UI | React 18+ (Hooks) | 界面渲染、交互逻辑 |
| UI 组件库 | Ant Design 5.x | 统一组件风格 |
| 后端服务 | Rust Axum | API 接口、业务逻辑、权限校验 |
| 数据存储 | ArangoDB | 多模型数据库（文档+图），支持权限关系图谱 |
| 图数据库驱动 | arangors | Rust ArangoDB 客户端 |

## 1.5 技术架构图

```
┌─────────────────────────────────────────────────────────┐
│                    桌面应用 (Tauri)                      │
├─────────────────────┬───────────────────────────────────┤
│    React 前端       │         Rust 后端                │
│  ┌───────────────┐  │  ┌─────────────┐  ┌───────────┐  │
│  │  Ant Design   │  │  │    Axum     │  │ arangors  │  │
│  │  组件库       │  │  │   REST API  │  │  驱动     │  │
│  └───────────────┘  │  └─────────────┘  └─────┬─────┘  │
└─────────────────────┼───────────────────────────┼────────┘
                      │         IPC 通信           │
                      ▼                             ▼
              ┌───────────────────────────────────────────┐
              │              ArangoDB (Docker)            │
              │  ┌─────────┐ ┌─────────┐ ┌─────────────┐  │
              │  │ Users   │ │  Roles  │ │ Permissions │  │
              │  │(文档)   │ │(文档)   │ │ (边/图)     │  │
              │  └─────────┘ └─────────┘ └─────────────┘  │
              │  ┌─────────┐ ┌─────────┐ ┌─────────────┐  │
              │  │  Logs   │ │  Config │ │System Params│  │
              │  └─────────┘ └─────────┘ └─────────────┘  │
              └───────────────────────────────────────────┘
```

---

# 2. 功能需求

## 2.1 整体功能框架

应用整体分为 5 大模块：欢迎登录模块、主界面框架模块、系统维护模块、账户管理模块、角色管理模块，各模块功能独立且联动，确保整体流程顺畅。

## 2.2 欢迎登录模块

### 2.2.1 欢迎页

- 应用启动后，首先展示欢迎页，包含应用名称、logo、版本号，以及"进入登录"按钮；
- 欢迎页支持自动跳转，默认 3 秒后自动进入登录页面，也可点击"进入登录"按钮直接跳转；
- 欢迎页底部显示版权信息、版本更新提示（可选，点击可查看更新日志）。

### 2.2.2 登录功能

- 登录页面包含：用户名输入框、密码输入框、"记住密码"复选框、"登录"按钮；
- 输入校验：用户名、密码不能为空，密码长度不小于 6 位，校验不通过时给出明确提示；
- 登录请求：点击登录后，前端通过 IPC 通信调用 Rust 核心逻辑，由 Rust 后端校验用户名密码的合法性，校验通过后进入主界面，校验失败给出错误提示；
- 记住密码：勾选"记住密码"后，下次启动应用自动填充用户名和密码（密码采用加密存储，确保安全）；
- 权限控制：未登录状态下，无法访问主界面及任何管理功能，强制跳转至登录页面；登录状态下，关闭应用再启动，自动登录并进入主界面（若勾选记住密码）。

## 2.3 主界面框架模块

### 2.3.1 界面布局

- 整体布局为"左侧侧边栏 + 右侧功能页"，右侧功能页顶部包含独立 header；
- 左侧侧边栏：固定宽度 200px，包含应用 logo、当前登录用户名、功能菜单（系统维护、账户管理、角色管理），**支持折叠/展开功能**；折叠后宽度 60px，仅显示菜单图标；
- 右侧功能页 header：显示当前功能模块名称、操作按钮（如新增、刷新、退出登录），header 高度 60px；
- 右侧功能页内容区：根据左侧菜单选择，加载对应功能页面。

### 2.3.2 通用功能

- 退出登录：清除登录状态及记住密码信息，跳转至登录页面；
- 页面刷新：重新加载当前功能页面；
- 窗口控制：支持窗口最小化、最大化、关闭；
- 版本信息：点击侧边栏底部的版本号，可查看当前应用版本。

## 2.4 系统维护模块

该模块为系统管理员权限专属，主要负责应用的系统参数设置、日志管理、数据备份与恢复。

### 2.4.1 系统参数设置

系统参数通过后台数据库配置，应用启动时动态读取。参数分为**运行时参数**（无需重启生效）和**启动参数**（重启后生效）。

#### 可配置参数列表

| 参数键 | 参数名称 | 类型 | 默认值 | 生效方式 | 说明 |
|--------|----------|------|--------|----------|------|
| `app.name` | 系统名称 | string | "管理系统" | 重启 | 欢迎页、侧边栏标题显示 |
| `app.logo` | 系统 Logo | string | "" | 重启 | Logo 图片路径或 Base64 |
| `app.version` | 系统版本 | string | "1.0.0" | 只读 | 读取 package.json/tauri.conf.json |
| `app.copyright` | 版权信息 | string | "© 2026" | 重启 | 欢迎页底部显示 |
| `theme.mode` | 主题模式 | string | "light" | 立即 | "light"(浅色) / "dark"(深色) |
| `theme.primaryColor` | 主色调 | string | "#1677FF" | 立即 | Ant Design 主题色 |
| `window.width` | 默认宽度 | number | 1200 | 重启 | 窗口默认宽度(px) |
| `window.height` | 默认高度 | number | 800 | 重启 | 窗口默认高度(px) |
| `window.minWidth` | 最小宽度 | number | 800 | 重启 | 窗口最小宽度(px) |
| `window.minHeight` | 最小高度 | number | 600 | 重启 | 窗口最小高度(px) |
| `autoJump.enabled` | 自动跳转 | boolean | true | 立即 | 欢迎页是否自动跳转 |
| `autoJump.delay` | 跳转延迟 | number | 3 | 立即 | 自动跳转延迟时间(秒) |
| `autoUpdate.enabled` | 自动更新 | boolean | false | 立即 | 是否开启自动更新检查 |
| `autoUpdate.frequency` | 更新频率 | string | "daily" | 立即 | "daily"(每日) / "weekly"(每周) / "monthly"(每月) |
| `backup.autoEnabled` | 自动备份 | boolean | false | 立即 | 是否开启自动备份 |
| `backup.frequency` | 备份周期 | string | "daily" | 立即 | 备份周期 |
| `backup.path` | 备份路径 | string | "" | 立即 | 自定义备份存储路径 |

#### 参数配置界面

- 左侧显示参数分类（基本信息、主题、窗口、备份），点击分类展开该分类下的所有参数；
- 右侧显示对应参数表单，支持输入框、开关、下拉选择、图片上传等控件；
- 图片上传：Logo 支持上传本地图片，自动转为 Base64 存储；
- 底部显示"保存"和"重置默认"按钮；
- 保存后根据参数生效方式决定是否提示重启。

#### 参数加载机制

应用启动时，按以下顺序加载系统参数：

1. **Rust 后端启动** → 连接 ArangoDB
2. **查询 system_params 集合** → 读取所有参数
3. **缓存到内存** → 供 API 和前端随时读取
4. **IPC 通知前端** → 前端根据主题参数渲染界面
5. **窗口创建** → 根据 window.* 参数创建主窗口

前端通过 `system_params` store 订阅参数变化，主题色等立即生效的参数通过 Context 实时同步。

#### 动态生效机制

- **立即生效**：主题颜色、主题模式、自动跳转等 → 保存后立即应用到界面
- **重启生效**：系统名称、Logo、窗口尺寸等 → 保存后提示"部分设置需要重启应用后生效"

### 2.4.2 日志管理

- 显示应用运行日志，包含操作时间、操作人、操作内容、操作结果；
- 支持日志筛选（按时间范围、操作人、操作类型）、日志搜索；
- 支持日志导出（CSV 格式）、日志清空（需确认）。

### 2.4.3 数据备份与恢复

- 支持手动备份数据，选择备份路径，备份当前应用所有数据；
- 支持自动备份，配置备份周期、备份路径；
- 支持数据恢复，选择备份文件，确认后恢复数据；
- 备份文件采用加密存储。

## 2.5 账户管理模块

该模块用于管理应用所有用户，支持用户的新增、编辑、删除、查询、密码重置。

### 2.5.1 用户查询

- 显示所有用户列表，包含用户名、姓名、角色、创建时间、状态（启用/禁用）、操作按钮；
- 支持用户筛选（按角色、状态）、用户搜索（按用户名、姓名）；
- 支持列表分页。

### 2.5.2 用户新增

- 点击"新增用户"按钮，弹出新增用户表单，包含：用户名（唯一）、姓名、密码、确认密码、角色选择、状态；
- 表单校验：用户名不能为空且唯一，密码长度不小于 6 位，确认密码与密码一致，角色必选。

### 2.5.3 用户编辑与删除

- 编辑：可修改姓名、角色、状态（不可修改用户名）；
- 删除：弹出确认提示，确认后删除用户；
- 限制：系统管理员账户不可删除、不可禁用。

### 2.5.4 密码重置

- 点击"重置密码"按钮，输入新密码、确认密码，重置成功后提示用户。

## 2.6 角色管理模块

该模块用于管理应用角色，支持角色的新增、编辑、删除、查询，以及角色权限分配。

### 2.6.1 角色查询

- 显示所有角色列表，包含角色名称、角色描述、创建时间、操作按钮；
- 支持角色搜索、列表分页。

### 2.6.2 角色新增与编辑

- 新增：包含角色名称（唯一）、角色描述；
- 编辑：可修改角色名称、角色描述。

### 2.6.3 角色删除

- 删除前检查是否已关联用户，若有关联则提示先解除关联；
- 系统管理员角色不可删除。

### 2.6.4 角色权限分配

- 点击"权限分配"按钮，弹出权限分配弹窗，显示所有可分配的权限；
- 支持勾选/取消勾选权限；
- 权限分配完成后，点击"确认"保存，用户重新登录后权限生效。

---

# 3. 数据库设计 (ArangoDB)

## 3.1 集合设计

### 3.1.1 文档集合 (Document Collections)

| 集合名 | 说明 | 主要字段 |
|--------|------|----------|
| `users` | 用户表 | `_key`, `username`, `password_hash`, `name`, `role_key`, `status`, `created_at`, `updated_at` |
| `roles` | 角色表 | `_key`, `name`, `description`, `created_at`, `updated_at` |
| `configs` | 系统配置表 | `_key`, `key`, `value`, `updated_at` |
| `system_params` | **系统参数表** | `_key`, `param_key`, `param_value`, `param_type`, `require_restart`, `category`, `updated_at` |
| `logs` | 操作日志表 | `_key`, `user_key`, `action`, `detail`, `result`, `created_at` |
| `backups` | 备份记录表 | `_key`, `filename`, `path`, `size`, `created_at` |

### 3.1.2 边集合 (Edge Collections)

| 集合名 | 说明 | 边字段 |
|--------|------|--------|
| `role_permissions` | 角色-权限关系 | `_from`, `_to`, `created_at` |
| `user_roles` | 用户-角色关系（预留多角色） | `_from`, `_to`, `assigned_at` |

## 3.2 权限定义

| 权限标识 | 说明 | 所属模块 |
|----------|------|----------|
| `system.params` | 系统参数设置 | 系统维护 |
| `system.config` | 系统基础配置 | 系统维护 |
| `system.logs.view` | 查看日志 | 系统维护 |
| `system.logs.export` | 导出日志 | 系统维护 |
| `system.logs.clear` | 清空日志 | 系统维护 |
| `system.backup` | 数据备份与恢复 | 系统维护 |
| `account.view` | 查看用户列表 | 账户管理 |
| `account.create` | 新增用户 | 账户管理 |
| `account.edit` | 编辑用户 | 账户管理 |
| `account.delete` | 删除用户 | 账户管理 |
| `account.resetpwd` | 重置密码 | 账户管理 |
| `role.view` | 查看角色列表 | 角色管理 |
| `role.create` | 新增角色 | 角色管理 |
| `role.edit` | 编辑角色 | 角色管理 |
| `role.delete` | 删除角色 | 角色管理 |
| `role.assign` | 分配权限 | 角色管理 |

## 3.3 初始数据

系统首次启动时，自动创建以下初始数据：

### 3.3.1 默认角色

- **默认角色**：系统管理员 (role_key: `admin`)，拥有所有权限

### 3.3.2 默认用户

- **默认用户**：用户名 `admin`，密码 `admin123`（首次登录后强制要求修改密码）

### 3.3.3 默认系统参数

系统首次启动时，自动初始化以下参数到 `system_params` 集合：

| param_key | param_value | param_type | require_restart | category |
|------------|-------------|------------|-----------------|-----------|
| app.name | 管理系统 | string | true | basic |
| app.logo | | string | true | basic |
| app.version | 1.0.0 | string | false | basic |
| app.copyright | © 2026 | string | true | basic |
| theme.mode | light | string | false | theme |
| theme.primaryColor | #1677FF | string | false | theme |
| window.width | 1200 | number | true | window |
| window.height | 800 | number | true | window |
| window.minWidth | 800 | number | true | window |
| window.minHeight | 600 | number | true | window |
| autoJump.enabled | true | boolean | false | behavior |
| autoJump.delay | 3 | number | false | behavior |
| autoUpdate.enabled | false | boolean | false | update |
| autoUpdate.frequency | daily | string | false | update |
| backup.autoEnabled | false | boolean | false | backup |
| backup.frequency | daily | string | false | backup |
| backup.path | | string | false | backup |

---

# 4. API 接口设计

## 4.1 接口规范

- 基础路径：`/api/v1`
- 认证方式：`Bearer Token`（JWT）
- 请求格式：`application/json`
- 响应格式：

```json
{
  "code": 200,
  "message": "success",
  "data": { }
}
```

## 4.2 接口清单

### 认证接口

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /auth/login | 用户登录 | ❌ |
| POST | /auth/logout | 退出登录 | ✅ |
| GET | /auth/me | 获取当前用户信息 | ✅ |

### 用户管理接口

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | /users | 获取用户列表 | account.view |
| POST | /users | 新增用户 | account.create |
| GET | /users/:key | 获取用户详情 | account.view |
| PUT | /users/:key | 编辑用户 | account.edit |
| DELETE | /users/:key | 删除用户 | account.delete |
| POST | /users/:key/reset-password | 重置密码 | account.resetpwd |

### 角色管理接口

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | /roles | 获取角色列表 | role.view |
| POST | /roles | 新增角色 | role.create |
| GET | /roles/:key | 获取角色详情 | role.view |
| PUT | /roles/:key | 编辑角色 | role.edit |
| DELETE | /roles/:key | 删除角色 | role.delete |
| GET | /roles/:key/permissions | 获取角色权限 | role.view |
| PUT | /roles/:key/permissions | 分配权限 | role.assign |

### 系统管理接口

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | /system-params | 获取所有系统参数 | system.config |
| GET | /system-params/:category | 按分类获取系统参数 | system.config |
| PUT | /system-params/:key | 更新单个参数 | system.config |
| PUT | /system-params/batch | 批量更新参数 | system.config |
| POST | /system-params/reset | 重置为默认参数 | system.config |
| GET | /configs | 获取系统配置 | system.config |
| PUT | /configs | 更新系统配置 | system.config |
| GET | /logs | 获取日志列表 | system.logs.view |
| DELETE | /logs | 清空日志 | system.logs.clear |
| POST | /backup | 手动备份 | system.backup |
| POST | /backup/restore | 恢复数据 | system.backup |

### 错误码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

# 5. 界面规格

## 5.1 整体风格

- 风格：简约、专业、易用，符合管理类应用的视觉定位；
- 主题：支持浅色/深色两种主题，默认浅色主题；
- 字体：使用系统默认无衬线字体（Windows: 微软雅黑, macOS: San Francisco）；
- 颜色：
  - 主色：`#1677FF`（蓝色）
  - 成功：`#52C41A`
  - 警告：`#FAAD14`
  - 错误：`#FF4D4F`
  - 背景色（浅色）：`#FFFFFF`
  - 背景色（深色）：`#141414`

## 5.2 布局尺寸

### 5.2.1 欢迎页

- logo 尺寸：128x128px
- 应用名称字体：24px，加粗
- 按钮尺寸：120x40px

### 5.2.2 登录页

- 表单宽度：300px
- 输入框高度：40px
- 按钮尺寸：300x40px
- 元素间距：15px

### 5.2.3 主界面

- 侧边栏宽度：展开 200px，折叠 60px
- 侧边栏图标：24x24px
- Header 高度：60px
- 功能区 padding：20px

### 5.2.4 窗口

- 默认尺寸：1200x800px
- 最小尺寸：800x600px

---

# 6. 技术要求

## 6.1 跨平台要求

- 支持系统：Windows 10 及以上、macOS 11 及以上
- 打包格式：Windows `.exe` / macOS `.app`
- 打包后体积：≤ 50MB

## 6.2 性能要求

- 启动时间：≤ 3 秒
- 页面切换：≤ 500ms
- 列表加载（1000条）：≤ 1 秒
- 日志导出（1000条）：≤ 2 秒

## 6.3 安全要求

- 密码加密：bcrypt
- 传输安全：HTTPS（未来）
- 接口校验：防止 SQL 注入、XSS

---

# 7. 项目结构

```
desktop-app/
├── src/                      # React 前端
│   ├── components/           # 通用组件
│   ├── pages/                # 页面组件
│   │   ├── Welcome/          # 欢迎页
│   │   ├── Login/            # 登录页
│   │   ├── Layout/           # 主界面框架
│   │   ├── System/           # 系统维护
│   │   ├── Account/          # 账户管理
│   │   └── Role/             # 角色管理
│   ├── hooks/                # 自定义 Hooks
│   ├── services/             # API 请求
│   ├── stores/               # 状态管理
│   ├── styles/               # 样式文件
│   └── App.tsx
├── src-tauri/                # Rust 后端
│   ├── src/
│   │   ├── commands/         # Tauri 命令
│   │   ├── api/              # Axum API
│   │   ├── db/               # ArangoDB 操作
│   │   ├── models/           # 数据模型
│   │   ├── auth/             # 认证逻辑
│   │   └── main.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
├── package.json
└── SPEC.md
```

---

# 8. 部署与维护

## 8.1 部署要求

- **ArangoDB**：Docker 容器运行，端口 8529
- **桌面应用**：一键安装，Windows `.exe` / macOS `.app`

## 8.2 开发环境

1. 启动 ArangoDB Docker 容器
2. 配置 `src-tauri/.env` 连接 ArangoDB
3. 运行 `npm install && npm run tauri dev`

---

# 9. 验收标准

## 9.1 功能验收

- 欢迎登录模块：欢迎页跳转正常，登录校验准确
- 主界面框架：布局符合要求，侧边栏折叠/展开正常
- 系统维护：配置、日志、备份功能正常
- 账户管理：用户增删改查、密码重置功能正常
- 角色管理：角色增删改查、权限分配功能正常

## 9.2 技术验收

- 跨平台：Windows / macOS 运行正常
- 性能：启动、切换符合要求
- 安全：密码加密、权限控制有效

---

# 10. 附则

## 10.1 文档更新

本文档将根据需求变更进行更新，确保使用最新版本。

## 10.2 生效日期

本文档自发布之日起生效。

---

*最后更新：2026-03-17*
