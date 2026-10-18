/**
 * js/player/state.js
 * Estado do jogador: posição, direção, chaves, moedas, inventário e flags do Mapa Encantado.
 */

const INVENTORY_SLOTS_COUNT = 20;

// Limite de moedas (dobrões de ouro) que o jogador pode carregar por enquanto.
const MAX_COINS = 99;

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
  coins: 0,
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
