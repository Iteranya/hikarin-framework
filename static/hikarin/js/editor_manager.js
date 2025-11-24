// static/hikarin/js/editor_manager.js

export class EditorManager {
    constructor(workspace, projectSlug, groupSlug) {
        this.workspace = workspace;
        this.projectSlug = projectSlug;
        this.groupSlug = groupSlug;
        
        // State
        this.isSidebarOpen = false;
        this.currentView = 'visual'; // 'visual' or 'play'
        this.vnEngine = null;        // Holds the HikarinVN instance
        
        // Initialize
        this.initListeners();
        
        // Slight delay to ensure DOM is ready for SVG resizing
        setTimeout(() => this.resize(), 100);
    }

    // --- Initialization & Layout ---

    initListeners() {
        if (!this.workspace) {
            console.error("EditorManager ERROR: Workspace not provided!");
            return;
        }
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        // Required by Blockly when the parent container changes size
        Blockly.svgResize(this.workspace);
    }

    // --- Toolbar Actions (Undo/Redo/Zoom) ---

    undo() { 
        this.workspace.undo(false); 
    }
    
    redo() { 
        this.workspace.undo(true); 
    }

    zoom(dir) {
        if (dir === 0) {
            this.workspace.setScale(1);
            this.workspace.scrollCenter();
        } else {
            const current = this.workspace.getScale();
            this.workspace.setScale(current + (dir * 0.2));
        }
    }

    // --- Code Sidebar (The Python Preview) ---

    toggleCodeSidebar() {
        const sidebar = document.getElementById('pythonSidebar');
        const btn = document.getElementById('btn-code-sidebar');

        this.isSidebarOpen = !this.isSidebarOpen;

        if (this.isSidebarOpen) {
            sidebar.classList.remove('hidden');
            sidebar.classList.add('flex');
            
            // Visual feedback on button
            btn.classList.add('bg-mob-600', 'text-white');
            btn.classList.remove('bg-gray-700');
            
            // Generate code immediately so it isn't empty
            this.generateCode();
        } else {
            sidebar.classList.add('hidden');
            sidebar.classList.remove('flex');
            
            // Revert button
            btn.classList.remove('bg-mob-600', 'text-white');
            btn.classList.add('bg-gray-700');
        }
        
        // Resizing is crucial because the available width for Blockly changed
        this.resize();
    }

    generateCode() {
        try {
            const code = Blockly.Python.workspaceToCode(this.workspace);
            const el = document.getElementById('generatedCode');
            if(el) el.value = code;
        } catch (e) {
            console.log("Blockly generation waiting for blocks...");
        }
    }

    copyCode() {
        const el = document.getElementById('generatedCode');
        el.select();
        document.execCommand('copy');
    }

    // --- View Switching (Visual vs Play) ---

    // --- View Switching (Visual vs Play) ---

    async setView(view) {
        // Prevent clicking the active tab
        if (this.currentView === view) return;
        
        this.currentView = view;
        
        // DOM Elements
        const visualTab = document.getElementById('tab-visual');
        const playTab = document.getElementById('tab-play');
        const blocklyDiv = document.getElementById('blocklyDiv');
        const gameView = document.getElementById('gamePlayerView');
        const sidebar = document.getElementById('pythonSidebar');

        if (view === 'visual') {
            // --- Switch to VISUAL EDITOR ---
            
            // 1. Update Tabs
            visualTab.classList.add('active', 'text-white');
            visualTab.classList.remove('text-gray-400');
            playTab.classList.remove('active', 'text-white');
            playTab.classList.add('text-gray-400');

            // 2. Hide Game, Show Blockly
            gameView.classList.add('hidden');
            gameView.classList.remove('flex');
            
            // !!! FIX: Remove hidden class instead of changing visibility
            blocklyDiv.classList.remove('hidden');
            blocklyDiv.style.display = 'block'; // Force block display just in case

            // 3. Restore Sidebar (if needed)
            if (this.isSidebarOpen) {
                sidebar.classList.remove('hidden');
            }

            // 4. Clean up Engine
            if (this.vnEngine) {
                this.vnEngine = null;
                document.getElementById('vn-container').innerHTML = '';
            }

            // !!! CRITICAL: Blockly needs to recalculate size now that it is visible again
            this.resize();

        } else {
            // --- Switch to GAME PLAYER ---
            
            // 1. Update Tabs
            playTab.classList.add('active', 'text-white');
            playTab.classList.remove('text-gray-400');
            visualTab.classList.remove('active', 'text-white');
            visualTab.classList.add('text-gray-400');

            // 2. Hide Blockly, Show Game
            // !!! FIX: Add hidden class to fully remove Blockly from layout flow
            blocklyDiv.classList.add('hidden');
            blocklyDiv.style.display = 'none'; // Force none

            gameView.classList.remove('hidden');
            gameView.classList.add('flex');
            
            // 3. Hide Sidebar
            sidebar.classList.add('hidden'); 

            // 4. Run Game
            await this.runGame();
        }
    }

