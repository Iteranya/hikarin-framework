// js/custom_blocks/index.js

// 1. Import ALL block modules, including our new dynamic one
import * as story_setup from './story_setup.js';
import * as define_character from './define_character.js'; // This is the dynamic one
import * as vn_say from './vn_say.js';
// ... import all the others

// 2. Put them all in a list
const allBlockModules = [
  story_setup,
  define_character,
  vn_say,
  // ... all the others
];

/**
 * Gets all block definitions, creating dynamic ones on the fly.
 * @param {object} dynamicData - An object containing data needed by dynamic blocks.
 * @param {Array} dynamicData.characterOptions - The list of characters.
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

export function registerGenerators(pythonGenerator) {
  for (const module of allBlockModules) {
    // We only care about modules that export a generator function
    if (module.generator) {
      // We need to know the block's "type" string to register the generator.
      // We can get this from either the static `definition` object...
      let blockType = module.definition?.type;

      // ...or by calling the `createDefinition` factory if it's a dynamic block.
      // We call it without arguments here just to get the `type` property.
      // This assumes the function can handle being called with no args for this purpose.
      if (!blockType && module.createDefinition) {
        blockType = module.createDefinition([])?.type; // Pass empty array as a safe default
      }
      
      if (blockType) {
        // Associate the generator function with the block's type string.
        // e.g., pythonGenerator['vn_say'] = function(block) { ... }
        pythonGenerator[blockType] = module.generator;
      } else {
        console.warn('Could not determine block type for a module to register its generator.');
      }
    }
  }
}