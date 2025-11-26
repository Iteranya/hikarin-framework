/**
 * @fileoverview Defines the 'vn_show_custom' block.
 * This block provides granular control over sprite positioning and scaling 
 * using an interactive modal editor.
 */

//================================================================================
// 1. THE CUSTOM FIELD FOR THE MODAL
//================================================================================

class FieldPlacementModal extends Blockly.Field {
  constructor(value) {
    // The value is a JSON string storing all placement data.
    // e.g., '{"wR":16,"hR":9,"wF":4,"hF":8,"col":7,"row":1}'
    super(value);
    this.SERIALIZABLE = true;
    this.CURSOR = 'pointer';
  }

  static fromJson(options) {
    // The value is passed directly from the block definition's "value" property.
    return new FieldPlacementModal(options['value']);
  }

  // Show a summary on the block itself.
  getDisplayText_() {
    try {
      const data = JSON.parse(this.getValue());
      // e.g., "at (7,1) in 16x9 grid"
      return `at (${data.col},${data.row}) in ${data.wR}x${data.hR} grid`;
    } catch (e) {
      return 'Edit Placement...';
    }
  }

  showEditor_() {
    // --- State variables for the modal ---
    let currentData = JSON.parse(this.getValue());
    let isDragging = false;
    let startCoords = { x: 0, y: 0 };
    let currentSelection = {
        col: currentData.col,
        row: currentData.row,
        wF: currentData.wF,
        hF: currentData.hF
    };

    // --- Create Modal UI Elements ---
    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
        position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.8)', zIndex: '10000',
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        backdropFilter: 'blur(4px)', opacity: '0', transition: 'opacity 0.2s ease-in-out'
    });

    const modal = document.createElement('div');
    Object.assign(modal.style, {
        backgroundColor: '#1e1e1e', width: 'auto', maxWidth: '90vw', padding: '24px',
        borderRadius: '12px', border: '1px solid #374151',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        fontFamily: '"Inter", system-ui, sans-serif', display: 'flex',
        flexDirection: 'column', gap: '20px', transform: 'scale(0.95)',
        transition: 'transform 0.2s ease-out'
    });
    
    // Header
    const header = document.createElement('div');
    header.innerText = "Sprite Placement & Sizing";
    Object.assign(header.style, { fontSize: '18px', fontWeight: '700', color: '#ffffff' });

    // --- Controls for Grid Size ---
    const controlsContainer = document.createElement('div');
    Object.assign(controlsContainer.style, { display: 'flex', gap: '16px', alignItems: 'center' });
    
    const createInput = (label, value) => {
        const wrapper = document.createElement('div');
        const lbl = document.createElement('label');
        lbl.innerText = label;
        Object.assign(lbl.style, { color: '#9ca3af', fontSize: '12px', marginRight: '8px' });
        
        const input = document.createElement('input');
        input.type = 'number';
        input.value = value;
        input.min = 1;
        input.max = 32; // A reasonable limit
        Object.assign(input.style, {
            width: '50px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #374151',
            backgroundColor: '#111827', color: '#e5e7eb', outline: 'none'
        });
        wrapper.append(lbl, input);
        return { wrapper, input };
    };
    
    const wRatioControl = createInput('Grid Width', currentData.wR);
    const hRatioControl = createInput('Grid Height', currentData.hR);
    controlsContainer.append(wRatioControl.wrapper, hRatioControl.wrapper);

    // --- Grid Area ---
    const gridContainer = document.createElement('div');
    Object.assign(gridContainer.style, {
        display: 'grid',
        border: '1px solid #374151',
        // Aspect ratio ensures it doesn't get squished
        aspectRatio: `${currentData.wR} / ${currentData.hR}`, 
        width: '640px', // A good default max size
        userSelect: 'none' // Prevent text selection while dragging
    });

    // --- Helper function to draw/update the grid ---
    const updateGrid = () => {
        const w = parseInt(wRatioControl.input.value, 10) || 16;
        const h = parseInt(hRatioControl.input.value, 10) || 9;

        gridContainer.innerHTML = ''; // Clear old grid
        gridContainer.style.gridTemplateColumns = `repeat(${w}, 1fr)`;
        gridContainer.style.gridTemplateRows = `repeat(${h}, 1fr)`;
        gridContainer.style.aspectRatio = `${w} / ${h}`;
        currentData.wR = w;
        currentData.hR = h;

        for (let r = 1; r <= h; r++) {
            for (let c = 1; c <= w; c++) {
                const cell = document.createElement('div');
                cell.dataset.col = c;
                cell.dataset.row = r;
                Object.assign(cell.style, {
                    borderRight: (c < w) ? '1px solid #2d2d2d' : 'none',
                    borderBottom: (r < h) ? '1px solid #2d2d2d' : 'none',
                    transition: 'background-color 0.1s ease'
                });
                gridContainer.appendChild(cell);
            }
        }
        updateSelectionHighlight();
    };

    // --- Helper function to update cell highlights ---
    const updateSelectionHighlight = () => {
    const { col, row, wF, hF } = currentSelection;
    const cells = gridContainer.childNodes;

    // These define your static, aesthetic highlight box.
    const guide = { col: 2, row: 7, w: 14, h: 4 };

    cells.forEach(cell => {
        const c = parseInt(cell.dataset.col, 10);
        const r = parseInt(cell.dataset.row, 10);
        
        const isSelected = c >= col && c < col + wF && r >= row && r < row + hF;
        const isAestheticGuide = c >= guide.col && c < guide.col + guide.w && r >= guide.row && r < guide.row + guide.h;

        if (isSelected) {
            // Priority 1: The user's interactive selection is always bright green.
            cell.style.backgroundColor = 'rgba(34, 197, 94, 0.6)';
            cell.style.boxShadow = 'inset 0 0 0 1px #22c55e';
        } else if (isAestheticGuide) {
            // Priority 2: If not selected, show the permanent aesthetic guide area.
            cell.style.backgroundColor = 'rgba(75, 85, 99, 0.4)'; // A subtle, darker gray highlight
            cell.style.boxShadow = 'none';
        } else {
            // Priority 3: Everything else is transparent.
            cell.style.backgroundColor = 'transparent';
            cell.style.boxShadow = 'none';
        }
    });
};

    // --- Drag-to-select Logic ---
    gridContainer.addEventListener('mousedown', (e) => {
        if (!e.target.dataset.col) return;
        isDragging = true;
        const col = parseInt(e.target.dataset.col, 10);
        const row = parseInt(e.target.dataset.row, 10);
        startCoords = { x: col, y: row };
        currentSelection = { col, row, wF: 1, hF: 1 };
        updateSelectionHighlight();
    });

    gridContainer.addEventListener('mousemove', (e) => {
        if (!isDragging || !e.target.dataset.col) return;
        
        const currentCol = parseInt(e.target.dataset.col, 10);
        const currentRow = parseInt(e.target.dataset.row, 10);

        const col = Math.min(startCoords.x, currentCol);
        const row = Math.min(startCoords.y, currentRow);
        const wF = Math.abs(startCoords.x - currentCol) + 1;
        const hF = Math.abs(startCoords.y - currentRow) + 1;

        if (col !== currentSelection.col || row !== currentSelection.row || wF !== currentSelection.wF || hF !== currentSelection.hF) {
            currentSelection = { col, row, wF, hF };
            updateSelectionHighlight();
        }
    });

