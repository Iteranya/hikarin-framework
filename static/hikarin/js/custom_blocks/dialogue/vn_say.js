/**
 * @fileoverview Defines the 'vn_say' block with a custom cute modal.
 */

class FieldCuteModal extends Blockly.Field {
  constructor(text) {
    super(text);
    this.SERIALIZABLE = true;
    this.CURSOR = 'text';
  }

  static fromJson(options) {
    let text = options['text'];
    // FIX: Check where the function lives based on Blockly version
    if (Blockly.utils.parsing && Blockly.utils.parsing.replaceMessageReferences) {
        text = Blockly.utils.parsing.replaceMessageReferences(text);
    } else if (Blockly.utils.replaceMessageReferences) {
        text = Blockly.utils.replaceMessageReferences(text);
    }
    // If neither works, just use the raw text (prevents the crash)
    return new FieldCuteModal(text);
  }

  // Truncate text on the block so it doesn't get huge
  getDisplayText_() {
    const text = this.getValue();
    if (!text) return '';
    if (text.length > 20) {
      return text.substring(0, 20) + '...';
    }
    return text;
  }

showEditor_() {
    // 1. Create Overlay (Matches: bg-black/80 backdrop-blur-sm)
    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
        position: 'fixed', top: '0', left: '0',
        width: '100vw', height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        zIndex: '10000',
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        backdropFilter: 'blur(4px)',
        opacity: '0', // Start invisible for fade-in
        transition: 'opacity 0.2s ease-in-out'
    });

    // 2. Create Modal (Matches: bg-dark-800 rounded-xl border border-gray-700 shadow-2xl)
    const modal = document.createElement('div');
    Object.assign(modal.style, {
        backgroundColor: '#1e1e1e', // bg-dark-800
        width: '450px', padding: '24px',
        borderRadius: '12px', // rounded-xl
        border: '1px solid #374151', // border-gray-700
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', // shadow-2xl
        fontFamily: '"Inter", system-ui, sans-serif', // Matches website font
        display: 'flex', flexDirection: 'column', gap: '16px',
        transform: 'scale(0.95)', // Start slightly small for pop-in
        transition: 'transform 0.2s ease-out'
    });

    // 3. Label (Matches: text-lg font-bold text-white)
    const label = document.createElement('div');
    label.innerText = "Edit Dialogue";
    Object.assign(label.style, {
        textAlign: 'left',
        fontSize: '18px',
        fontWeight: '700',
        color: '#ffffff',
        marginBottom: '4px'
    });

    // 4. Textarea (Matches: bg-dark-900 border-gray-700 rounded text-sm focus:border-mob-500)
    const textarea = document.createElement('textarea');
    textarea.value = this.getValue();
    Object.assign(textarea.style, {
        width: '100%', height: '150px', padding: '12px',
        borderRadius: '6px',
        border: '1px solid #374151', // border-gray-700
        backgroundColor: '#111827', // bg-dark-900 (approx)
        color: '#e5e7eb', // text-gray-200
        resize: 'vertical', fontSize: '14px', lineHeight: '1.5',
        outline: 'none',
        fontFamily: '"Fira Code", monospace', // Keep monospace for code/script editing
        boxSizing: 'border-box',
        transition: 'border-color 0.15s ease'
    });

    // Focus effects (Modern green glow instead of blocky border)
    textarea.onfocus = () => {
        textarea.style.borderColor = '#22c55e'; // mob-500
        textarea.style.boxShadow = '0 0 0 1px #22c55e'; // Subtle ring
    };
    textarea.onblur = () => {
        textarea.style.borderColor = '#374151'; // border-gray-700
        textarea.style.boxShadow = 'none';
    };

    // 5. Button Container
    const btnContainer = document.createElement('div');
    Object.assign(btnContainer.style, {
        display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px'
    });

    // 6. Buttons Styling
    const saveBtn = document.createElement('button');
    saveBtn.innerText = "Save";
    
    // Style: bg-mob-600 text-white rounded hover:bg-mob-500
    Object.assign(saveBtn.style, {
        padding: '8px 16px',
        backgroundColor: '#16a34a', // mob-600
        color: '#ffffff',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontWeight: '500', fontSize: '14px',
        transition: 'background-color 0.15s'
    });
    saveBtn.onmouseenter = () => saveBtn.style.backgroundColor = '#22c55e'; // mob-500
    saveBtn.onmouseleave = () => saveBtn.style.backgroundColor = '#16a34a';

    const cancelBtn = document.createElement('button');
    cancelBtn.innerText = "Cancel";

    // Style: text-gray-400 hover:text-white
    Object.assign(cancelBtn.style, {
        padding: '8px 16px',
        backgroundColor: 'transparent',
        color: '#9ca3af', // text-gray-400
        border: 'none',
        cursor: 'pointer',
        fontWeight: '500', fontSize: '14px',
        transition: 'color 0.15s'
    });
    cancelBtn.onmouseenter = () => cancelBtn.style.color = '#ffffff';
    cancelBtn.onmouseleave = () => cancelBtn.style.color = '#9ca3af';

    // 7. Logic (Unchanged)
    const closeEditor = () => {
        // Fade out animation
        overlay.style.opacity = '0';
        modal.style.transform = 'scale(0.95)';
        setTimeout(() => {
            if (document.body.contains(overlay)) {
                document.body.removeChild(overlay);
            }
        }, 200);
    };

    saveBtn.onclick = () => {
        this.setValue(textarea.value);
        closeEditor();
    };
    cancelBtn.onclick = closeEditor;

    overlay.onclick = (e) => {
        if(e.target === overlay) closeEditor();
    }

    // Assemble
    btnContainer.append(cancelBtn, saveBtn);
    modal.append(label, textarea, btnContainer);
    overlay.append(modal);
    document.body.appendChild(overlay);

    // Animation entry
    requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        modal.style.transform = 'scale(1)';
    });
    
    setTimeout(() => textarea.focus(), 50);
}
}

