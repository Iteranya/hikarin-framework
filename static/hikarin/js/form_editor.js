// ═══════════════════════════════════════════════════════
//  FORM‑BASED SCENE EDITOR  (Hikarin)
// ═══════════════════════════════════════════════════════

// We store block lists per scene here
import { openCodeTab } from './flow_manager/code_editor.js';
const blockStore = {};

// Configuration of block types -> template + Python emitter
const BLOCK_DEFS = {
  say: {
    label: 'Say',
    fields: {
      speaker: { type: 'select', options: [] },
      text:   { type: 'text', placeholder: 'Hello world' }
    },
    emit: (b) => `    vn.say(${JSON.stringify(b.speaker)}, ${JSON.stringify(b.text)})`
  },
  show: {
    label: 'Show Sprite',
    fields: {
      character: { type: 'select', options: [] },
      sprite:  { type: 'select', options: [] },
      position: { type: 'select', options: ['CENTER','LEFT','RIGHT'] }
    },
    emit: (b) => `    vn.show(${JSON.stringify(b.character)}, ${JSON.stringify(b.sprite)})${
      b.position === 'CENTER' ? '' : `.${b.position.toLowerCase()}(c,${JSON.stringify(b.sprite)})`
    }`
  },
  remove: {
    label: 'Remove Character',
    fields: {
      character: { type: 'select', options: [] }
    },
    emit: (b) => `    vn.remove(${JSON.stringify(b.character)})`
  },
  background: {
    label: 'Background',
    fields: {
      image: { type: 'select', options: [] }
    },
    emit: (b) => `    vn.background("${b.image}")`
  },
  play_music: {
    label: 'Play Music',
    fields: {
      music: { type: 'select', options: [] }
    },
    emit: (b) => `    vn.play_music("${b.music}")`
  },
  stop_music: {
    label: 'Stop Music',
    fields: {},
    emit: () => '    vn.stop_music()'
  },
  set_var: {
    label: 'Set Variable',
    fields: {
      var: { type: 'text', placeholder: 'flag' },
      value: { type: 'text', placeholder: '0' }
    },
    emit: (b) => `    vn.setVar("${b.var}", ${b.value})`
  },
  mod_var: {
    label: 'Modify Variable',
    fields: {
      var: { type: 'text', placeholder: 'flag' },
      operation: { type: 'select', options: ['add', 'subtract', 'mod'] },
      value: { type: 'text', placeholder: '1' }
    },
    emit: (b) => {
      const op = b.operation === 'add' ? 'addVar' : b.operation === 'subtract' ? 'subVar' : 'modVar';
      return `    vn.${op}("${b.var}", ${b.value})`;
    }
  },
  cond_same: {
    label: 'If Equals',
    fields: {
      var: { type: 'text', placeholder: 'flag' },
      value: { type: 'text', placeholder: 'true' }
    },
    emit: (b) => `    vn.condSame("${b.var}", ${b.value}, [\n        # TODO: nested actions\n    ])`
  },
  cond_more: {
    label: 'If Greater Than',
    fields: {
      var: { type: 'text', placeholder: 'flag' },
      value: { type: 'text', placeholder: '10' }
    },
    emit: (b) => `    vn.condMoreThan("${b.var}", ${b.value}, [\n        # TODO: nested actions\n    ])`
  },
  cond_less: {
    label: 'If Less Than',
    fields: {
      var: { type: 'text', placeholder: 'flag' },
      value: { type: 'text', placeholder: '5' }
    },
    emit: (b) => `    vn.condLessThan("${b.var}", ${b.value}, [\n        # TODO: nested actions\n    ])`
  }
};

// ── Data refs – cached on first load ──
let cachedCharacters = [];   // [{id, name}, ...]
let cachedSpriteMap = {};    // { monika: ['happy.png','sad.png'], ... }
let cachedAudioFiles = [];
let cachedImageFiles = [];

// ── Fetch library data once ──
export async function loadLibraryData() {
  try {
    const [chars, sprites, audio, images] = await Promise.all([
      fetch('/api/library/characters').then(r => r.json()),
      fetch('/api/library/sprite-map').then(r => r.json()),
      fetch('/api/library/assets/audio').then(r => r.json()),
      fetch('/api/library/assets/images').then(r => r.json())
    ]);
    cachedCharacters = chars;
    cachedSpriteMap = sprites;
    cachedAudioFiles = audio.map(a => a.filename);
    cachedImageFiles = images.map(i => i.filename);
    return true;
  } catch (e) {
    console.error('Failed to load library data', e);
    return false;
  }
}

