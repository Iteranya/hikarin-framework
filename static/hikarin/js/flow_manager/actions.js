import { getFiles, renderSceneList, renderDiagram } from './renderer.js';
import { ensureAllLabels, saveFlowFile, loadFlowFile } from './file_ops.js';

import { openEditor, closeEditor, openFlowTab } from './editor_panel.js';

export function ensure(flowData, sceneId) {
  if (!flowData.scenes[sceneId]) {
    flowData.scenes[sceneId] = {
      exit: { type: 'finish', condition: null, branches: [] },
    };
  }
}

export function addScene(flowEditor) {
  const modal = document.getElementById('modal-new-script');
  if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
  const inp = document.getElementById('inp-new-script-name');
  if (inp) inp.focus();
}

export async function setStart(flowEditor) {
  const files = getFiles(flowEditor.fm);
  const id = flowEditor.activeSceneId || files[0]?.sceneId;
  if (!id) { alert('No .py files. Create one first.'); return; }
  flowEditor.flowData.startScene = id;
  ensure(flowEditor.flowData, id);
  await saveFlowFile(flowEditor.fm, flowEditor.flowData);
  renderAll(flowEditor);
}

export async function unsetStart(flowEditor) {
  flowEditor.flowData.startScene = null;
  await saveFlowFile(flowEditor.fm, flowEditor.flowData);
  renderAll(flowEditor);
}

export async function setExitType(flowEditor, sceneId, type) {
  ensure(flowEditor.flowData, sceneId);
  const s = flowEditor.flowData.scenes[sceneId];
  s.exit.type = type;
  const defaults = {
    choice: [{ label: '', target: '' }, { label: '', target: '' }],
    cond:   [{ label: 'true', target: '' }, { label: 'false', target: '' }],
    jump:   [{ label: 'next', target: '' }],
    random: [{ label: '', target: '' }, { label: '', target: '' }],
    finish: [],
  };
  if (!defaults[type] || !s.exit.branches.length) {
    s.exit.branches = defaults[type] || [];
  }
  await saveFlowFile(flowEditor.fm, flowEditor.flowData);
  renderAll(flowEditor);
  openEditor(flowEditor, sceneId);
}

export async function addBranch(flowEditor, sceneId) {
  ensure(flowEditor.flowData, sceneId);
  flowEditor.flowData.scenes[sceneId].exit.branches.push({ label: '', target: '' });
  await saveFlowFile(flowEditor.fm, flowEditor.flowData);
  renderAll(flowEditor);
  openEditor(flowEditor, sceneId);
}

export async function removeBranch(flowEditor, sceneId, idx) {
  ensure(flowEditor.flowData, sceneId);
  flowEditor.flowData.scenes[sceneId].exit.branches.splice(idx, 1);
  await saveFlowFile(flowEditor.fm, flowEditor.flowData);
  renderAll(flowEditor);
  openEditor(flowEditor, sceneId);
}

export async function updateBranch(flowEditor, sceneId, idx, field, value) {
  ensure(flowEditor.flowData, sceneId);
  const b = flowEditor.flowData.scenes[sceneId].exit.branches[idx];
  if (b) b[field] = value;
  await saveFlowFile(flowEditor.fm, flowEditor.flowData);
  renderDiagram(flowEditor.fm, flowEditor.flowData);
}

export async function updateCond(flowEditor, sceneId, field, value) {
  ensure(flowEditor.flowData, sceneId);
  const s = flowEditor.flowData.scenes[sceneId];
  if (!s.exit.condition) s.exit.condition = { var: '', op: 'equal', value: '' };
  s.exit.condition[field] = value;
  await saveFlowFile(flowEditor.fm, flowEditor.flowData);
  renderDiagram(flowEditor.fm, flowEditor.flowData);
}

export function selectScene(flowEditor, sceneId) {
  flowEditor.activeSceneId = sceneId;
  ensure(flowEditor.flowData, sceneId);
  openEditor(flowEditor, sceneId);
}

export async function deleteFlowConfig(flowEditor, sceneId) {
  if (flowEditor.flowData.startScene === sceneId) flowEditor.flowData.startScene = null;
  delete flowEditor.flowData.scenes[sceneId];
  if (flowEditor.activeSceneId === sceneId) flowEditor.activeSceneId = null;
  closeEditor(flowEditor);
  await saveFlowFile(flowEditor.fm, flowEditor.flowData);
  renderAll(flowEditor);
}

export async function compile(flowEditor) {
  const slug = flowEditor.fm.projectSlug;
  const group = flowEditor.fm.groupSlug;
  await ensureAllLabels(flowEditor.fm);
  await saveFlowFile(flowEditor.fm, flowEditor.flowData);
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

async function renderAll(flowEditor) {
  renderSceneList(flowEditor.fm, flowEditor.flowData, flowEditor.activeSceneId);
  await renderDiagram(flowEditor.fm, flowEditor.flowData);
}
