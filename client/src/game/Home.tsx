import { useEffect } from 'react';
import Icon from './Icon';
import home from '../data/home.json';
import content from '../data/directions.json';
import scenesData from '../data/scenes.json';
import tourData from '../data/tour.json';
import { source } from '../source';

type DirKey = keyof typeof content.directions;
type Props = {
  onPlay: (drink: string) => void;
  onVacancy: (dir: DirKey) => void;
  onApply: () => void;
  scrollTo?: string | null;          // раздел, к которому прокрутить при открытии (#vacancies и т. д.)
  onScrolled: () => void;
};

const DIRS = content.directions as Record<DirKey, { title: string; role: string; salary: string; icon: string; about: string }>;
const DRINKS = tourData.drinks as Record<string, { name: string; icon: string; tagline: string; liquid: string }>;
const nb = (t: string) => t.replace(/(\d) (\d)/g, '$1 $2').replace(/ ₽/g, ' ₽');

/** Плавная прокрутка к разделу с учётом закреплённой шапки. */
export function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - 72;
  window.scrollTo({ top, behavior: 'smooth' });
}

export default function Home({ onPlay, onVacancy, onApply, scrollTo, onScrolled }: Props) {
  useEffect(() => {
    if (!scrollTo) return;
    const t = setTimeout(() => { scrollToSection(scrollTo); onScrolled(); }, 60);
    return () => clearTimeout(t);
  }, [scrollTo]); // eslint-disable-line react-hooks/exhaustive-deps

  const banner = source ? (home.fromBanners as Record<string, string>)[source] : undefined;

  return (
    <div className="home">
      {/* ---------- Предложение ---------- */}
      <section className="hero-offer" id="top">
        <div className="hero-text">
          {banner && <p className="from-banner">{banner}</p>}
          <p className="eyebrow">{home.offer.eyebrow}</p>
          <h1>{home.offer.title}</h1>
          <ul className="perks">{home.offer.perks.map((p) => <li key={p}>{nb(p)}</li>)}</ul>
          <p className="lead">{home.offer.text}</p>
          <div className="hero-cta">
            <button className="btn primary" onClick={() => scrollToSection('vacancies')}>{home.offer.ctaJobs}</button>
            <button className="btn" onClick={() => scrollToSection('game')}>{home.offer.ctaGame}</button>
          </div>
        </div>
        <div className="hero-art" aria-hidden>
          <img src="/img/pattern-hero.jpg" alt="" />
        </div>
      </section>

      {/* ---------- Игра (превью) ---------- */}
      <section className="section game-preview" id="game">
        <div className="section-head">
          <p className="eyebrow">Игра · 2 минуты</p>
          <h2>{home.game.title}</h2>
          <p className="note">{home.game.text}</p>
        </div>
        <div className="drinks">
          {Object.keys(DRINKS).map((k, i) => (
            <button key={k} className="drink" style={{ ['--liquid' as string]: DRINKS[k].liquid, animationDelay: `${i * 0.12}s` }}
              onClick={() => onPlay(k)}>
              <span className="drink-glass"><img src={DRINKS[k].icon} alt="" /><i /><i /><i /></span>
              <b>{DRINKS[k].name}</b>
              <small>{DRINKS[k].tagline}</small>
              <span className="drink-go">Запустить <Icon name="arrowRight" size={15} /></span>
            </button>
          ))}
        </div>
      </section>

      {/* ---------- Вакансии ---------- */}
      <section className="section" id="vacancies">
        <div className="section-head">
          <h2>{home.jobs.title}</h2>
          <p className="note">{home.jobs.text}</p>
        </div>
        <div className="vac-grid">
          {(Object.keys(DIRS) as DirKey[]).map((k) => {
            const d = DIRS[k];
            return (
              <button key={k} className="vac-card" onClick={() => onVacancy(k)}>
                <img src={d.icon} alt="" />
                <b>{d.title}</b>
                <small>{d.role}</small>
                <span className="vac-salary">{nb(d.salary)}</span>
                <span className="vac-more">Подробнее <Icon name="arrowRight" size={14} /></span>
              </button>
            );
          })}
        </div>
        <p className="open-day"><img src="/icons/tanks.png" alt="" /><span>{home.openDay}</span></p>
      </section>

      {/* ---------- Условия ---------- */}
      <section className="section" id="conditions">
        <div className="section-head"><h2>{home.conditions.title}</h2></div>
        <ul className="cond-grid">
          {content.benefits.map((b) => <li key={b}>{b}</li>)}
        </ul>
        <p className="note">{content.practicePeriod}</p>
      </section>

      {/* ---------- О компании ---------- */}
      <section className="section" id="about">
        <div className="section-head"><h2>{home.about.title}</h2></div>
        <div className="stats">
          {home.about.stats.map((s) => (
            <div className="stat" key={s.label}><b>{s.value}</b><span>{s.label}</span></div>
          ))}
        </div>
        <details className="more history-more">
          <summary>{scenesData.history.title}</summary>
          <ol className="timeline">
            {scenesData.history.items.map((h) => (
              <li key={h.year}><img src={h.icon} alt="" /><div><b>{h.year}</b><p>{h.text}</p></div></li>
            ))}
          </ol>
        </details>
      </section>

      {/* ---------- Вопросы ---------- */}
      <section className="section" id="faq">
        <div className="section-head"><h2>{home.faq.title}</h2></div>
        <div className="faq">
          {home.faq.items.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ---------- Отклик ---------- */}
      <section className="section final-cta" id="apply">
        <h2>Готов(а) попробовать?</h2>
        <p className="lead">Оставь отклик — отдел подбора свяжется с тобой. Без резюме, 2 минуты.</p>
        <button className="btn primary" onClick={onApply}>Откликнуться</button>
        <button className="btn" onClick={() => scrollToSection('vacancies')}>Сначала выбрать вакансию</button>
      </section>
    </div>
  );
}
