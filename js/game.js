/**
 * js/game.js
 * Ciclo de vida do jogo: carregar mapa, reiniciar, e atalhos de desenvolvedor
 * (teleportar perto da saída, revelar mapa).
 */

function loadMap(mapIndex) {
  currentMapIndex = mapIndex;
  // Na primeira masmorra (ou se ainda não existir personagem), gera aleatoriamente o vigor e as 6 habilidades de combate
  if (mapIndex === 1 || !player.character) {
    const prevName = player.character ? player.character.name : '';
    const prevRace = player.character ? player.character.race : '';
    player.character = generateHeroicCharacter(prevName, prevRace);
  }
  player.hasEnchantedMap = false;
  player.keys.iron = false;
  player.keys.gold = false;
  player.keysUsed.iron = false;
  player.keysUsed.gold = false;
  playerInventoryItems = [];
  isEnchantedMapOpen = false;
  isMapBurning = false;
  syncEnchantedMapModalDOM();

  const generated = generateProceduralDungeon(currentMapIndex);
  dungeonMap = generated.grid;
  currentRooms = generated.rooms;

  player.x = START_POS.x;
  player.y = START_POS.y;
  player.dir = START_POS.dir;

  buildDoorsAndWallButtons(generated.doorList);
  initFog();
  if (typeof showToast === 'function') {
    showToast(`Você adentrou ${currentTheme.name} (Mapa ${currentMapIndex}).`, 'portal');
  }
  checkKeyPickupAt(player.x, player.y);
  updateInventoryHUD();
  updateCharacterHUD();
  updateFogOfWar();
  updateAll();
}

function resetGame() {
  player.steps = 0;
  player.coins = 0;
  loadMap(1);
  showToast(`Nova Masmorra gerada: ${currentTheme.name}!`, 'info');
}

function teleportNearGoal() {
  for (const k of keysOnFloor) {
    k.collected = true;
  }
  player.keys.iron = false;
  player.keys.gold = false;
  player.keysUsed.iron = true;
  player.keysUsed.gold = true;
  playerInventoryItems = [];
  updateInventoryHUD();

  const preDoorY = GOAL_POS.y === 2 ? 4 : 31;
  const preDoor = getDoor(GOAL_POS.x, preDoorY);
  if (preDoor) {
    preDoor.unlocked = true;
    preDoor.open = true;
    preDoor.anim = 1;
  }
  player.x = GOAL_POS.x;
  player.y = GOAL_POS.y;
  player.dir = GOAL_POS.dir;
  updateFogOfWar();
  updateAll();
  showToast(`Chaves concedidas e posicionado em (${GOAL_POS.x}, ${GOAL_POS.y})! Clique no Botão Especial.`, 'portal');
}

function toggleFogCheat() {
  revealAllCheat = !revealAllCheat;
  const btn = document.getElementById('btnToggleFog');
  btn.textContent = `Revelar Mapa: ${revealAllCheat ? 'On' : 'Off'}`;
  btn.classList.toggle('active', revealAllCheat);
  renderMinimap();
}
