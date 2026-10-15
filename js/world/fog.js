/**
 * js/world/fog.js
 * Fog of War com linha de visão estrita (LOS): grade de exploração, células visíveis,
 * revelação do Mapa Encantado.
 */

const FOG_UNSEEN = 0;

const FOG_EXPLORED = 1;

const FOG_VISIBLE = 2;

let fogGrid = [];

let currentVisibleSet = new Set();

let revealAllCheat = false;

function initFog() {
  fogGrid = Array.from({ length: MAP_SIZE }, () => Array(MAP_SIZE).fill(FOG_UNSEEN));
  currentVisibleSet = new Set();
}

function hasStrictOpenLOS(x0, y0, x1, y1) {
  if (x0 === x1 && y0 === y1) return true;
  const samples = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 12;
  let prevX = x0;
  let prevY = y0;

  for (let i = 1; i <= samples; i++) {
    const t = i / samples;
    const px = x0 + 0.5 + (x1 - x0) * t;
    const py = y0 + 0.5 + (y1 - y0) * t;
    const cx = Math.floor(px);
    const cy = Math.floor(py);

    if (cx === prevX && cy === prevY) continue;

    if (cx !== prevX && cy !== prevY) {
      if (isOpaqueForVision(cx, prevY) || isOpaqueForVision(prevX, cy)) {
        return false;
      }
    }

    if (isOpaqueForVision(cx, cy)) {
      return false;
    }

    prevX = cx;
    prevY = cy;
  }
  return true;
}

const MAX_DEPTH = 8;

const MAX_SIDE = 6;

function updateFogOfWar() {
  for (let y = 0; y < MAP_SIZE; y++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      if (fogGrid[y][x] === FOG_VISIBLE) {
        fogGrid[y][x] = FOG_EXPLORED;
      }
    }
  }

  const dir = DIRECTIONS[player.dir];
  const rightX = -dir.dy;
  const rightY = dir.dx;

  function worldToLocal(wx, wy) {
    const dx = wx - player.x;
    const dy = wy - player.y;
    return {
      rx: dx * rightX + dy * rightY,
      rz: dx * dir.dx + dy * dir.dy
    };
  }

  const visibleOpen = new Set();
  const queue = [{ x: player.x, y: player.y }];
  visibleOpen.add(`${player.x},${player.y}`);

  while (queue.length > 0) {
    const cur = queue.shift();

    for (const d of DIRECTIONS) {
      const nx = cur.x + d.dx;
      const ny = cur.y + d.dy;
      const key = `${nx},${ny}`;

      if (nx < 0 || nx >= MAP_SIZE || ny < 0 || ny >= MAP_SIZE) continue;
      if (visibleOpen.has(key)) continue;

      if (isOpaqueForVision(nx, ny)) continue;

      const { rx, rz } = worldToLocal(nx, ny);
      if (rz < 0 || rz > MAX_DEPTH || Math.abs(rx) > Math.min(MAX_SIDE, rz + 1)) continue;

      if (!hasStrictOpenLOS(player.x, player.y, nx, ny)) continue;

      visibleOpen.add(key);
      queue.push({ x: nx, y: ny });
    }
  }

  currentVisibleSet = new Set();

  for (const openKey of visibleOpen) {
    const [ox, oy] = openKey.split(',').map(Number);
    fogGrid[oy][ox] = FOG_VISIBLE;
    currentVisibleSet.add(openKey);

    for (const d of DIRECTIONS) {
      const wx = ox + d.dx;
      const wy = oy + d.dy;
      if (wx < 0 || wx >= MAP_SIZE || wy < 0 || wy >= MAP_SIZE) continue;

      if (isSolidWall(wx, wy) || isAnyDoorCell(wx, wy)) {
        const { rz } = worldToLocal(wx, wy);
        if (rz >= 0 || (ox === player.x && oy === player.y)) {
          fogGrid[wy][wx] = FOG_VISIBLE;
          currentVisibleSet.add(`${wx},${wy}`);
        }
      }
    }

    for (const diag of [{ dx: -1, dy: -1 }, { dx: 1, dy: -1 }, { dx: -1, dy: 1 }, { dx: 1, dy: 1 }]) {
      const wx = ox + diag.dx;
      const wy = oy + diag.dy;
      if (wx < 0 || wx >= MAP_SIZE || wy < 0 || wy >= MAP_SIZE) continue;
      if (!isSolidWall(wx, wy)) continue;

      const { rz } = worldToLocal(wx, wy);
      if (rz < 0) continue;

      const ortho1Opaque = isOpaqueForVision(ox + diag.dx, oy);
      const ortho2Opaque = isOpaqueForVision(ox, oy + diag.dy);
      if (ortho1Opaque || ortho2Opaque) {
        fogGrid[wy][wx] = FOG_VISIBLE;
        currentVisibleSet.add(`${wx},${wy}`);
      }
    }
  }

  // Uma passagem secreta aberta so e revelada no minimapa quando o jogador passa/olha para ela aberta!
  for (const dKey in doors) {
    const dObj = doors[dKey];
    if (dObj && dObj.isSecret && dObj.open && currentVisibleSet.has(dKey)) {
      dObj.discoveredSecret = true;
    }
  }

  let totalPassable = 0;
  let discoveredPassable = 0;
  for (let y = 0; y < MAP_SIZE; y++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      if (!isSolidWall(x, y) && dungeonMap[y][x] !== TILE_ENTRANCE_DOOR) {
        totalPassable++;
        if (fogGrid[y][x] !== FOG_UNSEEN) {
          discoveredPassable++;
        }
      }
    }
  }
  const pct = totalPassable > 0 ? Math.round((discoveredPassable / totalPassable) * 100) : 0;
  document.getElementById('exploreBadge').textContent = `Explorado: ${pct}%`;
}

function revealHalfDungeonFromEnchantedMap() {
  // O Mapa Encantado já vem com metade (50%) da masmorra desvendada!
  const passableCells = [];
  for (let y = 0; y < MAP_SIZE; y++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      if (!isSolidWall(x, y) && dungeonMap[y][x] !== TILE_ENTRANCE_DOOR && !isClosedSecretDoor(x, y)) {
        passableCells.push({ x, y });
      }
    }
  }

  const targetRevealCount = Math.ceil(passableCells.length * 0.5);
  let revealedCount = 0;
  for (const c of passableCells) {
    if (fogGrid[c.y][c.x] !== FOG_UNSEEN) {
      revealedCount++;
    }
  }

  // Prioriza desvendar células ainda ocultas para que o jogador ganhe de imediato metade do mapa revelado
  for (const c of passableCells) {
    if (revealedCount >= targetRevealCount && fogGrid[c.y][c.x] !== FOG_UNSEEN) continue;
    if (fogGrid[c.y][c.x] === FOG_UNSEEN) {
      fogGrid[c.y][c.x] = FOG_EXPLORED;
      revealedCount++;
    }
    // Revela também as paredes adjacentes às áreas mapeadas (sem revelar passagens secretas fechadas)
    for (const d of DIRECTIONS) {
      const wx = c.x + d.dx;
      const wy = c.y + d.dy;
      if (wx < 0 || wx >= MAP_SIZE || wy < 0 || wy >= MAP_SIZE) continue;
      if (fogGrid[wy][wx] === FOG_UNSEEN && (isSolidWall(wx, wy) || isAnyDoorCell(wx, wy))) {
        fogGrid[wy][wx] = FOG_EXPLORED;
      }
    }
    if (revealedCount >= Math.max(targetRevealCount, Math.min(passableCells.length, revealedCount))) {
      if (revealedCount >= targetRevealCount) break;
    }
  }
}
