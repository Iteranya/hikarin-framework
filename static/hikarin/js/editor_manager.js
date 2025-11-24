// static/hikarin/js/editor_manager.js

export class EditorManager {
    constructor(workspace) {
        this.workspace = workspace;
        this.isPreviewOpen = false;
        this.currentView = 'visual';

        this.initListeners();
        setTimeout(() => this.resize(), 100);
    }

    // --- Initialization ---
    initListeners() {
        if (!this.workspace) {
            console.error("EditorManager ERROR: Workspace not provided!");
            return;
        }
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        Blockly.svgResize(this.workspace);
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

    // --- Preview Toggle ---
    toggleLivePreview() {
        const preview = document.getElementById('codePreview');
        const btn = document.getElementById('btn-preview');

        this.isPreviewOpen = !this.isPreviewOpen;

        if (this.isPreviewOpen) {
            preview.classList.remove('hidden');
            preview.classList.add('flex');
            btn.classList.add('bg-mob-600', 'text-white');
            btn.classList.remove('bg-gray-700');
        } else {
            preview.classList.add('hidden');
            preview.classList.remove('flex');
            btn.classList.remove('bg-mob-600', 'text-white');
            btn.classList.add('bg-gray-700');
        }
        this.resize();
    }

    // --- Visual ↔ Code Tab Switch ---
    setView(view) {
        this.currentView = view;
        const visualTab = document.getElementById('tab-visual');
        const codeTab = document.getElementById('tab-code');
        const blocklyDiv = document.getElementById('blocklyDiv');
        const codeEditor = document.getElementById('codeEditorView');
        const previewPanel = document.getElementById('codePreview');

        if (view === 'visual') {
            visualTab.classList.add('active', 'text-white');
            visualTab.classList.remove('text-gray-400');
            codeTab.classList.remove('active', 'text-white');
            codeTab.classList.add('text-gray-400');

            blocklyDiv.style.visibility = 'visible';
            codeEditor.classList.add('hidden');

            if (this.isPreviewOpen) previewPanel.classList.remove('hidden');

            this.resize();
        } else {
            const code = Blockly.Python.workspaceToCode(this.workspace);
            
            // Note: fullSourceCode is updated by file_manager on save,
            // but for immediate viewing we can show generated code or keep existing
            // Usually file_manager handles populating fullSourceCode
            
            codeTab.classList.add('active', 'text-white');
            codeTab.classList.remove('text-gray-400');
            visualTab.classList.remove('active', 'text-white');
            visualTab.classList.add('text-gray-400');

            blocklyDiv.style.visibility = 'hidden';
            previewPanel.classList.add('hidden');
            codeEditor.classList.remove('hidden');
        }
    }

    // --- Code Generation ---
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
}