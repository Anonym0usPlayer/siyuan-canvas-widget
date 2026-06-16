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
- **Toolbar auto-hide** — toolbars fade out when mouse leaves, custom tooltips on hover
- **Auto-edit** — new text cards enter edit mode immediately; `<textarea>` for reliable line breaks and Tab indentation

### Connections
- **Bezier curves** — drag from card edge anchors to create smooth connections between cards
- **Anchor snapping** — drag a connection near a target card's anchor to snap into place
- **Arrows** — directional arrow markers on connection lines
- **Reconnect** — drag edge endpoints to reconnect to different cards in real-time

### Canvas & Navigation
- **Infinite canvas** — pan (middle-mouse / Space+drag / touch), zoom (scroll wheel / pinch)
- **Zoom controls** — `+` / `−` / reset / fit-all buttons with percentage indicator
- **Adaptive grid** — radial-dot grid scales with zoom level
- **Touch support** — single-finger pan, two-finger pinch zoom

### Selection & Editing
- **Click** to select, **drag** to move, **resize handles** on all four corners and edges
- **Alignment guides** — snap to other cards' edges and centers, with magenta guide lines during drag
- **Option/Alt-drag** — duplicate a card by holding Option (Mac) / Alt (Win/Linux) while dragging
- **Option/Alt+Shift-drag** — duplicate and lock to horizontal/vertical axis
- **Marquee selection** — drag on empty canvas to select multiple cards, then drag the selection box to move them all at once
- **Keyboard nudge** — arrow keys (±5px), `Shift+arrow` (±20px)
- **Copy/Paste** (`Ctrl/Cmd+C/V`), **Duplicate** (`Ctrl/Cmd+D`), **Delete** (`Backspace`)
- **Undo/Redo** (`Ctrl/Cmd+Z` / `Ctrl/Cmd+Shift+Z`) — 50-step history, strict step-by-step

### Settings (persist across sessions)
- **Snap to grid** — on by default, aligns nodes to 20px grid during drag
- **Read-only mode** — disables editing, hides toolbar
- **Export as PNG** (`Ctrl/Cmd+E`) — saves to `data/assets/`

### Data
- **Auto-save** — debounced 300ms, via SiYuan Kernel API
- **Settings persistence** — grid, read-only state saved and restored on reload

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
| `Option/Alt+Drag` | Duplicate card |
| `Option/Alt+Shift+Drag` | Duplicate + axis lock |
| `Arrow Keys` | Nudge selected (±5px) |
| `Shift+Arrow` | Nudge selected (±20px) |

## License

MIT
