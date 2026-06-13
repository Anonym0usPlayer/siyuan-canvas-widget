# Canvas 白板 — 思源笔记无限画布挂件

基于 [JSON Canvas](https://jsoncanvas.org/) 开放规范、借鉴 Obsidian Canvas 交互体验的思源笔记可视化白板挂件。在思源工作空间内创建思维导图、流程图、情绪板和可视化笔记关联。

<p align="center">
  <img src="preview.png" alt="Canvas 白板预览" width="800">
</p>

---

## 功能特性

### 画布与导航
- **无限画布** — 支持平移（鼠标中键 / 空格+拖拽 / 触摸）、缩放（滚轮 / 双指捏合）
- **缩放控件** — 右上角 `+` / `−` / 重置 / 全局总览按钮，实时显示缩放百分比
- **自适应网格** — 随缩放级别缩放的径向点阵网格，与 Obsidian Canvas 风格一致
- **触摸设备** — 单指平移、双指捏合缩放

### 节点类型（JSON Canvas 兼容）

| 类型 | 说明 | 特性 |
|------|------|------|
| **文本** | Markdown 内容卡片 | 富文本、8 种颜色、4 种形状、3 种边框、文字对齐 |
| **笔记** | 嵌入思源内容块 | 行内 HTML 渲染、`siyuan://` 链接可点击跳转、自动获取标题 |
| **媒体** | 图片展示 | 本地上传或外链 URL、自适应尺寸、加载失败占位图 |
| **组** | 带标签的容器 | 虚线蓝色边框、双击标题栏重命名、始终在最底层 |
| **链接** | 外部 URL 卡片 | URL + 显示文本、可点击（新标签页打开） |

### 连线（边）
- **贝塞尔曲线** — 方向感知的平滑 S 曲线，控制点自适应间距
- **箭头标记** — 两端可分别配置（无 / 箭头）
- **连线标签** — SVG 文本标签，带背景色，居中显示
- **实时重连** — 拖拽连线端点实时跟随鼠标，30px 内自动吸附锚点
- **宽命中区** — 16px 透明路径便于点击选中
- **无裁剪渲染** — SVG `overflow: visible` 确保任意画布位置的连线正确显示

### 选择与多选
- **单击**选中单张卡片或单条连线
- **框选** — 空白处左键拖拽画矩形框，松开后框选框保留，`Shift`/`Ctrl`/`Cmd` 追加选择
- **包围盒** — 框选框自动包含选中节点以及它们之间的连线
- **全选**（`Ctrl/Cmd+A`）、**取消选择**（`Escape`）
- **方向键微调** — 方向键（±5px），`Shift+方向键`（±20px）

### 编辑模式
- **自动编辑** — 新建文本卡片立即进入编辑模式
- **Markdown 编辑** — 源码编辑，失焦自动渲染预览
- **双击**文本卡片进入编辑；`Escape` 或 `Ctrl/Cmd+Enter` 保存
- **组重命名** — 双击组标题栏即可重命名

### 拖放
- **工具栏拖拽** — 从底部工具栏拖出，鼠标旁显示卡片/组的缩略预览图
- **缩略图标** — 工具栏按钮显示缩小版卡片和组样式（无文字标签）
- **视觉反馈** — 源按钮变暗，画布显示虚线外框

### 右键菜单

**空白画布**（右键）：
- 添加文本（在点击位置创建）、撤销、粘贴
- 对齐网格、对齐物体、只读模式切换

**卡片 / 多选**（右键）：
- 聚焦当前卡片、创建分组（≥2 张卡片）
- 剪切、复制、粘贴、删除

**连线**（右键）：删除连接线

### 剪贴板与历史
- **复制/粘贴**（`Ctrl/Cmd+C/V`）— 含完整节点+边数据
- **复制副本**（`Ctrl/Cmd+D`）— 偏移复制选中节点
- **外部粘贴**（空剪贴板时 `Ctrl/Cmd+V`）— 将纯文本粘贴为卡片
- **撤销/重做**（`Ctrl/Cmd+Z` / `Ctrl/Cmd+Y` 或 `Ctrl/Cmd+Shift+Z`）— 50 步历史，严格逐级撤销
- **点击安全** — 仅点击卡片不拖拽不会产生撤销记录
- **批量历史** — 组合操作（锚点拖出卡片+连线、粘贴、复制）只计为一步撤销

### 数据持久化
- **自动保存** — 操作后 300ms 防抖保存，通过思源内核 API
- **强制保存** — 页面失焦、可见性变化、`Ctrl/Cmd+S`
- **关闭前保存** — `navigator.sendBeacon` 兜底，标签页关闭时数据不丢失
- **设置持久化** — 对齐网格、对齐物体、只读状态会保存并在下次打开时恢复
- **JSON Canvas 格式** — `.canvas` 文件存于 `/data/assets/CanvasFiles/`，可被 Obsidian Canvas 读取

### 其他功能
- **对齐网格** — 默认开启，拖拽时节点自动吸附到 20px 网格
- **只读模式** — 禁止所有交互操作，隐藏底部工具栏，状态持久化
- **导出为 PNG**（`Ctrl/Cmd+E`）— 将整个画布导出到 `data/assets/canvas-export-*.png`
- **聚焦卡片** — 将视口居中对齐到指定卡片
- **总览全局** — 自动缩放以显示所有节点
- **重置视图** — 双击画布空白处重置缩放和平移
- **搜索**（`Ctrl/Cmd+F`）— 按关键词搜索文本节点，支持结果导航
- **亮色/暗色主题** — 自动跟随系统设置
- **锚点智能显示** — 鼠标靠近卡片哪一侧，仅显示该侧的连接锚点

---

## 安装

1. 将 `siyuan-canvas-widget` 文件夹复制到思源工作空间的 `data/widgets/` 目录下
2. 在思源中输入 `/widget` 并搜索 "canvas" 插入挂件
3. 挂件自动初始化 — 从底部工具栏开始添加卡片

```
data/widgets/siyuan-canvas-widget/
├── index.html       # 挂件入口
├── index.js         # 画布引擎
├── styles.css       # Obsidian Canvas 风格主题
├── widget.json      # 挂件清单
├── icon.png         # 160×160 图标
├── preview.png      # 1024×768 预览
├── README.md        # 英文文档
└── README_zh_CN.md  # 本文档
```

## 使用指南

### 快速上手
1. 通过 `/widget` → Canvas 插入挂件
2. 点击或拖拽底部工具栏按钮到画布上创建卡片
3. 鼠标悬停卡片边缘 → 出现蓝色连接点，拖拽创建连线
4. 双击文本卡片编辑 Markdown
5. 右键弹出上下文菜单

### 键盘快捷键

| 快捷键 | 操作 |
|--------|------|
| `空格 + 拖拽` | 平移画布 |
| `鼠标中键 + 拖拽` | 平移画布 |
| `滚轮` | 缩放 |
| `Delete` / `Backspace` | 删除选中项 |
| `Ctrl/Cmd+A` | 全选 |
| `Escape` | 取消选择 / 取消编辑 |
| `Ctrl/Cmd+C` | 复制 |
| `Ctrl/Cmd+V` | 粘贴 |
| `Ctrl/Cmd+D` | 复制副本 |
| `Ctrl/Cmd+Z` | 撤销 |
| `Ctrl/Cmd+Y` / `Ctrl/Cmd+Shift+Z` | 重做 |
| `Ctrl/Cmd+F` | 搜索节点 |
| `Ctrl/Cmd+S` | 强制保存 |
| `Ctrl/Cmd+E` | 导出为 PNG |
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
      "color": "blue",
      "shape": "rounded",
      "border": "solid",
      "align": "left"
    }
  ],
  "edges": [
    {
      "id": "edge_xyz",
      "fromNode": "abc123",
      "fromSide": "right",
      "toNode": "def456",
      "toSide": "left",
      "fromEnd": "none",
      "toEnd": "arrow",
      "label": "",
      "color": "#808080"
    }
  ],
  "viewport": { "x": 0, "y": 0, "zoom": 1 },
  "settings": {
    "isSnapToGrid": true,
    "isAlignObjects": false,
    "isReadOnly": false
  }
}
```

思源扩展字段：`blockId`、`mediaUrl`、`mediaType`、`label`、`background`、`backgroundStyle`。

## 技术栈

| 层级 | 技术 |
|------|------|
| **运行时** | 纯 HTML/CSS/JS（零依赖），在思源 `<iframe>` 挂件中运行 |
| **画布引擎** | CSS Transform（translate + scale）+ `will-change` 优化；SVG 渲染连线 |
| **数据存储** | 思源内核 HTTP API（`/api/file/putFile`、`/api/file/getFile`） |
| **笔记嵌入** | 思源内核 API（`/api/filetree/getDoc`、`/api/block/getBlockKramdown`） |
| **序列化** | [JSON Canvas Spec 1.0](https://jsoncanvas.org/spec/1.0/) |
| **样式** | CSS 自定义属性，亮色/暗色自适应，GPU 渲染优化 |

## 许可证

MIT
