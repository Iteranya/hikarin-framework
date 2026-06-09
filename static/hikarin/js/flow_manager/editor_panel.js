import { esc } from './utils.js';
import { getFiles, renderSceneList } from './renderer.js';

function isMobile() {
  return window.innerWidth <= 768;
}

export function openEditor(flowEditor, sceneId) {
  const s = flowEditor.flowData.scenes[sceneId];
  const panel = document.getElementById('flow-editor-panel');
  const content = document.getElementById('flow-editor-content');
  const delBtn = document.getElementById('flow-btn-delete-scene');

  // ── MOBILE: fullscreen overlay ──
  if (isMobile()) {
    panel.style.position = 'fixed';
    panel.style.left = '0';
    panel.style.top = '0';
    panel.style.right = '0';
    panel.style.bottom = '0';
    panel.style.width = '100%';
    panel.style.maxWidth = '100%';
    panel.style.zIndex = '100';
    panel.style.background = '#121212';
    panel.style.backdropFilter = 'none';
    panel.style.borderLeft = 'none';
  } else {
    panel.style.position = 'relative';
    panel.style.left = '';
    panel.style.top = '';
    panel.style.right = '';
    panel.style.bottom = '';
    panel.style.width = '360px';
    panel.style.maxWidth = '600px';
    panel.style.zIndex = '20';
    panel.style.background = '';
    panel.style.backdropFilter = '';
    panel.style.borderLeft = '';
  }

  panel.classList.remove('hidden');
  panel.classList.add('flex');
  delBtn.classList.remove('hidden');

  const allFiles = getFiles(flowEditor.fm).filter(f => f.sceneId !== sceneId);

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
        <input type="text" value="${esc(b.label)}" placeholder="Choice text"
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

  flowEditor.activeSceneId = sceneId;
  renderSceneList(flowEditor.fm, flowEditor.flowData, flowEditor.activeSceneId);
  openFlowTab();
}

export function closeEditor(flowEditor) {
  if (flowEditor._aceDirty && flowEditor._aceEditor) {
    flowEditor._saveAceFile();
  }
  flowEditor._aceEditor = null;
  flowEditor._aceSceneId = null;
  flowEditor._aceDirty = false;

  const panel = document.getElementById('flow-editor-panel');
  if (panel) {
    panel.classList.add('hidden');
    panel.classList.remove('flex');
    // Reset mobile overrides
    panel.style.position = 'relative';
    panel.style.left = '';
    panel.style.top = '';
    panel.style.right = '';
    panel.style.bottom = '';
    panel.style.width = '360px';
    panel.style.maxWidth = '600px';
    panel.style.zIndex = '20';
    panel.style.background = '';
    panel.style.backdropFilter = '';
    panel.style.borderLeft = '';
  }
  const delBtn = document.getElementById('flow-btn-delete-scene');
  if (delBtn) delBtn.classList.add('hidden');
  flowEditor.activeSceneId = null;
}

export function openFlowTab() {
  document.getElementById('flow-editor-content').style.display = '';
  document.getElementById('flow-code-content').style.display = 'none';
  const titleEl = document.getElementById('flow-editor-title');
  if (titleEl) titleEl.textContent = 'Flow';
}
