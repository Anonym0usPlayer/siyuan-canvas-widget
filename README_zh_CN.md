# Canvas 白板 — 思源笔记无限画布挂件

基于 [JSON Canvas](https://jsoncanvas.org/) 开放规范、借鉴 Obsidian Canvas 交互体验的思源笔记可视化白板挂件。在思源工作空间内创建思维导图、流程图、情绪板和可视化笔记关联。

---

## 技术栈

| 层级 | 技术 |
|------|------|
| **运行时** | 纯 HTML/CSS/JS（零依赖），在思源 `<iframe>` 挂件中运行 |
| **画布引擎** | CSS Transform（translate + scale）+ will-change 优化；SVG 渲染连线 |
| **数据存储** | 思源内核 HTTP API（`/api/file/putFile`、`/api/file/getFile`）— `.canvas` JSON 文件存于 `/data/assets/CanvasFiles/` |
| **笔记嵌入** | 思源内核 API `/api/filetree/getDoc`、`/api/block/getBlockKramdown`、`/api/query/sql` |
| **序列化** | [JSON Canvas Spec 1.0](https://jsoncanvas.org/spec/1.0/) — 与 Obsidian Canvas 互通 |
| **样式** | CSS 自定义属性，亮色/暗色自适应主题，响应式布局 |

---

## 功能特性

### 画布与导航
- **无限画布** — 支持平移（鼠标中键 / 空格+拖拽 / 触摸）、缩放（滚轮 / 双指捏合 / 右下角控件）
- **缩放控件** — 右下角 `+` / `−` / 重置按钮，实时显示缩放百分比
- **自适应网格** — 随缩放级别缩放的径向点阵网格，与 Obsidian Canvas 一致
- **触摸设备** — 单指平移、双指缩放

### 节点类型（JSON Canvas 兼容）

| 类型 | 说明 | 关键属性 |
|------|------|---------|
| **文本** | Markdown 内容卡片 | `text`、颜色、形状、边框、对齐 |
| **文件 / 笔记** | 嵌入任意思源块 | `file`（块ID），嵌入 HTML 含可点击超链接 |
| **媒体** | 图片展示 | 本地上传或 URL，自适应尺寸 |
| **组** | 带标签的容器 | 虚线边框，可重命名标题栏，始终在最底层 |
| **链接** | 外部 URL 卡片 | URL + 显示文本，可点击（向后兼容） |

### 连线（边）
- **贝塞尔曲线** — 基于锚点方向感知的平滑 S 曲线
- **箭头标记** — 可配置 `fromEnd` / `toEnd`（none / arrow）
- **连线标签** — 带背景的 SVG 文本，显示在中点位置
- **实时重连** — 拖拽端点即可重连，连线实时跟随鼠标（无虚线预览），30px 内自动吸附锚点
- **宽命中区** — 16px 透明线条便于点击

### 选择与多选
- **单击**选中单张卡片/连线
- **框选** — 空白处左键拖拽画矩形，松开后框选框保留，`Shift`/`Ctrl` 追加选择
- **全选**（`Ctrl+A`）、**取消选择**（`Escape`）
- **方向键移动** — 方向键（±5px），`Shift+方向键`（±20px）

### 编辑
- **自动编辑** — 新建文本卡片自动进入编辑模式
- **Markdown 编辑** — 源码编辑 Markdown，失焦后渲染预览
- **双击**编辑文本卡片；`Escape` 或 `Ctrl+Enter` 保存；`Escape` 取消
- **组重命名** — 双击组标题栏重命名

### 拖放
- **工具栏拖拽** — 将工具栏按钮拖到画布上，在释放位置创建卡片
- **视觉反馈** — 拖拽源按钮变暗，画布显示虚线边框

### 右键菜单

**空白画布**：
- 添加文本（在点击位置创建）、撤销、粘贴
- 对齐网格、对齐物体（禁用）、只读模式切换

**卡片 / 多选**：
- 聚焦当前卡片、创建分组（需选中 ≥2 张卡片）
- 剪切、复制、粘贴、删除

**连线**：删除连接线

### 剪贴板与历史
- **复制/粘贴**（`Ctrl+C/V`）— 含完整节点+边数据
- **复制副本**（`Ctrl+D`）— 偏移复制选中节点
- **撤销/重做**（`Ctrl+Z`/`Ctrl+Y`）— 50 步历史记录
- **剪切** — 复制并删除

### 数据持久化
- **自动保存** — 防抖 2 秒，通过思源内核 API
- **强制保存** — 页面失焦、可见性变化、`Ctrl+S`
- **关闭前保存** — `navigator.sendBeacon` 兜底保证标签页关闭时可靠保存
- **JSON Canvas 格式** — `.canvas` 文件可被 Obsidian Canvas 读取

### 其他功能
- **聚焦卡片** — 将画布定位到指定卡片
- **重置视图** — 双击画布重置
- **对齐网格** — 将选中节点对齐到 20px 网格
- **只读模式** — 禁止所有卡片交互
- **搜索**（`Ctrl+F`）— 按关键词搜索文本节点，导航结果
- **亮色/暗色主题** — 自动跟随系统设置
- **锚点智能显示** — 鼠标靠近卡片某一边时，仅显示该侧的连接点

---

## 安装

1. 将 `siyuan-canvas-widget` 文件夹复制到思源工作空间的 `data/widgets/` 目录下
2. 在思源中输入 `/widget` 并搜索 "canvas" 插入挂件
3. 挂件自动初始化 — 从底部工具栏开始添加卡片

```
data/widgets/siyuan-canvas-widget/
├── index.html       # 挂件入口（88 行）
├── index.js         # 画布引擎（3600+ 行）
├── styles.css       # Obsidian Canvas 风格主题（1123 行）
├── widget.json      # 挂件清单
├── icon.png         # 160×160 图标
├── preview.png      # 1024×768 预览
├── README.md        # 英文文档
└── README_zh_CN.md  # 本文档
```

## 使用指南

### 快速上手
1. 通过 `/widget` → Canvas 插入挂件
2. 点击工具栏按钮或拖拽到画布上创建卡片
3. 鼠标悬停卡片边缘 → 出现连接点，拖拽创建连线
4. 双击文本卡片编辑 Markdown
5. 右键弹出上下文菜单

### 键盘快捷键

| 快捷键 | 操作 |
|--------|------|
| `空格 + 拖拽` | 平移画布 |
| `滚轮` | 缩放 |
| `Delete` / `Backspace` | 删除选中项 |
| `Ctrl+A` | 全选 |
| `Escape` | 取消选择 |
| `Ctrl+C` / `Ctrl+V` | 复制 / 粘贴 |
| `Ctrl+D` | 复制副本 |
| `Ctrl+Z` / `Ctrl+Y` | 撤销 / 重做 |
| `Ctrl+F` | 搜索节点 |
| `Ctrl+S` | 强制保存 |
| `方向键` | 微调选中（±5px） |
| `Shift+方向键` | 微调选中（±20px） |

## JSON Canvas 兼容性

挂件使用 JSON Canvas 1.0 格式存储数据，与支持该规范的工具互通：

```json
{
  "version": "1.0",
  "nodes": [
    {
      "id": "abc123",
      "type": "text",
      "x": 100, "y": 200,
      "width": 250, "height": 120,
      "text": "# 你好\n世界",
      "color": "blue"
    }
  ],
  "edges": [
    {
      "id": "edge_xyz",
      "fromNode": "abc123",
      "fromSide": "right",
      "toNode": "def456",
      "toSide": "left",
      "toEnd": "arrow"
    }
  ],
  "viewport": { "x": 0, "y": 0, "zoom": 1 }
}
```

思源扩展字段：`blockId`、`mediaUrl`、`mediaType`、`label`、`background`、`backgroundStyle`。

## 许可证

MIT
