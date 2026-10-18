/**
 * js/core/config.js
 * Constantes do grid 36x36, temas de masmorra e variáveis globais do mapa atual
 * (grid, salas, portas, botões, chaves e moedas no chão).
 */

const MAP_SIZE = 36;

const TILE_FREE = 0;

const TILE_WALL = 1;

const TILE_DOOR = 2;

const TILE_ENTRANCE_DOOR = 3;

const TILE_SPECIAL_DOOR = 4;

const DIRECTIONS = [
  { name: 'Norte', short: 'N', dx: 0,  dy: -1 },
  { name: 'Leste', short: 'L', dx: 1,  dy: 0  },
  { name: 'Sul',   short: 'S', dx: 0,  dy: 1  },
  { name: 'Oeste', short: 'O', dx: -1, dy: 0  }
];

const DUNGEON_THEMES = [
  { name: 'Catacumbas de Basalto',   wallR: 58, wallG: 82, wallB: 118, roomR: 22, roomG: 50, roomB: 42 },
  { name: 'Fortaleza de Obsidiana',  wallR: 86, wallG: 56, wallB: 68,  roomR: 54, roomG: 28, roomB: 34 },
  { name: 'Santuário de Jade',       wallR: 48, wallG: 90, wallB: 78,  roomR: 20, roomG: 54, roomB: 38 },
  { name: 'Cripta de Âmbar',         wallR: 92, wallG: 76, wallB: 52,  roomR: 52, roomG: 40, roomB: 22 },
  { name: 'Abismo de Quartzo',       wallR: 72, wallG: 60, wallB: 112, roomR: 38, roomG: 28, roomB: 62 },
  { name: 'Prisão de Ferro Gélido',  wallR: 52, wallG: 92, wallB: 116, roomR: 24, roomG: 46, roomB: 64 }
];

let currentMapIndex = 1;

let currentTheme = DUNGEON_THEMES[0];

let lastCornerChoice = -1;

let START_POS = { x: 6, y: 33, dir: 0 };

let ENTRANCE_DOOR_POS = { x: 6, y: 34 };

let GOAL_POS = { x: 29, y: 2, dir: 0 };

let SPECIAL_DOOR_POS = { x: 29, y: 1 };

let dungeonMap = [];

let currentRooms = [];

let doors = {};

let wallButtons = [];

let keysOnFloor = [];

// Moedas (dobrões de ouro) espalhadas pelo mapa atual. Cada item:
// { id, x, y, place: 'secret' | 'dead_end' | 'room', spot: 'floor', collected }
// "spot" indica onde o objeto está: hoje só 'floor' (chão); no futuro, 'niche' (nicho na parede).
let coinsOnFloor = [];

let dungeonMetrics = { remotePct: 30, oneWayPct: 30, deadEndPct: 47 };
