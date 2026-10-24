import { KeyboardEvent, PointerEvent, useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import TourVisual from './TourVisual';

export type TourStageData = {
  id: string; title: string; text: string; visual: string; fact: string;
  action: { type: 'tap'; count: number; label: string } | { type: 'hold'; ms: number; label: string };
  roles: { role: string; direction: string }[];
};
/** Неразрывные пробелы в суммах: «70 000 ₽» не разорвётся на две строки. */
const nb = (t: string) => t.replace(/(\d) (\d)/g, '$1\u00a0$2').replace(/ ₽/g, '\u00a0₽');

export type RoleInfo = { icon: string; salary: string; title: string };

type Props = {
  stage: TourStageData;
  index: number;
  total: number;
  color: string;
  roleInfo: (direction: string) => RoleInfo;
  onDone: () => void;   // этап выполнен (для аналитики)
  onNext: () => void;   // кнопка «Дальше»
  liked: Set<string>;   // направления, отмеченные «Хочу здесь работать»
  onToggleLike: (direction: string) => void;
  onSkip: () => void;   // «Сразу к вакансиям»
};

/** Один этап производства: действие (нажатия или удержание) → анимация → факт и профессии. */
export default function TourStage({ stage, index, total, color, roleInfo, onDone, onNext, liked, onToggleLike, onSkip }: Props) {
  const [p, setP] = useState(0);
  const [pulse, setPulse] = useState(0);
  const [holding, setHolding] = useState(false);
  const holdRef = useRef(false);
  const raf = useRef(0);
  const last = useRef(0);
  const done = p >= 1;
  const a = stage.action;

  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  useEffect(() => {
    if (!done) return;
    stopHold();
    navigator.vibrate?.(30);
    onDone();
  }, [done]); // eslint-disable-line react-hooks/exhaustive-deps

  function tap() {
    if (done || a.type !== 'tap') return;
    setPulse((x) => x + 1);
    setP((v) => Math.min(1, v + 1 / a.count + 1e-9));
    navigator.vibrate?.(10);
  }

  function frame(t: number) {
    if (!holdRef.current || a.type !== 'hold') return;
    const dt = Math.min(64, t - last.current); // защита от скачка после сворачивания вкладки
    last.current = t;
    setP((v) => Math.min(1, v + dt / a.ms));
    raf.current = requestAnimationFrame(frame);
  }
  function startHold() {
    if (done || a.type !== 'hold' || holdRef.current) return;
    holdRef.current = true;
    setHolding(true);
    last.current = performance.now();
    raf.current = requestAnimationFrame(frame);
  }
  function stopHold() {
    holdRef.current = false;
    setHolding(false);
    cancelAnimationFrame(raf.current);
  }

  const holdHandlers = a.type === 'hold' ? {
    onPointerDown: (e: PointerEvent<HTMLButtonElement>) => { e.currentTarget.setPointerCapture?.(e.pointerId); startHold(); },
    onPointerUp: stopHold,
    onPointerCancel: stopHold,
    onLostPointerCapture: stopHold,
    onKeyDown: (e: KeyboardEvent) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); startHold(); } },
    onKeyUp: (e: KeyboardEvent) => { if (e.key === ' ' || e.key === 'Enter') stopHold(); },
    onContextMenu: (e: { preventDefault: () => void }) => e.preventDefault(),
  } : { onClick: tap };

  const hint = a.type === 'tap'
    ? `${Math.round(p * a.count)} из ${a.count}`
    : holding ? 'Держи…' : p > 0 ? 'Ещё немного — держи' : 'Нажми и держи';

  return (
    <>
      <p className="eyebrow">Этап {index + 1} из {total} · {stage.title}</p>
      <p className="lead tour-text">{stage.text}</p>

      <div className="tour-stage">
        <TourVisual kind={stage.visual} p={p} active={holding} pulse={pulse} color={color} />
        {done && <div className="done-badge" aria-live="polite">Готово!</div>}
      </div>

      {!done && (
        <>
          <button className={'btn primary action' + (holding ? ' holding' : '') + (a.type === 'hold' ? ' hold' : '')}
            style={a.type === 'hold' ? { ['--p' as string]: p } : undefined} {...holdHandlers}>
            {a.label}
          </button>
          <p className="note center small">{hint}</p>
        </>
      )}

      {done && (
        <div className="tour-reveal">
          <div className="fact"><b>Факт.</b> {stage.fact}</div>
          <p className="who-title">Кто здесь работает</p>
          <ul className="who">
            {stage.roles.map((r) => {
              const info = roleInfo(r.direction);
              return (
                <li key={r.role}>
                  <img src={info.icon} alt="" />
                  <div><b>{r.role}</b><small>{info.title} · зарплата {nb(info.salary)}</small></div>
                  <button type="button" className={'like' + (liked.has(r.direction) ? ' on' : '')}
                    aria-pressed={liked.has(r.direction)} onClick={() => onToggleLike(r.direction)}>
                    <Icon name={liked.has(r.direction) ? 'heartFilled' : 'heart'} size={16} />
                    {liked.has(r.direction) ? 'Интересно' : 'Хочу здесь работать'}
                  </button>
                </li>
              );
            })}
          </ul>
          <button className="btn primary" onClick={onNext}>{index + 1 < total ? 'Дальше' : 'Финал'}</button>
        </div>
      )}
      <button type="button" className="skip" onClick={onSkip}>Сразу к вакансиям <Icon name="arrowRight" size={14} /></button>
    </>
  );
}
