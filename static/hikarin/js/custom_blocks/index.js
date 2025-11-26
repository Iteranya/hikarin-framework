import * as story_setup from './setup/story_setup.js';
import * as define_character from './setup/define_character.js';
import * as vn_scene_setup from './setup/vn_scene_setup.js';
import * as vn_label from './flow/vn_label.js';
import * as vn_jump from './flow/vn_jump.js';
import * as vn_finish from './flow/vn_finish.js';
import * as vn_next from './flow/vn_next.js';
import * as vn_say from './dialogue/vn_say.js';
import * as vn_speak from './dialogue/vn_speak.js';
import * as vn_sound_effect from './dialogue/vn_sfx.js';
import * as vn_show from './sprites/vn_show.js';
import * as vn_remove from './sprites/vn_remove.js';
import * as vn_remove_sprite from './sprites/vn_remove_sprite.js';
import * as vn_show_custom from './sprites/vn_show_custom.js';
import * as vn_show_full from './sprites/vn_show_full.js';
import * as vn_set_variable from './variables/vn_set_variable.js';
import * as vn_modify_variable from './variables/vn_modify_variable.js';
import * as vn_choice from './choices/vn_choice.js';
import * as vn_choice_option from './choices/vn_choice_option.js';
import * as vn_conditional from './conditional/vn_conditional.js';
import * as vn_conditional_time from './conditional/vn_conditional_time.js';
import * as vn_idle_chats from './special/vn_idle.js';
import * as vn_unlock_dialogue from './special/vn_unlock_dialogue.js';

/**
 * A list of all imported block modules.
 */
const allBlockModules = [
  story_setup,
  define_character,
  vn_scene_setup,
  
  // Category 1
  vn_label,
  vn_jump,
  vn_finish,
  vn_next,

  // Category 2
  vn_say,
  vn_speak,
  vn_sound_effect,

  // Category 3
  vn_show,
  vn_remove,
  vn_remove_sprite,
  vn_show_custom,
  vn_show_full,

  // Category 4
  vn_set_variable,
  vn_modify_variable,
  
  // Category 5
  vn_choice,
  vn_choice_option,

  // Category 6
  vn_conditional,
  vn_conditional_time,
  
  // Category 7
  vn_idle_chats,
  vn_unlock_dialogue,
];

/**
 * Gets all block definitions, creating dynamic ones on the fly.
 * @param {object} dynamicData - Data needed by dynamic blocks.
 * @param {Array} dynamicData.characterOptions - List of characters [[Name, ID], ...]
 * @param {Array} dynamicData.spriteOptions - List of sprites [[File, File], ...]
 */
export function getAllBlockDefinitions(dynamicData) {
  console.log("🔍 DEBUG: Starting to gather block definitions...");
  
  // Destructure the options from the data object
  const { characterOptions, spriteOptions } = dynamicData;

  const definitions = [];
  
  for (const module of allBlockModules) {
    // 1. Static Definition (Simple blocks)
    if (module.definition) {
      definitions.push(module.definition);
    } 
    // 2. Dynamic Definition (Dropdowns populated from DB)
    else if (module.createDefinition || module.getDefinition) {
      // Compatibility: Support both function names
      const generatorFunc = module.createDefinition || module.getDefinition;

      // LOGIC: Decide which data to pass based on the module
      if (module === vn_show || module === vn_show_custom) {
        // vn_show needs SPRITES
        definitions.push(generatorFunc(spriteOptions));
      } else {
        // Default behavior (e.g., define_character needs CHARACTERS)
        definitions.push(generatorFunc(characterOptions));
      }
    } 
    else {
      console.warn("⚠️ DEBUG: Found a module without definition or createDefinition:", module);
    }
  }

  console.log(`✅ DEBUG: Found ${definitions.length} block definitions.`);
  return definitions;
}

/**
 * Registers the Python generator for every block module that has one.
 */
export function registerGenerators() {
  if (!Blockly.Python) {
    console.error("Python Generator is undefined. Check imports in main.js");
    return;
  }

  for (const module of allBlockModules) {
    if (module.generator) {
      let blockType = module.definition?.type;

      // If it's a dynamic block, we need to extract the type 
      // by temporarily calling the creation function.
      if (!blockType && (module.createDefinition || module.getDefinition)) {
        const generatorFunc = module.createDefinition || module.getDefinition;
        // Pass empty array just to extract the 'type' string safely
        const tempDef = generatorFunc([]); 
        blockType = tempDef?.type;
      }
      
      if (blockType) {
        // Fix for different Blockly versions
        if (Blockly.Python.forBlock) {
          Blockly.Python.forBlock[blockType] = module.generator;
        } else {
          Blockly.Python[blockType] = module.generator;
        }
      } else {
        console.warn('Could not determine block type for generator registration:', module);
      }
    }
  }
}