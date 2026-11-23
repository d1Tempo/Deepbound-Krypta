/**
 * tests/party-bag-hud.test.js
 * Testes da janela de inventário (PartyBagHud) com um DOM simulado: bolsa do personagem selecionado, título, itens, cliques.
 * Rode com Node, dentro da pasta do projeto:   node tests/party-bag-hud.test.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'js');
const files = ['items/item-catalog.js', 'items/equipment-rules.js', 'party/character-rules.js', 'party/character-schema.js',
  'party/character-presets.js', 'party/character-provider.js', 'party/party-state.js', 'party/party-inventory.js', 'party/party-bag-hud.js'];

const preamble = `
class El {
  constructor(tag) { this.tagName = tag; this.children = []; this.className = ''; this._text = ''; this.attrs = {}; this.listeners = {}; this.parent = null; this.alt = ''; this.src = ''; }
  set innerHTML(v) { throw new Error('innerHTML é proibido na janela de bolsa'); }
  get innerHTML() { throw new Error('innerHTML é proibido na janela de bolsa'); }
  set textContent(v) { this._text = String(v); }
  get textContent() { return this._text + this.children.map(c => c.textContent).join(''); }
  get firstChild() { return this.children[0] || null; }
  appendChild(c) { this.children.push(c); c.parent = this; return c; }
  removeChild(c) { this.children = this.children.filter(x => x !== c); c.parent = null; return c; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; }
  addEventListener(t, fn) { (this.listeners[t] = this.listeners[t] || []).push(fn); }
  fire(t, ev) { (this.listeners[t] || []).forEach(fn => fn(ev)); }
  find(pred, out = []) { if (pred(this)) out.push(this); this.children.forEach(c => c.find(pred, out)); return out; }
}
const document = { createElement: tag => new El(tag), getElementById: () => null };
let isEnchantedMapOpen = false;
let isMapBurning = false;
let mapToggles = 0;
function toggleEnchantedMapView() { mapToggles++; }
const toasts = [];
function showToast(msg, kind) { toasts.push({ msg, kind }); }
const player = { keys: { iron: false, gold: false }, hasEnchantedMap: false, coins: 0 };
`;
const source = preamble + files.map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n') +
  `\nreturn { El, PartyState, PartyInventory, PartyBagHud, toasts,
    setMapOpen: v => { isEnchantedMapOpen = v; }, setBurning: v => { isMapBurning = v; }, mapToggles: () => mapToggles };`;
const env = new Function(source)();
const { El, PartyState, PartyInventory: PI, PartyBagHud, toasts } = env;

let passed = 0;
const failures = [];
function check(name, cond, detail) {
  if (cond) passed++;
  else failures.push(name + (detail !== undefined ? ' -> ' + detail : ''));
}
const eq = (name, a, b) => check(name, JSON.stringify(a) === JSON.stringify(b), 'obtido ' + JSON.stringify(a) + ', esperado ' + JSON.stringify(b));
const byClass = (node, cls) => node.find(n => (' ' + n.className + ' ').includes(' ' + cls + ' '));
const bagIds = i => PartyState.getMember(i).character.progress.inventory.map(r => (typeof r === 'string' ? r : r.id));

(async function () {
  const grid = new El('div'), count = new El('span'), title = new El('span');
  title.textContent = 'Inventário';
  check('init encontra a grade', PartyBagHud.init({ grid, count, title }) === true);
  eq('antes de a equipe carregar: título simples e 20 slots vazios', [title.textContent, count.textContent, grid.children.length], ['Inventário', '0 / 20', 20]);
  await PartyState.init();

  const slots = () => grid.children;
  eq('selecionado (Durgan): título com o nome', title.textContent, 'Inventário | Durgan Pedraforte');
  eq('Durgan: bolsa vazia, 20 slots', [count.textContent, slots().length, byClass(grid, 'filled').length], ['0 / 20', 20, 0]);
  eq('slots numerados de 1 a 20', slots().map(s => byClass(s, 'inv-slot-index')[0].textContent), Array.from({ length: 20 }, (_, i) => String(i + 1)));

  PartyState.select(1);
  eq('trocar a seleção mostra a bolsa de outro personagem (Helga)', [title.textContent, count.textContent], ['Inventário | Helga Forjaluz', '1 / 20']);
  let first = slots()[0];
  eq('Helga: a poção aparece no slot 1', [first.attrs.title, byClass(first, 'pixel-icon')[0].src], ['Poção de Cura', 'assets/items/potion_healing.png']);
  PartyState.select(3);
  eq('Aelindra: a adaga', [title.textContent, slots()[0].attrs.title], ['Inventário | Aelindra Lúmen', 'Adaga — clique para segurar']);
  PartyState.select(0);

  // Chaves, Mapa e moedas entram na bolsa do selecionado e a janela se atualiza sozinha
  PI.receive('key_iron');
  PI.receive('enchanted_map');
  eq('chave e Mapa no Durgan', [count.textContent, slots()[0].attrs.title, slots()[1].attrs.title.startsWith('Mapa Encantado')], ['2 / 20', 'Chave de Ferro', true]);
  const keyIcon = byClass(slots()[0], 'inv-slot').length ? null : byClass(slots()[0], 'filled-key');
  check('chave é um slot de bolsa com a arte da chave (sem suavização desligada)', slots()[0].className.includes('filled-key') && byClass(slots()[0], 'pixel-icon').length === 0);
  eq('arte da chave', slots()[0].children[0].src, 'assets/keys/iron.png');
  slots()[1].fire('click');
  eq('clicar no Mapa abre/fecha o mapa', env.mapToggles(), 1);
  env.setMapOpen(true); PartyBagHud.render();
  check('Mapa aberto fica destacado', slots()[1].className.includes('active-map-slot'));
  eq('título do Mapa aberto', slots()[1].attrs.title.endsWith('fechar o mapa'), true);
  env.setMapOpen(false); env.setBurning(true); PartyBagHud.render();
  check('Mapa queimando mostra o fogo', slots()[1].className.includes('burning-map-slot') && byClass(slots()[1], 'map-fire-fx').length === 1);
  env.setBurning(false); PartyBagHud.render();

  PI.receiveCoin(); PI.receiveCoin(4);
  const coinSlot = slots()[2];
  eq('moedas em uma pilha no slot 3, com a quantidade', [coinSlot.attrs.title, byClass(coinSlot, 'inv-slot-count')[0].textContent, byClass(coinSlot, 'pixel-icon')[0].src], ['Dobrão de Ouro: 5 (máximo 99)', '5', 'assets/objects/coin_icon.png']);
  PI.receiveCoin(94);
  check('pilha cheia ganha destaque', slots()[2].className.includes('at-max'));
  PartyState.select(2);
  eq('outra bolsa não mostra as moedas do portador', [byClass(grid, 'filled-coin').length, count.textContent], [0, '0 / 20']);
  PartyState.select(0);
  eq('voltando ao Durgan, as moedas continuam lá', byClass(grid, 'filled-coin').length, 1);

  // Trocar de arma clicando na bolsa
  PartyState.select(2);
  PI.receive('longsword');
  const at = bagIds(2).indexOf('longsword');
  toasts.length = 0;
  slots()[at].fire('click');
  const sylvar = PartyState.getMember(2).character.progress;
  eq('clicar na espada longa: vai para a mão direita; a rapieira ocupa o lugar na bolsa', [sylvar.hands.right, bagIds(2)[at]], ['longsword', 'rapier']);
  eq('aviso da troca', toasts[0], { msg: 'Sylvar Ventofino agora segura: Espada longa.', kind: 'info' });
  check('a janela mostra a rapieira no mesmo slot', slots()[at].attrs.title.startsWith('Rapieira'));
  const potionTest = PartyState.getMember(1);
  PartyState.select(1);
  toasts.length = 0;
  slots()[0].fire('click');
  eq('poção não é equipável: clicar não faz nada ainda', [toasts.length, PartyState.getMember(1).character.progress.inventory.length], [0, 1]);
  void potionTest;

  // Troca sem espaço avisa e não altera nada
  PartyState.select(0);
  PartyState.getMember(0).character.progress.inventory.push('greatsword');
  while (PartyState.getMember(0).character.progress.inventory.length < 20) PartyState.getMember(0).character.progress.inventory.push('dagger');
  PartyState.getMember(0).character.progress.hands.left = 'shield';
  PartyState.touch();
  const before = JSON.stringify(PartyState.getMember(0).character.progress);
  toasts.length = 0;
  slots()[bagIds(0).indexOf('greatsword')].fire('click');
  eq('sem espaço: aviso e nada muda', [toasts[0] && toasts[0].kind, JSON.stringify(PartyState.getMember(0).character.progress) === before], ['warn', true]);

  // Segurança e fallback do ícone
  await PartyState.init();
  PartyState.getMember(0).character.identity.name = '<img src=x onerror=alert(1)>';
  let threw = null;
  try { PartyBagHud.render(); } catch (e) { threw = e.message; }
  check('nome malicioso não usa innerHTML', threw === null, threw);
  eq('o nome malicioso aparece como texto puro no título', title.textContent, 'Inventário | <img src=x onerror=alert(1)>');
  PartyState.select(1);
  const icon = byClass(slots()[0], 'pixel-icon')[0];
  icon.fire('error');
  eq('ícone que falha mostra as 3 primeiras letras', byClass(slots()[0], 'inv-slot-fallback').map(n => n.textContent), ['POÇ']);
  eq('sempre 20 slots', slots().length, 20);

  console.log('\nTestes da janela de bolsa aprovados: ' + passed + ' | falhas: ' + failures.length);
  if (failures.length) {
    console.log('\nFALHAS:');
    failures.forEach(f => console.log(' - ' + f));
    process.exit(1);
  }
})();
