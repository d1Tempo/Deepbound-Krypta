/**
 * js/render/floor-ceiling.js
 * Desenho de piso e teto em perspectiva (com ladrilhos compostos em cache).
 */

/**
 * Compõe em um Canvas 160x160 em cache o piso de paralelepípedos + as bordas de cantaria desgastada
 * (com sujeira, rachaduras e arranhões) + as cantoneiras de ligação nas esquinas internas e externas!
 */
function getCompositedFloorTileSource(fVariant, baseTexImg, rx, rz, mx, my) {
  const borderImg = FLOOR_TEXTURE_IMAGES.border_frame;
  if (!borderImg || !borderImg.complete || !(borderImg.naturalWidth > 0 || borderImg.width > 0)) {
    return baseTexImg;
  }
  if (isAnyDoorCell(mx, my)) {
    return baseTexImg;
  }

  const leftN  = localToMap(rx - 1, rz);
  const rightN = localToMap(rx + 1, rz);
  const farN   = localToMap(rx,     rz + 1);
  const nearN  = localToMap(rx,     rz - 1);

  const diagFLN = localToMap(rx - 1, rz + 1);
  const diagFRN = localToMap(rx + 1, rz + 1);
  const diagNLN = localToMap(rx - 1, rz - 1);
  const diagNRN = localToMap(rx + 1, rz - 1);

  const farW   = isSolidWall(farN.mx,   farN.my)   || isClosedSecretDoor(farN.mx,   farN.my);
  const nearW  = isSolidWall(nearN.mx,  nearN.my)  || isClosedSecretDoor(nearN.mx,  nearN.my);
  const leftW  = isSolidWall(leftN.mx,  leftN.my)  || isClosedSecretDoor(leftN.mx,  leftN.my);
  const rightW = isSolidWall(rightN.mx, rightN.my) || isClosedSecretDoor(rightN.mx, rightN.my);

  const diagFL = isSolidWall(diagFLN.mx, diagFLN.my) || isClosedSecretDoor(diagFLN.mx, diagFLN.my);
  const diagFR = isSolidWall(diagFRN.mx, diagFRN.my) || isClosedSecretDoor(diagFRN.mx, diagFRN.my);
  const diagNL = isSolidWall(diagNLN.mx, diagNLN.my) || isClosedSecretDoor(diagNLN.mx, diagNLN.my);
  const diagNR = isSolidWall(diagNRN.mx, diagNRN.my) || isClosedSecretDoor(diagNRN.mx, diagNRN.my);

  const farDoor   = isAnyDoorCell(farN.mx,   farN.my)   && !farW;
  const nearDoor  = isAnyDoorCell(nearN.mx,  nearN.my)  && !nearW;
  const leftDoor  = isAnyDoorCell(leftN.mx,  leftN.my)  && !leftW;
  const rightDoor = isAnyDoorCell(rightN.mx, rightN.my) && !rightW;

  // Verifica se alguma parede adjacente tem vazamento de água ('leak') voltado para este quadrado do chão!
  const rightWorldFace = (player.dir + 1) % 4;
  const leftWorldFace  = (player.dir + 3) % 4;
  const frontWorldFace = (player.dir + 2) % 4;
  const backWorldFace  = player.dir;

  const leftLeak  = leftW  && getWallFaceVariant(leftN.mx,  leftN.my,  rightWorldFace) === 'leak';
  const rightLeak = rightW && getWallFaceVariant(rightN.mx, rightN.my, leftWorldFace)  === 'leak';
  const farLeak   = farW   && getWallFaceVariant(farN.mx,   farN.my,   frontWorldFace) === 'leak';
  const nearLeak  = nearW  && getWallFaceVariant(nearN.mx,  nearN.my,  backWorldFace)  === 'leak';

  const maskBits =
    (farW      ? 1     : 0) |
    (nearW     ? 2     : 0) |
    (leftW     ? 4     : 0) |
    (rightW    ? 8     : 0) |
    (diagFL    ? 16    : 0) |
    (diagFR    ? 32    : 0) |
    (diagNL    ? 64    : 0) |
    (diagNR    ? 128   : 0) |
    (farDoor   ? 256   : 0) |
    (nearDoor  ? 512   : 0) |
    (leftDoor  ? 1024  : 0) |
    (rightDoor ? 2048  : 0) |
    (farLeak   ? 4096  : 0) |
    (nearLeak  ? 8192  : 0) |
    (leftLeak  ? 16384 : 0) |
    (rightLeak ? 32768 : 0);

  if (maskBits === 0) {
    return baseTexImg;
  }

  const cacheKey = `${fVariant}_${maskBits}`;
  if (floorCompositeCache.has(cacheKey)) {
    return floorCompositeCache.get(cacheKey);
  }

  if (typeof document === "undefined" || !document.createElement) {
    return baseTexImg;
  }

  const offCanvas = document.createElement('canvas');
  offCanvas.width = 160;
  offCanvas.height = 160;
  const offCtx = offCanvas.getContext('2d');
  if (!offCtx || !offCtx.drawImage) {
    return baseTexImg;
  }

  offCtx.imageSmoothingEnabled = false;

  // Se houver parede com vazamento de água, aplica a textura de poça orientada exatamente na borda da parede que vaza!
  let floorDrawn = false;
  if (farLeak && FLOOR_TEXTURE_IMAGES.puddle_far?.complete) {
    offCtx.drawImage(FLOOR_TEXTURE_IMAGES.puddle_far, 0, 0, 160, 160);
    floorDrawn = true;
  } else if (leftLeak && FLOOR_TEXTURE_IMAGES.puddle_left?.complete) {
    offCtx.drawImage(FLOOR_TEXTURE_IMAGES.puddle_left, 0, 0, 160, 160);
    floorDrawn = true;
  } else if (rightLeak && FLOOR_TEXTURE_IMAGES.puddle_right?.complete) {
    offCtx.drawImage(FLOOR_TEXTURE_IMAGES.puddle_right, 0, 0, 160, 160);
    floorDrawn = true;
  } else if (nearLeak && FLOOR_TEXTURE_IMAGES.puddle_near?.complete) {
    offCtx.drawImage(FLOOR_TEXTURE_IMAGES.puddle_near, 0, 0, 160, 160);
    floorDrawn = true;
  }

  if (!floorDrawn) {
    offCtx.drawImage(baseTexImg, 0, 0, 160, 160);
  }

  const B = 22;
  const S = 14;

  // 1. Faixas retas da borda de cantaria desgastada
  if (farW) {
    offCtx.drawImage(borderImg, B, 0, 160 - 2 * B, B, B, 0, 160 - 2 * B, B);
  } else if (farDoor) {
    offCtx.drawImage(borderImg, B, 0, 160 - 2 * B, B, B, 0, 160 - 2 * B, S);
  }

  if (nearW) {
    offCtx.drawImage(borderImg, B, 160 - B, 160 - 2 * B, B, B, 160 - B, 160 - 2 * B, B);
  } else if (nearDoor) {
    offCtx.drawImage(borderImg, B, 160 - B, 160 - 2 * B, B, B, 160 - S, 160 - 2 * B, S);
  }

  if (leftW) {
    offCtx.drawImage(borderImg, 0, B, B, 160 - 2 * B, 0, B, B, 160 - 2 * B);
  } else if (leftDoor) {
    offCtx.drawImage(borderImg, 0, B, B, 160 - 2 * B, 0, B, S, 160 - 2 * B);
  }

  if (rightW) {
    offCtx.drawImage(borderImg, 160 - B, B, B, 160 - 2 * B, 160 - B, B, B, 160 - 2 * B);
  } else if (rightDoor) {
    offCtx.drawImage(borderImg, 160 - B, B, B, 160 - 2 * B, 160 - S, B, S, 160 - 2 * B);
  }

  // 2. Cantoneiras quadradas de ligação (22x22) nas esquinas internas E externas
  if (farW || leftW || diagFL) {
    offCtx.drawImage(borderImg, 0, 0, B, B, 0, 0, B, B);
  }
  if (farW || rightW || diagFR) {
    offCtx.drawImage(borderImg, 160 - B, 0, B, B, 160 - B, 0, B, B);
  }
  if (nearW || leftW || diagNL) {
    offCtx.drawImage(borderImg, 0, 160 - B, B, B, 0, 160 - B, B, B);
  }
  if (nearW || rightW || diagNR) {
    offCtx.drawImage(borderImg, 160 - B, 160 - B, B, B, 160 - B, 160 - B, B, B);
  }

  // 3. Onde há vazamento na parede, aplica apenas um escurecimento radial suave de pedra úmida sobre a borda (sem retângulos azuis!)
  if ((farLeak || leftLeak || rightLeak || nearLeak) && offCtx.createRadialGradient) {
    const wetSpots = [];
    if (farLeak)   wetSpots.push({ wx: 80,      wy: B * 0.5 });
    if (leftLeak)  wetSpots.push({ wx: B * 0.5, wy: 80      });
    if (rightLeak) wetSpots.push({ wx: 160 - B * 0.5, wy: 80 });
    if (nearLeak)  wetSpots.push({ wx: 80,      wy: 160 - B * 0.5 });

    for (const { wx, wy } of wetSpots) {
      const grad = offCtx.createRadialGradient(wx, wy, 2, wx, wy, 32);
      grad.addColorStop(0.0, 'rgba(8, 22, 30, 0.48)');
      grad.addColorStop(0.6, 'rgba(10, 28, 38, 0.22)');
      grad.addColorStop(1.0, 'rgba(10, 28, 38, 0.0)');
      offCtx.fillStyle = grad;
      offCtx.fillRect(0, 0, 160, 160);
    }
  }

  floorCompositeCache.set(cacheKey, offCanvas);
  return offCanvas;
}

