/**
 * js/render/projection.js
 * Matemática de projeção 3D em primeira pessoa (câmera, recorte, quads).
 */

const CAM_Z = 0.22;

const MIN_CLIP_Z = 0.16;

function localToMap(rx, rz) {
  const d = DIRECTIONS[player.dir];
  const rightX = -d.dy;
  const rightY = d.dx;
  return {
    mx: player.x + d.dx * rz + rightX * rx,
    my: player.y + d.dy * rz + rightY * rx
  };
}

function projectPoint(x, y, z, width, height) {
  const dz = Math.max(MIN_CLIP_Z, z - CAM_Z);
  const focal = height * 0.68;
  return {
    sx: width * 0.5 + (x / dz) * focal,
    sy: height * 0.5 + (y / dz) * focal
  };
}

function projectWorldPoint(worldX, worldY, vertY, width, height) {
  const d = DIRECTIONS[player.dir];
  const rightX = -d.dy;
  const rightY = d.dx;
  const camX = (worldX - player.x) * rightX + (worldY - player.y) * rightY;
  const camZ = (worldX - player.x) * d.dx + (worldY - player.y) * d.dy + 0.5;
  return {
    ...projectPoint(camX, vertY, camZ, width, height),
    camX,
    camZ
  };
}

function drawQuad(ctx, pts, fillStyle, strokeStyle, lineWidth = 1.5) {
  ctx.beginPath();
  ctx.moveTo(pts[0].sx, pts[0].sy);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i].sx, pts[i].sy);
  }
  ctx.closePath();

  if (fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

const Z_CLIP = CAM_Z + MIN_CLIP_Z;
