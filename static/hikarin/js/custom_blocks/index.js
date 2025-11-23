
import * as story_setup from './setup/story_setup.js';
import * as define_character from './setup/define_character.js';
import * as vn_label from './flow/vn_label.js';
import * as vn_jump from './flow/vn_jump.js';
import * as vn_finish from './flow/vn_finish.js';
import * as vn_say from './dialogue/vn_say.js';
import * as vn_speak from './dialogue/vn_speak.js';
import * as vn_sound_effect from './dialogue/vn_sfx.js';
import * as vn_show from './sprites/vn_show.js';
import * as vn_remove from './sprites/vn_remove.js';
import * as vn_remove_sprite from './sprites/vn_remove_sprite.js';
import * as vn_set_variable from './variables/vn_set_variable.js';
import * as vn_modify_variable from './variables/vn_modify_variable.js';
import * as vn_choice from './choices/vn_choice.js';
import * as vn_conditional from './conditional/vn_conditional.js';
import * as vn_conditional_time from './conditional/vn_conditional_time.js';
import * as vn_idle_chats from './special/vn_idle.js';
import * as vn_unlock_dialogue from './special/vn_unlock_dialogue.js';


/**
 * A list of all imported block modules.
 * When you add a new block file, you must import it above and add it to this list.
 */
const allBlockModules = [
 story_setup,          // Assuming you'll create these files
  define_character,     // in a `setup/` directory
  
  // Category 1
  vn_label,
  vn_jump,
  vn_finish,

  // Category 2
  vn_say,
  vn_speak,
  vn_sound_effect,

  // Category 3
  vn_show,
  vn_remove,
  vn_remove_sprite,

  // Category 4
  vn_set_variable,
  vn_modify_variable,
  
  // Category 5
  vn_choice,

  // Category 6
  vn_conditional,
  vn_conditional_time,
  
  // Category 7
  vn_idle_chats,
  vn_unlock_dialogue,
];

/**
 * Gets all block definitions, creating dynamic ones on the fly.
 * @param {object} dynamicData - An object containing data needed by dynamic blocks.
 * @param {Array} dynamicData.characterOptions - The list of characters for dropdowns.
 */
export function getAllBlockDefinitions(dynamicData) {
  const definitions = [];
  for (const module of allBlockModules) {
    if (module.definition) {
      // It's a static block, just add its definition
      definitions.push(module.definition);
    } else if (module.createDefinition) {
      // It's a dynamic block! Call its factory function with the data.
      definitions.push(module.createDefinition(dynamicData.characterOptions));
    }
  }
  return definitions;
}

/**
 * Registers the Python generator for every block module that has one.
 * @param {Blockly.Generator} pythonGenerator - The Python generator instance.
 */
export function registerGenerators(pythonGenerator) {
  // Safety check: if pythonGenerator is still undefined, stop here to prevent crash.
  if (!pythonGenerator) {
    console.error("Python Generator is undefined. Check imports in main.js");
    return;
  }

  for (const module of allBlockModules) {
    if (module.generator) {
      let blockType = module.definition?.type;

      if (!blockType && module.createDefinition) {
        blockType = module.createDefinition([])?.type;
      }
      
      if (blockType) {
        // COMPATIBILITY FIX:
        // Newer Blockly uses pythonGenerator.forBlock[...]
        // Older Blockly uses pythonGenerator[...]
        if (pythonGenerator.forBlock) {
          pythonGenerator.forBlock[blockType] = module.generator;
        } else {
          pythonGenerator[blockType] = module.generator;
        }
      } else {
        console.warn('Could not determine block type for generator registration:', module);
      }
    }
  }
}