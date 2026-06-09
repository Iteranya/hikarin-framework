import { esc, LABEL_PREFIX } from './utils.js';
import { ensure } from './actions.js';
import { loadFlowFile, ensureAllLabels } from './file_ops.js';
import { renderSceneList, renderDiagram, getFiles } from './renderer.js';
import { closeEditor, openFlowTab } from './editor_panel.js';
import { openCodeTab, saveAceFile } from './code_editor.js';
import { showMenu, hideMenu, handleNodeClick } from './menu.js';

import {
  addScene, setStart, unsetStart, setExitType,
  addBranch, removeBranch, updateBranch, updateCond,
  selectScene, deleteFlowConfig, compile,
} from './actions.js';

export class FlowEditorManager {
  constructor(fileManager) {
    this.fm = fileManager;

    this._aceEditor = null;
    this._aceSceneId = null;
    this._aceDirty = false;

    this.flowData = { startScene: null, scenes: {} };
    this.activeSceneId = null;

    if (window.mermaid) {
      window.mermaid.initialize({
        startOnLoad: false, theme: 'dark', securityLevel: 'loose',
        flowchart: { useMaxWidth: true, htmlLabels: true, curve: 'basis', padding: 30, nodeSpacing: 60, rankSpacing: 80 },
        themeVariables: { primaryColor: '#14532d', primaryTextColor: '#bbf7d0', primaryBorderColor: '#22c55e', lineColor: '#4b5563', secondaryColor: '#1e3a5f', tertiaryColor: '#121212' },
      });
    }

    window.flowHandleClick = (id) => handleNodeClick(this, id);
    this._built = false;
  }

  // ─── LIFECYCLE ────────────────────────────
  mount() {
    const container = document.getElementById('flowView');
    if (!container) return;
    if (!this._built) { container.innerHTML = buildHTML(); this._bindEvents(); this._built = true; }
    container.classList.remove('hidden');
    this._init();
  }

  unmount() {
    const c = document.getElementById('flowView');
    if (c) c.classList.add('hidden');
    hideMenu();
    closeEditor(this);
  }

  async _init() {
    this.flowData = await loadFlowFile(this.fm);
    await ensureAllLabels(this.fm);
    this.renderAll();
  }

  async renderAll() {
    renderSceneList(this.fm, this.flowData, this.activeSceneId);
    await renderDiagram(this.fm, this.flowData);
  }

  // ─── PUBLIC ACTIONS ───────────────────────
  addScene()          { addScene(this); }
  setStart()          { setStart(this); }
  unsetStart()        { unsetStart(this); }
  setExitType(id, t)  { setExitType(this, id, t); }
  addBranch(id)       { addBranch(this, id); }
  removeBranch(id, i) { removeBranch(this, id, i); }
  updateBranch(...a)  { updateBranch(this, ...a); }
  updateCond(...a)    { updateCond(this, ...a); }
  selectScene(id)     { selectScene(this, id); }
  deleteFlowConfig(id){ deleteFlowConfig(this, id); }
  compile()           { compile(this); }

  // ─── EDITOR ───────────────────────────────
  _closeEditor()      { closeEditor(this); }
  _openFlowTab()      { openFlowTab(); }

  // ─── EXPOSE FOR MODULES ───────────────────
  _saveAceFile()      { saveAceFile(this); }
  _handleNodeClick(id){ handleNodeClick(this, id); }
  _showMenu(x,y,id)   { showMenu(this, x, y, id); }
  _hideMenu()         { hideMenu(); }
  _ensureAllLabels()  { ensureAllLabels(this.fm); }
}

