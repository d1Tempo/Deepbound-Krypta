/**
 * js/render/textures.js
 * Carregamento das texturas: os caminhos dos PNGs em assets/, os mapas de imagens já carregadas,
 * caches de composição e a animação discreta das tochas.
 * Para adicionar uma textura nova: coloque o PNG em assets/ e registre o caminho no objeto *_TEXTURE_PATHS.
 */

/**
 * Texturas Pixel Art Clássico (16-bit) das Paredes da Masmorra:
 * - base: Pedra talhada padrão (parede_base.png)
 * - torch: Tocha acesa presa na pedra (parede_tocha.png)
 * - cobweb: Teias de aranha nos cantos (parede_teia_aranha.png)
 * - cracked: Rachadura profunda na pedra (parede_rachadura.png)
 * - claw: Arranhões de garras de lobisomem/criatura (parede_arranhoes_lobisomem.png)
 * - rune: Grilhões enferrujados e runa arcana D&D (parede_grilhoes_runa.png)
 */
const WALL_TEXTURE_PATHS = {
  "base": "assets/walls/base.png",
  "torch": "assets/walls/torch.png",
  "torch_side_left": "assets/walls/torch_side_left.png",
  "torch_side_right": "assets/walls/torch_side_right.png",
  "torch_0": "assets/walls/torch_0.png",
  "torch_side_left_0": "assets/walls/torch_side_left_0.png",
  "torch_side_right_0": "assets/walls/torch_side_right_0.png",
  "torch_1": "assets/walls/torch_1.png",
  "torch_side_left_1": "assets/walls/torch_side_left_1.png",
  "torch_side_right_1": "assets/walls/torch_side_right_1.png",
  "torch_2": "assets/walls/torch_2.png",
  "torch_side_left_2": "assets/walls/torch_side_left_2.png",
  "torch_side_right_2": "assets/walls/torch_side_right_2.png",
  "torch_3": "assets/walls/torch_3.png",
  "torch_side_left_3": "assets/walls/torch_side_left_3.png",
  "torch_side_right_3": "assets/walls/torch_side_right_3.png",
  "torch_4": "assets/walls/torch_4.png",
  "torch_side_left_4": "assets/walls/torch_side_left_4.png",
  "torch_side_right_4": "assets/walls/torch_side_right_4.png",
  "rune": "assets/walls/rune.png",
  "rune_side_left": "assets/walls/rune_side_left.png",
  "rune_side_right": "assets/walls/rune_side_right.png",
  "cobweb": "assets/walls/cobweb.png",
  "cracked": "assets/walls/cracked.png",
  "claw": "assets/walls/claw.png",
  "leak": "assets/walls/leak.png"
};

const FLOOR_TEXTURE_PATHS = {
  "base": "assets/floors/base.png",
  "moss": "assets/floors/moss.png",
  "holes": "assets/floors/holes.png",
  "scratches": "assets/floors/scratches.png",
  "grate": "assets/floors/grate.png",
  "threshold_h": "assets/floors/threshold_h.png",
  "threshold_v": "assets/floors/threshold_v.png",
  "border_frame": "assets/floors/border_frame.png",
  "puddle_far": "assets/floors/puddle_far.png",
  "puddle_right": "assets/floors/puddle_right.png",
  "puddle_near": "assets/floors/puddle_near.png",
  "puddle_left": "assets/floors/puddle_left.png"
};

const CEIL_TEXTURE_PATHS = {
  "corr_base_h": "assets/ceilings/corr_base_h.png",
  "corr_base_v": "assets/ceilings/corr_base_v.png",
  "corr_roots_h": "assets/ceilings/corr_roots_h.png",
  "corr_roots_v": "assets/ceilings/corr_roots_v.png",
  "corr_leak_h": "assets/ceilings/corr_leak_h.png",
  "corr_leak_v": "assets/ceilings/corr_leak_v.png",
  "room_base": "assets/ceilings/room_base.png",
  "room_cracked": "assets/ceilings/room_cracked.png",
  "room_leak": "assets/ceilings/room_leak.png"
};

const WALL_TEXTURE_IMAGES = {};

const FLOOR_TEXTURE_IMAGES = {};

const CEIL_TEXTURE_IMAGES = {};

const DOOR_TEXTURE_PATHS = {
  "frame": "assets/doors/frame.png",
  "wood": "assets/doors/wood.png",
  "iron": "assets/doors/iron.png",
  "grate": "assets/doors/grate.png"
};

const DOOR_TEXTURE_IMAGES = {};

const BUTTON_TEXTURE_PATHS = {
  "lever_up_front": "assets/buttons/lever_up_front.png",
  "lever_down_front": "assets/buttons/lever_down_front.png",
  "lever_up_side_left": "assets/buttons/lever_up_side_left.png",
  "lever_down_side_left": "assets/buttons/lever_down_side_left.png",
  "lever_up_side_right": "assets/buttons/lever_up_side_right.png",
  "lever_down_side_right": "assets/buttons/lever_down_side_right.png",
  "keyhole_empty": "assets/buttons/keyhole_empty.png",
  "keyhole_iron_left": "assets/buttons/keyhole_iron_left.png",
  "keyhole_iron_right": "assets/buttons/keyhole_iron_right.png",
  "keyhole_gold_left": "assets/buttons/keyhole_gold_left.png",
  "keyhole_gold_right": "assets/buttons/keyhole_gold_right.png",
  "keyhole_iron_front": "assets/buttons/keyhole_iron_front.png",
  "keyhole_gold_front": "assets/buttons/keyhole_gold_front.png"
};

