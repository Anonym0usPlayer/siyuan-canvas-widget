// ============================================
// Canvas 白板主逻辑 - Obsidian Canvas 风格
// ============================================

// ============================================
// 1. 全局状态管理
// ============================================
const state = {
    nodes: [],              // 节点数据数组
    edges: [],              // 边数据数组
    viewport: {             // 画布视口
        x: 0,
        y: 0,
        zoom: 1
    },
    selectedNodes: new Set(),   // 选中的节点ID集合
    selectedEdges: new Set(),   // 选中的边ID集合
    isPanning: false,          // 是否正在平移画布
    isDragging: false,         // 是否正在拖拽节点
    isResizing: false,         // 是否正在调整节点大小
    isDrawingEdge: false,      // 是否正在绘制连接线
    isDraggingEdgeEndpoint: false, // 是否正在拖拽边端点
    isSpacePressed: false,     // Space键是否按下
    isMarqueeSelecting: false, // 是否正在框选
    editingNode: null,         // 正在编辑的节点ID
    dragStartPos: null,        // 拖拽起始位置
    resizeStartPos: null,      // 调整大小起始位置
    panStartPos: null,         // 平移起始位置
    marqueeStartPos: null,     // 框选起始位置
    clipboard: null,           // 剪贴板数据
    history: [],               // 历史记录栈
    historyIndex: -1,          // 当前历史位置
    maxHistorySize: 50,        // 最大历史记录数
    isDirty: false,            // 是否有未保存的更改
    widgetID: null,            // 挂件ID
    // 可切换的功能开关
    isReadOnly: false,         // 只读模式（由设置面板切换）
    isPreviewMode: true,       // 预览模式（默认开启，工具栏隐藏，禁止编辑；点击 👁 切换为编辑模式）
    isSnapToGrid: true,        // 对齐网格（默认开启）
    isAlignObjects: false      // 对齐物体
};

// 配置常量
const CONFIG = {
    DEFAULT_NODE_WIDTH: 200,
    DEFAULT_NODE_HEIGHT: 50,
    MIN_ZOOM: 0.1,
    MAX_ZOOM: 3,
    ZOOM_STEP: 0.1,
    GRID_SIZE: 20             // 网格大小
};

// ============================================
// 1.5 Markdown 解析器（简化版）
// ============================================

