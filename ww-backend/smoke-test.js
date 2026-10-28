// Smoke test: จำลอง DB ด้วย fake pool แล้วยิง HTTP จริงเข้า Express
process.env.NODE_ENV = 'development';
process.env.JWT_SECRET = require('crypto').randomBytes(48).toString('hex');
process.env.DB_PASSWORD = 'x';
process.env.PORT = '3999';
const path = require('path'); const bcrypt = require('bcrypt');
const root = './src/';
const hash = bcrypt.hashSync('Correct-Horse-1', 10);

const users = {
  1: { id: 1, username: 'admin', password: hash, fullname: 'Admin', branch_id: 1, group_id: 1, branch_name: 'B1' },
  2: { id: 2, username: 'staff', password: hash, fullname: 'Staff', branch_id: 2, group_id: 2, branch_name: 'B2' },
};
const fakeDb = {
  query: async (sql, params = []) => {
    const q = sql.replace(/\s+/g, ' ');
    if (/FROM public.users u LEFT JOIN public.branches b ON u.branch_id = b.id WHERE u.username/.test(q)) return { rows: [Object.values(users).find(u => u.username === params[0])].filter(Boolean) };
    if (/WHERE u.id = \$1/.test(q)) return { rows: [users[params[0]]].filter(Boolean) };
    if (/SELECT group_id, branch_id FROM public.users/.test(q)) return { rows: [users[params[0]]].filter(Boolean) };
    if (/SELECT group_id FROM public.users/.test(q)) return { rows: [users[params[0]]].filter(Boolean) };
    if (/FROM public.group_permissions gp JOIN public.menus m/.test(q)) {
      // group 1: level 1 ; group 2: level 3 ; both can view
      return { rows: [{ can_view: true, can_add: params[0] === 1, can_edit: params[0] === 1, can_delete: false, access_level: params[0] === 1 ? 1 : 3 }] };
    }
    if (/MIN\(access_level\)/.test(q)) return { rows: [{ lvl: params[0] === 1 ? 1 : 3 }] };
    if (/SELECT \* FROM public.branches WHERE is_active = true ORDER BY id DESC/.test(q)) return { rows: [{ id: 1 }, { id: 2 }, { id: 3 }] };
    if (/SELECT \* FROM public.branches WHERE id = \$1/.test(q)) return { rows: [{ id: params[0] }] };
    if (/DISTINCT branch_id FROM master_wood_sizes/.test(q)) return { rows: [{ branch_id: 1 }] };
    return { rows: [] };
  },
  connect: (cb) => cb && cb(null, null, () => {}),
};
require.cache[require.resolve(root + 'config/db.js')] = { id: 'db', filename: 'db', loaded: true, exports: fakeDb };
// ReportModel จริงจะยิง DB → stub ให้คืน []
const rm = require(root + 'models/reportModel.js');
rm.getProductionCoverReport = async () => [{ ok: 1 }];
require(root + 'server.js');

const base = 'http://localhost:3999/api';
const H = { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' };
const ck = (r) => (r.headers.getSetCookie?.() || []).map(c => c.split(';')[0]).join('; ');
const results = [];
const t = (name, ok, extra='') => { results.push(ok); console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (extra ? '  → ' + extra : '')); };

