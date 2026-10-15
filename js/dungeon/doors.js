/**
 * js/dungeon/doors.js
 * Construção das portas e dos botões/alavancas de parede a partir da lista gerada,
 * e consultas simples (getDoor, getButtonsForWallFace).
 */

function buildDoorsAndWallButtons(doorList) {
  doors = {};
  wallButtons = [];

  for (const item of doorList) {
    const key = `${item.x},${item.y}`;
    // Define o estilo visual da porta: 'wood' (madeira), 'iron' (ferro) ou 'grate' (grades vazadas que permitem ver através)
    let visualStyle = 'wood';
    if (item.isSecret) {
      visualStyle = 'secret';
    } else if (item.type === TILE_ENTRANCE_DOOR || item.type === TILE_SPECIAL_DOOR || item.lockType === 'iron' || item.lockType === 'gold') {
      visualStyle = 'iron';
    } else if (item.isRemote || (item.x === START_POS.x && Math.abs(item.y - START_POS.y) <= 4)) {
      visualStyle = 'grate';
    } else {
      const dHash = Math.abs((item.x * 31 + item.y * 17 + currentMapIndex * 13) % 10);
      if (dHash < 7) visualStyle = 'wood';
      else if (dHash < 9) visualStyle = 'iron';
      else visualStyle = 'grate';
    }

    doors[key] = {
      x: item.x,
      y: item.y,
      type: item.type,
      visualStyle,
      forwardDir: item.forwardDir ?? 0,
      isOneWay: Boolean(item.isOneWay),
      lockType: item.lockType || null,
      unlocked: !item.lockType,
      isRemote: Boolean(item.isRemote),
      remoteId: item.remoteId || null,
      remoteDeadEnd: item.remoteDeadEnd || null,
      isSecret: Boolean(item.isSecret),
      secretPurpose: item.secretPurpose || null,
      discoveredSecret: false,
      open: false,
      anim: 0
    };

    if (item.type === TILE_ENTRANCE_DOOR) continue;

    const isSpecial = (item.type === TILE_SPECIAL_DOOR);

    // Se a porta é de mecanismo remoto, seu ÚNICO botão fica no final do beco sem saída correspondente
    // (evita criar botão vermelho local do lado de dentro da sala trancada onde o jogador não tem acesso prévio)
    if (item.isSecret && item.secretLeverSlot) {
      const slot = item.secretLeverSlot;
      const n = DIRECTIONS[slot.face];
      const perpDir = (slot.face + 1) % 4;
      const t = DIRECTIONS[perpDir];
      const faceCenterX = slot.wallX + n.dx * 0.5;
      const faceCenterY = slot.wallY + n.dy * 0.5;

      doors[key].secretLeverSlot = slot;

      wallButtons.push({
        id: `btn-secret-${item.x}-${item.y}`,
        doorKey: key,
        wallX: slot.wallX,
        wallY: slot.wallY,
        face: slot.face,
        adjX: slot.adjX,
        adjY: slot.adjY,
        altAdjX: slot.adjX,
        altAdjY: slot.adjY,
        isSpecial: false,
        isRemote: false,
        isSecretLever: true,
        p0: { wx: faceCenterX - t.dx * 0.16, wy: faceCenterY - t.dy * 0.16 },
        p1: { wx: faceCenterX + t.dx * 0.16, wy: faceCenterY + t.dy * 0.16 },
        i0: { wx: faceCenterX - t.dx * 0.08, wy: faceCenterY - t.dy * 0.08 },
        i1: { wx: faceCenterX + t.dx * 0.08, wy: faceCenterY + t.dy * 0.08 }
      });
      continue;
    }

    if (item.isRemote && item.remoteDeadEnd) {
      const de = item.remoteDeadEnd;
      const n = DIRECTIONS[de.face];
      const perpDir = (de.face + 1) % 4;
      const t = DIRECTIONS[perpDir];
      const faceCenterX = de.wallX + n.dx * 0.5;
      const faceCenterY = de.wallY + n.dy * 0.5;

      wallButtons.push({
        id: `btn-remote-${item.x}-${item.y}`,
        doorKey: key,
        wallX: de.wallX,
        wallY: de.wallY,
        face: de.face,
        adjX: de.endX,
        adjY: de.endY,
        altAdjX: de.endX,
        altAdjY: de.endY,
        isSpecial: false,
        isRemote: true,
        remoteId: item.remoteId,
        p0: { wx: faceCenterX - t.dx * 0.16, wy: faceCenterY - t.dy * 0.16 },
        p1: { wx: faceCenterX + t.dx * 0.16, wy: faceCenterY + t.dy * 0.16 },
        i0: { wx: faceCenterX - t.dx * 0.08, wy: faceCenterY - t.dy * 0.08 },
        i1: { wx: faceCenterX + t.dx * 0.08, wy: faceCenterY + t.dy * 0.08 }
      });
      continue;
    }

    for (let approachDir = 0; approachDir < 4; approachDir++) {
      if (item.isOneWay && approachDir !== item.forwardDir) continue;
      if (item.isSecret && item.secretPurpose !== 'advance' && approachDir !== item.forwardDir) continue;

      const f = DIRECTIONS[approachDir];
      const openX = item.x - f.dx;
      const openY = item.y - f.dy;

      if (openX < 0 || openX >= MAP_SIZE || openY < 0 || openY >= MAP_SIZE) continue;
      if (dungeonMap[openY][openX] !== TILE_FREE) continue;

      const rightDir = (approachDir + 1) % 4;
      const leftDir  = (approachDir + 3) % 4;
      const backDir  = (approachDir + 2) % 4;
      const r = DIRECTIONS[rightDir];
      const l = DIRECTIONS[leftDir];

      const sideWallRightX = openX + r.dx;
      const sideWallRightY = openY + r.dy;

      const sideWallLeftX = openX + l.dx;
      const sideWallLeftY = openY + l.dy;

      if (isSolidWall(sideWallRightX, sideWallRightY)) {
        addWallButtonGeometry({
          id: `btn-${item.x}-${item.y}-dir${approachDir}`,
          doorKey: key,
          wallX: sideWallRightX,
          wallY: sideWallRightY,
          face: leftDir,
          adjX: openX,
          adjY: openY,
          altAdjX: openX,
          altAdjY: openY,
          shiftDir: approachDir,
          isSpecial
        });
      } else if (isSolidWall(sideWallLeftX, sideWallLeftY)) {
        addWallButtonGeometry({
          id: `btn-${item.x}-${item.y}-dir${approachDir}`,
          doorKey: key,
          wallX: sideWallLeftX,
          wallY: sideWallLeftY,
          face: rightDir,
          adjX: openX,
          adjY: openY,
          altAdjX: openX,
          altAdjY: openY,
          shiftDir: approachDir,
          isSpecial
        });
      } else if (isSolidWall(item.x + r.dx, item.y + r.dy)) {
        addWallButtonGeometry({
          id: `btn-${item.x}-${item.y}-dir${approachDir}`,
          doorKey: key,
          wallX: item.x + r.dx,
          wallY: item.y + r.dy,
          face: backDir,
          adjX: openX + r.dx,
          adjY: openY + r.dy,
          altAdjX: openX,
          altAdjY: openY,
          shiftDir: leftDir,
          isSpecial
        });
      } else if (isSolidWall(item.x + l.dx, item.y + l.dy)) {
        addWallButtonGeometry({
          id: `btn-${item.x}-${item.y}-dir${approachDir}`,
          doorKey: key,
          wallX: item.x + l.dx,
          wallY: item.y + l.dy,
          face: backDir,
          adjX: openX + l.dx,
          adjY: openY + l.dy,
          altAdjX: openX,
          altAdjY: openY,
          shiftDir: rightDir,
          isSpecial
        });
      }
    }
  }
}