// 简单的 Markdown 解析器
function parseMarkdown(text) {
    if (!text) return '';

    let html = text;

    // 转义 HTML 特殊字符
    html = html
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // 代码块（```）
    html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
        return `<pre style="background: var(--color-bg-secondary); padding: 8px; border-radius: 4px; overflow-x: auto; margin: 8px 0;"><code>${code.trim()}</code></pre>`;
    });

    // 行内代码（`）
    html = html.replace(/`([^`]+)`/g, '<code style="background: var(--color-bg-secondary); padding: 2px 6px; border-radius: 3px; font-family: monospace;">$1</code>');

    // 标题（# ## ### ####）
    html = html.replace(/^#### (.*$)/gim, '<h4 style="margin: 8px 0 4px 0; font-size: 14px;">$1</h4>');
    html = html.replace(/^### (.*$)/gim, '<h3 style="margin: 10px 0 5px 0; font-size: 15px;">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 style="margin: 12px 0 6px 0; font-size: 16px;">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 style="margin: 14px 0 8px 0; font-size: 18px;">$1</h1>');

    // 粗体和斜体
    html = html.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    html = html.replace(/___([^_]+)___/g, '<strong><em>$1</em></strong>');
    html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    html = html.replace(/_([^_]+)_/g, '<em>$1</em>');

    // 删除线
    html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>');

    // 链接 [text](url)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color: var(--color-accent); text-decoration: underline;">$1</a>');

    // 图片 ![alt](url)
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; height: auto; border-radius: 4px; margin: 8px 0;">');

    // 无序列表（- * +）
    html = html.replace(/^[\*\-\+] (.*$)/gim, '<li style="margin-left: 20px; margin-bottom: 4px;">$1</li>');
    html = html.replace(/(<li.*<\/li>\n?)+/g, '<ul style="margin: 8px 0; padding-left: 0;">$&</ul>');

    // 有序列表（1. 2. 3.）
    html = html.replace(/^\d+\. (.*$)/gim, '<li style="margin-left: 20px; margin-bottom: 4px;">$1</li>');

    // 引用（>）
    html = html.replace(/^&gt; (.*$)/gim, '<blockquote style="border-left: 3px solid var(--color-accent); padding-left: 12px; margin: 8px 0; color: var(--color-text-secondary); font-style: italic;">$1</blockquote>');

    // 分隔线（---）
    html = html.replace(/^---$/gim, '<hr style="border: none; border-top: 1px solid var(--color-border-light); margin: 12px 0;">');

    // 换行
    html = html.replace(/\n/g, '<br>');

    // 清理多余的 <br>
    html = html.replace(/<br>\s*(<\/?(?:h[1-4]|ul|ol|li|blockquote|pre|hr)[^>]*>)/g, '$1');
    html = html.replace(/(<\/?(?:h[1-4]|ul|ol|li|blockquote|pre|hr)[^>]*>)\s*<br>/g, '$1');

    return html;
}

// 颜色预设
const COLORS = {
    red: '#ff6b6b',
    orange: '#ffa94d',
    yellow: '#ffd43b',
    green: '#69db7c',
    blue: '#4dabf7',
    purple: '#9775fa',
    gray: '#868e96',
    white: '#ffffff'
};

// SiYuan 命名颜色 → JSON Canvas 兼容 hex 颜色（用于保存到 Obsidian 兼容的 .canvas 文件）
const COLOR_TO_HEX = { ...COLORS };
// JSON Canvas 预设编号 → SiYuan 命名颜色（用于加载 Obsidian .canvas 文件）
const OBSIDIAN_PRESET_MAP = { '1': 'red', '2': 'orange', '3': 'yellow', '4': 'green', '5': 'blue', '6': 'purple' };
// Hex → SiYuan 命名颜色（反向查找，忽略大小写）
const HEX_TO_SIYUAN = {};
for (const [key, hex] of Object.entries(COLORS)) {
    HEX_TO_SIYUAN[hex.toLowerCase()] = key;
}

/**
 * 将 SiYuan 内部节点数据清洗为 Obsidian JSON Canvas 兼容格式
 * - 命名颜色 "white"/"red"… → hex "#ffffff"/"#ff6b6b"…
 * - 默认白色卡片的 color 字段被删除，让 Obsidian 使用默认样式
 * - shape "rounded" 删除（Obsidian 默认即圆角），"rect" → "rectangle"
 */
function cleanNodeForSave(node) {
    const cleaned = {};
    // JSON Canvas 标准字段
    cleaned.id = node.id;
    cleaned.type = node.type;
    cleaned.x = node.x;
    cleaned.y = node.y;
    cleaned.width = node.width;
    cleaned.height = node.height;

    // text 字段（仅 text 类型）
    if (node.type === 'text' && node.text !== undefined) {
        cleaned.text = node.text;
    }
    // file/subpath（仅 file 类型）
    if (node.type === 'file' && node.file) {
        cleaned.file = node.file;
        if (node.subpath) cleaned.subpath = node.subpath;
    }
    // url（仅 link 类型）
    if (node.type === 'link' && node.url) {
        cleaned.url = node.url;
    }
    // label/background/backgroundStyle（仅 group 类型）
    if (node.type === 'group') {
        if (node.label) cleaned.label = node.label;
        if (node.background) {
            cleaned.background = typeof node.background === 'string' && COLOR_TO_HEX[node.background]
                ? COLOR_TO_HEX[node.background] : node.background;
        }
        if (node.backgroundStyle) cleaned.backgroundStyle = node.backgroundStyle;
    }

    // color：命名颜色 → hex；白色不保存（让 Obsidian 用默认样式）
    if (node.color && node.color !== 'white') {
        cleaned.color = COLOR_TO_HEX[node.color] || node.color;
    }

    // shape：rect → rectangle，rounded 不保存（Obsidian 默认即圆角）
    if (node.shape === 'rect') {
        cleaned.shape = 'rectangle';
    } else if (node.shape && node.shape !== 'rounded') {
        cleaned.shape = node.shape;
    }

    // 保留 SiYuan 内部字段（Obsidian 会忽略未知字段）
    if (node.align && node.align !== 'left') cleaned.align = node.align;
    if (node.border && node.border !== 'solid') cleaned.border = node.border;
    if (node.zIndex !== undefined) cleaned.zIndex = node.zIndex;
    if (node.blockId !== null && node.blockId !== undefined) cleaned.blockId = node.blockId;
    if (node.mediaUrl !== null && node.mediaUrl !== undefined) cleaned.mediaUrl = node.mediaUrl;
    if (node.mediaType !== null && node.mediaType !== undefined) cleaned.mediaType = node.mediaType;
    if (node.label !== null && node.label !== undefined && node.type !== 'group') cleaned.label = node.label;
    if (node.url !== null && node.url !== undefined && node.type !== 'link') cleaned.url = node.url;
    if (node.file !== null && node.file !== undefined && node.type !== 'file') cleaned.file = node.file;
    if (node.subpath !== null && node.subpath !== undefined && node.type !== 'file') cleaned.subpath = node.subpath;
    if (node.background !== null && node.background !== undefined && node.type !== 'group') cleaned.background = node.background;
    if (node.backgroundStyle !== null && node.backgroundStyle !== undefined && node.type !== 'group') cleaned.backgroundStyle = node.backgroundStyle;
    if (node.edges && node.edges.length > 0) cleaned.edges = node.edges;

    return cleaned;
}

/**
 * 将 Obsidian / 外部 .canvas 加载的节点数据规范化为 SiYuan 内部格式
 * - 预设编号 "1"~"6" → 命名颜色 "red"~"purple"
 * - hex 颜色 → 对应的命名颜色（已知色值），否则保留 hex 并设 white 基色
 * - "rectangle" shape → "rect"
 * - 缺少字段补默认值
 */
function normalizeNodeFromLoad(node) {
    // color 标准化
    if (typeof node.color === 'string') {
        if (OBSIDIAN_PRESET_MAP[node.color]) {
            node.color = OBSIDIAN_PRESET_MAP[node.color];
        } else {
            const lower = node.color.toLowerCase();
            if (HEX_TO_SIYUAN[lower]) {
                node.color = HEX_TO_SIYUAN[lower];
            }
            // 其他 hex 颜色保留原值（内部渲染用 background 属性携带 hex 即可）
        }
    }

    // shape 标准化
    if (node.shape === 'rectangle') {
        node.shape = 'rect';
    } else if (!node.shape || node.shape === 'rounded') {
        // Obsidian 默认是圆角卡片
        node.shape = 'rounded';
    }

    // 缺失字段补默认值
    if (!node.color) node.color = 'white';
    if (!node.align) node.align = 'left';
    if (!node.border) node.border = 'solid';
    if (node.url === undefined || node.url === '') node.url = null;
    if (node.file === undefined || node.file === '') node.file = null;
    if (node.subpath === undefined || node.subpath === '') node.subpath = null;
    if (node.label === undefined || node.label === '') node.label = null;
    if (node.background === undefined || node.background === '') node.background = null;
    if (node.backgroundStyle === undefined) node.backgroundStyle = 'cover';
    if (node.zIndex === undefined) node.zIndex = 0;
    if (node.blockId === undefined) node.blockId = null;
    if (node.mediaUrl === undefined) node.mediaUrl = null;
    if (node.mediaType === undefined) node.mediaType = null;
    if (!Array.isArray(node.edges)) node.edges = [];

    return node;
}

/**
 * 清洗边数据中不必要保存的颜色（默认颜色不保存，让 Obsidian 用默认样式）
 */
function cleanEdgeForSave(edge) {
    const cleaned = {
        id: edge.id,
        fromNode: edge.fromNode,
        toNode: edge.toNode,
    };
    if (edge.fromSide) cleaned.fromSide = edge.fromSide;
    if (edge.toSide) cleaned.toSide = edge.toSide;
    if (edge.fromEnd && edge.fromEnd !== 'none') cleaned.fromEnd = edge.fromEnd;
    if (edge.toEnd && edge.toEnd !== 'arrow') cleaned.toEnd = edge.toEnd;
    if (edge.label) cleaned.label = edge.label;
    // color：命名颜色 → hex
    if (edge.color && edge.color !== '#7c7c7c') {
        cleaned.color = COLOR_TO_HEX[edge.color] || edge.color;
    }
    return cleaned;
}

// ============================================
// 2. SiYuan API 封装
// ============================================

// 请求函数（仅用于加载笔记内容）
function request(url, data = null) {
    return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: data ? JSON.stringify(data) : null
    }).then(res => res.json());
}

// 生成唯一ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
}

// 获取挂件ID（思源挂件块 ID）
function getWidgetID() {
    try {
        // 挂件在 iframe 中，向上两级获取挂件块的 data-node-id
        const id = window.frameElement.parentElement.parentElement.getAttribute('data-node-id');
        if (id && id.trim()) {
            return id.trim();
        }
        console.error('[Canvas] 无法获取挂件ID：data-node-id 为空');
        return null;
    } catch (e) {
        console.error('[Canvas] 获取挂件ID异常:', e);
        return null;
    }
}

// 获取画布文件路径（widget 数据目录下的 data/ 子目录，结构清晰，不会被思源标记为「未引用资源」）
const WIDGET_DATA_DIR = '/data/widgets/siyuan-canvas-widget/data/';

function getCanvasFilePath() {
    return `${WIDGET_DATA_DIR}${state.widgetID}.canvas`;
}

// 旧存储路径（v1.2.x 之前），用于数据迁移
const LEGACY_CANVAS_DIR = '/data/assets/CanvasFiles/';
function getLegacyCanvasFilePath() {
    return `${LEGACY_CANVAS_DIR}${state.widgetID}.canvas`;
}

// 旧 widget 扁平路径（整合到 data/ 之前），用于迁移
const LEGACY_FLAT_WIDGET_DIR = '/data/widgets/siyuan-canvas-widget/';
function getLegacyFlatWidgetFilePath() {
    return `${LEGACY_FLAT_WIDGET_DIR}${state.widgetID}.canvas`;
}

// 确保 data/ 子目录存在（只执行一次）
let _dataDirEnsured = false;
function ensureDataDir() {
    if (_dataDirEnsured) return;
    _dataDirEnsured = true;
    try {
        const formData = new FormData();
        formData.append('path', '/data/widgets/siyuan-canvas-widget/data/');
        formData.append('isDir', 'true');
        fetch('/api/file/putFile', { method: 'POST', body: formData }).catch(() => {});
    } catch (_) { /* 目录可能已存在 */ }
}

// 保存画布数据（每次调用立即写入磁盘）
async function saveCanvas() {
    if (!state.widgetID) {
        console.error('[Canvas] widgetID 为空，无法保存');
        return;
    }
    try {
        // 清洗节点/边数据为 Obsidian JSON Canvas 兼容格式
        const cleanedNodes = state.nodes.map(cleanNodeForSave);
        const cleanedEdges = state.edges.map(cleanEdgeForSave);

        const data = {
            version: '1.0',
            nodes: cleanedNodes,
            edges: cleanedEdges,
            viewport: state.viewport,
            settings: {
                isSnapToGrid: state.isSnapToGrid,
                isAlignObjects: state.isAlignObjects,
                isReadOnly: state.isReadOnly,
                isPreviewMode: state.isPreviewMode
            }
        };
        const jsonStr = JSON.stringify(data);

        // 1. 主存储：块属性（数据随块生灭，块删则数据删，不残留文件）
        await saveCanvasToAttr(jsonStr);

        // 2. 文件备份：写入 widget data/ 子目录
        ensureDataDir();
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const formData = new FormData();
        formData.append('path', getCanvasFilePath());
        formData.append('file', blob, `${state.widgetID}.canvas`);
        const res = await fetch('/api/file/putFile', { method: 'POST', body: formData });
        const result = await res.json();
        if (result.code !== 0) {
            console.error('[Canvas] 文件备份失败:', result.code, result.msg);
        }

        // 迁移：清理旧路径残留文件
        if (!_legacyCleanedUp) {
            _legacyCleanedUp = true;
            const rm = (path) => fetch('/api/file/removeFile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path })
            }).catch(() => {});
            // 清理 /data/assets/CanvasFiles/（v1.2.0 之前）
            rm(getLegacyCanvasFilePath());
            // 清理 /data/widgets/siyuan-canvas-widget/（整合到 data/ 之前）
            rm(getLegacyFlatWidgetFilePath());
        }
    } catch (err) {
        console.error('[Canvas] 保存异常:', err);
    }
}

// 旧文件清理标记（只执行一次）
let _legacyCleanedUp = false;

// ============================================
// 2.5 块属性存储（主存储：数据随块生灭，块删则数据删）
// ============================================

/**
 * 将画布数据作为块属性保存（主存储）
 * 块属性随块删除而清除，不会产生残留文件
 */
async function saveCanvasToAttr(dataJson) {
    try {
        const res = await fetch('/api/attr/setBlockAttrs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: state.widgetID,
                attrs: { 'custom-canvas-data': dataJson }
            })
        });
        const result = await res.json();
        if (result.code !== 0) {
            console.error('[Canvas] 保存块属性失败:', result.code, result.msg);
            return false;
        }
        return true;
    } catch (err) {
        console.error('[Canvas] 保存块属性异常:', err);
        return false;
    }
}

/**
 * 从块属性加载画布数据（主存储）
 * 返回解析后的 data 对象，失败返回 null
 */
async function loadCanvasFromAttr() {
    try {
        const res = await fetch('/api/attr/getBlockAttrs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: state.widgetID })
        });
        const result = await res.json();
        if (result.code !== 0) return null;
        const raw = result.data && result.data['custom-canvas-data'];
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (err) {
        console.error('[Canvas] 读取块属性异常:', err);
        return null;
    }
}

// 自动保存防抖计时器
let _autoSaveTimer = null;

// 自动保存（防抖 300ms）
function autoSave() {
    state.isDirty = true;
    clearTimeout(_autoSaveTimer);
    _autoSaveTimer = setTimeout(() => saveCanvas(), 300);
}

// 立即保存（用于需要即时持久化的操作）
function markDirty() {
    state.isDirty = true;
    clearTimeout(_autoSaveTimer);
    saveCanvas();
}

// 强制立即保存（用于页面关闭等场景）
async function forceSave() {
    try {
        await saveCanvas();
    } catch (err) {
        console.error('强制保存失败:', err);
    }
}

// 从指定路径读取并解析 canvas 数据；失败返回 null
async function _readCanvasFile(path) {
    try {
        const res = await fetch('/api/file/getFile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path })
        });
        // getFile API: 200 = 文件原始内容, 202 = 错误 JSON（文件不存在等）
        if (!res.ok) return null;
        const rawText = await res.text();
        // 某些情况下 200 也可能返回错误 JSON
        try {
            const errorObj = JSON.parse(rawText);
            if (errorObj.code && errorObj.code !== 0) return null;
        } catch (_) { /* 不是 JSON，正常内容 */ }
        return JSON.parse(rawText);
    } catch (_) {
        return null;
    }
}

// 加载画布数据（块属性优先 → 文件备选 → 旧路径迁移）
async function loadCanvas() {
    if (!state.widgetID) return false;
    try {
        let data = null;
        let needSave = false;

        // 1. 优先从块属性加载（主存储，无文件残留）
        data = await loadCanvasFromAttr();
        if (data) {
            console.log('[Canvas] 从块属性加载');
        }

        // 2. 块属性无数据 → 尝试 widget data/ 子目录
        if (!data) {
            data = await _readCanvasFile(getCanvasFilePath());
            if (data) {
                console.log('[Canvas] 从 widget data/ 加载，回存块属性');
                needSave = true;
            }
        }

        // 3. 尝试旧路径迁移（widget 扁平目录 → /data/assets/）
        if (!data) {
            data = await _readCanvasFile(getLegacyFlatWidgetFilePath());
            if (data) {
                console.log('[Canvas] 从 widget 扁平目录迁移');
                needSave = true;
            } else {
                data = await _readCanvasFile(getLegacyCanvasFilePath());
                if (data) {
                    console.log('[Canvas] 从旧 /data/assets/ 路径迁移');
                    needSave = true;
                }
            }
        }

        if (data && data.nodes) {
            // 规范化节点数据（兼容 Obsidian JSON Canvas 格式）
            state.nodes = (data.nodes || []).map(normalizeNodeFromLoad);
            state.edges = data.edges || [];
            state.viewport = data.viewport || { x: 0, y: 0, zoom: 1 };
            // 恢复设置
            if (data.settings) {
                state.isSnapToGrid = data.settings.isSnapToGrid ?? true;
                state.isAlignObjects = data.settings.isAlignObjects ?? false;
                state.isReadOnly = data.settings.isReadOnly ?? false;
                state.isPreviewMode = data.settings.isPreviewMode ?? true;
            }

            // 数据来自文件时，回存到块属性（完成迁移）
            if (needSave) {
                await saveCanvas();
            }

            return true;
        }
    } catch (err) {
        console.log('[Canvas] 加载数据失败，使用空画布:', err.message);
    }
    return false;
}

// ============================================
// 3. Canvas 引擎（平移/缩放/坐标转换）
// ============================================

// 更新画布变换（使用 CSS 变量）
function updateCanvasTransform() {
    const container = document.getElementById('canvas-container');
    const { x, y, zoom } = state.viewport;

    // 设置 CSS 变量
    container.style.setProperty('--canvas-scale', zoom);
    container.style.setProperty('--canvas-pan-x', `${x}px`);
    container.style.setProperty('--canvas-pan-y', `${y}px`);
}

// 屏幕坐标转画布坐标
function screenToCanvas(screenX, screenY) {
    const container = document.getElementById('canvas-container');
    const rect = container.getBoundingClientRect();
    const { x, y, zoom } = state.viewport;

    return {
        x: (screenX - rect.left - x) / zoom,
        y: (screenY - rect.top - y) / zoom
    };
}

// 画布坐标转屏幕坐标
function canvasToScreen(canvasX, canvasY) {
    const container = document.getElementById('canvas-container');
    const rect = container.getBoundingClientRect();
    const { x, y, zoom } = state.viewport;

    return {
        x: canvasX * zoom + x + rect.left,
        y: canvasY * zoom + y + rect.top
    };
}

// 平移画布
function pan(dx, dy) {
    state.viewport.x += dx;
    state.viewport.y += dy;
    updateCanvasTransform();
    autoSave();
}

// 缩放画布（以某点为中心）
function zoom(delta, centerX, centerY) {
    const oldZoom = state.viewport.zoom;
    const newZoom = Math.max(CONFIG.MIN_ZOOM, Math.min(CONFIG.MAX_ZOOM, oldZoom + delta));

    if (newZoom === oldZoom) return;

    // 计算缩放前后的坐标差异，保持中心点位置不变
    const container = document.getElementById('canvas-container');
    const rect = container.getBoundingClientRect();
    const mouseX = centerX - rect.left;
    const mouseY = centerY - rect.top;

    const canvasX = (mouseX - state.viewport.x) / oldZoom;
    const canvasY = (mouseY - state.viewport.y) / oldZoom;

    state.viewport.zoom = newZoom;
    state.viewport.x = mouseX - canvasX * newZoom;
    state.viewport.y = mouseY - canvasY * newZoom;

    updateCanvasTransform();
    updateZoomLabel();
    autoSave();
}

// 重置缩放（以画布中心为基准，仅重置 zoom，不改变位置）
function resetView() {
    if (state.viewport.zoom === 1) return;
    const container = document.getElementById('canvas-container');
    const rect = container.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    // 以视口中心为基点缩放到 zoom=1
    const oldZoom = state.viewport.zoom;
    const canvasX = (cx - rect.left - state.viewport.x) / oldZoom;
    const canvasY = (cy - rect.top - state.viewport.y) / oldZoom;
    state.viewport.zoom = 1;
    state.viewport.x = cx - rect.left - canvasX * 1;
    state.viewport.y = cy - rect.top - canvasY * 1;
    updateCanvasTransform();
    updateZoomLabel();
    autoSave();
}

// 更新缩放百分比标签
function updateZoomLabel() {
    const label = document.getElementById('zoom-level');
    if (label) {
        label.textContent = Math.round(state.viewport.zoom * 100) + '%';
    }
}

// 聚焦到节点
function focusNode(nodeId) {
    const node = state.nodes.find(n => n.id === nodeId);
    if (!node) return;

    const container = document.getElementById('canvas-container');
    const rect = container.getBoundingClientRect();

    // 计算使节点居中的视口位置
    const nodeCenterX = node.x + node.width / 2;
    const nodeCenterY = node.y + node.height / 2;

    state.viewport.x = rect.width / 2 - nodeCenterX * state.viewport.zoom;
    state.viewport.y = rect.height / 2 - nodeCenterY * state.viewport.zoom;

    updateCanvasTransform();
    autoSave();

    // 选中节点
    selectNode(nodeId);
}

// ============================================
// 4. Node 管理器
// ============================================

// 创建节点
function createNode(type = 'text', options = {}) {
    const container = document.getElementById('canvas-container');
    const rect = container.getBoundingClientRect();

    // 计算默认位置（画布中心）
    const centerCanvas = screenToCanvas(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2
    );

    const node = {
        id: 'node_' + generateId(),
        type: type,
        x: options.x ?? centerCanvas.x - CONFIG.DEFAULT_NODE_WIDTH / 2,
        y: options.y ?? centerCanvas.y - CONFIG.DEFAULT_NODE_HEIGHT / 2,
        width: options.width ?? CONFIG.DEFAULT_NODE_WIDTH,
        height: options.height ?? CONFIG.DEFAULT_NODE_HEIGHT,
        text: options.text ?? '',
        color: options.color ?? 'white',
        shape: options.shape ?? 'rounded',
        align: options.align ?? 'left',
        border: options.border ?? 'solid',
        // JSON Canvas 规范字段
        url: options.url ?? null,              // 仅 link 类型
        file: options.file ?? null,            // 仅 file 类型
        subpath: options.subpath ?? null,      // 仅 file 类型
        label: options.label ?? null,          // 仅 group 类型
        background: options.background ?? null, // 仅 group 类型
        backgroundStyle: options.backgroundStyle ?? 'cover', // 仅 group 类型
        zIndex: options.zIndex ?? state.nodes.length, // 节点层级
        // 思源笔记特有字段
        blockId: options.blockId ?? null,      // 仅 note 类型
        mediaUrl: options.mediaUrl ?? null,    // 仅 media 类型
        mediaType: options.mediaType ?? null,  // 仅 media 类型
        edges: []  // 出边列表
    };

    state.nodes.push(node);
    renderNode(node);
    saveHistory(); // 事后快照：记录创建后的状态
    autoSave();

    // 文本卡片创建后自动进入编辑模式
    if (node.type === 'text' && options.autoEdit !== false) {
        setTimeout(() => startEditingNode(node.id), 50);
    }

    return node;
}

// 渲染节点
function renderNode(nodeData) {
    const nodesLayer = document.getElementById('nodes-layer');

    // 创建卡片元素
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.nodeId = nodeData.id;
    card.dataset.color = nodeData.color;
    card.dataset.shape = nodeData.shape;
    card.dataset.align = nodeData.align;
    card.dataset.border = nodeData.border;

    // 根据类型添加特定的类
    if (nodeData.type === 'note') card.classList.add('note-card');
    else if (nodeData.type === 'media') card.classList.add('media-card');
    else if (nodeData.type === 'group') card.classList.add('group-card');
    else if (nodeData.type === 'link') card.classList.add('link-card');

    card.style.left = nodeData.x + 'px';
    card.style.top = nodeData.y + 'px';
    card.style.width = nodeData.width + 'px';
    card.style.height = nodeData.height + 'px';

    // 根据类型创建不同的内容
    if (nodeData.type === 'note') {
        // 笔记卡片 - 带标题栏和 iframe
        const header = document.createElement('div');
        header.className = 'card-header';
        // 显示搜索到的块名称或默认名称
        header.textContent = nodeData.text || '笔记块';
        card.appendChild(header);

        const content = document.createElement('div');
        content.className = 'card-content';
        content.innerHTML = '<div style="padding: 12px; color: var(--color-text-secondary);">加载中...</div>';
        card.appendChild(content);

        // 加载嵌入内容
        if (nodeData.blockId) {
            loadNoteContent(nodeData.id, nodeData.blockId);
        }
    } else if (nodeData.type === 'media') {
        // 媒体卡片 - 显示图片
        const content = document.createElement('div');
        content.className = 'card-content';

        if (nodeData.mediaUrl) {
            const img = document.createElement('img');
            img.src = nodeData.mediaUrl;
            img.alt = '媒体内容';
            img.onerror = () => {
                content.innerHTML = `
                    <div class="media-placeholder">
                        <div class="icon">🖼️</div>
                        <div>图片加载失败</div>
                    </div>
                `;
            };
            content.appendChild(img);
        } else {
            content.innerHTML = `
                <div class="media-placeholder">
                    <div class="icon">🖼️</div>
                    <div>无媒体内容</div>
                </div>
            `;
        }

        card.appendChild(content);
    } else if (nodeData.type === 'group') {
        // 组卡片 - 可重命名标题栏
        const header = document.createElement('div');
        header.className = 'card-header';
        header.textContent = nodeData.text || '组';
        header.dataset.groupHeader = nodeData.id;
        // 双击标题重命名
        header.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            e.preventDefault();
            renameGroup(nodeData.id, header);
        });
        card.appendChild(header);

        // 内容区（空，不显示占位文字）
        const content = document.createElement('div');
        content.className = 'card-content';
        card.appendChild(content);

        // 组卡片始终在最下层
        card.style.zIndex = '0';
    } else if (nodeData.type === 'link') {
        // 链接卡片 - 显示链接信息
        const header = document.createElement('div');
        header.className = 'card-header';
        header.innerHTML = '🔗 <span>链接</span>';
        card.appendChild(header);

        const content = document.createElement('div');
        content.className = 'card-content';

        // 显示链接文本
        const linkText = document.createElement('div');
        linkText.style.cssText = 'font-weight: 500; margin-bottom: 8px; color: var(--color-text-primary);';
        linkText.textContent = nodeData.text || nodeData.url;
        content.appendChild(linkText);

        // 显示链接URL（可点击）
        const linkUrl = document.createElement('a');
        linkUrl.href = nodeData.url;
        linkUrl.target = '_blank';
        linkUrl.rel = 'noopener noreferrer';
        linkUrl.style.cssText = 'color: var(--color-accent); text-decoration: none; word-break: break-all; font-size: 12px;';
        linkUrl.textContent = nodeData.url;
        linkUrl.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        content.appendChild(linkUrl);

        card.appendChild(content);
    } else {
        // 普通文本卡片 - 支持 Markdown
        const content = document.createElement('div');
        content.className = 'card-content';
        content.innerHTML = parseMarkdown(nodeData.text);
        card.appendChild(content);
    }

    // 创建锚点
    const anchors = ['top', 'right', 'bottom', 'left'];
    anchors.forEach(side => {
        const anchor = document.createElement('div');
        anchor.className = `card-anchor ${side}`;
        anchor.dataset.side = side;
        card.appendChild(anchor);
    });

    // 创建调整大小的手柄（四个角）
    const resizeCorners = ['nw', 'ne', 'sw', 'se'];
    resizeCorners.forEach(corner => {
        const handle = document.createElement('div');
        handle.className = `card-resize-handle card-resize-${corner}`;
        handle.dataset.corner = corner;
        card.appendChild(handle);
    });

    // 创建调整大小的手柄（四条边）
    const resizeEdges = ['top', 'right', 'bottom', 'left'];
    resizeEdges.forEach(edge => {
        const handle = document.createElement('div');
        handle.className = `card-resize-handle card-resize-edge card-resize-edge-${edge}`;
        handle.dataset.corner = edge; // 复用 corner 字段存储边方向
        card.appendChild(handle);
    });

    // 绑定事件
    bindNodeEvents(card, nodeData.id);

    nodesLayer.appendChild(card);
}

// 更新节点
function updateNode(nodeId, updates) {
    const node = state.nodes.find(n => n.id === nodeId);
    if (!node) return;

    Object.assign(node, updates);

    // 更新DOM
    const card = document.querySelector(`[data-node-id="${nodeId}"]`);
    if (!card) return;

    if (updates.x !== undefined) card.style.left = updates.x + 'px';
    if (updates.y !== undefined) card.style.top = updates.y + 'px';
    if (updates.width !== undefined) card.style.width = updates.width + 'px';
    if (updates.height !== undefined) card.style.height = updates.height + 'px';
    if (updates.color) card.dataset.color = updates.color;
    if (updates.shape) card.dataset.shape = updates.shape;
    if (updates.align) card.dataset.align = updates.align;
    if (updates.border) card.dataset.border = updates.border;
    if (updates.text !== undefined) {
        const content = card.querySelector('.card-content');
        if (content) {
            if (node.type === 'text') {
                content.innerHTML = parseMarkdown(updates.text);
            } else {
                content.textContent = updates.text;
            }
        }
        // 更新卡片的内部标题栏（note / group / link 类型）
        const header = card.querySelector('.card-header');
        if (header && node.type !== 'text') {
            header.textContent = updates.text || header.textContent;
        }
    }

    // 更新相关的边
    updateEdgesForNode(nodeId);

    // 拖拽/缩放过程中不触发自动保存（由 stopDraggingNode/stopResizingNode 在释放时保存）
    if (!state.isDragging && !state.isResizing) {
        autoSave();
    }
}

// 删除节点（内部方法，不保存历史和触发自动保存）
function deleteNode(nodeId, batchMode = false) {
    // 删除相关的边
    const edgesToDelete = state.edges.filter(e => e.fromNode === nodeId || e.toNode === nodeId);
    edgesToDelete.forEach(edge => deleteEdge(edge.id, true));

    // 从状态中移除
    state.nodes = state.nodes.filter(n => n.id !== nodeId);
    state.selectedNodes.delete(nodeId);

    // 从DOM中移除
    const card = document.querySelector(`[data-node-id="${nodeId}"]`);
    if (card) card.remove();

    if (!batchMode) { saveHistory(); autoSave(); }
}

// 选中节点
function selectNode(nodeId, addToSelection = false) {
    if (!addToSelection) {
        clearSelection();
    }

    state.selectedNodes.add(nodeId);
    const card = document.querySelector(`[data-node-id="${nodeId}"]`);
    if (card) card.classList.add('selected');
}

// 取消选中节点
function deselectNode(nodeId) {
    state.selectedNodes.delete(nodeId);
    const card = document.querySelector(`[data-node-id="${nodeId}"]`);
    if (card) card.classList.remove('selected');
}

// 清空选择
function clearSelection() {
    state.selectedNodes.forEach(id => {
        const card = document.querySelector(`[data-node-id="${id}"]`);
        if (card) card.classList.remove('selected');
    });
    state.selectedNodes.clear();

    state.selectedEdges.forEach(id => {
        const el = document.querySelector(`.edge-path[data-edge-id="${id}"]`);
        if (el) el.classList.remove('selected');
    });
    state.selectedEdges.clear();

    // 防御性清理：确保残留的临时高亮也被移除
    document.querySelectorAll('.card.marquee-hover').forEach(el => {
        el.classList.remove('marquee-hover');
    });
}

// 绑定节点事件
function bindNodeEvents(card, nodeId) {
    // 鼠标移动时只显示光标所在侧边框的连接点
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        // 计算光标到四条边的距离
        const distTop = e.clientY - rect.top;
        const distBottom = rect.bottom - e.clientY;
        const distLeft = e.clientX - rect.left;
        const distRight = rect.right - e.clientX;

        // 找最近的边
        const sides = [
            { side: 'top', dist: distTop },
            { side: 'bottom', dist: distBottom },
            { side: 'left', dist: distLeft },
            { side: 'right', dist: distRight }
        ];
        sides.sort((a, b) => a.dist - b.dist);
        const closest = sides[0].side;

        // 只显示最近一侧的锚点
        card.querySelectorAll('.card-anchor').forEach(a => {
            a.classList.toggle('visible', a.classList.contains(closest));
        });
    });

    // 鼠标离开卡片时隐藏所有锚点
    card.addEventListener('mouseleave', () => {
        card.querySelectorAll('.card-anchor').forEach(a => {
            a.classList.remove('visible');
        });
    });

    // 点击选中
    card.addEventListener('click', (e) => {
        if (e.target.classList.contains('card-anchor') || e.target.classList.contains('card-resize-handle')) return;
        e.stopPropagation();

        const isMultiSelect = e.shiftKey || e.ctrlKey || e.metaKey;

        // Ctrl/Cmd + 点击已选中的节点 - 取消选择
        if ((e.ctrlKey || e.metaKey) && state.selectedNodes.has(nodeId)) {
            deselectNode(nodeId);
        } else {
            selectNode(nodeId, isMultiSelect);
        }
    });

    // 双击编辑
    card.addEventListener('dblclick', (e) => {
        if (e.target.classList.contains('card-anchor') || e.target.classList.contains('card-resize-handle')) return;
        if (card.classList.contains('note-card')) {
            e.stopPropagation();
            const node = state.nodes.find(n => n.id === nodeId);
            if (node && node.blockId && window.top && window.top.openFileByURL) {
                window.top.openFileByURL('siyuan://blocks/' + node.blockId);
            }
            return;
        }

        startEditingNode(nodeId);
    });

    // 右键菜单 — 先选中再弹出
    card.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!state.selectedNodes.has(nodeId)) {
            clearSelection();
            selectNode(nodeId);
        }
        if (!isEditingAllowed()) {
            showReadOnlyContextMenu(e.clientX, e.clientY);
        } else {
            showContextMenu(e.clientX, e.clientY, nodeId);
        }
    });

    // 拖拽移动
    card.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('card-anchor') ||
            e.target.classList.contains('card-resize-handle') ||
            e.button !== 0) return;
        if (state.editingNode === nodeId) return;

        e.stopPropagation();
        startDraggingNode(nodeId, e);
    });

    // 锚点拖拽（创建连接线）
    const anchors = card.querySelectorAll('.card-anchor');
    anchors.forEach(anchor => {
        anchor.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            e.preventDefault();
            const side = anchor.dataset.side;
            startEdgeDrag(nodeId, side, e);
        });
    });

    // 调整大小手柄拖拽
    const resizeHandles = card.querySelectorAll('.card-resize-handle');
    resizeHandles.forEach(handle => {
        handle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            e.preventDefault();
            const corner = handle.dataset.corner;
            startResizingNode(nodeId, corner, e);
        });
    });
}

// 开始编辑节点（使用 textarea，换行和 Markdown 编辑更可靠）
function startEditingNode(nodeId) {
    if (!isEditingAllowed()) return;
    const card = document.querySelector(`[data-node-id="${nodeId}"]`);
    if (!card) return;

    const node = state.nodes.find(n => n.id === nodeId);
    if (!node || node.type !== 'text') {
        showMessage('此卡片类型不支持编辑');
        return;
    }

    const content = card.querySelector('.card-content');
    if (!content) return;

    state.editingNode = nodeId;
    card.classList.add('editing');

    // 用 <textarea> 替代 contenteditable（换行可靠、跨浏览器一致）
    const textarea = document.createElement('textarea');
    textarea.className = 'card-textarea';
    textarea.value = node.text || '';
    textarea.style.cssText = 'width:100%;height:100%;border:none;outline:none;resize:none;' +
        'padding:12px;font:13px/1.6 Consolas,Monaco,monospace;' +
        'background:var(--color-bg-secondary);color:var(--color-text-primary);' +
        'border-radius:inherit;tab-size:4;';
    content.innerHTML = '';
    content.appendChild(textarea);
    textarea.focus();

    // 保存编辑内容
    const saveEdit = () => {
        const n = state.nodes.find(nn => nn.id === nodeId);
        if (n) {
            n.text = textarea.value;
            // 重新渲染 Markdown
            content.innerHTML = parseMarkdown(n.text);
            autoSave();
        }
        state.editingNode = null;
        card.classList.remove('editing');
        textarea.removeEventListener('blur', saveEdit);
        textarea.removeEventListener('keydown', handleKeyDown);
    };

    textarea.addEventListener('blur', saveEdit);

    const handleKeyDown = (e) => {
        if (e.key === 'Escape' && !e.shiftKey) {
            e.preventDefault();
            textarea.blur();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            textarea.blur();
        }
        // Tab 键插入空格而非跳转焦点
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            textarea.value = textarea.value.substring(0, start) + '    ' + textarea.value.substring(end);
            textarea.selectionStart = textarea.selectionEnd = start + 4;
        }
    };

    textarea.addEventListener('keydown', handleKeyDown);
}

// ============================================
//  对齐辅助系统
// ============================================

const ALIGN_THRESHOLD = 5; // 对齐阈值（画布像素，在 100% 缩放约 5px）

// 计算拖拽矩形与画布上其他节点的对齐线
function computeAlignments(draggedRect, excludeNodeIds) {
    const aligns = [];
    const threshold = ALIGN_THRESHOLD / state.viewport.zoom;

    const d = {
        left: draggedRect.x,
        right: draggedRect.x + draggedRect.width,
        centerX: draggedRect.x + draggedRect.width / 2,
        top: draggedRect.y,
        bottom: draggedRect.y + draggedRect.height,
        centerY: draggedRect.y + draggedRect.height / 2
    };

    for (const node of state.nodes) {
        if (excludeNodeIds.has(node.id)) continue;

        const o = {
            left: node.x,
            right: node.x + node.width,
            centerX: node.x + node.width / 2,
            top: node.y,
            bottom: node.y + node.height,
            centerY: node.y + node.height / 2
        };

        // 垂直对齐检查 (x = constant): left, right, centerX
        const vChecks = [
            { type: 'left', dVal: d.left, oVal: o.left },
            { type: 'right', dVal: d.right, oVal: o.right },
            { type: 'centerX', dVal: d.centerX, oVal: o.centerX }
        ];
        for (const { type, dVal, oVal } of vChecks) {
            if (Math.abs(dVal - oVal) < threshold) {
                aligns.push({
                    type,
                    orientation: 'vertical',
                    value: oVal,
                    start: Math.min(d.top, o.top),
                    end: Math.max(d.bottom, o.bottom),
                    distance: Math.abs(dVal - oVal)
                });
            }
        }

        // 水平对齐检查 (y = constant): top, bottom, centerY
        const hChecks = [
            { type: 'top', dVal: d.top, oVal: o.top },
            { type: 'bottom', dVal: d.bottom, oVal: o.bottom },
            { type: 'centerY', dVal: d.centerY, oVal: o.centerY }
        ];
        for (const { type, dVal, oVal } of hChecks) {
            if (Math.abs(dVal - oVal) < threshold) {
                aligns.push({
                    type,
                    orientation: 'horizontal',
                    value: oVal,
                    start: Math.min(d.left, o.left),
                    end: Math.max(d.right, o.right),
                    distance: Math.abs(dVal - oVal)
                });
            }
        }
    }

    return aligns;
}

// 渲染对齐辅助线
function renderAlignGuides(aligns) {
    const layer = document.getElementById('align-guides-layer');
    if (!layer) return;
    layer.innerHTML = '';

    for (const a of aligns) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        if (a.orientation === 'vertical') {
            line.setAttribute('x1', String(a.value));
            line.setAttribute('y1', String(a.start));
            line.setAttribute('x2', String(a.value));
            line.setAttribute('y2', String(a.end));
        } else {
            line.setAttribute('x1', String(a.start));
            line.setAttribute('y1', String(a.value));
            line.setAttribute('x2', String(a.end));
            line.setAttribute('y2', String(a.value));
        }
        line.setAttribute('class', 'align-guide-line');
        layer.appendChild(line);
    }
}

// 清除对齐辅助线
function clearAlignGuides() {
    const layer = document.getElementById('align-guides-layer');
    if (layer) layer.innerHTML = '';
}

// 从对齐结果中应用吸附（每轴只取最近的对齐）
function applyAlignSnap(aligns, draggedRect) {
    let snapX = null, snapY = null;
    let minDistX = Infinity, minDistY = Infinity;

    for (const a of aligns) {
        if (a.orientation === 'vertical' && a.distance < minDistX) {
            minDistX = a.distance;
            switch (a.type) {
                case 'left':   snapX = a.value; break;
                case 'right':  snapX = a.value - draggedRect.width; break;
                case 'centerX': snapX = a.value - draggedRect.width / 2; break;
            }
        }
        if (a.orientation === 'horizontal' && a.distance < minDistY) {
            minDistY = a.distance;
            switch (a.type) {
                case 'top':    snapY = a.value; break;
                case 'bottom': snapY = a.value - draggedRect.height; break;
                case 'centerY': snapY = a.value - draggedRect.height / 2; break;
            }
        }
    }

    return { x: snapX, y: snapY };
}

// 开始拖拽节点
function startDraggingNode(nodeId, e) {
    if (!isEditingAllowed()) return;
    let dragNodeId = nodeId;

    // Option/Alt + 拖拽：复制一份卡片并拖拽副本
    if (e.altKey) {
        const node = state.nodes.find(n => n.id === nodeId);
        if (!node) return;

        // 深拷贝节点数据（排除 id 和 edges）
        const cloneData = {};
        for (const key of Object.keys(node)) {
            if (key !== 'id' && key !== 'edges') {
                cloneData[key] = node[key];
            }
        }
        const newNode = createNode(cloneData.type || 'text', {
            ...cloneData,
            autoEdit: false  // 复制时不自动进入编辑模式
        });

        // 取消原节点选中，选中新节点
        clearSelection();
        selectNode(newNode.id, false);
        dragNodeId = newNode.id;
        state._isAltDuplicate = true;
    }

    state.isDragging = true;
    state._dragActuallyMoved = false;  // 追踪是否真正移动
    const node = state.nodes.find(n => n.id === dragNodeId);
    if (!node) { state.isDragging = false; return; }

    // 添加拖拽视觉状态
    const card = document.querySelector(`[data-node-id="${dragNodeId}"]`);
    if (card) card.classList.add('is-dragging');

    const startPos = screenToCanvas(e.clientX, e.clientY);
    state.dragStartPos = {
        nodeId: dragNodeId,
        startX: node.x,
        startY: node.y,
        offsetX: startPos.x - node.x,
        offsetY: startPos.y - node.y
    };

    document.addEventListener('mousemove', onDraggingNode);
    document.addEventListener('mouseup', stopDraggingNode);
}

// 拖拽节点中
function onDraggingNode(e) {
    if (!state.isDragging || !state.dragStartPos) return;

    state._dragActuallyMoved = true;  // 标记：确实发生了拖拽移动

    const pos = screenToCanvas(e.clientX, e.clientY);
    let newX = pos.x - state.dragStartPos.offsetX;
    let newY = pos.y - state.dragStartPos.offsetY;

    // Option/Alt + Shift：锁定轴向平移（沿主轴方向移动）
    if (e.altKey && e.shiftKey) {
        const dx = newX - state.dragStartPos.startX;
        const dy = newY - state.dragStartPos.startY;
        if (Math.abs(dx) > Math.abs(dy)) {
            newY = state.dragStartPos.startY;  // 锁定水平移动
        } else {
            newX = state.dragStartPos.startX;  // 锁定垂直移动
        }
    }

    // 对齐网格：拖拽过程中约束到网格
    if (state.isSnapToGrid) {
        const gridSize = CONFIG.GRID_SIZE;
        newX = Math.round(newX / gridSize) * gridSize;
        newY = Math.round(newY / gridSize) * gridSize;
    }

    // 获取被拖拽节点的宽高
    const node = state.nodes.find(n => n.id === state.dragStartPos.nodeId);
    if (node) {
        const draggedRect = { x: newX, y: newY, width: node.width, height: node.height };
        const excludeIds = new Set([state.dragStartPos.nodeId]);
        const aligns = computeAlignments(draggedRect, excludeIds);

        // 吸附到对齐线（对齐优先于网格）
        const snap = applyAlignSnap(aligns, draggedRect);
        if (snap.x !== null) newX = snap.x;
        if (snap.y !== null) newY = snap.y;

        // 渲染对齐辅助线
        if (aligns.length > 0) {
            // 重新计算吸附后的对齐线（确保线条位置准确）
            const snappedRect = { x: newX, y: newY, width: node.width, height: node.height };
            const finalAligns = computeAlignments(snappedRect, excludeIds);
            renderAlignGuides(finalAligns);
        } else {
            clearAlignGuides();
        }
    }

    updateNode(state.dragStartPos.nodeId, { x: newX, y: newY });
}

// 停止拖拽节点
function stopDraggingNode() {
    // 移除拖拽视觉状态
    if (state.dragStartPos) {
        const card = document.querySelector(`[data-node-id="${state.dragStartPos.nodeId}"]`);
        if (card) card.classList.remove('is-dragging');
    }

    // 确实发生了移动：保存拖拽后的状态作为历史快照
    if (state._dragActuallyMoved) {
        saveHistory();
    }

    state.isDragging = false;
    state.dragStartPos = null;
    state._dragActuallyMoved = false;
    state._isAltDuplicate = false;
    document.removeEventListener('mousemove', onDraggingNode);
    document.removeEventListener('mouseup', stopDraggingNode);
    clearAlignGuides();
    autoSave(); // 拖拽结束后统一保存
}

// 从框选框左键拖拽移动所有选中节点
let _marqueeDragData = null;
function startMarqueeDrag(e) {
    if (!isEditingAllowed()) return;

    // Option/Alt + 拖拽框选：复制所有选中节点并拖拽副本
    if (e.altKey) {
        beginBatchHistory();

        // 克隆所有选中节点
        const idMap = new Map(); // oldId -> newId
        const newNodeIds = [];
        for (const oldId of state.selectedNodes) {
            const oldNode = state.nodes.find(n => n.id === oldId);
            if (!oldNode) continue;
            const cloneData = {};
            for (const key of Object.keys(oldNode)) {
                if (key !== 'id' && key !== 'edges') {
                    cloneData[key] = oldNode[key];
                }
            }
            const newNode = createNode(cloneData.type || 'text', {
                ...cloneData,
                autoEdit: false
            });
            idMap.set(oldId, newNode.id);
            newNodeIds.push(newNode.id);
        }

        // 克隆选中节点之间的内部连线
        const oldSelected = new Set(state.selectedNodes);
        for (const edge of state.edges) {
            if (oldSelected.has(edge.fromNode) && oldSelected.has(edge.toNode)) {
                const newFromId = idMap.get(edge.fromNode);
                const newToId = idMap.get(edge.toNode);
                if (newFromId && newToId) {
                    createEdge(newFromId, newToId, edge.fromSide, edge.toSide, {
                        fromEnd: edge.fromEnd,
                        toEnd: edge.toEnd,
                        label: edge.label,
                        color: edge.color
                    });
                }
            }
        }

        endBatchHistory();

        // 切换选中到新节点
        clearSelection();
        newNodeIds.forEach(id => selectNode(id, true));
        state._isAltDuplicate = true;
    }

    state.isDragging = true;
    state._dragActuallyMoved = false;

    const pos = screenToCanvas(e.clientX, e.clientY);
    _marqueeDragData = {
        startX: pos.x,
        startY: pos.y,
        // 记录每个选中节点的初始位置
        nodePositions: [...state.selectedNodes].map(id => {
            const n = state.nodes.find(nn => nn.id === id);
            return n ? { id, x: n.x, y: n.y } : null;
        }).filter(Boolean)
    };

    document.addEventListener('mousemove', onMarqueeDrag);
    document.addEventListener('mouseup', stopMarqueeDrag);
}
function onMarqueeDrag(e) {
    if (!state.isDragging || !_marqueeDragData) return;

    state._dragActuallyMoved = true;
    const pos = screenToCanvas(e.clientX, e.clientY);
    let dx = pos.x - _marqueeDragData.startX;
    let dy = pos.y - _marqueeDragData.startY;

    // Option/Alt + Shift：锁定轴向平移
    if (e.altKey && e.shiftKey) {
        if (Math.abs(dx) > Math.abs(dy)) {
            dy = 0;  // 锁定水平移动
        } else {
            dx = 0;  // 锁定垂直移动
        }
    }

    // 对齐网格
    if (state.isSnapToGrid) {
        const gridSize = CONFIG.GRID_SIZE;
        dx = Math.round(dx / gridSize) * gridSize;
        dy = Math.round(dy / gridSize) * gridSize;
    }

    // 计算选中节点组的包围盒（应用偏移后）
    const selectedIds = new Set(state.selectedNodes);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const np of _marqueeDragData.nodePositions) {
        const node = state.nodes.find(n => n.id === np.id);
        if (!node) continue;
        const nx = np.x + dx;
        const ny = np.y + dy;
        minX = Math.min(minX, nx);
        minY = Math.min(minY, ny);
        maxX = Math.max(maxX, nx + node.width);
        maxY = Math.max(maxY, ny + node.height);
    }

    if (minX < Infinity) {
        const draggedRect = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
        const aligns = computeAlignments(draggedRect, selectedIds);

        // 吸附
        const snap = applyAlignSnap(aligns, draggedRect);
        if (snap.x !== null) dx += snap.x - draggedRect.x;
        if (snap.y !== null) dy += snap.y - draggedRect.y;

        // 渲染对齐线
        if (aligns.length > 0) {
            const snappedRect = { x: minX + (snap.x !== null ? snap.x - draggedRect.x : 0),
                                 y: minY + (snap.y !== null ? snap.y - draggedRect.y : 0),
                                 width: draggedRect.width, height: draggedRect.height };
            const finalAligns = computeAlignments(snappedRect, selectedIds);
            renderAlignGuides(finalAligns);
        } else {
            clearAlignGuides();
        }
    }

    _marqueeDragData.nodePositions.forEach(np => {
        const node = state.nodes.find(n => n.id === np.id);
        if (!node) return;
        node.x = np.x + dx;
        node.y = np.y + dy;
        const card = document.querySelector(`[data-node-id="${np.id}"]`);
        if (card) { card.style.left = node.x + 'px'; card.style.top = node.y + 'px'; }
        updateEdgesForNode(np.id);
    });
    // 实时更新框选框位置
    updateMarqueeRect();
}
function updateMarqueeRect() {
    if (!state._marqueeRect) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    state.selectedNodes.forEach(id => {
        const node = state.nodes.find(n => n.id === id);
        if (node) {
            minX = Math.min(minX, node.x);
            minY = Math.min(minY, node.y);
            maxX = Math.max(maxX, node.x + node.width);
            maxY = Math.max(maxY, node.y + node.height);
        }
    });
    if (minX >= Infinity) return;
    const pad = 8;
    const marquee = document.getElementById('marquee-selection');
    if (marquee) {
        marquee.style.left = (minX - pad) + 'px';
        marquee.style.top = (minY - pad) + 'px';
        marquee.style.width = (maxX - minX + pad * 2) + 'px';
        marquee.style.height = (maxY - minY + pad * 2) + 'px';
    }
    state._marqueeRect = { left: minX - pad, top: minY - pad,
        width: maxX - minX + pad * 2, height: maxY - minY + pad * 2 };
}
function stopMarqueeDrag() {
    if (state._dragActuallyMoved) {
        saveHistory();
    }
    // 确保框选框位置最终一致
    updateMarqueeRect();

    state.isDragging = false;
    _marqueeDragData = null;
    state._dragActuallyMoved = false;
    state._isAltDuplicate = false;
    document.removeEventListener('mousemove', onMarqueeDrag);
    document.removeEventListener('mouseup', stopMarqueeDrag);
    clearAlignGuides();
    autoSave();
}

// ============================================
// 4.5 节点调整大小
// ============================================

// 开始调整节点大小
function startResizingNode(nodeId, corner, e) {
    if (!isEditingAllowed()) return;
    state.isResizing = true;
    const node = state.nodes.find(n => n.id === nodeId);
    if (!node) { state.isResizing = false; return; }

    const startPos = screenToCanvas(e.clientX, e.clientY);
    state.resizeStartPos = {
        nodeId: nodeId,
        corner: corner,
        startX: node.x,
        startY: node.y,
        startWidth: node.width,
        startHeight: node.height,
        mouseX: startPos.x,
        mouseY: startPos.y
    };

    const card = document.querySelector(`[data-node-id="${nodeId}"]`);
    if (card) card.classList.add('resizing');

    document.addEventListener('mousemove', onResizingNode);
    document.addEventListener('mouseup', stopResizingNode);
}

// 调整节点大小中
function onResizingNode(e) {
    if (!state.isResizing || !state.resizeStartPos) return;

    const pos = screenToCanvas(e.clientX, e.clientY);
    const deltaX = pos.x - state.resizeStartPos.mouseX;
    const deltaY = pos.y - state.resizeStartPos.mouseY;

    const { corner, startX, startY, startWidth, startHeight } = state.resizeStartPos;
    let newX = startX;
    let newY = startY;
    let newWidth = startWidth;
    let newHeight = startHeight;

    const MIN_SIZE = 50; // 最小尺寸

    // 根据拖拽的位置计算新的尺寸和位置
    switch (corner) {
        // 四个角的调整
        case 'se':
            newWidth = Math.max(MIN_SIZE, startWidth + deltaX);
            newHeight = Math.max(MIN_SIZE, startHeight + deltaY);
            break;
        case 'sw':
            newWidth = Math.max(MIN_SIZE, startWidth - deltaX);
            newHeight = Math.max(MIN_SIZE, startHeight + deltaY);
            if (newWidth > MIN_SIZE) newX = startX + deltaX;
            break;
        case 'ne':
            newWidth = Math.max(MIN_SIZE, startWidth + deltaX);
            newHeight = Math.max(MIN_SIZE, startHeight - deltaY);
            if (newHeight > MIN_SIZE) newY = startY + deltaY;
            break;
        case 'nw':
            newWidth = Math.max(MIN_SIZE, startWidth - deltaX);
            newHeight = Math.max(MIN_SIZE, startHeight - deltaY);
            if (newWidth > MIN_SIZE) newX = startX + deltaX;
            if (newHeight > MIN_SIZE) newY = startY + deltaY;
            break;
        // 四条边的调整（仅一个维度变化）
        case 'right':
            newWidth = Math.max(MIN_SIZE, startWidth + deltaX);
            break;
        case 'left':
            newWidth = Math.max(MIN_SIZE, startWidth - deltaX);
            if (newWidth > MIN_SIZE) newX = startX + deltaX;
            break;
        case 'bottom':
            newHeight = Math.max(MIN_SIZE, startHeight + deltaY);
            break;
        case 'top':
            newHeight = Math.max(MIN_SIZE, startHeight - deltaY);
            if (newHeight > MIN_SIZE) newY = startY + deltaY;
            break;
    }

    updateNode(state.resizeStartPos.nodeId, {
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight
    });
}

// 停止调整节点大小
function stopResizingNode() {
    if (state.resizeStartPos) {
        const card = document.querySelector(`[data-node-id="${state.resizeStartPos.nodeId}"]`);
        if (card) card.classList.remove('resizing');
    }

    saveHistory(); // 调整大小后保存状态（与 startResizingNode 配对，改为事后记录）

    state.isResizing = false;
    state.resizeStartPos = null;
    document.removeEventListener('mousemove', onResizingNode);
    document.removeEventListener('mouseup', stopResizingNode);
    autoSave(); // 缩放结束后统一保存
}

// ============================================
// 5. Edge 管理器
// ============================================

// 创建边
function createEdge(fromNode, toNode, fromSide, toSide, options = {}) {
    const edge = {
        id: 'edge_' + generateId(),
        fromNode: fromNode,
        toNode: toNode,
        fromSide: fromSide,
        toSide: toSide,
        // JSON Canvas 规范字段
        fromEnd: options.fromEnd ?? 'none',  // 'none' | 'arrow'
        toEnd: options.toEnd ?? 'arrow',     // 'none' | 'arrow'
        label: options.label ?? '',
        color: options.color ?? '#7c7c7c'
    };

    state.edges.push(edge);

    // 更新节点的 edges 列表
    const fromNodeData = state.nodes.find(n => n.id === fromNode);
    if (fromNodeData) {
        fromNodeData.edges.push({ edgeId: edge.id, targetId: toNode });
    }

    renderEdge(edge);
    saveHistory(); // 事后快照
    autoSave();

    return edge;
}

// 渲染边
function renderEdge(edgeData) {
    const edgesLayer = document.getElementById('edges-layer');

    // 创建边的分组容器
    const edgeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    edgeGroup.setAttribute('data-edge-id', edgeData.id);
    edgeGroup.setAttribute('class', 'edge-group');

    // 计算路径
    const pathD = calculateBezierPath(edgeData);

    // 不可见的宽路径
    const hitPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    hitPath.setAttribute('d', pathD);
    hitPath.setAttribute('class', 'edge-hit-path');
    hitPath.setAttribute('stroke', 'transparent');
    hitPath.setAttribute('stroke-width', '16');
    hitPath.setAttribute('fill', 'none');
    hitPath.setAttribute('data-edge-id', edgeData.id);

    // 可见曲线路径
    const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathElement.setAttribute('d', pathD);
    pathElement.setAttribute('class', 'edge-path');
    pathElement.setAttribute('data-edge-id', edgeData.id);
    pathElement.setAttribute('stroke', edgeData.color);
    pathElement.setAttribute('stroke-width', '2');
    pathElement.setAttribute('fill', 'none');

    // 箭头标记（marker 方式，随曲线切线自动定向）
    let defs = edgesLayer.querySelector('defs');
    if (!defs) {
        defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        edgesLayer.appendChild(defs);
    }

    if (edgeData.toEnd !== 'none') {
        const markerId = 'arrow-to-' + edgeData.id;
        let marker = edgesLayer.querySelector(`#${markerId}`);
        if (!marker) {
            marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
            marker.setAttribute('id', markerId);
            marker.setAttribute('viewBox', '0 0 10 10');
            marker.setAttribute('refX', '8');
            marker.setAttribute('refY', '5');
            marker.setAttribute('markerWidth', '8');
            marker.setAttribute('markerHeight', '6');
            marker.setAttribute('orient', 'auto');
            const arrowShape = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            arrowShape.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
            arrowShape.setAttribute('fill', 'context-stroke');
            marker.appendChild(arrowShape);
            defs.appendChild(marker);
        }
        pathElement.setAttribute('marker-end', `url(#${markerId})`);
    }

    if (edgeData.fromEnd === 'arrow') {
        const markerId = 'arrow-from-' + edgeData.id;
        let marker = edgesLayer.querySelector(`#${markerId}`);
        if (!marker) {
            marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
            marker.setAttribute('id', markerId);
            marker.setAttribute('viewBox', '0 0 10 10');
            marker.setAttribute('refX', '2');
            marker.setAttribute('refY', '5');
            marker.setAttribute('markerWidth', '6');
            marker.setAttribute('markerHeight', '6');
            marker.setAttribute('orient', 'auto');
            const arrowShape = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            arrowShape.setAttribute('d', 'M 10 0 L 0 5 L 10 10 z');
            arrowShape.setAttribute('fill', 'context-stroke');
            marker.appendChild(arrowShape);
            defs.appendChild(marker);
        }
        pathElement.setAttribute('marker-start', `url(#${markerId})`);
    }

    // 渲染边标签
    if (edgeData.label && edgeData.label.trim() !== '') {
        const fromNode = state.nodes.find(n => n.id === edgeData.fromNode);
        const toNode = state.nodes.find(n => n.id === edgeData.toNode);

        if (fromNode && toNode) {
            const startPos = getAnchorPosition(fromNode, edgeData.fromSide);
            const endPos = getAnchorPosition(toNode, edgeData.toSide);

            // 计算中点位置
            const midX = (startPos.x + endPos.x) / 2;
            const midY = (startPos.y + endPos.y) / 2;

            // 创建标签背景
            const labelBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            labelBg.setAttribute('x', midX - 30);
            labelBg.setAttribute('y', midY - 12);
            labelBg.setAttribute('width', '60');
            labelBg.setAttribute('height', '24');
            labelBg.setAttribute('rx', '4');
            labelBg.setAttribute('fill', 'var(--color-bg-primary)');
            labelBg.setAttribute('stroke', edgeData.color);
            labelBg.setAttribute('stroke-width', '1');
            edgeGroup.appendChild(labelBg);

            // 创建标签文本
            const labelText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            labelText.setAttribute('x', midX);
            labelText.setAttribute('y', midY + 4);
            labelText.setAttribute('text-anchor', 'middle');
            labelText.setAttribute('font-size', '12');
            labelText.setAttribute('fill', 'var(--color-text-primary)');
            labelText.textContent = edgeData.label;
            edgeGroup.appendChild(labelText);
        }
    }

    // 边的交互处理函数（hitPath 和 pathElement 共用）
    const handleEdgeMousedown = (e) => {
        if (e.button !== 0) return;

        selectEdge(edgeData.id, e.shiftKey || e.ctrlKey || e.metaKey);

        const clickPos = screenToCanvas(e.clientX, e.clientY);
        const fromNode = state.nodes.find(n => n.id === edgeData.fromNode);
        const toNode = state.nodes.find(n => n.id === edgeData.toNode);

        if (!fromNode || !toNode) return;

        const startPos = getAnchorPosition(fromNode, edgeData.fromSide);
        const endPos = getAnchorPosition(toNode, edgeData.toSide);

        const distToStart = Math.hypot(clickPos.x - startPos.x, clickPos.y - startPos.y);
        const distToEnd = Math.hypot(clickPos.x - endPos.x, clickPos.y - endPos.y);

        const totalLen = Math.hypot(endPos.x - startPos.x, endPos.y - startPos.y);
        const endpointThreshold = Math.max(50, totalLen * 0.3);

        if (distToStart < endpointThreshold || distToEnd < endpointThreshold) {
            e.stopPropagation();
            e.preventDefault();
            const endpoint = distToStart < distToEnd ? 'start' : 'end';
            startEdgeEndpointDrag(edgeData.id, endpoint, e);
        } else {
            e.stopPropagation();
        }
    };

    const handleEdgeClick = (e) => {
        e.stopPropagation();
        selectEdge(edgeData.id, e.shiftKey || e.ctrlKey || e.metaKey);
    };

    const handleEdgeContextMenu = (e) => {
        if (!isEditingAllowed()) return;
        e.preventDefault();
        e.stopPropagation();
        showEdgeContextMenu(e.clientX, e.clientY, edgeData.id);
    };

    // 绑定到两个路径元素（hitPath 覆盖宽、pathElement 覆盖精确区域）
    hitPath.addEventListener('mousedown', handleEdgeMousedown);
    hitPath.addEventListener('click', handleEdgeClick);
    hitPath.addEventListener('contextmenu', handleEdgeContextMenu);

    pathElement.addEventListener('mousedown', handleEdgeMousedown);
    pathElement.addEventListener('click', handleEdgeClick);
    pathElement.addEventListener('contextmenu', handleEdgeContextMenu);

    // 添加到分组
    edgeGroup.appendChild(hitPath);
    edgeGroup.appendChild(pathElement);
    edgesLayer.appendChild(edgeGroup);
}

