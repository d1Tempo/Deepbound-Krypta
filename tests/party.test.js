/**
 * tests/party.test.js
 * Testes automáticos da camada de dados dos personagens (itens, regras do SRD, validação, personagens predefinidos).
 * Rode com Node, dentro da pasta do projeto:   node tests/party.test.js
 * Os arquivos do jogo são scripts comuns (variáveis globais), então são carregados aqui em conjunto.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'js');
const files = ['items/item-catalog.js', 'items/equipment-rules.js', 'party/character-rules.js',
  'party/character-schema.js', 'party/character-presets.js', 'party/character-provider.js'];
const source = files.map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
const { ItemCatalog, EquipmentRules, CharacterRules, CharacterSchema, CharacterPresets, CharacterProviders } =
  new Function(source + '\nreturn { ItemCatalog, EquipmentRules, CharacterRules, CharacterSchema, CharacterPresets, CharacterProviders };')();

let passed = 0;
const failures = [];
function check(name, cond, detail) {
  if (cond) passed++;
  else failures.push(name + (detail !== undefined ? ' -> ' + detail : ''));
}
function eq(name, actual, expected) {
  check(name, JSON.stringify(actual) === JSON.stringify(expected), 'obtido ' + JSON.stringify(actual) + ', esperado ' + JSON.stringify(expected));
}
const clone = v => JSON.parse(JSON.stringify(v));
const preset = id => CharacterPresets.get(id);
const rejects = (name, mutate, base) => {
  const raw = clone(base || preset('preset-guerreiro-anao-m'));
  mutate(raw);
  const r = CharacterSchema.validate(raw);
  check('rejeita: ' + name, r.ok === false && r.value === null, r.ok ? 'foi aceito' : '');
};

// 1) Os 6 personagens predefinidos batem com a tabela do README (atributos finais, Vida, Fadiga e Classe de Armadura)
const expected = {
  'preset-guerreiro-anao-m':     { abil: [15, 14, 15, 8, 13, 10],  hp: 13, fp: 15, ac: 16 },
  'preset-clerigo-anao-f':       { abil: [13, 10, 16, 8, 16, 12],  hp: 12, fp: 16, ac: 16 },
  'preset-ladino-elfo-m':        { abil: [8, 17, 14, 14, 12, 10],  hp: 10, fp: 14, ac: 14 },
  'preset-mago-elfo-f':          { abil: [8, 16, 13, 16, 12, 10],  hp: 7,  fp: 13, ac: 13 },
  'preset-paladino-humano-m':    { abil: [16, 11, 14, 9, 13, 15],  hp: 12, fp: 14, ac: 18 },
  'preset-patrulheiro-humano-f': { abil: [13, 16, 14, 11, 15, 9],  hp: 12, fp: 14, ac: 15 }
};
for (const id of Object.keys(expected)) {
  const r = CharacterProviders.build(preset(id));
  check('predefinido válido: ' + id, r.ok, r.errors.join('; '));
  if (!r.ok) continue;
  const d = r.derived;
  eq(id + ' atributos finais', CharacterRules.ABILITY_IDS.map(a => d.abilities[a].score), expected[id].abil);
  eq(id + ' Vida máxima', d.maxHp, expected[id].hp);
  eq(id + ' Fadiga máxima', d.maxFp, expected[id].fp);
  eq(id + ' Classe de Armadura', d.armorClass, expected[id].ac);
  eq(id + ' Vida e Fadiga atuais começam cheias', [r.character.progress.hp, r.character.progress.fp], [d.maxHp, d.maxFp]);
}
eq('são 6 predefinidos', CharacterPresets.all().length, 6);
eq('2 de cada raça', ['human', 'dwarf', 'elf'].map(x => CharacterPresets.all().filter(p => p.identity.race === x).length), [2, 2, 2]);
eq('3 de cada gênero', ['male', 'female'].map(x => CharacterPresets.all().filter(p => p.identity.gender === x).length), [3, 3]);
eq('as 6 classes', CharacterPresets.all().map(p => p.identity.class).sort(), ['cleric', 'fighter', 'paladin', 'ranger', 'rogue', 'wizard']);

// 2) Bônus de proficiência e Vida por nível (cálculo independente, feito aqui à mão)
eq('bônus de proficiência 1 a 5', [1, 2, 3, 4, 5].map(CharacterRules.proficiencyBonus), [2, 2, 2, 2, 3]);
eq('modificadores', [3, 8, 10, 11, 15, 20].map(CharacterRules.abilityMod), [-4, -1, 0, 0, 2, 5]);
eq('Vida guerreiro anão CON 15, nível 1', CharacterRules.maxHp('fighter', 1, 15, 1), 10 + 2 + 1);
eq('Vida guerreiro anão CON 15, nível 5', CharacterRules.maxHp('fighter', 5, 15, 1), (10 + 2) + 4 * (6 + 2) + 5);
eq('Vida mago CON 13, nível 5', CharacterRules.maxHp('wizard', 5, 13, 0), (6 + 1) + 4 * (4 + 1));
eq('Vida mínima de 1 por nível (CON 3)', CharacterRules.maxHp('wizard', 3, 3, 0) >= 3, true);

// 3) Espaços de magia, truques e estatísticas de conjuração
eq('espaços de magia (completo) 1 a 5', [1, 2, 3, 4, 5].map(l => CharacterRules.spellSlots('wizard', l)), [[2], [3], [4, 2], [4, 3], [4, 3, 2]]);
eq('espaços de magia (meio) 1 a 5', [1, 2, 3, 4, 5].map(l => CharacterRules.spellSlots('paladin', l)), [[], [2], [3], [3], [4, 2]]);
eq('guerreiro não conjura', CharacterRules.spellSlots('fighter', 3), []);
{
  const mage = CharacterProviders.build(preset('preset-mago-elfo-f')).derived;
  eq('maga: CD das magias (8 + 2 + INT 16)', mage.spellcasting.saveDc, 8 + 2 + 3);
  eq('maga: bônus de ataque de magia', mage.spellcasting.attackBonus, 2 + 3);
  eq('maga: truques (3 + 1 do elfo alto)', mage.spellcasting.cantrips, 4);
  eq('maga: magias preparadas (INT + nível)', mage.spellcasting.spellsPrepared, 3 + 1);
  const pal = CharacterProviders.build(preset('preset-paladino-humano-m')).derived;
  eq('paladino nível 1 ainda não conjura', pal.spellcasting, null);
  const pal2 = clone(preset('preset-paladino-humano-m')); pal2.identity.level = 2;
  eq('paladino nível 2 conjura (CAR)', CharacterProviders.build(pal2).derived.spellcasting.ability, 'cha');
}

// 4) Habilidades, proficiências, traços
{
  const rogue = CharacterProviders.build(preset('preset-ladino-elfo-m')).derived;
  eq('ladino: Percepção com especialização (SAB 12 = +1, 2 × bônus de proficiência 2)', rogue.skills.perception.bonus, 1 + 4);
  eq('ladino: Percepção vem da raça (élfico) e tem especialização', [rogue.skills.perception.proficient, rogue.skills.perception.expertise], [true, true]);
  eq('ladino: Ferramentas de ladrão com especialização (DES 17 = +3, 2x2)', rogue.tools.thieves_tools.bonus, 3 + 4);
  eq('ladino: Furtividade (DES +3, prof +2)', rogue.skills.stealth.bonus, 5);
  eq('ladino: ataque furtivo nível 1', rogue.sneakAttackDice, '1d6');
  eq('ladino: armas específicas incluem espada longa (classe e raça)', rogue.weaponProficiencies.specific.includes('longsword'), true);
  const g = CharacterProviders.build(preset('preset-guerreiro-anao-m')).derived;
  eq('guerreiro: testes de resistência FOR e CON', ['str', 'con'].map(a => g.saves[a].proficient), [true, true]);
  eq('guerreiro (anão): proficiência em martelo de guerra', g.weaponProficiencies.specific.includes('warhammer'), true);
  eq('guerreiro: Atletismo (FOR +2, prof +2)', g.skills.athletics.bonus, 4);
  eq('guerreiro: Percepção passiva (SAB 13 = +1, prof +2)', g.passivePerception, 13);
  eq('guerreiro: velocidade do anão não cai com armadura pesada', g.speed, 25);
  const m = CharacterProviders.build(preset('preset-mago-elfo-f')).derived;
  eq('maga: sem armadura', m.armorProficiencies, []);
  eq('maga: proficiente em adaga, não em espada de duas mãos', [m.weaponProficiencies.specific.includes('dagger'), m.weaponProficiencies.categories.length], [true, 0]);
  eq('traços do anão da colina presentes', CharacterProviders.build(preset('preset-clerigo-anao-f')).derived.features.filter(f => f.source === 'race').map(f => f.id),
    ['darkvision', 'dwarven_resilience', 'dwarven_toughness', 'stonecunning']);
  const f5 = clone(preset('preset-guerreiro-anao-m')); f5.identity.level = 5;
  eq('guerreiro nível 5 tem Ataque Extra', CharacterProviders.build(f5).derived.features.some(f => f.id === 'extra_attack'), true);
  const f1 = CharacterProviders.build(preset('preset-guerreiro-anao-m')).derived;
  eq('guerreiro nível 1 não tem Ataque Extra', f1.features.some(f => f.id === 'extra_attack'), false);
}

// 5) Equipamento: Classe de Armadura, penalidades e ataque com armas
eq('CA sem armadura (DES +2)', EquipmentRules.armorClass({ dexMod: 2, equipment: {}, hands: {} }), 12);
eq('CA couro (11 + DES)', EquipmentRules.armorClass({ dexMod: 3, equipment: { torso: 'leather' }, hands: {} }), 14);
eq('CA média limita a DES em +2 (brunea 14)', EquipmentRules.armorClass({ dexMod: 4, equipment: { torso: 'scale_mail' }, hands: {} }), 16);
eq('CA pesada ignora a DES (cota de malha 16)', EquipmentRules.armorClass({ dexMod: 4, equipment: { torso: 'chain_mail' }, hands: {} }), 16);
eq('CA pesada ignora até DES negativa', EquipmentRules.armorClass({ dexMod: -2, equipment: { torso: 'chain_mail' }, hands: {} }), 16);
eq('escudo soma +2 (só um)', EquipmentRules.armorClass({ dexMod: 0, equipment: { torso: 'chain_mail' }, hands: { right: 'shield', left: 'shield' } }), 18);
eq('teto de CA', EquipmentRules.armorClass({ dexMod: 0, equipment: { torso: 'plate' }, hands: { right: 'shield' } }) <= EquipmentRules.AC_CAP, true);
{
  const pen = EquipmentRules.armorPenalty([], { torso: 'chain_mail' }, { left: 'shield' }, 10);
  eq('armadura e escudo sem proficiência penalizam', [pen.penalized, pen.notProficient], [true, ['chain_mail', 'shield']]);
  eq('FOR abaixo do exigido reduz a velocidade em 10', pen.speedPenalty, 10);
  eq('com proficiência não há penalidade', EquipmentRules.armorPenalty(['heavy', 'shield'], { torso: 'chain_mail' }, { left: 'shield' }, 15).penalized, false);
  const rapier = ItemCatalog.get('rapier'), bow = ItemCatalog.get('longbow'), club = ItemCatalog.get('mace');
  eq('acuidade usa a maior entre FOR e DES', EquipmentRules.weaponAttack(rapier, { str: -1, dex: 3 }, 2, true).ability, 'dex');
  eq('arma à distância usa DES', EquipmentRules.weaponAttack(bow, { str: 3, dex: 1 }, 2, true).ability, 'dex');
  eq('corpo a corpo usa FOR', EquipmentRules.weaponAttack(club, { str: 2, dex: 3 }, 2, true).ability, 'str');
  eq('sem proficiência não soma o bônus', EquipmentRules.weaponAttack(club, { str: 2, dex: 0 }, 2, false).attackBonus, 2);
  eq('com proficiência soma o bônus', EquipmentRules.weaponAttack(club, { str: 2, dex: 0 }, 2, true).attackBonus, 4);
}
eq('slots aceitam o item certo', [EquipmentRules.slotAccepts(ItemCatalog.get('chain_mail'), 'torso'), EquipmentRules.slotAccepts(ItemCatalog.get('chain_mail'), 'feet'),
  EquipmentRules.slotAccepts(ItemCatalog.get('shield'), 'left'), EquipmentRules.slotAccepts(ItemCatalog.get('potion_healing'), 'right')], [true, false, true, true]);
eq('montante e arco longo são de duas mãos; espada longa não', ['greatsword', 'longbow', 'longsword'].map(id => ItemCatalog.get(id).twoHanded), [true, true, false]);

// 5b) Ícones de pixel art: todo item de mão (arma, escudo, poção) tem seu PNG, e há silhuetas para as mãos livres
for (const item of ItemCatalog.all()) {
  if (['weapon', 'shield', 'potion', 'key', 'map', 'coin'].includes(item.type)) {
    check('ícone existe: ' + item.id, typeof item.icon === 'string' && fs.existsSync(path.join(__dirname, '..', item.icon)), item.icon);
  }
}
check('silhuetas das mãos existem', ['hand_left', 'hand_right'].every(n => fs.existsSync(path.join(__dirname, '..', 'assets', 'ui', n + '.png'))));

// 6) Validação: o que deve ser rejeitado (entrada externa é não confiável)
rejects('nível 0', r => { r.identity.level = 0; });
rejects('nível 6 (fora da faixa suportada)', r => { r.identity.level = 6; });
rejects('nível fracionário', r => { r.identity.level = 2.5; });
rejects('nível em texto', r => { r.identity.level = '3'; });
rejects('classe desconhecida', r => { r.identity.class = 'barbarian'; });
rejects('raça desconhecida', r => { r.identity.race = 'orc'; r.identity.subrace = 'standard'; });
rejects('sub-raça incompatível', r => { r.identity.subrace = 'high'; });
rejects('gênero fora da lista', r => { r.identity.gender = 'other'; });
rejects('nome com HTML', r => { r.identity.name = '<img src=x onerror=alert(1)>'; });
rejects('nome com script', r => { r.identity.name = 'Ana<script>'; });
rejects('nome vazio', r => { r.identity.name = '   '; });
rejects('nome longo demais', r => { r.identity.name = 'A'.repeat(25); });
rejects('nome com emoji', r => { r.identity.name = 'Ana 😀'; });
rejects('retrato javascript:', r => { r.identity.portrait = 'javascript:alert(1)'; });
rejects('retrato data:', r => { r.identity.portrait = 'data:image/png;base64,AAAA'; });
rejects('retrato http:// (sem TLS)', r => { r.identity.portrait = 'http://exemplo.com/a.png'; });
rejects('retrato com ..', r => { r.identity.portrait = 'assets/../js/game.js'; });
rejects('retrato fora de assets/', r => { r.identity.portrait = '/etc/passwd'; });
rejects('retrato com espaço/aspas', r => { r.identity.portrait = 'assets/a b.png'; });
rejects('atributo 19', r => { r.base.abilities.str = 19; });
rejects('atributo 2', r => { r.base.abilities.dex = 2; });
rejects('atributo fracionário', r => { r.base.abilities.con = 12.5; });
rejects('atributo ausente', r => { delete r.base.abilities.wis; });
rejects('soma de atributos acima do orçamento', r => { for (const a of Object.keys(r.base.abilities)) r.base.abilities[a] = 14; });
rejects('habilidades demais', r => { r.base.skillProficiencies = ['athletics', 'perception', 'acrobatics']; });
rejects('habilidades de menos', r => { r.base.skillProficiencies = ['athletics']; });
rejects('habilidade fora da classe', r => { r.base.skillProficiencies = ['athletics', 'arcana']; });
rejects('habilidade repetida', r => { r.base.skillProficiencies = ['athletics', 'athletics']; });
rejects('habilidade social', r => { r.base.skillProficiencies = ['athletics', 'persuasion']; });
rejects('especialização fora do ladino', r => { r.base.expertise = ['athletics', 'perception']; });
rejects('ladino sem especialização', r => { delete r.base.expertise; }, preset('preset-ladino-elfo-m'));
rejects('especialização em habilidade não proficiente', r => { r.base.expertise = ['arcana', 'thieves_tools']; }, preset('preset-ladino-elfo-m'));
rejects('item desconhecido na mão', r => { r.progress.hands.right = 'lightsaber'; });
rejects('instância sem id (formato antigo reservado a NFTs)', r => { r.progress.hands.right = { template: 'greatsword', modifiers: { dmg: 99 } }; });
// 6b) Instâncias de item: { id, count?, durability? }
{
  const ok = (name, mut, check2) => { const r = clone(preset('preset-guerreiro-anao-m')); mut(r); const v = CharacterSchema.validate(r); check('aceita: ' + name, v.ok && (!check2 || check2(v.value)), v.errors.join('; ')); };
  ok('pilha de moedas na bolsa', r => { r.progress.inventory = [{ id: 'gold_coin', count: 7 }]; }, v => v.progress.inventory[0].count === 7);
  ok('arma com durabilidade na mão', r => { r.progress.hands.right = { id: 'longsword', durability: 30 }; }, v => v.progress.hands.right.durability === 30);
  ok('chaves e Mapa na bolsa', r => { r.progress.inventory = ['key_iron', 'key_gold', 'enchanted_map']; });
  ok('campos desconhecidos da instância são ignorados', r => { r.progress.inventory = [{ id: 'dagger', durability: 5, poder: 99 }]; }, v => v.progress.inventory[0].poder === undefined);
  ok('instância só com id', r => { r.progress.inventory = [{ id: 'dagger' }]; });
  rejects('moedas: contagem 0', r => { r.progress.inventory = [{ id: 'gold_coin', count: 0 }]; });
  rejects('moedas: contagem 100 (limite 99)', r => { r.progress.inventory = [{ id: 'gold_coin', count: 100 }]; });
  rejects('contagem em item não empilhável', r => { r.progress.inventory = [{ id: 'dagger', count: 2 }]; });
  rejects('durabilidade acima do máximo', r => { r.progress.hands.right = { id: 'longsword', durability: 61 }; });
  rejects('durabilidade negativa', r => { r.progress.hands.right = { id: 'longsword', durability: -1 }; });
  rejects('durabilidade em item que não desgasta', r => { r.progress.hands.left = { id: 'shield', durability: 3 }; });
  rejects('instância com id desconhecido', r => { r.progress.inventory = [{ id: 'lightsaber' }]; });
  rejects('chave nas mãos', r => { r.progress.hands.left = 'key_iron'; });
  rejects('moeda no tronco', r => { r.progress.equipment.torso = { id: 'gold_coin', count: 1 }; });
  const d = CharacterProviders.build((() => { const r = clone(preset('preset-guerreiro-anao-m')); r.progress.hands.left = { id: 'shield' }; return r; })());
  check('Classe de Armadura com escudo em formato de instância', d.ok && d.derived.armorClass === 18, d.ok ? d.derived.armorClass : d.errors.join(';'));
  check('toda arma tem durabilidade máxima positiva', ItemCatalog.all().filter(i => i.type === 'weapon').every(i => Number.isInteger(i.maxDurability) && i.maxDurability > 0));
  eq('tipo do chão para o id do catálogo', [ItemCatalog.idForFloorType('iron'), ItemCatalog.idForFloorType('gold'), ItemCatalog.idForFloorType('map'), ItemCatalog.idForFloorType('x')], ['key_iron', 'key_gold', 'enchanted_map', null]);
  check('chaves e Mapa somem ao trocar de mapa; moeda é empilhável', ['key_iron', 'key_gold', 'enchanted_map'].every(id => ItemCatalog.get(id).mapBound) && ItemCatalog.get('gold_coin').stackable);
}
rejects('armadura na mão', r => { r.progress.hands.left = 'chain_mail'; });
rejects('escudo no tronco', r => { r.progress.equipment.torso = 'shield'; });
rejects('inventário com mais de 20 itens', r => { r.progress.inventory = new Array(21).fill('dagger'); });
rejects('inventário com texto livre', r => { r.progress.inventory = ['<b>espada</b>']; });
rejects('Vida negativa', r => { r.progress.hp = -1; });
rejects('estatística absurda', r => { r.progress.stats = { kills: 1e12 }; });
rejects('schemaVersion errado', r => { r.schemaVersion = 2; });
rejects('id com caracteres perigosos', r => { r.id = '../../x'; });
check('rejeita valores que não são objeto', [null, undefined, 5, 'x', [], true].every(v => CharacterSchema.validate(v).ok === false));
// NFT: origem
{
  const nftBase = () => {
    const r = clone(preset('preset-guerreiro-anao-m'));
    r.source = { type: 'nft', chainId: 1, contract: '0x' + 'ab'.repeat(20), tokenId: '123', metadataUri: 'ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi' };
    return r;
  };
  check('aceita origem NFT bem formada', CharacterSchema.validate(nftBase()).ok);
  const bad = (name, mut) => { const r = nftBase(); mut(r); check('rejeita NFT: ' + name, CharacterSchema.validate(r).ok === false); };
  bad('contrato curto', r => { r.source.contract = '0x1234'; });
  bad('tokenId com letras', r => { r.source.tokenId = '12a'; });
  bad('tokenId gigante', r => { r.source.tokenId = '9'.repeat(79); });
  bad('metadataUri http', r => { r.source.metadataUri = 'http://x.com/a.json'; });
  bad('metadataUri local', r => { r.source.metadataUri = 'assets/a.png'; });
  bad('chainId zero', r => { r.source.chainId = 0; });
  check('retrato ipfs:// aceito', CharacterSchema.validPortrait('ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/a.png'));
  check('retrato https:// aceito', CharacterSchema.validPortrait('https://exemplo.com/img/a.png'));
}

// 7) Normalização e segurança: devolve objeto novo, só com campos conhecidos, e não contamina protótipos
{
  const raw = clone(preset('preset-guerreiro-anao-m'));
  raw.extra = { poder: 'infinito' };
  raw.identity.derivedAc = 99;
  raw.progress.maxHp = 9999;
  const r = CharacterSchema.validate(raw);
  check('aceita e ignora campos extras', r.ok && r.value.extra === undefined && r.value.identity.derivedAc === undefined && r.value.progress.maxHp === undefined);
  check('devolve um objeto novo', r.value !== raw && r.value.identity !== raw.identity);
  const evil = JSON.parse('{"__proto__": {"polluted": true}, "schemaVersion": 1, "id": "x", "source": {"type":"preset"}, "identity": {"__proto__": {"polluted": true}}}');
  CharacterSchema.validate(evil);
  check('não contamina Object.prototype', ({}).polluted === undefined);
  const hurt = clone(preset('preset-guerreiro-anao-m')); hurt.progress.hp = 5; hurt.progress.fp = 9000;
  const hr = CharacterSchema.validate(hurt);
  eq('Vida atual respeitada e Fadiga limitada ao máximo', [hr.value.progress.hp, hr.value.progress.fp], [5, 15]);
  const copy1 = CharacterPresets.get('preset-mago-elfo-f'); copy1.identity.name = 'Alterado';
  eq('os modelos não são alterados por quem os usa', CharacterPresets.get('preset-mago-elfo-f').identity.name, 'Aelindra Lúmen');
  const idempotent = CharacterSchema.validate(r.value);
  eq('validar duas vezes dá o mesmo resultado', idempotent.value, r.value);
}

// 8) Teste em massa: milhares de personagens válidos aleatórios, todos os níveis, raças e classes
{
  const R = CharacterRules;
  const pick = a => a[Math.floor(Math.random() * a.length)];
  let built = 0, bad = 0;
  const badSamples = [];
  for (let i = 0; i < 6000; i++) {
    const cls = pick(Object.keys(R.CLASSES));
    const race = pick(Object.keys(R.RACES));
    const sub = pick(Object.keys(R.RACES[race].subraces));
    const options = R.classSkillOptions(cls).slice();
    const skills = [];
    for (let k = 0; k < R.CLASSES[cls].skillChoices.count; k++) skills.push(options.splice(Math.floor(Math.random() * options.length), 1)[0]);
    const abilities = {};
    let total;
    do { // 8 a 15 em cada atributo, dentro do orçamento permitido (soma até 78)
      total = 0;
      for (const a of R.ABILITY_IDS) { abilities[a] = 8 + Math.floor(Math.random() * 8); total += abilities[a]; }
    } while (total > 78);
    const raw = {
      schemaVersion: 1, id: 'fuzz-' + i, source: { type: 'preset' },
      identity: { name: 'Teste ' + 'ABCDEFGHIJ'[i % 10], race, subrace: sub, gender: pick(['male', 'female']), class: cls, level: 1 + Math.floor(Math.random() * 5), portrait: 'assets/portraits/x.png' },
      base: { abilities, skillProficiencies: skills },
      progress: { hands: { right: pick([null, 'longsword', 'dagger', 'longbow']), left: pick([null, 'shield', 'mace']) }, equipment: { torso: pick([undefined, 'leather', 'scale_mail', 'chain_mail', 'plate']) } }
    };
    if (cls === 'rogue') raw.base.expertise = [skills[0], 'thieves_tools'];
    const out = CharacterProviders.build(raw);
    if (!out.ok) { bad++; if (badSamples.length < 3) badSamples.push(out.errors.join(';')); continue; }
    built++;
    const d = out.derived;
    const finite = [d.maxHp, d.maxFp, d.armorClass, d.initiative, d.proficiencyBonus, d.passivePerception, d.speed].every(Number.isFinite);
    const sane = d.maxHp >= d.level && d.armorClass >= 5 && d.armorClass <= EquipmentRules.AC_CAP
      && Object.values(d.skills).every(s => Number.isFinite(s.bonus)) && Object.values(d.saves).every(s => Number.isFinite(s.bonus))
      && Object.values(d.abilities).every(a => a.score >= 3 && a.score <= 20)
      && (d.spellcasting === null || (d.spellcasting.saveDc >= 8 && Array.isArray(d.spellcasting.slots)));
    if (!finite || !sane) { bad++; if (badSamples.length < 3) badSamples.push(JSON.stringify(raw.identity)); }
  }
  check('teste em massa: nenhum personagem válido falhou (' + built + ' construídos)', bad === 0, badSamples.join(' | '));
}

// 9) Provedores
(async function () {
  const all = await CharacterProviders.preset.loadAll();
  eq('PresetProvider carrega os 6', all.length, 6);
  eq('PresetProvider lista os ids', (await CharacterProviders.preset.list()).length, 6);
  let msg = '';
  try { await CharacterProviders.preset.load('nao-existe'); } catch (e) { msg = e.message; }
  check('PresetProvider rejeita id inexistente', /inexistente/.test(msg), msg);
  msg = '';
  try { await CharacterProviders.nft.load('1'); } catch (e) { msg = e.message; }
  check('NftProvider avisa que ainda não existe', /não foi implementado/.test(msg), msg);

  console.log('\nTestes aprovados: ' + passed + ' | falhas: ' + failures.length);
  if (failures.length) {
    console.log('\nFALHAS:');
    failures.forEach(f => console.log(' - ' + f));
    process.exit(1);
  }
})();
