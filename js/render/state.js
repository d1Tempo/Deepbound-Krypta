/**
 * js/render/state.js
 * Estado compartilhado de desenho: modos de renderização/GUI, histórico de avisos,
 * hitboxes do mouse e referências aos canvas (primeira pessoa e minimapa).
 */

let renderMode = 'solid';

let guiMode = 'player'; // 'player' (GUI do Jogador) ou 'dev' (GUI do Desenvolvedor)

const MAX_HISTORY_ITEMS = 6;

let noticeHistory = [];

let toastTimeout = null;

let interactiveHitboxes = [];

let hoveredHitbox = null;

let mousePos = { x: -1, y: -1 };

const fpCanvas = document.getElementById('fpCanvas');

const fpCtx = fpCanvas.getContext('2d');

const miniCanvas = document.getElementById('minimapCanvas');

const miniCtx = miniCanvas.getContext('2d');
