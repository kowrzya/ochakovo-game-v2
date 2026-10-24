import { useEffect, useState } from 'react';

const COLORS = ['#d50032', '#ff5c7a', '#626262', '#f2c94c', '#ffffff'];

/** Короткое конфетти без библиотек. Само исчезает через 3 с; при «уменьшить движение» не показывается. */
export default function Confetti() {
  const [show, setShow] = useState(
    () => !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const t = setTimeout(() => setShow(false), 3000);
    return () => clearTimeout(t);
  }, []);
  const [pieces] = useState(() =>
    Array.from({ length: 36 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.6,
      duration: 1.6 + Math.random() * 1.2,
      color: COLORS[i % COLORS.length],
      rotate: Math.random() * 360,
      size: 6 + Math.random() * 6,
    })),
  );
  if (!show) return null;
  return (
    <div className="confetti" aria-hidden>
      {pieces.map((p, i) => (
        <i key={i} style={{
          left: `${p.left}%`, background: p.color, width: p.size, height: p.size * 0.45,
          animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s`, transform: `rotate(${p.rotate}deg)`,
        }} />
      ))}
    </div>
  );
}
