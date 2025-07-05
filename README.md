# Ziuch Tools

一个基于 Next.js 的综合性在线工具集，为学术研究提供实用工具。

## 功能特性

### 📚 文献查询 (Publication Finder)
- **期刊/会议排名查询**: 支持多种学术排名系统查询
  - CCF (中国计算机学会) 排名
  - SCI 影响因子和 JCR 分区
  - 中科院期刊分区
  - EI 检索状态
  - 各类中国高校排名系统
- **会议投稿截止日期**: 实时追踪学术会议投稿截止时间
- **高级筛选**: 按类别 (AI, DB, NW 等) 和 CCF 等级 (A/B/C) 筛选
- **时区转换**: 自动转换会议截止时间到中国时区 (UTC+8)
- **搜索历史**: 本地保存搜索记录，便于快速访问
- **录用率展示**: 显示会议历史录用率信息

### 🔬 公式识别 (LaTeX OCR)
- **图片上传**: 支持拖拽上传和剪贴板粘贴
- **手绘公式**: 内置画布支持手绘数学公式
- **高精度识别**: 使用 SimpleTex API 实现高精度公式识别
- **多种复制选项**: 支持纯 LaTeX、数学模式 LaTeX 和渲染图片
- **历史记录管理**: 本地存储所有识别结果，支持分页浏览
- **实时预览**: 显示渲染后的 LaTeX 公式和置信度分数
- **可编辑结果**: 允许手动修正识别结果

## 技术栈

### 前端
- **Next.js 15.1.0**: React 框架，使用 App Router
- **React 18.3.1**: UI 库
- **TypeScript**: 类型安全
- **Tailwind CSS**: 样式框架
- **shadcn/ui**: 基于 Radix UI 的组件库
- **KaTeX**: 数学公式渲染
- **html2canvas**: 截图生成
- **react-masonry-css**: 响应式网格布局

### 后端/API
- **Next.js API Routes**: 服务端功能
- **外部 API**:
  - SimpleTex API (LaTeX OCR)
  - EasyScholar API (期刊排名)
  - CCF DDL (会议数据)

### 数据管理
- **LocalStorage**: 客户端数据持久化
- **YAML 解析**: 会议数据处理
- **缓存策略**: 7天缓存机制

## 快速开始

### 环境要求
- Node.js 18+
- npm/yarn/pnpm/bun

### 安装依赖
```bash
npm install
# 或
yarn install
# 或
pnpm install
# 或
bun install
```

### 环境变量配置
1. 在项目根目录创建 `.env.local` 文件
2. 添加以下环境变量：
   ```env
   # LaTeX OCR API 配置
   NEXT_PUBLIC_LATEX_OCR_API_TOKEN=your_latex_ocr_api_token
   
   # Publication Finder API 配置
   NEXT_PUBLIC_PUB_FINDER_API_KEY=your_pub_finder_api_key
   ```

### 运行开发服务器
```bash
npm run dev
# 或
yarn dev
# 或
pnpm dev
# 或
bun dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看应用。

## 项目结构

```
ziuch-tools/
├── app/                          # Next.js App Router 页面
│   ├── api/                      # API 路由
│   │   ├── latex-ocr/           # LaTeX OCR API 端点
│   │   └── pub-finder/          # 文献查询 API
│   ├── latex-ocr/               # LaTeX OCR 页面
│   │   ├── detail/[id]/         # 单个公式详情页
│   │   ├── history/             # 公式识别历史
│   │   └── page.tsx             # 主要 LaTeX OCR 界面
│   ├── pub-finder/              # 文献查询页面
│   │   ├── deadline/            # 会议截止日期列表
│   │   ├── history/             # 搜索历史
│   │   └── page.tsx             # 主要文献搜索界面
│   ├── about/                   # 关于页面
│   ├── layout.tsx               # 根布局和导航
│   └── page.tsx                 # 首页
├── components/                   # React 组件
│   ├── ui/                      # shadcn/ui 组件
│   ├── latex-ocr/               # LaTeX OCR 相关组件
│   ├── pub-finder/              # 文献查询相关组件
│   ├── navbar.tsx               # 导航栏
│   ├── footer.tsx               # 页脚
│   └── theme-provider.tsx       # 主题管理
├── lib/                         # 工具库
│   ├── latex-ocr/               # LaTeX OCR 数据管理
│   ├── pub-finder/              # 文献查询逻辑
│   └── utils.ts                 # 共享工具
├── hooks/                       # 自定义 React Hooks
└── public/                      # 静态资源
```

## 核心功能说明

### 文献查询
- **实时数据**: 从多个权威数据源获取最新排名信息
- **智能搜索**: 支持期刊和会议名称模糊搜索
- **全面排名**: 整合 CCF、SCI、JCR、中科院等多种排名系统
- **会议追踪**: 实时更新会议投稿截止时间，支持倒计时显示

### 公式识别
- **多输入方式**: 支持图片上传、剪贴板粘贴、手绘输入
- **高精度算法**: 基于深度学习的 OCR 技术
- **格式丰富**: 输出标准 LaTeX 格式，支持多种复制选项
- **历史管理**: 完整的识别历史记录，支持搜索和管理

## 部署

### Vercel 部署
推荐使用 [Vercel 平台](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) 部署，它是 Next.js 的创建者提供的平台。

### 自定义部署
```bash
# 构建项目
npm run build

# 启动生产服务器
npm run start
```

## 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 致谢

- [Next.js](https://nextjs.org/) - React 框架
- [Tailwind CSS](https://tailwindcss.com/) - CSS 框架
- [shadcn/ui](https://ui.shadcn.com/) - 组件库
- [SimpleTex](https://simpletex.cn/) - LaTeX OCR API
- [EasyScholar](https://www.easyscholar.cc/) - 学术数据 API
- [CCF DDL](https://ccfddl.github.io/) - 会议截止日期数据
