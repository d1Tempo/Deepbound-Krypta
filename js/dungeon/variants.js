/**
 * js/dungeon/variants.js
 * Escolha determinística das variações de textura (parede, piso, teto) e onde pode haver tocha.
 * Aqui nascem os "nomes" de textura que o renderizador desenha. (Os temas novos do GDD entram aqui.)
 */

/**
 * Seleciona deterministicamente a variação de textura Pixel Art para cada face de parede (wx, wy, face):
 * - 'base': Pedra talhada padrão
 * - 'torch': Parede com tocha acesa presa na pedra
 * - 'cobweb': Parede com teias de aranha
 * - 'cracked': Parede com rachadura profunda
 * - 'claw': Parede com arranhões de garras de criatura grande (lobisomem)
 * - 'rune': Parede com grilhões enferrujados e runa arcana de D&D
 */
/**
 * Verifica se o bloco de parede (wx, wy, face) pode receber uma tocha garantindo matematicamente
 * que NUNCA existam duas tochas em quadrados adjacentes (nem ortogonais, nem diagonais, nem no mesmo bloco).
 */
function canWallSlotHaveTorch(wx, wy, face) {
  // Paridade xadrez estrita ((wx + wy) % 2 === 0): garante matematicamente que dois blocos de parede
  // ortogonalmente adjacentes ((wx+1, wy), (wx-1, wy), (wx, wy+1), (wx, wy-1)) NUNCA tenham tochas juntos!
  if (((wx + wy) & 1) !== 0) return false;
  const canonicalFace = Math.abs((wx * 3 + wy * 7 + currentMapIndex * 5) % 4);
  if (face !== canonicalFace) return false;
  return true;
}

function getWallFaceVariant(wx, wy, face) {
  if (isSecretDoorCell(wx, wy) || getButtonsForWallFace(wx, wy, face).length > 0) {
    return 'base';
  }

  let h = (wx * 73856093) ^ (wy * 19349663) ^ (face * 83492791) ^ (currentMapIndex * 2654435761);
  h = Math.abs((h ^ (h >>> 13)) * 1274126177);
  const roll = h % 1000;

  // 1. Tochas: variação mais frequente depois da pedra básica (~6.5% do total de faces), sem jamais ficar em quadrados adjacentes!
  if (canWallSlotHaveTorch(wx, wy, face)) {
    if (roll < 520) {
      return 'torch';
    }
  }

  // 2. Parede básica ('base') é a mais comum (~84%); demais variações bem menos frequentes que a tocha,
  //    sendo a runa com grilhões ('rune') a mais rara de todas (~0.8%)!
  if (roll < 900) return 'base';
  if (roll < 928) return 'cracked';
  if (roll < 954) return 'cobweb';
  if (roll < 976) return 'leak';
  if (roll < 992) return 'claw';
  return 'rune';
}

function getFloorTileVariant(mx, my) {
  if (isAnyDoorCell(mx, my)) {
    return 'threshold';
  }

  let h = (mx * 92837111) ^ (my * 689287499) ^ (currentMapIndex * 283923481);
  h = Math.abs((h ^ (h >>> 13)) * 1274126177);
  const roll = h % 1000;

  // Forte prioridade para a textura básica (~83%)
  if (roll < 830) return 'base';
  if (roll < 895) return 'moss';
  if (roll < 945) return 'holes';
  if (roll < 982) return 'scratches';
  return 'grate';
}

function getCeilingTileVariant(mx, my) {
  const inRoom = Boolean(getRoomAt(mx, my));

  let hasAdjacentWallLeak = false;
  for (let dIdx = 0; dIdx < 4; dIdx++) {
    const d = DIRECTIONS[dIdx];
    const wx = mx + d.dx;
    const wy = my + d.dy;
    if (isSolidWall(wx, wy)) {
      const oppFace = (dIdx + 2) % 4;
      if (getWallFaceVariant(wx, wy, oppFace) === 'leak') {
        hasAdjacentWallLeak = true;
        break;
      }
    }
  }

  let h = (mx * 492876847) ^ (my * 715225739) ^ (currentMapIndex * 19349663);
  h = Math.abs((h ^ (h >>> 13)) * 1274126177);
  const roll = h % 1000;

  if (inRoom) {
    if (hasAdjacentWallLeak) return 'room_leak';
    if (roll < 860) return 'room_base';
    if (roll < 950) return 'room_cracked';
    return 'room_leak';
  } else {
    if (hasAdjacentWallLeak) return 'corr_leak';
    if (roll < 850) return 'corr_base';
    if (roll < 950) return 'corr_roots';
    return 'corr_leak';
  }
}
