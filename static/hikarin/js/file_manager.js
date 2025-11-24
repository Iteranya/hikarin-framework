// js/file_manager.js

export class FileManager {
    constructor(projectSlug, groupSlug, editorManager, workspace) {
        this.projectSlug = projectSlug;
        this.groupSlug = groupSlug; 
        this.editor = editorManager;
        this.workspace = workspace;
        this.currentFile = null;
        
        this.DATA_MARKER = '"""### BLOCKLY_DATA ###';
        this.sidebarList = document.querySelector('#fileListContainer');
        this.lblCurrentFile = document.getElementById('lbl-current-file');

        // Update the Modal Hint to show the user the prefix
        const prefixLbl = document.getElementById('lbl-group-prefix');
        if(prefixLbl) prefixLbl.innerText = `${this.groupSlug}_`;
    }

    async init() {
        console.log(`📂 DEBUG: FileManager initializing for Group: ${this.groupSlug}`);
        await this.loadFileList();
    }

    async loadFileList() {
        this.sidebarList.innerHTML = '<div class="text-xs text-gray-500 text-center mt-4">Loading Group...</div>';

        try {
            const res = await fetch(`/api/projects/${this.projectSlug}/file/manifest.json`);
            if (!res.ok) throw new Error("Could not load manifest.json");
            
            const rawData = await res.json();
            const manifest = JSON.parse(rawData.content);

            const activeGroup = manifest.script_groups.find(g => g.slug === this.groupSlug);

            if (!activeGroup) {
                console.error(`Group '${this.groupSlug}' not found in manifest.`);
                this.sidebarList.innerHTML = `<div class="text-red-500 text-xs p-2">Group '${this.groupSlug}' not found</div>`;
                return;
            }
            
            this.renderSidebar(activeGroup.source_files);

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
        
        // Update sidebar highlighting
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

            // --- FIX START: Safe DOM Update ---
            const fullSourceEl = document.getElementById('fullSourceCode');
            const generatedEl = document.getElementById('generatedCode');

            if (rawContent.includes(this.DATA_MARKER)) {
                // CASE A: File has Visual Blocks
                const parts = rawContent.split(this.DATA_MARKER);
                const pythonCode = parts[0].trim();
                let jsonString = parts[1].replace(/"""\s*$/, "").trim();

                // If the old editor exists, populate it (backward compat)
                if (fullSourceEl) fullSourceEl.value = pythonCode;
                
                try {
                    const blockData = JSON.parse(jsonString);
                    this.workspace.clear();
                    Blockly.serialization.workspaces.load(blockData, this.workspace);
                    
                    // Update the sidebar preview
                    this.editor.generateCode();
                } catch (jsonErr) {
                    console.error("⚠️ JSON Parse Error:", jsonErr);
                }

            } else {
                // CASE B: Pure Python File (No blocks)
                if (fullSourceEl) fullSourceEl.value = rawContent;
                
                // Also put it in the sidebar so we can at least see it
                if (generatedEl) generatedEl.value = rawContent;
                
                this.workspace.clear(); 
                // Note: We do NOT call generateCode() here, because it would overwrite 
                // the raw python we just loaded with empty block code.
            }
            // --- FIX END ---

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
            
            // --- FIX: Check before setting ---
            const fullSourceEl = document.getElementById('fullSourceCode');
            if (fullSourceEl) fullSourceEl.value = pythonCode;

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

    async createNewScript() {
        const inputEl = document.getElementById('inp-new-script-name');
        const modal = document.getElementById('modal-new-script');
        const rawName = inputEl.value.trim();

        if (!rawName) return;

        // 1. Sanitize & Format Name
        // Ensure it has .py and prefix with group slug for organization
        let scriptName = rawName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        
        // Remove .py if user added it, we will add it back
        if(scriptName.endsWith('_py')) scriptName = scriptName.slice(0, -3);

        const filename = `${this.groupSlug}_${scriptName}.py`;

        try {
            // 2. Fetch Manifest to update it
            const resManifest = await fetch(`/api/projects/${this.projectSlug}/file/manifest.json`);
            if (!resManifest.ok) throw new Error("Load manifest failed");
            
            const rawData = await resManifest.json();
            const manifest = JSON.parse(rawData.content);
            const activeGroup = manifest.script_groups.find(g => g.slug === this.groupSlug);

            // 3. Check for duplicates
            if (activeGroup.source_files.includes(filename)) {
                alert("File already exists in this group!");
                return;
            }

            // 4. Create the File on Server
            const initialContent = `# Script: ${filename}\nfrom src.modules import VisualNovelModule\n\nvn = VisualNovelModule()\n\ndef story():\n    vn.label('start')\n    vn.say('Player', 'Hello World!')\n    vn.finish()\n`;
            
            await fetch(`/api/projects/${this.projectSlug}/file/${filename}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: initialContent })
            });

            // 5. Update Manifest
            activeGroup.source_files.push(filename);
            
            await fetch(`/api/projects/${this.projectSlug}/file/manifest.json`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: JSON.stringify(manifest, null, 4) })
            });

            // 6. Reset UI
            inputEl.value = '';
            modal.classList.add('hidden');
            modal.classList.remove('flex');

            // 7. Reload list and open new file
            await this.loadFileList();
            await this.loadFile(filename);

        } catch (e) {
            console.error("Create Script Failed:", e);
            alert("Failed to create script. Check console.");
        }
    }
}