const BUTTON_TEXTURE_IMAGES = {};

const KEY_TEXTURE_PATHS = {
  "map": "assets/keys/map.png",
  "iron": "assets/keys/iron.png",
  "gold": "assets/keys/gold.png"
};

const KEY_TEXTURE_IMAGES = {};

const floorCompositeCache = new Map();

const ceilCompositeCache = new Map();

let doorScratchCanvas = null;

let doorScratchCtx = null;

let doorLeafScratchCanvas = null;

let doorLeafScratchCtx = null;

let btnScratchCanvas = null;

let btnScratchCtx = null;

let keyScratchCanvas = null;

let keyScratchCtx = null;

function initDungeonTextures() {
  if (typeof document !== "undefined" && document.createElement) {
    doorScratchCanvas = document.createElement("canvas");
    doorScratchCanvas.width = 160;
    doorScratchCanvas.height = 160;
    doorScratchCtx = doorScratchCanvas.getContext("2d");

    doorLeafScratchCanvas = document.createElement("canvas");
    doorLeafScratchCanvas.width = 84;
    doorLeafScratchCanvas.height = 130;
    doorLeafScratchCtx = doorLeafScratchCanvas.getContext("2d");

    btnScratchCanvas = document.createElement("canvas");
    btnScratchCanvas.width = 96;
    btnScratchCanvas.height = 120;
    btnScratchCtx = btnScratchCanvas.getContext("2d");

    keyScratchCanvas = document.createElement("canvas");
    keyScratchCanvas.width = 160;
    keyScratchCanvas.height = 112;
    keyScratchCtx = keyScratchCanvas.getContext("2d");
  }
  if (typeof Image === "undefined") return;
  for (const [variant, path] of Object.entries(WALL_TEXTURE_PATHS)) {
    const img = new Image();
    img.onload = () => {
      if (typeof renderFirstPerson === "function" && dungeonMap && dungeonMap.length > 0) {
        renderFirstPerson();
      }
    };
    img.src = path;
    WALL_TEXTURE_IMAGES[variant] = img;
  }
  for (const [variant, path] of Object.entries(FLOOR_TEXTURE_PATHS)) {
    const img = new Image();
    img.onload = () => {
      floorCompositeCache.clear();
      ceilCompositeCache.clear();
      if (typeof renderFirstPerson === "function" && dungeonMap && dungeonMap.length > 0) {
        renderFirstPerson();
      }
    };
    img.src = path;
    FLOOR_TEXTURE_IMAGES[variant] = img;
  }
  for (const [variant, path] of Object.entries(CEIL_TEXTURE_PATHS)) {
    const img = new Image();
    img.onload = () => {
      ceilCompositeCache.clear();
      if (typeof renderFirstPerson === "function" && dungeonMap && dungeonMap.length > 0) {
        renderFirstPerson();
      }
    };
    img.src = path;
    CEIL_TEXTURE_IMAGES[variant] = img;
  }
  for (const [variant, path] of Object.entries(DOOR_TEXTURE_PATHS)) {
    const img = new Image();
    img.onload = () => {
      if (typeof renderFirstPerson === "function" && dungeonMap && dungeonMap.length > 0) {
        renderFirstPerson();
      }
    };
    img.src = path;
    DOOR_TEXTURE_IMAGES[variant] = img;
  }
  for (const [variant, path] of Object.entries(BUTTON_TEXTURE_PATHS)) {
    const img = new Image();
    img.onload = () => {
      if (typeof renderFirstPerson === "function" && dungeonMap && dungeonMap.length > 0) {
        renderFirstPerson();
      }
    };
    img.src = path;
    BUTTON_TEXTURE_IMAGES[variant] = img;
  }
  for (const [variant, path] of Object.entries(KEY_TEXTURE_PATHS)) {
    const img = new Image();
    img.onload = () => {
      if (typeof renderFirstPerson === "function" && dungeonMap && dungeonMap.length > 0) {
        renderFirstPerson();
      }
    };
    img.src = path;
    KEY_TEXTURE_IMAGES[variant] = img;
  }
  if (typeof document !== "undefined" && document.getElementById) {
    const iconIron = document.getElementById("iconIronKey");
    if (iconIron && KEY_TEXTURE_PATHS.iron) iconIron.src = KEY_TEXTURE_PATHS.iron;
    const iconGold = document.getElementById("iconGoldKey");
    if (iconGold && KEY_TEXTURE_PATHS.gold) iconGold.src = KEY_TEXTURE_PATHS.gold;
  }
}

initDungeonTextures();

// 5 estados discretos pré-renderizados (indices 0..4 -> sway -1.0, -0.5, 0.0, +0.5, +1.0)
// onde as pedras da parede permanecem 100% fixas e apenas a língua de fogo (da base até a ponta) e a iluminação balançam!
const TORCH_SWAY_STEPS = [-1.0, -0.5, 0.0, 0.5, 1.0];

function getGlobalTorchSwayIndex() {
  const nowMs = (typeof Date !== 'undefined' && Date.now) ? Date.now() : 0;
  const wave = Math.sin(nowMs * 0.0019);
  const idx = Math.round((wave + 1) * 2); // Mapeia [-1..+1] -> [0..4]
  return Math.max(0, Math.min(4, idx));
}

function getTorchSwayFrame(texKey, baseTorchImg, swayIdx) {
  const swayImg = WALL_TEXTURE_IMAGES[`${texKey}_${swayIdx}`];
  if (swayImg && swayImg.complete && (swayImg.naturalWidth > 0 || swayImg.width > 0)) {
    return swayImg;
  }
  return baseTorchImg;
}
