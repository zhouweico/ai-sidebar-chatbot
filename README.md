# AI Sidebar Chatbot

一个功能强大的Chrome/Edge浏览器侧边栏插件，集成多种AI服务（Dify、Coze、MaxKB、FastGPT等），提供智能对话、页面总结、划词工具等功能。

## 🚀 功能特性

### 核心功能
- **📝 划词工具栏**: 选中文本自动弹出操作菜单（总结/对话/翻译/复制）
- **📄 页面总结**: 一键提取当前页面关键信息
- **💬 AI对话**: 多轮智能对话，支持上下文理解
- **🔧 多API支持**: 灵活配置和切换多个AI平台API服务

### 管理功能
- **⚙️ 功能开关**: 可独立启用/禁用划词工具栏功能
- **🔑 API配置**: 支持添加多个AI平台API，随时切换
- **🎨 现代化UI**: 基于React和TypeScript的美观界面设计

## 📦 安装使用

### 开发环境
```bash
# 克隆项目
git clone <repository-url>

# 安装依赖
npm install

# 开发模式（热重载）
npm run dev

# 或构建项目
npm run build

# 在Chrome/Edge中加载dist文件夹
```

### 生产环境
1. 下载最新发布版本
2. 解压到本地文件夹
3. 在Chrome/Edge扩展管理页面加载已解压的扩展

### 开发命令
- `npm run dev` - 启动开发服务器，支持热重载
- `npm run build` - 构建生产版本
- `npm run preview` - 预览构建结果
- `npm run lint` - 运行代码检查
- `npm run typecheck` - 运行TypeScript类型检查

## 🔧 配置说明

### AI平台API配置
1. 访问对应AI平台官网注册账户（如[Dify](https://dify.ai)、[Coze](https://www.coze.com)等）
2. 创建新的AI应用
3. 在应用设置中获取API密钥
4. 在插件选项页面添加API配置

### 功能开关
- **划词工具栏**: 控制文本选择时的工具栏显示

## 🛠️ 技术架构

### 前端技术
- **React 18** + **TypeScript** - 现代化前端开发
- **Vite** - 快速构建工具
- **Tailwind CSS** - 实用优先的CSS框架
- **Lucide React** - 美观的图标库
- **React Markdown** - Markdown渲染支持
- **Rehype/Katex** - 数学公式渲染支持

### 浏览器扩展
- **Manifest V3** - 最新的扩展标准
- **WebExtension API** - 跨浏览器兼容性
- **Content Scripts** - 页面内容注入
- **Background Service Worker** - 后台服务
- **Side Panel API** - 侧边栏界面支持

### 所需权限说明
- `activeTab` - 访问当前活动标签页信息
- `storage` - 本地存储配置和API密钥
- `contextMenus` - 创建右键菜单项
- `sidePanel` - 控制侧边栏面板
- `scripting` - 注入内容脚本
- `background` - 后台服务运行
- `host_permissions` - 访问所有网站以提取页面内容

### 核心模块
- **Background Script**: 插件生命周期管理、API调用处理、AI平台API验证
- **Content Script**: 页面交互功能、划词工具栏实现、页面内容提取
- **Side Panel**: AI对话主界面、流式响应处理、Markdown渲染
- **Options**: 插件配置管理、API密钥验证、功能开关控制

## 📁 项目结构

```
ai-sidebar-chatbot/
├── manifest.json              # 插件配置文件
├── package.json               # 项目依赖配置
├── vite.config.ts            # 构建配置
├── src/
│   ├── background/           # 后台脚本
│   │   └── background.js     # 服务工作者
│   ├── content/              # 内容脚本
│   │   ├── content.js        # 页面注入脚本
│   │   └── content.css       # 内容样式
│   ├── sidepanel/            # 侧边栏页面
│   │   ├── sidepanel.html    # HTML模板
│   │   ├── sidepanel.tsx     # React组件
│   │   └── sidepanel.css     # 样式文件
│   └── options/              # 选项页面
│       ├── options.html      # HTML模板
│       ├── options.tsx       # React组件
│       └── options.css       # 样式文件
└── dist/                     # 构建输出目录
```

## 🔒 安全说明

- **API密钥安全**: 密钥存储在浏览器本地存储中，不会上传到任何服务器
- **权限最小化**: 仅申请必要的浏览器权限
- **内容安全**: 所有用户数据本地处理，保护隐私
- **网络安全**: 通过HTTPS与AI平台API通信，确保数据传输安全

## 🐛 常见问题

### Q: 插件安装后无法使用？
A: 请检查是否正确配置了AI平台API密钥，并确保网络连接正常。

### Q: 划词工具栏不显示？
A: 请确认在插件选项页面已启用"划词工具栏"功能。

### Q: 如何切换不同的AI平台？
A: 在选项页面添加多个AI平台API配置，在侧边栏可以切换使用。

### Q: 页面总结功能无法获取完整内容？
A: 某些网站出于安全考虑限制了内容访问，这是浏览器的安全机制。

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🤝 贡献

欢迎提交Issue和Pull Request来改进这个插件！

## 📞 支持

如有问题或建议，请在GitHub上提交Issue。