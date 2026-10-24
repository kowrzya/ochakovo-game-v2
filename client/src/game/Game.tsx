import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import scenesData from '../data/scenes.json';
import content from '../data/directions.json';
import tourData from '../data/tour.json';
import home from '../data/home.json';
import { track } from '../api';
import { source, shareWithFriend } from '../source';
import ApplyForm from './ApplyForm';
import Confetti from './Confetti';
import Home, { scrollToSection } from './Home';
import TourStage, { TourStageData } from './TourStage';

type DirKey = keyof typeof content.directions;
type Trial = { title: string; question: string; options: { text: string; good: boolean; feedback: string }[] };
type Direction = {
  title: string; role: string; about: string; salary: string; schedule: string; conditions: string;
  growth: string[]; icon: string; badge: string; trial: Trial; video?: string; poster?: string; videoTitle?: string;
};
type Quiz = { id: string; question: string; options: string[]; correct: number; fact: string };
type Drink = { name: string; accusative: string; genitive: string; icon: string; tagline: string; liquid: string; stages: TourStageData[] };

const DIRS = content.directions as Record<DirKey, Direction>;
const DIR_KEYS = Object.keys(DIRS) as DirKey[];
const QUIZ = scenesData.quiz as Quiz[];
const DRINKS = tourData.drinks as Record<string, Drink>;
const DRINK_KEYS = Object.keys(DRINKS);
const TOUR_LEN = Math.max(...DRINK_KEYS.map((k) => DRINKS[k].stages.length));
const fill = (text: string, d?: Drink) => text.replace(/\{drink\}/g, d ? d.accusative : 'напиток');
const nb = (t: string) => t.replace(/(\d) (\d)/g, '$1 $2').replace(/ ₽/g, ' ₽');

const NAV = [
  { id: 'vacancies', label: 'Вакансии' },
  { id: 'game', label: 'Игра' },
  { id: 'conditions', label: 'Условия' },
  { id: 'about', label: 'О компании' },
  { id: 'faq', label: 'Вопросы' },
];

type Screen =
  | { name: 'home' }
  | { name: 'intro' }
  | { name: 'tour'; i: number }
  | { name: 'tourEnd' }
  | { name: 'choose' }
  | { name: 'vacancy'; dir: DirKey }
  | { name: 'quiz'; i: number }
  | { name: 'form'; vacancy: string }
  | { name: 'done' };

/** С этапов экскурсии и её финала «назад» не работает: действия уже сделаны. */
const isLocked = (s: Screen) => s.name === 'tour' || s.name === 'tourEnd';

