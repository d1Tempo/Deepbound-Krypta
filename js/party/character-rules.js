/**
 * js/party/character-rules.js
 * Regras do SRD 5.1 para os personagens (níveis 1 a 5): raças, classes, habilidades, Vida, proficiências, magias e traços.
 * Funções puras, sem tela. Depende de ItemCatalog e EquipmentRules.
 * Tudo o que é derivado (modificadores, Vida máxima, Classe de Armadura...) é calculado aqui a partir dos dados do personagem;
 * valores derivados vindos de fora nunca são aceitos.
 * Os textos das descrições são resumos próprios (não copiam o texto do SRD).
 */
const CharacterRules = (function () {
  const MIN_LEVEL = 1;
  const MAX_LEVEL = 5;
  const ABILITY_IDS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  const ABILITY_LABELS = { str: 'FOR', dex: 'DES', con: 'CON', int: 'INT', wis: 'SAB', cha: 'CAR' };

  // Somente as habilidades úteis em uma masmorra (as sociais ficam de fora).
  const SKILLS = {
    athletics:       { name: 'Atletismo',       ability: 'str' },
    acrobatics:      { name: 'Acrobacia',       ability: 'dex' },
    stealth:         { name: 'Furtividade',     ability: 'dex' },
    sleight_of_hand: { name: 'Prestidigitação', ability: 'dex' },
    perception:      { name: 'Percepção',       ability: 'wis' },
    investigation:   { name: 'Investigação',    ability: 'int' },
    arcana:          { name: 'Arcanismo',       ability: 'int' },
    religion:        { name: 'Religião',        ability: 'int' },
    medicine:        { name: 'Medicina',        ability: 'wis' }
  };
  const TOOLS = { thieves_tools: { name: 'Ferramentas de ladrão', ability: 'dex' } };

  const RACES = {
    human: {
      name: 'Humano', speed: 30,
      subraces: {
        standard: {
          name: 'Humano', bonuses: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 }, hpPerLevel: 0,
          skills: [], weaponProf: [], extraCantrips: {},
          traits: [{ id: 'versatile', name: 'Versátil', desc: '+1 em todos os atributos.' }]
        }
      }
    },
    dwarf: {
      name: 'Anão', speed: 25,
      subraces: {
        hill: {
          name: 'Anão da colina', bonuses: { con: 2, wis: 1 }, hpPerLevel: 1,
          skills: [], weaponProf: ['battleaxe', 'handaxe', 'light_hammer', 'warhammer'], extraCantrips: {},
          traits: [
            { id: 'darkvision', name: 'Visão no Escuro', desc: 'Enxerga no escuro a curta distância, em tons de cinza.' },
            { id: 'dwarven_resilience', name: 'Resistência Anã', desc: 'Vantagem contra veneno e resistência a dano de veneno.' },
            { id: 'dwarven_toughness', name: 'Robustez Anã', desc: '+1 de Vida máxima por nível.' },
            { id: 'stonecunning', name: 'Conhecimento de Pedra', desc: 'Bônus ao examinar construções de pedra.' }
          ]
        }
      }
    },
    elf: {
      name: 'Elfo', speed: 30,
      subraces: {
        high: {
          name: 'Elfo alto', bonuses: { dex: 2, int: 1 }, hpPerLevel: 0,
          skills: ['perception'], weaponProf: ['longsword', 'shortsword', 'shortbow', 'longbow'], extraCantrips: { wizard: 1 },
          traits: [
            { id: 'darkvision', name: 'Visão no Escuro', desc: 'Enxerga no escuro a curta distância, em tons de cinza.' },
            { id: 'keen_senses', name: 'Sentidos Aguçados', desc: 'Proficiência em Percepção.' },
            { id: 'fey_ancestry', name: 'Ancestral Feérico', desc: 'Vantagem contra encantamento; o sono mágico não o afeta.' },
            { id: 'trance', name: 'Transe', desc: 'Descansa em poucas horas de meditação, sem dormir.' },
            { id: 'elf_cantrip', name: 'Truque Élfico', desc: 'Um truque extra da lista do mago.' }
          ]
        }
      }
    }
  };

  const ASI = { id: 'asi', name: 'Aumento de Atributo', desc: 'Pontos extras de atributo (já somados às pontuações base do herói).' };
  const FIGHTING_STYLE = { id: 'fighting_style', name: 'Estilo de Luta', desc: 'Um estilo de combate à escolha, com um pequeno bônus permanente.' };

  const CLASSES = {
    fighter: {
      name: 'Guerreiro', hitDie: 10, saves: ['str', 'con'],
      armor: ['light', 'medium', 'heavy', 'shield'], weapons: ['simple', 'martial'], tools: [],
      skillChoices: { count: 2, list: ['acrobatics', 'athletics', 'perception'] },
      spellcasting: null,
      features: {
        1: [FIGHTING_STYLE, { id: 'second_wind', name: 'Retomar o Fôlego', desc: 'Uma vez por descanso, recupera Vida (1d10 + nível) como ação rápida.' }],
        2: [{ id: 'action_surge', name: 'Surto de Ação', desc: 'Uma vez por descanso, faz uma ação extra no mesmo turno.' }],
        3: [{ id: 'martial_archetype', name: 'Arquétipo Marcial (Campeão)', desc: 'Crítico Aprimorado: acerta crítico com 19 ou 20 no dado.' }],
        4: [ASI],
        5: [{ id: 'extra_attack', name: 'Ataque Extra', desc: 'Ataca duas vezes ao usar a ação de atacar.' }]
      }
    },
    rogue: {
      name: 'Ladino', hitDie: 8, saves: ['dex', 'int'],
      armor: ['light'], weapons: ['simple', 'hand_crossbow', 'longsword', 'rapier', 'shortsword'], tools: ['thieves_tools'],
      skillChoices: { count: 4, list: ['acrobatics', 'athletics', 'investigation', 'perception', 'sleight_of_hand', 'stealth'] },
      spellcasting: null,
      features: {
        1: [
          { id: 'expertise', name: 'Especialização', desc: 'Bônus de proficiência dobrado em duas habilidades ou ferramentas à escolha.' },
          { id: 'sneak_attack', name: 'Ataque Furtivo', desc: 'Dano extra (1d6, mais 1d6 a cada 2 níveis) quando o golpe tem vantagem ou há um aliado ao lado do alvo.' }
        ],
        2: [{ id: 'cunning_action', name: 'Ação Ardilosa', desc: 'Correr, desengajar ou esconder-se como ação rápida.' }],
        3: [{ id: 'roguish_archetype', name: 'Arquétipo de Ladino (Ladrão)', desc: 'Mãos Rápidas e Escalada de Telhados.' }],
        4: [ASI],
        5: [{ id: 'uncanny_dodge', name: 'Esquiva Sobrenatural', desc: 'Reduz à metade o dano de um ataque que o ladino consegue ver.' }]
      }
    },
    wizard: {
      name: 'Mago', hitDie: 6, saves: ['int', 'wis'],
      armor: [], weapons: ['dagger', 'dart', 'sling', 'quarterstaff', 'light_crossbow'], tools: [],
      skillChoices: { count: 2, list: ['arcana', 'investigation', 'medicine', 'religion'] },
      spellcasting: { ability: 'int', type: 'full', startLevel: 1, cantrips: { 1: 3, 2: 3, 3: 3, 4: 4, 5: 4 }, mode: 'prepared_level_plus_mod' },
      features: {
        1: [{ id: 'arcane_recovery', name: 'Recuperação Arcana', desc: 'Uma vez por dia, recupera espaços de magia gastos durante um descanso curto.' }],
        2: [{ id: 'arcane_tradition', name: 'Tradição Arcana (Evocação)', desc: 'Escultor de Magias: protege aliados dos efeitos das suas magias de área.' }],
        4: [ASI]
      }
    },
    cleric: {
      name: 'Clérigo', hitDie: 8, saves: ['wis', 'cha'],
      // O domínio da Vida (o do SRD) concede proficiência em armaduras pesadas.
      armor: ['light', 'medium', 'heavy', 'shield'], weapons: ['simple'], tools: [],
      skillChoices: { count: 2, list: ['medicine', 'religion'] },
      spellcasting: { ability: 'wis', type: 'full', startLevel: 1, cantrips: { 1: 3, 2: 3, 3: 3, 4: 4, 5: 4 }, mode: 'prepared_level_plus_mod' },
      features: {
        1: [{ id: 'divine_domain', name: 'Domínio Divino (Vida)', desc: 'Discípulo da Vida: magias de cura curam mais; proficiência em armadura pesada.' }],
        2: [{ id: 'channel_divinity', name: 'Canalizar Divindade', desc: 'Uma vez por descanso: expulsar mortos-vivos ou Preservar Vida (cura em área).' }],
        4: [ASI],
        5: [{ id: 'destroy_undead', name: 'Destruir Mortos-Vivos', desc: 'Mortos-vivos fracos são destruídos ao serem expulsos.' }]
      }
    },
    paladin: {
      name: 'Paladino', hitDie: 10, saves: ['wis', 'cha'],
      armor: ['light', 'medium', 'heavy', 'shield'], weapons: ['simple', 'martial'], tools: [],
      skillChoices: { count: 2, list: ['athletics', 'medicine', 'religion'] },
      spellcasting: { ability: 'cha', type: 'half', startLevel: 2, mode: 'prepared_half_level_plus_mod' },
      features: {
        1: [
          { id: 'divine_sense', name: 'Sentido Divino', desc: 'Detecta celestiais, ínferos e mortos-vivos próximos.' },
          { id: 'lay_on_hands', name: 'Mãos Consagradas', desc: 'Reserva de cura (5 × nível pontos de Vida) para curar por toque.' }
        ],
        2: [FIGHTING_STYLE, { id: 'divine_smite', name: 'Punição Divina', desc: 'Gasta um espaço de magia para causar dano radiante extra ao acertar.' }],
        3: [
          { id: 'divine_health', name: 'Saúde Divina', desc: 'Imune a doenças.' },
          { id: 'sacred_oath', name: 'Juramento Sagrado (Devoção)', desc: 'Arma Sagrada e Expulsar os Ímpios.' }
        ],
        4: [ASI],
        5: [{ id: 'extra_attack', name: 'Ataque Extra', desc: 'Ataca duas vezes ao usar a ação de atacar.' }]
      }
    },
    ranger: {
      name: 'Patrulheiro', hitDie: 10, saves: ['str', 'dex'],
      armor: ['light', 'medium', 'shield'], weapons: ['simple', 'martial'], tools: [],
      skillChoices: { count: 3, list: ['athletics', 'investigation', 'perception', 'stealth'] },
      spellcasting: { ability: 'wis', type: 'half', startLevel: 2, mode: 'known_table', known: { 2: 2, 3: 3, 4: 3, 5: 4 } },
      features: {
        1: [
          { id: 'favored_enemy', name: 'Inimigo Favorito', desc: 'Vantagem para rastrear e conhecimento sobre um tipo de inimigo.' },
          { id: 'natural_explorer', name: 'Explorador Natural', desc: 'Vantagens ao viajar e explorar um tipo de terreno.' }
        ],
        2: [FIGHTING_STYLE],
        3: [
          { id: 'ranger_archetype', name: 'Arquétipo de Patrulheiro (Caçador)', desc: 'Presa do Caçador: dano extra contra um alvo já ferido.' },
          { id: 'primeval_awareness', name: 'Consciência Primitiva', desc: 'Gasta um espaço de magia para sentir criaturas por perto.' }
        ],
        4: [ASI],
        5: [{ id: 'extra_attack', name: 'Ataque Extra', desc: 'Ataca duas vezes ao usar a ação de atacar.' }]
      }
    }
  };

  const SLOTS_FULL = { 1: [2], 2: [3], 3: [4, 2], 4: [4, 3], 5: [4, 3, 2] };
  const SLOTS_HALF = { 1: [], 2: [2], 3: [3], 4: [3], 5: [4, 2] };

  function abilityMod(score) {
    return Math.floor((score - 10) / 2);
  }
  function proficiencyBonus(level) {
    return 2 + Math.floor((level - 1) / 4);
  }
  // Soma os bônus de raça às pontuações base (teto 20).
  function finalAbilities(base, raceId, subraceId) {
    const bonuses = RACES[raceId].subraces[subraceId].bonuses;
    const out = {};
    for (const a of ABILITY_IDS) out[a] = Math.min(20, base[a] + (bonuses[a] || 0));
    return out;
  }
  // Vida máxima: nível 1 = dado de vida cheio + CON; demais níveis = média do dado + CON; mais a Robustez Anã.
  function maxHp(classId, level, conScore, racialPerLevel) {
    const die = CLASSES[classId].hitDie;
    const conMod = abilityMod(conScore);
    let hp = die + conMod;
    for (let l = 2; l <= level; l++) hp += Math.floor(die / 2) + 1 + conMod;
    hp += racialPerLevel * level;
    return Math.max(level, hp);
  }
  // Fadiga não existe no SRD: regra própria do jogo (proposta: Fadiga máxima = valor de Constituição).
  function maxFatigue(conScore) {
    return conScore;
  }
  function spellSlots(classId, level) {
    const sc = CLASSES[classId].spellcasting;
    if (!sc) return [];
    return (sc.type === 'full' ? SLOTS_FULL : SLOTS_HALF)[level].slice();
  }

  function spellcastingSummary(classId, level, mods, pb, subrace) {
    const sc = CLASSES[classId].spellcasting;
    if (!sc || level < sc.startLevel) return null;
    const mod = mods[sc.ability];
    let cantrips = sc.cantrips ? sc.cantrips[level] : 0;
    if (subrace.extraCantrips && subrace.extraCantrips[classId]) cantrips += subrace.extraCantrips[classId];
    let spellsPrepared = null;
    let spellsKnown = null;
    if (sc.mode === 'prepared_level_plus_mod') spellsPrepared = Math.max(1, mod + level);
    else if (sc.mode === 'prepared_half_level_plus_mod') spellsPrepared = Math.max(1, mod + Math.floor(level / 2));
    else if (sc.mode === 'known_table') spellsKnown = sc.known[level];
    return { ability: sc.ability, saveDc: 8 + pb + mod, attackBonus: pb + mod, slots: spellSlots(classId, level), cantrips, spellsPrepared, spellsKnown };
  }

  // Calcula tudo o que é derivado de um personagem já validado (veja CharacterSchema.validate).
  function derive(character) {
    const id = character.identity;
    const race = RACES[id.race];
    const subrace = race.subraces[id.subrace];
    const cls = CLASSES[id.class];
    const level = id.level;
    const pb = proficiencyBonus(level);

    const scores = finalAbilities(character.base.abilities, id.race, id.subrace);
    const mods = {};
    for (const a of ABILITY_IDS) mods[a] = abilityMod(scores[a]);

    const abilities = {};
    for (const a of ABILITY_IDS) abilities[a] = { label: ABILITY_LABELS[a], score: scores[a], mod: mods[a] };

    const saves = {};
    for (const a of ABILITY_IDS) {
      const prof = cls.saves.includes(a);
      saves[a] = { proficient: prof, bonus: mods[a] + (prof ? pb : 0) };
    }

    const proficientSkills = new Set(character.base.skillProficiencies.concat(subrace.skills));
    const expertise = new Set(character.base.expertise || []);
    const skills = {};
    for (const sid of Object.keys(SKILLS)) {
      const prof = proficientSkills.has(sid);
      const exp = prof && expertise.has(sid);
      skills[sid] = { name: SKILLS[sid].name, ability: SKILLS[sid].ability, proficient: prof, expertise: exp, bonus: mods[SKILLS[sid].ability] + (exp ? 2 * pb : (prof ? pb : 0)) };
    }
    const tools = {};
    for (const tid of cls.tools) {
      const exp = expertise.has(tid);
      tools[tid] = { name: TOOLS[tid].name, expertise: exp, bonus: mods[TOOLS[tid].ability] + (exp ? 2 * pb : pb) };
    }

    const weaponProficiencies = {
      categories: cls.weapons.filter(w => w === 'simple' || w === 'martial'),
      specific: cls.weapons.filter(w => w !== 'simple' && w !== 'martial').concat(subrace.weaponProf)
    };
    const armorProficiencies = cls.armor.slice();

    const equipment = character.progress.equipment;
    const hands = character.progress.hands;
    const armorClass = EquipmentRules.armorClass({ dexMod: mods.dex, equipment, hands });
    const penalty = EquipmentRules.armorPenalty(armorProficiencies, equipment, hands, scores.str);

    const features = [];
    for (const t of subrace.traits) features.push({ source: 'race', level: 1, id: t.id, name: t.name, desc: t.desc });
    for (let l = 1; l <= level; l++) {
      for (const f of (cls.features[l] || [])) features.push({ source: 'class', level: l, id: f.id, name: f.name, desc: f.desc });
    }

    return {
      className: cls.name,
      raceName: subrace.name,
      level,
      proficiencyBonus: pb,
      abilities,
      maxHp: maxHp(id.class, level, scores.con, subrace.hpPerLevel),
      maxFp: maxFatigue(scores.con),
      armorClass,
      initiative: mods.dex,
      speed: race.speed - penalty.speedPenalty,
      saves,
      skills,
      tools,
      passivePerception: 10 + skills.perception.bonus,
      passiveInvestigation: 10 + skills.investigation.bonus,
      weaponProficiencies,
      armorProficiencies,
      armorPenalty: penalty,
      sneakAttackDice: id.class === 'rogue' ? Math.ceil(level / 2) + 'd6' : null,
      spellcasting: spellcastingSummary(id.class, level, mods, pb, subrace),
      features
    };
  }

  // Habilidades que a classe pode escolher dentro da lista permitida do jogo.
  function classSkillOptions(classId) {
    return CLASSES[classId].skillChoices.list.slice();
  }

  return { MIN_LEVEL, MAX_LEVEL, ABILITY_IDS, ABILITY_LABELS, SKILLS, TOOLS, RACES, CLASSES,
    abilityMod, proficiencyBonus, finalAbilities, maxHp, maxFatigue, spellSlots, classSkillOptions, derive };
})();