/**
 * Compõe em cache 160x160 o ladrilho de teto (corredor com toras de madeira ou sala de cimento)
 * com a moldura harmônica de encontro com as paredes e viga de transição entre corredor e sala!
 */
function getCompositedCeilingTileSource(cKey, baseCeilImg, rx, rz, mx, my, inRoom) {
  const borderImg = FLOOR_TEXTURE_IMAGES.border_frame;
  if (!borderImg || !borderImg.complete || !(borderImg.naturalWidth > 0 || borderImg.width > 0)) {
    return baseCeilImg;
  }

  const leftN  = localToMap(rx - 1, rz);
  const rightN = localToMap(rx + 1, rz);
  const farN   = localToMap(rx,     rz + 1);
  const nearN  = localToMap(rx,     rz - 1);

  const diagFLN = localToMap(rx - 1, rz + 1);
  const diagFRN = localToMap(rx + 1, rz + 1);
  const diagNLN = localToMap(rx - 1, rz - 1);
  const diagNRN = localToMap(rx + 1, rz - 1);

  const farW   = isSolidWall(farN.mx,   farN.my)   || isClosedSecretDoor(farN.mx,   farN.my);
  const nearW  = isSolidWall(nearN.mx,  nearN.my)  || isClosedSecretDoor(nearN.mx,  nearN.my);
  const leftW  = isSolidWall(leftN.mx,  leftN.my)  || isClosedSecretDoor(leftN.mx,  leftN.my);
  const rightW = isSolidWall(rightN.mx, rightN.my) || isClosedSecretDoor(rightN.mx, rightN.my);

  const diagFL = isSolidWall(diagFLN.mx, diagFLN.my) || isClosedSecretDoor(diagFLN.mx, diagFLN.my);
  const diagFR = isSolidWall(diagFRN.mx, diagFRN.my) || isClosedSecretDoor(diagFRN.mx, diagFRN.my);
  const diagNL = isSolidWall(diagNLN.mx, diagNLN.my) || isClosedSecretDoor(diagNLN.mx, diagNLN.my);
  const diagNR = isSolidWall(diagNRN.mx, diagNRN.my) || isClosedSecretDoor(diagNRN.mx, diagNRN.my);

  // Transição entre o teto de cimento da sala e o teto de pedra/toras do corredor
  const farTrans   = !farW   && (Boolean(getRoomAt(farN.mx,   farN.my))   !== inRoom);
  const nearTrans  = !nearW  && (Boolean(getRoomAt(nearN.mx,  nearN.my))  !== inRoom);
  const leftTrans  = !leftW  && (Boolean(getRoomAt(leftN.mx,  leftN.my))  !== inRoom);
  const rightTrans = !rightW && (Boolean(getRoomAt(rightN.mx, rightN.my)) !== inRoom);

  // Verifica se alguma parede adjacente possui uma tocha acesa para projetar luz radial suave no espaço 160x160 da textura
  // (que decai até alpha = 0 ANTES de atingir as bordas dos ladrilhos vizinhos, nunca evidenciando o quadrilátero!)
  const rightWorldFace = (player.dir + 1) % 4;
  const leftWorldFace  = (player.dir + 3) % 4;
  const frontWorldFace = (player.dir + 2) % 4;
  const backWorldFace  = player.dir;

  const leftTorch  = leftW  && getWallFaceVariant(leftN.mx,  leftN.my,  rightWorldFace) === 'torch';
  const rightTorch = rightW && getWallFaceVariant(rightN.mx, rightN.my, leftWorldFace)  === 'torch';
  const farTorch   = farW   && getWallFaceVariant(farN.mx,   farN.my,   frontWorldFace) === 'torch';
  const nearTorch  = nearW  && getWallFaceVariant(nearN.mx,  nearN.my,  backWorldFace)  === 'torch';

  const hasAnyTorch = (farTorch || nearTorch || leftTorch || rightTorch);
  const torchSwayIdx = hasAnyTorch ? getGlobalTorchSwayIndex() : 2;

  const maskBits =
    (farW       ? 1     : 0) |
    (nearW      ? 2     : 0) |
    (leftW      ? 4     : 0) |
    (rightW     ? 8     : 0) |
    (diagFL     ? 16    : 0) |
    (diagFR     ? 32    : 0) |
    (diagNL     ? 64    : 0) |
    (diagNR     ? 128   : 0) |
    (farTrans   ? 256   : 0) |
    (nearTrans  ? 512   : 0) |
    (leftTrans  ? 1024  : 0) |
    (rightTrans ? 2048  : 0) |
    (farTorch   ? 4096  : 0) |
    (nearTorch  ? 8192  : 0) |
    (leftTorch  ? 16384 : 0) |
    (rightTorch ? 32768 : 0);

  if (maskBits === 0) {
    return baseCeilImg;
  }

  const cacheKey = hasAnyTorch ? `${cKey}_${maskBits}_sway${torchSwayIdx}` : `${cKey}_${maskBits}`;
  if (ceilCompositeCache.has(cacheKey)) {
    return ceilCompositeCache.get(cacheKey);
  }

  if (typeof document === "undefined" || !document.createElement) {
    return baseCeilImg;
  }

  const offCanvas = document.createElement('canvas');
  offCanvas.width = 160;
  offCanvas.height = 160;
  const offCtx = offCanvas.getContext('2d');
  if (!offCtx || !offCtx.drawImage) {
    return baseCeilImg;
  }

  offCtx.imageSmoothingEnabled = false;
  offCtx.drawImage(baseCeilImg, 0, 0, 160, 160);

  const B = 20; // Largura da borda de cantaria desgastada no encontro teto-parede e na passagem sala-corredor
  const otherImg = inRoom
    ? (CEIL_TEXTURE_IMAGES.corr_base_h || baseCeilImg)
    : (CEIL_TEXTURE_IMAGES.room_base || baseCeilImg);

  // 1. Na passagem entre sala e corredor, faz elementos de uma textura avançarem gradualmente sobre a outra
  //    e emoldura a passagem com uma borda de cantaria desgastada (arco/verga de pedra)!
  if (otherImg && otherImg.complete) {
    const steps = [
      { d0: 0,  d1: 14, alpha: 0.75 },
      { d0: 14, d1: 28, alpha: 0.48 },
      { d0: 28, d1: 42, alpha: 0.22 }
    ];
    if (nearTrans) {
      for (const st of steps) {
        offCtx.globalAlpha = st.alpha;
        offCtx.drawImage(otherImg, 0, st.d0, 160, st.d1 - st.d0, 0, st.d0, 160, st.d1 - st.d0);
      }
      offCtx.globalAlpha = 1.0;
      offCtx.drawImage(borderImg, B, 0, 160 - 2 * B, B, B, 0, 160 - 2 * B, B);
    }
    if (farTrans) {
      for (const st of steps) {
        offCtx.globalAlpha = st.alpha;
        offCtx.drawImage(otherImg, 0, 160 - st.d1, 160, st.d1 - st.d0, 0, 160 - st.d1, 160, st.d1 - st.d0);
      }
      offCtx.globalAlpha = 1.0;
      offCtx.drawImage(borderImg, B, 160 - B, 160 - 2 * B, B, B, 160 - B, 160 - 2 * B, B);
    }
    if (leftTrans) {
      for (const st of steps) {
        offCtx.globalAlpha = st.alpha;
        offCtx.drawImage(otherImg, st.d0, 0, st.d1 - st.d0, 160, st.d0, 0, st.d1 - st.d0, 160);
      }
      offCtx.globalAlpha = 1.0;
      offCtx.drawImage(borderImg, 0, B, B, 160 - 2 * B, 0, B, B, 160 - 2 * B);
    }
    if (rightTrans) {
      for (const st of steps) {
        offCtx.globalAlpha = st.alpha;
        offCtx.drawImage(otherImg, 160 - st.d1, 0, st.d1 - st.d0, 160, 160 - st.d1, 0, st.d1 - st.d0, 160);
      }
      offCtx.globalAlpha = 1.0;
      offCtx.drawImage(borderImg, 160 - B, B, B, 160 - 2 * B, 160 - B, B, B, 160 - 2 * B);
    }
  }

  // 2. Moldura de cantaria desgastada onde o teto encontra as paredes
  if (nearW) {
    offCtx.drawImage(borderImg, B, 0, 160 - 2 * B, B, B, 0, 160 - 2 * B, B);
  }
  if (farW) {
    offCtx.drawImage(borderImg, B, 160 - B, 160 - 2 * B, B, B, 160 - B, 160 - 2 * B, B);
  }
  if (leftW) {
    offCtx.drawImage(borderImg, 0, B, B, 160 - 2 * B, 0, B, B, 160 - 2 * B);
  }
  if (rightW) {
    offCtx.drawImage(borderImg, 160 - B, B, B, 160 - 2 * B, 160 - B, B, B, 160 - 2 * B);
  }

  // 3. Cantoneiras de ligação nas esquinas internas, externas e junto às passagens
  if (nearW || leftW || diagNL || (nearTrans && (leftW || diagNL)) || (leftTrans && (nearW || diagNL))) {
    offCtx.drawImage(borderImg, 0, 0, B, B, 0, 0, B, B);
  }
  if (nearW || rightW || diagNR || (nearTrans && (rightW || diagNR)) || (rightTrans && (nearW || diagNR))) {
    offCtx.drawImage(borderImg, 160 - B, 0, B, B, 160 - B, 0, B, B);
  }
  if (farW || leftW || diagFL || (farTrans && (leftW || diagFL)) || (leftTrans && (farW || diagFL))) {
    offCtx.drawImage(borderImg, 0, 160 - B, B, B, 0, 160 - B, B, B);
  }
  if (farW || rightW || diagFR || (farTrans && (rightW || diagFR)) || (rightTrans && (farW || diagFR))) {
    offCtx.drawImage(borderImg, 160 - B, 160 - B, B, B, 160 - B, 160 - B, B, B);
  }

  // 4. Iluminação radial suave da tocha no espaço 160x160 da textura do teto:
  //    Centrada na borda da parede onde a tocha está fixada com raio = 66px (< 80px),
  //    caindo suavemente até alpha = 0 ANTES de tocar qualquer ladrilho vizinho!
  if (hasAnyTorch && offCtx.createRadialGradient) {
    const sway = TORCH_SWAY_STEPS[torchSwayIdx] || 0;
    const shift = sway * 8.5; // Balança suavemente o foco da luz no teto acompanhando a chama da parede
    const torchPositions = [];
    if (farTorch)   torchPositions.push({ gx: 80 + shift, gy: 152 });
    if (nearTorch)  torchPositions.push({ gx: 80 - shift, gy: 8   });
    if (leftTorch)  torchPositions.push({ gx: 8,          gy: 80 + shift });
    if (rightTorch) torchPositions.push({ gx: 152,        gy: 80 - shift });

    const R = 65;
    for (const { gx, gy } of torchPositions) {
      const grad = offCtx.createRadialGradient(gx, gy, 3, gx, gy, R);
      grad.addColorStop(0.0, 'rgba(255, 190, 75, 0.52)');
      grad.addColorStop(0.35, 'rgba(255, 138, 35, 0.28)');
      grad.addColorStop(0.70, 'rgba(235, 105, 20, 0.09)');
      grad.addColorStop(1.0, 'rgba(235, 105, 20, 0.0)');
      offCtx.fillStyle = grad;
      offCtx.fillRect(0, 0, 160, 160);
    }
  }

  ceilCompositeCache.set(cacheKey, offCanvas);
  return offCanvas;
}

