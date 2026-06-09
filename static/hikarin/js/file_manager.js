// js/file_manager.js

export class FileManager {
    constructor(projectSlug, groupSlug) {
        this.projectSlug = projectSlug;
        this.groupSlug = groupSlug;
        this.currentFile = null;

        this.sidebarList = document.querySelector('#fileListContainer');
        this.lblCurrentFile = document.getElementById('lbl-current-file');

        const prefixLbl = document.getElementById('lbl-group-prefix');
        if (prefixLbl) prefixLbl.innerText = `${this.groupSlug}_`;
    }

    async init() {
        console.log(`📂 FileManager: Group "${this.groupSlug}"`);
        await this.loadFileList();
    }

    // ─── FILE LIST ───────────────────────────

    async loadFileList() {
        this.sidebarList.innerHTML = '<div class="text-xs text-gray-500 text-center mt-4">Loading files...</div>';

        try {
            const res = await fetch(`/api/projects/${this.projectSlug}/file/manifest.json`);
            if (!res.ok) throw new Error('Failed to load manifest');

            const rawData = await res.json();
            const manifest = JSON.parse(rawData.content);
            const activeGroup = manifest.script_groups.find(g => g.slug === this.groupSlug);

            if (!activeGroup) {
                this.sidebarList.innerHTML = `<div class="text-red-500 text-xs p-2">Group "${this.groupSlug}" not found</div>`;
                return;
            }

            this.renderSidebar(activeGroup.source_files);

            if (!this.currentFile && activeGroup.source_files.length > 0) {
                this.loadFile(activeGroup.source_files[0]);
            }
        } catch (e) {
            console.error('Failed to load file list:', e);
            this.sidebarList.innerHTML = '<div class="text-red-500 text-xs p-2">Error loading files</div>';
        }
    }

    renderSidebar(files) {
        this.fileList = files;
        this.sidebarList.innerHTML = '';
        if (!files || files.length === 0) {
            this.sidebarList.innerHTML = '<div class="text-gray-500 text-xs p-2">No files in group.</div>';
            return;
        }

        files.forEach(filename => {
            const div = document.createElement('div');
            const isActive = this.currentFile === filename;

            // Icon based on file type
            const isLabel = filename.startsWith('__label__');
            const isFlowFile = filename.startsWith('__') || filename === 'flow.json';
            const icon = filename.endsWith('.json')
                ? 'fa-solid fa-code text-yellow-500'
                : isLabel
                    ? 'fa-solid fa-tag text-mob-500 text-xs'
                    : 'fa-brands fa-python text-gray-400';

            div.className = `group flex items-center justify-between p-2 rounded cursor-pointer mb-1 transition ${
                isActive ? 'bg-mob-900/20 border border-mob-500/20 text-white'
                         : isFlowFile ? 'text-gray-600 hover:bg-dark-700 hover:text-gray-400'
                         : 'text-gray-400 hover:bg-dark-700 hover:text-gray-200'
            }`;

            div.innerHTML = `
                <div class="flex items-center gap-2 overflow-hidden">
                    <i class="${icon} text-xs ${isActive && !isFlowFile ? 'text-mob-500' : ''}"></i>
                    <span class="text-xs font-medium truncate ${isFlowFile ? 'italic' : ''}">${filename}</span>
                </div>
                ${isActive ? '<span class="w-2 h-2 rounded-full bg-mob-500 flex-shrink-0"></span>' : ''}
            `;

            div.onclick = () => this.loadFile(filename);
            this.sidebarList.appendChild(div);
        });
    }

    // ─── FILE LOAD ───────────────────────────

    async loadFile(filename) {
        if (this.currentFile === filename) return;

        console.log(`📂 Loading: ${filename}`);
        this.currentFile = filename;

        if (this.lblCurrentFile) this.lblCurrentFile.innerText = filename.replace(/^__label__/, '🔖 ').replace(/^__cond__/, '🔀 ');

        this.renderSidebar(Array.from(this.sidebarList.querySelectorAll('.group')).map(el => {
            const span = el.querySelector('span.text-xs');
            return span ? span.textContent.trim() : '';
        }).filter(Boolean));

        // Re-render with correct active state using stored files
        try {
            const res = await fetch(`/api/projects/${this.projectSlug}/file/manifest.json`);
            if (res.ok) {
                const rawData = await res.json();
                const manifest = JSON.parse(rawData.content);
                const activeGroup = manifest.script_groups.find(g => g.slug === this.groupSlug);
                if (activeGroup) this.renderSidebar(activeGroup.source_files);
            }
        } catch (e) { /* ignore — sidebar already updated */ }

        // Trigger any listeners (flow editor can hook here)
        if (this.onFileSelected) this.onFileSelected(filename);
    }

    // ─── FILE CREATE ─────────────────────────

    async createNewScript() {
        const inputEl = document.getElementById('inp-new-script-name');
        const modal = document.getElementById('modal-new-script');
        const rawName = inputEl.value.trim();
        if (!rawName) return;

        let scriptName = rawName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        if (scriptName.endsWith('_py')) scriptName = scriptName.slice(0, -3);

        const filename = `${this.groupSlug}_${scriptName}.py`;

        try {
            const resManifest = await fetch(`/api/projects/${this.projectSlug}/file/manifest.json`);
            if (!resManifest.ok) throw new Error('Load manifest failed');

            const rawData = await resManifest.json();
            const manifest = JSON.parse(rawData.content);
            const activeGroup = manifest.script_groups.find(g => g.slug === this.groupSlug);

            if (activeGroup.source_files.includes(filename)) {
                alert('File already exists!');
                return;
            }

            // Create body file — no label, no finish
            const initialContent =
`# Script: ${filename}
from src.modules import VisualNovelModule

vn = VisualNovelModule()

def story():
    vn.say('Player', 'Hello World!')
`;

            await fetch(`/api/projects/${this.projectSlug}/file/${filename}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: initialContent }),
            });

            activeGroup.source_files.push(filename);
            await fetch(`/api/projects/${this.projectSlug}/file/manifest.json`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: JSON.stringify(manifest, null, 4) }),
            });

            inputEl.value = '';
            modal.classList.add('hidden');
            modal.classList.remove('flex');

            await this.loadFileList();
            await this.loadFile(filename);

            // Notify listeners
            if (this.onFileCreated) this.onFileCreated(filename);

        } catch (e) {
            console.error('Create script failed:', e);
            alert('Failed to create script. Check console.');
        }
    }

    // ─── STATUS ──────────────────────────────

    showSaveStatus(text, textColor, dotColor) {
        const txtEl = document.getElementById('save-status-text');
        const dotEl = document.getElementById('save-status-dot');
        if (txtEl) { txtEl.className = `text-xs ${textColor}`; txtEl.innerText = text; }
        if (dotEl) dotEl.className = `w-2 h-2 rounded-full animate-pulse ${dotColor}`;
    }

    async saveCurrentFile() {
        // In flow-only mode, files are saved individually.
        // This stub exists so GameRunner doesn't crash.
        // Body .py files are saved by their own editor;
        // flow.json is saved by FlowEditorManager.
        // Nothing to do here — but the method must exist.
    }
}