function addWallButtonGeometry({ id, doorKey, wallX, wallY, face, adjX, adjY, altAdjX, altAdjY, shiftDir, isSpecial }) {
  const n = DIRECTIONS[face];
  const t = DIRECTIONS[shiftDir];
  const faceCenterX = wallX + n.dx * 0.5;
  const faceCenterY = wallY + n.dy * 0.5;

  wallButtons.push({
    id,
    doorKey,
    wallX,
    wallY,
    face,
    adjX,
    adjY,
    altAdjX: altAdjX ?? adjX,
    altAdjY: altAdjY ?? adjY,
    isSpecial,
    isRemote: false,
    p0: { wx: faceCenterX + t.dx * 0.10, wy: faceCenterY + t.dy * 0.10 },
    p1: { wx: faceCenterX + t.dx * 0.42, wy: faceCenterY + t.dy * 0.42 },
    i0: { wx: faceCenterX + t.dx * 0.20, wy: faceCenterY + t.dy * 0.20 },
    i1: { wx: faceCenterX + t.dx * 0.34, wy: faceCenterY + t.dy * 0.34 }
  });
}

function getDoor(x, y) {
  return doors[`${x},${y}`] || null;
}

function getButtonsForWallFace(wx, wy, face) {
  return wallButtons.filter(b => b.wallX === wx && b.wallY === wy && b.face === face);
}
