export async function openCodeTab(flowEditor, sceneId, presetContent = null) {
  if (!sceneId) return;

  // Ensure the outer code tab is visible
  const codeTabOuter = document.getElementById('flow-code-content');
  if (codeTabOuter) codeTabOuter.style.display = 'flex';
  document.getElementById('flow-editor-content').style.display = 'none';
  // Hide form, show ACE container
  document.getElementById('flow-script-content').classList.add('hidden');
  const aceContainer = document.getElementById('flow-ace-container');
  aceContainer.classList.remove('hidden');
  aceContainer.style.display = 'flex';

  const filenameEl = document.getElementById('flow-code-filename');
  if (filenameEl) filenameEl.textContent = `${sceneId}.py`;

  let content;
  if (presetContent !== null) {
    content = presetContent;
  } else {
    try {
      const res = await fetch(`/api/projects/${flowEditor.fm.projectSlug}/file/${sceneId}.py`);
      const data = res.ok ? await res.json() : null;
      content = data?.content || `# File not found: ${sceneId}.py\n`;
    } catch (e) {
      content = `# Error loading: ${e.message}\n`;
    }
  }

  await initAce(flowEditor, content, sceneId);
  const statusEl = document.getElementById('flow-code-status');
  if (statusEl) statusEl.textContent = presetContent ? 'Generated' : 'Loaded';
  flowEditor._aceSceneId = sceneId;
}

async function initAce(flowEditor, content, sceneId) {
  const wrapper = document.getElementById('flow-ace-wrapper');
  if (!wrapper) return;
  wrapper.innerHTML = '<div id="flow-ace-editor"></div>';

  const editorEl = document.getElementById('flow-ace-editor');
  if (!editorEl) return;

  if (!window.__aceModule) {
    try {
      window.__aceModule = await import('https://esm.sh/ace-builds@1.32.7/src-min-noconflict/ace');
      const CDN = 'https://cdn.jsdelivr.net/npm/ace-builds@1.32.7/src-min-noconflict/';
      window.__aceModule.default.config.set('basePath', CDN);
      window.__aceModule.default.config.set('modePath', CDN);
      window.__aceModule.default.config.set('themePath', CDN);
      window.__aceModule.default.config.set('workerPath', CDN);
    } catch (e) { console.error('ACE import failed:', e); return; }
  }

  const ace = window.__aceModule.default;
  flowEditor._aceEditor = ace.edit(editorEl);
  flowEditor._aceEditor.setTheme('ace/theme/tomorrow_night_eighties');
  flowEditor._aceEditor.session.setMode('ace/mode/python');
  flowEditor._aceEditor.setValue(content, -1);
  flowEditor._aceEditor.setShowPrintMargin(false);
  flowEditor._aceEditor.setOptions({
    fontSize: '13px',
    fontFamily: "'Fira Code', monospace",
    tabSize: 4,
    useSoftTabs: true,
  });
  flowEditor._aceEditor.clearSelection();
  flowEditor._aceDirty = false;

  flowEditor._aceEditor.commands.addCommand({
    name: 'save',
    bindKey: { win: 'Ctrl-S', mac: 'Cmd-S' },
    exec: () => saveAceFile(flowEditor),
  });

  flowEditor._aceEditor.session.on('change', () => {
    flowEditor._aceDirty = true;
    const el = document.getElementById('flow-code-status');
    if (el) el.textContent = 'Saving...';
    clearTimeout(flowEditor._aceSaveTimer);
    flowEditor._aceSaveTimer = setTimeout(() => {
      saveAceFile(flowEditor);
    }, 750);
  });
}

export async function saveAceFile(flowEditor) {
  if (!flowEditor._aceEditor || !flowEditor._aceSceneId || flowEditor._aceSaving) return;
  flowEditor._aceSaving = true;
  const content = flowEditor._aceEditor.getValue();
  const slug = flowEditor.fm.projectSlug;
  const filename = `${flowEditor._aceSceneId}.py`;
  const statusEl = document.getElementById('flow-code-status');

  try {
    const res = await fetch(`/api/projects/${slug}/file/${filename}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) throw new Error('Save failed');
    flowEditor._aceDirty = false;
    if (statusEl) statusEl.textContent = 'Saved ✓';
  } catch (e) {
    if (statusEl) statusEl.textContent = 'Save failed!';
  } finally {
    flowEditor._aceSaving = false;
  }
}
