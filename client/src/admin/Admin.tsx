import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api';

type Row = {
  id: number; created_at: string; full_name: string; phone: string; email: string | null;
  birth_date: string; vacancy: string; readiness: string; education: string; course: string;
  direction: string | null; status: string; is_demo: number;
  is_student: number | null; education_level: string | null; experience: string | null; experience_text: string | null; quiz_score: number | null; source: string | null;
};
type Labels = Record<'vacancy' | 'readiness' | 'course' | 'direction' | 'education_level' | 'experience' | 'source', Record<string, string>>;
type Source = { source: string; title: string; visits: number; applications: number };
type Stats = { sources?: Source[]; funnel: { step: string; n: number }[]; extra?: { step: string; n: number }[]; directions: { direction: string; title: string; n: number }[] };

const STATUS: Record<string, string> = { new: 'Новая', contacted: 'Связались', invited: 'Приглашён', rejected: 'Отказ' };
const TOKEN_KEY = 'ochakovo_hr_token';

export default function Admin() {
  const [token, setToken] = useState<string>(() => {
    try { return sessionStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; }
  });
  const saveToken = (t: string) => {
    setToken(t);
    try { t ? sessionStorage.setItem(TOKEN_KEY, t) : sessionStorage.removeItem(TOKEN_KEY); } catch {}
  };
  return (
    <div className="admin">
      <header className="admin-top">
        <img src="/logo.png" alt="Очаково" className="logo" />
        <span>HR-панель</span>
        {token && <button className="btn small ghost" onClick={() => saveToken('')}>Выйти</button>}
      </header>
      {token ? <Dashboard token={token} onLogout={() => saveToken('')} /> : <Login onLogin={saveToken} />}
    </div>
  );
}

function Login({ onLogin }: { onLogin: (t: string) => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      const { token } = await api<{ token: string }>('/api/admin/login', { method: 'POST', body: JSON.stringify({ password }) });
      onLogin(token);
    } catch (err: any) { setError(err.message); }
  }
  return (
    <form className="card form login" onSubmit={submit}>
      <h2>Вход для HR</h2>
      <label>Пароль<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus /></label>
      {error && <span className="err">{error}</span>}
      <button className="btn primary">Войти</button>
    </form>
  );
}

