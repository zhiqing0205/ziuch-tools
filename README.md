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

### 📅 学术日历 (Academic Calendar)
- **蛇形时间线**: Z字形折返的12个月可视化时间轴
- **会议可视化**: 基于 CCF 推荐会议数据的时间线展示
- **智能会议选择**:
  - 统一的搜索和选择 Combobox
  - 支持按名称、年份、领域实时过滤
  - 多年份会议自动弹出年份选择对话框
  - 已选会议快速管理（点击标签移除）
- **四方向智能布局**: 会议标记自动分布在月份的上下左右，避免重叠
- **贝塞尔曲线连线**: 平滑优雅的连线精准连接到卡片边缘
- **双重时间标识**:
  - 当前时间位置指示器（蓝色双圆）
  - 当前月份高亮（红色双圆 + 发光效果）
- **时间样式区分**:
  - 已过去的会议和时间线使用虚线和灰色标识
  - 可切换时间分界模式（截止日期/开始日期）
- **设置持久化**: 所有选择和设置自动保存到浏览器
- **图片导出**: 一键导出当前日历视图为 PNG 图片
- **会议卡片信息**: 显示会议名称和截止日期（M月d日格式）

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
- **Next.js 15.1.9**: React 框架，使用 App Router
- **React 18.3.1**: UI 库
- **TypeScript**: 类型安全
- **Tailwind CSS**: 样式框架
- **shadcn/ui**: 基于 Radix UI 的组件库
- **KaTeX**: 数学公式渲染
- **html2canvas**: 截图生成
- **react-masonry-css**: 响应式网格布局
- **date-fns**: 日期处理和格式化

### 后端/API
- **Next.js API Routes**: 服务端功能
- **外部 API**:
  - SimpleTex API (LaTeX OCR)
  - EasyScholar API (期刊排名)
  - CCF DDL (会议数据)

### 数据管理
- **IndexedDB**: 优先使用的客户端数据库（会议数据缓存）
- **LocalStorage**: 降级方案和设置持久化
- **YAML 解析**: 会议数据处理
- **缓存策略**: 智能缓存机制（1天有效期）

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
   LATEX_OCR_API_TOKEN=your_latex_ocr_api_token
   
   # Publication Finder API 配置
   PUB_FINDER_API_KEY=your_pub_finder_api_key
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
│   │   ├── ccf-data/            # CCF 会议数据 API
│   │   ├── latex-ocr/           # LaTeX OCR API 端点
│   │   └── pub-finder/          # 文献查询 API
│   ├── academic-calendar/        # 学术日历页面
│   │   └── page.tsx             # 学术日历可视化界面
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
│   ├── academic-calendar/       # 学术日历相关组件
│   │   ├── ConferenceCombobox.tsx    # 会议多选组件
│   │   ├── ConferenceMarkers.tsx     # 会议标记组件
│   │   ├── Controls.tsx              # 控制面板
│   │   ├── Legend.tsx                # 图例说明
│   │   ├── MonthMarkers.tsx          # 月份标记
│   │   ├── Timeline.tsx              # 时间线组件
│   │   ├── YearSelectionDialog.tsx   # 年份选择对话框
│   │   ├── layout.ts                 # 布局算法
│   │   ├── types.ts                  # 类型定义
│   │   ├── utils.ts                  # 工具函数
│   │   └── hooks/                    # 自定义 Hooks
│   ├── latex-ocr/               # LaTeX OCR 相关组件
│   ├── pub-finder/              # 文献查询相关组件
│   ├── navbar.tsx               # 导航栏
│   ├── footer.tsx               # 页脚
│   └── theme-provider.tsx       # 主题管理
├── lib/                         # 工具库
│   ├── latex-ocr/               # LaTeX OCR 数据管理
│   ├── pub-finder/              # 文献查询逻辑
│   │   ├── cache-manager.ts     # IndexedDB 缓存管理
│   │   ├── conference.ts        # 会议数据处理
│   │   └── types.ts             # 类型定义
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

### 学术日历
- **可视化时间轴**: 创新的蛇形布局，清晰展示全年12个月
- **会议管理**: 从 CCF 推荐会议中选择关注的会议，支持多年份选择
- **智能布局**: 四方向分布算法，自动避免会议标记重叠
- **时间追踪**:
  - 实时显示当前时间位置（蓝色指示器）
  - 红色高亮当前月份，快速定位
  - 虚线区分已过去的时间段
- **个性化设置**: 所有配置自动保存，包括选中的会议、显示选项等
- **便捷导出**: 支持将日历导出为高清 PNG 图片

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