// ── Create a new block object ──
function createBlock(type) {
  const def = BLOCK_DEFS[type];
  if (!def) return null;
  const block = { type, id: crypto.randomUUID() };
  for (const [key, field] of Object.entries(def.fields)) {
    if (field.type === 'select') {
      block[key] = field.options?.[0] || '';
    } else {
      block[key] = '';
    }
  }
  return block;
}

// ── Get block list for current scene ──
export function getBlocks(sceneId) {
  console.log('📋 getBlocks', sceneId);
  if (!blockStore[sceneId]) blockStore[sceneId] = [];
  return blockStore[sceneId];
}

export function openFormEditor(flowEditor, sceneId) {
  if (!sceneId) return;

  // Update file name displays
    const scriptTitle = document.getElementById('flow-script-title');
    if (scriptTitle) scriptTitle.textContent = `${sceneId}.py`;

  document.getElementById('lbl-current-file').textContent = `${sceneId}.py`;

  const blocks = getBlocks(sceneId);
  renderBlocks(blocks);
  attachToolbarEvents();
}

function renderBlocks(blocks) {
  console.log('🖌️ renderBlocks', blocks.length);
  const container = document.getElementById('flow-script-blocks');
  if (!container) return;
  if (!blocks.length) {
    container.innerHTML = '<p class="text-gray-500 text-center py-8 text-sm">No script lines yet. Use the buttons above to add content.</p>';
    return;
  }
  container.innerHTML = '';
  blocks.forEach((b, idx) => {
    const el = buildBlockElement(b, idx, blocks);
    container.appendChild(el);
  });
}

// ── Build single block DOM ──
function buildBlockElement(block, idx, blocks) {
  const def = BLOCK_DEFS[block.type];
  const div = document.createElement('div');
  div.className = 'form-block';
  div.innerHTML = `
    <div class="form-block-header">
      <span class="form-block-label">${def.label}</span>
      <div class="form-block-controls flex gap-1">
        ${idx > 0 ? '<button class="move-up" title="Move Up">▲</button>' : ''}
        ${idx < blocks.length-1 ? '<button class="move-down" title="Move Down">▼</button>' : ''}
        <button class="delete-block" title="Delete">×</button>
      </div>
    </div>
    <div class="form-block-body" data-block-id="${block.id}"></div>
  `;

  const body = div.querySelector('.form-block-body');
  for (const [key, field] of Object.entries(def.fields)) {
    const input = createFieldElement(key, field, block);
    body.appendChild(input);
  }

  // Event listeners
  div.querySelector('.delete-block')?.addEventListener('click', () => deleteBlock(block.id));
  div.querySelector('.move-up')?.addEventListener('click', () => moveBlock(block.id, -1));
  div.querySelector('.move-down')?.addEventListener('click', () => moveBlock(block.id, 1));

  return div;
}

// ── Create input/select for a field ──
function createFieldElement(key, field, block) {
  const wrap = document.createElement('div');
  wrap.className = 'flex flex-col gap-1';
  const label = document.createElement('span');
  label.className = 'text-[10px] text-gray-500';
  label.textContent = key;
  wrap.appendChild(label);

  let input;
  if (field.type === 'select') {
    input = document.createElement('select');
    let options = field.options || [];
    // Populate from cache if special key
    if (key === 'speaker' || key === 'character') {
      options = cachedCharacters.map(c => c.id);
    } else if (key === 'sprite') {
      const charId = block.character || '';
      options = cachedSpriteMap[charId] || [];
    } else if (key === 'image') {
      options = cachedImageFiles;
    } else if (key === 'music') {
      options = cachedAudioFiles;
    }
    options.forEach(opt => {
      const o = document.createElement('option');
      o.value = opt;
      o.textContent = opt;
      input.appendChild(o);
    });
    input.addEventListener('change', (e) => {
      block[key] = e.target.value;
      if (key === 'character') {
        refreshSpritesForBlock(block, wrap);
      }
      saveBlocks();
    });
  } else {
    input = document.createElement('input');
    input.type = 'text';
    input.placeholder = field.placeholder || '';
    input.dataset.key = key;
    input.addEventListener('input', (e) => {
      block[key] = e.target.value;
      saveBlocks();
    });
  }
  input.value = block[key] || '';
  wrap.appendChild(input);
  return wrap;
}

