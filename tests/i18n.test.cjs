const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const ts = require('typescript');

function loadStore() {
  const file = path.join(__dirname, '../src/lib/store/i18n.ts');
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', source)(createRequire(file), module, module.exports);
  return module.exports.default;
}

test('empty-state translations are available on first render without locale requests', async () => {
  const originalFetch = global.fetch;
  let requests = 0;
  global.fetch = async () => { requests++; throw new Error('Offline or stale locale cache'); };
  try {
    const store = loadStore();
    const initial = store.getState();
    assert.equal(initial.isLoading, false);
    const keys = ['readingPane', 'readerEmptyTitle', 'readerEmptyDesc', 'inboxEmptyDesc', 'noResultsTitle', 'unreadEmptyDesc', 'clearSearch', 'close'];
    for (const locale of ['zh', 'en']) {
      for (const key of keys) {
        assert.ok(initial.translations[locale][key]);
        assert.notEqual(initial.translations[locale][key], key);
      }
      await store.getState().loadTranslations(locale);
    }
    assert.equal(requests, 0);
  } finally {
    global.fetch = originalFetch;
  }
});

test('switching to English and back to cached Chinese updates the current dictionary', async () => {
  const store = loadStore();
  await store.getState().loadTranslations('en');
  assert.equal(store.getState().getCurrentTranslations().readingPane, 'Message');
  await store.getState().loadTranslations('zh');
  assert.equal(store.getState().getCurrentTranslations().readingPane, '邮件详情');
  await store.getState().loadTranslations('unsupported');
  assert.equal(store.getState().currentLocale, 'zh');
});

test('both bundled dictionaries cover the same keys and static UI translations', () => {
  const { translations } = loadStore().getState();
  assert.deepEqual(Object.keys(translations.zh).sort(), Object.keys(translations.en).sort());
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) { visit(file); continue; }
      if (!/\.tsx?$/.test(file)) continue;
      const source = fs.readFileSync(file, 'utf8');
      if (!source.includes('useTranslation')) continue;
      for (const match of source.matchAll(/\bt\(\s*['"]([^'"]+)['"]/g)) {
        for (const locale of ['zh', 'en']) {
          assert.ok(translations[locale][match[1]], `${file}: missing ${locale}.${match[1]}`);
        }
      }
    }
  }
  visit(path.join(__dirname, '../src'));
});
