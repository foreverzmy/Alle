const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const ts = require('typescript');
const { drizzle } = require('drizzle-orm/d1');

// Run the actual Drizzle queries against isolated SQLite, with a minimal D1 adapter.
function loadTS(file, overrides = {}) {
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', source)(
    name => Object.hasOwn(overrides, name) ? overrides[name] : require(name), module, module.exports,
  );
  return module.exports;
}

function fixture() {
  const sqlite = new DatabaseSync(':memory:');
  for (const file of fs.readdirSync(path.join(__dirname, '../migrations')).sort()) {
    sqlite.exec(fs.readFileSync(path.join(__dirname, '../migrations', file), 'utf8'));
  }
  const db = drizzle({
    prepare(query) {
      const stmt = sqlite.prepare(query);
      return {
        bind(...params) {
          assert.ok(params.length <= 100, 'D1 bound parameter limit');
          return {
            async run() { return { success: true, meta: { changes: Number(stmt.run(...params).changes) } }; },
            async all() { return { results: stmt.all(...params) }; },
            async raw() { stmt.setReturnArrays(true); return stmt.all(...params); },
          };
        },
      };
    },
  });
  const emailDB = loadTS('src/lib/db/email.ts', { './common': { getDb: () => db, getDbFromEnv: () => db } }).default;
  const insert = (id, deletedAt = null, emailType = 'none', sentAt = '2020-01-01T00:00:00.000Z') => {
    sqlite.prepare('INSERT INTO email(id, title, body_text, body_html, to_address, email_type, sent_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, `Mail ${id}`, 'Preserved text', '<p>Preserved HTML</p>', `mail${id}@example.com`, emailType, sentAt, deletedAt);
  };
  return { sqlite, emailDB, insert };
}

test('migration preserves existing mail and puts no mail in Trash', async () => {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(fs.readFileSync(path.join(__dirname, '../migrations/0001_init.sql'), 'utf8'));
  sqlite.exec("INSERT INTO email(id, title, body_text) VALUES (1, 'Existing mail', 'Keep me')");
  sqlite.exec(fs.readFileSync(path.join(__dirname, '../migrations/0002_add_read_status.sql'), 'utf8'));
  sqlite.exec(fs.readFileSync(path.join(__dirname, '../migrations/0003_add_trash.sql'), 'utf8'));
  assert.deepEqual({ ...sqlite.prepare('SELECT title, body_text, deleted_at FROM email').get() }, {
    title: 'Existing mail', body_text: 'Keep me', deleted_at: null,
  });
  sqlite.close();
});

test('move, duplicate move, filtering, pagination and restoration preserve content', async () => {
  const { sqlite, emailDB, insert } = fixture();
  insert(1); insert(2); insert(3);
  await emailDB.delete([1, 2]);
  const firstDeletedAt = sqlite.prepare('SELECT deleted_at FROM email WHERE id=1').get().deleted_at;
  await new Promise(resolve => setTimeout(resolve, 5));
  await emailDB.delete([1]);
  assert.equal(sqlite.prepare('SELECT deleted_at FROM email WHERE id=1').get().deleted_at, firstDeletedAt);
  assert.deepEqual((await emailDB.list()).map(e => e.id), [3]);
  assert.equal(await emailDB.count(), 1);
  assert.equal(await emailDB.count({ folder: 'trash' }), 2);
  assert.equal((await emailDB.list({ folder: 'trash', limit: 1, offset: 1 })).length, 1);
  assert.equal(await emailDB.count({ folder: 'trash', recipient: 'mail1@example.com', readStatus: 0 }), 1);
  assert.deepEqual(await emailDB.getAllRecipients(), ['mail3@example.com']);
  await emailDB.restore([1]);
  assert.equal(await emailDB.count(), 2);
  assert.equal(await emailDB.count({ folder: 'trash' }), 1);
  const restored = (await emailDB.list()).find(e => e.id === 1);
  const body = await emailDB.getBody(restored.id);
  assert.equal(body.bodyText, 'Preserved text');
  assert.equal(body.bodyHtml, '<p>Preserved HTML</p>');
  assert.equal(restored.deletedAt, null);
  sqlite.close();
});

test('large bodies stay out of paginated lists but remain available individually in either folder', async () => {
  const { sqlite, emailDB, insert } = fixture();
  insert(1); insert(2, '2026-10-08T00:00:00.000Z');
  const largeHtml = '<p>' + 'x'.repeat(3_000_000) + '</p>';
  sqlite.prepare('UPDATE email SET body_html=? WHERE id=1').run(largeHtml);
  const inbox = await emailDB.list();
  assert.equal(inbox[0].bodyHtml, null);
  assert.equal(inbox[0].bodyText, null);
  assert.ok(JSON.stringify(inbox).length < 2000);
  assert.equal((await emailDB.getBody(1)).bodyHtml, largeHtml);
  assert.equal((await emailDB.list({ folder: 'trash' }))[0].bodyHtml, null);
  assert.equal((await emailDB.getBody(2)).bodyText, 'Preserved text');
  assert.equal(await emailDB.getBody(999), null);
  sqlite.close();
});

test('body API validates IDs, returns 404 and remains read only', async () => {
  const calls = [];
  const body = { bodyText: 'Text', bodyHtml: '<p>HTML</p>' };
  const handler = loadTS('src/pages/api/email/body.ts', {
    '@/lib/auth/auth': h => h,
    '@/lib/db/email': { getBody: async id => { calls.push(id); return id === 1 ? body : null; } },
    '@/types': loadTS('src/types/api.ts'),
  }).default;
  async function request(method, id) {
    const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(code) { this.code = code; return this; }, json(data) { this.data = data; } };
    await handler({ method, query: { id } }, res);
    return res;
  }
  assert.equal((await request('POST', '1')).code, 405);
  for (const id of [undefined, ['1'], '0', '-1', '1.5', 'NaN', '9007199254740992']) {
    assert.equal((await request('GET', id)).code, 400);
  }
  assert.deepEqual(calls, []);
  assert.equal((await request('GET', '999')).code, 404);
  const result = await request('GET', '1');
  assert.equal(result.code, 200);
  assert.deepEqual(result.data.data, body);
  assert.equal(result.headers['Cache-Control'], 'private, no-store');
});

