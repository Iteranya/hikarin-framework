import { LABEL_PREFIX } from './utils.js';

export function labelFile(sceneId) {
  return `${LABEL_PREFIX}${sceneId}.py`;
}

export function buildLabelContent(sceneId) {
  return `# Auto-generated label for: ${sceneId}.py
# Managed by Hikarin Flow Editor
from src.modules import VisualNovelModule
vn = VisualNovelModule()

def story():
    vn.label('${sceneId}')
`;
}

export async function labelExists(fm, sceneId) {
  const slug = fm.projectSlug;
  const lf = labelFile(sceneId);
  try {
    const res = await fetch(`/api/projects/${slug}/file/${lf}`);
    return res.ok;
  } catch { return false; }
}

export async function createLabelFile(fm, sceneId) {
  const slug = fm.projectSlug;
  const lf = labelFile(sceneId);
  const content = buildLabelContent(sceneId);

  await fetch(`/api/projects/${slug}/file/${lf}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });

  try {
    const res = await fetch(`/api/projects/${slug}/file/manifest.json`);
    if (res.ok) {
      const raw = await res.json();
      const manifest = JSON.parse(raw.content);
      const group = manifest.script_groups?.find(g => g.slug === fm.groupSlug);
      if (group && !group.source_files.includes(lf)) {
        group.source_files.push(lf);
        group.source_files.sort();
        await fetch(`/api/projects/${slug}/file/manifest.json`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: JSON.stringify(manifest, null, 4) }),
        });
      }
    }
  } catch (e) { /* non-fatal */ }
}

export async function ensureAllLabels(fm) {
  const raw = fm.fileList || [];
  const bodyFiles = raw.filter(fn => fn.endsWith('.py') && !fn.startsWith('__'));
  for (const fn of bodyFiles) {
    const sceneId = fn.replace(/\.py$/, '');
    const exists = await labelExists(fm, sceneId);
    if (!exists) {
      console.log(`🔖 Creating label for: ${sceneId}`);
      await createLabelFile(fm, sceneId);
    }
  }
  if (fm.loadFileList) await fm.loadFileList();
}

export async function loadFlowFile(fm) {
  try {
    const res = await fetch(`/api/projects/${fm.projectSlug}/file/flow.json`);
    if (res.ok) {
      const data = await res.json();
      if (data.content) return JSON.parse(data.content);
    }
  } catch (e) { /* no flow.json yet */ }
  return { startScene: null, scenes: {} };
}

export async function saveFlowFile(fm, flowData) {
  const content = JSON.stringify(flowData, null, 2);
  await fetch(`/api/projects/${fm.projectSlug}/file/flow.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
}
