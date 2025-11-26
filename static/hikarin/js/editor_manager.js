import { GameRunner } from './player/game_runner.js';
import { PlayerSidebar } from './player/player_sidebar.js';

export class EditorManager {
    constructor(workspace, projectSlug, groupSlug) {
        this.workspace = workspace;
        
        // Initialize the Logic Handler
        this.gameRunner = new GameRunner(projectSlug, groupSlug, () => {
            this.setView('visual');
        });

        // Initialize Player Sidebar
        this.playerSidebar = new PlayerSidebar(this.gameRunner); 
        
        // State
        this.isCodeSidebarOpen = false; // Renamed for clarity
        this.currentView = 'visual'; 

        // DOM Cache
        this.dom = {
            visualTab: document.getElementById('tab-visual'),
            playTab: document.getElementById('tab-play'),
            blocklyDiv: document.getElementById('blocklyDiv'),
            gameView: document.getElementById('gamePlayerView'),
            codeSidebar: document.getElementById('pythonSidebar'), // Renamed key for clarity
            
            // Buttons
            btnCodeSidebar: document.getElementById('btn-code-sidebar'),
            btnPlayerSidebar: document.getElementById('btn-player-sidebar')
        };
        
        this.initListeners();
        setTimeout(() => this.resize(), 100);
    }

    // --- Initialization & Layout ---

    initListeners() {
        if (!this.workspace) return;
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        if (this.currentView === 'visual') {
            Blockly.svgResize(this.workspace);
        }
    }

    // --- Toolbar Actions ---

    undo() { this.workspace.undo(false); }
    redo() { this.workspace.undo(true); }
    zoom(dir) {
        if (dir === 0) {
            this.workspace.setScale(1);
            this.workspace.scrollCenter();
        } else {
            const current = this.workspace.getScale();
            this.workspace.setScale(current + (dir * 0.2));
        }
    }

    // --- Code Sidebar (Visual Mode) ---

    toggleCodeSidebar() {
        const btn = this.dom.btnCodeSidebar;
        this.isCodeSidebarOpen = !this.isCodeSidebarOpen;

        if (this.isCodeSidebarOpen) {
            this.dom.codeSidebar.classList.remove('hidden');
            this.dom.codeSidebar.classList.add('flex');
            btn.classList.add('bg-mob-600', 'text-white');
            btn.classList.remove('bg-gray-700');
            this.generateCode();
        } else {
            this.dom.codeSidebar.classList.add('hidden');
            this.dom.codeSidebar.classList.remove('flex');
            btn.classList.remove('bg-mob-600', 'text-white');
            btn.classList.add('bg-gray-700');
        }
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
        document.getElementById('generatedCode').select();
        document.execCommand('copy');
    }

    // --- Player Sidebar (Play Mode) ---

    togglePlayerSidebar() {
        // Delegate to the new class
        this.playerSidebar.toggle();
    }

    // --- View Switching ---

    async setView(view) {
        if (this.currentView === view) return;
        
        this.currentView = view;
        this.updateViewUI(view);
    }

    updateViewUI(view) {
        const { visualTab, playTab, blocklyDiv, gameView, codeSidebar, btnCodeSidebar } = this.dom;

        if (view === 'visual') {
            // 1. Activate Visual Tab
            visualTab.classList.replace('text-gray-400', 'text-white');
            visualTab.classList.add('active');
            playTab.classList.replace('text-white', 'text-gray-400');
            playTab.classList.remove('active');

            // 2. Show Canvas, Hide Game
            gameView.classList.add('hidden');
            gameView.classList.remove('flex');
            blocklyDiv.classList.remove('hidden');
            blocklyDiv.style.display = 'block';

            // 3. UI TOOLS: Show Code Button, Hide Player Button
            btnCodeSidebar.classList.remove('hidden');
            this.playerSidebar.hideButton();

            // 4. SIDEBARS: Restore Code Sidebar if was open, Force Hide Player Sidebar
            this.playerSidebar.close(); // Visually hide player sidebar
            if (this.isCodeSidebarOpen) {
                codeSidebar.classList.remove('hidden');
                codeSidebar.classList.add('flex');
            }

        } else {
            // 1. Activate Play Tab
            playTab.classList.replace('text-gray-400', 'text-white');
            playTab.classList.add('active');
            visualTab.classList.replace('text-white', 'text-gray-400');
            visualTab.classList.remove('active');

            // 2. Hide Canvas, Show Game
            blocklyDiv.classList.add('hidden');
            blocklyDiv.style.display = 'none';
            gameView.classList.remove('hidden');
            gameView.classList.add('flex');
            
            // 3. UI TOOLS: Hide Code Button, Show Player Button
            btnCodeSidebar.classList.add('hidden');
            this.playerSidebar.showButton();

            // 4. SIDEBARS: Force Hide Code Sidebar, Restore Player Sidebar if open
            codeSidebar.classList.add('hidden'); // Always hide code in game mode
            codeSidebar.classList.remove('flex');

            if (this.playerSidebar.isOpen) {
                this.playerSidebar.renderState(); // Restore visibility
            }
        }
    }
}