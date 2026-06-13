# Canvas Widget — Infinite Whiteboard for SiYuan Note

A visual canvas widget for [SiYuan Note](https://b3log.org/siyuan/), implementing the open [JSON Canvas](https://jsoncanvas.org/) specification with Obsidian Canvas-style interactions. Create mind maps, flowcharts, mood boards, and visual note connections inside your SiYuan workspace.

<p align="center">
  <img src="preview.png" alt="Canvas Widget Preview" width="800">
</p>

---

## Features

### Canvas & Navigation
- **Infinite canvas** — pan (middle-mouse / Space+drag / touch), zoom (scroll wheel / pinch)
- **Zoom controls** — `+` / `−` / reset / fit-all with percentage indicator (top-right toolbar)
- **Adaptive grid** — radial-dot grid scales with zoom level, matching Obsidian Canvas style
- **Touch support** — single-finger pan, two-finger pinch zoom

### Node Types (JSON Canvas Compatible)

| Type | Description | Key Features |
|------|-------------|-------------|
| **Text** | Markdown content card | Rich text, 8 colors, 4 shapes, 3 border styles, text alignment |
| **Note** | Embed SiYuan blocks | Inline block HTML rendering, clickable `siyuan://` links, auto-title |
| **Media** | Image display | Local upload or URL, auto-fit, placeholder on error |
| **Group** | Container with label | Dashed border, renamable header (double-click), always bottom layer |
| **Link** | External URL card | URL + display text, clickable (opens in new tab) |

### Edges (Connections)
- **Bezier curves** — smooth S-curves with directional control points
- **Arrow markers** — configurable both ends (none / arrow)
- **Edge labels** — SVG text label at midpoint with background
- **Live reconnection** — drag edge endpoints to reconnect in real-time, auto-snap to anchors within 30px
- **Wide hit area** — 16px transparent stroke for easy selection
- **No-clip rendering** — SVG `overflow: visible` ensures edges render correctly at any canvas position

### Selection
- **Single-select** — click card or edge
- **Marquee (box) selection** — drag on empty canvas, persistent selection rectangle with `Shift`/`Ctrl`/`Cmd` for additive selection
- **Bounding box** — encompasses selected nodes AND their connecting edges
- **Select all** (`Ctrl/Cmd+A`), **clear** (`Escape`)
- **Keyboard nudge** — arrow keys (±5px), `Shift+arrow` (±20px)

### Editing
- **Auto-edit** — new text cards enter edit mode immediately
- **Markdown** — raw source editing, rendered preview on blur
- **Double-click** text card to edit; `Escape` or `Ctrl/Cmd+Enter` to save
- **Group rename** — double-click group header

### Drag & Drop
- **Toolbar drag** — drag toolbar buttons onto canvas; card/group preview follows cursor
- **Miniature icons** — toolbar shows scaled-down card and group previews (no text labels)
- **Visual feedback** — source button dims, canvas shows dashed border on drag-over

### Context Menus

**Empty canvas** (right-click):
- Add Text (at click position), Undo, Paste
- Snap to Grid toggle, Align Objects toggle, Read-Only toggle

**Card / Multi-selection** (right-click):
- Focus Card, Create Group (≥2 cards selected)
- Cut, Copy, Paste, Delete

**Edge** (right-click): Delete Connection

### Clipboard & History
- **Copy/Paste** (`Ctrl/Cmd+C/V`) — full node+edge data in clipboard
- **Duplicate** (`Ctrl/Cmd+D`) — clone selected nodes with offset
- **External paste** (`Ctrl/Cmd+V` on empty clipboard) — paste plain text as cards
- **Undo/Redo** (`Ctrl/Cmd+Z` / `Ctrl/Cmd+Y` or `Ctrl/Cmd+Shift+Z`) — 50-step history, strict step-by-step undo
- **Click-safe** — clicking a card without dragging does NOT create an undo step
- **Batch history** — composite operations (drag-to-create card+edge, paste, duplicate) count as one undo step

### Data Persistence
- **Auto-save** — debounced 300ms after changes, via SiYuan Kernel API
- **Force save** — on page blur, visibility change, `Ctrl/Cmd+S`
- **BeforeUnload** — `navigator.sendBeacon` for reliable save on tab close
- **Settings persistence** — snap-to-grid, align-objects, and read-only states are saved and restored across sessions
- **JSON Canvas format** — `.canvas` files stored in `/data/assets/CanvasFiles/`, readable by Obsidian Canvas

### Additional Features
- **Snap to grid** — on by default, aligns nodes to 20px grid during drag
- **Read-only mode** — disables all interactions, hides bottom toolbar, persists across sessions
- **Export as PNG** (`Ctrl/Cmd+E`) — exports entire canvas to `data/assets/canvas-export-*.png`
- **Focus card** — center viewport on a specific card
- **Fit all** — zoom to show all nodes
- **Reset view** — double-click canvas to reset zoom/pan
- **Search** (`Ctrl/Cmd+F`) — search text nodes by keyword with result navigation
- **Light/Dark theme** — auto-detects system preference
- **Smart anchor display** — only the anchor on the hovered card edge is shown

---

## Installation

1. Copy the `siyan-canvas-widget` folder into your SiYuan workspace under `data/widgets/`
2. In SiYuan, type `/widget` and search for "canvas" to insert the widget
3. The widget auto-initializes — start adding cards from the toolbar

```
data/widgets/siyuan-canvas-widget/
├── index.html       # Widget entry
├── index.js         # Canvas engine
├── styles.css       # Obsidian Canvas-style theme
├── widget.json      # Widget manifest
├── icon.png         # 160×160 icon
├── preview.png      # 1024×768 preview
├── README.md        # This file
└── README_zh_CN.md  # Chinese README
```

## Usage

### Quick Start
1. Insert the widget via `/widget` → Canvas
2. Click or drag toolbar buttons onto the canvas to create cards
3. Hover near card edges → drag anchor dots to create connections
4. Double-click text cards to edit Markdown
5. Right-click for context menus

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Space + Drag` | Pan canvas |
| `Middle Mouse + Drag` | Pan canvas |
| `Scroll Wheel` | Zoom |
| `Delete` / `Backspace` | Delete selected |
| `Ctrl/Cmd+A` | Select all |
| `Escape` | Clear selection / cancel edit |
| `Ctrl/Cmd+C` | Copy |
| `Ctrl/Cmd+V` | Paste |
| `Ctrl/Cmd+D` | Duplicate |
| `Ctrl/Cmd+Z` | Undo |
| `Ctrl/Cmd+Y` / `Ctrl/Cmd+Shift+Z` | Redo |
| `Ctrl/Cmd+F` | Search nodes |
| `Ctrl/Cmd+S` | Force save |
| `Ctrl/Cmd+E` | Export as PNG |
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

Extended SiYuan-specific fields on nodes: `blockId`, `mediaUrl`, `mediaType`, `label`, `background`, `backgroundStyle`.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Runtime** | Vanilla HTML/CSS/JS (zero dependencies), loaded in SiYuan `<iframe>` widget |
| **Canvas Engine** | CSS Transform (translate + scale) with `will-change` optimization; SVG for edge rendering |
| **Data Storage** | SiYuan Kernel HTTP API (`/api/file/putFile`, `/api/file/getFile`) |
| **Note Embedding** | SiYuan Kernel API (`/api/filetree/getDoc`, `/api/block/getBlockKramdown`) |
| **Serialization** | [JSON Canvas Spec 1.0](https://jsoncanvas.org/spec/1.0/) |
| **Styling** | CSS custom properties, light/dark auto-theme, GPU-optimized rendering |

## License

MIT
