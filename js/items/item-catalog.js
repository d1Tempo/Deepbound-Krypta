/**
 * js/items/item-catalog.js
 * Catálogo de itens-base (dados puros), com números do SRD 5.1: armas, armaduras, escudo e poção de cura.
 * Os itens são identificados por um "id" estável (ex.: 'longsword'). Personagens e inventários guardam apenas o id.
 * Propriedades das armas: finesse (acuidade), light (leve), heavy (pesada), thrown (arremesso), versatile (versátil),
 * two_handed (duas mãos), ammunition (munição), loading (recarga).
 */
const ItemCatalog = (function () {
  const WEAPON_LIST = [
    { id: 'dagger',        name: 'Adaga',            category: 'simple',  kind: 'melee',  dice: '1d4',  damageType: 'piercing',    properties: ['finesse', 'light', 'thrown'],        range: [20, 60] },
    { id: 'dart',          name: 'Dardo',            category: 'simple',  kind: 'ranged', dice: '1d4',  damageType: 'piercing',    properties: ['finesse', 'thrown'],                 range: [20, 60] },
    { id: 'sling',         name: 'Funda',            category: 'simple',  kind: 'ranged', dice: '1d4',  damageType: 'bludgeoning', properties: ['ammunition'],                        range: [30, 120] },
    { id: 'quarterstaff',  name: 'Bordão',           category: 'simple',  kind: 'melee',  dice: '1d6',  damageType: 'bludgeoning', properties: ['versatile'], versatileDice: '1d8' },
    { id: 'mace',          name: 'Maça',             category: 'simple',  kind: 'melee',  dice: '1d6',  damageType: 'bludgeoning', properties: [] },
    { id: 'spear',         name: 'Lança',            category: 'simple',  kind: 'melee',  dice: '1d6',  damageType: 'piercing',    properties: ['thrown', 'versatile'], versatileDice: '1d8', range: [20, 60] },
    { id: 'handaxe',       name: 'Machadinha',       category: 'simple',  kind: 'melee',  dice: '1d6',  damageType: 'slashing',    properties: ['light', 'thrown'],                   range: [20, 60] },
    { id: 'light_hammer',  name: 'Martelo leve',     category: 'simple',  kind: 'melee',  dice: '1d4',  damageType: 'bludgeoning', properties: ['light', 'thrown'],                   range: [20, 60] },
    { id: 'light_crossbow', name: 'Besta leve',      category: 'simple',  kind: 'ranged', dice: '1d8',  damageType: 'piercing',    properties: ['ammunition', 'loading', 'two_handed'], range: [80, 320] },
    { id: 'shortbow',      name: 'Arco curto',       category: 'simple',  kind: 'ranged', dice: '1d6',  damageType: 'piercing',    properties: ['ammunition', 'two_handed'],          range: [80, 320] },
    { id: 'longsword',     name: 'Espada longa',     category: 'martial', kind: 'melee',  dice: '1d8',  damageType: 'slashing',    properties: ['versatile'], versatileDice: '1d10' },
    { id: 'greatsword',    name: 'Montante',         category: 'martial', kind: 'melee',  dice: '2d6',  damageType: 'slashing',    properties: ['heavy', 'two_handed'] },
    { id: 'rapier',        name: 'Rapieira',         category: 'martial', kind: 'melee',  dice: '1d8',  damageType: 'piercing',    properties: ['finesse'] },
    { id: 'shortsword',    name: 'Espada curta',     category: 'martial', kind: 'melee',  dice: '1d6',  damageType: 'piercing',    properties: ['finesse', 'light'] },
    { id: 'battleaxe',     name: 'Machado de batalha', category: 'martial', kind: 'melee', dice: '1d8', damageType: 'slashing',    properties: ['versatile'], versatileDice: '1d10' },
    { id: 'warhammer',     name: 'Martelo de guerra', category: 'martial', kind: 'melee', dice: '1d8',  damageType: 'bludgeoning', properties: ['versatile'], versatileDice: '1d10' },
    { id: 'longbow',       name: 'Arco longo',       category: 'martial', kind: 'ranged', dice: '1d8',  damageType: 'piercing',    properties: ['ammunition', 'heavy', 'two_handed'], range: [150, 600] },
    { id: 'hand_crossbow', name: 'Besta de mão',     category: 'martial', kind: 'ranged', dice: '1d6',  damageType: 'piercing',    properties: ['ammunition', 'light', 'loading'],    range: [30, 120] }
  ];

  // dexCap: null = soma toda a Destreza; número = limite do bônus de Destreza; 0 = não soma Destreza (armadura pesada).
  const ARMOR_LIST = [
    { id: 'padded',          name: 'Acolchoada',         armorType: 'light',  baseAc: 11, dexCap: null, strReq: 0,  stealthDisadvantage: true },
    { id: 'leather',         name: 'Couro',              armorType: 'light',  baseAc: 11, dexCap: null, strReq: 0,  stealthDisadvantage: false },
    { id: 'studded_leather', name: 'Couro batido',       armorType: 'light',  baseAc: 12, dexCap: null, strReq: 0,  stealthDisadvantage: false },
    { id: 'hide',            name: 'Peles',              armorType: 'medium', baseAc: 12, dexCap: 2,    strReq: 0,  stealthDisadvantage: false },
    { id: 'chain_shirt',     name: 'Camisão de malha',   armorType: 'medium', baseAc: 13, dexCap: 2,    strReq: 0,  stealthDisadvantage: false },
    { id: 'scale_mail',      name: 'Brunea',             armorType: 'medium', baseAc: 14, dexCap: 2,    strReq: 0,  stealthDisadvantage: true },
    { id: 'breastplate',     name: 'Peitoral',           armorType: 'medium', baseAc: 14, dexCap: 2,    strReq: 0,  stealthDisadvantage: false },
    { id: 'half_plate',      name: 'Meia-armadura',      armorType: 'medium', baseAc: 15, dexCap: 2,    strReq: 0,  stealthDisadvantage: true },
    { id: 'ring_mail',       name: 'Cota de anéis',      armorType: 'heavy',  baseAc: 14, dexCap: 0,    strReq: 0,  stealthDisadvantage: true },
    { id: 'chain_mail',      name: 'Cota de malha',      armorType: 'heavy',  baseAc: 16, dexCap: 0,    strReq: 13, stealthDisadvantage: true },
    { id: 'splint',          name: 'Cota de talas',      armorType: 'heavy',  baseAc: 17, dexCap: 0,    strReq: 15, stealthDisadvantage: true },
    { id: 'plate',           name: 'Armadura de placas', armorType: 'heavy',  baseAc: 18, dexCap: 0,    strReq: 15, stealthDisadvantage: true }
  ];

  const items = {};
  for (const w of WEAPON_LIST) {
    items[w.id] = Object.freeze(Object.assign({ type: 'weapon', slot: 'hand', twoHanded: w.properties.includes('two_handed') }, w));
  }
  for (const a of ARMOR_LIST) {
    items[a.id] = Object.freeze(Object.assign({ type: 'armor', slot: 'torso' }, a));
  }
  items.shield = Object.freeze({ id: 'shield', name: 'Escudo', type: 'shield', slot: 'hand', acBonus: 2 });
  items.potion_healing = Object.freeze({ id: 'potion_healing', name: 'Poção de Cura', type: 'potion', slot: 'hand', effect: Object.freeze({ kind: 'heal', dice: '2d4', bonus: 2 }) });
  Object.freeze(items);

  function has(id) {
    return typeof id === 'string' && Object.prototype.hasOwnProperty.call(items, id);
  }
  function get(id) {
    return has(id) ? items[id] : null;
  }
  function all() {
    return Object.values(items);
  }
  return { has, get, all };
})();
