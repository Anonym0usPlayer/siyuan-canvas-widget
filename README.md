# Canvas Widget — Infinite Whiteboard for SiYuan Note

A visual canvas widget for [SiYuan Note](https://b3log.org/siyuan/), inspired by Obsidian Canvas. Create text cards, groups, and connections on an infinite whiteboard inside your SiYuan workspace.

<p align="center">
  <img src="preview.png" alt="Canvas Widget Preview" width="800">
</p>

---

## Features

### Cards
- **Text cards** — Markdown content, 8 colors, rounded/rect shapes, solid/dashed borders
- **Group cards** — dashed-border containers with renamable header, always behind other cards
- **Drag from toolbar** — drag card/group buttons onto canvas, preview follows cursor
- **Auto-edit** — new text cards enter edit mode immediately, double-click to re-edit

### Connections
- **Bezier curves** — drag from card edge anchors to create smooth connections between cards
- **Arrows** — directional arrow markers on connection lines
- **Reconnect** — drag edge endpoints to reconnect to different cards in real-time

### Canvas & Navigation
- **Infinite canvas** — pan (middle-mouse / Space+drag / touch), zoom (scroll wheel / pinch)
- **Zoom controls** — `+` / `−` / reset / fit-all buttons with percentage indicator
- **Adaptive grid** — radial-dot grid scales with zoom level
- **Touch support** — single-finger pan, two-finger pinch zoom

### Selection & Editing
- **Click** to select, **drag** to move, **resize handles** on all four corners and edges
- **Marquee selection** — drag on empty canvas to select multiple cards
- **Keyboard nudge** — arrow keys (±5px), `Shift+arrow` (±20px)
- **Copy/Paste** (`Ctrl/Cmd+C/V`), **Duplicate** (`Ctrl/Cmd+D`), **Delete** (`Backspace`)
- **Undo/Redo** (`Ctrl/Cmd+Z` / `Ctrl/Cmd+Y`) — 50-step history, strict step-by-step

### Settings (persist across sessions)
- **Snap to grid** — on by default, aligns nodes to 20px grid during drag
- **Read-only mode** — disables editing, hides toolbar
- **Export as PNG** (`Ctrl/Cmd+E`) — saves to `data/assets/`

### Data
- **Auto-save** — debounced 300ms, via SiYuan Kernel API
- **Settings persistence** — grid, read-only state saved and restored on reload
- **JSON Canvas format** — `.canvas` files, interoperable with Obsidian Canvas

---

## Installation

1. Copy `siyuan-canvas-widget/` into your SiYuan workspace under `data/widgets/`
2. In SiYuan, type `/widget` and search for "Canvas 白板"
3. Start adding cards from the bottom toolbar

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Space + Drag` / `Middle Mouse` | Pan canvas |
| `Scroll Wheel` | Zoom |
| `Delete` / `Backspace` | Delete selected |
| `Ctrl/Cmd+A` | Select all |
| `Escape` | Clear selection |
| `Ctrl/Cmd+C/V` | Copy / Paste |
| `Ctrl/Cmd+D` | Duplicate |
| `Ctrl/Cmd+Z` / `Ctrl/Cmd+Y` | Undo / Redo |
| `Ctrl/Cmd+F` | Search cards |
| `Ctrl/Cmd+S` | Force save |
| `Ctrl/Cmd+E` | Export as PNG |
| `Arrow Keys` | Nudge selected (±5px) |
| `Shift+Arrow` | Nudge selected (±20px) |

## Data Format

```json
{
  "version": "1.0",
  "nodes": [{
    "id": "abc123",
    "type": "text",
    "x": 100, "y": 200,
    "width": 250, "height": 120,
    "text": "# Hello\nWorld",
    "color": "blue"
  }],
  "edges": [{
    "id": "edge_xyz",
    "fromNode": "abc123",
    "fromSide": "right",
    "toNode": "def456",
    "toSide": "left",
    "toEnd": "arrow"
  }],
  "viewport": { "x": 0, "y": 0, "zoom": 1 },
  "settings": {
    "isSnapToGrid": true,
    "isReadOnly": false
  }
}
```

## License

MIT
