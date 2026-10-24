/**
 * js/items/equipment-rules.js
 * Regras de equipamento: slots do corpo, Classe de Armadura por peças, proficiência de armas e armaduras e ataque com armas.
 * Funções puras (sem tela). Depende de ItemCatalog.
 */
const EquipmentRules = (function () {
  // Slots da silhueta (proposta inicial) e as duas mãos que seguram itens.
  const BODY_SLOTS = ['head', 'neck', 'torso', 'arms', 'hands', 'legs', 'feet', 'ringLeft', 'ringRight'];
  const HAND_SLOTS = ['right', 'left'];
  // Teto de Classe de Armadura (proposta, a calibrar): preserva o equilíbrio do SRD.
  const AC_CAP = 22;

  function itemOf(entry) {
    return ItemCatalog.resolve(entry);
  }

  // O item cabe no slot? (mãos aceitam arma, escudo e poção; o tronco aceita armadura; as demais peças usam o slot do item)
  function slotAccepts(item, slotId) {
    if (!item) return false;
    if (HAND_SLOTS.includes(slotId)) return item.type === 'weapon' || item.type === 'shield' || item.type === 'potion';
    if (slotId === 'torso') return item.type === 'armor';
    if (slotId === 'ringLeft' || slotId === 'ringRight') return item.slot === 'ring';
    return BODY_SLOTS.includes(slotId) && item.slot === slotId;
  }

  // Classe de Armadura: o tronco define a base (tabela do SRD); o escudo soma +2; peças complementares somam seu acBonus.
  function armorClass(opts) {
    const dexMod = opts.dexMod;
    const equipment = opts.equipment || {};
    const hands = opts.hands || {};
    const torso = itemOf(equipment.torso);
    let ac;
    if (torso && torso.type === 'armor') {
      let dexPart;
      if (torso.dexCap === null) dexPart = dexMod;
      else if (torso.dexCap === 0) dexPart = 0;
      else dexPart = Math.min(dexMod, torso.dexCap);
      ac = torso.baseAc + dexPart;
    } else {
      ac = 10 + dexMod;
    }
    const heldShield = [hands.right, hands.left].map(itemOf).some(it => it && it.type === 'shield');
    if (heldShield) ac += 2;
    for (const slot of BODY_SLOTS) {
      if (slot === 'torso') continue;
      const it = itemOf(equipment[slot]);
      if (it && typeof it.acBonus === 'number' && it.acBonus > 0) ac += it.acBonus;
    }
    return Math.min(ac, AC_CAP);
  }

  // Armadura e escudo sem proficiência impõem penalidades (as do SRD: desvantagem em testes de FOR e DES e nos ataques; sem magias).
  function armorPenalty(armorProficiencies, equipment, hands, strScore) {
    const torso = itemOf((equipment || {}).torso);
    const shield = [(hands || {}).right, (hands || {}).left].map(itemOf).find(it => it && it.type === 'shield');
    const notProficient = [];
    if (torso && torso.type === 'armor' && !armorProficiencies.includes(torso.armorType)) notProficient.push(torso.id);
    if (shield && !armorProficiencies.includes('shield')) notProficient.push(shield.id);
    const slowed = Boolean(torso && torso.type === 'armor' && torso.strReq > 0 && strScore < torso.strReq);
    return {
      notProficient,
      penalized: notProficient.length > 0,
      stealthDisadvantage: Boolean(torso && torso.stealthDisadvantage),
      speedPenalty: slowed ? 10 : 0
    };
  }

  function isWeaponProficient(weaponProficiencies, weapon) {
    if (!weapon || weapon.type !== 'weapon') return false;
    return weaponProficiencies.categories.includes(weapon.category) || weaponProficiencies.specific.includes(weapon.id);
  }

  // Ataque com uma arma: acuidade usa o melhor entre FOR e DES; arma à distância usa DES; corpo a corpo usa FOR.
  function weaponAttack(weapon, mods, proficiencyBonus, proficient) {
    let ability;
    if (weapon.properties.includes('finesse')) ability = mods.dex > mods.str ? 'dex' : 'str';
    else ability = weapon.kind === 'ranged' ? 'dex' : 'str';
    const abilityMod = mods[ability];
    return {
      ability,
      attackBonus: abilityMod + (proficient ? proficiencyBonus : 0),
      damageDice: weapon.dice,
      damageBonus: abilityMod,
      proficient
    };
  }

  return { BODY_SLOTS, HAND_SLOTS, AC_CAP, slotAccepts, armorClass, armorPenalty, isWeaponProficient, weaponAttack };
})();