const onMouseUp = () => {
        isDragging = false;
        // IMPORTANT: Clean up the listener from the document so it doesn't pile up.
        document.removeEventListener('mouseup', onMouseUp);
    };

    gridContainer.addEventListener('mousedown', (e) => {
        if (!e.target.dataset.col) return;
        e.preventDefault(); // Prevents annoying text selection while dragging.

        isDragging = true;
        const col = parseInt(e.target.dataset.col, 10);
        const row = parseInt(e.target.dataset.row, 10);
        startCoords = { x: col, y: row };
        currentSelection = { col, row, wF: 1, hF: 1 };
        updateSelectionHighlight();

        // Add the listener to the whole document. This ensures we catch the
        // mouse release even if the cursor has moved outside the grid.
        document.addEventListener('mouseup', onMouseUp);
    });

    gridContainer.addEventListener('mousemove', (e) => {
        if (!isDragging || !e.target.dataset.col) return;
        
        const currentCol = parseInt(e.target.dataset.col, 10);
        const currentRow = parseInt(e.target.dataset.row, 10);

        const col = Math.min(startCoords.x, currentCol);
        const row = Math.min(startCoords.y, currentRow);
        const wF = Math.abs(startCoords.x - currentCol) + 1;
        const hF = Math.abs(startCoords.y - currentRow) + 1;

        if (col !== currentSelection.col || row !== currentSelection.row || wF !== currentSelection.wF || hF !== currentSelection.hF) {
            currentSelection = { col, row, wF, hF };
            updateSelectionHighlight();
        }
    });

    // We no longer need the single-use `document.addEventListener` that was here.
    
    //================== DRAG LOGIC: END OF FIX ====================

    // --- Buttons ---
    const btnContainer = document.createElement('div');
    Object.assign(btnContainer.style, { display: 'flex', justifyContent: 'flex-end', gap: '8px' });
    
    const createButton = (text, primary = false) => {
        const btn = document.createElement('button');
        btn.innerText = text;
        Object.assign(btn.style, {
            padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: '500',
            fontSize: '14px', border: 'none', transition: 'background-color 0.15s, color 0.15s',
            backgroundColor: primary ? '#16a34a' : 'transparent',
            color: primary ? '#ffffff' : '#9ca3af'
        });
        btn.onmouseenter = () => {
             btn.style.backgroundColor = primary ? '#22c55e' : '#374151';
             btn.style.color = '#ffffff';
        };
        btn.onmouseleave = () => {
            btn.style.backgroundColor = primary ? '#16a34a' : 'transparent';
            btn.style.color = primary ? '#ffffff' : '#9ca3af';
        };
        return btn;
    };
    
    const saveBtn = createButton('Save', true);
    const cancelBtn = createButton('Cancel');
    btnContainer.append(cancelBtn, saveBtn);

    // --- Event Handlers for UI ---
    wRatioControl.input.addEventListener('change', updateGrid);
    hRatioControl.input.addEventListener('change', updateGrid);
    
    const closeEditor = () => {
        // This is a good safety measure in case the modal is closed mid-drag.
        document.removeEventListener('mouseup', onMouseUp);
        overlay.style.opacity = '0';
        modal.style.transform = 'scale(0.95)';
        setTimeout(() => document.body.removeChild(overlay), 200);
    };

    saveBtn.onclick = () => {
      // Final data to save
      const finalData = {
          wR: parseInt(wRatioControl.input.value, 10),
          hR: parseInt(hRatioControl.input.value, 10),
          wF: currentSelection.wF,
          hF: currentSelection.hF,
          col: currentSelection.col,
          row: currentSelection.row
      };
      this.setValue(JSON.stringify(finalData));
      closeEditor();
    };

    cancelBtn.onclick = closeEditor;
    overlay.onclick = (e) => { if(e.target === overlay) closeEditor(); };

    // --- Assemble and Show ---
    modal.append(header, controlsContainer, gridContainer, btnContainer);
    overlay.append(modal);
    document.body.appendChild(overlay);

    // Initial render
    updateGrid();
    
    // Animate in
    requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        modal.style.transform = 'scale(1)';
    });
  }
}

