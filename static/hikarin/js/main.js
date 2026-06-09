// js/main.js

import { FlowEditorManager } from './flow_manager/core.js';
import { FileManager } from './file_manager.js';
import { GameRunner } from './player/game_runner.js';
import { PlayerSidebar } from './player/player_sidebar.js';

function getProjectData() {
    const el = document.getElementById('project-data');
    const slug = el?.dataset?.slug || '';
    const group = el?.dataset?.group || '';

    // If server-side template didn't populate, extract from URL
    if (slug && group) return { slug, group };

    // URL: /hikarin/{slug}/{group}
    const path = window.location.pathname;
    const parts = path.replace(/^\/+|\/+$/g, '').split('/');
    // parts = ['hikarin', 'testing', 'test']
    if (parts.length >= 3 && parts[0] === 'hikarin') {
        return { slug: parts[1], group: parts[2] };
    }

    console.error('Cannot determine project slug/group from URL or DOM');
    return null;
}


async function initializeApp() {
    const data = getProjectData();
    if (!data) return;

    console.log(`🎮 Hikarin: "${data.slug}" / "${data.group}"`);

    // ─── 1. File Manager ─────────────────────
    const fileManager = new FileManager(data.slug, data.group);
    window.fileManager = fileManager;
    await fileManager.init();

    // ─── 2. Flow Editor ──────────────────────
    const flowEditor = new FlowEditorManager(fileManager);
    window.flowEditor = flowEditor;

    // Auto-create labels when new script is created
    fileManager.onFileCreated = async (filename) => {
        setTimeout(async () => {
            await flowEditor._ensureAllLabels();
            await flowEditor.renderAll();
        }, 600);
    };

    // ─── 3. Game Runner & Player ─────────────
    const gameRunner = new GameRunner(data.slug, data.group, () => switchTab('flow'));
    const playerSidebar = new PlayerSidebar(gameRunner);

    // ─── 4. Tab Switching ────────────────────
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
            playerSidebar.close();              // ← ADD THIS
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

    // ─── 5. Player Sidebar Button ────────────
    const btnPlayer = document.getElementById('btn-player-sidebar');
    if (btnPlayer) {
        btnPlayer.onclick = () => playerSidebar.toggle();
        btnPlayer.classList.remove('hidden'); // visible in play mode
    }

    // ─── 6. Mount Flow by default ────────────
    flowEditor.mount();
    tabFlow.classList.add('active');
    playerSidebar.hideButton();
}

initializeApp();