// ─── HTML (kept in core since it's one big template) ───
function buildHTML() {
  return `
    <div class="w-56 bg-dark-800 border-r border-gray-800 flex flex-col flex-shrink-0">
      <div class="p-3 border-b border-gray-800 flex items-center justify-between">
        <span class="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Scripts</span>
        <span id="flow-scene-count" class="text-[10px] text-gray-600 font-mono">0</span>
      </div>
      <div id="flow-scene-list" class="flex-1 overflow-y-auto p-2 space-y-1">
        <p class="text-xs text-gray-600 text-center mt-8">Loading...</p>
      </div>
      <div class="p-2 border-t border-gray-800 space-y-1">
        <button id="flow-btn-add" class="w-full py-1.5 text-xs text-mob-500 hover:text-white border border-gray-700 rounded hover:bg-gray-700 transition">
          <i class="fa-solid fa-plus mr-1"></i> New Script</button>
        <button id="flow-btn-start" class="w-full py-1.5 text-xs text-gray-500 hover:text-white border border-gray-700 rounded hover:bg-gray-700 transition">
          <i class="fa-solid fa-play mr-1"></i> Set Start</button>
        <button id="flow-btn-refresh" class="w-full py-1.5 text-xs text-gray-500 hover:text-white border border-gray-700 rounded hover:bg-gray-700 transition">
          <i class="fa-solid fa-rotate mr-1"></i> Refresh</button>
        <button id="flow-btn-compile" class="w-full py-1.5 text-xs text-blue-400 hover:text-white border border-blue-900 rounded hover:bg-blue-900/30 transition font-medium">
          <i class="fa-solid fa-bolt mr-1"></i> Compile & Download</button>
      </div>
    </div>

    <div class="flex-1 overflow-auto relative" id="flow-diagram-container">
      <div id="flow-diagram-wrapper" class="min-w-full min-h-full p-8 flex items-center justify-center">
        <pre id="flow-mermaid" class="mermaid text-sm">graph TD\n    EMPTY[Loading...]</pre>
      </div>
      <div id="flow-context-menu" class="hidden absolute z-50 bg-dark-800 border border-gray-700 rounded-lg shadow-2xl py-1 min-w-[180px]"></div>
    </div>

    <div id="flow-editor-panel" class="hidden glass-panel z-20 flex-col border-l border-gray-800" style="width:360px;min-width:280px;max-width:600px;position:relative;">
      <div class="flow-resize-handle" id="flow-resize-handle" style="position:absolute;left:0;top:0;bottom:0;width:5px;cursor:col-resize;z-index:30;"></div>

      <div style="display:flex;align-items:center;border-bottom:1px solid #374151;background:#1a1a1a;flex-shrink:0;" id="flow-editor-tabs">
        <div class="flow-editor-tab active" data-tab="flow" style="padding:0.4rem 1rem;font-size:0.7rem;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#22c55e;cursor:pointer;border-bottom:2px solid #22c55e;">Flow</div>
        <div class="flow-editor-tab" data-tab="code" style="padding:0.4rem 1rem;font-size:0.7rem;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280;cursor:pointer;border-bottom:2px solid transparent;">Code</div>
        <div style="flex:1;"></div>
        <button id="flow-btn-close" class="text-gray-500 hover:text-white text-xs px-3 flex-shrink-0"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <div style="height:24px;background:#0a0a0a;display:flex;align-items:center;padding:0 12px;border-bottom:1px solid rgba(255,255,255,0.05);flex-shrink:0;">
        <span id="flow-editor-title" style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Flow</span>
      </div>

      <div style="position:relative;flex:1;min-height:200px;overflow:hidden;">
        <div id="flow-editor-content" style="position:absolute;top:0;left:0;right:0;bottom:0;overflow-y:auto;padding:1rem;">
          <p class="text-xs text-gray-500 text-center">Select a script to edit its flow.</p>
        </div>
        <div id="flow-code-content" style="position:absolute;top:0;left:0;right:0;bottom:0;display:none;flex-direction:column;">
          <div id="flow-ace-wrapper" style="position:absolute;top:0;left:0;right:0;bottom:28px;"></div>
          <div style="position:absolute;bottom:0;left:0;right:0;height:28px;display:flex;align-items:center;justify-content:space-between;padding:0 12px;background:#0a0a0a;border-top:1px solid rgba(255,255,255,0.05);">
            <span id="flow-code-filename" style="font-size:10px;color:#6b7280;font-family:'Fira Code',monospace;"></span>
            <span id="flow-code-status" style="font-size:10px;color:#4b5563;">Ctrl+S to save</span>
          </div>
        </div>
      </div>

      <div class="p-3 border-t border-gray-800 flex-shrink-0">
        <button id="flow-btn-delete-scene" class="hidden w-full py-1.5 text-xs text-red-400 hover:text-red-300 border border-red-900 rounded hover:bg-red-900/20 transition">
          Remove Flow Config</button>
      </div>
    </div>`;
}