// 计算贝塞尔曲线路径（仅曲线）
function calculateBezierPath(edgeData) {
    const fromNode = state.nodes.find(n => n.id === edgeData.fromNode);
    const toNode = state.nodes.find(n => n.id === edgeData.toNode);
    if (!fromNode || !toNode) return '';

    const start = getAnchorPosition(fromNode, edgeData.fromSide);
    const end = getAnchorPosition(toNode, edgeData.toSide);
    const { cp1x, cp1y, cp2x, cp2y } = calcControlPoints(start, end, edgeData.fromSide, edgeData.toSide);
    return `M ${start.x} ${start.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${end.x} ${end.y}`;
}

// 计算控制点
function calcControlPoints(start, end, fromSide, toSide) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const perpDist = Math.max(40, Math.min(distance * 0.5, 120));

    let cp1x = start.x, cp1y = start.y;
    switch (fromSide) {
        case 'right': cp1x += perpDist; break;
        case 'left':  cp1x -= perpDist; break;
        case 'bottom': cp1y += perpDist; break;
        case 'top':    cp1y -= perpDist; break;
    }

    let cp2x = end.x, cp2y = end.y;
    switch (toSide) {
        case 'right': cp2x += perpDist; break;
        case 'left':  cp2x -= perpDist; break;
        case 'bottom': cp2y += perpDist; break;
        case 'top':    cp2y -= perpDist; break;
    }

    return { cp1x, cp1y, cp2x, cp2y };
}

