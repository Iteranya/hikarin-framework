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
    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
        position: 'fixed', top: '0', left: '0',
        width: '100vw', height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.75)', // Darker dim
        zIndex: '10000',
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        backdropFilter: 'blur(4px)'
    });

    const modal = document.createElement('div');
    Object.assign(modal.style, {
        backgroundColor: '#1e1e1e', // Dark "Stone" gray
        width: '450px', padding: '20px',
        borderRadius: '0px', // BLOCKY (No rounded corners)
        boxShadow: '0 0 0 4px #5c5c5c, 0 15px 0 #000000', // Pixel-art style thick borders/shadow
        border: '4px solid #000000', 
        fontFamily: '"Consolas", "Courier New", monospace', // Monospace font
        display: 'flex', flexDirection: 'column', gap: '15px'
    });

    const label = document.createElement('div');
    label.innerText = "> Edit Dialogue_";
    Object.assign(label.style, {
        textAlign: 'left',
        fontSize: '20px',
        fontWeight: 'bold', 
        color: '#55FF55', // "Minecraft Chat" bright green
        textShadow: '2px 2px #000'
    });

    const textarea = document.createElement('textarea');
    textarea.value = this.getValue();
    Object.assign(textarea.style, {
        width: '100%', height: '150px', padding: '15px',
        borderRadius: '0px', // Square corners
        border: '2px solid #555',
        backgroundColor: '#111', // Almost black input background
        color: '#ffffff', // bright white text
        resize: 'vertical', fontSize: '14px', lineHeight: '1.4',
        outline: 'none', 
        fontFamily: 'inherit',
        boxSizing: 'border-box',
        boxShadow: 'inset 0 0 10px #000' // Inner shadow for depth
    });

    // Focus effects for that "Command Block" feel
    textarea.onfocus = () => {
        textarea.style.border = '2px solid #55FF55';
        textarea.style.backgroundColor = '#000';
    };
    textarea.onblur = () => {
        textarea.style.border = '2px solid #555';
        textarea.style.backgroundColor = '#111';
    };

    const btnContainer = document.createElement('div');
    Object.assign(btnContainer.style, {
        display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px'
    });

    // Helper to make buttons look like Minecraft buttons
    const styleMcButton = (btn, bgHex, borderHex) => {
        Object.assign(btn.style, {
            padding: '10px 24px', 
            backgroundColor: bgHex, 
            color: '#fff',
            border: `2px solid #000`,
            borderBottom: `4px solid #000`, // Thick bottom border for 3D effect
            borderRadius: '0px', cursor: 'pointer', 
            fontWeight: 'bold', fontSize: '14px',
            fontFamily: 'inherit',
            textTransform: 'uppercase',
            position: 'relative',
            top: '0px',
            transition: 'none' // Pixel art usually snaps, no smooth fade
        });

        // "Press" effect
        btn.onmousedown = () => {
            btn.style.borderBottom = `2px solid #000`;
            btn.style.top = '2px';
        };
        btn.onmouseup = () => {
            btn.style.borderBottom = `4px solid #000`;
            btn.style.top = '0px';
        };
        // Reset on mouse out
        btn.onmouseleave = btn.onmouseup;
    };

    const saveBtn = document.createElement('button');
    saveBtn.innerText = "Save";
    // Green (Grass Top)
    styleMcButton(saveBtn, '#3C8527', '#1E4814');

    const cancelBtn = document.createElement('button');
    cancelBtn.innerText = "Cancel";
    // Gray (Stone)
    styleMcButton(cancelBtn, '#757575', '#404040');

    const closeEditor = () => {
        if (document.body.contains(overlay)) {
            document.body.removeChild(overlay);
        }
    };

    saveBtn.onclick = () => {
        this.setValue(textarea.value);
        closeEditor();
    };
    cancelBtn.onclick = closeEditor;

    overlay.onclick = (e) => {
        if(e.target === overlay) closeEditor();
    }

    btnContainer.append(cancelBtn, saveBtn);
    modal.append(label, textarea, btnContainer);
    overlay.append(modal);
    document.body.appendChild(overlay);

    setTimeout(() => textarea.focus(), 0);
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
      "type": "field_variable", // <--- CHANGED TO VARIABLE
      "name": "CHAR_VAR",
      "variable": "m"
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
  "tooltip": "Displays text in the dialogue box for a specific character.",
  "helpUrl": ""
};

export const generator = (block) => {
  // Get the variable name (e.g., "m") safely
  const charVar = Blockly.Python.nameDB_.getName(
      block.getFieldValue('CHAR_VAR'),
      Blockly.Variables.NAME_TYPE
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