/**
 * js/party/character-presets.js
 * Os 6 personagens fixos do início do jogo (dados puros, no formato do CharacterSchema). O jogador escolhe 4.
 * Todos são de nível 1 e não evoluem. Nomes provisórios. Os retratos (assets/portraits/) ainda serão criados.
 * "hp": null e "fp": null significam "máximo"; as pontuações base são as anteriores aos bônus de raça.
 */
const CharacterPresets = (function () {
  const PRESETS = [
    {
      schemaVersion: 1, id: 'preset-guerreiro-anao-m',
      source: { type: 'preset' },
      identity: { name: 'Durgan Pedraforte', race: 'dwarf', subrace: 'hill', gender: 'male', class: 'fighter', level: 1, portrait: 'assets/portraits/durgan.png' },
      base: { abilities: { str: 15, dex: 14, con: 13, int: 8, wis: 12, cha: 10 }, skillProficiencies: ['athletics', 'perception'] },
      progress: { hp: null, fp: null, hands: { right: 'greatsword', left: null }, equipment: { torso: 'chain_mail' }, inventory: [] }
    },
    {
      schemaVersion: 1, id: 'preset-clerigo-anao-f',
      source: { type: 'preset' },
      identity: { name: 'Helga Forjaluz', race: 'dwarf', subrace: 'hill', gender: 'female', class: 'cleric', level: 1, portrait: 'assets/portraits/helga.png' },
      base: { abilities: { str: 13, dex: 10, con: 14, int: 8, wis: 15, cha: 12 }, skillProficiencies: ['medicine', 'religion'] },
      progress: { hp: null, fp: null, hands: { right: 'mace', left: 'shield' }, equipment: { torso: 'scale_mail' }, inventory: ['potion_healing'] }
    },
    {
      schemaVersion: 1, id: 'preset-ladino-elfo-m',
      source: { type: 'preset' },
      identity: { name: 'Sylvar Ventofino', race: 'elf', subrace: 'high', gender: 'male', class: 'rogue', level: 1, portrait: 'assets/portraits/sylvar.png' },
      base: { abilities: { str: 8, dex: 15, con: 14, int: 13, wis: 12, cha: 10 }, skillProficiencies: ['stealth', 'investigation', 'sleight_of_hand', 'acrobatics'], expertise: ['thieves_tools', 'perception'] },
      progress: { hp: null, fp: null, hands: { right: 'rapier', left: 'dagger' }, equipment: { torso: 'leather' }, inventory: [] }
    },
    {
      schemaVersion: 1, id: 'preset-mago-elfo-f',
      source: { type: 'preset' },
      identity: { name: 'Aelindra Lúmen', race: 'elf', subrace: 'high', gender: 'female', class: 'wizard', level: 1, portrait: 'assets/portraits/aelindra.png' },
      base: { abilities: { str: 8, dex: 14, con: 13, int: 15, wis: 12, cha: 10 }, skillProficiencies: ['arcana', 'investigation'] },
      progress: { hp: null, fp: null, hands: { right: 'quarterstaff', left: null }, equipment: {}, inventory: ['dagger'] }
    },
    {
      schemaVersion: 1, id: 'preset-paladino-humano-m',
      source: { type: 'preset' },
      identity: { name: 'Cassian Valdoro', race: 'human', subrace: 'standard', gender: 'male', class: 'paladin', level: 1, portrait: 'assets/portraits/cassian.png' },
      base: { abilities: { str: 15, dex: 10, con: 13, int: 8, wis: 12, cha: 14 }, skillProficiencies: ['athletics', 'religion'] },
      progress: { hp: null, fp: null, hands: { right: 'longsword', left: 'shield' }, equipment: { torso: 'chain_mail' }, inventory: [] }
    },
    {
      schemaVersion: 1, id: 'preset-patrulheiro-humano-f',
      source: { type: 'preset' },
      identity: { name: 'Elara Bosquefundo', race: 'human', subrace: 'standard', gender: 'female', class: 'ranger', level: 1, portrait: 'assets/portraits/elara.png' },
      base: { abilities: { str: 12, dex: 15, con: 13, int: 10, wis: 14, cha: 8 }, skillProficiencies: ['perception', 'stealth', 'investigation'] },
      progress: { hp: null, fp: null, hands: { right: 'longbow', left: null }, equipment: { torso: 'studded_leather' }, inventory: ['shortsword'] }
    }
  ];

  function clone(v) {
    return JSON.parse(JSON.stringify(v));
  }
  // Devolve cópias, para ninguém alterar os modelos sem querer.
  function all() {
    return PRESETS.map(clone);
  }
  function get(id) {
    const p = PRESETS.find(x => x.id === id);
    return p ? clone(p) : null;
  }
  return { all, get };
})();