// 获取锚点位置
function getAnchorPosition(node, side) {
    const x = node.x;
    const y = node.y;
    const w = node.width;
    const h = node.height;

    switch (side) {
        case 'top': return { x: x + w / 2, y: y };
        case 'right': return { x: x + w, y: y + h / 2 };
        case 'bottom': return { x: x + w / 2, y: y + h };
        case 'left': return { x: x, y: y + h / 2 };
        default: return { x: x + w / 2, y: y + h / 2 };
    }
}

// 更新节点相关的边
function updateEdgesForNode(nodeId) {
    const relatedEdges = state.edges.filter(e => e.fromNode === nodeId || e.toNode === nodeId);
    relatedEdges.forEach(edge => {
        const edgeGroup = document.querySelector(`g[data-edge-id="${edge.id}"]`);
        if (edgeGroup) {
            const newPath = calculateBezierPath(edge);
            const paths = edgeGroup.querySelectorAll('path');
            paths.forEach(p => { p.setAttribute('d', newPath); });
        }
    });
}

// 删除边
function deleteEdge(edgeId, batchMode = false) {
    const edge = state.edges.find(e => e.id === edgeId);
    if (!edge) return;

    // 从节点的 edges 列表中移除
    const fromNode = state.nodes.find(n => n.id === edge.fromNode);
    if (fromNode) {
        fromNode.edges = fromNode.edges.filter(e => e.edgeId !== edgeId);
    }

    // 从状态中移除
    state.edges = state.edges.filter(e => e.id !== edgeId);
    state.selectedEdges.delete(edgeId);

    // 从DOM中移除整个边分组
    const edgeGroup = document.querySelector(`g[data-edge-id="${edgeId}"]`);
    if (edgeGroup) edgeGroup.remove();

    if (!batchMode) { saveHistory(); autoSave(); }
}

// 选中边
function selectEdge(edgeId, addToSelection = false) {
    if (!addToSelection) {
        clearSelection();
    }

    state.selectedEdges.add(edgeId);
    const edgeGroup = document.querySelector(`g[data-edge-id="${edgeId}"]`);
    if (edgeGroup) {
        const pathElement = edgeGroup.querySelector('.edge-path');
        if (pathElement) pathElement.classList.add('selected');

        // 显示端点手柄
        const handles = edgeGroup.querySelectorAll('.edge-endpoint-handle');
        handles.forEach(handle => {
            handle.style.opacity = '1';
        });
    }
}

// ============================================
// 5.5 边端点拖拽重连（实时更新真实连线，无虚线）
// ============================================

let edgeEndpointDragData = null;

// 开始拖拽边端点
function startEdgeEndpointDrag(edgeId, endpoint, e) {
    if (!isEditingAllowed()) return;
    const edge = state.edges.find(e => e.id === edgeId);
    if (!edge) return;

    state.isDraggingEdgeEndpoint = true;

    edgeEndpointDragData = {
        edgeId: edgeId,
        endpoint: endpoint,
        originalEdge: { ...edge }
    };

    // 给被拖拽的边添加视觉状态
    const edgeGroup = document.querySelector(`g[data-edge-id="${edgeId}"]`);
    if (edgeGroup) {
        edgeGroup.classList.add('edge-dragging');
        const pathEl = edgeGroup.querySelector('.edge-path');
        if (pathEl) pathEl.style.strokeWidth = '3';
    }

    document.addEventListener('mousemove', onEdgeEndpointDrag);
    document.addEventListener('mouseup', endEdgeEndpointDrag);
}

// 实时更新真实边路径
function updateEdgePathLive(edgeId, fromX, fromY, fromSide, toX, toY, toSide) {
    const edgeGroup = document.querySelector(`g[data-edge-id="${edgeId}"]`);
    if (!edgeGroup) return;

    const dx = toX - fromX;
    const dy = toY - fromY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const perpDist = Math.max(40, Math.min(distance * 0.5, 120));

    let cp1x = fromX, cp1y = fromY;
    switch (fromSide) {
        case 'right': cp1x += perpDist; break;
        case 'left':  cp1x -= perpDist; break;
        case 'bottom': cp1y += perpDist; break;
        case 'top':    cp1y -= perpDist; break;
    }

    let cp2x = toX, cp2y = toY;
    switch (toSide) {
        case 'right': cp2x += perpDist; break;
        case 'left':  cp2x -= perpDist; break;
        case 'bottom': cp2y += perpDist; break;
        case 'top':    cp2y -= perpDist; break;
    }

    const curve = `M ${fromX} ${fromY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${toX} ${toY}`;
    const paths = edgeGroup.querySelectorAll('path');
    paths.forEach(p => { p.setAttribute('d', curve); });
}

// 拖拽边端点中
function onEdgeEndpointDrag(e) {
    if (!state.isDraggingEdgeEndpoint || !edgeEndpointDragData) return;

    const pos = screenToCanvas(e.clientX, e.clientY);
    const edge = state.edges.find(e => e.id === edgeEndpointDragData.edgeId);
    if (!edge) return;

    // 计算固定端和拖拽端
    let fixedPos, dragPos, fixedSide, dragSide;
    const fromNode = state.nodes.find(n => n.id === edge.fromNode);
    const toNode = state.nodes.find(n => n.id === edge.toNode);

    if (edgeEndpointDragData.endpoint === 'start') {
        if (!toNode) return;
        fixedPos = getAnchorPosition(toNode, edge.toSide);
        fixedSide = edge.toSide;
        dragPos = pos;
        dragSide = edge.fromSide;
    } else {
        if (!fromNode) return;
        fixedPos = getAnchorPosition(fromNode, edge.fromSide);
        fixedSide = edge.fromSide;
        dragPos = pos;
        dragSide = edge.toSide;
    }

    // 检测悬停节点并吸附
    const hoverNode = findNodeAtPosition(pos.x, pos.y);
    if (hoverNode) {
        const anchors = ['top', 'right', 'bottom', 'left'];
        let closestAnchor = null;
        let closestDistance = Infinity;

        anchors.forEach(side => {
            const anchorPos = getAnchorPosition(hoverNode, side);
            const distance = Math.hypot(pos.x - anchorPos.x, pos.y - anchorPos.y);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestAnchor = side;
            }
        });

        if (closestDistance <= 30) {
            const snapPos = getAnchorPosition(hoverNode, closestAnchor);
            dragPos = snapPos;
            dragSide = closestAnchor;
        }

        // 高亮目标节点
        const card = document.querySelector(`[data-node-id="${hoverNode.id}"]`);
        if (card) card.style.boxShadow = '0 0 0 3px var(--color-accent)';
    }

    // 实时更新真实边的路径
    if (edgeEndpointDragData.endpoint === 'start') {
        updateEdgePathLive(edge.id, dragPos.x, dragPos.y, dragSide, fixedPos.x, fixedPos.y, fixedSide);
    } else {
        updateEdgePathLive(edge.id, fixedPos.x, fixedPos.y, fixedSide, dragPos.x, dragPos.y, dragSide);
    }

    // 清除非悬停节点的高亮
    document.querySelectorAll('.card').forEach(card => {
        if (!hoverNode || card.dataset.nodeId !== hoverNode.id) {
            card.style.boxShadow = '';
        }
    });
}

// 结束拖拽边端点
function endEdgeEndpointDrag(e) {
    if (!state.isDraggingEdgeEndpoint || !edgeEndpointDragData) {
        cleanup();
        return;
    }

    const pos = screenToCanvas(e.clientX, e.clientY);
    const edge = state.edges.find(e => e.id === edgeEndpointDragData.edgeId);

    if (edge) {
        const targetNode = findNodeAtPosition(pos.x, pos.y);

        if (targetNode) {
            const anchors = ['top', 'right', 'bottom', 'left'];
            let closestAnchor = null;
            let closestDistance = Infinity;

            anchors.forEach(side => {
                const anchorPos = getAnchorPosition(targetNode, side);
                const distance = Math.hypot(pos.x - anchorPos.x, pos.y - anchorPos.y);
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestAnchor = side;
                }
            });

            if (closestDistance <= 30) {
                const newSide = closestAnchor;
                saveHistory(); // 重连前保存状态

                if (edgeEndpointDragData.endpoint === 'start') {
                    if (targetNode.id !== edge.toNode) {
                        const oldFromNode = state.nodes.find(n => n.id === edge.fromNode);
                        if (oldFromNode) {
                            oldFromNode.edges = oldFromNode.edges.filter(e => e.edgeId !== edge.id);
                        }
                        edge.fromNode = targetNode.id;
                        edge.fromSide = newSide;
                        targetNode.edges.push({ edgeId: edge.id, targetId: edge.toNode });
                    }
                } else {
                    if (targetNode.id !== edge.fromNode) {
                        edge.toNode = targetNode.id;
                        edge.toSide = newSide;
                        const fromNode = state.nodes.find(n => n.id === edge.fromNode);
                        if (fromNode) {
                            const edgeRef = fromNode.edges.find(e => e.edgeId === edge.id);
                            if (edgeRef) edgeRef.targetId = targetNode.id;
                        }
                    }
                }

                // 重新渲染边
                const oldEdgeGroup = document.querySelector(`g[data-edge-id="${edge.id}"]`);
                if (oldEdgeGroup) oldEdgeGroup.remove();
                renderEdge(edge);
                autoSave();
            }
        } else {
            // 没有释放在节点上，恢复原始路径
            const orig = edgeEndpointDragData.originalEdge;
            const fromNode = state.nodes.find(n => n.id === orig.fromNode);
            const toNode = state.nodes.find(n => n.id === orig.toNode);
            if (fromNode && toNode) {
                const s = getAnchorPosition(fromNode, orig.fromSide);
                const e = getAnchorPosition(toNode, orig.toSide);
                updateEdgePathLive(orig.id, s.x, s.y, orig.fromSide, e.x, e.y, orig.toSide);
            }
        }
    }

    cleanup();

    function cleanup() {
        // 恢复边样式
        if (edgeEndpointDragData) {
            const edgeGroup = document.querySelector(`g[data-edge-id="${edgeEndpointDragData.edgeId}"]`);
            if (edgeGroup) {
                edgeGroup.classList.remove('edge-dragging');
                const pathEl = edgeGroup.querySelector('.edge-path');
                if (pathEl) pathEl.style.strokeWidth = '2';
            }
        }

        state.isDraggingEdgeEndpoint = false;
        edgeEndpointDragData = null;

        document.querySelectorAll('.card').forEach(card => {
            card.style.boxShadow = '';
        });

        document.removeEventListener('mousemove', onEdgeEndpointDrag);
        document.removeEventListener('mouseup', endEdgeEndpointDrag);
    }
}