export default function Game() {
  const [stack, setStack] = useState<Screen[]>([{ name: 'home' }]);
  const [drinkKey, setDrinkKey] = useState<string | null>(null);
  const [liked, setLiked] = useState<Set<string>>(new Set());   // «Хочу здесь работать»
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [menuOpen, setMenuOpen] = useState(false);
  // флаер с экскурсии по заводу сразу ведёт к вакансиям
  const [homeScroll, setHomeScroll] = useState<string | null>(source === 'excursion' ? 'vacancies' : null);
  const homeY = useRef(0); // где была прокрутка главной, чтобы вернуться туда же
  const screen = stack[stack.length - 1];
  const drink = drinkKey ? DRINKS[drinkKey] : undefined;
  const quizDone = QUIZ.every((q) => q.id in quizAnswers);
  const quizScore = QUIZ.filter((q) => quizAnswers[q.id] === q.correct).length;

  const screenRef = useRef(screen);
  screenRef.current = screen;
  const stackLen = useRef(1);
  stackLen.current = stack.length;
  const skipPops = useRef(0);

  useEffect(() => { track('open'); }, []);
  useEffect(() => {
    setMenuOpen(false);
    if (screen.name === 'home') { if (!homeScroll) window.scrollTo(0, homeY.current); }
    else window.scrollTo(0, 0);
  }, [screen]); // eslint-disable-line react-hooks/exhaustive-deps

  // «Назад» браузера/телефона листает экраны и не уводит с сайта.
  useEffect(() => {
    const onPop = () => {
      if (skipPops.current > 0) { skipPops.current--; return; }
      if (isLocked(screenRef.current)) history.pushState({ game: true }, '');
      else if (stackLen.current > 1) setStack((st) => st.slice(0, -1));
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  function go(next: Screen) {
    if (screenRef.current.name === 'home') homeY.current = window.scrollY;
    history.pushState({ game: true }, '');
    setStack((st) => [...st, next]);
  }
  function resetTo(next: Screen) {
    history.pushState({ game: true }, '');
    setStack([next]);
  }
  const back = () => history.back();
  const canGoBack = stack.length > 1 && !isLocked(screen) && !['done', 'form', 'home'].includes(screen.name);

  /** Переход к разделу главной из любого места сайта. */
  function goSection(id: string) {
    setMenuOpen(false);
    if (screen.name === 'home') { scrollToSection(id); return; }
    homeY.current = 0;
    setHomeScroll(id);
    resetTo({ name: 'home' });
  }
  function apply(vacancy: string = 'unknown') {
    setMenuOpen(false);
    go({ name: 'form', vacancy });
  }

  function play(k: string) {
    setDrinkKey(k);
    setLiked(new Set());
    track('start', { scene: k });
    go({ name: 'intro' });
  }
  function toggleLike(dir: string) {
    setLiked((s) => {
      const n = new Set(s);
      if (n.has(dir)) n.delete(dir); else n.add(dir);
      return n;
    });
  }
  function openVacancy(dir: DirKey) {
    track('scene', { scene: 'vacancy', direction: dir });
    go({ name: 'vacancy', dir });
  }
  function answerQuiz(q: Quiz, i: number) {
    if (q.id in quizAnswers) return;
    setQuizAnswers((a) => (q.id in a ? a : { ...a, [q.id]: i }));
    track('scene', { scene: q.id });
  }
  function finishQuiz() {
    const n = QUIZ.length;
    skipPops.current += 1;
    setStack((st) => st.slice(0, -n));
    history.go(-n);
  }
  function restart() {
    setDrinkKey(null);
    setLiked(new Set());
    setQuizAnswers({});
    homeY.current = 0;
    resetTo({ name: 'home' });
  }

  const likedDirs = DIR_KEYS.filter((k) => liked.has(k));
  const gameDirection = likedDirs[0] ?? null;
  const scores = Object.fromEntries(DIR_KEYS.map((k) => [k, liked.has(k) ? 1 : 0]));

  const inTour = screen.name === 'intro' || screen.name === 'tour';
  const progress = screen.name === 'tour' ? (screen.i + 1) / (TOUR_LEN + 1) : screen.name === 'intro' ? 0.02 : 0;

  return (
    <div className={'site' + (screen.name === 'home' ? ' is-home' : '')}>
      <header className="site-header">
        <div className="header-inner">
          <button className="logo-btn" onClick={() => goSection('top')} aria-label="На главную">
            <img src="/logo.png" alt="Очаково — натуральные напитки" className="logo" />
          </button>
          <nav className="nav-desktop" aria-label="Разделы">
            {NAV.map((n) => <button key={n.id} onClick={() => goSection(n.id)}>{n.label}</button>)}
          </nav>
          <div className="header-actions">
            <button className="btn small jobs-btn" onClick={() => goSection('vacancies')}>Вакансии</button>
            <button className="btn small primary apply-btn" onClick={() => apply()}>Откликнуться</button>
            <button className={'burger' + (menuOpen ? ' open' : '')} aria-label="Меню" aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}><i /><i /><i /></button>
          </div>
        </div>
        {inTour && progress > 0 && (
          <div className="progress header-progress" aria-label="Прогресс"><div style={{ width: `${progress * 100}%` }} /></div>
        )}
        {menuOpen && (
          <nav className="nav-mobile" aria-label="Меню">
            {NAV.map((n) => <button key={n.id} onClick={() => goSection(n.id)}>{n.label}</button>)}
            <button className="btn primary" onClick={() => apply()}>Откликнуться</button>
          </nav>
        )}
      </header>

      {screen.name === 'home' ? (
        <Home onPlay={play} onVacancy={openVacancy} onApply={() => apply()}
          scrollTo={homeScroll} onScrolled={() => setHomeScroll(null)} />
      ) : (
        <div className="app">
          <main className="card" key={stack.length + screen.name}>
            {canGoBack && <button className="back" onClick={back}><Icon name="arrowLeft" size={16} /> Назад</button>}

            {screen.name === 'intro' && (
              <>
                <Guide />
                <h2>{scenesData.intro.title}</h2>
                {scenesData.intro.lines.map((l) => <p key={l} className="speech">{fill(l, drink)}</p>)}
                <button className="btn primary" onClick={() => go({ name: 'tour', i: 0 })}>Поехали</button>
              </>
            )}

            {screen.name === 'tour' && drink && (
              <TourStage key={screen.i} stage={drink.stages[screen.i]} index={screen.i} total={drink.stages.length}
                color={drink.liquid}
                roleInfo={(dir) => {
                  const d = DIRS[dir as DirKey];
                  return { icon: d?.icon ?? '', salary: d?.salary ?? '', title: d?.title ?? '' };
                }}
                liked={liked} onToggleLike={toggleLike}
                onSkip={() => { track('scene', { scene: 'jobs_skip' }); go({ name: 'choose' }); }}
                onDone={() => track('scene', { scene: `tour${screen.i + 1}` })}
                onNext={() => {
                  if (screen.i + 1 < drink.stages.length) go({ name: 'tour', i: screen.i + 1 });
                  else { track('finish', { direction: gameDirection ?? undefined }); go({ name: 'tourEnd' }); }
                }} />
            )}

            {screen.name === 'tourEnd' && drink && (
              <>
                <Confetti />
                <div className="tour-end-art" style={{ ['--liquid' as string]: drink.liquid }}>
                  <span className="drink-glass big"><img src={drink.icon} alt="" /><i /><i /><i /></span>
                </div>
                <h2>{fill(scenesData.tourEnd.title, drink)}</h2>
                <p className="lead">{scenesData.tourEnd.text}</p>
                <ul className="tour-summary">{drink.stages.map((st) => <li key={st.id}><Icon name="check" size={14} /> {st.title}</li>)}</ul>
                <button className="btn primary" onClick={() => go({ name: 'choose' })}>{scenesData.tourEnd.button}</button>
                <ShareButton />
              </>
            )}

            {screen.name === 'choose' && (
              <>
                <p className="eyebrow">Твой выбор</p>
                <h2>{scenesData.choose.title}</h2>
                <p className="note">{scenesData.choose.text}</p>
                <div className="dir-list">
                  {[...likedDirs, ...DIR_KEYS.filter((k) => !liked.has(k))].map((k, i) => {
                    const d = DIRS[k];
                    return (
                      <button key={k} className={'dir-card' + (liked.has(k) ? ' liked' : '')} style={{ animationDelay: `${i * 0.06}s` }}
                        onClick={() => openVacancy(k)}>
                        <img src={d.icon} alt="" />
                        <span>
                          {liked.has(k) && <em><Icon name="heartFilled" size={13} /> тебе понравилось</em>}
                          <b>{d.title}</b>
                          <small>{d.role} · {nb(d.salary)}</small>
                        </span>
                        <i aria-hidden>›</i>
                      </button>
                    );
                  })}
                </div>
                {!quizDone ? (
                  <button className="quiz-entry" onClick={() => go({ name: 'quiz', i: 0 })}>
                    <b>{scenesData.quizBonus.title}</b>
                    <small>{scenesData.quizBonus.text}</small>
                  </button>
                ) : (
                  <div className={'quiz-result' + (quizScore === QUIZ.length ? ' gold' : '')}>
                    {quizScore === QUIZ.length
                      ? <><b><Icon name="medal" size={20} className="medal" /> {scenesData.quizBonus.badge}</b><small>Все {QUIZ.length} ответа верны!</small></>
                      : <><b>Квиз: {quizScore} из {QUIZ.length}</b><small>Теперь ты знаешь об «Очаково» больше.</small></>}
                  </div>
                )}
              </>
            )}

            {screen.name === 'vacancy' && (
              <Vacancy dir={screen.dir} onApply={() => apply(screen.dir)} onBack={back} />
            )}

            {screen.name === 'quiz' && (() => {
              const q = QUIZ[screen.i];
              const answer = quizAnswers[q.id];
              const answered = answer !== undefined;
              const last = screen.i + 1 >= QUIZ.length;
              return (
                <>
                  <p className="eyebrow">Бонус · вопрос {screen.i + 1} из {QUIZ.length}</p>
                  <h2>{q.question}</h2>
                  <div className="choices">
                    {q.options.map((o, i) => {
                      const cls = !answered ? '' : i === q.correct ? ' right' : i === answer ? ' wrong' : ' dim';
                      return (
                        <button key={o} className={'btn choice quiz' + cls} disabled={answered} onClick={() => answerQuiz(q, i)}>
                          <span>{o}</span>
                          {answered && i === q.correct && <b className="mark" aria-label="верно"><Icon name="check" size={20} /></b>}
                          {answered && i === answer && i !== q.correct && <b className="mark" aria-label="неверно"><Icon name="close" size={18} /></b>}
                        </button>
                      );
                    })}
                  </div>
                  {answered && (
                    <div className="quiz-fact" role="status"><b>{answer === q.correct ? 'Верно!' : 'Не совсем.'}</b> {q.fact}</div>
                  )}
                  {answered && (
                    <button className="btn primary" onClick={() => (last ? finishQuiz() : go({ name: 'quiz', i: screen.i + 1 }))}>
                      {last ? 'К вакансиям' : 'Дальше'}
                    </button>
                  )}
                </>
              );
            })()}

            {screen.name === 'form' && (
              <ApplyForm vacancy={screen.vacancy} direction={gameDirection} scores={scores}
                quizScore={quizDone ? quizScore : null}
                onBack={back} onDone={() => resetTo({ name: 'done' })} />
            )}

            {screen.name === 'done' && (
              <>
                <Confetti />
                <Guide />
                <h2>Заявка отправлена!</h2>
                <p className="speech">Спасибо! Отдел подбора свяжется с тобой.</p>
                <p className="open-day"><img src="/icons/tanks.png" alt="" /><span>{home.openDay}</span></p>
                <ShareButton label="Позвать друга на стажировку" />
                <button className="btn" onClick={restart}>На главную</button>
              </>
            )}
          </main>
        </div>
      )}
      <footer className="foot">Демо-прототип для хакатона «Открой#Моспром». Данные используются только для связи по вакансиям.</footer>
    </div>
  );
}

function Guide() {
  return (
    <div className="guide">
      {/* TODO дизайнер: заменить на иллюстрацию проводника */}
      <div className="avatar" aria-hidden>{scenesData.guide.name[0]}</div>
      <div>
        <b>{scenesData.guide.name}</b>
        <span>{scenesData.guide.title}</span>
      </div>
    </div>
  );
}

/** «Отправь другу»: меню «Поделиться» на телефоне или копирование ссылки на компьютере. */
function ShareButton({ label = 'Отправить другу' }: { label?: string }) {
  const [status, setStatus] = useState<'' | 'copied' | 'shared' | 'failed'>('');
  return (
    <div className="share">
      <button className="btn share-btn" onClick={async () => {
        const r = await shareWithFriend();
        setStatus(r);
        track('scene', { scene: 'share' });
      }}><Icon name="share" size={18} /> {label}</button>
      {status === 'copied' && <p className="note center small" role="status">Ссылка скопирована — отправь её в мессенджер</p>}
      {status === 'failed' && <p className="note center small" role="status">Не получилось — скопируй адрес страницы вручную</p>}
    </div>
  );
}

/** Подробная карточка вакансии + необязательная «проба профессии». */
function Vacancy({ dir, onApply, onBack }: { dir: DirKey; onApply: () => void; onBack: () => void }) {
  const d = DIRS[dir];
  const [trialOpen, setTrialOpen] = useState(false);
  const [pick, setPick] = useState<number | null>(null);
  return (
    <>
      <img className="result-icon" src={d.icon} alt="" />
      <p className="eyebrow">Вакансия</p>
      <h2>{d.title}</h2>
      <p className="lead">{d.about}</p>
      <dl className="facts">
        <dt>Кем начать</dt><dd>{d.role}</dd>
        <dt>Зарплата</dt><dd>{nb(d.salary)}</dd>
        <dt>График</dt><dd>{d.schedule}</dd>
      </dl>
      <details className="more">
        <summary>Подробнее об условиях</summary>
        <p>{d.conditions}</p>
      </details>

      <button className="btn primary" onClick={onApply}>Откликнуться</button>
      <p className="open-day small"><img src="/icons/tanks.png" alt="" /><span>{home.openDay}</span></p>

      <div className={'trial' + (trialOpen ? ' open' : '')}>
        {!trialOpen ? (
          <button className="trial-entry" onClick={() => { setTrialOpen(true); track('scene', { scene: 'trial', direction: dir }); }}>
            <span className="trial-icon"><img src={d.icon} alt="" /></span>
            <span><b>{d.trial.title}</b><small>Одна ситуация из реальной смены — 30 секунд</small></span>
          </button>
        ) : (
          <>
            <p className="trial-q"><b>{d.trial.title}.</b> {d.trial.question}</p>
            <div className="choices">
              {d.trial.options.map((o, i) => {
                const cls = pick === null ? '' : o.good ? ' right' : i === pick ? ' wrong' : ' dim';
                return (
                  <button key={o.text} className={'btn choice quiz' + cls} disabled={pick !== null} onClick={() => setPick(i)}>
                    <span>{o.text}</span>
                  </button>
                );
              })}
            </div>
            {pick !== null && <div className="quiz-fact" role="status">{d.trial.options[pick].feedback}</div>}
          </>
        )}
      </div>

      {d.video && (
        <figure className="video">
          <video src={d.video} poster={d.poster} controls playsInline preload="none" />
          <figcaption>{d.videoTitle}</figcaption>
        </figure>
      )}
      <h3>Путь роста</h3>
      <ol className="path">{d.growth.map((g) => <li key={g}>{g}</li>)}</ol>
      <h3>Что даёт «Очаково»</h3>
      <ul className="benefits">{content.benefits.map((b) => <li key={b}>{b}</li>)}</ul>
      <button className="btn primary" onClick={onApply}>Откликнуться</button>
      <ShareButton label="Отправить вакансию другу" />
      <button className="btn ghost" onClick={onBack}>Посмотреть другие направления</button>
    </>
  );
}
