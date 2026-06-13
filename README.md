# Canvas Widget — Infinite Whiteboard for SiYuan Note

A visual canvas widget for [SiYuan Note](https://b3log.org/siyuan/), implementing the open [JSON Canvas](https://jsoncanvas.org/) specification with Obsidian Canvas-style interactions. Create mind maps, flowcharts, mood boards, and visual note connections inside your SiYuan workspace.

<p align="center">
  <img src="preview.png" alt="Canvas Widget Preview" width="800">
</p>

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Runtime** | Vanilla HTML/CSS/JS (zero dependencies), loaded in SiYuan `<iframe>` widget |
| **Canvas Engine** | CSS Transform (translate + scale) with will-change optimization; SVG for edge rendering |
| **Data Storage** | SiYuan Kernel HTTP API (`/api/file/putFile`, `/api/file/getFile`) — `.canvas` JSON file in `/data/assets/CanvasFiles/` |
| **Note Embedding** | SiYuan Kernel API `/api/filetree/getDoc`, `/api/block/getBlockKramdown`, `/api/query/sql` |
| **Serialization** | [JSON Canvas Spec 1.0](https://jsoncanvas.org/spec/1.0/) — interoperable with Obsidian Canvas |
| **Styling** | CSS custom properties, light/dark auto-theme, responsive layout |

---

## Features

### Canvas & Navigation
- **Infinite canvas** — pan (middle-mouse / Space+drag / touch), zoom (scroll wheel / pinch / bottom-right controls)
- **Zoom controls** — `+` / `−` / reset buttons with percentage indicator (bottom-right)
- **Adaptive grid** — radial-dot grid that scales with zoom level, matching Obsidian Canvas
- **Touch support** — single-finger pan, two-finger pinch zoom

### Node Types (JSON Canvas Compatible)

| Type | Description | Key Attributes |
|------|-------------|---------------|
| **Text** | Markdown content card | `text`, color, shape, border, alignment |
| **File / Note** | Embed any SiYuan block | `file` (block ID), embedded HTML with clickable links |
| **Media** | Image display | local upload or URL, auto-fit |
| **Group** | Container with label | dashed border, renamable header, always bottom layer |
| **Link** | External URL card | URL + display text, clickable (backward compatible) |

### Edges (Connections)
- **Bezier curves** — direction-aware smooth S-curves based on anchor side
- **Arrow markers** — configurable `fromEnd` / `toEnd` (none / arrow)
- **Edge labels** — SVG text with background, positioned at midpoint
- **Live reconnection** — drag edge endpoints to reconnect, real-time path update (no dashed preview), auto-snap to anchors within 30px
- **Wide hit area** — 16px transparent stroke for easy clicking

### Selection & Multi-Select
- **Click** to select single card/edge
- **Marquee (box) selection** — left-drag on empty canvas, persistent selection rectangle with `Shift`/`Ctrl` for additive selection
- **Select all** (`Ctrl+A`), **clear** (`Escape`)
- **Keyboard movement** — arrow keys (±5px), `Shift+arrow` (±20px)

### Editing
- **Auto-edit** — new text cards enter edit mode immediately
- **Markdown editing** — raw markdown source editing, rendered preview on blur
- **Double-click** to edit text cards; `Escape` or `Ctrl+Enter` to save; `Escape` to cancel
- **Group rename** — double-click group header to rename

### Drag & Drop
- **Toolbar drag** — drag any toolbar button onto canvas to create card at drop position
- **Visual feedback** — source button dims, canvas shows dashed outline on drag-over

### Context Menus

**Empty canvas** (right-click):
- Add Text (at click position), Undo, Paste
- Snap to Grid, Align Objects (disabled), Read-Only toggle

**Card / Multi-selection** (right-click):
- Focus Card, Create Group (≥2 cards selected)
- Cut, Copy, Paste, Delete

**Edge** (right-click): Delete Connection

### Clipboard & History
- **Copy/Paste** (`Ctrl+C/V`) — clipboard with full node+edge data
- **Duplicate** (`Ctrl+D`) — clone selected nodes with offset
- **Undo/Redo** (`Ctrl+Z`/`Ctrl+Y` or `Ctrl+Shift+Z`) — 50-step history stack
- **Cut** — copy + delete

### Data Persistence
- **Auto-save** — debounced (2s), via SiYuan Kernel API
- **Force save** — on page blur, visibility change, `Ctrl+S`
- **BeforeUnload** — `navigator.sendBeacon` fallback for reliable save on tab close
- **JSON Canvas format** — `.canvas` files readable by Obsidian Canvas

### Additional Features
- **Focus card** — center viewport on a specific card
- **Reset view** — double-click canvas to reset
- **Snap to grid** — align selected nodes to 20px grid
- **Read-only mode** — disable all card interactions
- **Search** (`Ctrl+F`) — search text nodes by keyword, navigate results
- **Light/Dark theme** — auto-detects system preference
- **Anchor visibility** — only the anchor on the hovered card edge is shown (not all four)

---

## Installation

1. Copy the `siyuan-canvas-widget` folder into your SiYuan workspace under `data/widgets/`
2. In SiYuan, type `/widget` and search for "canvas" to insert the widget
3. The widget auto-initializes — start adding cards from the toolbar

```
data/widgets/siyuan-canvas-widget/
├── index.html       # Widget entry (88 lines)
├── index.js         # Canvas engine (3600+ lines)
├── styles.css       # Obsidian Canvas-style theme (1123 lines)
├── widget.json      # Widget manifest
├── icon.png         # 160×160 icon
├── preview.png      # 1024×768 preview
├── README.md        # This file
└── README_zh_CN.md  # Chinese README
```

## Usage

### Quick Start
1. Insert the widget via `/widget` → Canvas
2. Click toolbar buttons or drag them onto the canvas to create cards
3. Hover near card edges → drag anchor dots to create connections
4. Double-click text cards to edit Markdown
5. Right-click for context menus

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Space + Drag` | Pan canvas |
| `Scroll Wheel` | Zoom |
| `Delete` / `Backspace` | Delete selected |
| `Ctrl+A` | Select all |
| `Escape` | Clear selection |
| `Ctrl+C` / `Ctrl+V` | Copy / Paste |
| `Ctrl+D` | Duplicate |
| `Ctrl+Z` / `Ctrl+Y` | Undo / Redo |
| `Ctrl+F` | Search nodes |
| `Ctrl+S` | Force save |
| `Arrow Keys` | Nudge selected (±5px) |
| `Shift+Arrow` | Nudge selected (±20px) |

## JSON Canvas Compatibility

The widget stores data in JSON Canvas 1.0 format, ensuring interoperability with tools that support the spec:

```json
{
  "version": "1.0",
  "nodes": [
    {
      "id": "abc123",
      "type": "text",
      "x": 100, "y": 200,
      "width": 250, "height": 120,
      "text": "# Hello\nWorld",
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

Extended SiYuan-specific fields: `blockId`, `mediaUrl`, `mediaType`, `label`, `background`, `backgroundStyle`.

## License

MIT