// ── Keep sprite list up to date when character changes ──
function refreshSpritesForBlock(block, container) {
  const spriteSelect = container.closest('.form-block-body')?.querySelector(`select[data-key="sprite"]`);
  if (!spriteSelect) return;
  const charId = block.character;
  const sprites = cachedSpriteMap[charId] || [];
  spriteSelect.innerHTML = sprites.map(s => `<option value="${s}">${s}</option>`).join('');
  spriteSelect.value = block.sprite || sprites[0] || '';
  block.sprite = spriteSelect.value;
  saveBlocks();
}

// ── Toolbar add‑block handlers ──
function attachToolbarEvents() {
  const toolbar = document.getElementById('form-toolbar');
  if (!toolbar) return;

  // Remove any previous listeners to avoid duplicates
  toolbar.replaceWith(toolbar.cloneNode(true));
  const freshToolbar = document.getElementById('form-toolbar');

  freshToolbar.addEventListener('click', (e) => {
    const btn = e.target.closest('.form-add-btn');
    if (!btn) return;
    const type = btn.dataset.type;
    console.log('🕹️ Delegation click:', type);

    const block = createBlock(type);
    if (!block) return;
    const sceneId = window.flowEditor.activeSceneId;
    if (!sceneId) {
      console.error('No current scene');
      return;
    }
    getBlocks(sceneId).push(block);
    renderBlocks(getBlocks(sceneId));
    saveBlocks();
  });
}


// ── Delete block ──
function deleteBlock(blockId) {
  const sceneId = window.flowEditor.activeSceneId;
  if (!sceneId) return;
  const blocks = getBlocks(sceneId);
  const idx = blocks.findIndex(b => b.id === blockId);
  if (idx < 0) return;
  blocks.splice(idx, 1);
  renderBlocks(blocks);
  saveBlocks();
}

// ── Move block up/down ──
function moveBlock(blockId, direction) {
  const sceneId = window.flowEditor.activeSceneId;
  if (!sceneId) return;
  const blocks = getBlocks(sceneId);
  const idx = blocks.findIndex(b => b.id === blockId);
  if (idx < 0) return;
  const newIdx = idx + direction;
  if (newIdx < 0 || newIdx >= blocks.length) return;
  [blocks[idx], blocks[newIdx]] = [blocks[newIdx], blocks[idx]];
  renderBlocks(blocks);
  saveBlocks();
}

// ── Save blocks (debounced) ──
let saveTimer;
function saveBlocks() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const sceneId = window.flowEditor.activeSceneId;
    if (!sceneId) return;
    const code = generatePython(sceneId);
    // Use the save mechanism in flowEditor (auto‑save)
    window.flowEditor._saveSceneContent(sceneId, code);
  }, 750);
}

// ── Generate Python code from blocks ──
function generatePython(sceneId) {
  const blocks = getBlocks(sceneId);
  const lines = [
    `# Script: ${sceneId}.py`,
    `from src.modules import VisualNovelModule`,
    ``,
    `vn = VisualNovelModule()`,
    ``,
    `def story():`
  ];
  if (blocks.length === 0) {
    lines.push(`    vn.say("", "Empty scene.")`);
  } else {
    for (const block of blocks) {
      const def = BLOCK_DEFS[block.type];
      if (def && def.emit) {
        lines.push(def.emit(block));
      }
    }
  }
  lines.push('');
  return lines.join('\n');
}

// ── Called by manual save button ──
export async function saveFormContent(sceneId) {
  const code = generatePython(sceneId);
  const slug = window.flowEditor.fm.projectSlug;
  const filename = `${sceneId}.py`;

  try {
    const res = await fetch(`/api/projects/${slug}/file/${filename}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: code }),
    });
    if (!res.ok) throw new Error('Save failed');
    document.getElementById('form-status').textContent = 'Saved ✓';
  } catch (e) {
    document.getElementById('form-status').textContent = 'Save failed!';
  }
}
