/* ═══════════════════════════════════════════
   FlowEditorManager — Simple. Clean.
   Files get auto-generated __label__ companions.
   Flow (exits/branches) lives in flow.json.
   Conditionals generated at compile time.
   ═══════════════════════════════════════════ */

function esc(str) {
  if (!str) return '';
  return str.replace(/&/g, '&').replace(/"/g, '"')
            .replace(/</g, '<').replace(/>/g, '>');
}

const LABEL_PREFIX = '__label__';

export class FlowEditorManager {
  constructor(fileManager) {
    this.fm = fileManager;

    this._aceEditor = null;
    this._aceSceneId = null;
    this._aceDirty = false;

    // ─── FLOW STATE ─────────────────────
    this.flowData = {
      startScene: null,
      scenes: {},   // { sceneId: { exit: { type, condition, branches } } }
    };
    this.activeSceneId = null;

    // ─── MERMAID ────────────────────────
    if (window.mermaid) {
      window.mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        securityLevel: 'loose',
        flowchart: {
          useMaxWidth: true, htmlLabels: true,
          curve: 'basis', padding: 30,
          nodeSpacing: 60, rankSpacing: 80,
        },
        themeVariables: {
          primaryColor: '#14532d', primaryTextColor: '#bbf7d0',
          primaryBorderColor: '#22c55e', lineColor: '#4b5563',
          secondaryColor: '#1e3a5f', tertiaryColor: '#121212',
        },
      });
    }

    window.flowHandleClick = (id) => this._handleNodeClick(id);
    this._built = false;
  }

  // ─── LIFECYCLE ────────────────────────────
  mount() {
    const container = document.getElementById('flowView');
    if (!container) return;

    if (!this._built) {
      container.innerHTML = this._html();
      this._bindEvents();
      this._built = true;
    }
    container.classList.remove('hidden');
    this._init();
  }

  unmount() {
    const c = document.getElementById('flowView');
    if (c) c.classList.add('hidden');
    this._hideMenu();
    this._closeEditor();
  }

  async _init() {
    await this._loadFlowFile();
    await this._ensureAllLabels();
    this.renderAll();
  }

  // ─── FILE HELPERS ─────────────────────────
    _getFiles() {
    const raw = this.fm?.fileList || [];
    return raw
      .filter(fn => fn.endsWith('.py') && !fn.startsWith('__'))
      .map(fn => ({ filename: fn, sceneId: fn.replace(/\.py$/, '') }));
  }


  _labelFile(sceneId) {
    return `${LABEL_PREFIX}${sceneId}.py`;
  }

  _buildLabelContent(sceneId) {
    return `# Auto-generated label for: ${sceneId}.py
# Managed by Hikarin Flow Editor
from src.modules import VisualNovelModule
vn = VisualNovelModule()

def story():
    vn.label('${sceneId}')
`;
  }

  async _labelExists(sceneId) {
    const slug = this.fm.projectSlug;
    const labelFile = this._labelFile(sceneId);
    try {
      const res = await fetch(`/api/projects/${slug}/file/${labelFile}`);
      return res.ok;
    } catch {
      return false;
    }
  }

  async _createLabelFile(sceneId) {
    const slug = this.fm.projectSlug;
    const labelFile = this._labelFile(sceneId);
    const content = this._buildLabelContent(sceneId);

    // Create the file
    await fetch(`/api/projects/${slug}/file/${labelFile}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });

    // Add to manifest if not already there
    try {
      const res = await fetch(`/api/projects/${slug}/file/manifest.json`);
      if (res.ok) {
        const raw = await res.json();
        const manifest = JSON.parse(raw.content);
        const group = manifest.script_groups?.find(g => g.slug === this.fm.groupSlug);
        if (group && !group.source_files.includes(labelFile)) {
          group.source_files.push(labelFile);
          group.source_files.sort();
          await fetch(`/api/projects/${slug}/file/manifest.json`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: JSON.stringify(manifest, null, 4) }),
          });
        }
      }
    } catch (e) {
      // If manifest update fails, the file still exists. Non-fatal.
    }
  }

  async _ensureAllLabels() {
    const files = this._getFiles();
    for (const f of files) {
      const exists = await this._labelExists(f.sceneId);
      if (!exists) {
        console.log(`🔖 Creating label for: ${f.sceneId}`);
        await this._createLabelFile(f.sceneId);
      }
    }
    // Refresh file list so labels appear
    if (this.fm?.loadFileList) await this.fm.loadFileList();
  }

  // ─── DATA ─────────────────────────────────
  _ensure(sceneId) {
    if (!this.flowData.scenes[sceneId]) {
      this.flowData.scenes[sceneId] = {
        exit: { type: 'finish', condition: null, branches: [] },
      };
    }
  }

  async _loadFlowFile() {
    try {
      const slug = this.fm.projectSlug;
      const res = await fetch(`/api/projects/${slug}/file/flow.json`);
      if (res.ok) {
        const data = await res.json();
        if (data.content) {
          this.flowData = JSON.parse(data.content);
        }
      }
    } catch (e) {
      // No flow.json yet — fresh start
    }
  }

  async _saveFlowFile() {
    const slug = this.fm.projectSlug;
    const content = JSON.stringify(this.flowData, null, 2);
    await fetch(`/api/projects/${slug}/file/flow.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
  }

  // ─── ACTIONS ──────────────────────────────
  addScene() {
    const modal = document.getElementById('modal-new-script');
    if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
    const inp = document.getElementById('inp-new-script-name');
    if (inp) inp.focus();
  }

  setStart() {
    const files = this._getFiles();
    const id = this.activeSceneId || files[0]?.sceneId;
    if (!id) { alert('No .py files. Create one first.'); return; }
    this.flowData.startScene = id;
    this._ensure(id);
    this._saveFlowFile().then(() => this.renderAll());
  }

  unsetStart() {
    this.flowData.startScene = null;
    this._saveFlowFile().then(() => this.renderAll());
  }

  setExitType(sceneId, type) {
    this._ensure(sceneId);
    const s = this.flowData.scenes[sceneId];
    s.exit.type = type;
    const defaults = {
      choice: [{ label: 'opt_1', target: '' }, { label: 'opt_2', target: '' }],
      cond:   [{ label: 'true', target: '' }, { label: 'false', target: '' }],
      jump:   [{ label: 'next', target: '' }],
      random: [{ label: 'a', target: '' }, { label: 'b', target: '' }],
      finish: [],
    };
    if (!defaults[type] || !s.exit.branches.length) {
      s.exit.branches = defaults[type] || [];
    }
    this._saveFlowFile().then(() => { this.renderAll(); this._openEditor(sceneId); });
  }

  addBranch(sceneId) {
    this._ensure(sceneId);
    const b = this.flowData.scenes[sceneId].exit.branches;
    b.push({ label: '', target: '' });
    this._saveFlowFile().then(() => { this.renderAll(); this._openEditor(sceneId); });
  }

  removeBranch(sceneId, idx) {
    this._ensure(sceneId);
    this.flowData.scenes[sceneId].exit.branches.splice(idx, 1);
    this._saveFlowFile().then(() => { this.renderAll(); this._openEditor(sceneId); });
  }

  updateBranch(sceneId, idx, field, value) {
      this._ensure(sceneId);
      const b = this.flowData.scenes[sceneId].exit.branches[idx];
      if (b) b[field] = value;
      this._saveFlowFile().then(() => this._renderDiagram());  // diagram only, no need to reopen editor
  }

  updateCond(sceneId, field, value) {
      this._ensure(sceneId);
      const s = this.flowData.scenes[sceneId];
      if (!s.exit.condition) s.exit.condition = { var: '', op: 'equal', value: '' };
      s.exit.condition[field] = value;
      this._saveFlowFile().then(() => this._renderDiagram());  // diagram only
  }

  selectScene(sceneId) {
    this.activeSceneId = sceneId;
    this._ensure(sceneId);
    this._openEditor(sceneId);
  }

  async deleteFlowConfig(sceneId) {
    if (this.flowData.startScene === sceneId) this.flowData.startScene = null;
    delete this.flowData.scenes[sceneId];
    if (this.activeSceneId === sceneId) this.activeSceneId = null;
    this._closeEditor();
    await this._saveFlowFile();
    this.renderAll();
  }

  async compile() {
    const slug = this.fm.projectSlug;
    const group = this.fm.groupSlug;
    await this._ensureAllLabels();
    await this._saveFlowFile();
    try {
      const res = await fetch(`/api/projects/${slug}/compile-flow/${group}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Compile failed');
      const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${group}_fsm.json`; a.click();
      URL.revokeObjectURL(url);
      alert(`✅ Compiled! ${data.state_count} states.\n\nLogs:\n${(data.logs || []).join('\n')}`);
    } catch (e) {
      alert(`❌ Compile error:\n${e.message}`);
    }
  }

  // ─── RENDER ────────────────────────────────
  renderAll() {
    this._renderList();
    this._renderDiagram();
  }

  _renderList() {
    const container = document.getElementById('flow-scene-list');
    const countEl = document.getElementById('flow-scene-count');
    const files = this._getFiles();
    countEl.textContent = files.length;

    if (!files.length) {
      container.innerHTML = '<p class="text-xs text-gray-600 text-center mt-8">No .py files yet.</p>';
      return;
    }

    const labels = { choice: 'ch', cond: 'if', jump: '→', random: 'rand', finish: 'end' };

    container.innerHTML = files.map(f => {
      const s = this.flowData.scenes[f.sceneId];
      const etype = s?.exit?.type || 'finish';
      const active = this.activeSceneId === f.sceneId ? ' active' : '';
      const isStart = this.flowData.startScene === f.sceneId;
      const star = isStart ? ' <span class="scene-badge start">▶</span>' : '';
      const badge = labels[etype] || '?';

      return `<div class="flow-scene-item${active}" onclick="window.flowEditor.selectScene('${esc(f.sceneId)}')">
        <span class="flex items-center gap-2 truncate">
          <i class="fa-brands fa-python text-gray-600 text-xs"></i>
          <span class="truncate text-xs">${esc(f.filename)}</span>${star}
        </span>
        <span class="scene-badge ${badge}">${badge}</span>
      </div>`;
    }).join('');
  }

  async _renderDiagram() {
    const wrapper = document.getElementById('flow-diagram-wrapper');
    const syntax = this._mermaid();
    wrapper.innerHTML = `<pre id="flow-mermaid" class="mermaid">${syntax}</pre>`;
    try {
      await window.mermaid.run({ querySelector: '#flow-mermaid' });
    } catch (e) {
      wrapper.innerHTML = `<p class="text-red-400 text-sm p-4">Diagram error: ${e.message}</p>`;
    }
  }

  _mermaid() {
    const files = this._getFiles();
    const fset = new Set(files.map(f => f.sceneId));
    if (!files.length) return 'graph TD\n    EMPTY[No scripts]';

    const lines = ['graph TD'];
    const done = new Set();
    const nid = (id) => id.replace(/[^a-zA-Z0-9_]/g, '_');

    const snode = (sceneId) => {
      const id = nid(sceneId);
      if (done.has('s_' + id)) return id;
      done.add('s_' + id);
      const isStart = this.flowData.startScene === sceneId;
      const exists = fset.has(sceneId);
      const label = sceneId.replace(/_/g, ' ');

      if (!exists) {
        lines.push(`    ${id}[${label} ❌]`);
        lines.push(`    style ${id} fill:#3b1a1a,stroke:#ef4444,color:#fca5a5,stroke-dasharray:4`);
      } else if (isStart) {
        lines.push(`    ${id}{{▶ ${label}}}`);
        lines.push(`    style ${id} fill:#78350f,stroke:#f59e0b,color:#fde68a`);
      } else {
        lines.push(`    ${id}[${label}]`);
        lines.push(`    class ${id} scene-node`);
      }
      return id;
    };

    const cnode = (sceneId, exit) => {
      const id = nid(sceneId) + '_x';
      if (done.has('c_' + id)) return id;
      done.add('c_' + id);
      const lbl = { choice: '?', cond: 'if', jump: '→', random: '🎲', finish: '⏹' }[exit.type] || '?';
      lines.push(`    ${id}{${lbl}}`);
      lines.push(`    class ${id} ${exit.type === 'finish' ? 'finish-node' : 'cond-node'}`);
      return id;
    };

    const visited = new Set();
    const walk = (sceneId) => {
      if (visited.has(sceneId) || !fset.has(sceneId)) return;
      visited.add(sceneId);
      const sId = snode(sceneId);
      const exit = this.flowData.scenes[sceneId]?.exit
                || { type: 'finish', branches: [] };

      if (exit.type === 'jump') {
        const t = exit.branches[0]?.target;
        if (t && fset.has(t)) {
          lines.push(`    ${sId} -->|►| ${snode(t)}`);
          walk(t);
        } else {
          lines.push(`    ${sId} --> ${cnode(sceneId, exit)}`);
        }
        return;
      }

      if (exit.type === 'finish') {
        lines.push(`    ${sId} --> ${cnode(sceneId, exit)}`);
        return;
      }

      const xId = cnode(sceneId, exit);
      lines.push(`    ${sId} --> ${xId}`);
      (exit.branches || []).forEach(b => {
        if (b.target && fset.has(b.target)) {
          lines.push(`    ${xId} -->|${b.label || '?'}| ${snode(b.target)}`);
          walk(b.target);
        }
      });
    };

    const start = this.flowData.startScene && fset.has(this.flowData.startScene)
      ? this.flowData.startScene : files[0]?.sceneId;
    if (start) walk(start);
    files.forEach(f => { if (!visited.has(f.sceneId)) snode(f.sceneId); });

    files.forEach(f => {
      const id = nid(f.sceneId);
      if (done.has('s_' + id)) lines.push(`    click ${id} call flowHandleClick("${f.sceneId}")`);
    });

    return lines.join('\n');
  }

  // ─── CLICK / MENU ─────────────────────────
  _handleNodeClick(sceneId) { this.selectScene(sceneId); }

  _showMenu(x, y, sceneId) {
    const menu = document.getElementById('flow-context-menu');
    const exists = !!this._getFiles().find(f => f.sceneId === sceneId);
    const isStart = this.flowData.startScene === sceneId;
    const hasFlow = !!this.flowData.scenes[sceneId];

    menu.innerHTML = `
      ${exists ? `
      <div class="menu-item" onclick="window.flowEditor.selectScene('${esc(sceneId)}');">
        <i class="fa-solid fa-pen-to-square w-4"></i> Edit Flow</div>` : ''}
      ${exists && !isStart ? `
      <div class="menu-item" onclick="window.flowEditor.setStart('${esc(sceneId)}');">
        <i class="fa-solid fa-play w-4"></i> Set as Start</div>` : ''}
      ${isStart ? `
      <div class="menu-item" onclick="window.flowEditor.unsetStart();">
        <i class="fa-solid fa-stop w-4"></i> Unset Start</div>` : ''}
      ${hasFlow ? `
      <div class="menu-divider"></div>
      <div class="menu-item danger" onclick="window.flowEditor.deleteFlowConfig('${esc(sceneId)}');">
        <i class="fa-solid fa-trash w-4"></i> Remove Flow Config</div>` : ''}`;

    const rect = document.getElementById('flow-diagram-container').getBoundingClientRect();
    menu.style.left = `${x - rect.left}px`;
    menu.style.top = `${y - rect.top}px`;
    menu.classList.remove('hidden');
  }

  _hideMenu() {
    const m = document.getElementById('flow-context-menu');
    if (m) m.classList.add('hidden');
  }

  // ─── EDITOR PANEL ─────────────────────────
  _openEditor(sceneId) {
    this._ensure(sceneId);
    const s = this.flowData.scenes[sceneId];
    const panel = document.getElementById('flow-editor-panel');
    const content = document.getElementById('flow-editor-content');
    const delBtn = document.getElementById('flow-btn-delete-scene');

    panel.classList.remove('hidden'); panel.classList.add('flex');
    delBtn.classList.remove('hidden');

    const allFiles = this._getFiles().filter(f => f.sceneId !== sceneId);

    const exitTypes = [
      { v: 'choice', l: '💬 Choice' },
      { v: 'cond',   l: '🔀 Condition' },
      { v: 'jump',   l: '➡️ Jump' },
      { v: 'random', l: '🎲 Random' },
      { v: 'finish', l: '🏁 Finish' },
    ];

    let branchesHTML = '';
    if (['choice', 'cond', 'random'].includes(s.exit.type)) {
      branchesHTML = (s.exit.branches || []).map((b, i) => `
        <div class="branch-row">
          <input type="text" value="${esc(b.label)}" placeholder="Label"
            onchange="window.flowEditor.updateBranch('${esc(sceneId)}',${i},'label',this.value)">
          <select onchange="window.flowEditor.updateBranch('${esc(sceneId)}',${i},'target',this.value)">
            <option value="">— target —</option>
            ${allFiles.map(f => `<option value="${esc(f.sceneId)}" ${b.target===f.sceneId?'selected':''}>${esc(f.filename)}</option>`).join('')}
          </select>
          <button onclick="window.flowEditor.removeBranch('${esc(sceneId)}',${i})"><i class="fa-solid fa-xmark"></i></button>
        </div>`).join('');
      branchesHTML += `<button onclick="window.flowEditor.addBranch('${esc(sceneId)}')"
        class="w-full py-1 text-xs text-gray-500 hover:text-white border border-dashed border-gray-700 rounded mt-1">
        <i class="fa-solid fa-plus mr-1"></i> Add Branch</button>`;
    }

    if (s.exit.type === 'jump') {
      const b = s.exit.branches[0] || { target: '' };
      const opts = allFiles.map(f => `<option value="${esc(f.sceneId)}" ${b.target===f.sceneId?'selected':''}>${esc(f.filename)}</option>`).join('');
      branchesHTML = `<select onchange="window.flowEditor.updateBranch('${esc(sceneId)}',0,'target',this.value)" class="w-full">
        <option value="">— target —</option>${opts}</select>`;
    }

    let condHTML = '';
    if (s.exit.type === 'cond') {
      const c = s.exit.condition || { var: '', op: 'equal', value: '' };
      condHTML = `
        <div><label>Variable</label><input type="text" value="${esc(c.var)}" placeholder="e.g. aff"
          onchange="window.flowEditor.updateCond('${esc(sceneId)}','var',this.value)"></div>
        <div><label>Operator</label><select onchange="window.flowEditor.updateCond('${esc(sceneId)}','op',this.value)">
          <option value="equal" ${c.op==='equal'?'selected':''}>== equal</option>
          <option value="not_equal" ${c.op==='not_equal'?'selected':''}>!= not equal</option>
          <option value="less_than" ${c.op==='less_than'?'selected':''}>< less than</option>
          <option value="greater_than" ${c.op==='greater_than'?'selected':''}>> greater than</option>
        </select></div>
        <div><label>Value</label><input type="text" value="${esc(c.value)}" placeholder="e.g. 10"
          onchange="window.flowEditor.updateCond('${esc(sceneId)}','value',this.value)"></div>`;
    }

    content.innerHTML = `
      <div>
        <label>Script File</label>
        <div class="flex items-center gap-2"><i class="fa-brands fa-python text-gray-500"></i>
          <span class="text-sm text-white font-mono">${esc(sceneId)}.py</span></div>
        <p class="text-[10px] text-gray-600 mt-0.5">Label: <code class="text-mob-500">__label__${esc(sceneId)}.py</code> (auto-generated)</p>
      </div>
      <div><label>Exit Type</label>
        <select onchange="window.flowEditor.setExitType('${esc(sceneId)}',this.value)">
          ${exitTypes.map(t => `<option value="${t.v}" ${s.exit.type===t.v?'selected':''}>${t.l}</option>`).join('')}
        </select></div>
      ${condHTML}
      ${branchesHTML ? `<div><label>Branches</label>${branchesHTML}</div>` : ''}
      ${s.exit.type==='finish' ? '<p class="text-xs text-gray-500 italic">Terminal. No outgoing branches.</p>' : ''}`;

    this.activeSceneId = sceneId;
    this._renderList();
    this._openFlowTab();
    
  }

    _closeEditor() {
      // Save ACE if dirty
      if (this._aceDirty && this._aceEditor) {
        this._saveAceFile();
      }
      this._aceEditor = null;
      this._aceSceneId = null;
      this._aceDirty = false;

      const panel = document.getElementById('flow-editor-panel');
      if (panel) { panel.classList.add('hidden'); panel.classList.remove('flex'); }
      const delBtn = document.getElementById('flow-btn-delete-scene');
      if (delBtn) delBtn.classList.add('hidden');
      this.activeSceneId = null;
      this._renderList();
    }


        async _openCodeTab(sceneId) {
    if (!sceneId) return;

    const flowContent = document.getElementById('flow-editor-content');
    const codeContent = document.getElementById('flow-code-content');
    const titleEl = document.getElementById('flow-editor-title');
    const filenameEl = document.getElementById('flow-code-filename');
    const statusEl = document.getElementById('flow-code-status');

    flowContent.style.display = 'none';
    codeContent.style.display = 'flex';

    if (titleEl) titleEl.textContent = 'Code Editor';
    if (filenameEl) filenameEl.textContent = `${sceneId}.py`;

    document.querySelectorAll('.flow-editor-tab').forEach(t => t.classList.remove('active'));
    const codeTab = document.querySelector('.flow-editor-tab[data-tab="code"]');
    if (codeTab) codeTab.classList.add('active');

    try {
      const slug = this.fm.projectSlug;
      const res = await fetch(`/api/projects/${slug}/file/${sceneId}.py`);
      const data = res.ok ? await res.json() : null;
      this._initAce(data?.content || `# File not found: ${sceneId}.py\n`, sceneId);
      if (statusEl) statusEl.textContent = data ? 'Loaded' : 'File not found';
    } catch (e) {
      this._initAce(`# Error loading: ${e.message}\n`, sceneId);
      if (statusEl) statusEl.textContent = 'Error';
    }

    this._aceSceneId = sceneId;
  }



  async _initAce(content, sceneId) {
    console.log('🔵 _initAce called. Content starts with:', content?.slice(0, 50));

    const wrapper = document.getElementById('flow-ace-wrapper');
    console.log('🔵 wrapper found:', !!wrapper, 'dimensions:', wrapper?.offsetWidth, 'x', wrapper?.offsetHeight);

    if (!wrapper) { console.log('🔴 No wrapper, returning'); return; }

    wrapper.innerHTML = '<div id="flow-ace-editor"></div>';
    const editorEl = document.getElementById('flow-ace-editor');
    console.log('🔵 editorEl found:', !!editorEl, 'dimensions:', editorEl?.offsetWidth, 'x', editorEl?.offsetHeight);

    if (!editorEl) { console.log('🔴 No editorEl, returning'); return; }

    // Import ACE
    console.log('🔵 Importing ACE module...');
    if (!window.__aceModule) {
      try {
        window.__aceModule = await import('https://esm.sh/ace-builds@1.32.7/src-min-noconflict/ace');
        console.log('🔵 ACE module imported:', typeof window.__aceModule?.default?.edit);
        const ACE_CDN = 'https://cdn.jsdelivr.net/npm/ace-builds@1.32.7/src-min-noconflict/';
        window.__aceModule.default.config.set('basePath', ACE_CDN);
        window.__aceModule.default.config.set('modePath', ACE_CDN);
        window.__aceModule.default.config.set('themePath', ACE_CDN);
        window.__aceModule.default.config.set('workerPath', ACE_CDN);
        console.log('🔵 ACE config paths set');
      } catch (e) {
        console.error('🔴 ACE import failed:', e.message, e);
        return;
      }
    } else {
      console.log('🔵 ACE module already cached');
    }

    const ace = window.__aceModule.default;
    console.log('🔵 Creating ACE editor on element:', editorEl.offsetWidth, 'x', editorEl.offsetHeight);

    this._aceEditor = ace.edit(editorEl);
    console.log('🔵 ACE editor created:', !!this._aceEditor);

    this._aceEditor.setTheme('ace/theme/tomorrow_night_eighties');
    this._aceEditor.session.setMode('ace/mode/python');
    this._aceEditor.setValue(content, -1);
    this._aceEditor.setShowPrintMargin(false);
    this._aceEditor.setOptions({
      fontSize: '13px',
      fontFamily: "'Fira Code', monospace",
      tabSize: 4,
      useSoftTabs: true,
    });
    this._aceEditor.clearSelection();
    this._aceDirty = false;
    console.log('🔵 ACE editor initialized successfully');

    this._aceEditor.commands.addCommand({
      name: 'save',
      bindKey: { win: 'Ctrl-S', mac: 'Cmd-S' },
      exec: () => this._saveAceFile(),
    });

    this._aceEditor.session.on('change', () => {
      if (!this._aceDirty) {
        this._aceDirty = true;
        const statusEl = document.getElementById('flow-code-status');
        if (statusEl) statusEl.textContent = 'Unsaved changes';
      }
    });
  }



  async _saveAceFile() {
    if (!this._aceEditor || !this._aceSceneId) return;

    const content = this._aceEditor.getValue();
    const slug = this.fm.projectSlug;
    const filename = `${this._aceSceneId}.py`;
    const statusEl = document.getElementById('flow-code-status');

    try {
      await fetch(`/api/projects/${slug}/file/${filename}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      this._aceDirty = false;
      if (statusEl) statusEl.textContent = 'Saved ✓';
      setTimeout(() => {
        if (statusEl && !this._aceDirty) statusEl.textContent = 'Ctrl+S to save';
      }, 2000);
    } catch (e) {
      if (statusEl) statusEl.textContent = 'Save failed!';
    }
  }

    _openFlowTab() {
    const flowContent = document.getElementById('flow-editor-content');
    const codeContent = document.getElementById('flow-code-content');
    const titleEl = document.getElementById('flow-editor-title');

    flowContent.style.display = '';
    codeContent.style.display = 'none';
    if (titleEl) titleEl.textContent = 'Flow';

    document.querySelectorAll('.flow-editor-tab').forEach(t => t.classList.remove('active'));
    const flowTab = document.querySelector('.flow-editor-tab[data-tab="flow"]');
    if (flowTab) flowTab.classList.add('active');
  }



  // ─── HTML ──────────────────────────────────
      _html() {
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
          <button id="flow-btn-add"
            class="w-full py-1.5 text-xs text-mob-500 hover:text-white border border-gray-700 rounded hover:bg-gray-700 transition">
            <i class="fa-solid fa-plus mr-1"></i> New Script
          </button>
          <button id="flow-btn-start"
            class="w-full py-1.5 text-xs text-gray-500 hover:text-white border border-gray-700 rounded hover:bg-gray-700 transition">
            <i class="fa-solid fa-play mr-1"></i> Set Start
          </button>
          <button id="flow-btn-refresh"
            class="w-full py-1.5 text-xs text-gray-500 hover:text-white border border-gray-700 rounded hover:bg-gray-700 transition">
            <i class="fa-solid fa-rotate mr-1"></i> Refresh
          </button>
          <button id="flow-btn-compile"
            class="w-full py-1.5 text-xs text-blue-400 hover:text-white border border-blue-900 rounded hover:bg-blue-900/30 transition font-medium">
            <i class="fa-solid fa-bolt mr-1"></i> Compile & Download
          </button>
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

          <div id="flow-editor-content"
               style="position:absolute;top:0;left:0;right:0;bottom:0;overflow-y:auto;padding:1rem;">
            <p class="text-xs text-gray-500 text-center">Select a script to edit its flow.</p>
          </div>

          <div id="flow-code-content"
               style="position:absolute;top:0;left:0;right:0;bottom:0;display:none;flex-direction:column;">
            <div id="flow-ace-wrapper"
                 style="position:absolute;top:0;left:0;right:0;bottom:28px;"></div>
            <div style="position:absolute;bottom:0;left:0;right:0;height:28px;display:flex;align-items:center;justify-content:space-between;padding:0 12px;background:#0a0a0a;border-top:1px solid rgba(255,255,255,0.05);">
              <span id="flow-code-filename" style="font-size:10px;color:#6b7280;font-family:'Fira Code',monospace;"></span>
              <span id="flow-code-status" style="font-size:10px;color:#4b5563;">Ctrl+S to save</span>
            </div>
          </div>
        </div>

        <div class="p-3 border-t border-gray-800 flex-shrink-0">
          <button id="flow-btn-delete-scene"
            class="hidden w-full py-1.5 text-xs text-red-400 hover:text-red-300 border border-red-900 rounded hover:bg-red-900/20 transition">
            Remove Flow Config
          </button>
        </div>
      </div>`;
  }



  _bindEvents() {
    document.getElementById('flow-btn-add').onclick = () => this.addScene();
    document.getElementById('flow-btn-start').onclick = () => this.setStart();
    document.getElementById('flow-btn-refresh').onclick = () => this._init();
    document.getElementById('flow-btn-compile').onclick = () => this.compile();
    document.getElementById('flow-btn-close').onclick = () => this._closeEditor();
    document.getElementById('flow-btn-delete-scene').onclick = () => this.deleteFlowConfig(this.activeSceneId);

        // ─── RESIZE HANDLE ──────────────────────
    const panel = document.getElementById('flow-editor-panel');
    const handle = document.getElementById('flow-resize-handle');
    let resizing = false, startX, startW;

    handle.addEventListener('mousedown', (e) => {
      resizing = true;
      startX = e.clientX;
      startW = panel.offsetWidth;
      handle.classList.add('active');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!resizing) return;
      const newW = Math.max(280, Math.min(600, startW + (startX - e.clientX)));
      panel.style.width = newW + 'px';
    });

    document.addEventListener('mouseup', () => {
      if (!resizing) return;
      resizing = false;
      handle.classList.remove('active');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      // Refresh ACE if visible
      if (this._aceEditor) this._aceEditor.resize();
    });

    // ─── TAB SWITCHING ──────────────────────
    document.getElementById('flow-editor-tabs').addEventListener('click', (e) => {
      const tab = e.target.closest('.flow-editor-tab');
      if (!tab) return;
      const tabName = tab.dataset.tab;

      // Update tab active styles
      document.querySelectorAll('.flow-editor-tab').forEach(t => {
        t.style.color = '#6b7280';
        t.style.borderBottomColor = 'transparent';
      });
      tab.style.color = '#22c55e';
      tab.style.borderBottomColor = '#22c55e';

      if (tabName === 'flow') {
        this._openFlowTab();
      } else if (tabName === 'code') {
        if (this.activeSceneId) this._openCodeTab(this.activeSceneId);
      }
    });


    document.getElementById('flow-diagram-container').addEventListener('contextmenu', (e) => {
      const node = e.target.closest('.node');
      if (!node) return;
      e.preventDefault();
      const text = node.querySelector('text');
      if (!text) return;
      const label = text.textContent.trim().replace('▶ ', '').replace(' ❌', '').replace(/\s+/g, '_');
      if (label) this._showMenu(e.clientX, e.clientY, label);
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('#flow-context-menu')) this._hideMenu();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { this._hideMenu(); this._closeEditor(); }
    });
  }
}