test('body API blocks anonymous requests before reading content', async () => {
  const withAuth = loadTS('src/lib/auth/auth.ts', {
    '@/types': loadTS('src/types/api.ts'),
    '@opennextjs/cloudflare': { getCloudflareContext: () => ({ env: {} }) },
  }).default;
  const handler = loadTS('src/pages/api/email/body.ts', {
    '@/lib/auth/auth': withAuth,
    '@/lib/db/email': { getBody: async () => assert.fail('anonymous body read') },
    '@/types': loadTS('src/types/api.ts'),
  }).default;
  const res = { status(code) { this.code = code; return this; }, json(data) { this.data = data; } };
  await handler({ method: 'GET', query: { id: '1' }, headers: {} }, res);
  assert.equal(res.code, 401);
});

test('purge removes only Trash older than 7 days, never inbox or restored messages', async () => {
  const { sqlite, emailDB, insert } = fixture();
  const cutoff = '2026-10-01T12:00:00.000Z';
  insert(1); // old sent date must not cause an inbox purge
  insert(2, '2026-10-01T11:59:59.999Z');
  insert(3, cutoff);
  insert(4, '2026-10-01T12:00:00.001Z');
  insert(5, '2026-09-01T00:00:00.000Z');
  await emailDB.restore([5]);
  assert.equal(await emailDB.purgeExpiredTrash({}, cutoff), 1);
  assert.deepEqual(sqlite.prepare('SELECT id FROM email ORDER BY id').all().map(e => e.id), [1, 3, 4, 5]);
  assert.equal(await emailDB.purgeExpiredTrash({}, cutoff), 0);
  sqlite.close();
});

test('automatic inbox cleanup moves matching old mail to Trash without refreshing existing Trash', async () => {
  const { sqlite, emailDB, insert } = fixture();
  insert(1, null, 'auth_code');
  insert(2, null, 'none');
  insert(3, '2026-10-01T00:00:00.000Z', 'auth_code');
  insert(4, null, 'auth_code', '2026-10-08T14:00:00.000Z');
  const now = '2026-10-08T12:00:00.000Z';
  assert.equal(await emailDB.trashExpiredByType({}, ['auth_code'], now, now), 1);
  assert.equal(sqlite.prepare('SELECT deleted_at FROM email WHERE id=1').get().deleted_at, now);
  assert.equal(sqlite.prepare('SELECT deleted_at FROM email WHERE id=3').get().deleted_at, '2026-10-01T00:00:00.000Z');
  assert.equal(await emailDB.count(), 2);
  assert.equal(await emailDB.trashExpiredByType({}, [], now, now), 0);
  sqlite.close();
});

