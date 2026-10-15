/**
 * js/player/state.js
 * Estado do jogador: posição, direção, chaves, inventário e flags do Mapa Encantado.
 */

const INVENTORY_SLOTS_COUNT = 20;

let playerInventoryItems = [];

let isEnchantedMapOpen = false;

let isMapBurning = false;

const player = {
  x: 6,
  y: 33,
  dir: 0,
  steps: 0,
  hasEnchantedMap: false,
  character: null,
  keys: {
    iron: false,
    gold: false
  },
  keysUsed: {
    iron: false,
    gold: false
  }
};

let animFrameId = null;
