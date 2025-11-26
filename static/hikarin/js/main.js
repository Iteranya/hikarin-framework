// js/main.js

const Blockly = window.Blockly;
import { EditorManager } from './editor_manager.js';
import { FileManager } from './file_manager.js';
import { getAllBlockDefinitions, registerGenerators } from './custom_blocks/index.js';

console.log("🚀 DEBUG: Main.js loaded");

function getProjectData() {
    const container = document.getElementById('project-data'); 
    if (!container) {
        console.error("⛔ CRITICAL: DOM Element #project-data not found!");
        return null;
    }
    return {
        slug: container.dataset.slug,
        group: container.dataset.group
    };
}

// Ensure this matches define_character.js exactly
function sanitizeVariableName(text) {
  let clean = text.replace(/[^a-zA-Z0-9_]/g, '_');
  if (/^[0-9]/.test(clean)) {
    clean = 'char_' + clean;
  }
  return clean.toLowerCase();
}

async function initializeApp() {
    const data = getProjectData();
    if (!data) return;

    console.log(`🎮 DEBUG: Project: "${data.slug}" | Group: "${data.group}"`);

    // ---------------------------------------------------------
    // 1. Fetch Characters & Sprites
    // ---------------------------------------------------------
    let characterOptions = [];
    let spriteMap = {};

    try {
        console.log("🔄 Fetching characters...");
        const charRes = await fetch('/api/library/characters');
        const characters = await charRes.json();
        characterOptions = characters.map(char => [char.name, char.id]);

        console.log("🔄 Fetching sprite map...");
        const mapRes = await fetch('/api/library/sprite-map'); 
        const rawMap = await mapRes.json(); 

        // Process the map
        Object.keys(rawMap).forEach(charId => {
            const varName = sanitizeVariableName(charId);
            const sprites = rawMap[charId];
            
            // Log for debugging
            console.log(`🔹 Map Entry: ID="${charId}" -> Var="${varName}" | Sprites: ${sprites.length}`);

            if (sprites.length > 0) {
                spriteMap[varName] = sprites.map(s => [s, s]);
            } else {
                // If backend returns empty list, ensure we don't crash but show fallback later
                spriteMap[varName] = []; 
            }
        });

        console.log("✅ Final Sprite Map Keys:", Object.keys(spriteMap));

    } catch (error) {
        console.error("⛔ Failed to load library data:", error);
    }

    // ---------------------------------------------------------
    // 2. Define Blocks
    // ---------------------------------------------------------
    // IMPORTANT: We pass 'spriteMap' into 'spriteOptions'
    const allDefinitions = getAllBlockDefinitions({
        characterOptions: characterOptions,
        spriteOptions: spriteMap 
    });

    Blockly.defineBlocksWithJsonArray(allDefinitions);
    registerGenerators(Blockly.Python);

    // 3. Inject Workspace
    const workspace = Blockly.inject('blocklyDiv', {
        toolbox: document.getElementById('toolbox'),
        scrollbars: true,
        grid: { spacing: 20, length: 3, colour: '#2d2d2d', snap: true },
        zoom: { controls: true, wheel: true, startScale: 1.0 },
        renderer: 'zelos',
        sounds: false 
    });

    // 4. Initialize Managers
    const editor = new EditorManager(workspace, data.slug, data.group);
    const fileManager = new FileManager(data.slug, data.group, editor, workspace);

    window.editor = editor;
    window.fileManager = fileManager;

    // 5. Setup Auto-Save
    let saveTimeout;
    workspace.addChangeListener((e) => {
        if (e.type === Blockly.Events.UI || e.type === Blockly.Events.VIEWPORT_CHANGE) return;
        
        editor.generateCode(); 
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => fileManager.saveCurrentFile(), 2000); 
    });

    await fileManager.init();
}

initializeApp();