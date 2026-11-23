/**
 * js/ui/hud.js
 * HUD em HTML: selos de chaves e métricas (modo desenvolvedor), barras de Vida/Fadiga e ficha do personagem.
 * A janela de inventário (bolsa do personagem selecionado) é desenhada por js/party/party-bag-hud.js.
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

  // A janela de inventário mostra a BOLSA do personagem selecionado (veja js/party/party-bag-hud.js).
  if (typeof PartyBagHud !== 'undefined') PartyBagHud.render();
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