test('hourly purge runs when auto-clean is disabled, and custom inbox cron retains its cadence', async () => {
  const calls = [];
  const handler = loadTS('src/lib/scheduled/handler.ts', {
    '@/lib/db/email': {
      purgeExpiredTrash: async (...args) => { calls.push(['purge', ...args]); return 0; },
      trashExpiredByType: async (...args) => { calls.push(['trash', ...args]); return 0; },
    },
  }).default;
  const now = Date.parse('2026-10-08T12:00:00.000Z');
  const env = { ENABLE_AUTO_DEL: 'false', AUTO_DEL_CRON: '0 0 * * *', AUTO_DEL_TYPE: 'auth_code', AUTO_DEL_TIME: '3600' };
  await handler({ scheduledTime: now, cron: '0 * * * *' }, env);
  assert.deepEqual(calls.map(c => c[0]), ['purge']);
  assert.equal(calls[0][2], '2026-10-01T12:00:00.000Z');
  env.ENABLE_AUTO_DEL = 'true';
  await handler({ scheduledTime: now, cron: '0 * * * *' }, env);
  assert.deepEqual(calls.map(c => c[0]), ['purge', 'purge']);
  await handler({ scheduledTime: now, cron: '0 0 * * *' }, env);
  assert.equal(calls.at(-1)[0], 'trash');
  assert.equal(calls.at(-1)[3], '2026-10-08T11:00:00.000Z');
  env.AUTO_DEL_TIME = '-1';
  calls.length = 0;
  await handler({ scheduledTime: now, cron: '0 0 * * *' }, env);
  assert.deepEqual(calls.map(c => c[0]), ['purge']);
});

test('restore API validates method and bounded positive integer batches', async () => {
  const restored = [];
  const handler = loadTS('src/pages/api/email/restore.ts', {
    '@/lib/auth/auth': h => h,
    '@/lib/db/email': { restore: async ids => restored.push(ids) },
    '@/types': loadTS('src/types/api.ts'),
  }).default;
  async function request(method, body) {
    const res = { status(code) { this.code = code; return this; }, json(data) { this.data = data; } };
    await handler({ method, body }, res);
    return res;
  }
  assert.equal((await request('GET', [1])).code, 405);
  for (const body of [[], [0], ['1'], [-1], [1.5], new Array(100).fill(1), null]) {
    assert.equal((await request('POST', body)).code, 400);
  }
  assert.equal(restored.length, 0);
  assert.equal((await request('POST', [1, 2])).code, 200);
  assert.deepEqual(restored, [[1, 2]]);
});


test('99-message batches stay within D1 parameter limits for trash and restore', async () => {
  const { sqlite, emailDB, insert } = fixture();
  const ids = Array.from({ length: 99 }, (_, index) => index + 1);
  ids.forEach(id => insert(id));
  await emailDB.delete(ids);
  assert.equal(await emailDB.count({ folder: 'trash' }), 99);
  await emailDB.restore(ids);
  assert.equal(await emailDB.count(), 99);
  sqlite.close();
});

test('restore API retains authentication and blocks anonymous requests', async () => {
  const withAuth = loadTS('src/lib/auth/auth.ts', {
    '@/types': loadTS('src/types/api.ts'),
    '@opennextjs/cloudflare': { getCloudflareContext: () => ({ env: {} }) },
  }).default;
  const handler = loadTS('src/pages/api/email/restore.ts', {
    '@/lib/auth/auth': withAuth,
    '@/lib/db/email': { restore: async () => assert.fail('anonymous mutation') },
    '@/types': loadTS('src/types/api.ts'),
  }).default;
  const res = { status(code) { this.code = code; return this; }, json(data) { this.data = data; } };
  await handler({ method: 'POST', body: [1], headers: {} }, res);
  assert.equal(res.code, 401);
});

test('config generation preserves hourly retention alongside custom inbox cleanup', () => {
  const os = require('node:os');
  const { execFileSync } = require('node:child_process');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'alle-config-test-'));
  try {
    fs.mkdirSync(path.join(root, 'scripts'));
    fs.copyFileSync(path.join(__dirname, '../scripts/gen-config.js'), path.join(root, 'scripts/gen-config.js'));
    fs.copyFileSync(path.join(__dirname, '../wrangler.jsonc'), path.join(root, 'wrangler.jsonc'));
    execFileSync(process.execPath, [path.join(root, 'scripts/gen-config.js')], {
      env: { AUTO_DEL_CRON: '15 3 * * *' },
    });
    const config = JSON.parse(fs.readFileSync(path.join(root, 'wrangler.jsonc'), 'utf8'));
    assert.deepEqual(config.triggers.crons, ['0 * * * *', '15 3 * * *']);
    assert.equal(config.vars.AUTO_DEL_CRON, '15 3 * * *');
    assert.ok(!fs.existsSync(path.join(root, '.env.local')));
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