(async () => {
  await new Promise(r => setTimeout(r, 800));
  // 1 wrong password
  let r = await fetch(base + '/auth/login', { method: 'POST', headers: H, body: JSON.stringify({ username: 'admin', password: 'bad' }) });
  t('login wrong password → 401', r.status === 401);
  const r2 = await fetch(base + '/auth/login', { method: 'POST', headers: H, body: JSON.stringify({ username: 'nobody', password: 'bad' }) });
  t('unknown user returns same message (no enumeration)', (await r2.json()).message === (await (await fetch(base + '/auth/login', { method: 'POST', headers: H, body: JSON.stringify({ username: 'admin', password: 'bad' }) })).json()).message);

  // 2 login ok
  r = await fetch(base + '/auth/login', { method: 'POST', headers: H, body: JSON.stringify({ username: 'admin', password: 'Correct-Horse-1' }) });
  const setCookie = r.headers.getSetCookie()[0]; const body = await r.json();
  t('login ok → 200', r.status === 200);
  t('token NOT in response body', body.token === undefined);
  t('cookie is HttpOnly', /HttpOnly/i.test(setCookie), setCookie.split(';').slice(1).join(';'));
  t('cookie SameSite=Strict', /SameSite=Strict/i.test(setCookie));
  const adminCookie = ck(r);

  // staff login
  r = await fetch(base + '/auth/login', { method: 'POST', headers: H, body: JSON.stringify({ username: 'staff', password: 'Correct-Horse-1' }) });
  const staffCookie = ck(r);

  // 3 /me
  r = await fetch(base + '/auth/me', { headers: { Cookie: adminCookie } });
  t('/auth/me with cookie → 200', r.status === 200);
  r = await fetch(base + '/auth/me');
  t('/auth/me without cookie → 401', r.status === 401);
  r = await fetch(base + '/auth/me', { headers: { Authorization: 'Bearer ' + adminCookie.split('=')[1] } });
  t('Bearer header no longer accepted → 401', r.status === 401);
  r = await fetch(base + '/auth/me', { headers: { Cookie: 'access_token=garbage' } });
  t('forged cookie → 401', r.status === 401);

  // 4 register is protected
  r = await fetch(base + '/auth/register', { method: 'POST', headers: H, body: JSON.stringify({ username: 'evil', password: 'Password-12345', group_id: 1 }) });
  t('register without login → 401', r.status === 401);
  r = await fetch(base + '/auth/register', { method: 'POST', headers: { ...H, Cookie: staffCookie }, body: JSON.stringify({ username: 'evil', password: 'Password-12345', group_id: 1 }) });
  t('register as non-admin → 403', r.status === 403);

  // 5 CSRF
  r = await fetch(base + '/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: adminCookie } });
  t('POST without X-Requested-With → 403 (CSRF)', r.status === 403);
  r = await fetch(base + '/auth/logout', { method: 'POST', headers: { ...H, Origin: 'https://evil.example', Cookie: adminCookie } });
  t('POST from foreign Origin → 403', r.status === 403);
  r = await fetch(base + '/auth/logout', { method: 'POST', headers: H });
  t('logout clears cookie', /access_token=;/.test(r.headers.getSetCookie()[0] || ''));

  // 6 branch scope
  r = await fetch(base + '/reports/production-cover?branch_id=2&start_date=2026-01-01&end_date=2026-01-02', { headers: { Cookie: staffCookie } });
  t('staff (level3, branch 2) → own branch 2 allowed', r.status === 200, 'status ' + r.status);
  r = await fetch(base + '/reports/production-cover?branch_id=1&start_date=2026-01-01&end_date=2026-01-02', { headers: { Cookie: staffCookie } });
  t('staff → other branch 1 blocked 403', r.status === 403);
  r = await fetch(base + '/reports/production-cover?start_date=2026-01-01&end_date=2026-01-02', { headers: { Cookie: staffCookie } });
  t('missing branch_id → 400', r.status === 400);
  r = await fetch(base + "/reports/production-cover?branch_id=2%20OR%201=1&start_date=a&end_date=b", { headers: { Cookie: staffCookie } });
  t('non-numeric branch_id → 400', r.status === 400);
  r = await fetch(base + '/reports/production-cover?branch_id=3&start_date=2026-01-01&end_date=2026-01-02', { headers: { Cookie: adminCookie } });
  t('admin (level1) any branch → 200', r.status === 200);
  r = await fetch(base + '/reports/production-cover?branch_id=1');
  t('report without login → 401', r.status === 401);
  r = await fetch(base + '/master/sync', { method: 'POST', headers: { ...H, Cookie: staffCookie }, body: JSON.stringify({ branch_id: 0 }) });
  t('staff sync all branches (0) → 403', r.status === 403);
  r = await fetch(base + '/dashboard/summary?branch_id=1', { headers: { Cookie: staffCookie } });
  t('dashboard other branch → 403', r.status === 403);
  r = await fetch(base + '/master/wood-prices/export?branch_id=1');
  t('wood-prices export without login → 401 (was open)', r.status === 401);

  // 7 headers
  r = await fetch(base + '/status');
  t('x-powered-by removed', !r.headers.get('x-powered-by'));
  t('helmet headers present', !!r.headers.get('x-content-type-options') && !!r.headers.get('content-security-policy'));

  // 8 rate limit login
  let last; for (let i = 0; i < 12; i++) last = await fetch(base + '/auth/login', { method: 'POST', headers: H, body: JSON.stringify({ username: 'admin', password: 'bad' + i }) });
  t('login brute-force limited → 429', last.status === 429);

  console.log(`\n${results.filter(Boolean).length}/${results.length} passed`);
  process.exit(results.every(Boolean) ? 0 : 1);
})();