function drawPerspectiveFloorTile(ctx, texSource, fPts, z0, z1, H) {
  const texW = texSource.naturalWidth || texSource.width || 160;
  const texH = texSource.naturalHeight || texSource.height || 160;

  const yNear = fPts[0].sy;
  const yFar = fPts[3].sy;
  const totalSpanY = Math.abs(yNear - yFar);
  if (totalSpanY < 0.5) return;

  const zStart = Math.max(Z_CLIP, z0);
  const wClip = (zStart - z0) / Math.max(0.001, z1 - z0);

  const dzA = Math.max(MIN_CLIP_Z, zStart - CAM_Z);
  const dzB = Math.max(MIN_CLIP_Z, z1 - CAM_Z);
  const invZA = 1 / dzA;
  const invZB = 1 / dzB;

  const dy = yFar - yNear;
  let tMin = 0;
  let tMax = 1;
  if (Math.abs(dy) > 0.001) {
    const tAtBottom = ((H + 2) - yNear) / dy;
    const tAtTop    = (-2 - yNear) / dy;
    tMin = Math.max(0, Math.min(tAtBottom, tAtTop));
    tMax = Math.min(1, Math.max(tAtBottom, tAtTop));
  }
  if (tMax <= tMin) return;

  const visSpanY = totalSpanY * (tMax - tMin);
  const strips = Math.min(180, Math.max(12, Math.ceil(visSpanY / 1.4)));

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  ctx.beginPath();
  ctx.moveTo(fPts[0].sx, fPts[0].sy);
  ctx.lineTo(fPts[1].sx, fPts[1].sy);
  ctx.lineTo(fPts[2].sx, fPts[2].sy);
  ctx.lineTo(fPts[3].sx, fPts[3].sy);
  ctx.closePath();
  ctx.clip();

  for (let s = 0; s < strips; s++) {
    const t0 = tMin + (tMax - tMin) * (s / strips);
    const t1 = tMin + (tMax - tMin) * ((s + 1) / strips);
    const tm = (t0 + t1) * 0.5;

    const sy0 = yNear + dy * t0;
    const sy1 = yNear + dy * t1;

    const sxLeft  = fPts[0].sx + (fPts[3].sx - fPts[0].sx) * tm;
    const sxRight = fPts[1].sx + (fPts[2].sx - fPts[1].sx) * tm;

    const denom0 = (1 - t0) * invZA + t0 * invZB;
    const denom1 = (1 - t1) * invZA + t1 * invZB;
    const sLocal0 = (t0 * invZB) / denom0;
    const sLocal1 = (t1 * invZB) / denom1;

    const w0 = wClip + (1 - wClip) * sLocal0;
    const w1 = wClip + (1 - wClip) * sLocal1;

    const v0 = 1 - w0;
    const v1 = 1 - w1;
    const vMin = Math.max(0, Math.min(v0, v1));
    const vMax = Math.min(1, Math.max(v0, v1));

    const srcY = Math.min(texH - 1, Math.floor(vMin * texH));
    const srcH = Math.max(1, Math.min(texH - srcY, Math.ceil((vMax - vMin) * texH)));

    const dstX = sxLeft - 0.5;
    const dstW = Math.max(1, (sxRight - sxLeft) + 1.0);
    const dstY = Math.min(sy0, sy1) - 0.45;
    const dstH = Math.abs(sy1 - sy0) + 1.0;

    ctx.drawImage(texSource, 0, srcY, texW, srcH, dstX, dstY, dstW, dstH);
  }

  ctx.restore();
}

