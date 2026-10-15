/**
 * js/ui/compass.js
 * Bússola do HUD com animação de mola da agulha.
 */

let compassLastDir = null;

let compassTargetAngle = 0;

let compassCurrentAngle = 0;

let compassAngularVel = 0;

let compassAnimFrameId = null;

function applyCompassNeedleAngle(deg) {
  const needle = document.getElementById('compassNeedleGroup');
  if (!needle) return;
  const rounded = Math.round(deg * 100) / 100;
  if (needle.setAttribute) {
    needle.setAttribute('transform', `rotate(${rounded} 28 28)`);
    needle.setAttribute('data-target-angle', String(((Math.round(compassTargetAngle) % 360) + 360) % 360));
  }
  if (needle.style) {
    needle.style.transform = `rotate(${rounded}deg)`;
  }
}

function startCompassSpringAnimation() {
  if (compassAnimFrameId) cancelAnimationFrame(compassAnimFrameId);

  const stiffness = 0.24; // Rigidez da mola puxando para a nova direção cardinal
  const damping = 0.72;   // Amortecimento subcrítico para gerar oscilação elástica ao parar

  function stepCompassSpring() {
    const diff = compassTargetAngle - compassCurrentAngle;
    compassAngularVel = compassAngularVel * damping + diff * stiffness;
    compassCurrentAngle += compassAngularVel;

    if (Math.abs(compassTargetAngle - compassCurrentAngle) < 0.08 && Math.abs(compassAngularVel) < 0.08) {
      compassCurrentAngle = compassTargetAngle;
      compassAngularVel = 0;
      applyCompassNeedleAngle(compassCurrentAngle);
      compassAnimFrameId = null;
      return;
    }

    applyCompassNeedleAngle(compassCurrentAngle);
    compassAnimFrameId = requestAnimationFrame(stepCompassSpring);
  }

  stepCompassSpring();
}

function updateCompassHUD() {
  if (compassLastDir === null) {
    compassLastDir = player.dir;
    compassTargetAngle = player.dir * 90;
    compassCurrentAngle = compassTargetAngle;
    compassAngularVel = 0;
    applyCompassNeedleAngle(compassCurrentAngle);
  } else if (player.dir !== compassLastDir) {
    let deltaDeg = (player.dir - compassLastDir) * 90;
    if (deltaDeg > 180) deltaDeg -= 360;
    if (deltaDeg < -180) deltaDeg += 360;
    compassLastDir = player.dir;
    compassTargetAngle += deltaDeg;
    startCompassSpringAnimation();
  } else if (!compassAnimFrameId) {
    applyCompassNeedleAngle(compassCurrentAngle);
  }

  for (let dIdx = 0; dIdx < 4; dIdx++) {
    const letterEl = document.getElementById(`compassDir${dIdx}`);
    if (letterEl && letterEl.classList) {
      letterEl.classList.toggle('active', dIdx === player.dir);
    }
  }
}