// SAFE REGISTRATION
try {
  Blockly.fieldRegistry.register('field_cute_modal', FieldCuteModal);
} catch (e) {
  // Already registered, ignore
}

export const definition = {
  "type": "vn_say",
  "message0": "character %1 says %2",
  "args0": [
    {
      "type": "field_variable",
      "name": "CHAR_VAR",
      "variable": "m",
      "variableTypes": ["Character"], // <--- THIS FILTERS OUT i, j, k
      "defaultType": "Character"      // <--- Ensures new vars created here are this type
    },
    {
      "type": "field_cute_modal", 
      "name": "DIALOGUE",
      "text": "Hello there!"
    }
  ],
  "previousStatement": null,
  "nextStatement": null,
  "colour": 210,
  "tooltip": "Displays text in the dialogue box.",
  "helpUrl": ""
};

export const generator = (block) => {
  // 1. Get the Variable ID
  const varId = block.getFieldValue('CHAR_VAR');
  
  // 2. Get the Variable Model to find the real name (e.g., "cupa")
  // Fallback to "m" if something breaks, though the extension prevents this.
  const varModel = block.workspace.getVariableById(varId);
  const varName = varModel ? varModel.name : "m";

  // 3. Convert that name to a Python-safe name
  const charVar = Blockly.Python.nameDB_.getName(
      varName,
      Blockly.Names.NameType.VARIABLE
  );

  const rawDialogue = block.getFieldValue('DIALOGUE');
  
  let dialogue;
  if (Blockly.Python && Blockly.Python.quote_) {
    dialogue = Blockly.Python.quote_(rawDialogue);
  } else {
    dialogue = JSON.stringify(rawDialogue);
  }

  const inCond = Blockly.Python && Blockly.Python._inCondActions;
  if (inCond) {
    return `vn.say(${charVar}, ${dialogue}, nested=True)\n`;
  } else {
    return `vn.say(${charVar}, ${dialogue})\n`;
  }
};