// 开始拖拽创建边
let tempEdgeData = null;

function startEdgeDrag(fromNodeId, fromSide, e) {
    if (!isEditingAllowed()) return;

    const fromNode = state.nodes.find(n => n.id === fromNodeId);
    if (!fromNode) return;

    state.isDrawingEdge = true;

    const startPos = getAnchorPosition(fromNode, fromSide);

    tempEdgeData = {
        fromNode: fromNodeId,
        fromSide: fromSide,
        startX: startPos.x,
        startY: startPos.y,
        currentX: startPos.x,
        currentY: startPos.y
    };

    // 创建临时边（marker 箭头）
    const tempLayer = document.getElementById('temp-edge-layer');
    tempLayer.innerHTML = '';

    const tempDefs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const tempMarker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    tempMarker.setAttribute('id', 'temp-arrow-marker');
    tempMarker.setAttribute('viewBox', '0 0 10 10');
    tempMarker.setAttribute('refX', '8');
    tempMarker.setAttribute('refY', '5');
    tempMarker.setAttribute('markerWidth', '8');
    tempMarker.setAttribute('markerHeight', '8');
    tempMarker.setAttribute('orient', 'auto');
    const arrowShape = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    arrowShape.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
    arrowShape.setAttribute('fill', 'context-stroke');
    tempMarker.appendChild(arrowShape);
    tempDefs.appendChild(tempMarker);
    tempLayer.appendChild(tempDefs);

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('class', 'temp-edge');
    path.setAttribute('id', 'temp-edge-path');
    path.setAttribute('marker-end', 'url(#temp-arrow-marker)');
    tempLayer.appendChild(path);

    document.addEventListener('mousemove', onEdgeDrag);
    document.addEventListener('mouseup', endEdgeDrag);
}

// 拖拽边中
function onEdgeDrag(e) {
    if (!state.isDrawingEdge || !tempEdgeData) return;

    let pos = screenToCanvas(e.clientX, e.clientY);

    // 吸附到附近节点的锚点
    const SNAP_DISTANCE = 25;
    let snappedNode = null;
    let snappedSide = null;
    let minDist = SNAP_DISTANCE;

    for (const node of state.nodes) {
        if (node.id === tempEdgeData.fromNode) continue;
        const sides = ['top', 'right', 'bottom', 'left'];
        for (const side of sides) {
            const anchorPos = getAnchorPosition(node, side);
            const dist = Math.hypot(pos.x - anchorPos.x, pos.y - anchorPos.y);
            if (dist < minDist) {
                minDist = dist;
                snappedNode = node;
                snappedSide = side;
            }
        }
    }

    if (snappedNode) {
        const anchorPos = getAnchorPosition(snappedNode, snappedSide);
        pos = anchorPos;
    }

    tempEdgeData.currentX = pos.x;
    tempEdgeData.currentY = pos.y;

    const path = document.getElementById('temp-edge-path');
    if (!path) return;

    const oppositeSide = (snappedNode)
        ? snappedSide
        : {
            'top': 'bottom', 'bottom': 'top',
            'left': 'right', 'right': 'left'
        }[tempEdgeData.fromSide] || 'left';

    const dx = tempEdgeData.currentX - tempEdgeData.startX;
    const dy = tempEdgeData.currentY - tempEdgeData.startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const perpDist = Math.max(40, Math.min(distance * 0.5, 120));

    let cp1x = tempEdgeData.startX;
    let cp1y = tempEdgeData.startY;
    switch (tempEdgeData.fromSide) {
        case 'right': cp1x += perpDist; break;
        case 'left':  cp1x -= perpDist; break;
        case 'bottom': cp1y += perpDist; break;
        case 'top':    cp1y -= perpDist; break;
    }

    let cp2x = tempEdgeData.currentX;
    let cp2y = tempEdgeData.currentY;
    switch (oppositeSide) {
        case 'right': cp2x += perpDist; break;
        case 'left':  cp2x -= perpDist; break;
        case 'bottom': cp2y += perpDist; break;
        case 'top':    cp2y -= perpDist; break;
    }

    const curve = `M ${tempEdgeData.startX} ${tempEdgeData.startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${tempEdgeData.currentX} ${tempEdgeData.currentY}`;
    path.setAttribute('d', curve);
}

// 结束拖拽边
function endEdgeDrag(e) {
    if (!state.isDrawingEdge || !tempEdgeData) {
        cleanup();
        return;
    }

    // 检查是否释放在某个节点上
    const pos = screenToCanvas(e.clientX, e.clientY);
    const targetNode = findNodeAtPosition(pos.x, pos.y);

    if (targetNode && targetNode.id !== tempEdgeData.fromNode) {
        // 释放在现有节点上
        const fromNode = state.nodes.find(n => n.id === tempEdgeData.fromNode);
        if (fromNode) {
            // fromSide 保持不变
            const fromSide = tempEdgeData.fromSide;

            // toSide：找到目标节点上离释放位置最近的锚点
            const toSides = ['top', 'right', 'bottom', 'left'];
            let toSide = 'left';
            let minDist = Infinity;
            for (const side of toSides) {
                const anchorPos = getAnchorPosition(targetNode, side);
                const dist = Math.hypot(pos.x - anchorPos.x, pos.y - anchorPos.y);
                if (dist < minDist) {
                    minDist = dist;
                    toSide = side;
                }
            }

            createEdge(tempEdgeData.fromNode, targetNode.id, fromSide, toSide);
        }
    } else {
        // 释放在空白处，在鼠标位置创建新节点并连接
        const fromNode = state.nodes.find(n => n.id === tempEdgeData.fromNode);
        if (!fromNode) {
            cleanup();
            return;
        }

        // 在鼠标释放位置创建新卡片（居中于鼠标位置）
        const newX = pos.x - CONFIG.DEFAULT_NODE_WIDTH / 2;
        const newY = pos.y - CONFIG.DEFAULT_NODE_HEIGHT / 2;

        // 批处理历史记录：createNode + createEdge 视为一次操作
        beginBatchHistory();
        const newNode = createNode('text', {
            x: newX,
            y: newY,
            text: ''
        });

        // 根据 fromSide 确定 toSide（对面的锚点）
        let toSide;
        switch (tempEdgeData.fromSide) {
            case 'right': toSide = 'left'; break;
            case 'left': toSide = 'right'; break;
            case 'bottom': toSide = 'top'; break;
            case 'top': toSide = 'bottom'; break;
            default: toSide = 'left';
        }

        createEdge(tempEdgeData.fromNode, newNode.id, tempEdgeData.fromSide, toSide);
        endBatchHistory();
    }

    cleanup();

    function cleanup() {
        resetBatchHistory();
        state.isDrawingEdge = false;
        tempEdgeData = null;

        const tempLayer = document.getElementById('temp-edge-layer');
        if (tempLayer) tempLayer.innerHTML = '';

        document.removeEventListener('mousemove', onEdgeDrag);
        document.removeEventListener('mouseup', endEdgeDrag);
    }
}

// 查找位置上的节点（带容差，涵盖锚点位置）
const HIT_TOLERANCE = 20; // 锚点圆心在卡片边界外 8px，加上半径 8px
function findNodeAtPosition(x, y) {
    return state.nodes.find(node => {
        return x >= node.x - HIT_TOLERANCE && x <= node.x + node.width + HIT_TOLERANCE &&
               y >= node.y - HIT_TOLERANCE && y <= node.y + node.height + HIT_TOLERANCE;
    });
}

// 确定连接的边方向（基于鼠标位置，用于拖拽到现有节点）
function determineSide(node, pos) {
    const centerX = node.x + node.width / 2;
    const centerY = node.y + node.height / 2;
    const dx = pos.x - centerX;
    const dy = pos.y - centerY;

    if (Math.abs(dx) > Math.abs(dy)) {
        return dx > 0 ? 'left' : 'right';
    } else {
        return dy > 0 ? 'top' : 'bottom';
    }
}

// 计算两个节点之间的最佳连接方向（基于相对位置）
function calculateConnectionSides(fromNode, toNode) {
    // 计算两个节点中心的相对位置
    const fromCenterX = fromNode.x + fromNode.width / 2;
    const fromCenterY = fromNode.y + fromNode.height / 2;
    const toCenterX = toNode.x + toNode.width / 2;
    const toCenterY = toNode.y + toNode.height / 2;

    const dx = toCenterX - fromCenterX;
    const dy = toCenterY - fromCenterY;

    let fromSide, toSide;

    // 根据主要方向判断连接边
    if (Math.abs(dx) > Math.abs(dy)) {
        // 水平方向为主
        if (dx > 0) {
            // 目标在右侧：从右边连到左边
            fromSide = 'right';
            toSide = 'left';
        } else {
            // 目标在左侧：从左边连到右边
            fromSide = 'left';
            toSide = 'right';
        }
    } else {
        // 垂直方向为主
        if (dy > 0) {
            // 目标在下方：从下边连到上边
            fromSide = 'bottom';
            toSide = 'top';
        } else {
            // 目标在上方：从上边连到下边
            fromSide = 'top';
            toSide = 'bottom';
        }
    }

    return { fromSide, toSide };
}

// ============================================
// 6. 交互管理器
// ============================================

// 构建菜单 DOM 的辅助函数
function buildMenu(container, items) {
    const hasCheckable = items.some(item => item.checkable);

    items.forEach(item => {
        if (item.divider) {
            const divider = document.createElement('div');
            divider.className = 'context-menu-divider';
            container.appendChild(divider);
        } else {
            const menuItem = document.createElement('div');
            menuItem.className = 'context-menu-item' +
                (item.danger ? ' danger' : '') +
                (item.disabled ? ' disabled' : '');

            // 仅当菜单中有可勾选项时才显示勾选列
            let checkMark = '';
            if (hasCheckable) {
                checkMark = item.checked
                    ? '<span class="menu-check">✓</span>'
                    : '<span class="menu-check"></span>';
            }

            if (item.icon) {
                menuItem.innerHTML = `<span>${item.icon}</span>${checkMark}<span>${item.label}</span>`;
            } else {
                menuItem.innerHTML = `${checkMark}<span>${item.label}</span>`;
            }
            if (!item.disabled) {
                menuItem.addEventListener('click', () => {
                    if (item.action) item.action();
                    hideContextMenu();
                });
            }
            container.appendChild(menuItem);
        }
    });
}

// 显示右键菜单 — 空白画布
function showCanvasContextMenu(screenX, screenY) {
    const menu = document.getElementById('context-menu');
    menu.innerHTML = '';

    const canvasPos = screenToCanvas(screenX, screenY);

    const items = [
        { label: '添加文本', action: () => {
            createNode('text', {
                text: '',
                x: canvasPos.x - CONFIG.DEFAULT_NODE_WIDTH / 2,
                y: canvasPos.y - CONFIG.DEFAULT_NODE_HEIGHT / 2
            });
        }},
        { label: '撤销', action: () => undo() },
        { label: '粘贴', action: () => pasteItems() },
        { divider: true },
        { label: '对齐网格', checkable: true, checked: !!state.isSnapToGrid, action: () => toggleSnapToGrid() },
        { label: '对齐物体', checkable: true, checked: !!state.isAlignObjects, action: () => toggleAlignObjects() },
        { divider: true },
        { label: '只读', checkable: true, checked: !!state.isReadOnly, action: () => toggleReadOnly() },
    ];

    buildMenu(menu, items);

    menu.style.left = screenX + 'px';
    menu.style.top = screenY + 'px';
    menu.style.display = 'block';
}

// 只读模式下的右键菜单（仅聚焦）
function showReadOnlyContextMenu(x, y) {
    const menu = document.getElementById('context-menu');
    menu.innerHTML = '';

    const selectedIds = [...state.selectedNodes];
    const items = [];
    if (selectedIds.length >= 1) {
        items.push({ label: '聚焦当前卡片', action: () => focusSelectionCenter() });
    }
    buildMenu(menu, items);

    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.style.display = 'block';
}

// 聚焦到框选包围盒的中心
function focusSelectionCenter() {
    if (state._marqueeRect) {
        const mr = state._marqueeRect;
        const centerX = mr.left + mr.width / 2;
        const centerY = mr.top + mr.height / 2;
        const container = document.getElementById('canvas-container');
        const rect = container.getBoundingClientRect();
        state.viewport.x = rect.width / 2 - centerX * state.viewport.zoom;
        state.viewport.y = rect.height / 2 - centerY * state.viewport.zoom;
        updateCanvasTransform();
        updateZoomLabel();
        autoSave();
    } else if (state.selectedNodes.size >= 1) {
        focusNode([...state.selectedNodes][0]);
    }
}

// 显示右键菜单 — 卡片/多选
function showContextMenu(x, y, nodeId) {
    const menu = document.getElementById('context-menu');
    menu.innerHTML = '';

    const hasMultiSelect = state.selectedNodes.size > 1;
    const node = state.nodes.find(n => n.id === nodeId);

    const items = [];

    if (node) {
        items.push({ label: '聚焦当前卡片', action: () => focusNode(nodeId) });
    }

    if (hasMultiSelect && state.selectedNodes.size >= 2) {
        items.push({ label: '创建分组', action: () => createGroupFromSelection() });
    }

    items.push({ divider: true });
    items.push({ label: '剪切', action: () => { copySelectedItems(); deleteSelectedItems(); } });
    items.push({ label: '复制', action: () => copySelectedItems() });
    items.push({ label: '粘贴', action: () => pasteItems() });
    items.push({ divider: true });
    items.push({ label: '删除', action: () => deleteSelectedItems(), danger: true });

    buildMenu(menu, items);

    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.style.display = 'block';
}

// 显示边右键菜单
function showEdgeContextMenu(x, y, edgeId) {
    const menu = document.getElementById('context-menu');
    menu.innerHTML = '';

    const items = [
        { label: '删除连接线', action: () => deleteEdge(edgeId), danger: true },
    ];

    buildMenu(menu, items);

    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.style.display = 'block';
}

// 隐藏右键菜单
function hideContextMenu() {
    const menu = document.getElementById('context-menu');
    menu.style.display = 'none';
}

// 删除所有选中项（批量操作，统一保存历史）
function deleteSelectedItems() {
    if (state.selectedNodes.size === 0 && state.selectedEdges.size === 0) return;

    // 先收集要删除的节点和边的ID（避免迭代时修改集合）
    const nodeIds = [...state.selectedNodes];
    const edgeIds = [...state.selectedEdges];

    // 批量删除节点（内部删除关联边）
    nodeIds.forEach(id => deleteNode(id, true));
    // 删除剩余选中的边（未关联已删节点的独立边）
    edgeIds.forEach(id => deleteEdge(id, true));

    clearMarquee();
    saveHistory(); // 事后快照
    autoSave();
}

// 切换对齐网格模式
function toggleSnapToGrid() {
    state.isSnapToGrid = !state.isSnapToGrid;
    if (state.isSnapToGrid) {
        // 开启时立即对齐所有选中节点到网格
        snapSelectedToGrid();
        showMessage('对齐网格：开');
    } else {
        showMessage('对齐网格：关');
    }
    autoSave();
}

// 切换对齐物体模式（占位）
function toggleAlignObjects() {
    state.isAlignObjects = !state.isAlignObjects;
    showMessage(state.isAlignObjects ? '对齐物体：开' : '对齐物体：关');
    autoSave();
}

// 对齐选中节点到网格（实际执行）
function snapSelectedToGrid() {
    const gridSize = CONFIG.GRID_SIZE;
    const selectedIds = [...state.selectedNodes];
    if (selectedIds.length === 0) {
        state.nodes.forEach(node => {
            node.x = Math.round(node.x / gridSize) * gridSize;
            node.y = Math.round(node.y / gridSize) * gridSize;
            updateNodePosition(node.id, node.x, node.y);
            updateEdgesForNode(node.id);
        });
    } else {
        selectedIds.forEach(id => {
            const node = state.nodes.find(n => n.id === id);
            if (node) {
                node.x = Math.round(node.x / gridSize) * gridSize;
                node.y = Math.round(node.y / gridSize) * gridSize;
                updateNodePosition(node.id, node.x, node.y);
                updateEdgesForNode(node.id);
            }
        });
    }
    autoSave();
}

// 仅更新节点位置（DOM + 数据，不触发历史保存）
function updateNodePosition(nodeId, x, y) {
    const node = state.nodes.find(n => n.id === nodeId);
    if (!node) return;
    node.x = x;
    node.y = y;
    const card = document.querySelector(`[data-node-id="${nodeId}"]`);
    if (card) {
        card.style.left = x + 'px';
        card.style.top = y + 'px';
    }
}

// 从选中的节点创建分组
function createGroupFromSelection() {
    const selectedIds = [...state.selectedNodes];
    if (selectedIds.length < 2) {
        showMessage('请至少选择2个卡片来创建分组');
        return;
    }

    // 计算包围盒
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    selectedIds.forEach(id => {
        const node = state.nodes.find(n => n.id === id);
        if (node) {
            minX = Math.min(minX, node.x);
            minY = Math.min(minY, node.y);
            maxX = Math.max(maxX, node.x + node.width);
            maxY = Math.max(maxY, node.y + node.height);
        }
    });

    // 分组标题栏高度（padding 8+8 + font 13px ≈ 34px），不参与内容区计算
    const GROUP_HEADER_HEIGHT = 34;
    const padding = 20;
    const group = createNode('group', {
        x: minX - padding,
        y: minY - padding - GROUP_HEADER_HEIGHT,
        width: maxX - minX + padding * 2,
        height: maxY - minY + padding * 2 + GROUP_HEADER_HEIGHT,
        text: '组',
        color: 'blue',
        border: 'dashed'
    });

    showMessage(`已创建分组，包含 ${selectedIds.length} 个卡片`);
}

// 切换只读模式
function toggleReadOnly() {
    state.isReadOnly = !state.isReadOnly;
    const container = document.getElementById('canvas-container');
    const toolbar = document.getElementById('toolbar');
    if (state.isReadOnly) {
        container.classList.add('read-only');
        if (toolbar) toolbar.style.display = 'none';
        showMessage('只读：开');
    } else {
        container.classList.remove('read-only');
        if (toolbar) toolbar.style.display = '';
        showMessage('只读：关');
    }
    updateSettingsButton();
    autoSave();
}

// 编辑操作是否允许（只读或预览模式下禁止）
function isEditingAllowed() {
    return !state.isReadOnly && !state.isPreviewMode;
}