function drawPerspectiveCeilingTile(ctx, texSource, cPts, z0, z1, H) {
  const texW = texSource.naturalWidth || texSource.width || 160;
  const texH = texSource.naturalHeight || texSource.height || 160;

  // No teto: cPts[0] e cPts[1] estão em zNear (borda superior na tela), e cPts[3] e cPts[2] estão em zFar (mais perto de H/2)
  const yNear = cPts[0].sy;
  const yFar = cPts[3].sy;
  const totalSpanY = Math.abs(yFar - yNear);
  if (totalSpanY < 0.5) return;

  const zStart = Math.max(Z_CLIP, z0);
  const wClip = (zStart - z0) / Math.max(0.001, z1 - z0);

  const dzA = Math.max(MIN_CLIP_Z, zStart - CAM_Z);
  const dzB = Math.max(MIN_CLIP_Z, z1 - CAM_Z);
  const invZA = 1 / dzA;
  const invZB = 1 / dzB;

  const dy = yFar - yNear;
  let tMin = 0;
  let tMax = 1;
  if (Math.abs(dy) > 0.001) {
    const tAtTop = (-2 - yNear) / dy;
    const tAtMid = ((H * 0.5 + 2) - yNear) / dy;
    tMin = Math.max(0, Math.min(tAtTop, tAtMid));
    tMax = Math.min(1, Math.max(tAtTop, tAtMid));
  }
  if (tMax <= tMin) return;

  const visSpanY = totalSpanY * (tMax - tMin);
  const strips = Math.min(180, Math.max(12, Math.ceil(visSpanY / 1.4)));

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  ctx.beginPath();
  ctx.moveTo(cPts[0].sx, cPts[0].sy);
  ctx.lineTo(cPts[1].sx, cPts[1].sy);
  ctx.lineTo(cPts[2].sx, cPts[2].sy);
  ctx.lineTo(cPts[3].sx, cPts[3].sy);
  ctx.closePath();
  ctx.clip();

  for (let s = 0; s < strips; s++) {
    const t0 = tMin + (tMax - tMin) * (s / strips);
    const t1 = tMin + (tMax - tMin) * ((s + 1) / strips);
    const tm = (t0 + t1) * 0.5;

    const sy0 = yNear + dy * t0;
    const sy1 = yNear + dy * t1;

    const sxLeft  = cPts[0].sx + (cPts[3].sx - cPts[0].sx) * tm;
    const sxRight = cPts[1].sx + (cPts[2].sx - cPts[1].sx) * tm;

    const denom0 = (1 - t0) * invZA + t0 * invZB;
    const denom1 = (1 - t1) * invZA + t1 * invZB;
    const sLocal0 = (t0 * invZB) / denom0;
    const sLocal1 = (t1 * invZB) / denom1;

    const w0 = wClip + (1 - wClip) * sLocal0;
    const w1 = wClip + (1 - wClip) * sLocal1;

    const vMin = Math.max(0, Math.min(w0, w1));
    const vMax = Math.min(1, Math.max(w0, w1));

    const srcY = Math.min(texH - 1, Math.floor(vMin * texH));
    const srcH = Math.max(1, Math.min(texH - srcY, Math.ceil((vMax - vMin) * texH)));

    const dstX = sxLeft - 0.5;
    const dstW = Math.max(1, (sxRight - sxLeft) + 1.0);
    const dstY = Math.min(sy0, sy1) - 0.45;
    const dstH = Math.abs(sy1 - sy0) + 1.0;

    ctx.drawImage(texSource, 0, srcY, texW, srcH, dstX, dstY, dstW, dstH);
  }

  ctx.restore();
}

