/**
 * js/world/queries.js
 * Consultas sobre o mapa: parede sólida, porta, porta secreta, bloqueio de movimento,
 * opacidade para visão, sala e zona de uma posição.
 */

function isSolidWall(x, y) {
  if (x < 0 || x >= MAP_SIZE || y < 0 || y >= MAP_SIZE) return true;
  return dungeonMap[y][x] === TILE_WALL;
}

function isAnyDoorCell(x, y) {
  if (x < 0 || x >= MAP_SIZE || y < 0 || y >= MAP_SIZE) return false;
  const v = dungeonMap[y][x];
  return v === TILE_DOOR || v === TILE_ENTRANCE_DOOR || v === TILE_SPECIAL_DOOR;
}

function isSecretDoorCell(x, y) {
  if (!isAnyDoorCell(x, y)) return false;
  const d = getDoor(x, y);
  return Boolean(d && d.isSecret);
}

function isClosedSecretDoor(x, y) {
  if (!isAnyDoorCell(x, y)) return false;
  const d = getDoor(x, y);
  return Boolean(d && d.isSecret && d.anim < 0.02);
}

function isBlockedForMove(x, y) {
  if (isSolidWall(x, y)) return true;
  if (isAnyDoorCell(x, y)) {
    const door = getDoor(x, y);
    return !door || !door.open;
  }
  return false;
}

function isOpaqueForVision(x, y) {
  if (isSolidWall(x, y)) return true;
  if (isAnyDoorCell(x, y)) {
    const door = getDoor(x, y);
    if (!door) return true;
    // Grades de ferro ('grate') permitem ver através das barras mesmo quando fechadas!
    if (door.visualStyle === 'grate') return false;
    return door.anim < 0.65;
  }
  return false;
}

function getRoomAt(x, y) {
  for (const r of currentRooms) {
    if (x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1) {
      return r;
    }
  }
  return null;
}

function getZoneName(x, y) {
  if (x === START_POS.x && y === START_POS.y) return `Partida (${START_POS.x}, ${START_POS.y})`;
  if (x === GOAL_POS.x && y === GOAL_POS.y) return `Chegada (${GOAL_POS.x}, ${GOAL_POS.y})`;
  if (isAnyDoorCell(x, y)) return 'Passagem da Porta';
  const room = getRoomAt(x, y);
  if (room) return room.name;
  return 'Corredor / Beco sem Saída';
}