    // --- Game Logic ---

    async runGame() {
        const loader = document.getElementById('game-loader');
        const container = document.getElementById('vn-container');
        
        // Show Loader
        loader.classList.remove('hidden');
        
        try {
            // 1. Force Auto-Save
            // We need to make sure the latest blocks are saved to disk on the server
            // because the compiler reads from the .py files, not the browser memory.
            if (window.fileManager) {
                await window.fileManager.saveCurrentFile();
            }

            // 2. Call the Compile Endpoint
            const res = await fetch(`/api/projects/${this.projectSlug}/compile_temp/${this.groupSlug}`, {
                method: 'POST'
            });

            if (!res.ok) throw new Error(`API Error: ${res.status}`);
            
            const responseJson = await res.json();

            // 3. Handle Compilation Errors (Syntax errors in Python)
            if (responseJson.status === 'error') {
                container.innerHTML = `
                    <div class="h-full flex items-center justify-center">
                        <div class="bg-dark-800 p-6 rounded border border-red-500/50 max-w-lg shadow-2xl">
                            <h3 class="text-red-500 font-bold mb-2 flex items-center gap-2">
                                <i class="fa-solid fa-bug"></i> Compilation Failed
                            </h3>
                            <p class="text-gray-300 text-sm mb-4 font-mono bg-black/30 p-2 rounded">${responseJson.message}</p>
                            <div class="flex justify-between items-center mt-4">
                                <span class="text-xs text-red-300 font-mono">File: ${responseJson.file}</span>
                                <button onclick="editor.setView('visual')" class="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded transition">
                                    Fix in Editor
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                return;
            }

            // 4. Initialize HikarinVN Engine
            container.innerHTML = ''; // Clear previous instance

            if (window.HikarinVN) {
                console.log("🎮 Starting HikarinVN Engine...");
                console.log("📂 Asset Path: /media/");
                
                // Initialize
                this.vnEngine = new window.HikarinVN('vn-container', responseJson.data, {
                    assetsPath: "/media/", // Points to your FastAPI static mount
                    debug: true,           // Enables the bottom debug panel
                    globals: {}            // Initial save data (empty for now)
                });

                // Start
                this.vnEngine.start();
                
            } else {
                container.innerHTML = `
                    <div class="h-full flex items-center justify-center text-center">
                        <div>
                            <p class="text-red-500 font-bold mb-2">Engine Not Loaded</p>
                            <p class="text-gray-500 text-xs">Could not find 'HikarinVN' on window object.<br>Check your internet connection or script tags.</p>
                        </div>
                    </div>
                `;
            }

        } catch (e) {
            console.error("Game Launch Critical Error:", e);
            container.innerHTML = `
                <div class="h-full flex items-center justify-center">
                    <div class="text-red-500 bg-dark-950 p-4 border border-red-900 rounded">
                        <strong>System Error:</strong> ${e.message}
                    </div>
                </div>
            `;
        } finally {
            // Hide Loader with a tiny delay for smoothness
            setTimeout(() => {
                loader.classList.add('hidden');
            }, 300);
        }
    }
}