/**
 * @fileoverview This is the central hub for all custom Blockly blocks.
 * It imports every block module and exports functions to register them
 * with Blockly. This pattern is called a "barrel file".
 */

// --- CATEGORY 0: SETUP BLOCKS ---
// These are special blocks for defining the story's structure and characters.
// We'll imagine they have their own folder for tidiness.
// import * as story_setup from './setup/story_setup.js';
// import * as define_character from './setup/define_character.js';

// --- CATEGORY 1: STORY FLOW & STRUCTURE ---
import * as vn_label from './flow/vn_label.js';
import * as vn_jump from './flow/vn_jump.js';
import * as vn_finish from './flow/vn_finish.js';

// --- CATEGORY 2: DIALOGUE & PRESENTATION ---
import * as vn_say from './dialogue/vn_say.js';
import * as vn_speak from './dialogue/vn_speak.js';
import * as vn_background from './dialogue/vn_background.js';
import * as vn_music from './category2_dialogue/vn_music.js';
import * as vn_sound_effect from './category2_dialogue/vn_sound_effect.js';

// --- CATEGORY 3: CHARACTER SPRITES ---
import * as vn_show from './category3_sprites/vn_show.js';
import * as vn_remove from './category3_sprites/vn_remove.js';
import * as vn_remove_sprite from './category3_sprites/vn_remove_sprite.js';

// --- CATEGORY 4: VARIABLES (LOCAL & GLOBAL) ---
import * as vn_set_variable from './category4_variables/vn_set_variable.js';
import * as vn_modify_variable from './category4_variables/vn_modify_variable.js';

// --- CATEGORY 5: CHOICES & BRANCHING ---
import * as vn_choice from './category5_choices/vn_choice.js';

// --- CATEGORY 6: CONDITIONAL LOGIC ---
import * as vn_conditional from './category6_conditionals/vn_conditional.js';
import * as vn_conditional_time from './category6_conditionals/vn_conditional_time.js';

// --- CATEGORY 7: SPECIAL GAME LOGIC ---
import * as vn_idle_chats from './category7_special/vn_idle_chats.js';
import * as vn_unlock_dialogue from './category7_special/vn_unlock_dialogue.js';


/**
 * A list of all imported block modules.
 * When you add a new block file, you must import it above and add it to this list.
 */
const allBlockModules = [
  // story_setup,          // Assuming you'll create these files
  // define_character,     // in a `setup/` directory
  
  // Category 1
  vn_label,
  vn_jump,
  vn_finish,

  // Category 2
  vn_say,
  vn_speak,
  vn_background,
  vn_music,
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
  for (const module of allBlockModules) {
    if (module.generator) {
      let blockType = module.definition?.type;

      if (!blockType && module.createDefinition) {
        // For dynamic blocks, we call the factory with empty data just to get the type.
        blockType = module.createDefinition([])?.type;
      }
      
      if (blockType) {
        pythonGenerator[blockType] = module.generator;
      } else {
        console.warn('Could not determine block type for a module to register its generator.', module);
      }
    }
  }
}