// ─── BIND EVENTS ────────────────────────────
FlowEditorManager.prototype._bindEvents = function() {
  document.getElementById('flow-btn-add').onclick     = () => this.addScene();
  document.getElementById('flow-btn-start').onclick   = () => this.setStart();
  document.getElementById('flow-btn-refresh').onclick = () => this._init();
  document.getElementById('flow-btn-compile').onclick = () => this.compile();
  document.getElementById('flow-btn-close').onclick   = () => this._closeEditor();
  document.getElementById('flow-btn-delete-scene').onclick = () => this.deleteFlowConfig(this.activeSceneId);

  // Resize handle
  const panel = document.getElementById('flow-editor-panel');
  const handle = document.getElementById('flow-resize-handle');
  let resizing = false, startX, startW;
  handle.addEventListener('mousedown', (e) => {
    resizing = true; startX = e.clientX; startW = panel.offsetWidth;
    handle.classList.add('active'); document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none'; e.preventDefault();
  });
  document.addEventListener('mousemove', (e) => {
    if (!resizing) return;
    panel.style.width = Math.max(280, Math.min(600, startW + (startX - e.clientX))) + 'px';
  });
  document.addEventListener('mouseup', () => {
    if (!resizing) return;
    resizing = false; handle.classList.remove('active'); document.body.style.cursor = ''; document.body.style.userSelect = '';
    if (this._aceEditor) this._aceEditor.resize();
  });

  // Tab switching
  document.getElementById('flow-editor-tabs').addEventListener('click', (e) => {
    const tab = e.target.closest('.flow-editor-tab');
    if (!tab) return;
    document.querySelectorAll('.flow-editor-tab').forEach(t => { t.style.color = '#6b7280'; t.style.borderBottomColor = 'transparent'; });
    tab.style.color = '#22c55e'; tab.style.borderBottomColor = '#22c55e';
    if (tab.dataset.tab === 'flow') { this._openFlowTab(); }
    else if (tab.dataset.tab === 'code' && this.activeSceneId) { openCodeTab(this, this.activeSceneId); }
  });

  // Context menu
  document.getElementById('flow-diagram-container').addEventListener('contextmenu', (e) => {
    const node = e.target.closest('.node');
    if (!node) return;
    e.preventDefault();
    const text = node.querySelector('text');
    if (!text) return;
    const label = text.textContent.trim().replace('▶ ', '').replace(' ❌', '').replace(/\s+/g, '_');
    if (label) this._showMenu(e.clientX, e.clientY, label);
  });

  document.addEventListener('click', (e) => { if (!e.target.closest('#flow-context-menu')) this._hideMenu(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { this._hideMenu(); this._closeEditor(); } });
      // ─── PAN & ZOOM (mouse + touch) ────────
  (() => {
    const container = document.getElementById('flow-diagram-container');
    const wrapper = document.getElementById('flow-diagram-wrapper');

    let panX = 0, panY = 0, scale = 1;
    let dragging = false, startX, startY, startPanX, startPanY;

    // For pinch zoom
    let lastPinchDist = 0, pinchScaleStart = 1, pinchPanX = 0, pinchPanY = 0, pinchMidX = 0, pinchMidY = 0;

    function applyTransform() {
      wrapper.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
    }

    function shouldIgnoreTarget(el) {
      return el.closest('.node') || el.closest('#flow-context-menu') || el.closest('#flow-editor-panel');
    }

    // ── Mouse scroll zoom ──
    container.addEventListener('wheel', (e) => {
      if (shouldIgnoreTarget(e.target)) return;
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.12 : 0.9;
      const newScale = Math.max(0.15, Math.min(6, scale * factor));
      panX = mx - (mx - panX) * (newScale / scale);
      panY = my - (my - panY) * (newScale / scale);
      scale = newScale;
      applyTransform();
    }, { passive: false });

    // ── Mouse pan ──
    container.addEventListener('mousedown', (e) => {
      if (shouldIgnoreTarget(e.target)) return;
      dragging = true;
      startX = e.clientX; startY = e.clientY;
      startPanX = panX; startPanY = panY;
      container.style.cursor = 'grabbing';
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      panX = startPanX + (e.clientX - startX);
      panY = startPanY + (e.clientY - startY);
      applyTransform();
    });

    window.addEventListener('mouseup', () => {
      if (dragging) { dragging = false; container.style.cursor = 'grab'; }
    });

    // ── Touch pan ──
    container.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1 && !shouldIgnoreTarget(e.touches[0].target)) {
        dragging = true;
        startX = e.touches[0].clientX; startY = e.touches[0].clientY;
        startPanX = panX; startPanY = panY;
      }
      // Pinch start
      if (e.touches.length === 2) {
        dragging = false;
        lastPinchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        pinchScaleStart = scale;
        pinchPanX = panX; pinchPanY = panY;
        pinchMidX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        pinchMidY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      }
    }, { passive: false });

    container.addEventListener('touchmove', (e) => {
      // Single finger pan
      if (e.touches.length === 1 && dragging) {
        e.preventDefault();
        panX = startPanX + (e.touches[0].clientX - startX);
        panY = startPanY + (e.touches[0].clientY - startY);
        applyTransform();
      }
      // Pinch zoom
      if (e.touches.length === 2) {
        e.preventDefault();
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

        const ratio = dist / lastPinchDist;
        const newScale = Math.max(0.15, Math.min(6, pinchScaleStart * ratio));

        const containerRect = container.getBoundingClientRect();
        const cx = midX - containerRect.left;
        const cy = midY - containerRect.top;

        panX = cx - (cx - pinchPanX) * (newScale / pinchScaleStart) + (midX - pinchMidX);
        panY = cy - (cy - pinchPanY) * (newScale / pinchScaleStart) + (midY - pinchMidY);
        scale = newScale;
        applyTransform();
      }
    }, { passive: false });

    container.addEventListener('touchend', () => {
      dragging = false;
      container.style.cursor = 'grab';
    });

    // ── Double-click/tap to reset ──
    container.addEventListener('dblclick', (e) => {
      if (shouldIgnoreTarget(e.target)) return;
      panX = 0; panY = 0; scale = 1;
      applyTransform();
    });

    applyTransform();
  })();


};
