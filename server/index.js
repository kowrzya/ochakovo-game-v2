import './env.js'; // читает .env (пароль HR и т. п.) до всего остального
import express from 'express';
import crypto from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from './db.js';
import { validateApplication, DIRECTIONS, LABELS, SOURCES } from './validate.js';

const CONTENT = JSON.parse(readFileSync(new URL('../client/src/data/scenes.json', import.meta.url), 'utf8'));
// Шаги игры по порядку (ситуации и вопросы квиза) — для воронки в HR-панели.
const TOUR = JSON.parse(readFileSync(new URL('../client/src/data/tour.json', import.meta.url), 'utf8')).drinks;
const TOUR_STEPS = Array.from({ length: Math.max(...Object.values(TOUR).map((d) => d.stages.length)) }, (_, i) => ({
  id: `tour${i + 1}`,
  label: `Экскурсия: ${[...new Set(Object.values(TOUR).map((d) => d.stages[i]?.title).filter(Boolean))].join(' / ')}`,
}));
const LAST_QUIZ = CONTENT.quiz[CONTENT.quiz.length - 1]?.id;
const PORT = Number(process.env.PORT) || 3001; // v2: 3001, старая версия — 3000
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ochakovo-demo';
const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
if (!process.env.ADMIN_PASSWORD) console.warn('⚠ ADMIN_PASSWORD не задан в .env — используется демо-пароль "ochakovo-demo"');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '20kb' }));

// ---------- служебное ----------
app.get('/api/health', (_req, res) => {
  const apps = db.prepare('SELECT COUNT(*) AS n FROM applications').get().n;
  res.json({ ok: true, applications: apps, time: new Date().toISOString() });
});

// ---------- игра: события для воронки ----------
const EVENT_TYPES = new Set(['open', 'start', 'scene', 'finish', 'apply']);
const insertEvent = db.prepare(
  'INSERT INTO events (session_id, type, scene, direction, source) VALUES (?, ?, ?, ?, ?)',
);
app.post('/api/events', (req, res) => {
  const { sessionId, type, scene, direction, source } = req.body || {};
  if (typeof sessionId !== 'string' || !sessionId || sessionId.length > 64 || !EVENT_TYPES.has(type))
    return res.status(400).json({ error: 'bad event' });
  insertEvent.run(
    sessionId,
    type,
    typeof scene === 'string' ? scene.slice(0, 40) : null,
    DIRECTIONS.has(direction) ? direction : null,
    SOURCES.has(source) ? source : null,
  );
  res.status(204).end();
});

// ---------- игра: заявка ----------
const hits = new Map(); // простейший лимит: 10 заявок в 10 минут с одного IP
function rateLimited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < 10 * 60_000);
  list.push(now);
  hits.set(ip, list);
  return list.length > 10;
}
const insertApp = db.prepare(`
  INSERT INTO applications
    (session_id, full_name, phone, email, birth_date, vacancy, readiness, education, course, direction, scores, consent_at,
     is_student, education_level, experience, experience_text, quiz_score, source)
  VALUES
    (@session_id, @full_name, @phone, @email, @birth_date, @vacancy, @readiness, @education, @course, @direction, @scores, datetime('now'),
     @is_student, @education_level, @experience, @experience_text, @quiz_score, @source)
`);
app.post('/api/applications', (req, res) => {
  if (rateLimited(req.ip)) return res.status(429).json({ error: 'Слишком много заявок, попробуйте позже' });
  const { data, errors } = validateApplication(req.body);
  if (errors) return res.status(422).json({ errors });
  const { lastInsertRowid } = insertApp.run(data);
  if (data.session_id) insertEvent.run(data.session_id, 'apply', null, data.direction, data.source);
  res.status(201).json({ id: Number(lastInsertRowid) });
});

// ---------- HR: авторизация ----------
const sign = (payload) => crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
function makeToken() {
  const exp = String(Date.now() + 12 * 3600_000);
  return `${exp}.${sign(exp)}`;
}
function requireHr(req, res, next) {
  const token = (req.get('authorization') || '').replace(/^Bearer /, '') || String(req.query.token || '');
  const [exp, sig] = token.split('.');
  const ok =
    exp && sig && Number(exp) > Date.now() &&
    sig.length === sign(exp).length &&
    crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(sign(exp)));
  if (!ok) return res.status(401).json({ error: 'unauthorized' });
  next();
}
app.post('/api/admin/login', (req, res) => {
  const pass = String(req.body?.password || '');
  const a = crypto.createHash('sha256').update(pass).digest();
  const b = crypto.createHash('sha256').update(ADMIN_PASSWORD).digest();
  if (!crypto.timingSafeEqual(a, b)) return res.status(401).json({ error: 'Неверный пароль' });
  res.json({ token: makeToken() });
});

// ---------- HR: данные ----------
const demoFilter = (req) => (req.query.demo === '0' ? 'AND is_demo = 0' : '');

