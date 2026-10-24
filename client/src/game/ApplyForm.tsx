import { FormEvent, useState } from 'react';
import Icon from './Icon';
import content from '../data/directions.json';
import { api, sessionId } from '../api';
import { source } from '../source';

type Props = {
  vacancy: string;      // выбранная вакансия (по умолчанию в списке)
  direction: string | null; // что отмечал(а) на экскурсии — для HR
  scores: Record<string, number>;
  quizScore: number | null;
  onBack: () => void;
  onDone: () => void;
};
type Errors = Partial<Record<string, string>>;

function age(birth: string) {
  const b = new Date(birth + 'T00:00:00');
  const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return a;
}

export default function ApplyForm({ vacancy, direction, scores, quizScore, onBack, onDone }: Props) {
  const [f, setF] = useState({
    fullName: '', phone: '', email: '', birthDate: '',
    vacancy, readiness: '', source: source ?? '',
    isStudent: null as boolean | null,
    education: '', course: '', educationLevel: '',
    experience: '', experienceText: '',
    consent: false,
  });
  const [errors, setErrors] = useState<Errors>({});
  const [sending, setSending] = useState(false);
  const [fail, setFail] = useState('');

  const set = (k: keyof typeof f) => (e: { target: { value: string; checked?: boolean; type?: string } }) =>
    setF({ ...f, [k]: e.target.type === 'checkbox' ? !!e.target.checked : e.target.value });

  const tooYoung = f.birthDate && age(f.birthDate) < 18;

  function check(): Errors {
    const e: Errors = {};
    if (f.fullName.trim().split(/\s+/).length < 2) e.fullName = 'Укажите фамилию и имя';
    if (!/^[78]?\d{10}$/.test(f.phone.replace(/\D/g, ''))) e.phone = 'Телефон в формате +7 XXX XXX-XX-XX';
    if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = 'Проверьте e-mail';
    if (!f.birthDate) e.birthDate = 'Укажите дату рождения';
    else if (tooYoung) e.birthDate = 'На практику и работу принимаем с 18 лет';
    if (!f.readiness) e.readiness = 'Выберите вариант';
    if (!f.source) e.source = 'Выберите вариант';
    if (f.isStudent === null) e.isStudent = 'Выберите вариант';
    if (f.isStudent === true) {
      if (f.education.trim().length < 2) e.education = 'Укажите вуз или колледж';
      if (!f.course) e.course = 'Выберите курс';
    }
    if (f.isStudent === false && !f.educationLevel) e.educationLevel = 'Выберите уровень образования';
    if (!f.experience) e.experience = 'Выберите вариант';
    if (!f.consent) e.consent = 'Нужно согласие на обработку персональных данных';
    return e;
  }

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    setFail('');
    const e = check();
    setErrors(e);
    if (Object.keys(e).length) {
      document.querySelector('.err')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setSending(true);
    try {
      await api('/api/applications', {
        method: 'POST',
        body: JSON.stringify({ ...f, sessionId, direction, scores, quizScore }),
      });
      onDone();
    } catch (err: any) {
      if (err.status === 422 && err.body?.errors) setErrors(err.body.errors);
      else setFail(err.message || 'Не удалось отправить. Проверьте интернет и попробуйте ещё раз.');
    } finally {
      setSending(false);
    }
  }

  const err = (k: string) => errors[k] && <span className="err">{errors[k]}</span>;
  const opts = (list: { value: string; label: string }[]) =>
    list.map((o) => <option key={o.value} value={o.value}>{o.label}</option>);

  return (
    <form className="form" onSubmit={submit} noValidate>
      <button type="button" className="back" onClick={onBack}><Icon name="arrowLeft" size={16} /> Назад</button>
      <p className="eyebrow">Отклик</p>
      <h2>Оставь контакты — и мы свяжемся с тобой</h2>

      <fieldset>
        <legend>О себе</legend>
        <label>ФИО<input value={f.fullName} onChange={set('fullName')} autoComplete="name" placeholder="Иванова Анна Сергеевна" />{err('fullName')}</label>
        <label>Телефон<input value={f.phone} onChange={set('phone')} type="tel" autoComplete="tel" placeholder="+7 900 000-00-00" />{err('phone')}</label>
        <label>E-mail <small>(необязательно)</small><input value={f.email} onChange={set('email')} type="email" autoComplete="email" />{err('email')}</label>
        <label>Дата рождения<input value={f.birthDate} onChange={set('birthDate')} type="date" max={new Date().toISOString().slice(0, 10)} />{err('birthDate')}</label>
        {tooYoung && (
          <p className="note warn">«Очаково» принимает на работу и практику с 18 лет. Сохрани ссылку и возвращайся, когда исполнится 18!</p>
        )}
      </fieldset>

      <fieldset>
        <legend>Образование</legend>
        <div className="segmented" role="radiogroup" aria-label="Сейчас учишься?">
          <button type="button" role="radio" aria-checked={f.isStudent === true}
            className={f.isStudent === true ? 'on' : ''} onClick={() => setF({ ...f, isStudent: true })}>Сейчас учусь</button>
          <button type="button" role="radio" aria-checked={f.isStudent === false}
            className={f.isStudent === false ? 'on' : ''} onClick={() => setF({ ...f, isStudent: false })}>Уже не учусь</button>
        </div>
        {err('isStudent')}

        {f.isStudent === true && (
          <>
            <label>Вуз или колледж<input value={f.education} onChange={set('education')} placeholder="Например, МГУПП" />{err('education')}</label>
            <label>Курс<select value={f.course} onChange={set('course')}><option value="">—</option>{opts(content.form.course)}</select>{err('course')}</label>
          </>
        )}
        {f.isStudent === false && (
          <>
            <label>Уровень образования<select value={f.educationLevel} onChange={set('educationLevel')}><option value="">—</option>{opts(content.form.educationLevel)}</select>{err('educationLevel')}</label>
            <label>Учебное заведение и специальность <small>(необязательно)</small><input value={f.education} onChange={set('education')} placeholder="Например, колледж, технолог пищевого производства" /></label>
          </>
        )}
      </fieldset>

      <fieldset>
        <legend>Опыт и пожелания</legend>
        <label>Опыт работы<select value={f.experience} onChange={set('experience')}><option value="">—</option>{opts(content.form.experience)}</select>{err('experience')}</label>
        {f.experience && f.experience !== 'none' && (
          <label>Где и кем работал(а) <small>(необязательно)</small>
            <textarea value={f.experienceText} onChange={set('experienceText')} rows={3} maxLength={500} placeholder="Например, полгода оператором на складе" />
          </label>
        )}
        <label>Интересующая вакансия<select value={f.vacancy} onChange={set('vacancy')}>{opts(content.form.vacancies)}</select></label>
        <label>Когда готов(а) выйти<select value={f.readiness} onChange={set('readiness')}><option value="">—</option>{opts(content.form.readiness)}</select>{err('readiness')}</label>
        <label>Откуда ты о нас узнал(а)?<select value={f.source} onChange={set('source')}><option value="">—</option>{opts(content.form.sources)}</select>{err('source')}</label>
      </fieldset>

      <label className="check">
        <input type="checkbox" checked={f.consent} onChange={set('consent')} />
        <span>
          Я согласен(на) на обработку персональных данных компанией «Очаково» для связи по вакансиям и практике.
          {/* TODO аналитик: ссылка на текст согласия / политику */}
        </span>
      </label>
      {err('consent')}

      {fail && <p className="note warn">{fail}</p>}
      <button className="btn primary" disabled={sending || !!tooYoung}>{sending ? 'Отправляем…' : 'Отправить заявку'}</button>
    </form>
  );
}
