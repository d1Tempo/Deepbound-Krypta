/**
 * tests/party-inventory.test.js
 * Testes das bolsas individuais (PartyInventory): destino de chaves, Mapa e moedas, troca de armas e escudos.
 * Rode com Node, dentro da pasta do projeto:   node tests/party-inventory.test.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'js');
const files = ['items/item-catalog.js', 'items/equipment-rules.js', 'party/character-rules.js', 'party/character-schema.js',
  'party/character-presets.js', 'party/character-provider.js', 'party/party-state.js', 'party/party-inventory.js'];
const source = 'const player = { keys: { iron: false, gold: false }, hasEnchantedMap: false, coins: 0 };\n' +
  files.map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n') +
  '\nreturn { player, PartyState, PartyInventory, CharacterSchema, CharacterRules, ItemCatalog };';
const { player, PartyState, PartyInventory: PI, CharacterSchema, CharacterRules, ItemCatalog } = new Function(source)();

let passed = 0;
const failures = [];
function check(name, cond, detail) {
  if (cond) passed++;
  else failures.push(name + (detail !== undefined ? ' -> ' + detail : ''));
}
const eq = (name, a, b) => check(name, JSON.stringify(a) === JSON.stringify(b), 'obtido ' + JSON.stringify(a) + ', esperado ' + JSON.stringify(b));
const bag = i => PartyState.getMember(i).character.progress.inventory;
const hands = i => PartyState.getMember(i).character.progress.hands;
const ids = i => bag(i).map(r => (typeof r === 'string' ? r : r.id));
const fill = (i, n) => { while (bag(i).length < n) bag(i).push('dagger'); };
async function fresh(selected) {
  await PartyState.init();
  PartyState.select(selected === undefined ? 0 : selected);
  player.keys.iron = false; player.keys.gold = false; player.hasEnchantedMap = false; player.coins = 0;
}
const valid = i => CharacterSchema.validate(PartyState.getMember(i).character).ok;

(async function () {
  // Equipe padrão: 0 Durgan, 1 Helga, 2 Sylvar, 3 Aelindra
  await fresh(0);
  eq('bolsas iniciais', [0, 1, 2, 3].map(i => ids(i)), [[], ['potion_healing'], [], ['dagger']]);

  // --- Chaves e Mapa vão para o selecionado, com a borda branca
  let r = PI.receive('key_iron');
  eq('chave vai para o selecionado (Durgan)', [r.ok, r.memberIndex, ids(0)], [true, 0, ['key_iron']]);
  eq('campo antigo player.keys.iron acompanha', player.keys.iron, true);
  PartyState.select(2);
  r = PI.receive('enchanted_map');
  eq('Mapa vai para o novo selecionado (Sylvar)', [r.memberIndex, ids(2)], [2, ['enchanted_map']]);
  eq('campo antigo player.hasEnchantedMap acompanha', player.hasEnchantedMap, true);
  r = PI.receive('key_gold');
  eq('outra chave também vai para o selecionado', [r.memberIndex, ids(2)], [2, ['enchanted_map', 'key_gold']]);
  check('chaves valem para a equipe: has() olha todas as bolsas', PI.has('key_iron') && PI.has('key_gold') && PI.has('enchanted_map'));
  check('os dados continuam válidos para o esquema', [0, 1, 2, 3].every(valid));

  // --- Bolsa cheia: vai para o próximo da formação com espaço; todas cheias: não entra
  await fresh(3);
  fill(3, PI.BAG_SIZE);
  r = PI.receive('key_iron');
  eq('selecionado cheio: vai para o próximo da formação (posição 0)', [r.ok, r.memberIndex], [true, 0]);
  fill(0, PI.BAG_SIZE); fill(1, PI.BAG_SIZE);
  r = PI.receive('key_gold');
  eq('só a posição 2 tem espaço', [r.ok, r.memberIndex], [true, 2]);
  fill(2, PI.BAG_SIZE);
  r = PI.receive('enchanted_map');
  eq('todas as bolsas cheias: não entra', [r.ok, r.reason], [false, 'bags_full']);
  eq('item desconhecido', PI.receive('lightsaber').reason, 'unknown_item');
  eq('moeda deve usar receiveCoin', PI.receive('gold_coin').reason, 'use_receiveCoin');

  // --- Moedas: a primeira segue a regra; as outras sempre vão para quem já tem a pilha
  await fresh(1);
  r = PI.receiveCoin();
  eq('primeira moeda vai para o selecionado (Helga)', [r.ok, r.memberIndex, PI.coinHolder()], [true, 1, 1]);
  eq('pilha em formato de instância', bag(1).find(x => typeof x === 'object'), { id: 'gold_coin', count: 1 });
  PartyState.select(3);
  r = PI.receiveCoin();
  eq('moeda seguinte vai para o portador, mesmo com outro selecionado', [r.memberIndex, PI.totalCoins(), player.coins], [1, 2, 2]);
  check('a bolsa do selecionado (Aelindra) não ganhou moedas', !ids(3).includes('gold_coin'));
  fill(1, PI.BAG_SIZE);
  r = PI.receiveCoin();
  eq('com a bolsa do portador cheia, a pilha ainda recebe', [r.ok, PI.totalCoins()], [true, 3]);
  eq('passar de 99 é recusado e não altera a pilha', [PI.receiveCoin(97).reason, PI.totalCoins()], ['coin_limit', 3]);
  eq('limite de 99 por pilha', [PI.receiveCoin(96).ok, PI.totalCoins(), PI.receiveCoin().reason, PI.totalCoins()], [true, 99, 'coin_limit', 99]);
  eq('quantidade inválida', [PI.receiveCoin(0).reason, PI.receiveCoin(-1).reason, PI.receiveCoin(1.5).reason], ['bad_amount', 'bad_amount', 'bad_amount']);
  check('os dados continuam válidos (pilha com 99)', [0, 1, 2, 3].every(valid));
  PI.clearCoins();
  eq('zerar as moedas', [PI.totalCoins(), PI.coinHolder(), player.coins], [0, null, 0]);
  r = PI.receiveCoin();
  eq('depois de zerar, a primeira moeda volta a seguir o selecionado', [r.memberIndex], [3]);
  await fresh(0);
  fill(0, PI.BAG_SIZE);
  PartyState.select(0);
  r = PI.receiveCoin();
  eq('primeira moeda com o selecionado cheio vai para o próximo com espaço', [r.ok, r.memberIndex], [true, 1]);
  await fresh(0);
  fill(0, PI.BAG_SIZE); fill(1, PI.BAG_SIZE); fill(2, PI.BAG_SIZE); fill(3, PI.BAG_SIZE);
  eq('primeira moeda com todas as bolsas cheias', PI.receiveCoin().reason, 'bags_full');

  // --- Consumir (chave usada na fechadura) e limpar o que é do mapa
  await fresh(0);
  PI.receive('key_iron'); PI.receiveCoin(); PI.receive('enchanted_map');
  check('consumir remove só uma unidade', PI.consume('key_iron') === true && !PI.has('key_iron'));
  eq('campo antigo player.keys.iron volta a falso', player.keys.iron, false);
  eq('consumir o que não existe', PI.consume('key_iron'), false);
  PI.receive('key_gold');
  PI.clearMapBound();
  eq('trocar de mapa: chaves e Mapa somem; moedas e armas ficam', [PI.has('key_gold'), PI.has('enchanted_map'), PI.totalCoins(), ids(1), player.hasEnchantedMap], [false, false, 1, ['potion_healing'], false]);
  PI.receiveCoin(); PI.consume('gold_coin');
  eq('consumir uma moeda reduz a pilha', PI.totalCoins(), 1);
  PI.consume('gold_coin');
  eq('a última moeda some e a pilha deixa de existir', [PI.totalCoins(), PI.coinHolder()], [0, null]);

  // --- Trocar de arma e escudo (bolsa -> mão)
  await fresh(2); // Sylvar: rapieira na direita, adaga na esquerda, couro
  PI.receive('longsword'); PI.receive('shield');
  eq('bolsa da Sylvar antes', ids(2), ['longsword', 'shield']);
  r = PI.equip(2, 0, 'right');
  eq('espada longa vai para a mão direita; a rapieira ocupa o lugar dela na bolsa', [r.ok, r.replaced, hands(2).right, ids(2)], [true, ['rapier'], 'longsword', ['rapier', 'shield']]);
  r = PI.equip(2, 1);
  eq('escudo vai para a mão esquerda por padrão; a adaga volta à bolsa', [r.ok, hands(2).left, ids(2)], [true, 'shield', ['rapier', 'dagger']]);
  const ac = CharacterRules.derive(PartyState.getMember(2).character).armorClass;
  eq('Classe de Armadura com escudo (couro 11 + DES 3 + escudo 2)', ac, 16);
  check('dados continuam válidos após as trocas', valid(2));
  PI.receive('greatsword');
  const gsAt = bag(2).length - 1;
  r = PI.equip(2, gsAt);
  eq('arma de duas mãos: esvazia a esquerda e devolve as duas armas antigas', [r.ok, hands(2).right, hands(2).left, ids(2).sort()], [true, 'greatsword', null, ['dagger', 'longsword', 'rapier', 'shield'].sort()]);
  PI.receive('mace');
  const maceAt = bag(2).length - 1;
  r = PI.equip(2, maceAt, 'left');
  eq('arma de uma mão com a de duas mãos equipada: a grande volta à bolsa', [r.ok, hands(2).right, hands(2).left, ids(2).includes('greatsword')], [true, null, 'mace', true]);
  check('dados continuam válidos após a arma de duas mãos', valid(2));

  // --- Falta de espaço cancela tudo (sem alterar nada)
  await fresh(2);
  PI.receive('greatsword');
  const snapshot = JSON.stringify(PartyState.getMember(2).character.progress);
  fill(2, PI.BAG_SIZE);
  const full = JSON.stringify(PartyState.getMember(2).character.progress);
  r = PI.equip(2, ids(2).indexOf('greatsword'));
  eq('duas mãos ocupadas e bolsa cheia: cancela', [r.ok, r.reason], [false, 'bag_full']);
  eq('nada foi alterado no cancelamento', JSON.stringify(PartyState.getMember(2).character.progress), full);
  check('o teste de cancelamento partiu de um estado real', snapshot !== full);

  // --- Entradas inválidas e guardar na bolsa
  await fresh(0);
  PI.receive('key_iron'); PI.receive('potion_healing');
  eq('chave não se equipa', PI.equip(0, 0).reason, 'not_equippable');
  eq('poção não se equipa (será bebida)', PI.equip(0, 1).reason, 'not_equippable');
  eq('posição inválida da bolsa', [PI.equip(0, 9).reason, PI.equip(0, -1).reason, PI.equip(0, 1.5).reason], ['bad_slot', 'bad_slot', 'bad_slot']);
  PI.receive('shield');
  eq('mão inválida', PI.equip(0, 2, 'middle').reason, 'bad_hand');
  eq('personagem inexistente', [PI.equip(7, 0).reason, PI.unequip(7, 'right').reason], ['no_member', 'no_member']);
  r = PI.unequip(0, 'right');
  eq('guardar o montante na bolsa', [r.ok, hands(0).right, ids(0).includes('greatsword')], [true, null, true]);
  eq('mão vazia', PI.unequip(0, 'left').reason, 'empty_hand');
  eq('mão inválida ao guardar', PI.unequip(0, 'both').reason, 'bad_hand');
  fill(0, PI.BAG_SIZE);
  PI.equip(0, ids(0).indexOf('shield'), 'left');
  fill(0, PI.BAG_SIZE);
  eq('bolsa cheia: não guarda', PI.unequip(0, 'left').reason, 'bag_full');

  // --- Instâncias com durabilidade passam pela troca e continuam válidas
  await fresh(0);
  bag(0).push({ id: 'longsword', durability: 12 });
  r = PI.equip(0, bag(0).length - 1, 'right');
  eq('a instância com durabilidade vai para a mão e o montante volta', [r.ok, hands(0).right, ids(0).includes('greatsword')], [true, { id: 'longsword', durability: 12 }, true]);
  check('dados válidos com a instância na mão', valid(0));
  eq('o ícone do HUD reconhece a instância', ItemCatalog.resolve(hands(0).right).id, 'longsword');

  // --- Avisos à interface
  await fresh(0);
  let notified = 0;
  PartyState.onChange(() => { notified++; });
  PI.receive('key_iron'); PI.receiveCoin(); PI.consume('key_iron'); PI.clearMapBound(); PI.clearCoins();
  eq('cada alteração avisa a interface', notified, 5);

  console.log('\nTestes das bolsas aprovados: ' + passed + ' | falhas: ' + failures.length);
  if (failures.length) {
    console.log('\nFALHAS:');
    failures.forEach(f => console.log(' - ' + f));
    process.exit(1);
  }
})();