function Dashboard({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [hideDemo, setHideDemo] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [labels, setLabels] = useState<Labels | null>(null);
  const [q, setQ] = useState('');
  const qs = hideDemo ? '?demo=0' : '';

  async function load() {
    try {
      const [s, a] = await Promise.all([
        api<Stats>('/api/admin/stats' + qs, {}, token),
        api<{ rows: Row[]; labels: Labels }>('/api/admin/applications' + qs, {}, token),
      ]);
      setStats(s); setRows(a.rows); setLabels(a.labels);
    } catch (e: any) { if (e.status === 401) onLogout(); }
  }
  useEffect(() => { load(); }, [hideDemo]); // eslint-disable-line react-hooks/exhaustive-deps

  async function setStatus(id: number, status: string) {
    await api(`/api/admin/applications/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }, token);
    setRows((r) => r.map((x) => (x.id === id ? { ...x, status } : x)));
  }

  const L = (k: keyof Labels, v: string | null) => (v && labels?.[k][v]) || v || '—';
  const filtered = rows.filter((r) => !q || (r.full_name + r.education + r.phone).toLowerCase().includes(q.toLowerCase()));
  const top = stats?.funnel[0]?.n || 1;
  const finished = stats?.funnel.find((f) => f.step === 'Прошли экскурсию')?.n || 0;
  const applied = stats?.funnel[stats.funnel.length - 1]?.n || 0;
  const maxDir = Math.max(1, ...(stats?.directions.map((d) => d.n) || [1]));

  return (
    <div className="dash">
      <div className="toolbar">
        <label className="check inline"><input type="checkbox" checked={hideDemo} onChange={(e) => setHideDemo(e.target.checked)} /> Скрыть демо-данные</label>
        <button className="btn small" onClick={load}>Обновить</button>
        <a className="btn small" href={`/api/admin/export.csv${qs}${qs ? '&' : '?'}token=${encodeURIComponent(token)}`}>Скачать CSV (Excel)</a>
      </div>

      <section className="kpis">
        <Kpi label="Открыли" value={stats?.funnel[0]?.n} />
        <Kpi label="Прошли экскурсию" value={finished} />
        <Kpi label="Заявок" value={applied} />
<Kpi label="Конверсия экскурсия → заявка" value={finished ? `${Math.round((applied / finished) * 100)}%` : '—'} />
      </section>

      <div className="grid2">
        <section className="panel">
          <h3>Воронка: где уходят</h3>
          {stats?.funnel.map((f) => (
            <div className="bar" key={f.step}>
              <span>{f.step}</span>
              <div><i style={{ width: `${(f.n / top) * 100}%` }} /></div>
              <b>{f.n}</b>
            </div>
          ))}
          {!!stats?.extra?.length && (
            <ul className="extra">
              {stats.extra.map((e) => <li key={e.step}><span>{e.step}</span><b>{e.n}</b></li>)}
            </ul>
          )}
        </section>
        <section className="panel">
          <h3>Какие вакансии открывают</h3>
          {stats?.directions.length ? stats.directions.map((d) => (
            <div className="bar" key={d.direction}>
              <span>{d.title}</span>
              <div><i style={{ width: `${(d.n / maxDir) * 100}%` }} /></div>
              <b>{d.n}</b>
            </div>
          )) : <p className="note">Пока нет данных</p>}
        </section>
      </div>

      {!!stats?.sources?.length && (
        <section className="panel">
          <h3>Откуда приходят</h3>
          <div className="table-wrap">
            <table className="sources">
              <thead><tr><th>Канал</th><th>Визиты по ссылке</th><th>Заявки</th></tr></thead>
              <tbody>
                {stats.sources.map((s) => (
                  <tr key={s.source}><td>{s.title}</td><td>{s.visits}</td><td><b>{s.applications}</b></td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="note small">Визиты считаются по меткам в ссылках (?from=hh, ?from=excursion…), заявки — по ответу «Откуда узнали».</p>
        </section>
      )}

      <section className="panel">
        <div className="panel-head">
          <h3>Заявки ({filtered.length})</h3>
          <input className="search" placeholder="Поиск по ФИО, вузу, телефону" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Дата</th><th>ФИО</th><th>Контакты</th><th>Д. р.</th><th>Вакансия</th><th>По игре</th><th>Квиз</th><th>Откуда</th><th>Готовность</th><th>Образование</th><th>Опыт</th><th>Статус</th></tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td className="nowrap">{new Date(r.created_at.replace(' ', 'T') + 'Z').toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}</td>
                  <td>{r.full_name}{r.is_demo ? <em className="tag">демо</em> : null}</td>
                  <td>{r.phone}<br /><small>{r.email}</small></td>
                  <td>{r.birth_date}</td>
                  <td>{L('vacancy', r.vacancy)}</td>
                  <td>{L('direction', r.direction)}</td>
                  <td>{r.quiz_score ?? '—'}{r.quiz_score != null && '/3'}</td>
                  <td>{L('source', r.source)}</td>
                  <td>{L('readiness', r.readiness)}</td>
                  <td>
                    {r.is_student === 0
                      ? <>{L('education_level', r.education_level)}{r.education && <><br /><small>{r.education}</small></>}</>
                      : <>{r.education}<br /><small>студент, {L('course', r.course)}</small></>}
                  </td>
                  <td>{L('experience', r.experience)}{r.experience_text && <><br /><small>{r.experience_text}</small></>}</td>
                  <td>
                    <select value={r.status} onChange={(e) => setStatus(r.id, e.target.value)}>
                      {Object.entries(STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value?: number | string }) {
  return <div className="kpi"><b>{value ?? '—'}</b><span>{label}</span></div>;
}
