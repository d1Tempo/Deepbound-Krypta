/**
 * js/dungeon/generator.js
 * Gerador procedural da masmorra 36x36. É uma função única e grande: trate como "caixa preta"
 * e só mexa aqui quando for realmente mudar a geração (salas, corredores, becos, chaves, portas).
 */

/**
 * GERADOR PROCEDURAL AVANÇADO 36x36 (`generateProceduralDungeon`)
 *
 * - Todas as chaves ('Chave de Ferro' e 'Chave de Ouro') são posicionadas exclusivamente no
 *   final de corredores sem saída (`de.endX, de.endY`), nunca no centro das salas.
 * - Pelo menos 20% das portas (30%) têm seus botões escondidos no final de outros becos sem saída.
 * - Pelo menos 20% das portas (30%) são Portas de Via Única que se trancam ao atravessar.
 * - Pelo menos 30% dos corredores (~47% a 54%) que saem das salas terminam em becos sem saída.
 */
function generateProceduralDungeon(mapIndex) {
  const grid = Array.from({ length: MAP_SIZE }, () => Array(MAP_SIZE).fill(TILE_WALL));
  const rooms = [];
  const rawDoors = [];
  keysOnFloor = [];

  currentTheme = DUNGEON_THEMES[(mapIndex - 1 + randInt(0, DUNGEON_THEMES.length - 1)) % DUNGEON_THEMES.length];

  let cornerChoice;
  if (mapIndex === 1 && lastCornerChoice === -1) {
    cornerChoice = 0;
  } else {
    const availableCorners = [0, 1, 2, 3].filter(c => c !== lastCornerChoice);
    cornerChoice = availableCorners[randInt(0, availableCorners.length - 1)];
  }
  lastCornerChoice = cornerChoice;

  // Reserva margens Oeste (X=2..4), Leste (X=31..33), Norte (Y=2..5) e Sul (Y=30..33)
  // para esculpir corredores em beco sem saída ao redor de qualquer sala do mapa!
  const secBoundsX = [
    { min: 5,  max: 9  }, // Setor X=0
    { min: 15, max: 20 }, // Setor X=1
    { min: 26, max: 30 }  // Setor X=2
  ];
  const secBoundsY = [
    { min: 6,  max: 9  }, // Setor Y=0
    { min: 15, max: 20 }, // Setor Y=1
    { min: 26, max: 29 }  // Setor Y=2
  ];

  let startSecX, startSecY, goalSecX, goalSecY;
  let startXOffset = randInt(6, 8);

  if (cornerChoice === 0) {
    startSecX = 0; startSecY = 2;
    goalSecX  = 2; goalSecY  = 0;
    const sx = startXOffset;
    const gx = (MAP_SIZE - 1) - sx;
    START_POS = { x: sx, y: 33, dir: 0 };
    ENTRANCE_DOOR_POS = { x: sx, y: 34 };
    GOAL_POS = { x: gx, y: 2, dir: 0 };
    SPECIAL_DOOR_POS = { x: gx, y: 1 };
  } else if (cornerChoice === 1) {
    startSecX = 2; startSecY = 2;
    goalSecX  = 0; goalSecY  = 0;
    const sx = (MAP_SIZE - 1) - startXOffset;
    const gx = (MAP_SIZE - 1) - sx;
    START_POS = { x: sx, y: 33, dir: 0 };
    ENTRANCE_DOOR_POS = { x: sx, y: 34 };
    GOAL_POS = { x: gx, y: 2, dir: 0 };
    SPECIAL_DOOR_POS = { x: gx, y: 1 };
  } else if (cornerChoice === 2) {
    startSecX = 0; startSecY = 0;
    goalSecX  = 2; goalSecY  = 2;
    const sx = startXOffset;
    const gx = (MAP_SIZE - 1) - sx;
    START_POS = { x: sx, y: 2, dir: 2 };
    ENTRANCE_DOOR_POS = { x: sx, y: 1 };
    GOAL_POS = { x: gx, y: 33, dir: 2 };
    SPECIAL_DOOR_POS = { x: gx, y: 34 };
  } else {
    startSecX = 2; startSecY = 0;
    goalSecX  = 0; goalSecY  = 2;
    const sx = (MAP_SIZE - 1) - startXOffset;
    const gx = (MAP_SIZE - 1) - sx;
    START_POS = { x: sx, y: 2, dir: 2 };
    ENTRANCE_DOOR_POS = { x: sx, y: 1 };
    GOAL_POS = { x: gx, y: 33, dir: 2 };
    SPECIAL_DOOR_POS = { x: gx, y: 34 };
  }

  function carveRect(x0, y0, x1, y1, name) {
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        grid[y][x] = TILE_FREE;
      }
    }
    rooms.push({ x0, y0, x1, y1, name });
  }

  function carveH(x0, x1, y) {
    const a = Math.min(x0, x1);
    const b = Math.max(x0, x1);
    for (let x = a; x <= b; x++) {
      grid[y][x] = TILE_FREE;
    }
  }

  function carveV(y0, y1, x) {
    const a = Math.min(y0, y1);
    const b = Math.max(y0, y1);
    for (let y = a; y <= b; y++) {
      grid[y][x] = TILE_FREE;
    }
  }

  const ROOM_NAMES = shuffleArray([
    'Salão das Sombras', 'Câmara da Guarda', 'Galeria dos Ecos',
    'Santuário Antigo', 'Cripta Subterrânea', 'Forja Esquecida',
    'Salão dos Pilares', 'Arquivo Arcano', 'Pátio da Vigília',
    'Câmara do Oráculo', 'Claustro de Pedra', 'Bastião Profundo'
  ]);

  // 1. Cria as 9 salas principais
  const sectorNodes = Array.from({ length: 3 }, () => Array(3).fill(null));
  let nameIdx = 0;

  for (let sy = 0; sy < 3; sy++) {
    for (let sx = 0; sx < 3; sx++) {
      const bx = secBoundsX[sx];
      const by = secBoundsY[sy];
      const isStart = (sx === startSecX && sy === startSecY);
      const isGoal  = (sx === goalSecX && sy === goalSecY);

      let x0, x1, y0, y1;

      if (isStart || isGoal) {
        x0 = bx.min;
        x1 = bx.max;
        y0 = by.min;
        y1 = by.max;
      } else {
        const maxW = bx.max - bx.min + 1;
        const maxH = by.max - by.min + 1;
        const w = randInt(4, maxW);
        const h = randInt(4, maxH);
        x0 = randInt(bx.min, bx.max - w + 1);
        x1 = x0 + w - 1;
        y0 = randInt(by.min, by.max - h + 1);
        y1 = y0 + h - 1;
      }

      const rName = isStart
        ? `Átrio Inicial (${x1 - x0 + 1}×${y1 - y0 + 1})`
        : (isGoal
            ? `Antecâmara do Portal (${x1 - x0 + 1}×${y1 - y0 + 1})`
            : `${ROOM_NAMES[nameIdx++ % ROOM_NAMES.length]} (${x1 - x0 + 1}×${y1 - y0 + 1})`);

      carveRect(x0, y0, x1, y1, rName);
      sectorNodes[sy][sx] = { sx, sy, id: `${sx},${sy}`, x0, y0, x1, y1, name: rName };
    }
  }

  // 2. Gera Árvore Geradora Aleatória (8 arestas conectando os 9 setores)
  const visitedSec = Array.from({ length: 3 }, () => Array(3).fill(false));
  const connectedEdges = new Set();
  const treeEdges = [];
  const adjGraph = {};
  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 3; x++) {
      adjGraph[`${x},${y}`] = [];
    }
  }

  function edgeKey(ax, ay, bx, by) {
    if (ax > bx || (ax === bx && ay > by)) {
      return `${bx},${by}-${ax},${ay}`;
    }
    return `${ax},${ay}-${bx},${by}`;
  }

  function dfsMaze(cx, cy) {
    visitedSec[cy][cx] = true;
    const neighbors = shuffleArray([
      { nx: cx + 1, ny: cy },
      { nx: cx - 1, ny: cy },
      { nx: cx, ny: cy + 1 },
      { nx: cx, ny: cy - 1 }
    ]);

    for (const { nx, ny } of neighbors) {
      if (nx < 0 || nx >= 3 || ny < 0 || ny >= 3) continue;
      if (!visitedSec[ny][nx]) {
        connectedEdges.add(edgeKey(cx, cy, nx, ny));
        treeEdges.push({ ax: cx, ay: cy, bx: nx, by: ny });
        adjGraph[`${cx},${cy}`].push(`${nx},${ny}`);
        adjGraph[`${nx},${ny}`].push(`${cx},${cy}`);
        dfsMaze(nx, ny);
      }
    }
  }

  dfsMaze(startSecX, startSecY);

  // 3. Calcula o caminho único na árvore (Spine: v_0 -> v_1 -> ... -> v_L), `treeDepth` e `nodeStage`
  const startKey = `${startSecX},${startSecY}`;
  const goalKey  = `${goalSecX},${goalSecY}`;
  const parentMap = { [startKey]: null };
  const treeDepth = { [startKey]: 0 };
  const bfsQ = [startKey];

  while (bfsQ.length > 0) {
    const cur = bfsQ.shift();
    for (const nxt of adjGraph[cur]) {
      if (!(nxt in parentMap)) {
        parentMap[nxt] = cur;
        treeDepth[nxt] = treeDepth[cur] + 1;
        bfsQ.push(nxt);
      }
    }
  }

  function isInSubtreeOf(nodeId, ancestorId) {
    let cur = nodeId;
    while (cur !== null && cur !== undefined) {
      if (cur === ancestorId) return true;
      cur = parentMap[cur];
    }
    return false;
  }

  const spine = [];
  let curr = goalKey;
  while (curr !== null) {
    spine.unshift(curr);
    curr = parentMap[curr];
  }
  const L = spine.length - 1;
  const spineIndexMap = {};
  spine.forEach((k, idx) => { spineIndexMap[k] = idx; });

  const nodeStage = {};
  for (let idx = 0; idx <= L; idx++) {
    const root = spine[idx];
    nodeStage[root] = idx;
    const subQ = [root];
    while (subQ.length > 0) {
      const u = subQ.shift();
      for (const v of adjGraph[u]) {
        if (v in spineIndexMap) continue;
        if (!(v in nodeStage)) {
          nodeStage[v] = idx;
          subQ.push(v);
        }
      }
    }
  }

  // 4. Esculpe os 8 Corredores entre Salas da Árvore e registra suas Portas direcionadas
  const treeDoorRecords = [];

  function getTreeParentChild(ax, ay, bx, by) {
    const ka = `${ax},${ay}`;
    const kb = `${bx},${by}`;
    if (parentMap[kb] === ka) {
      return { fromNode: sectorNodes[ay][ax], toNode: sectorNodes[by][bx], fromKey: ka, toKey: kb };
    }
    return { fromNode: sectorNodes[by][bx], toNode: sectorNodes[ay][ax], fromKey: kb, toKey: ka };
  }

  for (const edge of treeEdges) {
    const { fromNode, toNode, fromKey, toKey } = getTreeParentChild(edge.ax, edge.ay, edge.bx, edge.by);
    const isSpineEdge = (fromKey in spineIndexMap) && (toKey in spineIndexMap);
    const spineStep = isSpineEdge ? spineIndexMap[toKey] : null;
    const stageOfFrom = nodeStage[fromKey];
    const depthOfFrom = treeDepth[fromKey];
    const depthOfTo   = treeDepth[toKey];

    if (fromNode.sx !== toNode.sx) {
      const goingEast = toNode.sx > fromNode.sx;
      const leftNode  = goingEast ? fromNode : toNode;
      const rightNode = goingEast ? toNode : fromNode;

      const yL = randInt(leftNode.y0 + 1, leftNode.y1 - 1);
      const yR = randInt(rightNode.y0 + 1, rightNode.y1 - 1);
      const midX = leftNode.sx === 0 ? 12 : 23;

      const doorLX = leftNode.x1 + 1;
      const doorRX = rightNode.x0 - 1;

      carveH(doorLX + 1, midX, yL);
      carveV(yL, yR, midX);
      carveH(midX, doorRX - 1, yR);

      if (goingEast) {
        grid[yL][doorLX] = TILE_FREE;
        grid[yR][doorRX] = TILE_DOOR;
        treeDoorRecords.push({
          x: doorRX,
          y: yR,
          fromExitX: doorLX,
          fromExitY: yL,
          forwardDir: 1,
          isSpineEdge,
          spineStep,
          fromKey,
          toKey,
          stageBefore: stageOfFrom,
          depthBefore: depthOfFrom,
          depthAfter: depthOfTo
        });
      } else {
        grid[yR][doorRX] = TILE_FREE;
        grid[yL][doorLX] = TILE_DOOR;
        treeDoorRecords.push({
          x: doorLX,
          y: yL,
          fromExitX: doorRX,
          fromExitY: yR,
          forwardDir: 3,
          isSpineEdge,
          spineStep,
          fromKey,
          toKey,
          stageBefore: stageOfFrom,
          depthBefore: depthOfFrom,
          depthAfter: depthOfTo
        });
      }
    } else {
      const goingSouth = toNode.sy > fromNode.sy;
      const topNode = goingSouth ? fromNode : toNode;
      const botNode = goingSouth ? toNode : fromNode;

      const xT = randInt(topNode.x0 + 1, topNode.x1 - 1);
      const xB = randInt(botNode.x0 + 1, botNode.x1 - 1);
      const midY = topNode.sy === 0 ? 12 : 23;

      const doorTY = topNode.y1 + 1;
      const doorBY = botNode.y0 - 1;

      carveV(doorTY + 1, midY, xT);
      carveH(xT, xB, midY);
      carveV(midY, doorBY - 1, xB);

      if (goingSouth) {
        grid[doorTY][xT] = TILE_FREE;
        grid[doorBY][xB] = TILE_DOOR;
        treeDoorRecords.push({
          x: xB,
          y: doorBY,
          fromExitX: xT,
          fromExitY: doorTY,
          forwardDir: 2,
          isSpineEdge,
          spineStep,
          fromKey,
          toKey,
          stageBefore: stageOfFrom,
          depthBefore: depthOfFrom,
          depthAfter: depthOfTo
        });
      } else {
        grid[doorBY][xB] = TILE_FREE;
        grid[doorTY][xT] = TILE_DOOR;
        treeDoorRecords.push({
          x: xT,
          y: doorTY,
          fromExitX: xB,
          fromExitY: doorBY,
          forwardDir: 0,
          isSpineEdge,
          spineStep,
          fromKey,
          toKey,
          stageBefore: stageOfFrom,
          depthBefore: depthOfFrom,
          depthAfter: depthOfTo
        });
      }
    }
  }

  // 5. Esculpe Corredor Inicial + Porta de Entrada Trancada + Porta Inicial + Corredor Final + Porta Especial
  rawDoors.push({ x: ENTRANCE_DOOR_POS.x, y: ENTRANCE_DOOR_POS.y, type: TILE_ENTRANCE_DOOR });

  let startDoorRecord, goalDoorRecord;
  if (START_POS.y === 33) {
    carveV(31, 33, START_POS.x);
    grid[30][START_POS.x] = TILE_DOOR;
    startDoorRecord = {
      x: START_POS.x,
      y: 30,
      forwardDir: 0,
      isSpineEdge: true,
      spineStep: 0,
      fromKey: 'corridor-start',
      toKey: startKey,
      stageBefore: 0,
      depthBefore: -1,
      depthAfter: 0
    };
  } else {
    carveV(2, 4, START_POS.x);
    grid[5][START_POS.x] = TILE_DOOR;
    startDoorRecord = {
      x: START_POS.x,
      y: 5,
      forwardDir: 2,
      isSpineEdge: true,
      spineStep: 0,
      fromKey: 'corridor-start',
      toKey: startKey,
      stageBefore: 0,
      depthBefore: -1,
      depthAfter: 0
    };
  }

  if (GOAL_POS.y === 2) {
    carveV(2, 5, GOAL_POS.x);
    grid[4][GOAL_POS.x] = TILE_DOOR;
    goalDoorRecord = {
      x: GOAL_POS.x,
      y: 4,
      forwardDir: 0,
      isSpineEdge: true,
      spineStep: L + 1,
      fromKey: goalKey,
      toKey: 'corridor-goal',
      stageBefore: L,
      depthBefore: treeDepth[goalKey],
      depthAfter: treeDepth[goalKey] + 1
    };
  } else {
    carveV(30, 33, GOAL_POS.x);
    grid[31][GOAL_POS.x] = TILE_DOOR;
    goalDoorRecord = {
      x: GOAL_POS.x,
      y: 31,
      forwardDir: 2,
      isSpineEdge: true,
      spineStep: L + 1,
      fromKey: goalKey,
      toKey: 'corridor-goal',
      stageBefore: L,
      depthBefore: treeDepth[goalKey],
      depthAfter: treeDepth[goalKey] + 1
    };
  }

  const specialApproachDir = GOAL_POS.y === 2 ? 0 : 2;
  rawDoors.push({
    x: SPECIAL_DOOR_POS.x,
    y: SPECIAL_DOOR_POS.y,
    type: TILE_SPECIAL_DOOR,
    forwardDir: specialApproachDir,
    isOneWay: true
  });
  grid[SPECIAL_DOOR_POS.y][SPECIAL_DOOR_POS.x] = TILE_SPECIAL_DOOR;

  // 6. ESCULPE BIFURCAÇÕES CEGAS / BECOS SEM SAÍDA GARANTINDO >= 1 BECO POR SALA
  const deadEnds = [];
  const deadEndCountByRoom = {};
  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 3; x++) {
      deadEndCountByRoom[`${x},${y}`] = 0;
    }
  }

  // A. Becos sem saída nas margens Norte (sy=0, Y=3) e Sul (sy=2, Y=32)
  for (let sx = 0; sx < 3; sx++) {
    const usesNorthMargin =
      (sx === startSecX && startSecY === 0) ||
      (sx === goalSecX && goalSecY === 0);
    if (!usesNorthMargin) {
      const rNode = sectorNodes[0][sx];
      const xStart = randInt(rNode.x0 + 1, rNode.x1 - 1);
      carveV(3, rNode.y0 - 1, xStart);
      const turnSign = xStart > (rNode.x0 + rNode.x1) * 0.5 ? -1 : 1;
      const endX = xStart + turnSign * 2;
      carveH(xStart, endX, 3);
      const endDir = turnSign === 1 ? 1 : 3;
      const d = DIRECTIONS[endDir];
      deadEnds.push({
        roomId: rNode.id,
        entryX: xStart,
        entryY: rNode.y0 - 1,
        entryDir: 0,
        endX,
        endY: 3,
        endDir,
        wallX: endX + d.dx,
        wallY: 3 + d.dy,
        face: (endDir + 2) % 4,
        stage: nodeStage[rNode.id],
        depth: treeDepth[rNode.id]
      });
      deadEndCountByRoom[rNode.id]++;
    }

    const usesSouthMargin =
      (sx === startSecX && startSecY === 2) ||
      (sx === goalSecX && goalSecY === 2);
    if (!usesSouthMargin) {
      const rNode = sectorNodes[2][sx];
      const xStart = randInt(rNode.x0 + 1, rNode.x1 - 1);
      carveV(rNode.y1 + 1, 32, xStart);
      const turnSign = xStart > (rNode.x0 + rNode.x1) * 0.5 ? -1 : 1;
      const endX = xStart + turnSign * 2;
      carveH(xStart, endX, 32);
      const endDir = turnSign === 1 ? 1 : 3;
      const d = DIRECTIONS[endDir];
      deadEnds.push({
        roomId: rNode.id,
        entryX: xStart,
        entryY: rNode.y1 + 1,
        entryDir: 2,
        endX,
        endY: 32,
        endDir,
        wallX: endX + d.dx,
        wallY: 32 + d.dy,
        face: (endDir + 2) % 4,
        stage: nodeStage[rNode.id],
        depth: treeDepth[rNode.id]
      });
      deadEndCountByRoom[rNode.id]++;
    }
  }

  // B. Becos sem saída nas margens Oeste (sx=0, X=3) e Leste (sx=2, X=32)
  for (let sy = 0; sy < 3; sy++) {
    const rWest = sectorNodes[sy][0];
    const yStartW = randInt(rWest.y0 + 1, rWest.y1 - 1);
    carveH(3, rWest.x0 - 1, yStartW);
    const turnSignW = yStartW > (rWest.y0 + rWest.y1) * 0.5 ? -1 : 1;
    const endYW = yStartW + turnSignW * 2;
    carveV(yStartW, endYW, 3);
    const endDirW = turnSignW === -1 ? 0 : 2;
    const dW = DIRECTIONS[endDirW];
    deadEnds.push({
      roomId: rWest.id,
      entryX: rWest.x0 - 1,
      entryY: yStartW,
      entryDir: 3,
      endX: 3,
      endY: endYW,
      endDir: endDirW,
      wallX: 3 + dW.dx,
      wallY: endYW + dW.dy,
      face: (endDirW + 2) % 4,
      stage: nodeStage[rWest.id],
      depth: treeDepth[rWest.id]
    });
    deadEndCountByRoom[rWest.id]++;

    const rEast = sectorNodes[sy][2];
    const yStartE = randInt(rEast.y0 + 1, rEast.y1 - 1);
    carveH(rEast.x1 + 1, 32, yStartE);
    const turnSignE = yStartE > (rEast.y0 + rEast.y1) * 0.5 ? -1 : 1;
    const endYE = yStartE + turnSignE * 2;
    carveV(yStartE, endYE, 32);
    const endDirE = turnSignE === -1 ? 0 : 2;
    const dE = DIRECTIONS[endDirE];
    deadEnds.push({
      roomId: rEast.id,
      entryX: rEast.x1 + 1,
      entryY: yStartE,
      entryDir: 1,
      endX: 32,
      endY: endYE,
      endDir: endDirE,
      wallX: 32 + dE.dx,
      wallY: endYE + dE.dy,
      face: (endDirE + 2) % 4,
      stage: nodeStage[rEast.id],
      depth: treeDepth[rEast.id]
    });
    deadEndCountByRoom[rEast.id]++;
  }

  // C. Nas 4 faixas internas não usadas pela Árvore Geradora (priorizando salas com menos becos, garantindo que a sala central 1,1 sempre tenha beco)
  const allInternalEdges = [];
  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 3; x++) {
      if (x + 1 < 3) allInternalEdges.push({ ax: x, ay: y, bx: x + 1, by: y });
      if (y + 1 < 3) allInternalEdges.push({ ax: x, ay: y, bx: x, by: y + 1 });
    }
  }
  const unusedInternalEdges = allInternalEdges.filter(
    e => !connectedEdges.has(edgeKey(e.ax, e.ay, e.bx, e.by))
  );

  const internalBridgeCandidates = [];

  for (const edge of unusedInternalEdges) {
    const nodeA = sectorNodes[edge.ay][edge.ax];
    const nodeB = sectorNodes[edge.by][edge.bx];
    const branchA = !(nodeA.id in spineIndexMap);
    const branchB = !(nodeB.id in spineIndexMap);
    const countA = deadEndCountByRoom[nodeA.id];
    const countB = deadEndCountByRoom[nodeB.id];
    const chosen = (branchA !== branchB) ? (branchA ? nodeA : nodeB) : (countA <= countB ? nodeA : nodeB);
    const otherNode = (chosen === nodeA) ? nodeB : nodeA;
    const chosenStage = nodeStage[chosen.id];
    const chosenDepth = treeDepth[chosen.id];
    deadEndCountByRoom[chosen.id]++;

    if (edge.ax !== edge.bx) {
      const isLeft = (chosen.sx === Math.min(edge.ax, edge.bx));
      const midX = Math.min(edge.ax, edge.bx) === 0 ? 12 : 23;
      const yStart = randInt(chosen.y0 + 1, chosen.y1 - 1);

      if (isLeft) {
        carveH(chosen.x1 + 1, midX, yStart);
        const turnSign = yStart > (chosen.y0 + chosen.y1) * 0.5 ? -1 : 1;
        const endY = yStart + turnSign * 2;
        carveV(yStart, endY, midX);
        const endDir = turnSign === -1 ? 0 : 2;
        const d = DIRECTIONS[endDir];
        const deObj = {
          roomId: chosen.id,
          otherRoomId: otherNode.id,
          entryX: chosen.x1 + 1,
          entryY: yStart,
          entryDir: 1,
          endX: midX,
          endY,
          endDir,
          wallX: midX + d.dx,
          wallY: endY + d.dy,
          face: (endDir + 2) % 4,
          stage: chosenStage,
          depth: chosenDepth,
          bridgeInfo: { axis: 'H', fromX: midX + 1, toX: otherNode.x0 - 1, bridgeY: endY, secretX: midX + 1, secretY: endY, forwardDir: 1 }
        };
        deadEnds.push(deObj);
        internalBridgeCandidates.push(deObj);
      } else {
        carveH(midX, chosen.x0 - 1, yStart);
        const turnSign = yStart > (chosen.y0 + chosen.y1) * 0.5 ? -1 : 1;
        const endY = yStart + turnSign * 2;
        carveV(yStart, endY, midX);
        const endDir = turnSign === -1 ? 0 : 2;
        const d = DIRECTIONS[endDir];
        const deObj = {
          roomId: chosen.id,
          otherRoomId: otherNode.id,
          entryX: chosen.x0 - 1,
          entryY: yStart,
          entryDir: 3,
          endX: midX,
          endY,
          endDir,
          wallX: midX + d.dx,
          wallY: endY + d.dy,
          face: (endDir + 2) % 4,
          stage: chosenStage,
          depth: chosenDepth,
          bridgeInfo: { axis: 'H', fromX: otherNode.x1 + 1, toX: midX - 1, bridgeY: endY, secretX: midX - 1, secretY: endY, forwardDir: 3 }
        };
        deadEnds.push(deObj);
        internalBridgeCandidates.push(deObj);
      }
    } else {
      const isTop = (chosen.sy === Math.min(edge.ay, edge.by));
      const midY = Math.min(edge.ay, edge.by) === 0 ? 12 : 23;
      const xStart = randInt(chosen.x0 + 1, chosen.x1 - 1);

      if (isTop) {
        carveV(chosen.y1 + 1, midY, xStart);
        const turnSign = xStart > (chosen.x0 + chosen.x1) * 0.5 ? -1 : 1;
        const endX = xStart + turnSign * 2;
        carveH(xStart, endX, midY);
        const endDir = turnSign === 1 ? 1 : 3;
        const d = DIRECTIONS[endDir];
        const deObj = {
          roomId: chosen.id,
          otherRoomId: otherNode.id,
          entryX: xStart,
          entryY: chosen.y1 + 1,
          entryDir: 2,
          endX,
          endY: midY,
          endDir,
          wallX: endX + d.dx,
          wallY: midY + d.dy,
          face: (endDir + 2) % 4,
          stage: chosenStage,
          depth: chosenDepth,
          bridgeInfo: { axis: 'V', fromY: midY + 1, toY: otherNode.y0 - 1, bridgeX: endX, secretX: endX, secretY: midY + 1, forwardDir: 2 }
        };
        deadEnds.push(deObj);
        internalBridgeCandidates.push(deObj);
      } else {
        carveV(midY, chosen.y0 - 1, xStart);
        const turnSign = xStart > (chosen.x0 + chosen.x1) * 0.5 ? -1 : 1;
        const endX = xStart + turnSign * 2;
        carveH(xStart, endX, midY);
        const endDir = turnSign === 1 ? 1 : 3;
        const d = DIRECTIONS[endDir];
        const deObj = {
          roomId: chosen.id,
          otherRoomId: otherNode.id,
          entryX: xStart,
          entryY: chosen.y0 - 1,
          entryDir: 0,
          endX,
          endY: midY,
          endDir,
          wallX: endX + d.dx,
          wallY: midY + d.dy,
          face: (endDir + 2) % 4,
          stage: chosenStage,
          depth: chosenDepth,
          bridgeInfo: { axis: 'V', fromY: otherNode.y1 + 1, toY: midY - 1, bridgeX: endX, secretX: endX, secretY: midY - 1, forwardDir: 0 }
        };
        deadEnds.push(deObj);
        internalBridgeCandidates.push(deObj);
      }
    }
  }

  // 7. PROGRESSÃO TOPOLÓGICA ESTRITA DE PORTAS REMOTAS, PORTAS DE VIA ÚNICA E CHAVES EM BECOS SEM SAÍDA
  // Garante 100% de acesso prévio em cadeia:
  // [Início] -> Botão R1 (Zona 1 aberta) -> Porta R1 -> Chave de Ferro -> Porta de Ferro (1W)
  //          -> Botão R2 (Zona 2 aberta) -> Porta R2 -> Botão R3 -> Porta R3 -> Chave de Ouro -> Porta de Ouro (1W) -> Saída Especial
  const allProgDoors = [startDoorRecord, ...treeDoorRecords, goalDoorRecord];
  const midSpineStep = Math.max(2, Math.floor(L / 2));

  // A. Porta Trancada a Ferro (`spineStep === midSpineStep`) e Porta Trancada a Ouro (`goalDoorRecord`)
  const ironGateDoor = allProgDoors.find(d => d.isSpineEdge && d.spineStep === midSpineStep);
  if (ironGateDoor) {
    ironGateDoor.lockType = 'iron';
  }
  goalDoorRecord.lockType = 'gold';

  // B. Portas de Via Única (3 de 10 portas = 30% >= 20%)
  // Como a Chave de Ferro fica atrás de R1 e a Chave de Ouro fica atrás de R2 e R3,
  // o jogador só consegue destrancar as portas de via única após já ter aberto todas as portas da respectiva zona!
  startDoorRecord.isOneWay = true;
  if (ironGateDoor) ironGateDoor.isOneWay = true;
  goalDoorRecord.isOneWay = true;

  const usedDeadEnds = new Set();

  function pickDeadEndInRoomSet(roomPredicate) {
    const candidates = deadEnds
      .map((de, idx) => ({ de, idx }))
      .filter(({ de, idx }) => !usedDeadEnds.has(idx) && roomPredicate(de.roomId));

    candidates.sort((a, b) => {
      const aBranch = (a.de.roomId in spineIndexMap) ? 0 : 1;
      const bBranch = (b.de.roomId in spineIndexMap) ? 0 : 1;
      if (bBranch !== aBranch) return bBranch - aBranch;
      return b.de.depth - a.de.depth;
    });

    if (candidates.length === 0) return null;
    usedDeadEnds.add(candidates[0].idx);
    return candidates[0].de;
  }

  // Decide se este mapa tera passagens secretas e quais modalidades (Mapa 1 tem todas as 3; demais mapas ~70% tem de 1 a 3, ~30% tem 0)
  const hasSecretPassages = (mapIndex === 1) ? true : (Math.random() < 0.75);
  const enableAdvanceSecret = hasSecretPassages && ((mapIndex === 1) ? true : (Math.random() < 0.85));
  const enableEmptyDeSecret = hasSecretPassages && ((mapIndex === 1) ? true : (Math.random() < 0.65));
  const enableKeyDeSecret   = hasSecretPassages && ((mapIndex === 1) ? true : (Math.random() < 0.65));

  // C. Zona 1 (`nodeStage < midSpineStep`): Porta Remota #1 (`R1`) + Chave de Ferro
  const zone1Doors = treeDoorRecords
    .filter(d => d !== ironGateDoor && d.stageBefore < midSpineStep)
    .sort((a, b) => {
      const aBranch = a.isSpineEdge ? 0 : 1;
      const bBranch = b.isSpineEdge ? 0 : 1;
      if (bBranch !== aBranch) return bBranch - aBranch;
      return b.depthAfter - a.depthAfter;
    });

  const remDoor1 = zone1Doors[0];
  remDoor1.isRemote = true;
  remDoor1.remoteId = 1;
  // Botao R1 fica em uma sala da Zona 1 fora da subarvore de R1 (100% acessivel desde a partida sem precisar abrir R1)
  remDoor1.remoteDeadEnd = pickDeadEndInRoomSet(
    rId => nodeStage[rId] < midSpineStep && !isInSubtreeOf(rId, remDoor1.toKey)
  );

  // Se a Chave de Ferro estiver em uma passagem secreta ('key_dead_end'), colocamos o beco da Chave de Ferro
  // na PRIMEIRA sala da Zona 1 (para o jogador passar por ela fechada primeiro!) e a alavanca que abre esse beco
  // no fundo de um beco da SEGUNDA ou TERCEIRA sala da Zona 1 (dentro da subarvore de R1, obrigando o jogador a voltar!).
  let ironDeadEnd = null;
  let ironKeyIsSecret = false;
  if (enableKeyDeSecret) {
    // Tenta escolher um beco na 1a sala (startKey) para esconder a Chave de Ferro atras de uma passagem secreta
    const earlyKeyDeIdx = deadEnds.findIndex(
      (de, idx) => !usedDeadEnds.has(idx) && de.roomId === startKey && de.entryX !== undefined
    );
    const laterLeverDeIdx = deadEnds.findIndex(
      (de, idx) => !usedDeadEnds.has(idx) && idx !== earlyKeyDeIdx &&
                   nodeStage[de.roomId] < midSpineStep &&
                   isInSubtreeOf(de.roomId, startKey) && de.roomId !== startKey
    );
    if (earlyKeyDeIdx !== -1 && laterLeverDeIdx !== -1) {
      usedDeadEnds.add(earlyKeyDeIdx);
      ironDeadEnd = deadEnds[earlyKeyDeIdx];
      ironKeyIsSecret = true;
    }
  }
  if (!ironDeadEnd) {
    ironDeadEnd = pickDeadEndInRoomSet(
      rId => nodeStage[rId] < midSpineStep && isInSubtreeOf(rId, remDoor1.toKey)
    );
  }

  keysOnFloor.push({
    id: 'key-iron',
    type: 'iron',
    name: 'Chave de Ferro',
    x: ironDeadEnd.endX,
    y: ironDeadEnd.endY,
    collected: false
  });

  // D. Zona 2 (`nodeStage >= midSpineStep`): Porta Remota #2 (`R2`) + Porta Remota #3 (`R3`) + Chave de Ouro
  const zone2DoorsByDepth = treeDoorRecords
    .filter(d => d !== ironGateDoor && d.stageBefore >= midSpineStep)
    .sort((a, b) => {
      if (b.depthAfter !== a.depthAfter) return b.depthAfter - a.depthAfter;
      return (a.isSpineEdge ? 0 : 1) - (b.isSpineEdge ? 0 : 1);
    });

  const remDoor3 = zone2DoorsByDepth[0];
  const rem2Candidates = zone2DoorsByDepth
    .slice(1)
    .filter(d => !isInSubtreeOf(d.toKey, remDoor3.toKey))
    .sort((a, b) => {
      const aBranch = a.isSpineEdge ? 0 : 1;
      const bBranch = b.isSpineEdge ? 0 : 1;
      if (bBranch !== aBranch) return bBranch - aBranch;
      return b.depthAfter - a.depthAfter;
    });
  const remDoor2 = rem2Candidates[0];

  remDoor2.isRemote = true;
  remDoor2.remoteId = 2;
  remDoor2.remoteDeadEnd = pickDeadEndInRoomSet(
    rId => nodeStage[rId] >= midSpineStep && !isInSubtreeOf(rId, remDoor2.toKey) && !isInSubtreeOf(rId, remDoor3.toKey)
  );

  remDoor3.isRemote = true;
  remDoor3.remoteId = 3;
  remDoor3.remoteDeadEnd = pickDeadEndInRoomSet(
    rId => nodeStage[rId] >= midSpineStep && isInSubtreeOf(rId, remDoor2.toKey) && !isInSubtreeOf(rId, remDoor3.toKey)
  );

  const goldDeadEnd = pickDeadEndInRoomSet(
    rId => nodeStage[rId] >= midSpineStep && isInSubtreeOf(rId, remDoor3.toKey)
  );

  keysOnFloor.push({
    id: 'key-gold',
    type: 'gold',
    name: 'Chave de Ouro',
    x: goldDeadEnd.endX,
    y: goldDeadEnd.endY,
    collected: false
  });

  // E. DINAMICA DE RETORNO (BACKTRACKING) DAS PASSAGENS SECRETAS (a -> b -> c -> d -> e):
  //    a. Jogador passa por uma 1a ou 2a sala (secretRoomId) onde a passagem secreta esta FECHADA na parede da sala;
  //    b. Jogador avanca ate uma 2a ou 3a sala descendente (leverRoomId, com treeDepth[leverRoomId] > treeDepth[secretRoomId]);
  //    c. Jogador explora os becos sem saida dessa 2a ou 3a sala;
  //    d. Jogador encontra e aciona a alavanca no beco sem saida dessa 2a ou 3a sala;
  //    e. Jogador RETORNA para a 1a ou 2a sala (secretRoomId) para verificar qual passagem secreta se abriu!
  function pickDescendantDeadEndLever(secretX, secretY, secretRoomId, extraRoomFilter) {
    const candidates = [];
    deadEnds.forEach((de, idx) => {
      if (usedDeadEnds.has(idx)) return;
      const inSameZone = (nodeStage[de.roomId] < midSpineStep) === (nodeStage[secretRoomId] < midSpineStep);
      if (!inSameZone) return;
      // Regra fundamental de Backtracking: a sala do beco da alavanca DEVE ser descendente estrita de secretRoomId
      // (ou ter profundidade estritamente maior na mesma zona), obrigando o jogador a passar por secretRoomId ANTES!
      if (de.roomId === secretRoomId) return;
      if (!isInSubtreeOf(de.roomId, secretRoomId) && treeDepth[de.roomId] <= treeDepth[secretRoomId]) return;
      if (extraRoomFilter && !extraRoomFilter(de.roomId)) return;

      const dist = Math.abs(de.endX - secretX) + Math.abs(de.endY - secretY);
      candidates.push({
        kind: 'dead_end',
        deIdx: idx,
        wallX: de.wallX,
        wallY: de.wallY,
        face: de.face,
        adjX: de.endX,
        adjY: de.endY,
        roomId: de.roomId,
        depthDiff: treeDepth[de.roomId] - treeDepth[secretRoomId],
        dist
      });
    });

    candidates.sort((a, b) => {
      if (b.depthDiff !== a.depthDiff) return b.depthDiff - a.depthDiff;
      return b.dist - a.dist;
    });

    if (candidates.length === 0) return null;
    usedDeadEnds.add(candidates[0].deIdx);
    return candidates[0];
  }

  const secretExtraDoors = [];

  if (hasSecretPassages) {
    // 1. Finalidade 'key_dead_end': O jogador entra no beco na 1a sala (startKey), caminha ate o final
    //    e chega a uma parede frontal pensando ser apenas um beco sem saida vazio; apos acionar a alavanca
    //    em outro beco (na 2a ou 3a sala), a parede frontal no fundo desse beco se abre revelando a Chave de Ferro!
    if (enableKeyDeSecret && ironKeyIsSecret && ironDeadEnd) {
      const secKeyX = ironDeadEnd.endX;
      const secKeyY = ironDeadEnd.endY;
      const hiddenKeyX = ironDeadEnd.wallX;
      const hiddenKeyY = ironDeadEnd.wallY;
      const leverSlot = pickDescendantDeadEndLever(
        secKeyX,
        secKeyY,
        ironDeadEnd.roomId,
        null
      );
      if (leverSlot && hiddenKeyX >= 2 && hiddenKeyX <= MAP_SIZE - 3 && hiddenKeyY >= 2 && hiddenKeyY <= MAP_SIZE - 3) {
        grid[hiddenKeyY][hiddenKeyX] = TILE_FREE;
        const ironKeyObj = keysOnFloor.find(k => k.type === 'iron');
        if (ironKeyObj) {
          ironKeyObj.x = hiddenKeyX;
          ironKeyObj.y = hiddenKeyY;
        }
        grid[secKeyY][secKeyX] = TILE_DOOR;
        secretExtraDoors.push({
          x: secKeyX,
          y: secKeyY,
          type: TILE_DOOR,
          forwardDir: ironDeadEnd.endDir,
          isOneWay: false,
          lockType: null,
          isRemote: false,
          isSecret: true,
          secretPurpose: 'key_dead_end',
          secretLeverSlot: leverSlot
        });
      }
    }

    // 2. Finalidade 'advance': O jogador entra em um corredor e chega a uma parede de pedra no final,
    //    pensando que ali e somente um beco sem saida. Depois de acionar uma alavanca em outro beco sem saida
    //    (em uma 2a ou 3a sala descendente), aquele primeiro beco sem saida se transforma em uma passagem para outra sala!
    if (enableAdvanceSecret) {
      const advCandidates = treeDoorRecords
        .filter(d => !d.lockType && !d.isRemote && !d.isOneWay && d.fromExitX !== undefined)
        .sort((a, b) => a.depthBefore - b.depthBefore);

      for (const cand of advCandidates) {
        const leverSlot = pickDescendantDeadEndLever(
          cand.x,
          cand.y,
          cand.fromKey,
          rId => {
            if (isInSubtreeOf(rId, cand.toKey)) return false;
            // Evita dependencia circular: se um botao remoto (R1, R2, R3) estiver atras de cand.toKey,
            // a alavanca de cand nao pode ficar atras da porta daquele botao remoto!
            for (const rd of [remDoor1, remDoor2, remDoor3]) {
              if (rd?.remoteDeadEnd && isInSubtreeOf(rd.remoteDeadEnd.roomId, cand.toKey)) {
                if (isInSubtreeOf(rId, rd.toKey)) return false;
              }
            }
            return true;
          }
        );
        if (leverSlot) {
          // A entrada do corredor (cand.fromExitX, cand.fromExitY) permanece ABERTA (TILE_FREE),
          // e a parede secreta fica no FINAL do corredor (cand.x, cand.y), fazendo o jogador entrar
          // no corredor, chegar a parede no fundo achando que e apenas um beco sem saida, e depois de
          // acionar a alavanca em outro beco sem saida, transformar esse beco em passagem para a sala cand.toKey!
          cand.isSecret = true;
          cand.secretPurpose = 'advance';
          cand.secretLeverSlot = leverSlot;
          break;
        }
      }

      // Se nenhuma aresta da arvore tiver ramificacao disponivel na mesma zona, transforma um beco sem saida
      // interno (internalBridgeCandidates) em uma passagem secreta no fundo do beco que leva a outra sala!
      if (!treeDoorRecords.some(d => d.isSecret)) {
        for (const bDe of internalBridgeCandidates) {
          const deIdx = deadEnds.indexOf(bDe);
          if (deIdx === -1 || usedDeadEnds.has(deIdx)) continue;
          const inSameZone = (nodeStage[bDe.roomId] < midSpineStep) === (nodeStage[bDe.otherRoomId] < midSpineStep);
          if (!inSameZone) continue;

          const roomChosen = sectorNodes[Number(bDe.roomId.split(',')[1])][Number(bDe.roomId.split(',')[0])];
          const roomOther  = sectorNodes[Number(bDe.otherRoomId.split(',')[1])][Number(bDe.otherRoomId.split(',')[0])];
          const chosenIsEarly = treeDepth[bDe.roomId] <= treeDepth[bDe.otherRoomId];
          const earlyRoomId = chosenIsEarly ? bDe.roomId : bDe.otherRoomId;
          const lateRoomId  = chosenIsEarly ? bDe.otherRoomId : bDe.roomId;

          const b = bDe.bridgeInfo;
          let otherDoorX, otherDoorY, secretX, secretY, forwardDir;

          if (b.axis === 'H') {
            const yOther = Math.max(roomOther.y0 + 1, Math.min(roomOther.y1 - 1, bDe.endY));
            const goingEastFromChosen = (roomOther.sx > roomChosen.sx);
            otherDoorX = goingEastFromChosen ? (roomOther.x0 - 1) : (roomOther.x1 + 1);
            otherDoorY = yOther;
            if (chosenIsEarly) {
              secretX = otherDoorX;
              secretY = otherDoorY;
              forwardDir = goingEastFromChosen ? 1 : 3;
            } else {
              secretX = bDe.entryX;
              secretY = bDe.entryY;
              forwardDir = goingEastFromChosen ? 3 : 1;
            }
          } else {
            const xOther = Math.max(roomOther.x0 + 1, Math.min(roomOther.x1 - 1, bDe.endX));
            const goingSouthFromChosen = (roomOther.sy > roomChosen.sy);
            otherDoorX = xOther;
            otherDoorY = goingSouthFromChosen ? (roomOther.y0 - 1) : (roomOther.y1 + 1);
            if (chosenIsEarly) {
              secretX = otherDoorX;
              secretY = otherDoorY;
              forwardDir = goingSouthFromChosen ? 2 : 0;
            } else {
              secretX = bDe.entryX;
              secretY = bDe.entryY;
              forwardDir = goingSouthFromChosen ? 0 : 2;
            }
          }

          usedDeadEnds.add(deIdx);
          const leverSlot = pickDescendantDeadEndLever(
            secretX,
            secretY,
            earlyRoomId,
            rId => {
              for (const rd of [remDoor1, remDoor2, remDoor3]) {
                if (!rd) continue;
                const earlyBehind = isInSubtreeOf(earlyRoomId, rd.toKey);
                const lateBehind  = isInSubtreeOf(lateRoomId, rd.toKey);
                if (earlyBehind !== lateBehind && !isInSubtreeOf(rId, rd.toKey)) {
                  return false;
                }
              }
              return true;
            }
          );

          if (leverSlot) {
            if (b.axis === 'H') {
              // Limpa eventual ponta do beco original em midX e esculpe corredor limpo entre bDe.entryY e otherDoorY
              const minOldY = Math.min(bDe.entryY, bDe.endY);
              const maxOldY = Math.max(bDe.entryY, bDe.endY);
              for (let yy = minOldY; yy <= maxOldY; yy++) grid[yy][bDe.endX] = TILE_WALL;
              carveV(bDe.entryY, otherDoorY, bDe.endX);
              carveH(bDe.endX, otherDoorX, otherDoorY);
            } else {
              const minOldX = Math.min(bDe.entryX, bDe.endX);
              const maxOldX = Math.max(bDe.entryX, bDe.endX);
              for (let xx = minOldX; xx <= maxOldX; xx++) grid[bDe.endY][xx] = TILE_WALL;
              carveH(bDe.entryX, otherDoorX, bDe.endY);
              carveV(bDe.endY, otherDoorY, otherDoorX);
            }
            grid[secretY][secretX] = TILE_DOOR;
            secretExtraDoors.push({
              x: secretX,
              y: secretY,
              type: TILE_DOOR,
              forwardDir,
              isOneWay: false,
              lockType: null,
              isRemote: false,
              isSecret: true,
              secretPurpose: 'advance',
              secretLeverSlot: leverSlot
            });
            break;
          } else {
            usedDeadEnds.delete(deIdx);
          }
        }
      }
    }

    // 3. Finalidade 'empty_dead_end': O jogador entra no beco, caminha ate o final
    //    e chega a uma parede frontal pensando ser o fim do beco; apos acionar a alavanca em outro beco
    //    (de uma sala descendente), a parede frontal no fundo desse beco se abre!
    if (enableEmptyDeSecret) {
      const emptyDeCandidates = deadEnds
        .map((de, idx) => ({ de, idx }))
        .filter(({ de, idx }) => !usedDeadEnds.has(idx) && de.entryX !== undefined)
        .sort((a, b) => {
          // Prioriza becos que NAO saem da primeira sala (startKey) para que o Mapa Encantado possa ficar neles!
          const aIsStart = (a.de.roomId === startKey || a.de.otherRoomId === startKey) ? 1 : 0;
          const bIsStart = (b.de.roomId === startKey || b.de.otherRoomId === startKey) ? 1 : 0;
          if (aIsStart !== bIsStart) return aIsStart - bIsStart;
          return a.de.depth - b.de.depth;
        });

      for (const { de: chosenEmpty, idx: emptyIdx } of emptyDeCandidates) {
        usedDeadEnds.add(emptyIdx);
        const secEmpX = chosenEmpty.endX;
        const secEmpY = chosenEmpty.endY;
        const hiddenEmpX = chosenEmpty.wallX;
        const hiddenEmpY = chosenEmpty.wallY;
        const leverSlot = pickDescendantDeadEndLever(
          secEmpX,
          secEmpY,
          chosenEmpty.roomId,
          rId => {
            const advDoor = treeDoorRecords.find(d => d.isSecret);
            if (advDoor && isInSubtreeOf(rId, advDoor.toKey) && !isInSubtreeOf(chosenEmpty.roomId, advDoor.toKey)) {
              return false;
            }
            return true;
          }
        );
        if (leverSlot && hiddenEmpX >= 2 && hiddenEmpX <= MAP_SIZE - 3 && hiddenEmpY >= 2 && hiddenEmpY <= MAP_SIZE - 3) {
          grid[hiddenEmpY][hiddenEmpX] = TILE_FREE;
          grid[secEmpY][secEmpX] = TILE_DOOR;
          secretExtraDoors.push({
            x: secEmpX,
            y: secEmpY,
            type: TILE_DOOR,
            forwardDir: chosenEmpty.endDir,
            isOneWay: false,
            lockType: null,
            isRemote: false,
            isSecret: true,
            secretPurpose: 'empty_dead_end',
            secretLeverSlot: leverSlot,
            originRoomId: chosenEmpty.roomId,
            otherRoomId: chosenEmpty.otherRoomId || null,
            hiddenX: hiddenEmpX,
            hiddenY: hiddenEmpY
          });
          break;
        } else {
          usedDeadEnds.delete(emptyIdx);
        }
      }
    }
  }

  // F. POSICIONAMENTO DO MAPA ENCANTADO NO CHÃO DA MASMORRA:
  //    Pode aparecer em qualquer momento da masmorra, EXCETO na primeira sala (startKey)
  //    e nos corredores ou becos que saem imediatamente da primeira sala!
  let mapFloorSpot = null;
  const emptySecDoor = secretExtraDoors.find(
    d => d.secretPurpose === 'empty_dead_end' &&
         d.hiddenX !== undefined &&
         d.originRoomId !== startKey &&
         d.otherRoomId !== startKey
  );
  if (emptySecDoor) {
    mapFloorSpot = { x: emptySecDoor.hiddenX, y: emptySecDoor.hiddenY, roomId: emptySecDoor.originRoomId };
  } else {
    // Escolhe qualquer sala da masmorra EXCETO a primeira sala (startKey, treeDepth >= 1)
    const candidateRoomIds = Object.keys(treeDepth).filter(rId => rId !== startKey && treeDepth[rId] >= 1);
    const chosenRoomId = candidateRoomIds[randInt(0, candidateRoomIds.length - 1)];
    const [rsx, rsy] = chosenRoomId.split(',').map(Number);
    const rNode = sectorNodes[rsy][rsx];
    mapFloorSpot = {
      x: Math.floor((rNode.x0 + rNode.x1) * 0.5),
      y: Math.floor((rNode.y0 + rNode.y1) * 0.5),
      roomId: chosenRoomId
    };
  }

  keysOnFloor.push({
    id: 'item-map',
    type: 'map',
    name: 'Mapa Encantado',
    x: mapFloorSpot.x,
    y: mapFloorSpot.y,
    collected: false
  });

  for (const d of allProgDoors) {
    rawDoors.push({
      x: d.x,
      y: d.y,
      type: TILE_DOOR,
      forwardDir: d.forwardDir,
      isOneWay: Boolean(d.isOneWay),
      lockType: d.lockType || null,
      isRemote: Boolean(d.isRemote),
      remoteId: d.remoteId || null,
      remoteDeadEnd: d.remoteDeadEnd || null,
      isSecret: Boolean(d.isSecret),
      secretPurpose: d.secretPurpose || null,
      secretLeverSlot: d.secretLeverSlot || null
    });
  }

  for (const sd of secretExtraDoors) {
    rawDoors.push(sd);
  }

  const totalOpenableDoors = allProgDoors.length;
  const remoteCount = allProgDoors.filter(d => d.isRemote).length;
  const oneWayCount = allProgDoors.filter(d => d.isOneWay).length;
  const secretCount = rawDoors.filter(d => d.isSecret).length;
  const totalCorridors = allProgDoors.length + deadEnds.length;
  dungeonMetrics = {
    remotePct: Math.round((remoteCount / totalOpenableDoors) * 100),
    oneWayPct: Math.round((oneWayCount / totalOpenableDoors) * 100),
    deadEndPct: Math.round((deadEnds.length / totalCorridors) * 100),
    secretCount
  };

  return { grid, rooms, doorList: rawDoors };
}