// 切换预览/编辑模式
function togglePreviewMode() {
    state.isPreviewMode = !state.isPreviewMode;
    updateModeUI();
    autoSave();
}

// 更新模式相关的 UI
function updateModeUI() {
    const body = document.body;
    const btn = document.getElementById('btn-toggle-mode');
    if (!btn) return;

    if (state.isPreviewMode) {
        body.classList.add('preview-mode');
        body.classList.remove('edit-mode');
        btn.classList.add('mode-active');
        btn.querySelector('svg').innerHTML =
            '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
        // 退出编辑模式
        if (state.editingNode) finishEditingNode();
        showMessage('预览模式');
    } else {
        body.classList.remove('preview-mode');
        body.classList.add('edit-mode');
        btn.classList.remove('mode-active');
        btn.querySelector('svg').innerHTML =
            '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22"/>';
        showMessage('编辑模式');
    }
}
function toggleSettingsDropdown() {
    const dropdown = document.getElementById('settings-dropdown');
    if (dropdown.style.display === 'block') {
        dropdown.style.display = 'none';
        return;
    }
    // 关闭右键菜单
    hideContextMenu();

    dropdown.innerHTML = '';
    const items = [
        { label: '对齐网格', checkable: true, checked: !!state.isSnapToGrid, action: () => { toggleSnapToGrid(); toggleSettingsDropdown(); } },
        { label: '对齐物体', checkable: true, checked: !!state.isAlignObjects, action: () => { toggleAlignObjects(); toggleSettingsDropdown(); } },
        { divider: true },
        { label: '只读', checkable: true, checked: !!state.isReadOnly, action: () => { toggleReadOnly(); toggleSettingsDropdown(); } },
        { divider: true },
        { label: `存储：块属性（块删即清，不残留）`, disabled: true },
    ];
    buildMenu(dropdown, items);

    // 定位在设置按钮右侧
    const btn = document.getElementById('btn-settings');
    const rect = btn.getBoundingClientRect();
    dropdown.style.left = (rect.left - 140) + 'px';
    dropdown.style.top = rect.top + 'px';
    dropdown.style.display = 'block';

    // 点击其他地方关闭
    const closeDropdown = (ev) => {
        if (!dropdown.contains(ev.target) && ev.target !== btn && !btn.contains(ev.target)) {
            dropdown.style.display = 'none';
            document.removeEventListener('click', closeDropdown);
        }
    };
    setTimeout(() => document.addEventListener('click', closeDropdown), 0);
}

// 更新设置按钮图标（只读时显示锁）
function updateSettingsButton() {
    const btn = document.getElementById('btn-settings');
    if (!btn) return;
    if (state.isReadOnly) {
        btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
        btn.classList.add('readonly-active');
        btn.title = '只读模式（点击关闭）';
    } else {
        btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
        btn.classList.remove('readonly-active');
        btn.title = '设置';
    }
}

// 导出为 PNG 图片
async function exportAsImage() {
    if (state.nodes.length === 0) return;

    // 计算所有节点的包围盒
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    state.nodes.forEach(node => {
        minX = Math.min(minX, node.x);
        minY = Math.min(minY, node.y);
        maxX = Math.max(maxX, node.x + node.width);
        maxY = Math.max(maxY, node.y + node.height);
    });
    const pad = 40;
    const totalW = maxX - minX + pad * 2;
    const totalH = maxY - minY + pad * 2;

    // 构建 SVG
    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="${minX - pad} ${minY - pad} ${totalW} ${totalH}">`;
    svgContent += `<defs><filter id="export-shadow" x="-10%" y="-10%" width="130%" height="130%"><feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.15"/></filter></defs>`;
    svgContent += `<rect x="${minX - pad}" y="${minY - pad}" width="${totalW}" height="${totalH}" fill="#fafafa"/>`;

    // 绘制边
    state.edges.forEach(edge => {
        const fromNode = state.nodes.find(n => n.id === edge.fromNode);
        const toNode = state.nodes.find(n => n.id === edge.toNode);
        if (!fromNode || !toNode) return;
        const start = getAnchorPosition(fromNode, edge.fromSide);
        const end = getAnchorPosition(toNode, edge.toSide);
        const path = calculateBezierPath(edge);
        if (path) {
            const color = edge.color || '#7c7c7c';
            svgContent += `<path d="${path}" stroke="${color}" stroke-width="2" fill="none"`;
            if (edge.toEnd === 'arrow') {
                svgContent += ` marker-end="url(#export-arrow-${edge.id})"`;
            }
            svgContent += `/>`;
            // 箭头标记
            if (edge.toEnd === 'arrow') {
                svgContent += `<defs><marker id="export-arrow-${edge.id}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="${color}"/></marker></defs>`;
            }
        }
    });

    // 绘制节点
    state.nodes.forEach(node => {
        const fillColor = node.color && COLORS[node.color] ? COLORS[node.color] : '#ffffff';
        const rx = node.shape === 'rounded' ? 12 : 0;
        const borderColor = node.color && node.color !== 'white' ? COLORS[node.color] : '#d0d0d0';
        svgContent += `<rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" rx="${rx}" fill="${fillColor}" stroke="${borderColor}" stroke-width="1"`;
        if (node.border === 'dashed') svgContent += ` stroke-dasharray="6,4"`;
        svgContent += ` filter="url(#export-shadow)"`;
        svgContent += `/>`;
        // 文本
        const textContent = (node.text || '').split('\n')[0].substring(0, 40);
        svgContent += `<text x="${node.x + node.width/2}" y="${node.y + node.height/2 + 5}" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#333">${escapeXml(textContent)}</text>`;
    });

    svgContent += '</svg>';

    // SVG → Image → Canvas → PNG
    const img = new Image();
    const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = totalW;
        canvas.height = totalH;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, totalW, totalH);
        ctx.drawImage(img, 0, 0);

        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        URL.revokeObjectURL(url);

        // 保存到思源 assets 目录
        const filename = `canvas-export-${Date.now()}.png`;
        const file = new File([blob], filename, { type: 'image/png' });
        const formData = new FormData();
        formData.append('path', `/data/assets/${filename}`);
        formData.append('file', file);
        const res = await fetch('/api/file/putFile', { method: 'POST', body: formData });
        const result = await res.json();
        if (result.code === 0) {
            showMessage(`已导出: data/assets/${filename}`, 4000);
        }
    };
    img.src = url;
}

// XML 转义
function escapeXml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// 总览全局 — 缩放以显示所有节点
function fitAllNodes() {
    if (state.nodes.length === 0) {
        resetView();
        return;
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    state.nodes.forEach(node => {
        minX = Math.min(minX, node.x);
        minY = Math.min(minY, node.y);
        maxX = Math.max(maxX, node.x + node.width);
        maxY = Math.max(maxY, node.y + node.height);
    });
    const contentW = maxX - minX + 80;
    const contentH = maxY - minY + 80;
    const container = document.getElementById('canvas-container');
    const rect = container.getBoundingClientRect();
    const scaleX = rect.width / contentW;
    const scaleY = rect.height / contentH;
    const newZoom = Math.min(scaleX, scaleY, 1);
    state.viewport.zoom = newZoom;
    state.viewport.x = (rect.width - contentW * newZoom) / 2 - minX * newZoom + 40 * newZoom;
    state.viewport.y = (rect.height - contentH * newZoom) / 2 - minY * newZoom + 40 * newZoom;
    updateCanvasTransform();
    updateZoomLabel();
    autoSave();
}

/**
 * 导出 .canvas 文件到 /data/assets/CanvasFiles/
 * 并通过 custom-data-assets 属性注册引用，避免被思源标记为"未引用资源"
 */
async function exportCanvasFile() {
    if (!state.widgetID) return;
    if (state.nodes.length === 0) {
        showMessage('画布为空，无需导出');
        return;
    }
    try {
        // 清洗数据
        const cleanedNodes = state.nodes.map(cleanNodeForSave);
        const cleanedEdges = state.edges.map(cleanEdgeForSave);
        const data = {
            version: '1.0',
            nodes: cleanedNodes,
            edges: cleanedEdges,
            viewport: state.viewport,
            settings: {
                isSnapToGrid: state.isSnapToGrid,
                isAlignObjects: state.isAlignObjects,
                isReadOnly: state.isReadOnly,
                isPreviewMode: state.isPreviewMode
            }
        };
        const jsonStr = JSON.stringify(data);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const safeName = `canvas-${timestamp}`;
        const exportPath = `/data/assets/CanvasFiles/${safeName}.canvas`;

        // 确保目录存在
        try {
            const dirFd = new FormData();
            dirFd.append('path', '/data/assets/CanvasFiles/');
            dirFd.append('isDir', 'true');
            await fetch('/api/file/putFile', { method: 'POST', body: dirFd });
        } catch (_) { /* 目录可能已存在 */ }

        // 写入 .canvas 文件
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const formData = new FormData();
        formData.append('path', exportPath);
        formData.append('file', blob, `${safeName}.canvas`);
        const res = await fetch('/api/file/putFile', { method: 'POST', body: formData });
        const result = await res.json();
        if (result.code !== 0) {
            showMessage('导出失败: ' + result.msg);
            return;
        }

        // 注册资源引用（避免被标记为"未引用资源"）
        try {
            const existingAttrsRes = await fetch('/api/attr/getBlockAttrs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: state.widgetID })
            });
            const existingAttrs = await existingAttrsRes.json();
            let existingAssets = '';
            if (existingAttrs.code === 0 && existingAttrs.data) {
                existingAssets = existingAttrs.data['custom-data-assets'] || '';
            }
            const newAssets = existingAssets
                ? existingAssets + '\n' + exportPath
                : exportPath;
            await fetch('/api/attr/setBlockAttrs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: state.widgetID,
                    attrs: { 'custom-data-assets': newAssets }
                })
            });
        } catch (_) { /* 引用注册失败不阻塞导出 */ }

        showMessage(`已导出: ${exportPath}`);
    } catch (err) {
        console.error('[Canvas] 导出 .canvas 异常:', err);
        showMessage('导出失败');
    }
}

// 加载笔记内容（用于 note 类型卡片）
async function loadNoteContent(nodeId, blockId) {
    const card = document.querySelector(`[data-node-id="${nodeId}"]`);
    if (!card) return;

    const contentDiv = card.querySelector('.card-content');
    if (!contentDiv) return;

    const showErr = (msg) => {
        contentDiv.innerHTML = `<div style="padding:20px;text-align:center;color:var(--color-text-secondary);">${msg}<br><small>${blockId}</small></div>`;
    };

    try {
        // 方法1：调用 /api/filetree/getDoc 获取块 HTML
        const res = await request('/api/filetree/getDoc', { id: blockId });

        if (res && res.code === 0 && res.data && res.data.content) {
            const origin = window.top?.location?.origin || '';
            let html = res.data.content
                .replace(/"assets\//g, `"${origin}/assets/`)
                .replace(/contenteditable="true"/g, 'contenteditable="false"')
                .replace(/src="api\/icon\/getDynamicIcon/g, `src="${origin}/api/icon/getDynamicIcon`);

            // 文档标题（仅 NodeDocument 类型）
            if (res.data.type === 'NodeDocument') {
                try {
                    const docInfo = await request('/api/block/getDocInfo', { id: blockId });
                    if (docInfo?.code === 0 && docInfo?.data?.name) {
                        const title = docInfo.data.name.replace(/</g, '&lt;').replace(/>/g, '&gt;');
                        html = `<h2 style="margin:0 0 8px;font-size:15px;">${title}</h2>` + html;
                    }
                } catch(e) { /* 标题获取失败不影响内容 */ }
            }

            contentDiv.innerHTML = html;
            contentDiv.style.cssText = 'overflow:auto;font-size:13px;line-height:1.6;';

            // 超链接点击跳转
            contentDiv.querySelectorAll('[data-href]').forEach(el => {
                el.style.cursor = 'pointer';
                el.addEventListener('click', ev => {
                    ev.stopPropagation();
                    const href = el.getAttribute('data-href');
                    if (href) {
                        try { window.top.openFileByURL(href); } catch(e) {}
                    }
                });
            });
            return;
        }

        // 方法2：尝试 /api/block/getBlockKramdown 获取 markdown
        const mdRes = await request('/api/block/getBlockKramdown', { id: blockId });

        if (mdRes && mdRes.code === 0 && mdRes.data) {
            const markdown = mdRes.data.kramdown || '';
            const html = parseMarkdown(markdown);
            contentDiv.innerHTML = html;
            contentDiv.style.cssText = 'overflow:auto;font-size:13px;line-height:1.6;';
            return;
        }

        // 都失败了
        showErr('📄 无法加载笔记内容');

    } catch (err) {
        console.error('[NoteCard] 加载失败:', err);
        showErr('📄 加载出错: ' + (err.message || 'network error'));
    }
}

// ============================================
// 7. 初始化和事件绑定
// ============================================

// 初始化画布
async function init() {
    state.widgetID = getWidgetID();

    // 加载数据
    await loadCanvas();

    // 渲染所有节点
    state.nodes.forEach(node => renderNode(node));

    // 渲染所有边
    state.edges.forEach(edge => renderEdge(edge));

    // 更新视图
    updateCanvasTransform();

    // 应用持久化设置到 UI
    applySettingsToUI();

    // 保存初始状态作为撤销基线
    saveHistory();

    // 绑定全局事件
    bindGlobalEvents();

    // 绑定页面关闭/刷新时的保存事件
    bindPageLifecycleEvents();

}

// 将持久化设置应用到 UI（只读、对齐网格等）并触发首次保存
function applySettingsToUI() {
    const container = document.getElementById('canvas-container');
    const toolbar = document.getElementById('toolbar');
    if (state.isReadOnly) {
        container.classList.add('read-only');
        if (toolbar) toolbar.style.display = 'none';
    } else {
        container.classList.remove('read-only');
        if (toolbar) toolbar.style.display = '';
    }
    updateSettingsButton();
    updateModeUI();
    // 确保设置被保存到文件
    autoSave();
}

// 绑定页面生命周期事件（确保关闭时保存数据）
function bindPageLifecycleEvents() {
    // 页面关闭/刷新前强制保存（块属性 + 文件双保险）
    window.addEventListener('beforeunload', () => {
        if (!state.widgetID) return;
        try {
            const cleanedNodes = state.nodes.map(cleanNodeForSave);
            const cleanedEdges = state.edges.map(cleanEdgeForSave);
            const data = {
                version: '1.0',
                nodes: cleanedNodes,
                edges: cleanedEdges,
                viewport: state.viewport,
                settings: {
                    isSnapToGrid: state.isSnapToGrid,
                    isAlignObjects: state.isAlignObjects,
                    isReadOnly: state.isReadOnly,
                    isPreviewMode: state.isPreviewMode
                }
            };
            const jsonStr = JSON.stringify(data);

            // 1. 文件备份（sendBeacon 最可靠）
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const formData = new FormData();
            formData.append('path', getCanvasFilePath());
            formData.append('file', blob, `${state.widgetID}.canvas`);
            if (navigator.sendBeacon) {
                navigator.sendBeacon('/api/file/putFile', formData);
            } else {
                fetch('/api/file/putFile', { method: 'POST', body: formData, keepalive: true });
            }

            // 2. 块属性保存（keepalive fetch，sendBeacon 不支持 JSON body）
            fetch('/api/attr/setBlockAttrs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: state.widgetID, attrs: { 'custom-canvas-data': jsonStr } }),
                keepalive: true
            }).catch(() => { /* 静默失败 */ });
        } catch (err) {
            console.error('[Canvas] beforeunload 保存失败:', err);
        }
    });

    // 页面隐藏时立即保存
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            saveCanvas();
        }
    });

    // 窗口失去焦点时保存
    window.addEventListener('blur', () => {
        saveCanvas();
    });
}

