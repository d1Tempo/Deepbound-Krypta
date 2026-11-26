/**
 * tests/party-sheet.test.js
 * Testes do conteúdo da ficha (CharacterSheet) com um DOM simulado: atributos, resistências, habilidades, proficiências,
 * magias, traços, estatísticas e avisos. Os valores esperados foram calculados à mão com as regras do SRD 5.1.
 * Rode com Node, dentro da pasta do projeto:   node tests/party-sheet.test.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'js');
const files = ['items/item-catalog.js', 'items/equipment-rules.js', 'party/character-rules.js', 'party/character-schema.js',
  'party/character-presets.js', 'party/character-provider.js', 'party/character-sheet.js'];
const preamble = `
class El {
  constructor(tag) { this.tagName = tag; this.children = []; this.className = ''; this._text = ''; this.attrs = {}; this.listeners = {}; this.parent = null; this.alt = ''; this.src = ''; }
  set innerHTML(v) { throw new Error('innerHTML é proibido na ficha'); }
  get innerHTML() { throw new Error('innerHTML é proibido na ficha'); }
  set textContent(v) { this._text = String(v); }
  get textContent() { return this._text + this.children.map(c => c.textContent).join(''); }
  appendChild(c) { this.children.push(c); c.parent = this; return c; }
  removeChild(c) { this.children = this.children.filter(x => x !== c); c.parent = null; return c; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  addEventListener(t, fn) { (this.listeners[t] = this.listeners[t] || []).push(fn); }
  fire(t, ev) { (this.listeners[t] || []).forEach(fn => fn(ev)); }
  find(pred, out = []) { if (pred(this)) out.push(this); this.children.forEach(c => c.find(pred, out)); return out; }
}
const document = { createElement: tag => new El(tag) };
`;
const source = preamble + files.map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n') +
  '\nreturn { CharacterSheet, CharacterProviders, CharacterPresets };';
const { CharacterSheet, CharacterProviders, CharacterPresets } = new Function(source)();

let passed = 0;
const failures = [];
function check(name, cond, detail) {
  if (cond) passed++;
  else failures.push(name + (detail !== undefined ? ' -> ' + detail : ''));
}
const eq = (name, a, b) => check(name, JSON.stringify(a) === JSON.stringify(b), 'obtido ' + JSON.stringify(a) + ', esperado ' + JSON.stringify(b));
const byClass = (node, cls) => node.find(n => (' ' + n.className + ' ').includes(' ' + cls + ' '));
const clone = v => JSON.parse(JSON.stringify(v));

const sheetOf = (raw, onClose) => {
  const built = CharacterProviders.build(raw);
  if (!built.ok) throw new Error(built.errors.join('; '));
  return CharacterSheet.build({ character: built.character, derived: built.derived }, onClose);
};
const sections = sheet => byClass(sheet, 'sheet-section');
const sectionByTitle = (sheet, title) => sections(sheet).find(s => byClass(s, 'sheet-section-title')[0].textContent === title);
const lines = sec => byClass(sec, 'sheet-line').map(l => [byClass(l, 'sheet-line-label')[0].textContent, byClass(l, 'sheet-line-value')[0].textContent]);
const lineValue = (sheet, title, label) => { const sec = sectionByTitle(sheet, title); const hit = sec && lines(sec).find(p => p[0] === label); return hit ? hit[1] : undefined; };
const chips = sec => byClass(sec, 'sheet-chip').map(c => [byClass(c, 'sheet-chip-label')[0].textContent, byClass(c, 'sheet-chip-value')[0].textContent]);
const titles = sheet => sections(sheet).map(s => byClass(s, 'sheet-section-title')[0].textContent);

// --- Durgan: guerreiro anão (cota de malha, montante), nível 1
{
  const sheet = sheetOf(CharacterPresets.get('preset-guerreiro-anao-m'));
  eq('cabeçalho: nome e subtítulo', [byClass(sheet, 'sheet-name')[0].textContent, byClass(sheet, 'sheet-subtitle')[0].textContent], ['Durgan Pedraforte', 'Anão da colina · Guerreiro · Nv 1']);
  eq('seções do guerreiro (sem Magias)', titles(sheet), ['Resumo', 'Atributos', 'Testes de resistência', 'Habilidades', 'Proficiências', 'Traços e características', 'Estatísticas de jogo']);
  eq('resumo', chips(sectionByTitle(sheet, 'Resumo')), [['Vida', '13 / 13'], ['Fadiga', '15 / 15'], ['Armadura', '16'], ['Iniciativa', '+2'], ['Deslocamento', '25 pés'], ['Proficiência', '+2']]);
  const ab = byClass(sectionByTitle(sheet, 'Atributos'), 'sheet-ability').map(c => [byClass(c, 'sheet-ability-label')[0].textContent, byClass(c, 'sheet-ability-score')[0].textContent, byClass(c, 'sheet-ability-mod')[0].textContent]);
  eq('atributos finais e modificadores (anão: +2 CON, +1 SAB)', ab, [['FOR', '15', '+2'], ['DES', '14', '+2'], ['CON', '15', '+2'], ['INT', '8', '-1'], ['SAB', '13', '+1'], ['CAR', '10', '+0']]);
  eq('resistências: FOR e CON proficientes', chips(sectionByTitle(sheet, 'Testes de resistência')), [['FOR ●', '+4'], ['DES', '+2'], ['CON ●', '+4'], ['INT', '-1'], ['SAB', '+1'], ['CAR', '+0']]);
  eq('Atletismo proficiente (FOR +2, prof +2)', lineValue(sheet, 'Habilidades', 'Atletismo (FOR) ●'), '+4');
  eq('Percepção proficiente (SAB +1, prof +2)', lineValue(sheet, 'Habilidades', 'Percepção (SAB) ●'), '+3');
  eq('Acrobacia sem proficiência', lineValue(sheet, 'Habilidades', 'Acrobacia (DES)'), '+2');
  eq('Percepção passiva', lineValue(sheet, 'Habilidades', 'Percepção passiva'), '13');
  eq('só habilidades de masmorra (9 + 2 passivas, sem sociais)', lines(sectionByTitle(sheet, 'Habilidades')).length, 11);
  check('nenhuma habilidade social aparece', !sheet.textContent.match(/Persuasão|Enganação|Intimidação|Atuação/));
  eq('armaduras', lineValue(sheet, 'Proficiências', 'Armaduras'), 'leves, médias, pesadas, escudos');
  eq('armas (categorias e as específicas do anão)', lineValue(sheet, 'Proficiências', 'Armas'), 'armas simples, armas marciais, Machado de batalha, Machadinha, Martelo leve, Martelo de guerra');
  const feats = byClass(sectionByTitle(sheet, 'Traços e características'), 'sheet-feature-name').map(n => n.textContent);
  check('traços da raça e da classe', feats.includes('Robustez Anã') && feats.includes('Estilo de Luta  (nível 1)') && feats.includes('Retomar o Fôlego  (nível 1)') && !feats.some(f => f.includes('Ataque Extra')), feats.join('|'));
  eq('estatísticas de jogo zeradas', lines(sectionByTitle(sheet, 'Estatísticas de jogo')).map(p => p[1]), ['0', '0', '0', '0', '0']);
  check('sem avisos de armadura', byClass(sheet, 'sheet-warning').length === 0);
  check('armadura pesada avisa sobre Furtividade', byClass(sheet, 'sheet-note').some(n => n.textContent.includes('Furtividade')));
}

// --- Sylvar: ladino elfo (especialização, ataque furtivo)
{
  const sheet = sheetOf(CharacterPresets.get('preset-ladino-elfo-m'));
  eq('Ferramentas de ladrão com especialização (DES +3, 2 × 2)', lineValue(sheet, 'Habilidades', 'Ferramentas de ladrão ★'), '+7');
  eq('Percepção (raça élfica) com especialização (SAB +1, 2 × 2)', lineValue(sheet, 'Habilidades', 'Percepção (SAB) ★'), '+5');
  eq('Furtividade proficiente', lineValue(sheet, 'Habilidades', 'Furtividade (DES) ●'), '+5');
  eq('resistências DES e INT', chips(sectionByTitle(sheet, 'Testes de resistência')).filter(c => c[0].includes('●')).map(c => c[0]), ['DES ●', 'INT ●']);
  eq('Ataque Furtivo', lineValue(sheet, 'Traços e características', 'Ataque Furtivo'), '1d6');
  eq('armadura leve apenas', lineValue(sheet, 'Proficiências', 'Armaduras'), 'leves');
  check('armas do ladino e do elfo', ['Besta de mão', 'Espada longa', 'Rapieira', 'Espada curta', 'Arco curto', 'Arco longo'].every(n => lineValue(sheet, 'Proficiências', 'Armas').includes(n)));
}

// --- Aelindra: maga elfa (magias)
{
  const sheet = sheetOf(CharacterPresets.get('preset-mago-elfo-f'));
  check('seção de Magias presente', titles(sheet).includes('Magias'));
  eq('conjuração (INT 16: CD 8+2+3, ataque +5)', [lineValue(sheet, 'Magias', 'Atributo de conjuração'), lineValue(sheet, 'Magias', 'CD das magias'), lineValue(sheet, 'Magias', 'Ataque de magia')], ['INT', '13', '+5']);
  eq('truques (3 + 1 do elfo alto), preparadas e espaços', [lineValue(sheet, 'Magias', 'Truques'), lineValue(sheet, 'Magias', 'Magias preparadas'), lineValue(sheet, 'Magias', 'Espaços de magia')], ['4', '4', '1º: 2']);
  eq('sem armadura e só armas específicas', [lineValue(sheet, 'Proficiências', 'Armaduras'), lineValue(sheet, 'Proficiências', 'Armas').startsWith('Adaga')], ['nenhuma', true]);
  eq('Vida 7 / 7 e Armadura 13', chips(sectionByTitle(sheet, 'Resumo')).slice(0, 3), [['Vida', '7 / 7'], ['Fadiga', '13 / 13'], ['Armadura', '13']]);
}

// --- Paladino: magias só a partir do nível 2; nível 5 (bônus de proficiência +3, Ataque Extra)
{
  const p1 = CharacterPresets.get('preset-paladino-humano-m');
  check('paladino nível 1 não tem seção de Magias', !titles(sheetOf(p1)).includes('Magias'));
  const p2 = clone(p1); p2.identity.level = 2;
  eq('paladino nível 2 conjura com CAR', lineValue(sheetOf(p2), 'Magias', 'Atributo de conjuração'), 'CAR');
  const p5 = clone(p1); p5.identity.level = 5;
  const s5 = sheetOf(p5);
  eq('nível 5: bônus de proficiência +3 e Vida maior', [chips(sectionByTitle(s5, 'Resumo'))[5], chips(sectionByTitle(s5, 'Resumo'))[0][1]], [['Proficiência', '+3'], '44 / 44']);   // 10 + 2 no nível 1, mais 4 × (6 + 2)
  check('nível 5: Ataque Extra e espaços de magia 4 / 2', byClass(s5, 'sheet-feature-name').some(n => n.textContent.startsWith('Ataque Extra')) && lineValue(s5, 'Magias', 'Espaços de magia') === '1º: 4 · 2º: 2');
}

// --- Vida atual, estatísticas e avisos
{
  const raw = CharacterPresets.get('preset-mago-elfo-f');
  raw.progress.hp = 3; raw.progress.fp = 1; raw.progress.stats = { kills: 4, damageDealt: 37, trapsDisarmed: 2, secretDoorsFound: 1, doorsOpened: 9 };
  raw.progress.equipment = { torso: 'chain_mail' };
  const sheet = sheetOf(raw);
  eq('Vida e Fadiga atuais aparecem', chips(sectionByTitle(sheet, 'Resumo')).slice(0, 2), [['Vida', '3 / 7'], ['Fadiga', '1 / 13']]);
  eq('estatísticas de jogo', lines(sectionByTitle(sheet, 'Estatísticas de jogo')).map(p => p[1]), ['4', '37', '2', '1', '9']);
  check('armadura sem proficiência gera aviso', byClass(sheet, 'sheet-warning').length === 1 && byClass(sheet, 'sheet-warning')[0].textContent.includes('sem proficiência'));
  check('deslocamento reduzido por FOR insuficiente (cota de malha exige 13; FOR 8)', chips(sectionByTitle(sheet, 'Resumo'))[4][1] === '20 pés', chips(sectionByTitle(sheet, 'Resumo'))[4][1]);
}

// --- Fechar, ícone e segurança
{
  let closes = 0;
  const sheet = sheetOf(CharacterPresets.get('preset-clerigo-anao-f'), () => { closes++; });
  const mini = byClass(sheet, 'sheet-mini')[0];
  eq('miniatura: título e imagem do rosto', [mini.attrs.title, byClass(mini, 'sheet-mini-img')[0].src], ['Fechar a ficha', 'assets/portraits/helga.png']);
  mini.fire('click');
  byClass(sheet, 'sheet-close')[0].fire('click');
  eq('a miniatura e o X chamam o fechamento', closes, 2);
  byClass(mini, 'sheet-mini-img')[0].fire('error');
  eq('rosto que falha mostra as iniciais', byClass(mini, 'sheet-mini-fallback').map(n => n.textContent), ['HF']);
  const noHandler = sheetOf(CharacterPresets.get('preset-clerigo-anao-f'));
  let threw = null;
  try { byClass(noHandler, 'sheet-close')[0].fire('click'); } catch (e) { threw = e.message; }
  check('fechar sem ouvinte não dá erro', threw === null, threw);
  const built = CharacterProviders.build(CharacterPresets.get('preset-clerigo-anao-f'));
  built.character.identity.name = '<img src=x onerror=alert(1)>';
  let err = null, evil;
  try { evil = CharacterSheet.build({ character: built.character, derived: built.derived }, null); } catch (e) { err = e.message; }
  check('nome malicioso não usa innerHTML', err === null, err);
  eq('o nome aparece como texto puro', [byClass(evil, 'sheet-name')[0].textContent, byClass(evil, 'sheet-name')[0].children.length], ['<img src=x onerror=alert(1)>', 0]);
}

// --- Todos os 6 personagens, em todos os níveis de 1 a 5, geram uma ficha completa
{
  let ok = true, why = '';
  for (const p of CharacterPresets.all()) {
    for (let lvl = 1; lvl <= 5; lvl++) {
      const raw = clone(p); raw.identity.level = lvl;
      try {
        const s = sheetOf(raw);
        const need = ['Resumo', 'Atributos', 'Testes de resistência', 'Habilidades', 'Proficiências', 'Traços e características', 'Estatísticas de jogo'];
        if (!need.every(t => titles(s).includes(t)) || /NaN|undefined|null/.test(s.textContent)) { ok = false; why = p.id + ' nv ' + lvl; }
      } catch (e) { ok = false; why = p.id + ' nv ' + lvl + ': ' + e.message; }
    }
  }
  check('30 fichas (6 personagens × 5 níveis) completas, sem NaN nem undefined', ok, why);
}

console.log('\nTestes da ficha aprovados: ' + passed + ' | falhas: ' + failures.length);
if (failures.length) {
  console.log('\nFALHAS:');
  failures.forEach(f => console.log(' - ' + f));
  process.exit(1);
}