function drawCeilingCell3D(ctx, rx, rz, mx, my, x0, x1, z0, z1, cPts, distFactor, inRoom, isChecker, W, H) {
  let ceilStroke = null;
  if (renderMode !== 'solid') {
    ceilStroke = renderMode === 'wireframe'
      ? `rgba(56, 139, 253, ${0.25 * distFactor})`
      : `rgba(88, 166, 255, ${0.12 * distFactor})`;
  }

  if (renderMode === 'wireframe') {
    drawQuad(ctx, cPts, null, ceilStroke, 1);
    return;
  }

  const cVariant = getCeilingTileVariant(mx, my);
  let texKey = cVariant;

  const leftN  = localToMap(rx - 1, rz);
  const rightN = localToMap(rx + 1, rz);
  const farN   = localToMap(rx,     rz + 1);
  const nearN  = localToMap(rx,     rz - 1);

  const leftW  = isSolidWall(leftN.mx,  leftN.my)  || isClosedSecretDoor(leftN.mx,  leftN.my);
  const rightW = isSolidWall(rightN.mx, rightN.my) || isClosedSecretDoor(rightN.mx, rightN.my);
  const farW   = isSolidWall(farN.mx,   farN.my)   || isClosedSecretDoor(farN.mx,   farN.my);
  const nearW  = isSolidWall(nearN.mx,  nearN.my)  || isClosedSecretDoor(nearN.mx,  nearN.my);

  if (!inRoom) {
    const isCrossCorridor = (farW || nearW) && !leftW && !rightW;
    texKey = `${cVariant}_${isCrossCorridor ? 'v' : 'h'}`;
  }

  const baseCeilImg = CEIL_TEXTURE_IMAGES[texKey] || CEIL_TEXTURE_IMAGES.corr_base_h || CEIL_TEXTURE_IMAGES.room_base;
  const hasTex = Boolean(baseCeilImg && baseCeilImg.complete && (baseCeilImg.naturalWidth > 0 || baseCeilImg.width > 0));

  if (hasTex) {
    const compositedCeil = getCompositedCeilingTileSource(texKey, baseCeilImg, rx, rz, mx, my, inRoom);
    drawPerspectiveCeilingTile(ctx, compositedCeil, cPts, z0, z1, H);

    // Mantém atenuação de profundidade 100% contínua entre quadrados vizinhos (sem saltos por polígono!)
    const darkAlpha = Math.max(0, Math.min(0.88, 1 - distFactor * 0.92));
    drawQuad(
      ctx,
      cPts,
      darkAlpha > 0.01 ? `rgba(4, 7, 12, ${darkAlpha.toFixed(3)})` : null,
      ceilStroke,
      1
    );
  } else {
    const base = isChecker ? 22 : 16;
    const v = Math.round(base * distFactor);
    const ceilFill = `rgb(${v}, ${Math.round(v * 1.1)}, ${Math.round(v * 1.25)})`;
    drawQuad(ctx, cPts, ceilFill, ceilStroke, 1);
  }
}