// 绑定全局事件
function bindGlobalEvents() {
    const container = document.getElementById('canvas-container');

    // 自定义 tooltip（iframe 中浏览器禁用原生 title tooltip）
    const tooltipEl = document.createElement('div');
    tooltipEl.className = 'tooltip';
    document.body.appendChild(tooltipEl);
    let _ttTimer = null;
    document.querySelectorAll('#toolbar button, #top-toolbar button, .float-btn').forEach(btn => {
        const text = btn.getAttribute('title');
        if (!text) return;
        btn.removeAttribute('title');
        btn.addEventListener('mouseenter', () => {
            clearTimeout(_ttTimer);
            tooltipEl.textContent = text;
            // 先设为不可见但占据布局空间，以便读取尺寸
            tooltipEl.style.visibility = 'hidden';
            tooltipEl.classList.add('show');
            const tw = tooltipEl.offsetWidth;
            const th = tooltipEl.offsetHeight;
            tooltipEl.style.visibility = '';
            const rect = btn.getBoundingClientRect();
            const isTopBar = btn.closest('#top-toolbar') || btn.matches('.float-btn');
            if (isTopBar) {
                tooltipEl.style.left = (rect.left - tw - 10) + 'px';
                tooltipEl.style.top = (rect.top + rect.height / 2 - th / 2) + 'px';
            } else {
                tooltipEl.style.left = (rect.left + rect.width / 2 - tw / 2) + 'px';
                tooltipEl.style.top = (rect.top - th - 10) + 'px';
            }
        });
        btn.addEventListener('mouseleave', () => {
            _ttTimer = setTimeout(() => tooltipEl.classList.remove('show'), 100);
        });
    });

    // Space 键状态跟踪
    state.isSpacePressed = false;

    // Space 键按下 - 进入平移准备状态
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && !state.editingNode) {
            e.preventDefault();
            state.isSpacePressed = true;
            container.classList.add('will-pan');
        }
    });

    // Space 键释放 - 退出平移准备状态
    document.addEventListener('keyup', (e) => {
        if (e.code === 'Space') {
            state.isSpacePressed = false;
            state.isPanning = false;
            state.panStartPos = null;
            container.classList.remove('will-pan', 'panning');
        }
    });

    // 鼠标中键或 Space+左键拖拽平移，或左键框选
    container.addEventListener('mousedown', (e) => {
        // 中键平移
        if (e.button === 1) {
            e.preventDefault();
            state.isPanning = true;
            state.panStartPos = { x: e.clientX, y: e.clientY };
            container.classList.add('panning');
        }
        // Space + 左键平移
        else if (e.button === 0 && state.isSpacePressed) {
            e.preventDefault();
            state.isPanning = true;
            state.panStartPos = { x: e.clientX, y: e.clientY };
            container.classList.add('panning');
        }
        // 左键框选（点击空白处，不点击卡片/连线/锚点）
        else if (e.button === 0 && !state.isSpacePressed) {
            const target = e.target;
            // 排除卡片、卡片内部元素、连线、锚点、调整手柄
            const isOnCard = target.closest('.card');
            const isOnEdge = target.closest('g[data-edge-id]') || target.closest('.edge-path') || target.closest('.edge-hit-path');
            const isOnAnchor = target.classList.contains('card-anchor');
            const isOnResize = target.classList.contains('card-resize-handle');
            const isOnToolbar = target.closest('#toolbar') || target.closest('#top-toolbar');
            const isOnMarquee = target.closest('#marquee-selection');
            // 也检查是否在持久框选框内部
            const inMarqueeRect = state._marqueeRect && isPointInRect(
                screenToCanvas(e.clientX, e.clientY),
                state._marqueeRect.left, state._marqueeRect.top,
                state._marqueeRect.width, state._marqueeRect.height
            );

            if (!isOnCard && !isOnEdge && !isOnAnchor && !isOnResize && !isOnToolbar && !isOnMarquee && !inMarqueeRect) {
                startMarqueeSelection(e);
            }
            // 左键点击框选框内部或边框 → 拖拽移动所有选中节点
            if ((isOnMarquee || inMarqueeRect) && state._marqueeRect && state.selectedNodes.size > 0) {
                startMarqueeDrag(e);
            }
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (state.isPanning && state.panStartPos) {
            const dx = e.clientX - state.panStartPos.x;
            const dy = e.clientY - state.panStartPos.y;
            pan(dx, dy);
            state.panStartPos = { x: e.clientX, y: e.clientY };
        }
        // 框选更新
        else if (state.isMarqueeSelecting) {
            updateMarqueeSelection(e);
        }
    });

    document.addEventListener('mouseup', (e) => {
        if (state.isPanning) {
            state.isPanning = false;
            state.panStartPos = null;
            container.classList.remove('panning');
        }
        // 框选结束
        if (state.isMarqueeSelecting) {
            endMarqueeSelection(e);
        }
    });

    // 滚轮缩放
    container.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -CONFIG.ZOOM_STEP : CONFIG.ZOOM_STEP;
        zoom(delta, e.clientX, e.clientY);
    });

    // 双击重置视图
    container.addEventListener('dblclick', (e) => {
        if (e.target === container || e.target.id === 'canvas') {
            resetView();
        }
    });

    // 点击空白处取消选择 + 清除框选框
    container.addEventListener('click', (e) => {
        // 框选刚完成，跳过本次 click（mouseup 后的 click 位置可能不在紧凑包围盒内）
        if (state._marqueeJustCreated) {
            state._marqueeJustCreated = false;
            return;
        }
        const target = e.target;
        const isOnCard = target.closest('.card');
        const isOnEdge = target.closest('g[data-edge-id]');
        const isOnMarquee = target.closest('#marquee-selection');
        const inMarqueeRect = state._marqueeRect && isPointInRect(
            screenToCanvas(e.clientX, e.clientY),
            state._marqueeRect.left, state._marqueeRect.top,
            state._marqueeRect.width, state._marqueeRect.height
        );
        if (!isOnCard && !isOnEdge && !isOnMarquee && !inMarqueeRect) {
            clearMarquee();
        }
    });

    // 右键空白画布 — 画布菜单；右键框选框/框内空白 → 多选菜单
    container.addEventListener('contextmenu', (e) => {
        const target = e.target;
        const isOnCard = target.closest('.card');
        const isOnMarquee = target.closest('#marquee-selection');
        const isOnEdge = target.closest('g[data-edge-id]') || target.closest('.edge-path') || target.closest('.edge-hit-path');
        const isOnToolbar = target.closest('#toolbar') || target.closest('#top-toolbar');
        const inMarqueeRect = state._marqueeRect && isPointInRect(
            screenToCanvas(e.clientX, e.clientY),
            state._marqueeRect.left, state._marqueeRect.top,
            state._marqueeRect.width, state._marqueeRect.height
        );

        if (!isOnCard && !isOnEdge && !isOnToolbar) {
            e.preventDefault();
            e.stopPropagation();

            // 只读/预览模式：右键仅显示聚焦菜单，不显示编辑项
            if (!isEditingAllowed()) {
                if (isOnCard || isOnMarquee || inMarqueeRect) {
                    showReadOnlyContextMenu(e.clientX, e.clientY);
                }
                return;
            }

            if ((isOnMarquee || inMarqueeRect) && state.selectedNodes.size > 0) {
                const firstId = [...state.selectedNodes][0];
                showContextMenu(e.clientX, e.clientY, firstId);
            } else {
                showCanvasContextMenu(e.clientX, e.clientY);
            }
        }
    });

    // 隐藏右键菜单和设置面板
    document.addEventListener('click', () => {
        hideContextMenu();
        const dropdown = document.getElementById('settings-dropdown');
        if (dropdown) dropdown.style.display = 'none';
    });

    // 工具栏按钮
    const toolbarBtns = document.querySelectorAll('.toolbar-btn');
    toolbarBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const action = btn.dataset.action;
            handleToolbarAction(action, e);
        });

        // 拖拽支持：从工具栏拖出到画布上创建卡片
        btn.addEventListener('dragstart', (e) => {
            if (!isEditingAllowed()) { e.preventDefault(); return; }
            e.dataTransfer.setData('text/plain', btn.dataset.action);
            e.dataTransfer.effectAllowed = 'copy';
            btn.classList.add('dragging-source');

            // 创建跟随鼠标的拖拽预览图（卡片/组的缩小版）
            const dragImg = createToolbarDragImage(btn.dataset.action);
            document.body.appendChild(dragImg);
            // 预览图偏移：让卡片中心对齐鼠标
            const w = dragImg.offsetWidth || 160;
            const h = dragImg.offsetHeight || 40;
            e.dataTransfer.setDragImage(dragImg, w / 2, h / 2);
            setTimeout(() => dragImg.remove(), 0);
        });

        btn.addEventListener('dragend', (e) => {
            btn.classList.remove('dragging-source');
        });
    });

    // 画布区域接受拖放
    let dragCounter = 0;
    container.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        container.classList.add('drag-over');
    });

    container.addEventListener('dragenter', (e) => {
        e.preventDefault();
        dragCounter++;
        container.classList.add('drag-over');
    });

    container.addEventListener('dragleave', (e) => {
        dragCounter--;
        if (dragCounter <= 0) {
            dragCounter = 0;
            container.classList.remove('drag-over');
        }
    });

    container.addEventListener('drop', (e) => {
        e.preventDefault();
        dragCounter = 0;
        container.classList.remove('drag-over');

        const action = e.dataTransfer.getData('text/plain');
        if (!action) return;

        // 计算画布坐标并在释放位置创建卡片
        const canvasPos = screenToCanvas(e.clientX, e.clientY);
        handleToolbarDrop(action, canvasPos.x, canvasPos.y);
    });

    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
        handleKeyboard(e);
    });

    // 触摸设备支持（基础）
    bindTouchEvents(container);

    // 右上角工具栏 + 模式切换按钮：点击不触发画布事件
    const topToolbar = document.getElementById('top-toolbar');
    topToolbar.addEventListener('mousedown', (e) => { e.stopPropagation(); });
    topToolbar.addEventListener('click', (e) => { e.stopPropagation(); });

    // 悬浮按钮：阻止事件冒泡到画布
    document.querySelectorAll('.float-btn').forEach(btn => {
        btn.addEventListener('mousedown', (e) => { e.stopPropagation(); });
        btn.addEventListener('click', (e) => { e.stopPropagation(); });
    });

    document.getElementById('btn-toggle-mode').addEventListener('click', (e) => {
        e.stopPropagation();
        togglePreviewMode();
    });

    document.getElementById('btn-fit-all-float').addEventListener('click', () => {
        fitAllNodes();
    });

    document.getElementById('btn-zoom-reset-float').addEventListener('click', () => {
        resetView();
    });

    document.getElementById('btn-settings').addEventListener('click', (e) => {
        e.stopPropagation();
        if (state.isReadOnly) {
            toggleReadOnly();
        } else {
            toggleSettingsDropdown();
        }
    });
    document.getElementById('btn-zoom-in').addEventListener('click', () => {
        const rect = container.getBoundingClientRect();
        zoom(CONFIG.ZOOM_STEP, rect.left + rect.width / 2, rect.top + rect.height / 2);
    });
    document.getElementById('btn-zoom-out').addEventListener('click', () => {
        const rect = container.getBoundingClientRect();
        zoom(-CONFIG.ZOOM_STEP, rect.left + rect.width / 2, rect.top + rect.height / 2);
    });
    document.getElementById('btn-undo').addEventListener('click', () => {
        undo();
    });
    document.getElementById('btn-redo').addEventListener('click', () => {
        redo();
    });
    document.getElementById('btn-export').addEventListener('click', () => {
        exportAsImage();
    });

    document.getElementById('btn-export-canvas').addEventListener('click', () => {
        exportCanvasFile();
    });

    updateZoomLabel();
    updateSettingsButton();
}

// ============================================
// 6. 框选功能（Marquee Selection）
// ============================================

// 开始框选
function startMarqueeSelection(e) {
    state.isMarqueeSelecting = true;
    const canvasPos = screenToCanvas(e.clientX, e.clientY);
    state.marqueeStartPos = canvasPos;

    // 创建框选矩形
    const marquee = document.createElement('div');
    marquee.id = 'marquee-selection';
    marquee.className = 'marquee';
    document.getElementById('nodes-layer').appendChild(marquee);

    // 如果不按住Shift或Ctrl，清除当前选择
    if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
        clearSelection();
    }
}

// 更新框选
function updateMarqueeSelection(e) {
    if (!state.isMarqueeSelecting || !state.marqueeStartPos) return;

    const canvasPos = screenToCanvas(e.clientX, e.clientY);
    const marquee = document.getElementById('marquee-selection');
    if (!marquee) return;

    // 计算矩形位置和尺寸
    const left = Math.min(state.marqueeStartPos.x, canvasPos.x);
    const top = Math.min(state.marqueeStartPos.y, canvasPos.y);
    const width = Math.abs(canvasPos.x - state.marqueeStartPos.x);
    const height = Math.abs(canvasPos.y - state.marqueeStartPos.y);

    // 更新框选矩形
    marquee.style.left = left + 'px';
    marquee.style.top = top + 'px';
    marquee.style.width = width + 'px';
    marquee.style.height = height + 'px';

    // 实时高亮框内的节点
    highlightNodesInMarquee(left, top, width, height);
}

// 结束框选 — 选中节点后计算紧凑包围盒
function endMarqueeSelection(e) {
    if (!state.isMarqueeSelecting) return;

    const canvasPos = screenToCanvas(e.clientX, e.clientY);
    const marquee = document.getElementById('marquee-selection');

    if (marquee && state.marqueeStartPos) {
        const left = Math.min(state.marqueeStartPos.x, canvasPos.x);
        const top = Math.min(state.marqueeStartPos.y, canvasPos.y);
        const width = Math.abs(canvasPos.x - state.marqueeStartPos.x);
        const height = Math.abs(canvasPos.y - state.marqueeStartPos.y);

        if (width < 5 && height < 5) {
            // 清理所有临时高亮（框选太小但 highlightNodesInMarquee 可能已添加 marquee-hover）
            document.querySelectorAll('.card.marquee-hover').forEach(el => {
                el.classList.remove('marquee-hover');
            });
            clearSelection();
            marquee.remove();
            state._marqueeRect = null;
        } else {
            selectNodesInMarquee(left, top, width, height, e.shiftKey || e.ctrlKey || e.metaKey);

            const selectedIds = [...state.selectedNodes];
            if (selectedIds.length > 0) {
                // 计算选中节点的紧凑包围盒
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                selectedIds.forEach(id => {
                    const node = state.nodes.find(n => n.id === id);
                    if (node) {
                        minX = Math.min(minX, node.x);
                        minY = Math.min(minY, node.y);
                        maxX = Math.max(maxX, node.x + node.width);
                        maxY = Math.max(maxY, node.y + node.height);
                    }
                });
                // 包含选中节点之间连线的端点
                const selectedSet = new Set(selectedIds);
                state.edges.forEach(edge => {
                    // 只纳入两端都在选中集合内的连线
                    if (!selectedSet.has(edge.fromNode) || !selectedSet.has(edge.toNode)) return;
                    const fn = state.nodes.find(n => n.id === edge.fromNode);
                    const tn = state.nodes.find(n => n.id === edge.toNode);
                    if (fn && tn) {
                        const start = getAnchorPosition(fn, edge.fromSide);
                        const end = getAnchorPosition(tn, edge.toSide);
                        minX = Math.min(minX, start.x, end.x);
                        minY = Math.min(minY, start.y, end.y);
                        maxX = Math.max(maxX, start.x, end.x);
                        maxY = Math.max(maxY, start.y, end.y);
                    }
                });
                const pad = 8;
                const tightLeft = minX - pad;
                const tightTop = minY - pad;
                const tightWidth = maxX - minX + pad * 2;
                const tightHeight = maxY - minY + pad * 2;

                marquee.style.left = tightLeft + 'px';
                marquee.style.top = tightTop + 'px';
                marquee.style.width = tightWidth + 'px';
                marquee.style.height = tightHeight + 'px';
                marquee.classList.add('persistent');
                state._marqueeRect = { left: tightLeft, top: tightTop, width: tightWidth, height: tightHeight };
                // 标记框选刚完成，跳过本次 click 清除
                state._marqueeJustCreated = true;
            } else {
                marquee.remove();
                state._marqueeRect = null;
            }
        }
    }

    state.isMarqueeSelecting = false;
    state.marqueeStartPos = null;
}

// 清除框选框和所有高亮
function clearMarquee() {
    const marquee = document.getElementById('marquee-selection');
    if (marquee) marquee.remove();
    state._marqueeRect = null;
    // 清除所有实时高亮
    document.querySelectorAll('.card.marquee-hover').forEach(el => {
        el.classList.remove('marquee-hover');
    });
    clearSelection();
}

// 高亮框内的节点（实时预览）
function highlightNodesInMarquee(left, top, width, height) {
    // 移除所有临时高亮
    document.querySelectorAll('.card.marquee-hover').forEach(el => {
        el.classList.remove('marquee-hover');
    });

    // 检查每个节点是否在框内
    state.nodes.forEach(node => {
        if (isNodeInRect(node, left, top, width, height)) {
            const card = document.querySelector(`[data-node-id="${node.id}"]`);
            if (card) {
                card.classList.add('marquee-hover');
            }
        }
    });
}

// 选择框内的节点
function selectNodesInMarquee(left, top, width, height, addToSelection) {
    if (!addToSelection) {
        clearSelection();
    }

    state.nodes.forEach(node => {
        if (isNodeInRect(node, left, top, width, height)) {
            selectNode(node.id, true);
        }
    });

    // 也选择框内的边
    state.edges.forEach(edge => {
        if (isEdgeInRect(edge, left, top, width, height)) {
            selectEdge(edge.id, true);
        }
    });
}

// 检查节点是否在矩形内
function isNodeInRect(node, left, top, width, height) {
    const nodeRight = node.x + node.width;
    const nodeBottom = node.y + node.height;
    const rectRight = left + width;
    const rectBottom = top + height;

    // 节点与矩形有重叠
    return !(nodeRight < left || node.x > rectRight ||
             nodeBottom < top || node.y > rectBottom);
}

// 检查边是否在矩形内（简化版：检查边的两个端点）
function isEdgeInRect(edge, left, top, width, height) {
    const fromNode = state.nodes.find(n => n.id === edge.fromNode);
    const toNode = state.nodes.find(n => n.id === edge.toNode);

    if (!fromNode || !toNode) return false;

    const fromPos = getAnchorPosition(fromNode, edge.fromSide);
    const toPos = getAnchorPosition(toNode, edge.toSide);

    // 边的任一端点在矩形内
    return (isPointInRect(fromPos, left, top, width, height) ||
            isPointInRect(toPos, left, top, width, height));
}

// 检查点是否在矩形内
function isPointInRect(point, left, top, width, height) {
    return point.x >= left && point.x <= left + width &&
           point.y >= top && point.y <= top + height;
}

// 创建工具栏拖拽预览图（缩小版卡片/组，跟随鼠标）
function createToolbarDragImage(action) {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;top:-1000px;left:-1000px;pointer-events:none;z-index:99999;' +
        'box-shadow:0 4px 16px rgba(0,0,0,0.25);opacity:0.85;';
    if (action === 'add-group') {
        el.style.width = '160px';
        el.style.height = '64px';
        el.style.background = 'rgba(77,171,247,0.1)';
        el.style.border = '2px dashed #4dabf7';
        el.style.borderRadius = '12px';
    } else {
        el.style.width = '160px';
        el.style.height = '40px';
        el.style.background = '#ffffff';
        el.style.border = '1px solid #d0d0d0';
        el.style.borderRadius = '12px';
        el.style.boxShadow = '0 5px 15px rgba(0,0,0,0.2)';
    }
    return el;
}

// 处理工具栏操作
function handleToolbarAction(action, e) {
    if (!isEditingAllowed()) return;
    switch (action) {
        case 'add-card':
            createNode('text', { text: '' });
            break;
        case 'add-group':
            createGroupCard();
            break;
    }
}

// 处理从工具栏拖放到画布上
function handleToolbarDrop(action, canvasX, canvasY) {
    if (state.isReadOnly) return;
    switch (action) {
        case 'add-card':
            createNode('text', {
                text: '',
                x: canvasX - CONFIG.DEFAULT_NODE_WIDTH / 2,
                y: canvasY - CONFIG.DEFAULT_NODE_HEIGHT / 2
            });
            showMessage('已添加文本卡片');
            break;
        case 'add-group':
            createNode('group', {
                text: '组',
                x: canvasX - 250,
                y: canvasY - 200,
                width: 500,
                height: 400,
                color: 'blue',
                border: 'dashed'
            });
            showMessage('已添加组');
            break;
        default:
            break;
    }
}

// 处理键盘快捷键
function handleKeyboard(e) {
    // 编辑模式下不处理快捷键（除了 Escape）
    if (state.editingNode && e.key !== 'Escape') {
        return;
    }

    // 焦点在输入框/文本域时不处理快捷键（让浏览器正常处理输入）
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) {
        return;
    }

    // 删除选中项（只读/预览模式禁止）
    if ((e.key === 'Delete' || e.key === 'Backspace') && isEditingAllowed()) {
        e.preventDefault();
        deleteSelectedItems();
    }

    // 全选（Ctrl+A / Cmd+A）
    if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        state.nodes.forEach(node => selectNode(node.id, true));
        state.edges.forEach(edge => selectEdge(edge.id, true));
    }

    // 取消选择
    if (e.key === 'Escape') {
        clearSelection();
    }

    // 复制（Ctrl+C / Cmd+C）
    if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        copySelectedItems();
    }

    // 粘贴（Ctrl+V / Cmd+V，只读/预览模式禁止）
    if ((e.ctrlKey || e.metaKey) && e.key === 'v' && isEditingAllowed()) {
        e.preventDefault();
        if (!pasteItems()) {
            pasteExternalText();
        }
    }

    // 撤销（Ctrl+Z / Cmd+Z）
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
    }

    // 重做（Ctrl+Y / Cmd+Y 或 Ctrl+Shift+Z / Cmd+Shift+Z）
    // 注：Shift 会使 e.key 变为大写 'Z'，需同时匹配大小写
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y' || ((e.key === 'z' || e.key === 'Z') && e.shiftKey))) {
        e.preventDefault();
        redo();
    }

    // 复制选中项（Ctrl+D / Cmd+D，只读/预览模式禁止）
    if ((e.ctrlKey || e.metaKey) && e.key === 'd' && isEditingAllowed()) {
        e.preventDefault();
        duplicateSelectedItems();
    }

    // 方向键移动选中节点（只读/预览模式禁止）
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && isEditingAllowed()) {
        e.preventDefault();
        const step = e.shiftKey ? 20 : 5;
        let dx = 0, dy = 0;

        switch (e.key) {
            case 'ArrowUp': dy = -step; break;
            case 'ArrowDown': dy = step; break;
            case 'ArrowLeft': dx = -step; break;
            case 'ArrowRight': dx = step; break;
        }

        moveSelectedNodes(dx, dy);
    }

    // 搜索（Ctrl+F / Cmd+F）
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        showSearchDialog();
    }

    // 手动保存（Ctrl+S / Cmd+S）
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        forceSave();
    }

    // 导出图片（Ctrl+E / Cmd+E）
    if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        exportAsImage();
    }
}

