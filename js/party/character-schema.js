/**
 * js/party/character-schema.js
 * Formato dos personagens (versão 1) e validação. Todo personagem que entra no jogo (predefinido ou, no futuro, NFT)
 * passa por CharacterSchema.validate: o resultado é um objeto NOVO, montado apenas com os campos conhecidos
 * (campos extras e chaves perigosas, como __proto__, são ignorados). Metadados externos são entrada não confiável.
 * Depende de ItemCatalog, EquipmentRules e CharacterRules.
 */
const CharacterSchema = (function () {
  const SCHEMA_VERSION = 1;
  const GENDERS = ['male', 'female'];
  const ABILITY_MIN = 3;
  const ABILITY_MAX = 18;       // pontuação base, antes dos bônus de raça (o teto final é 20)
  const ABILITY_SUM_MAX = 78;   // limite de "orçamento" dos atributos base (proposta, a calibrar)
  const INVENTORY_MAX = 20;
  const STAT_KEYS = ['kills', 'damageDealt', 'trapsDisarmed', 'secretDoorsFound', 'doorsOpened'];
  const NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M}' .\-]{0,23}$/u;
  const ID_PATTERN = /^[A-Za-z0-9:_.\-]{1,80}$/;

  function isPlainObject(v) {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
  }
  function has(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }
  function isInt(v) {
    return typeof v === 'number' && Number.isInteger(v);
  }

  // Retrato: caminho local em assets/, endereço https:// ou ipfs://. Nada de javascript:, data:, http:// nem "..".
  function validPortrait(p) {
    if (typeof p !== 'string' || p.length === 0 || p.length > 300) return false;
    if (p.includes('..') || p.includes('\\') || /[\u0000-\u001f\s<>"']/.test(p)) return false;
    if (/^assets\/[A-Za-z0-9_\-\/.]+\.(png|jpg|jpeg|webp|gif)$/.test(p)) return true;
    if (/^https:\/\/[A-Za-z0-9.\-]+(:\d{1,5})?(\/[A-Za-z0-9_\-.~%\/]*)?$/.test(p)) return true;
    if (/^ipfs:\/\/[A-Za-z0-9]{10,100}(\/[A-Za-z0-9_\-.]+)*$/.test(p)) return true;
    return false;
  }

  function validateSource(raw, errors) {
    if (!isPlainObject(raw)) { errors.push('source: obrigatório'); return null; }
    if (raw.type === 'preset') {
      return { type: 'preset', chainId: null, contract: null, tokenId: null, metadataUri: null };
    }
    if (raw.type === 'nft') {
      let ok = true;
      if (!isInt(raw.chainId) || raw.chainId < 1) { errors.push('source.chainId: inteiro positivo'); ok = false; }
      if (typeof raw.contract !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(raw.contract)) { errors.push('source.contract: endereço inválido'); ok = false; }
      if (typeof raw.tokenId !== 'string' || !/^[0-9]{1,78}$/.test(raw.tokenId)) { errors.push('source.tokenId: apenas dígitos'); ok = false; }
      if (!validPortrait(raw.metadataUri) || /^assets\//.test(raw.metadataUri)) { errors.push('source.metadataUri: https:// ou ipfs://'); ok = false; }
      return ok ? { type: 'nft', chainId: raw.chainId, contract: raw.contract, tokenId: raw.tokenId, metadataUri: raw.metadataUri } : null;
    }
    errors.push('source.type: "preset" ou "nft"');
    return null;
  }

  function validateIdentity(raw, errors) {
    if (!isPlainObject(raw)) { errors.push('identity: obrigatório'); return null; }
    const before = errors.length;
    let name = typeof raw.name === 'string' ? raw.name.normalize('NFC').trim() : '';
    if (!NAME_PATTERN.test(name)) errors.push('identity.name: 1 a 24 letras, espaços, apóstrofo, ponto ou hífen');
    const R = CharacterRules;
    if (typeof raw.race !== 'string' || !has(R.RACES, raw.race)) errors.push('identity.race: desconhecida');
    else if (typeof raw.subrace !== 'string' || !has(R.RACES[raw.race].subraces, raw.subrace)) errors.push('identity.subrace: incompatível com a raça');
    if (!GENDERS.includes(raw.gender)) errors.push('identity.gender: "male" ou "female"');
    if (typeof raw.class !== 'string' || !has(R.CLASSES, raw.class)) errors.push('identity.class: desconhecida');
    if (!isInt(raw.level) || raw.level < R.MIN_LEVEL || raw.level > R.MAX_LEVEL) errors.push('identity.level: inteiro de ' + R.MIN_LEVEL + ' a ' + R.MAX_LEVEL);
    if (!validPortrait(raw.portrait)) errors.push('identity.portrait: caminho em assets/, https:// ou ipfs://');
    if (errors.length > before) return null;
    return { name, race: raw.race, subrace: raw.subrace, gender: raw.gender, class: raw.class, level: raw.level, portrait: raw.portrait };
  }

  function validateBase(raw, identity, errors) {
    if (!isPlainObject(raw)) { errors.push('base: obrigatório'); return null; }
    const before = errors.length;
    const R = CharacterRules;
    const abilities = {};
    let sum = 0;
    if (!isPlainObject(raw.abilities)) errors.push('base.abilities: obrigatório');
    else {
      for (const a of R.ABILITY_IDS) {
        const v = raw.abilities[a];
        if (!isInt(v) || v < ABILITY_MIN || v > ABILITY_MAX) errors.push('base.abilities.' + a + ': inteiro de ' + ABILITY_MIN + ' a ' + ABILITY_MAX);
        else { abilities[a] = v; sum += v; }
      }
      if (errors.length === before && sum > ABILITY_SUM_MAX) errors.push('base.abilities: soma acima de ' + ABILITY_SUM_MAX);
    }
    let skills = null;
    if (identity) {
      const cls = R.CLASSES[identity.class];
      if (!Array.isArray(raw.skillProficiencies)) errors.push('base.skillProficiencies: lista obrigatória');
      else {
        const uniq = Array.from(new Set(raw.skillProficiencies));
        const allowed = cls.skillChoices.list;
        if (uniq.length !== raw.skillProficiencies.length) errors.push('base.skillProficiencies: repetidas');
        else if (uniq.some(s => typeof s !== 'string' || !allowed.includes(s))) errors.push('base.skillProficiencies: fora da lista da classe');
        else if (uniq.length !== cls.skillChoices.count) errors.push('base.skillProficiencies: a classe escolhe exatamente ' + cls.skillChoices.count);
        else skills = uniq;
      }
    }
    let expertise = [];
    const hasExpertise = Array.isArray(raw.expertise) ? raw.expertise.length > 0 : (raw.expertise !== undefined && raw.expertise !== null);
    if (hasExpertise) {
      if (!identity || identity.class !== 'rogue') errors.push('base.expertise: somente o ladino');
      else if (!Array.isArray(raw.expertise) || raw.expertise.length !== 2 || new Set(raw.expertise).size !== 2) errors.push('base.expertise: duas escolhas diferentes');
      else {
        const racial = R.RACES[identity.race].subraces[identity.subrace].skills;
        const pool = (skills || []).concat(racial, ['thieves_tools']);
        if (raw.expertise.some(e => typeof e !== 'string' || !pool.includes(e))) errors.push('base.expertise: só habilidades proficientes ou ferramentas de ladrão');
        else expertise = raw.expertise.slice();
      }
    } else if (identity && identity.class === 'rogue') {
      errors.push('base.expertise: o ladino precisa de duas escolhas');
    }
    if (errors.length > before) return null;
    return { abilities, skillProficiencies: skills, expertise };
  }

  function validateItemRef(entry, path, errors) {
    if (entry === null) return null;
    if (typeof entry !== 'string') { errors.push(path + ': somente o id do item (texto) é aceito nesta versão'); return undefined; }
    if (!ItemCatalog.has(entry)) { errors.push(path + ': item desconhecido'); return undefined; }
    return entry;
  }

  function validateProgress(raw, errors) {
    const progress = { hp: null, fp: null, hands: { right: null, left: null }, equipment: {}, inventory: [], stats: {} };
    for (const s of EquipmentRules.BODY_SLOTS) progress.equipment[s] = null;
    for (const k of STAT_KEYS) progress.stats[k] = 0;
    if (raw === undefined || raw === null) return progress;
    if (!isPlainObject(raw)) { errors.push('progress: deve ser um objeto'); return null; }
    const before = errors.length;
    for (const key of ['hp', 'fp']) {
      const v = raw[key];
      if (v === undefined || v === null) progress[key] = null;
      else if (!isInt(v) || v < 0 || v > 9999) errors.push('progress.' + key + ': inteiro de 0 a 9999 (ou nulo = máximo)');
      else progress[key] = v;
    }
    if (raw.hands !== undefined && raw.hands !== null) {
      if (!isPlainObject(raw.hands)) errors.push('progress.hands: objeto');
      else for (const h of EquipmentRules.HAND_SLOTS) {
        const ref = validateItemRef(raw.hands[h] === undefined ? null : raw.hands[h], 'progress.hands.' + h, errors);
        if (ref !== undefined) {
          if (ref !== null && !EquipmentRules.slotAccepts(ItemCatalog.get(ref), h)) errors.push('progress.hands.' + h + ': item não cabe na mão');
          else progress.hands[h] = ref;
        }
      }
    }
    if (raw.equipment !== undefined && raw.equipment !== null) {
      if (!isPlainObject(raw.equipment)) errors.push('progress.equipment: objeto');
      else for (const s of EquipmentRules.BODY_SLOTS) {
        const ref = validateItemRef(raw.equipment[s] === undefined ? null : raw.equipment[s], 'progress.equipment.' + s, errors);
        if (ref !== undefined) {
          if (ref !== null && !EquipmentRules.slotAccepts(ItemCatalog.get(ref), s)) errors.push('progress.equipment.' + s + ': item não cabe neste slot');
          else progress.equipment[s] = ref;
        }
      }
    }
    if (raw.inventory !== undefined && raw.inventory !== null) {
      if (!Array.isArray(raw.inventory) || raw.inventory.length > INVENTORY_MAX) errors.push('progress.inventory: lista de até ' + INVENTORY_MAX + ' itens');
      else raw.inventory.forEach((it, i) => {
        const ref = validateItemRef(it, 'progress.inventory[' + i + ']', errors);
        if (ref === null) errors.push('progress.inventory[' + i + ']: item vazio');
        else if (ref !== undefined) progress.inventory.push(ref);
      });
    }
    if (raw.stats !== undefined && raw.stats !== null) {
      if (!isPlainObject(raw.stats)) errors.push('progress.stats: objeto');
      else for (const k of STAT_KEYS) {
        const v = raw.stats[k];
        if (v === undefined || v === null) continue;
        if (!isInt(v) || v < 0 || v > 1e9) errors.push('progress.stats.' + k + ': inteiro de 0 a 1e9');
        else progress.stats[k] = v;
      }
    }
    return errors.length > before ? null : progress;
  }

  // Valida e normaliza. Devolve { ok, errors, value }.
  function validate(raw) {
    const errors = [];
    if (!isPlainObject(raw)) return { ok: false, errors: ['personagem: deve ser um objeto'], value: null };
    if (raw.schemaVersion !== SCHEMA_VERSION) errors.push('schemaVersion: deve ser ' + SCHEMA_VERSION);
    if (typeof raw.id !== 'string' || !ID_PATTERN.test(raw.id)) errors.push('id: 1 a 80 caracteres (letras, dígitos, : _ . -)');
    const source = validateSource(raw.source, errors);
    const identity = validateIdentity(raw.identity, errors);
    const base = validateBase(raw.base, identity, errors);
    const progress = validateProgress(raw.progress, errors);
    if (errors.length > 0) return { ok: false, errors, value: null };

    const value = { schemaVersion: SCHEMA_VERSION, id: raw.id, source, identity, base, progress };
    // Vida e Fadiga atuais: nulo = máximo; nunca acima do máximo calculado.
    const d = CharacterRules.derive(value);
    value.progress.hp = value.progress.hp === null ? d.maxHp : Math.min(value.progress.hp, d.maxHp);
    value.progress.fp = value.progress.fp === null ? d.maxFp : Math.min(value.progress.fp, d.maxFp);
    return { ok: true, errors: [], value };
  }

  return { SCHEMA_VERSION, INVENTORY_MAX, validate, validPortrait };
})();
