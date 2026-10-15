/**
 * js/render/frame.js
 * updateAll(): redesenha tudo (bússola, minimapa e primeira pessoa).
 */

function updateAll() {
  document.getElementById('valMap').textContent = currentMapIndex;
  document.getElementById('floorPill').textContent = `Mapa ${currentMapIndex}: ${currentTheme.name}`;
  document.getElementById('routeSummary').innerHTML =
    `Partida: <strong>(${START_POS.x}, ${START_POS.y})</strong> | Chegada Oposta: <strong>(${GOAL_POS.x}, ${GOAL_POS.y})</strong>`;
  document.getElementById('valX').textContent = player.x;
  document.getElementById('valY').textContent = player.y;
  document.getElementById('valDir').textContent = DIRECTIONS[player.dir].name;
  document.getElementById('stepCounter').textContent = `Passos: ${player.steps}`;
  document.getElementById('zoneLabel').textContent = getZoneName(player.x, player.y);

  updateCompassHUD();
  renderMinimap();
  renderFirstPerson();
}