// 复制选中的项目
function copySelectedItems() {
    if (state.selectedNodes.size === 0) return;

    // 收集选中的节点数据
    const nodesToCopy = [];
    state.selectedNodes.forEach(id => {
        const node = state.nodes.find(n => n.id === id);
        if (node) {
            nodesToCopy.push({ ...node });
        }
    });

    // 收集选中的边（只复制两端都在选中节点中的边）
    const edgesToCopy = [];
    state.selectedEdges.forEach(id => {
        const edge = state.edges.find(e => e.id === id);
        if (edge && state.selectedNodes.has(edge.fromNode) && state.selectedNodes.has(edge.toNode)) {
            edgesToCopy.push({ ...edge });
        }
    });

    // 存储到剪贴板状态
    state.clipboard = {
        nodes: nodesToCopy,
        edges: edgesToCopy
    };

    showMessage(`已复制 ${nodesToCopy.length} 个节点`);
}

// 粘贴项目（返回 false 表示内部剪贴板为空）
function pasteItems() {
    if (!state.clipboard || !state.clipboard.nodes || state.clipboard.nodes.length === 0) {
        return false;
    }

    beginBatchHistory(); // 批处理：一次粘贴 = 一条历史

    // 生成ID映射（旧ID -> 新ID）
    const idMap = new Map();

    // 创建新节点
    const offset = 30; // 粘贴时偏移一点，避免完全重叠
    state.clipboard.nodes.forEach(node => {
        const newId = 'node_' + generateId();
        idMap.set(node.id, newId);

        const newNode = {
            ...node,
            id: newId,
            x: node.x + offset,
            y: node.y + offset,
            edges: [] // 清空边引用，后面会重新建立
        };

        state.nodes.push(newNode);
        renderNode(newNode);
    });

    // 创建新边
    state.clipboard.edges.forEach(edge => {
        const newFromId = idMap.get(edge.fromNode);
        const newToId = idMap.get(edge.toNode);

        if (newFromId && newToId) {
            const newEdge = {
                ...edge,
                id: 'edge_' + generateId(),
                fromNode: newFromId,
                toNode: newToId
            };

            state.edges.push(newEdge);
            renderEdge(newEdge);

            // 更新节点的 edges 列表
            const fromNode = state.nodes.find(n => n.id === newFromId);
            if (fromNode) {
                fromNode.edges.push({ edgeId: newEdge.id, targetId: newToId });
            }
        }
    });

    // 选中新粘贴的节点
    clearSelection();
    idMap.forEach(newId => {
        selectNode(newId, true);
    });

    endBatchHistory();
    autoSave();
    return true;
}

// 粘贴外部文本为卡片
async function pasteExternalText() {
    try {
        const text = await navigator.clipboard.readText();
        if (!text || !text.trim()) return;

        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length === 0) return;

        beginBatchHistory();

        // 计算粘贴位置（画布中心偏右下）
        const container = document.getElementById('canvas-container');
        const rect = container.getBoundingClientRect();
        const centerCanvas = screenToCanvas(
            rect.left + rect.width / 2,
            rect.top + rect.height / 2
        );

        let lastNode = null;
        const offsetX = 20, offsetY = 20;

        lines.forEach((line, i) => {
            // 第一行文本作为标题，其余作为内容
            const nodeText = line.trim().substring(0, 500);
            const node = createNode('text', {
                text: nodeText,
                x: centerCanvas.x + (i > 0 ? offsetX * (i % 5) : 0),
                y: centerCanvas.y + i * (CONFIG.DEFAULT_NODE_HEIGHT + 10),
                autoEdit: false // 粘贴的不自动进入编辑
            });

            if (lastNode && i > 0) {
                const sides = calculateConnectionSides(lastNode, node);
                createEdge(lastNode.id, node.id, sides.fromSide, sides.toSide);
            }
            lastNode = node;
        });

        endBatchHistory();
        autoSave();
    } catch (e) {
        resetBatchHistory(); // 异常时重置
        // clipboard readText 可能因权限被拒，静默失败
    }
}

// 复制选中项（Ctrl+D 复制并偏移）
function duplicateSelectedItems() {
    if (state.selectedNodes.size === 0) return;

    beginBatchHistory();

    // 临时存储到剪贴板
    const nodesToCopy = [];
    state.selectedNodes.forEach(id => {
        const node = state.nodes.find(n => n.id === id);
        if (node) {
            nodesToCopy.push({ ...node });
        }
    });

    const edgesToCopy = [];
    state.selectedEdges.forEach(id => {
        const edge = state.edges.find(e => e.id === id);
        if (edge && state.selectedNodes.has(edge.fromNode) && state.selectedNodes.has(edge.toNode)) {
            edgesToCopy.push({ ...edge });
        }
    });

    const tempClipboard = { nodes: nodesToCopy, edges: edgesToCopy };

    // 生成ID映射
    const idMap = new Map();
    const offset = 30;

    // 创建新节点
    tempClipboard.nodes.forEach(node => {
        const newId = 'node_' + generateId();
        idMap.set(node.id, newId);

        const newNode = {
            ...node,
            id: newId,
            x: node.x + offset,
            y: node.y + offset,
            edges: []
        };

        state.nodes.push(newNode);
        renderNode(newNode);
    });

    // 创建新边
    tempClipboard.edges.forEach(edge => {
        const newFromId = idMap.get(edge.fromNode);
        const newToId = idMap.get(edge.toNode);

        if (newFromId && newToId) {
            const newEdge = {
                ...edge,
                id: 'edge_' + generateId(),
                fromNode: newFromId,
                toNode: newToId
            };

            state.edges.push(newEdge);
            renderEdge(newEdge);

            const fromNode = state.nodes.find(n => n.id === newFromId);
            if (fromNode) {
                fromNode.edges.push({ edgeId: newEdge.id, targetId: newToId });
            }
        }
    });

    // 选中新节点
    clearSelection();
    idMap.forEach(newId => {
        selectNode(newId, true);
    });

    endBatchHistory();
    autoSave();
    showMessage(`已复制 ${idMap.size} 个节点`);
}

// 保存历史状态
let _batchHistory = false;
function saveHistory() {
    if (_batchHistory) return;

    // 清除当前位置之后的"重做"历史
    if (state.historyIndex < state.history.length - 1) {
        state.history = state.history.slice(0, state.historyIndex + 1);
    }

    const snapshot = {
        nodes: JSON.parse(JSON.stringify(state.nodes)),
        edges: JSON.parse(JSON.stringify(state.edges))
    };

    state.history.push(snapshot);

    if (state.history.length > state.maxHistorySize) {
        state.history.shift();
    }
    state.historyIndex = state.history.length - 1;
}
function beginBatchHistory() { _batchHistory = true; }
function endBatchHistory() {
    _batchHistory = false;
    saveHistory(); // 批量操作结束后统一保存一次快照
}

// 在 endEdgeDrag 的 cleanup 中兜底重置，防止 createNode/createEdge 抛异常导致 _batchHistory 卡住
function resetBatchHistory() { _batchHistory = false; }

// 撤销操作
function undo() {
    if (state.historyIndex <= 0) {
        showMessage('已经是最早状态');
        return;
    }

    state.historyIndex--;
    const snapshot = state.history[state.historyIndex];

    // 恢复状态
    state.nodes = JSON.parse(JSON.stringify(snapshot.nodes));
    state.edges = JSON.parse(JSON.stringify(snapshot.edges));

    // 重新渲染
    rerenderAll();

    autoSave();
    showMessage('已撤销');
}

// 重做操作
function redo() {
    if (state.historyIndex >= state.history.length - 1) {
        showMessage('已经是最新状态');
        return;
    }

    state.historyIndex++;
    const snapshot = state.history[state.historyIndex];

    // 恢复状态
    state.nodes = JSON.parse(JSON.stringify(snapshot.nodes));
    state.edges = JSON.parse(JSON.stringify(snapshot.edges));

    // 重新渲染
    rerenderAll();

    autoSave();
    showMessage('已重做');
}

// 重新渲染所有内容
function rerenderAll() {
    // 清空当前渲染
    const nodesLayer = document.getElementById('nodes-layer');
    const edgesLayer = document.getElementById('edges-layer');

    // 保留 defs（箭头标记）
    const defs = edgesLayer.querySelector('defs');
    edgesLayer.innerHTML = '';
    if (defs) {
        edgesLayer.appendChild(defs);
    }

    nodesLayer.innerHTML = '';

    // 重新渲染所有节点
    state.nodes.forEach(node => renderNode(node));

    // 重新渲染所有边
    state.edges.forEach(edge => renderEdge(edge));

    // 清除选择
    clearSelection();
}

// 移动选中的节点
function moveSelectedNodes(dx, dy) {
    saveHistory(); // 一次按键 = 一条历史记录
    state.selectedNodes.forEach(id => {
        const node = state.nodes.find(n => n.id === id);
        if (node) {
            // 不触发 updateNode 内置的 saveHistory（我们已经在外部统一保存）
            const oldX = node.x, oldY = node.y;
            node.x = oldX + dx;
            node.y = oldY + dy;
            const card = document.querySelector(`[data-node-id="${id}"]`);
            if (card) {
                card.style.left = node.x + 'px';
                card.style.top = node.y + 'px';
            }
            updateEdgesForNode(id);
        }
    });
    autoSave();
}

// ============================================
// 7.5 搜索功能
// ============================================

let searchMatches = [];
let currentMatchIndex = -1;

// 显示搜索对话框
function showSearchDialog() {
    const modal = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');

    content.innerHTML = `
        <div class="modal-title">搜索节点</div>
        <div class="modal-body">
            <input type="text" id="search-input" placeholder="输入搜索内容..."
                   style="width: 100%; padding: 8px 12px; border: 1px solid var(--color-border-light);
                          border-radius: 6px; margin-bottom: 12px; font-size: 14px;">
            <div id="search-results" style="max-height: 300px; overflow-y: auto; font-size: 13px;">
                <div style="color: var(--color-text-secondary);">输入关键词搜索节点文本</div>
            </div>
            <div id="search-nav" style="display: none; margin-top: 12px; text-align: center;">
                <button class="modal-btn modal-btn-secondary" onclick="navigateSearch(-1)" style="margin-right: 8px;">上一个</button>
                <span id="search-position" style="margin: 0 12px; color: var(--color-text-secondary);">0/0</span>
                <button class="modal-btn modal-btn-secondary" onclick="navigateSearch(1)" style="margin-left: 8px;">下一个</button>
            </div>
        </div>
        <div class="modal-footer">
            <button class="modal-btn modal-btn-secondary" onclick="closeSearchDialog()">关闭</button>
        </div>
    `;

    modal.style.display = 'flex';

    // 自动聚焦
    setTimeout(() => {
        const input = document.getElementById('search-input');
        if (input) {
            input.focus();
            input.addEventListener('input', (e) => {
                performSearch(e.target.value);
            });
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    navigateSearch(e.shiftKey ? -1 : 1);
                }
                if (e.key === 'Escape') {
                    closeSearchDialog();
                }
            });
        }
    }, 100);
}

// 执行搜索
function performSearch(query) {
    searchMatches = [];
    currentMatchIndex = -1;

    // 清除之前的高亮
    document.querySelectorAll('.card.search-match').forEach(el => {
        el.classList.remove('search-match');
    });

    if (!query || query.trim() === '') {
        const resultsDiv = document.getElementById('search-results');
        if (resultsDiv) {
            resultsDiv.innerHTML = '<div style="color: var(--color-text-secondary);">输入关键词搜索节点文本</div>';
        }
        const navDiv = document.getElementById('search-nav');
        if (navDiv) {
            navDiv.style.display = 'none';
        }
        return;
    }

    const lowerQuery = query.toLowerCase();

    // 搜索节点
    state.nodes.forEach(node => {
        if (node.type === 'text' && node.text && node.text.toLowerCase().includes(lowerQuery)) {
            searchMatches.push({
                type: 'node',
                id: node.id,
                text: node.text,
                title: node.text.substring(0, 50) + (node.text.length > 50 ? '...' : '')
            });
        }
    });

    // 更新结果显示
    const resultsDiv = document.getElementById('search-results');
    if (resultsDiv) {
        if (searchMatches.length === 0) {
            resultsDiv.innerHTML = '<div style="color: var(--color-text-secondary);">未找到匹配项</div>';
        } else {
            resultsDiv.innerHTML = searchMatches.map((match, index) => `
                <div class="search-result-item" data-index="${index}"
                     style="padding: 8px; margin: 4px 0; background: var(--color-bg-secondary);
                            border-radius: 4px; cursor: pointer; transition: background 0.2s;"
                     onclick="jumpToSearchResult(${index})">
                    <div style="font-weight: 500;">${match.title}</div>
                    <div style="font-size: 11px; color: var(--color-text-secondary); margin-top: 4px;">
                        节点ID: ${match.id}
                    </div>
                </div>
            `).join('');
        }
    }

    // 显示导航
    const navDiv = document.getElementById('search-nav');
    if (navDiv) {
        navDiv.style.display = searchMatches.length > 0 ? 'block' : 'none';
    }

    // 高亮所有匹配项
    searchMatches.forEach(match => {
        const card = document.querySelector(`[data-node-id="${match.id}"]`);
        if (card) {
            card.classList.add('search-match');
        }
    });

    // 自动跳转到第一个匹配项
    if (searchMatches.length > 0) {
        navigateSearch(1);
    }

    updateSearchPosition();
}

// 导航搜索结果
function navigateSearch(direction) {
    if (searchMatches.length === 0) return;

    // 移除当前高亮
    if (currentMatchIndex >= 0) {
        const prevMatch = searchMatches[currentMatchIndex];
        const prevCard = document.querySelector(`[data-node-id="${prevMatch.id}"]`);
        if (prevCard) {
            prevCard.classList.remove('search-current');
        }
    }

    // 计算新索引
    currentMatchIndex += direction;
    if (currentMatchIndex >= searchMatches.length) {
        currentMatchIndex = 0;
    } else if (currentMatchIndex < 0) {
        currentMatchIndex = searchMatches.length - 1;
    }

    // 高亮当前匹配项
    const currentMatch = searchMatches[currentMatchIndex];
    const currentCard = document.querySelector(`[data-node-id="${currentMatch.id}"]`);
    if (currentCard) {
        currentCard.classList.add('search-current');
        // 聚焦到该节点
        focusNode(currentMatch.id);
    }

    updateSearchPosition();
}

// 跳转到指定搜索结果
function jumpToSearchResult(index) {
    if (index < 0 || index >= searchMatches.length) return;

    // 移除当前高亮
    if (currentMatchIndex >= 0) {
        const prevMatch = searchMatches[currentMatchIndex];
        const prevCard = document.querySelector(`[data-node-id="${prevMatch.id}"]`);
        if (prevCard) {
            prevCard.classList.remove('search-current');
        }
    }

    currentMatchIndex = index;

    // 高亮当前匹配项
    const currentMatch = searchMatches[currentMatchIndex];
    const currentCard = document.querySelector(`[data-node-id="${currentMatch.id}"]`);
    if (currentCard) {
        currentCard.classList.add('search-current');
        focusNode(currentMatch.id);
    }

    updateSearchPosition();
}

// 更新搜索位置显示
function updateSearchPosition() {
    const positionSpan = document.getElementById('search-position');
    if (positionSpan && searchMatches.length > 0) {
        positionSpan.textContent = `${currentMatchIndex + 1}/${searchMatches.length}`;
    }
}

// 关闭搜索对话框
function closeSearchDialog() {
    hideModal();

    // 清除高亮
    document.querySelectorAll('.card.search-match').forEach(el => {
        el.classList.remove('search-match');
    });
    document.querySelectorAll('.card.search-current').forEach(el => {
        el.classList.remove('search-current');
    });

    searchMatches = [];
    currentMatchIndex = -1;
}

// 使搜索结果可见（导出到全局）
window.navigateSearch = navigateSearch;
window.jumpToSearchResult = jumpToSearchResult;
window.closeSearchDialog = closeSearchDialog;


// 重命名组卡片
function renameGroup(nodeId, headerEl) {
    const node = state.nodes.find(n => n.id === nodeId);
    if (!node) return;

    const originalText = headerEl.textContent;

    // 进入编辑模式
    headerEl.contentEditable = 'true';
    headerEl.focus();

    // 选中全部文本
    const range = document.createRange();
    range.selectNodeContents(headerEl);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    const save = () => {
        headerEl.contentEditable = 'false';
        const newName = headerEl.textContent.trim() || originalText;
        node.text = newName;
        headerEl.textContent = newName;
        autoSave();
        headerEl.removeEventListener('blur', save);
        headerEl.removeEventListener('keydown', onKey);
    };

    const onKey = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); headerEl.blur(); }
        if (e.key === 'Escape') { headerEl.textContent = originalText; headerEl.blur(); }
    };

    headerEl.addEventListener('blur', save);
    headerEl.addEventListener('keydown', onKey);
}

// 创建组卡片
function createGroupCard() {
    const node = createNode('group', {
        text: '组',
        width: 500,
        height: 400,
        color: 'blue',
        border: 'dashed'
    });

    showMessage('组卡片已添加');
}

// 隐藏模态框
window.hideModal = function() {
    const modal = document.getElementById('modal-overlay');
    modal.style.display = 'none';
};

// 显示消息提示
function showMessage(text, duration = 2000) {
    // 创建消息元素
    const msg = document.createElement('div');
    msg.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--color-text-primary);
        color: var(--color-bg-primary);
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 14px;
        z-index: 10005;
        box-shadow: 0 4px 12px var(--color-shadow-heavy);
        animation: slideDown 0.3s ease;
    `;
    msg.textContent = text;

    document.body.appendChild(msg);

    setTimeout(() => {
        msg.style.animation = 'slideUp 0.3s ease';
        setTimeout(() => msg.remove(), 300);
    }, duration);
}

// ============================================
// 9. 触摸设备支持
// ============================================

function bindTouchEvents(container) {
    let touchStartPos = null;
    let initialDistance = null;
    let initialScale = 1;

    // 触摸开始
    container.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            // 单指触摸 - 平移
            const touch = e.touches[0];
            touchStartPos = { x: touch.pageX, y: touch.pageY };
            state.isPanning = true;
        } else if (e.touches.length === 2) {
            // 双指触摸 - 缩放
            e.preventDefault();
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            initialDistance = Math.hypot(
                touch2.pageX - touch1.pageX,
                touch2.pageY - touch1.pageY
            );
            initialScale = state.viewport.zoom;
        }
    }, { passive: false });

    // 触摸移动
    container.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1 && state.isPanning && touchStartPos) {
            // 单指平移
            const touch = e.touches[0];
            const dx = touch.pageX - touchStartPos.x;
            const dy = touch.pageY - touchStartPos.y;
            pan(dx, dy);
            touchStartPos = { x: touch.pageX, y: touch.pageY };
            e.preventDefault();
        } else if (e.touches.length === 2 && initialDistance) {
            // 双指缩放
            e.preventDefault();
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const currentDistance = Math.hypot(
                touch2.pageX - touch1.pageX,
                touch2.pageY - touch1.pageY
            );

            const scaleChange = currentDistance / initialDistance;
            const newScale = initialScale * scaleChange;
            const delta = newScale - state.viewport.zoom;

            // 以双指中心点为缩放中心
            const centerX = (touch1.pageX + touch2.pageX) / 2;
            const centerY = (touch1.pageY + touch2.pageY) / 2;

            zoom(delta, centerX, centerY);
        }
    }, { passive: false });

    // 触摸结束
    container.addEventListener('touchend', (e) => {
        if (e.touches.length === 0) {
            state.isPanning = false;
            touchStartPos = null;
            initialDistance = null;
        }
    });
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