function drawFloorCell3D(ctx, rx, rz, mx, my, x0, x1, z0, z1, fPts, distFactor, isGoalTile, isStartTile, inRoom, isChecker, W, H) {
  let floorStroke = null;
  if (renderMode !== 'solid') {
    floorStroke = isGoalTile
      ? `rgba(210, 168, 255, ${0.7 * distFactor})`
      : (renderMode === 'wireframe'
          ? `rgba(56, 139, 253, ${0.45 * distFactor})`
          : `rgba(88, 166, 255, ${0.18 * distFactor})`);
  }

  if (renderMode === 'wireframe') {
    drawQuad(ctx, fPts, null, floorStroke, isGoalTile ? 1.8 : 1);
    return;
  }

  const fVariant = getFloorTileVariant(mx, my);
  let texKey = fVariant;
  if (fVariant === 'threshold') {
    const passageEW = isSolidWall(mx, my - 1) && isSolidWall(mx, my + 1);
    const lookingEW = (player.dir === 1 || player.dir === 3);
    texKey = (passageEW === lookingEW) ? 'threshold_h' : 'threshold_v';
  }

  const baseTexImg = FLOOR_TEXTURE_IMAGES[texKey] || FLOOR_TEXTURE_IMAGES.base;
  const hasTex = Boolean(baseTexImg && baseTexImg.complete && (baseTexImg.naturalWidth > 0 || baseTexImg.width > 0));

  if (hasTex) {
    const compositedSource = getCompositedFloorTileSource(texKey, baseTexImg, rx, rz, mx, my);
    drawPerspectiveFloorTile(ctx, compositedSource, fPts, z0, z1, H);

    // Sem aplicacao de cores artificiais sobre o piso proximo as portas

    const darkAlpha = Math.max(0, Math.min(0.88, 1 - distFactor * 0.95));
    drawQuad(
      ctx,
      fPts,
      darkAlpha > 0.01 ? `rgba(4, 7, 12, ${darkAlpha.toFixed(3)})` : null,
      floorStroke,
      isGoalTile ? 1.8 : 1
    );
  } else {
    const base = isChecker ? 36 : 26;
    const v = Math.round(base * distFactor);
    const floorFill = `rgb(${v}, ${Math.round(v * 1.15)}, ${Math.round(v * 1.35)})`;
    drawQuad(ctx, fPts, floorFill, floorStroke, isGoalTile ? 1.8 : 1);
  }
}