app.get('/api/admin/stats', requireHr, (req, res) => {
  const f = demoFilter(req);
  const distinct = (where) =>
    db.prepare(`SELECT COUNT(DISTINCT session_id) AS n FROM events WHERE ${where} ${f}`).get().n;
  const sceneRows = db
    .prepare(`SELECT scene, COUNT(DISTINCT session_id) AS n FROM events WHERE type='scene' ${f} GROUP BY scene`)
    .all();
  const scene = (id) => sceneRows.find((r) => r.scene === id)?.n || 0;
  const funnel = [
    { step: 'Открыли сайт', n: distinct("type='open'") },
    { step: 'Начали игру', n: distinct("type='start'") },
    // этапы экскурсии по порядку: видно, где люди бросают
    ...TOUR_STEPS.map((st, i) => ({ step: `${i + 1}. ${st.label}`, n: scene(st.id) })),
    { step: 'Прошли экскурсию', n: distinct("type='finish'") },
    { step: 'Открыли вакансию', n: scene('vacancy') },
    { step: 'Оставили заявку', n: db.prepare(`SELECT COUNT(*) AS n FROM applications WHERE 1=1 ${f}`).get().n },
  ];
  // дополнительные действия вне основного пути
  const extra = [
    { step: 'Сразу пошли к вакансиям со старта', n: scene('jobs_direct') },
    { step: 'Пропустили часть экскурсии', n: scene('jobs_skip') },
    { step: 'Попробовали профессию в карточке', n: scene('trial') },
    { step: 'Прошли бонус-квиз', n: scene(LAST_QUIZ) },
  ];
  const directions = db
    .prepare(
      `SELECT direction, COUNT(DISTINCT session_id) AS n FROM events
       WHERE type='scene' AND scene='vacancy' AND direction IS NOT NULL ${f} GROUP BY direction ORDER BY n DESC`,
    )
    .all()
    .map((r) => ({ ...r, title: LABELS.direction[r.direction] || r.direction }));
  // Откуда приходят: визиты по меткам ссылок (?from=) и заявки по ответу «Откуда узнали»
  const visits = db.prepare(`SELECT COALESCE(source, 'direct') AS source, COUNT(DISTINCT session_id) AS n FROM events WHERE type='open' ${f} GROUP BY 1`).all();
  const apps = db.prepare(`SELECT source, COUNT(*) AS n FROM applications WHERE source IS NOT NULL ${f} GROUP BY 1`).all();
  const sources = [...Object.keys(LABELS.source), 'direct'].map((k) => ({
    source: k,
    title: k === 'direct' ? 'Без метки (прямой заход)' : LABELS.source[k],
    visits: visits.find((v) => v.source === k)?.n || 0,
    applications: apps.find((a) => a.source === k)?.n || 0,
  })).filter((s) => s.visits || s.applications);
  res.json({ funnel, extra, directions, sources });
});

app.get('/api/admin/applications', requireHr, (req, res) => {
  const rows = db
    .prepare(`SELECT * FROM applications WHERE 1=1 ${demoFilter(req)} ORDER BY created_at DESC, id DESC LIMIT 1000`)
    .all();
  res.json({ rows, labels: LABELS });
});

const STATUSES = new Set(['new', 'contacted', 'invited', 'rejected']);
app.patch('/api/admin/applications/:id', requireHr, (req, res) => {
  const { status } = req.body || {};
  if (!STATUSES.has(status)) return res.status(400).json({ error: 'bad status' });
  db.prepare('UPDATE applications SET status = ? WHERE id = ?').run(status, Number(req.params.id));
  res.status(204).end();
});

app.get('/api/admin/export.csv', requireHr, (req, res) => {
  const rows = db.prepare(`SELECT * FROM applications WHERE 1=1 ${demoFilter(req)} ORDER BY id`).all();
  const cols = [
    ['id', 'ID'], ['created_at', 'Дата'], ['full_name', 'ФИО'], ['phone', 'Телефон'], ['email', 'E-mail'],
    ['birth_date', 'Дата рождения'], ['vacancy', 'Вакансия'], ['readiness', 'Готовность'],
    ['is_student', 'Студент'], ['education', 'Учебное заведение'], ['course', 'Курс'],
    ['education_level', 'Уровень образования'], ['experience', 'Опыт'], ['experience_text', 'Где работал(а)'], ['quiz_score', 'Квиз о компании'], ['source', 'Откуда узнал(а)'],
    ['direction', 'Направление по игре'],
    ['status', 'Статус'], ['is_demo', 'Демо'],
  ];
  const extra = { status: { new: 'Новая', contacted: 'Связались', invited: 'Приглашён', rejected: 'Отказ' }, is_demo: { 0: 'нет', 1: 'да' }, is_student: { 0: 'нет', 1: 'да' } };
  const label = (k, v) => (LABELS[k] && LABELS[k][v]) || (extra[k] && extra[k][v]) || v;
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [cols.map((c) => esc(c[1])).join(';')];
  for (const r of rows) lines.push(cols.map(([k]) => esc(label(k, r[k]))).join(';'));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="ochakovo-applications.csv"');
  res.send('﻿' + lines.join('\r\n')); // BOM — чтобы Excel открыл кириллицу
});

// ---------- фронт (собранный Vite) ----------
const dist = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
if (existsSync(dist)) {
  app.use(express.static(dist, { maxAge: '1h', index: false }));
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(resolve(dist, 'index.html')));
}
app.use('/api', (_req, res) => res.status(404).json({ error: 'not found' }));

app.listen(PORT, () => console.log(`✓ Сервер: http://localhost:${PORT}  (HR-панель: /admin)`));
