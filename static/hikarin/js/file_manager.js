// js/file_manager.js

export class FileManager {
    // !!! CRITICAL FIX: Added groupSlug to constructor !!!
    constructor(projectSlug, groupSlug, editorManager, workspace) {
        this.projectSlug = projectSlug;
        this.groupSlug = groupSlug; 
        this.editor = editorManager;
        this.workspace = workspace;
        this.currentFile = null;
        
        this.DATA_MARKER = '"""### BLOCKLY_DATA ###';
        this.sidebarList = document.querySelector('#fileListContainer');
        this.lblCurrentFile = document.getElementById('lbl-current-file');
    }

    async init() {
        console.log(`📂 DEBUG: FileManager initializing for Group: ${this.groupSlug}`);
        await this.loadFileList();
    }

    async loadFileList() {
        this.sidebarList.innerHTML = '<div class="text-xs text-gray-500 text-center mt-4">Loading Group...</div>';

        try {
            // 1. Fetch Manifest
            const res = await fetch(`/api/projects/${this.projectSlug}/file/manifest.json`);
            if (!res.ok) throw new Error("Could not load manifest.json");
            
            const rawData = await res.json();
            const manifest = JSON.parse(rawData.content);

            // 2. Find the Active Group using this.groupSlug
            const activeGroup = manifest.script_groups.find(g => g.slug === this.groupSlug);

            if (!activeGroup) {
                console.error(`Group '${this.groupSlug}' not found in manifest.`);
                this.sidebarList.innerHTML = `<div class="text-red-500 text-xs p-2">Group '${this.groupSlug}' not found</div>`;
                return;
            }

            console.log(`📂 DEBUG: Files found:`, activeGroup.source_files);
            
            // 3. Render
            this.renderSidebar(activeGroup.source_files);

            // 4. Auto-load
            if (!this.currentFile && activeGroup.source_files.length > 0) {
                this.loadFile(activeGroup.source_files[0]);
            }

        } catch (e) {
            console.error("⛔ CRITICAL: Failed to load group files", e);
            this.sidebarList.innerHTML = '<div class="text-red-500 text-xs p-2">Error loading file list</div>';
        }
    }

    renderSidebar(files) {
        this.sidebarList.innerHTML = '';
        if(!files || files.length === 0) {
            this.sidebarList.innerHTML = '<div class="text-gray-500 text-xs p-2">No files in group.</div>';
            return;
        }

        files.forEach(filename => {
            const div = document.createElement('div');
            const isActive = this.currentFile === filename;
            div.className = `group flex items-center justify-between p-2 rounded cursor-pointer mb-1 transition ${
                isActive ? 'bg-mob-900/20 border border-mob-500/20 text-white' : 'text-gray-400 hover:bg-dark-700 hover:text-gray-200'
            }`;
            
            div.innerHTML = `
                <div class="flex items-center gap-2 overflow-hidden">
                    <i class="fa-brands fa-python ${isActive ? 'text-mob-500' : 'text-gray-600'} text-sm"></i>
                    <span class="text-sm font-medium truncate">${filename}</span>
                </div>
                ${isActive ? '<span class="w-2 h-2 rounded-full bg-mob-500"></span>' : ''}
            `;
            div.onclick = () => this.loadFile(filename);
            this.sidebarList.appendChild(div);
        });
    }

    async loadFile(filename) {
        if (this.currentFile === filename) return;

        console.log(`📂 DEBUG: Loading file: ${filename}`);
        this.currentFile = filename;
        if(this.lblCurrentFile) this.lblCurrentFile.innerText = filename;
        
        // Refresh sidebar to update highlight
        // (Optimized: we don't need to re-fetch manifest, just re-render if we stored files, but for now this is safe)
        const currentChildren = Array.from(this.sidebarList.children);
        currentChildren.forEach(child => {
            if(child.innerText.includes(filename)) {
                child.classList.add('bg-mob-900/20', 'text-white');
            } else {
                child.classList.remove('bg-mob-900/20', 'text-white');
            }
        });

        try {
            const res = await fetch(`/api/projects/${this.projectSlug}/file/${filename}`);
            if (!res.ok) throw new Error("File fetch failed");

            const data = await res.json();
            const rawContent = data.content;

            if (rawContent.includes(this.DATA_MARKER)) {
                const parts = rawContent.split(this.DATA_MARKER);
                const pythonCode = parts[0].trim();
                let jsonString = parts[1].replace(/"""\s*$/, "").trim();

                document.getElementById('fullSourceCode').value = pythonCode;
                
                try {
                    const blockData = JSON.parse(jsonString);
                    this.workspace.clear();
                    Blockly.serialization.workspaces.load(blockData, this.workspace);
                } catch (jsonErr) {
                    console.error("⚠️ JSON Parse Error:", jsonErr);
                }

            } else {
                document.getElementById('fullSourceCode').value = rawContent;
                this.workspace.clear(); 
            }

            this.editor.generateCode();

        } catch (e) {
            console.error("Failed to load file:", e);
        }
    }

    async saveCurrentFile() {
        if (!this.currentFile) return;

        this.showSaveStatus("Saving...", "text-yellow-500", "bg-yellow-500");

        try {
            const pythonCode = Blockly.Python.workspaceToCode(this.workspace);
            const blockState = Blockly.serialization.workspaces.save(this.workspace);
            const jsonString = JSON.stringify(blockState, null, 0);

            const fileContent = `${pythonCode}\n\n${this.DATA_MARKER}\n${jsonString}\n"""`;

            await fetch(`/api/projects/${this.projectSlug}/file/${this.currentFile}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: fileContent })
            });

            this.showSaveStatus("Autosaved", "text-gray-400", "bg-green-500");
            document.getElementById('fullSourceCode').value = pythonCode;

        } catch (e) {
            console.error("Save failed:", e);
            this.showSaveStatus("Save Failed", "text-red-500", "bg-red-500");
        }
    }

    showSaveStatus(text, textColor, dotColor) {
        const txtEl = document.getElementById('save-status-text');
        const dotEl = document.getElementById('save-status-dot');
        if(txtEl) txtEl.className = `text-xs ${textColor}`;
        if(txtEl) txtEl.innerText = text;
        if(dotEl) dotEl.className = `w-2 h-2 rounded-full animate-pulse ${dotColor}`;
    }
}