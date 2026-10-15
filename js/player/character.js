/**
 * js/player/character.js
 * Ficha do personagem: habilidades de combate, vigor por raça (Vida/Fadiga),
 * geração do herói e funções para alterar Vida, Fadiga e Raça.
 */

const WARRIOR_COMBAT_SKILLS = [
  { id: 'broadsword',       name: 'Espada Larga',     category: 'Lâmina Média',      minLvl: 14, maxLvl: 17, core: true  },
  { id: 'shield',           name: 'Escudo',           category: 'Defesa',            minLvl: 14, maxLvl: 17, core: true  },
  { id: 'brawling',         name: 'Briga',            category: 'Combate Desarmado', minLvl: 13, maxLvl: 16, core: true  },
  { id: 'axe_mace',         name: 'Machado / Maça',   category: 'Arma de Impacto',   minLvl: 13, maxLvl: 16, core: true  },
  { id: 'knife',            name: 'Faca',             category: 'Lâmina Curta',      minLvl: 13, maxLvl: 16, core: false },
  { id: 'wrestling',        name: 'Luta Livre',       category: 'Agarramento',       minLvl: 13, maxLvl: 16, core: false },
  { id: 'spear',            name: 'Lança',            category: 'Arma de Haste',     minLvl: 13, maxLvl: 16, core: false },
  { id: 'shortsword',       name: 'Espada Curta',     category: 'Lâmina Curta',      minLvl: 13, maxLvl: 16, core: false },
  { id: 'two_handed_sword', name: 'Montante',         category: 'Lâmina Pesada',     minLvl: 13, maxLvl: 16, core: false },
  { id: 'karate',           name: 'Combate Marcial',  category: 'Arte Marcial',      minLvl: 13, maxLvl: 15, core: false }
];

const RACE_VITALS_CONFIG = {
  'Humano': { maxHp: 18, maxFp: 22 },
  'Anão':   { maxHp: 21, maxFp: 21 },
  'Elfo':   { maxHp: 22, maxFp: 18 }
};

function generateHeroicCharacter(existingName = '', existingRace = '') {
  const raceStats = RACE_VITALS_CONFIG[existingRace] || { maxHp: 20, maxFp: 20 };
  const maxHp = raceStats.maxHp; // Vida máxima (20 por padrão; ajustada conforme a Raça)
  const maxFp = raceStats.maxFp; // Fadiga máxima (20 por padrão; ajustada conforme a Raça)

  // Seleciona 6 habilidades de combate (4 principais de guerreiro + 2 sorteadas entre as demais de combate)
  const coreSkills = WARRIOR_COMBAT_SKILLS.filter(s => s.core);
  const extraSkills = shuffleArray(WARRIOR_COMBAT_SKILLS.filter(s => !s.core)).slice(0, 2);
  const chosenTemplates = [...coreSkills, ...extraSkills];

  const skills = chosenTemplates.map(tpl => {
    const level = randInt(tpl.minLvl, tpl.maxLvl);
    return {
      id: tpl.id,
      name: tpl.name,
      category: tpl.category,
      level
    };
  });

  return {
    name: existingName || '',
    race: existingRace || '',
    vitals: {
      hp: maxHp,
      maxHp: maxHp,
      fp: maxFp,
      maxFp: maxFp
    },
    skills
  };
}

function setCharacterVida(newHp, newMaxHp = null) {
  if (!player.character || !player.character.vitals) return;
  if (newMaxHp !== null && newMaxHp > 0) {
    player.character.vitals.maxHp = Math.round(newMaxHp);
  }
  player.character.vitals.hp = Math.max(0, Math.min(player.character.vitals.maxHp, Math.round(newHp)));
  updateVigorBarsHUD();
}

function modifyCharacterVida(deltaHp) {
  if (!player.character || !player.character.vitals) return;
  setCharacterVida(player.character.vitals.hp + deltaHp);
}

function setCharacterFadiga(newFp, newMaxFp = null) {
  if (!player.character || !player.character.vitals) return;
  if (newMaxFp !== null && newMaxFp > 0) {
    player.character.vitals.maxFp = Math.round(newMaxFp);
  }
  player.character.vitals.fp = Math.max(0, Math.min(player.character.vitals.maxFp, Math.round(newFp)));
  updateVigorBarsHUD();
}

function modifyCharacterFadiga(deltaFp) {
  if (!player.character || !player.character.vitals) return;
  setCharacterFadiga(player.character.vitals.fp + deltaFp);
}

function setCharacterRace(newRace) {
  if (!player.character) {
    player.character = generateHeroicCharacter();
  }
  const ch = player.character;
  ch.race = newRace || '';
  const stats = RACE_VITALS_CONFIG[ch.race] || { maxHp: 20, maxFp: 20 };

  const wasFullHp = ch.vitals.hp >= ch.vitals.maxHp;
  const wasFullFp = ch.vitals.fp >= ch.vitals.maxFp;

  ch.vitals.maxHp = stats.maxHp;
  ch.vitals.maxFp = stats.maxFp;
  ch.vitals.hp = wasFullHp ? stats.maxHp : Math.min(ch.vitals.hp, stats.maxHp);
  ch.vitals.fp = wasFullFp ? stats.maxFp : Math.min(ch.vitals.fp, stats.maxFp);

  const raceSelect = document.getElementById('charRaceSelect');
  if (raceSelect && raceSelect.value !== ch.race) {
    raceSelect.value = ch.race;
  }

  updateVigorBarsHUD();
}
