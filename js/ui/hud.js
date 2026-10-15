/**
 * js/ui/hud.js
 * HUD em HTML: inventário (20 slots), barras de Vida/Fadiga e ficha do personagem.
 */

function updateInventoryHUD() {
  const bIron = document.getElementById('badgeIronKey');
  const sIron = document.getElementById('statusIronKey');
  if (bIron && sIron) {
    bIron.classList.toggle('collected-iron', player.keys.iron);
    sIron.textContent = player.keys.iron ? 'No Inventário ✓' : (player.keysUsed.iron ? 'Usada ✓' : 'Ausente');
  }

  const bGold = document.getElementById('badgeGoldKey');
  const sGold = document.getElementById('statusGoldKey');
  if (bGold && sGold) {
    bGold.classList.toggle('collected-gold', player.keys.gold);
    sGold.textContent = player.keys.gold ? 'No Inventário ✓' : (player.keysUsed.gold ? 'Usada ✓' : 'Ausente');
  }

  const statsEl = document.getElementById('genStatsBar');
  if (statsEl) {
    statsEl.innerHTML =
      `<span>Remotas: ${dungeonMetrics.remotePct}%</span>` +
      `<span>Via Única: ${dungeonMetrics.oneWayPct}%</span>` +
      `<span>Secretas: ${dungeonMetrics.secretCount ?? 0}</span>`;
  }

  // Atualiza a janela horizontal de Inventário do jogador (20 slots)
  const invGrid = document.getElementById('playerInventoryGrid');
  const invCount = document.getElementById('playerInvCount');
  if (invCount) {
    invCount.textContent = `${playerInventoryItems.length} / ${INVENTORY_SLOTS_COUNT}`;
  }
  if (invGrid) {
    let htmlSlots = '';
    for (let i = 0; i < INVENTORY_SLOTS_COUNT; i++) {
      const item = playerInventoryItems[i];
      if (item) {
        const iconUri = (typeof KEY_TEXTURE_DATA_URIS !== 'undefined' && KEY_TEXTURE_DATA_URIS[item.type])
          ? KEY_TEXTURE_DATA_URIS[item.type]
          : '';
        const isMap = (item.type === 'map');
        const activeClass = (isMap && isEnchantedMapOpen) ? ' active-map-slot' : '';
        const burnClass   = (isMap && isMapBurning) ? ' burning-map-slot' : '';
        const clickAttr   = isMap ? ' onclick="toggleEnchantedMapView()"' : '';
        const slotTitle   = isMap
          ? `${item.name} — Clique para ${isEnchantedMapOpen ? 'fechar o mapa' : 'abrir o mapa da masmorra'}`
          : item.name;
        const fireOverlay = (isMap && isMapBurning) ? '<div class="map-fire-fx"><span>🔥</span></div>' : '';
        const slotClass   = `inv-slot filled filled-${item.type}${activeClass}${burnClass}`;
        htmlSlots += `<div class="${slotClass}" title="${slotTitle}"${clickAttr}>` +
          (iconUri ? `<img src="${iconUri}" alt="${item.name}" />` : '') +
          fireOverlay +
          `<span class="inv-slot-index">${i + 1}</span>` +
          `</div>`;
      } else {
        htmlSlots += `<div class="inv-slot" title="Slot vazio ${i + 1}"><span class="inv-slot-index">${i + 1}</span></div>`;
      }
    }
    invGrid.innerHTML = htmlSlots;
  }
}

function updateVigorBarsHUD() {
  if (!player.character || !player.character.vitals) return;
  const v = player.character.vitals;
  const maxHp = Math.max(1, v.maxHp);
  const maxFp = Math.max(1, v.maxFp);
  const hpPct = Math.max(0, Math.min(100, (v.hp / maxHp) * 100));
  const fpPct = Math.max(0, Math.min(100, (v.fp / maxFp) * 100));

  const fillVida = document.getElementById('barFillVida');
  const textVida = document.getElementById('valVidaText');
  const trackVida = document.getElementById('barTrackVida');
  if (fillVida) {
    if (fillVida.style) fillVida.style.width = `${hpPct.toFixed(1)}%`;
    if (fillVida.setAttribute) fillVida.setAttribute('data-pct', hpPct.toFixed(1));
  }
  if (textVida) {
    textVida.textContent = `${v.hp} / ${v.maxHp}`;
  }
  if (trackVida && trackVida.setAttribute) {
    trackVida.setAttribute('aria-valuemax', String(v.maxHp));
    trackVida.setAttribute('aria-valuenow', String(v.hp));
  }

  const fillFadiga = document.getElementById('barFillFadiga');
  const textFadiga = document.getElementById('valFadigaText');
  const trackFadiga = document.getElementById('barTrackFadiga');
  if (fillFadiga) {
    if (fillFadiga.style) fillFadiga.style.width = `${fpPct.toFixed(1)}%`;
    if (fillFadiga.setAttribute) fillFadiga.setAttribute('data-pct', fpPct.toFixed(1));
  }
  if (textFadiga) {
    textFadiga.textContent = `${v.fp} / ${v.maxFp}`;
  }
  if (trackFadiga && trackFadiga.setAttribute) {
    trackFadiga.setAttribute('aria-valuemax', String(v.maxFp));
    trackFadiga.setAttribute('aria-valuenow', String(v.fp));
  }
}

function updateCharacterHUD() {
  if (!player.character) {
    player.character = generateHeroicCharacter();
  }
  const ch = player.character;

  updateVigorBarsHUD();

  const nameInput = document.getElementById('charNameInput');
  if (nameInput) {
    if (nameInput.value !== undefined && document.activeElement !== nameInput) {
      nameInput.value = ch.name || '';
    }
    if (!nameInput._boundCharName) {
      nameInput._boundCharName = true;
      nameInput.addEventListener('input', (e) => {
        if (player.character) {
          player.character.name = e.target.value;
        }
      });
      nameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          nameInput.blur();
        }
        e.stopPropagation();
      });
    }
  }

  const raceSelect = document.getElementById('charRaceSelect');
  if (raceSelect) {
    if (document.activeElement !== raceSelect) {
      raceSelect.value = ch.race || '';
    }
    if (!raceSelect._boundCharRace) {
      raceSelect._boundCharRace = true;
      raceSelect.addEventListener('change', (e) => {
        setCharacterRace(e.target.value);
      });
      raceSelect.addEventListener('keydown', (e) => {
        e.stopPropagation();
      });
    }
  }

  const skillsEl = document.getElementById('charSkillsList');
  if (skillsEl && Array.isArray(ch.skills)) {
    let html = '';
    for (const sk of ch.skills) {
      html += `<div class="char-skill-row">` +
        `<div class="char-skill-left">` +
          `<span class="char-skill-name" title="${sk.name}">${sk.name}</span>` +
          `<span class="char-skill-meta">${sk.category}</span>` +
        `</div>` +
        `<span class="char-skill-level" title="Nível da Habilidade">${sk.level}</span>` +
      `</div>`;
    }
    skillsEl.innerHTML = html;
  }
}
