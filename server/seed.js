// Демо-данные для показа HR-панели. Все записи помечены is_demo = 1.
// npm run seed        — добавить демо-данные
// npm run seed:reset  — удалить старые демо-данные и создать заново
import crypto from 'node:crypto';
import { db } from './db.js';

if (process.argv.includes('--reset')) {
  db.prepare('DELETE FROM applications WHERE is_demo = 1').run();
  db.prepare('DELETE FROM events WHERE is_demo = 1').run();
}

const dirs = ['lab', 'bottling', 'process', 'warehouse', 'engineering'];
const dirWeights = [0.27, 0.22, 0.18, 0.13, 0.2];
const pick = (arr, w) => {
  if (!w) return arr[Math.floor(Math.random() * arr.length)];
  let r = Math.random();
  for (let i = 0; i < arr.length; i++) if ((r -= w[i]) <= 0) return arr[i];
  return arr[arr.length - 1];
};
const daysAgo = (d) => {
  const t = new Date(Date.now() - d * 86400_000 - Math.random() * 86400_000);
  return t.toISOString().replace('T', ' ').slice(0, 19);
};

const ev = db.prepare(
  'INSERT INTO events (created_at, session_id, type, scene, direction, is_demo) VALUES (?, ?, ?, ?, ?, 1)',
);
const ap = db.prepare(`INSERT INTO applications
  (created_at, session_id, full_name, phone, email, birth_date, vacancy, readiness, education, course, direction, scores, consent_at, status, is_demo,
   is_student, education_level, experience, experience_text, quiz_score, source)
  VALUES (@created_at, @session_id, @full_name, @phone, @email, @birth_date, @vacancy, @readiness, @education, @course, @direction, @scores, @created_at, @status, 1,
   @is_student, @education_level, @experience, @experience_text, @quiz_score, @source)`);

const names = ['Иванов Алексей', 'Смирнова Анна', 'Кузнецов Дмитрий', 'Попова Мария', 'Васильев Илья',
  'Петрова Екатерина', 'Соколов Никита', 'Михайлова Дарья', 'Новиков Артём', 'Фёдорова Полина',
  'Морозов Кирилл', 'Волкова Алина', 'Алексеев Егор', 'Лебедева София', 'Семёнов Максим'];
const schools = ['МГУПП', 'РХТУ им. Менделеева', 'МГТУ им. Баумана', 'Колледж пищевой промышленности №1',
  'МИРЭА', 'Политехнический колледж им. Годовикова', 'Университет «Синергия»'];
const courses = ['4', '4', '4', '5+', '1-3'];
const levels = ['college', 'bachelor', 'bachelor', 'school', 'unfinished'];
const jobs = ['Продавец-консультант, 1 год', 'Курьер, полгода', 'Оператор на складе маркетплейса', 'Лаборант в колледже, практика'];
const readiness = ['now', 'month', 'season', 'season', 'graduation'];

const run = db.transaction(() => {
  // воронка: 310 открыли → 248 начали → ... → 173 получили результат → 42 заявки
  const steps = ['tour1', 'tour2', 'tour3', 'tour4', 'tour5', 'tour6'];
  let apps = 0;
  for (let i = 0; i < 310; i++) {
    const sid = 'demo-' + crypto.randomUUID();
    const t = daysAgo(Math.floor(Math.random() * 14));
    // канал прихода: флаеры с экскурсий и hh.ru — самые «тёплые»
    const src = pick(['hh', 'excursion', 'friend', 'fair', 'ads', null], [0.22, 0.14, 0.18, 0.12, 0.2, 0.14]);
    db.prepare("INSERT INTO events (created_at, session_id, type, scene, direction, is_demo, source) VALUES (?, ?, 'open', NULL, NULL, 1, ?)").run(t, sid, src);
    if (i >= 248) {
      // часть людей со старта сразу идёт к вакансиям (QR с ярмарки, листовки)
      if (i < 280) {
        ev.run(t, sid, 'scene', 'jobs_direct', null);
        ev.run(t, sid, 'scene', 'vacancy', pick(dirs, dirWeights));
      }
      continue;
    }
    ev.run(t, sid, 'start', i % 3 ? 'kvass' : 'lemonade', null);
    // 248 начали → отток по 6 этапам экскурсии → 196 прошли
    const cut = [244, 236, 226, 214, 205, 196];
    const reached = cut.filter((c) => i < c).length;
    for (let s = 0; s < reached; s++) ev.run(t, sid, 'scene', steps[s], null);
    if (reached < steps.length) continue;
    const dir = pick(dirs, dirWeights);
    ev.run(t, sid, 'finish', null, dir);
    if (Math.random() > 0.78) continue;                       // ~78% открывают вакансию
    ev.run(t, sid, 'scene', 'vacancy', dir);
    if (Math.random() < 0.35) ev.run(t, sid, 'scene', 'trial', dir);
    if (Math.random() < 0.5) ev.run(t, sid, 'scene', 'q_plants', null);
    if (apps >= 42 || Math.random() > (src === 'excursion' ? 0.7 : src === 'hh' ? 0.45 : 0.28)) continue;
    apps++;
    const year = 2001 + Math.floor(Math.random() * 7);
    const name = pick(names) + ' (демо)';
    ap.run({
      created_at: t, session_id: sid, full_name: name,
      phone: '+7900' + String(1000000 + Math.floor(Math.random() * 8999999)),
      email: `demo${i}@example.com`,
      birth_date: `${year}-0${1 + Math.floor(Math.random() * 9)}-1${Math.floor(Math.random() * 9)}`,
      vacancy: Math.random() < 0.8 ? dir : 'unknown',
      readiness: pick(readiness), ...(() => {
        const student = Math.random() < 0.65;
        const exp = student ? pick(['none', 'none', 'lt1']) : pick(['none', 'lt1', '1-3', 'gt3']);
        return {
          is_student: student ? 1 : 0,
          education: student ? pick(schools) : (Math.random() < 0.5 ? pick(schools) : ''),
          course: student ? pick(courses) : '',
          education_level: student ? null : pick(levels),
          experience: exp,
          experience_text: exp === 'none' ? null : pick(jobs),
        };
      })(),
      direction: dir, scores: JSON.stringify({ [dir]: 5 }), quiz_score: pick([1, 2, 2, 3, 3, 3]),
      status: pick(['new', 'new', 'new', 'contacted', 'invited']),
      source: src ?? pick(['friend', 'other', 'hh']),
    });
    ev.run(t, sid, 'apply', null, dir);
  }
  return apps;
});

const n = run();
console.log(`✓ Демо-данные: 310 сессий, ${n} заявок (помечены как демо)`);
