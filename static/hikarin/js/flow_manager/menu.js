import { esc } from './utils.js';
import { getFiles } from './renderer.js';

export function handleNodeClick(flowEditor, sceneId) {
  flowEditor.selectScene(sceneId);
}

export function showMenu(flowEditor, x, y, sceneId) {
  const menu = document.getElementById('flow-context-menu');
  const exists = !!getFiles(flowEditor.fm).find(f => f.sceneId === sceneId);
  const isStart = flowEditor.flowData.startScene === sceneId;
  const hasFlow = !!flowEditor.flowData.scenes[sceneId];

  menu.innerHTML = `
    ${exists ? `<div class="menu-item" onclick="window.flowEditor.selectScene('${esc(sceneId)}');">
      <i class="fa-solid fa-pen-to-square w-4"></i> Edit Flow</div>` : ''}
    ${exists && !isStart ? `<div class="menu-item" onclick="window.flowEditor.setStart('${esc(sceneId)}');">
      <i class="fa-solid fa-play w-4"></i> Set as Start</div>` : ''}
    ${isStart ? `<div class="menu-item" onclick="window.flowEditor.unsetStart();">
      <i class="fa-solid fa-stop w-4"></i> Unset Start</div>` : ''}
    ${hasFlow ? `<div class="menu-divider"></div>
      <div class="menu-item danger" onclick="window.flowEditor.deleteFlowConfig('${esc(sceneId)}');">
        <i class="fa-solid fa-trash w-4"></i> Remove Flow Config</div>` : ''}`;

  const rect = document.getElementById('flow-diagram-container').getBoundingClientRect();
  menu.style.left = `${x - rect.left}px`;
  menu.style.top = `${y - rect.top}px`;
  menu.classList.remove('hidden');
}

export function hideMenu() {
  const m = document.getElementById('flow-context-menu');
  if (m) m.classList.add('hidden');
}
