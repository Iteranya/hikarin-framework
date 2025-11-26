export class PlayerSidebar {
    constructor(gameRunner) {
        this.gameRunner = gameRunner;
        this.isOpen = false;
        this.isRunning = false;
        
        this.dom = {
            sidebar: document.getElementById('playerSidebar'),
            button: document.getElementById('btn-player-sidebar'),
            content: document.getElementById('playerSidebarContent') 
        };

        this.renderContent();
    }

    renderContent() {
        // Changed grid layout to accommodate the new button
        this.dom.content.innerHTML = `
            <div class="flex flex-col h-full">
                <div class="p-4 border-b border-gray-700 bg-gray-800/50">
                    <h3 class="text-gray-100 font-bold mb-3 flex items-center gap-2">
                        <i class="fa-solid fa-gamepad"></i> Runtime Controls
                    </h3>
                    
                    <div class="flex gap-2">
                        <!-- Play -->
                        <button id="ps-btn-play" class="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-700 hover:bg-green-600 text-white text-sm font-bold rounded transition">
                            <i class="fa-solid fa-play"></i>
                        </button>
                        
                        <!-- Stop -->
                        <button id="ps-btn-stop" disabled class="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-700 text-gray-500 text-sm font-bold rounded cursor-not-allowed transition">
                            <i class="fa-solid fa-stop"></i>
                        </button>

                        <!-- NEW: Reset/Purge -->
                        <button id="ps-btn-reset" class="flex-0 px-3 py-2 bg-orange-700 hover:bg-orange-600 text-white text-sm font-bold rounded transition" title="Purge Variables">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
    
                    <div class="mt-3">
                        <button id="ps-btn-env" disabled class="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-700 text-gray-500 text-sm font-bold rounded cursor-not-allowed transition">
                            <i class="fa-solid fa-sun"></i>
                            <span>Set to Night</span>
                        </button>
                    </div>

                    <div id="ps-status-bar" class="mt-3 text-xs font-mono text-gray-400 text-center border border-gray-700 rounded p-1">State: IDLE</div>
                </div>

                <div class="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    <h4 class="text-xs uppercase text-gray-500 font-bold mb-2 tracking-wider">Debug Variables</h4>
                    <div id="ps-debug-output" class="text-xs font-mono text-gray-300 space-y-1">
                        <span class="italic opacity-50">Game not running.</span>
                    </div>
                </div>
            </div>
        `;

        this.dom.btnPlay = document.getElementById('ps-btn-play');
        this.dom.btnStop = document.getElementById('ps-btn-stop');
        this.dom.btnReset = document.getElementById('ps-btn-reset'); // Cache new button
        this.dom.btnEnv = document.getElementById('ps-btn-env'); // NEW
        this.dom.status = document.getElementById('ps-status-bar');
        this.dom.debug = document.getElementById('ps-debug-output');

        this.dom.btnPlay.addEventListener('click', () => this.handlePlay());
        this.dom.btnStop.addEventListener('click', () => this.handleStop());
        this.dom.btnReset.addEventListener('click', () => this.handleReset()); // Listener
        this.dom.btnEnv.addEventListener('click', () => this.handleToggleEnvironment()); // NEW
    }

    async handlePlay() {
        if (this.isRunning) return;
        this.setRunningState(true);
        this.updateStatus("COMPILING...");
        if(this.dom.debug) this.dom.debug.classList.remove('opacity-60', 'grayscale');

        try {
            this.gameRunner.onDebugUpdate = (globals, variables, state) => {
                this.updateDebugView(globals, variables, state);
            };
            await this.gameRunner.run();
            this.updateStatus("RUNNING");
        } catch (e) {
            this.setRunningState(false);
            this.updateStatus("ERROR");
            console.error(e);
        }
    }

    handleStop() {
        if (!this.isRunning) return;
        this.gameRunner.stop();
        this.setRunningState(false);
        this.updateStatus("STOPPED");
        if(this.dom.debug) this.dom.debug.classList.add('opacity-60', 'grayscale');
    }

    // ------------------------------------------------------------------
    // NEW: Handle Reset Click
    // ------------------------------------------------------------------
    handleReset() {
        if (this.isRunning) return;
        if (confirm("Are you sure you want to purge all saved variables?")) {
            this.gameRunner.resetState();
            
            // NEW: Reset the UI state to match the runner's reset state
            this.isNight = false;
            this.updateEnvironmentButton();

            if(this.dom.debug) this.dom.debug.classList.remove('opacity-60', 'grayscale');
        }
    }

    handleToggleEnvironment() {
        if (!this.isRunning) return; // Only works while running
        
        this.isNight = !this.isNight;

        // Tell the GameRunner about the change
        this.gameRunner.setEnvironment('isNight', this.isNight);
        this.gameRunner.setEnvironment('isDay', !this.isNight);

        // Update the button's appearance
        this.updateEnvironmentButton();
    }

    updateEnvironmentButton() {
        const icon = this.dom.btnEnv.querySelector('i');
        const text = this.dom.btnEnv.querySelector('span');
        
        if (this.isNight) {
            icon.className = 'fa-solid fa-moon';
            text.textContent = 'Set to Day';
        } else {
            icon.className = 'fa-solid fa-sun';
            text.textContent = 'Set to Night';
        }
    }


    setRunningState(running) {
        this.isRunning = running;

        if (running) {
            // PLAYING: Disable Play & Reset, Enable Stop
            this.toggleBtn(this.dom.btnPlay, false, 'bg-green-700');
            this.toggleBtn(this.dom.btnStop, true, 'bg-red-700');
            this.toggleBtn(this.dom.btnEnv, true, 'bg-blue-700'); // MODIFIED
            
            // Disable Reset
            this.dom.btnReset.disabled = true;
            this.dom.btnReset.classList.add('bg-gray-700', 'text-gray-500', 'cursor-not-allowed');
            this.dom.btnReset.classList.remove('bg-orange-700', 'hover:bg-orange-600', 'text-white');
        } else {
            // IDLE: Enable Play & Reset, Disable Stop
            this.toggleBtn(this.dom.btnPlay, true, 'bg-green-700');
            this.toggleBtn(this.dom.btnStop, false, 'bg-red-700');
            this.toggleBtn(this.dom.btnEnv, true, 'bg-blue-700'); // MODIFIED

            // Enable Reset
            this.dom.btnReset.disabled = false;
            this.dom.btnReset.classList.remove('bg-gray-700', 'text-gray-500', 'cursor-not-allowed');
            this.dom.btnReset.classList.add('bg-orange-700', 'hover:bg-orange-600', 'text-white');
        }
    }

    // Helper to toggle buttons cleanly
    toggleBtn(btn, enable, colorClass) {
        if (enable) {
            btn.disabled = false;
            btn.classList.remove('bg-gray-700', 'text-gray-500', 'cursor-not-allowed');
            btn.classList.add(colorClass, 'text-white');
        } else {
            btn.disabled = true;
            btn.classList.add('bg-gray-700', 'text-gray-500', 'cursor-not-allowed');
            btn.classList.remove(colorClass, 'text-white');
        }
    }

    updateStatus(text) { if(this.dom.status) this.dom.status.innerText = `State: ${text}`; }
    
    updateDebugView(globals, variables, engineState) {
        if (!this.dom.debug) return;

        if (engineState === "STOPPED") this.updateStatus("STOPPED (Data Preserved)");
        else if (engineState === "DATA PURGED") this.updateStatus("DATA PURGED");
        else this.updateStatus(engineState);

        const renderRow = (key, val, color) => `
            <div class="flex justify-between border-b border-gray-800 pb-1">
                <span class="text-${color}-400">${key}:</span>
                <span class="text-gray-200">${val}</span>
            </div>`;

        let html = '';
        html += `<div class="mb-2 font-bold text-gray-500 text-[10px]">LOCALS</div>`;
        const localKeys = Object.keys(variables);
        if(localKeys.length === 0) html += `<div class="text-gray-600 italic text-[10px] mb-2">None</div>`;
        localKeys.forEach(k => html += renderRow(k, variables[k], 'blue'));

        html += `<div class="mt-4 mb-2 font-bold text-gray-500 text-[10px]">GLOBALS</div>`;
        const globalKeys = Object.keys(globals);
        if(globalKeys.length === 0) html += `<div class="text-gray-600 italic text-[10px]">None</div>`;
        globalKeys.forEach(k => html += renderRow(k, globals[k], 'purple'));

        this.dom.debug.innerHTML = html;
    }

    toggle() { this.isOpen = !this.isOpen; this.renderState(); }
    close() { this.dom.sidebar.classList.add('hidden'); this.dom.sidebar.classList.remove('flex'); this.dom.button.classList.remove('bg-blue-600', 'text-white'); this.dom.button.classList.add('bg-gray-700'); }
    renderState() {
        if (this.isOpen) { this.dom.sidebar.classList.remove('hidden'); this.dom.sidebar.classList.add('flex'); this.dom.button.classList.add('bg-blue-600', 'text-white'); this.dom.button.classList.remove('bg-gray-700'); } 
        else { this.dom.sidebar.classList.add('hidden'); this.dom.sidebar.classList.remove('flex'); this.dom.button.classList.remove('bg-blue-600', 'text-white'); this.dom.button.classList.add('bg-gray-700'); }
    }
    showButton() { this.dom.button.classList.remove('hidden'); }
    hideButton() { this.dom.button.classList.add('hidden'); }
}