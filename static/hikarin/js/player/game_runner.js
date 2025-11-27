export class GameRunner {
    constructor(projectSlug, groupSlug, onExitCallback) {
        this.projectSlug = projectSlug;
        this.groupSlug = groupSlug;
        this.onExitCallback = onExitCallback;
        
        // DOM Elements
        this.engine = null;
        this.container = document.getElementById('vn-container');
        this.loader = document.getElementById('game-loader');
        
        // Callback hook for the Sidebar UI
        this.onDebugUpdate = null; 
        this.onLogUpdate = null;
        
        // -------------------------------------------------------------
        // STATE PERSISTENCE
        // We store the memory here so it survives when the player stops/restarts
        // -------------------------------------------------------------
        this.preservedGlobals = {}; 
        this.preservedVariables = {}; 
        this.preservedEnvironment = { isNight: false, isDay: true };
    }

    /**
     * Compiles the project and starts the engine.
     */
    async run() {
        this.toggleLoader(true);
        this.cleanup(); 

        try {
            // 1. Auto-save current work before running
            if (window.fileManager) {
                await window.fileManager.saveCurrentFile();
            }

            // 2. Compile Project
            const gameData = await this.compileProject();

            // 3. Initialize Engine with Data
            this.initEngine(gameData);

        } catch (error) {
            console.error("Game Runner Error:", error);
            this.renderError(error);
            throw error; // Re-throw so the Sidebar knows execution failed
        } finally {
            // Hide loader with a slight delay for smoothness
            setTimeout(() => this.toggleLoader(false), 300);
        }
    }

    /**
     * Stops the engine, saves the state, and updates the UI.
     */
    stop() {
        if (this.engine) {
            // Access the internal logic layer (support both structure styles)
            const logicLayer = this.engine.runtime || this.engine;
            
            if (logicLayer) {
                // 1. SNAPSHOT STATE
                // We Deep Copy (parse/stringify) to ensure we don't hold references to destroyed objects
                try {
                    this.preservedGlobals = logicLayer.globals ? JSON.parse(JSON.stringify(logicLayer.globals)) : {};
                    this.preservedVariables = logicLayer.variables ? JSON.parse(JSON.stringify(logicLayer.variables)) : {};
                    
                    console.log("💾 Game Stopped. State Preserved:", {
                        globals: this.preservedGlobals,
                        locals: this.preservedVariables
                    });
                } catch (e) {
                    console.error("Failed to snapshot state:", e);
                }

                // 2. UPDATE UI (Final "Stopped" State)
                // This ensures the Sidebar shows the values as they were at the moment of stopping
                if (this.onDebugUpdate) {
                    this.onDebugUpdate(
                        this.preservedGlobals, 
                        this.preservedVariables, 
                        "STOPPED"
                    );
                }
            }
        }

        // 3. CLEANUP VISUALS
        this.cleanup();
    }

    resetState() {
        console.log("🔥 Purging Persistent Data...");
        
        // 1. Wipe Data
        this.preservedGlobals = {};
        this.preservedVariables = {};
        this.preservedEnvironment = { isNight: false, isDay: true };

        // 2. Update UI (Visual Feedback)
        if (this.onDebugUpdate) {
            this.onDebugUpdate({}, {}, "DATA PURGED");
        }
    }

    setEnvironment(key, value) {
        // Update the preserved state so it persists
        this.preservedEnvironment[key] = value;
        
        // Also update the live engine if it's currently running
        if (this.engine) {
            this.engine.setEnvironment(key, value);
        }
    }

    /**
     * Internal: Fetches compiled JSON from the server.
     */
    async compileProject() {
    const url = `/api/projects/${this.projectSlug}/compile_temp/${this.groupSlug}`;
    
    // We'll wrap the whole thing in a try...catch to be safe, 
    // though the primary error handling is inside.
    try {
        const res = await fetch(url, { method: 'POST' });

        // This block now correctly handles all non-2xx responses (like 400, 404, 500)
        if (!res.ok) {
            // The server sent an error. We need to parse the JSON body to get the 'detail' message.
            const errorData = await res.json(); // e.g., { "detail": "Script Validation Error: ..." }
            
            // Throw an error with the USEFUL message from the server.
            // Use errorData.detail, and have a fallback just in case.
            throw new Error(errorData.detail || `API Error: ${res.status} ${res.statusText}`);
        }
        
        // If we get here, the request was successful (status 200 OK)
        const responseJson = await res.json();

        // The old check for `responseJson.status === 'error'` is no longer needed.
        // That kind of error is now caught by the `!res.ok` check above.
        // A successful response will always have `status: 'success'`.

        return responseJson.data;

    } catch (error) {
        // This outer catch will grab the error we threw above, or any network-level errors.
        console.error("Caught in compileProject:", error);
        // Re-throw the error so the calling function can handle it (e.g., display it in the UI).
        throw error;
    }
}

    /**
     * Internal: Instantiates the Engine with the persistent data.
     */
    initEngine(gameData) {
        if (!window.HikarinVN) {
            throw new Error("HikarinVN engine script not found on window.");
        }

        console.log("🎮 Initializing Engine with Preserved State...");

        // 1. Instantiate Engine
        this.engine = new window.HikarinVN('vn-container', gameData, {
            assetsPath: "/media/",
            debug: true,
            globals: this.preservedGlobals,
            variables: this.preservedVariables 
        });

        // MODIFIED: Apply the preserved environment state AFTER engine creation
        for (const key in this.preservedEnvironment) {
            this.engine.setEnvironment(key, this.preservedEnvironment[key]);
        }

        // 2. Attach Debug Hooks
        const logicLayer = this.engine.runtime || this.engine;

        if (logicLayer && logicLayer.events) {
            // Hook for variable/state updates
            logicLayer.events.onUpdateDebug = (globals, variables, state) => {
                if (this.onDebugUpdate) {
                    this.onDebugUpdate(globals, variables, state);
                }
            };

            // --- NEW: Hook for log events ---
            logicLayer.events.onLog = (logEntry) => {
                if (this.onLogUpdate) {
                    this.onLogUpdate(logEntry);
                }
            };
            // --- END NEW ---

        } else {
            console.warn("⚠️ GameRunner: Could not attach debug hooks. 'events' object not found.");
        }

        // 3. Start
        this.engine.start();
    }

    /**
     * Internal: Cleans up DOM and Engine instance.
     */
    cleanup() {
        if (this.engine) {
            if(this.engine.stop) this.engine.stop();
            if(this.engine.destroy) this.engine.destroy();
            this.engine = null; 
        }
        if (this.container) this.container.innerHTML = '';
    }

    toggleLoader(show) {
        if (!this.loader) return;
        if (show) this.loader.classList.remove('hidden');
        else this.loader.classList.add('hidden');
    }

    /**
     * Internal: Displays error overlay.
     */
    renderError(error) {
        const isCompilation = error.type === 'compilation';
        const title = isCompilation ? 'Compilation Failed' : 'System Error';
        const fileHtml = error.file ? `<span class="text-xs text-red-300 font-mono">File: ${error.file}</span>` : '';
        const btnId = `btn-err-back-${Date.now()}`;

        this.container.innerHTML = `
            <div class="h-full flex items-center justify-center">
                <div class="bg-dark-800 p-6 rounded border border-red-500/50 max-w-lg shadow-2xl">
                    <h3 class="text-red-500 font-bold mb-2 flex items-center gap-2">
                        <i class="fa-solid fa-bug"></i> ${title}
                    </h3>
                    <p class="text-gray-300 text-sm mb-4 font-mono bg-black/30 p-2 rounded">${error.message}</p>
                    <div class="flex justify-between items-center mt-4">
                        ${fileHtml}
                        <button id="${btnId}" class="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded transition">
                            Back to Editor
                        </button>
                    </div>
                </div>
            </div>
        `;

        setTimeout(() => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.onclick = () => {
                    if (this.onExitCallback) this.onExitCallback();
                };
            }
        }, 0);
    }
}