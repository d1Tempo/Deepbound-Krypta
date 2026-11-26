/**
 * js/party/character-sheet.js
 * Ficha do personagem: atributos, resistências, habilidades, proficiências, magias, traços e estatísticas de jogo.
 * Ocupa o lugar do painel da equipe (veja PartyHud). Mostra só o básico para um dungeon crawler (sem habilidades sociais).
 * Todo texto é inserido com textContent (nunca innerHTML). Depende de CharacterRules e ItemCatalog.
 */
const CharacterSheet = (function () {
  const ARMOR_NAMES = { light: 'leves', medium: 'médias', heavy: 'pesadas', shield: 'escudos' };
  const WEAPON_CATEGORY_NAMES = { simple: 'armas simples', martial: 'armas marciais' };
  const STAT_NAMES = [
    ['kills', 'Inimigos derrotados'], ['damageDealt', 'Dano causado'], ['trapsDisarmed', 'Armadilhas desarmadas'],
    ['secretDoorsFound', 'Portas secretas descobertas'], ['doorsOpened', 'Portas abertas']
  ];

  function el(tag, className, text) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function signed(n) {
    return (n >= 0 ? '+' : '') + n;
  }
  function section(title) {
    const sec = el('section', 'sheet-section');
    sec.appendChild(el('h3', 'sheet-section-title', title));
    return sec;
  }
  function chip(label, value, extraClass) {
    const c = el('div', 'sheet-chip' + (extraClass ? ' ' + extraClass : ''));
    c.appendChild(el('span', 'sheet-chip-label', label));
    c.appendChild(el('span', 'sheet-chip-value', value));
    return c;
  }
  function line(label, value) {
    const row = el('div', 'sheet-line');
    row.appendChild(el('span', 'sheet-line-label', label));
    row.appendChild(el('span', 'sheet-line-value', value));
    return row;
  }
  function itemNames(ids) {
    return ids.map(id => { const it = ItemCatalog.get(id); return it ? it.name : id; });
  }

  // Monta a ficha de um membro da equipe ({ character, derived }). onClose é chamado pela miniatura do rosto, pelo X e por Esc.
  function build(member, onClose) {
    const ch = member.character;
    const d = member.derived;
    const R = CharacterRules;
    const root = el('div', 'sheet');

    // Cabeçalho: miniatura do rosto (fecha a ficha), nome e botão de fechar
    const header = el('div', 'sheet-header');
    const mini = el('button', 'sheet-mini');
    mini.setAttribute('type', 'button');
    mini.setAttribute('title', 'Fechar a ficha');
    mini.setAttribute('aria-label', 'Fechar a ficha de ' + ch.identity.name);
    const img = el('img', 'sheet-mini-img');
    img.alt = ch.identity.name;
    img.addEventListener('error', () => {
      if (!img.parent) return;
      const fb = el('span', 'sheet-mini-fallback', ch.identity.name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join(''));
      img.parent.appendChild(fb);
      img.parent.removeChild(img);
    });
    img.src = ch.identity.portrait;
    mini.appendChild(img);
    mini.addEventListener('click', () => onClose && onClose());
    header.appendChild(mini);
    const who = el('div', 'sheet-who');
    who.appendChild(el('div', 'sheet-name', ch.identity.name));
    who.appendChild(el('div', 'sheet-subtitle', d.raceName + ' · ' + d.className + ' · Nv ' + d.level));
    header.appendChild(who);
    const close = el('button', 'sheet-close', '✕');
    close.setAttribute('type', 'button');
    close.setAttribute('title', 'Fechar a ficha');
    close.setAttribute('aria-label', 'Fechar a ficha');
    close.addEventListener('click', () => onClose && onClose());
    header.appendChild(close);
    root.appendChild(header);

    // Resumo
    const summary = section('Resumo');
    const chips = el('div', 'sheet-chips');
    chips.appendChild(chip('Vida', ch.progress.hp + ' / ' + d.maxHp, 'sheet-chip-hp'));
    chips.appendChild(chip('Fadiga', ch.progress.fp + ' / ' + d.maxFp, 'sheet-chip-fp'));
    chips.appendChild(chip('Armadura', String(d.armorClass)));
    chips.appendChild(chip('Iniciativa', signed(d.initiative)));
    chips.appendChild(chip('Deslocamento', d.speed + ' pés'));
    chips.appendChild(chip('Proficiência', signed(d.proficiencyBonus)));
    summary.appendChild(chips);
    if (d.armorPenalty.penalized) summary.appendChild(el('div', 'sheet-warning', 'Usa armadura ou escudo sem proficiência: desvantagem em ataques e em testes de FOR e DES, e não conjura magias.'));
    if (d.armorPenalty.stealthDisadvantage) summary.appendChild(el('div', 'sheet-note', 'A armadura que veste dá desvantagem em Furtividade.'));
    root.appendChild(summary);

    // Atributos
    const abil = section('Atributos');
    const grid = el('div', 'sheet-abilities');
    for (const a of R.ABILITY_IDS) {
      const cell = el('div', 'sheet-ability');
      cell.appendChild(el('span', 'sheet-ability-label', d.abilities[a].label));
      cell.appendChild(el('span', 'sheet-ability-score', String(d.abilities[a].score)));
      cell.appendChild(el('span', 'sheet-ability-mod', signed(d.abilities[a].mod)));
      grid.appendChild(cell);
    }
    abil.appendChild(grid);
    root.appendChild(abil);

    // Testes de resistência
    const saves = section('Testes de resistência');
    const saveGrid = el('div', 'sheet-chips');
    for (const a of R.ABILITY_IDS) {
      saveGrid.appendChild(chip(d.abilities[a].label + (d.saves[a].proficient ? ' ●' : ''), signed(d.saves[a].bonus), d.saves[a].proficient ? 'sheet-chip-prof' : ''));
    }
    saves.appendChild(saveGrid);
    root.appendChild(saves);

    // Habilidades
    const skills = section('Habilidades');
    for (const sid of Object.keys(R.SKILLS)) {
      const sk = d.skills[sid];
      const mark = sk.expertise ? ' ★' : (sk.proficient ? ' ●' : '');
      skills.appendChild(line(sk.name + ' (' + R.ABILITY_LABELS[sk.ability] + ')' + mark, signed(sk.bonus)));
    }
    for (const tid of Object.keys(d.tools)) {
      const t = d.tools[tid];
      skills.appendChild(line(t.name + (t.expertise ? ' ★' : ' ●'), signed(t.bonus)));
    }
    skills.appendChild(line('Percepção passiva', String(d.passivePerception)));
    skills.appendChild(line('Investigação passiva', String(d.passiveInvestigation)));
    skills.appendChild(el('div', 'sheet-note', '● proficiente   ★ especialização'));
    root.appendChild(skills);

    // Proficiências com armas e armaduras
    const prof = section('Proficiências');
    const armor = d.armorProficiencies.map(a => ARMOR_NAMES[a]);
    prof.appendChild(line('Armaduras', armor.length ? armor.join(', ') : 'nenhuma'));
    const weapons = d.weaponProficiencies.categories.map(c => WEAPON_CATEGORY_NAMES[c]).concat(itemNames(d.weaponProficiencies.specific));
    prof.appendChild(line('Armas', weapons.length ? weapons.join(', ') : 'nenhuma'));
    root.appendChild(prof);

    // Magias
    if (d.spellcasting) {
      const sc = d.spellcasting;
      const magic = section('Magias');
      magic.appendChild(line('Atributo de conjuração', R.ABILITY_LABELS[sc.ability]));
      magic.appendChild(line('CD das magias', String(sc.saveDc)));
      magic.appendChild(line('Ataque de magia', signed(sc.attackBonus)));
      if (sc.cantrips) magic.appendChild(line('Truques', String(sc.cantrips)));
      if (sc.spellsPrepared !== null) magic.appendChild(line('Magias preparadas', String(sc.spellsPrepared)));
      if (sc.spellsKnown !== null) magic.appendChild(line('Magias conhecidas', String(sc.spellsKnown)));
      magic.appendChild(line('Espaços de magia', sc.slots.length ? sc.slots.map((n, i) => (i + 1) + 'º: ' + n).join(' · ') : 'nenhum'));
      root.appendChild(magic);
    }

    // Traços e características
    const feats = section('Traços e características');
    if (d.sneakAttackDice) feats.appendChild(line('Ataque Furtivo', d.sneakAttackDice));
    for (const f of d.features) {
      const row = el('div', 'sheet-feature');
      row.appendChild(el('div', 'sheet-feature-name', f.name + (f.source === 'class' ? '  (nível ' + f.level + ')' : '')));
      row.appendChild(el('div', 'sheet-feature-desc', f.desc));
      feats.appendChild(row);
    }
    root.appendChild(feats);

    // Estatísticas de jogo
    const stats = section('Estatísticas de jogo');
    for (const pair of STAT_NAMES) stats.appendChild(line(pair[1], String(ch.progress.stats[pair[0]] || 0)));
    root.appendChild(stats);

    return root;
  }

  return { build };
})();
