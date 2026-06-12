import { esc } from './utils.js';

export function getFiles(fm) {
  const raw = fm?.fileList || [];
  return raw
    .filter(fn => fn.endsWith('.py') && !fn.startsWith('__'))
    .map(fn => ({ filename: fn, sceneId: fn.replace(/\.py$/, '') }));
}

export function renderSceneList(fm, flowData, activeSceneId) {
  const container = document.getElementById('flow-scene-list');
  const countEl = document.getElementById('flow-scene-count');
  const files = getFiles(fm);
  countEl.textContent = files.length;

  if (!files.length) {
    container.innerHTML = '<p class="text-xs text-gray-600 text-center mt-8">No .py files yet.</p>';
    return;
  }

  const labels = { choice: 'ch', cond: 'if', jump: '→', random: 'rand', finish: 'end' };

  container.innerHTML = files.map(f => {
    const s = flowData.scenes[f.sceneId];
    const etype = s?.exit?.type || 'finish';
    const active = activeSceneId === f.sceneId ? ' active' : '';
    const isStart = flowData.startScene === f.sceneId;
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

export async function renderDiagram(fm, flowData) {
  const wrapper = document.getElementById('flow-diagram-wrapper');
  const syntax = generateMermaid(fm, flowData);
  wrapper.innerHTML = `<pre id="flow-mermaid" class="mermaid">${syntax}</pre>`;
  try {
    await window.mermaid.run({ querySelector: '#flow-mermaid' });
  } catch (e) {
    wrapper.innerHTML = `<p class="text-red-400 text-sm p-4">Diagram error: ${e.message}</p>`;
  }
}

function generateMermaid(fm, flowData) {
  const files = getFiles(fm);
  const fset = new Set(files.map(f => f.sceneId));
  if (!files.length) return 'graph TD\n    EMPTY[No scripts]';

  const lines = ['graph TD'];

  // ── Define a class for scene nodes with larger text ──
  lines.push('    classDef scene-node font-size:24px;');
  lines.push(''); // blank line for clarity

  const done = new Set();
  const nid = (id) => id.replace(/[^a-zA-Z0-9_]/g, '_');

  // Node helper – stripped common first word from label
    const snode = (sceneId) => {
    const id = nid(sceneId);
    if (done.has('s_' + id)) return id;
    done.add('s_' + id);
    const isStart = flowData.startScene === sceneId;
    const exists = fset.has(sceneId);

    let labelSceneId = sceneId;
    if (labelSceneId.startsWith('_')) labelSceneId = labelSceneId.slice(1);
    const parts = labelSceneId.split('_');
    const label = parts.length > 1 ? parts.slice(1).join(' ') : labelSceneId.replace(/_/g, ' ');

    if (!exists) {
      lines.push(`    ${id}[${label} ❌]`);
      lines.push(`    style ${id} fill:#3b1a1a,stroke:#ef4444,color:#fca5a5,stroke-dasharray:4`);
    } else if (isStart) {
      lines.push(`    ${id}{{▶ ${label}}}`);
      lines.push(`    style ${id} fill:#78350f,stroke:#f59e0b,color:#fde68a,font-size:24px`);
    } else {
      lines.push(`    ${id}[${label}]`);
      lines.push(`    class ${id} scene-node`);
    }
    return id;
  };


  // Exit node helper (unchanged)
  const cnode = (sceneId, exit) => {
    const id = nid(sceneId) + '_x';
    if (done.has('c_' + id)) return id;
    done.add('c_' + id);
    const lbl = { choice: '?', cond: 'if', jump: '→', random: '🎲', finish: '⏹' }[exit.type] || '?';
    lines.push(`    ${id}{${lbl}}`);
    lines.push(`    class ${id} ${exit.type === 'finish' ? 'finish-node' : 'cond-node'}`);
    return id;
  };

  // 1. Ensure every .py scene has a node
  files.forEach(f => snode(f.sceneId));

  // 2. Draw ALL edges for each scene
  for (const f of files) {
    const sceneId = f.sceneId;
    const sId = nid(sceneId);
    const exit = flowData.scenes[sceneId]?.exit || { type: 'finish', branches: [] };

    if (exit.type === 'jump') {
      const target = exit.branches[0]?.target;
      if (target && fset.has(target)) {
        lines.push(`    ${sId} -->|►| ${nid(target)}`);
      } else {
        lines.push(`    ${sId} --> ${cnode(sceneId, exit)}`);
      }
    } else if (exit.type === 'finish') {
      lines.push(`    ${sId} --> ${cnode(sceneId, exit)}`);
    } else {
      // choice / cond / random
      const xId = cnode(sceneId, exit);
      lines.push(`    ${sId} --> ${xId}`);
      (exit.branches || []).forEach(b => {
        if (b.target && fset.has(b.target)) {
          lines.push(`    ${xId} -->|${b.label || '?'}| ${nid(b.target)}`);
        }
      });
    }
  }

  // 3. Add click handlers to all scene nodes
  files.forEach(f => {
    const id = nid(f.sceneId);
    if (done.has('s_' + id)) {
      lines.push(`    click ${id} call flowHandleClick("${f.sceneId}")`);
    }
  });

  return lines.join('\n');
}
