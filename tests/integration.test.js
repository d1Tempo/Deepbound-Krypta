/**
 * tests/integration.test.js
 * Integração das bolsas com o código antigo do jogo: carrega os arquivos REAIS js/player/state.js, js/player/interactions.js
 * e js/game.js, com o restante (desenho, portas, fog, personagem antigo) simulado.
 * Rode com Node, dentro da pasta do projeto:   node tests/integration.test.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'js');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const partyFiles = ['items/item-catalog.js', 'items/equipment-rules.js', 'party/character-rules.js', 'party/character-schema.js',
  'party/character-presets.js', 'party/character-provider.js', 'party/party-state.js', 'party/party-inventory.js'];

const stubs = `
const toasts = [];
function showToast(msg, kind) { toasts.push({ msg, kind }); }
const calls = { inventoryHud: 0, reveal: 0, fog: 0, loadMapArgs: [] };
function updateInventoryHUD() { calls.inventoryHud++; }
function revealHalfDungeonFromEnchantedMap() { calls.reveal++; }
function updateFogOfWar() { calls.fog++; }
function updateAll() {}
function renderMinimap() {}
function renderFirstPerson() {}
function updateCharacterHUD() {}
function initFog() {}
function buildDoorsAndWallButtons() {}
function generateHeroicCharacter() { return { name: 'Antigo', race: '', vitals: { hp: 1, maxHp: 1, fp: 1, maxFp: 1 }, skills: [] }; }
function generateProceduralDungeon() { return { grid: [[0]], rooms: [], doorList: [] }; }
const document = { getElementById: () => null };
const doors = {};
function getDoor() { return null; }
function requestAnimationFrame() { return 1; }
function cancelAnimationFrame() {}
const TILE_ENTRANCE_DOOR = 3, TILE_SPECIAL_DOOR = 4;
let currentMapIndex = 1, currentTheme = { name: 'Teste' }, dungeonMap = [], currentRooms = [], revealAllCheat = false;
let keysOnFloor = [], START_POS = { x: 1, y: 1, dir: 0 }, GOAL_POS = { x: 2, y: 2, dir: 0 };
`;
const source = stubs + partyFiles.map(read).join('\n') + '\n' + read('player/state.js') + '\n' + read('player/interactions.js') + '\n' + read('game.js') + `
return { toasts, calls, player, PartyState, PartyInventory, ItemCatalog, CharacterSchema,
  collectKeyByClick, collectCoinByClick, activateWallButton, loadMap, resetGame, teleportNearGoal,
  burning: () => isMapBurning, setKeysOnFloor: v => { keysOnFloor = v; }, setPlayerPos: (x, y) => { player.x = x; player.y = y; } };`;
const g = new Function(source)();
const { toasts, calls, player, PartyState, PartyInventory: PI } = g;

let passed = 0;
const failures = [];
function check(name, cond, detail) {
  if (cond) passed++;
  else failures.push(name + (detail !== undefined ? ' -> ' + detail : ''));
}
const eq = (name, a, b) => check(name, JSON.stringify(a) === JSON.stringify(b), 'obtido ' + JSON.stringify(a) + ', esperado ' + JSON.stringify(b));
const last = () => toasts[toasts.length - 1];
const bag = i => PartyState.getMember(i).character.progress.inventory;
const ids = i => bag(i).map(r => (typeof r === 'string' ? r : r.id));
const key = (type, name) => ({ id: 'key-' + type, type, name, collected: false });
const dummyBtn = { isRemote: false, isSpecial: false };
const door = (lock) => ({ type: 2, x: 5, y: 5, lockType: lock, unlocked: false, open: false, anim: 0, visualStyle: 'iron' });

(async function () {
  // Equipe ainda carregando
  const early = key('iron', 'Chave de Ferro');
  g.collectKeyByClick(early);
  eq('equipe carregando: a chave não é pega e o jogador é avisado', [early.collected, last().msg.includes('carregando')], [false, true]);
  g.collectCoinByClick({ collected: false });
  check('moeda também espera a equipe', last().msg.includes('carregando'));

  await PartyState.init();
  PartyState.select(1);   // Helga

  // Chaves e Mapa
  const iron = key('iron', 'Chave de Ferro');
  g.collectKeyByClick(iron);
  eq('chave de ferro vai para a bolsa da Helga', [iron.collected, ids(1), player.keys.iron], [true, ['potion_healing', 'key_iron'], true]);
  check('aviso cita quem pegou', last().msg.includes('Helga Forjaluz') && last().msg.includes('Chave de Ferro'), last().msg);
  const map = key('map', 'Mapa Encantado');
  const revealsBefore = calls.reveal;
  g.collectKeyByClick(map);
  eq('Mapa vai para a bolsa do selecionado e revela metade da masmorra', [map.collected, ids(1).includes('enchanted_map'), player.hasEnchantedMap, calls.reveal - revealsBefore], [true, true, true, 1]);
  g.collectKeyByClick(iron);
  eq('chave já pega não duplica', ids(1).filter(x => x === 'key_iron').length, 1);
  PartyState.select(3);
  const gold = key('gold', 'Chave de Ouro');
  g.collectKeyByClick(gold);
  eq('com outro personagem selecionado, a chave de ouro vai para ele (Aelindra)', [ids(3).includes('key_gold'), player.keys.gold], [true, true]);

  // Bolsas cheias
  PartyState.select(0);
  for (let i = 0; i < 4; i++) while (bag(i).length < 20) bag(i).push('dagger');
  const blocked = key('iron', 'Chave de Ferro');
  g.collectKeyByClick(blocked);
  eq('todas as bolsas cheias: não pega e avisa', [blocked.collected, last().kind, last().msg.includes('cheias')], [false, 'warn', true]);

  // Moedas: a primeira para o selecionado, as seguintes sempre para o mesmo
  await PartyState.init(); PartyState.select(2);   // Sylvar
  const c1 = { collected: false }, c2 = { collected: false };
  g.collectCoinByClick(c1);
  eq('primeira moeda vai para o selecionado (Sylvar)', [c1.collected, PI.coinHolder(), player.coins], [true, 2, 1]);
  PartyState.select(0);
  g.collectCoinByClick(c2);
  eq('a segunda vai para o mesmo personagem, mesmo com outro selecionado', [PI.coinHolder(), PI.totalCoins(), player.coins, last().msg.includes('Sylvar')], [2, 2, 2, true]);
  PI.receiveCoin(97);
  const c3 = { collected: false };
  g.collectCoinByClick(c3);
  eq('limite de 99: a moeda fica no chão e o jogador é avisado', [c3.collected, PI.totalCoins(), last().msg.includes('99')], [false, 99, true]);

  // Fechadura: a chave é consumida da bolsa
  await PartyState.init(); PartyState.select(0);
  g.setPlayerPos(0, 0);
  const d1 = door('iron');
  g.activateWallButton(dummyBtn, d1);
  eq('sem a chave de ferro a porta não abre', [d1.open, last().msg.includes('não possui a Chave de Ferro')], [false, true]);
  PI.receive('key_iron');
  g.activateWallButton(dummyBtn, d1);
  eq('com a chave: abre, a chave some da bolsa e é marcada como usada', [d1.open, d1.unlocked, PI.has('key_iron'), player.keys.iron, player.keysUsed.iron], [true, true, false, false, true]);
  const d2 = door('gold');
  PI.receive('key_gold');
  g.activateWallButton(dummyBtn, d2);
  eq('chave de ouro também é consumida', [d2.open, PI.has('key_gold'), player.keysUsed.gold], [true, false, true]);

  // Porta especial: o Mapa queima quando está em alguma bolsa
  PI.receive('enchanted_map');
  player.keysUsed.iron = true; player.keysUsed.gold = true;
  const special = { type: 4, x: 7, y: 7, open: false, anim: 0, visualStyle: 'iron' };
  g.activateWallButton({ isSpecial: true }, special);
  check('porta especial abre e o Mapa queima', special.open && g.burning() && toasts.some(t => t.msg.includes('queimou')));

  // Trocar de mapa: chaves e Mapa somem; moedas e armas ficam
  await PartyState.init(); PartyState.select(0);
  PI.receive('key_iron'); PI.receive('key_gold'); PI.receive('enchanted_map'); PI.receiveCoin(7);
  bag(0).push('longsword');
  player.keysUsed.iron = true;
  g.loadMap(2);
  eq('loadMap: chaves e Mapa somem de todas as bolsas', [PI.has('key_iron'), PI.has('key_gold'), PI.has('enchanted_map'), player.hasEnchantedMap, player.keys.iron], [false, false, false, false, false]);
  eq('loadMap: moedas e armas ficam', [PI.totalCoins(), ids(0).includes('longsword'), player.coins], [7, true, 7]);
  eq('loadMap: chaves usadas voltam a zero', [player.keysUsed.iron, player.keysUsed.gold], [false, false]);

  // Nova masmorra: zera as moedas
  g.resetGame();
  eq('Gerar Nova Masmorra zera as moedas e volta ao mapa 1', [PI.totalCoins(), PI.coinHolder(), player.coins, player.steps], [0, null, 0, 0]);
  check('a arma continua na bolsa', ids(0).includes('longsword'));

  // Teletransporte do desenvolvedor: chaves concedidas e usadas
  PI.receive('key_iron'); PI.receive('enchanted_map');
  g.setKeysOnFloor([{ collected: false }]);
  g.teleportNearGoal();
  eq('teletransporte: chaves e Mapa saem das bolsas e as chaves contam como usadas', [PI.has('key_iron'), PI.has('enchanted_map'), player.keysUsed.iron, player.keysUsed.gold], [false, false, true, true]);

  // Depois de tudo isso, os dados das bolsas continuam válidos para o esquema
  const allValid = [0, 1, 2, 3].every(i => g.CharacterSchema.validate(PartyState.getMember(i).character).ok);
  check('os dados das 4 bolsas continuam válidos para o esquema', allValid);

  console.log('\nTestes de integração aprovados: ' + passed + ' | falhas: ' + failures.length);
  if (failures.length) {
    console.log('\nFALHAS:');
    failures.forEach(f => console.log(' - ' + f));
    process.exit(1);
  }
})();
