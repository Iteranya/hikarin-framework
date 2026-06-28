// js/main.js

import { FlowEditorManager } from './flow_manager/core.js';
import { FileManager } from './file_manager.js';
import { GameRunner } from './player/game_runner.js';
import { PlayerSidebar } from './player/player_sidebar.js';
import { loadLibraryData, openFormEditor, saveFormContent } from './form_editor.js';

function getProjectData() {
    const el = document.getElementById('project-data');
    const slug = el?.dataset?.slug || '';
    const group = el?.dataset?.group || '';

    if (slug && group) return { slug, group };

    const path = window.location.pathname;
    const parts = path.replace(/^\/+|\/+$/g, '').split('/');
    if (parts.length >= 3 && parts[0] === 'hikarin') {
        return { slug: parts[1], group: parts[2] };
    }

    console.error('Cannot determine project slug/group');
    return null;
}

async function initializeApp() {
    const data = getProjectData();
    if (!data) return;

    console.log(`🎮 Hikarin: "${data.slug}" / "${data.group}"`);

    // 1. Load library data (characters, sprites, audio, images)
    await loadLibraryData();

    // 2. File Manager
    const fileManager = new FileManager(data.slug, data.group);
    window.fileManager = fileManager;
    await fileManager.init();

    // 3. Flow Editor
    const flowEditor = new FlowEditorManager(fileManager);
    flowEditor._openFormEditor = openFormEditor;
    window.flowEditor = flowEditor;
    

    // ─── Override `selectScene` to use the form editor ───
    const originalSelectScene = flowEditor.selectScene.bind(flowEditor);
    flowEditor.selectScene = function (sceneId) {
        // Perform the original UI update (highlights, diagram)
        originalSelectScene(sceneId);
        // Open the form editor instead of the raw code tab
        openFormEditor(this, sceneId);
    };

    // ─── Provide a save method for auto‑save ───
    flowEditor._saveSceneContent = async (sceneId, code) => {
        const slug = flowEditor.fm.projectSlug;
        const filename = `${sceneId}.py`;
        try {
            const res = await fetch(`/api/projects/${slug}/file/${filename}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: code }),
            });
            document.getElementById('form-status').textContent = 'Saved ✓';
        } catch (e) {
            document.getElementById('form-status').textContent = 'Save failed!';
        }
    };

    // ─── Wire the toggle button from ACE back to form ───
    document.getElementById('btn-switch-to-form')?.addEventListener('click', () => {
        const sceneId = window.flowEditor._currentScene;
        if (!sceneId) return;
        // Discard raw ACE edits – form is always authoritative
        document.getElementById('flow-ace-container').classList.add('hidden');
        document.getElementById('flow-ace-container').style.display = 'none';
        document.getElementById('flow-script-content').classList.remove('hidden');
        openFormEditor(window.flowEditor, sceneId);
    });

    // ─── Manual save button in the form editor ───
    document.getElementById('btn-form-save')?.addEventListener('click', () => {
        const sceneId = window.flowEditor._currentScene;
        if (sceneId) saveFormContent(sceneId);
    });

    // 4. Game Runner & Player Sidebar
    const gameRunner = new GameRunner(data.slug, data.group, () => switchTab('flow'));
    const playerSidebar = new PlayerSidebar(gameRunner);

    // 5. Tab Switching (Flow / Play)
    const flowView = document.getElementById('flowView');
    const gameView = document.getElementById('gamePlayerView');
    const tabFlow = document.getElementById('tab-flow');
    const tabPlay = document.getElementById('tab-play');

    function switchTab(tab) {
        if (tab === 'flow') {
            tabFlow.classList.add('active');
            tabPlay.classList.remove('active');
            flowView.classList.remove('hidden');
            gameView.classList.add('hidden');
            playerSidebar.hideButton();
            playerSidebar.close();
            flowEditor.mount();
        } else {
            tabPlay.classList.add('active');
            tabFlow.classList.remove('active');
            flowView.classList.add('hidden');
            gameView.classList.remove('hidden');
            playerSidebar.showButton();
            flowEditor.unmount();
        }
    }

    tabFlow.addEventListener('click', () => switchTab('flow'));
    tabPlay.addEventListener('click', () => switchTab('play'));

    const btnPlayer = document.getElementById('btn-player-sidebar');
    if (btnPlayer) {
        btnPlayer.onclick = () => playerSidebar.toggle();
        btnPlayer.classList.remove('hidden');
    }

    // 6. Mount Flow by default
    flowEditor.mount();
    tabFlow.classList.add('active');
    playerSidebar.hideButton();
}

initializeApp();
