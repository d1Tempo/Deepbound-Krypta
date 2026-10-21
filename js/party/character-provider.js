/**
 * js/party/character-provider.js
 * Provedores de personagens. O jogo pede personagens a um "provedor" assíncrono e recebe sempre o mesmo resultado:
 * { ok, errors, character, derived }. Hoje existe o PresetProvider (os 6 personagens fixos).
 * No futuro, o NftProvider lerá o token, buscará os metadados e montará o mesmo objeto, que passa pela mesma validação.
 * Depende de CharacterSchema, CharacterRules e CharacterPresets.
 */
const CharacterProviders = (function () {
  // Valida os dados brutos e calcula tudo o que é derivado.
  function build(raw) {
    const r = CharacterSchema.validate(raw);
    if (!r.ok) return { ok: false, errors: r.errors, character: null, derived: null };
    return { ok: true, errors: [], character: r.value, derived: CharacterRules.derive(r.value) };
  }

  const preset = {
    id: 'preset',
    async list() {
      return CharacterPresets.all().map(p => p.id);
    },
    async load(id) {
      const raw = CharacterPresets.get(id);
      if (!raw) throw new Error('Personagem predefinido inexistente: ' + id);
      const result = build(raw);
      if (!result.ok) throw new Error('Personagem predefinido inválido (' + id + '): ' + result.errors.join('; '));
      return result;
    },
    async loadAll() {
      const ids = await preset.list();
      return Promise.all(ids.map(id => preset.load(id)));
    }
  };

  const nft = {
    id: 'nft',
    async load() {
      throw new Error('NftProvider ainda não foi implementado (etapa futura).');
    }
  };

  return { build, preset, nft };
})();