// --- SAFE REGISTRATION ---
try {
  Blockly.fieldRegistry.register('field_placement_modal', FieldPlacementModal);
} catch (e) {
  // Already registered, ignore
}


//================================================================================
// 2. THE BLOCK DEFINITION (Now simplified)
//================================================================================

export const definition = {
  "type": "vn_show_custom",
  "message0": "show custom %1 sprite %2 %3",
  "args0": [
    {
      "type": "field_input",
      "name": "CHAR_VAR",
      "text": "m"
    },
    {
      "type": "field_input",
      "name": "SPRITE_NAME",
      "text": "happy"
    },
    {
      "type": "field_placement_modal",
      "name": "PLACEMENT_DATA",
      // Default value as a JSON string
      "value": "{\"wR\":16,\"hR\":9,\"wF\":4,\"hF\":8,\"col\":7,\"row\":1}"
    }
  ],
  "previousStatement": null,
  "nextStatement": null,
  "colour": 160,
  "tooltip": "Shows a sprite with custom scaling and position, configured via an interactive editor.",
  "helpUrl": ""
};


//================================================================================
// 3. THE PYTHON GENERATOR (Updated to parse JSON)
//================================================================================

export const generator = (block) => {
  // 1. Identity
  const charVar = block.getFieldValue('CHAR_VAR');
  const spriteName = Blockly.Python.quote_(block.getFieldValue('SPRITE_NAME'));
  
  // 2. Get Placement Data from the custom field's JSON value
  const placementDataJSON = block.getFieldValue('PLACEMENT_DATA');
  const placementData = JSON.parse(placementDataJSON);

  const wRatio = placementData.wR;
  const hRatio = placementData.hR;
  const wFrame = placementData.wF;
  const hFrame = placementData.hF;
  const col = placementData.col;
  const row = placementData.row;
  
  // Build the argument list corresponding to the Python signature:
  // show_custom(character, sprite, wRatio, hRatio, wFrameRatio, hFrameRatio, colPos, rowPos, nested=False)
  const args = [
    charVar, 
    spriteName, 
    wRatio, 
    hRatio, 
    wFrame, 
    hFrame, 
    col, 
    row
  ];

  // Handle Conditional Nesting
  if (Blockly.Python._inCondActions) {
    args.push('nested=True');
  }

  return `vn.show_custom(${args.join(', ')})\n`;
};