/**
 * Анимированные сцены экскурсии. Каждая рисуется в SVG 200×150 и зависит от:
 *  p      — прогресс этапа 0..1 (сколько уже сделано);
 *  active — игрок сейчас держит кнопку (для hold-этапов);
 *  pulse  — счётчик нажатий: смена значения перезапускает анимацию «падения».
 */
type Props = { kind: string; p: number; active: boolean; pulse: number; color: string };

const RED = '#d50032';
const INK = '#3a3a3a';
const clamp = (v: number) => Math.max(0, Math.min(1, v));

export default function TourVisual(props: Props) {
  const V = VISUALS[props.kind] ?? Hopper;
  return (
    <svg className={'tour-visual' + (props.active ? ' active' : '') + (props.p >= 1 ? ' done' : '')}
      viewBox="0 0 200 150" role="img" aria-hidden>
      <V {...props} />
    </svg>
  );
}

/** Падающие частицы: перезапускаются при каждом нажатии (key = pulse). */
function Drops({ pulse, color, x, y, shape = 'grain' }: { pulse: number; color: string; x: number; y: number; shape?: 'grain' | 'cube' }) {
  if (!pulse) return null;
  return (
    <g key={pulse}>
      {[-14, -6, 2, 10, 16].map((dx, i) =>
        shape === 'cube'
          ? <rect key={i} className="drop" style={{ animationDelay: `${i * 40}ms` }} x={x + dx} y={y} width="6" height="6" rx="1" fill="#fff" stroke={INK} strokeWidth="1" />
          : <ellipse key={i} className="drop" style={{ animationDelay: `${i * 40}ms` }} cx={x + dx} cy={y} rx="2.6" ry="4" fill={color} />)}
    </g>
  );
}

/** Солод в бункер: уровень растёт, зерно падает при каждом нажатии. */
function Hopper({ p, pulse }: Props) {
  const level = 70 * clamp(p);
  return (
    <>
      <defs><clipPath id="hop"><path d="M45 30 H155 L118 100 H82 Z" /></clipPath></defs>
      <rect clipPath="url(#hop)" x="40" y={100 - level} width="120" height={level} fill="#d9a441" className="level" />
      <path d="M45 30 H155 L118 100 H82 Z" fill="none" stroke={RED} strokeWidth="3" strokeLinejoin="round" />
      <rect x="88" y="100" width="24" height="16" fill="none" stroke={RED} strokeWidth="3" />
      <rect x="60" y="128" width="80" height="8" rx="4" fill="#eee" />
      <Drops pulse={pulse} color="#c8862e" x={100} y={8} />
    </>
  );
}

/** Котёл: термометр заполняется, пока держишь; появляется пар. */
function Kettle({ p, color }: Props) {
  return (
    <>
      <defs><clipPath id="ket"><rect x="45" y="50" width="90" height="72" rx="14" /></clipPath></defs>
      <rect clipPath="url(#ket)" x="45" y="70" width="90" height="60" fill={color} opacity={0.35 + 0.65 * p} className="level" />
      <rect x="45" y="50" width="90" height="72" rx="14" fill="none" stroke={RED} strokeWidth="3" />
      <rect x="40" y="42" width="100" height="10" rx="5" fill="none" stroke={RED} strokeWidth="3" />
      <rect x="62" y="122" width="8" height="14" fill={RED} /><rect x="110" y="122" width="8" height="14" fill={RED} />
      {[70, 90, 110].map((x, i) => (
        <path key={x} className="steam" style={{ opacity: clamp(p * 1.6 - 0.3), animationDelay: `${i * 0.35}s` }}
          d={`M${x} 36 q-6 -8 0 -16 q6 -8 0 -16`} fill="none" stroke="#bbb" strokeWidth="3" strokeLinecap="round" />
      ))}
      <rect x="160" y="40" width="12" height="90" rx="6" fill="#f3f3f3" stroke={INK} strokeWidth="1.5" />
      <rect x="162" y={128 - 86 * p} width="8" height={86 * p} rx="4" fill={RED} className="level" />
      <circle cx="166" cy="134" r="8" fill={RED} />
    </>
  );
}

/** Бродильный танк: с каждой порцией закваски пузырьков больше. */
function Ferment({ p, color }: Props) {
  const n = Math.round(14 * clamp(p));
  const spots = [62, 78, 94, 110, 126, 70, 86, 102, 118, 134, 66, 98, 122, 90];
  return (
    <>
      <defs><clipPath id="tank"><rect x="55" y="18" width="90" height="116" rx="18" /></clipPath></defs>
      <rect clipPath="url(#tank)" x="55" y="40" width="90" height="100" fill={color} opacity="0.85" />
      <g clipPath="url(#tank)">
        {spots.slice(0, n).map((x, i) => (
          <circle key={i} className="bubble" style={{ animationDelay: `${(i * 0.23) % 1.6}s` }} cx={x} cy="130" r={2 + (i % 3)} fill="#fff" opacity="0.8" />
        ))}
      </g>
      <rect x="55" y="18" width="90" height="116" rx="18" fill="none" stroke={RED} strokeWidth="3" />
      <rect x="70" y="134" width="8" height="10" fill={RED} /><rect x="122" y="134" width="8" height="10" fill={RED} />
      <circle cx="160" cy="40" r="11" fill="#fff" stroke={INK} strokeWidth="1.5" />
      <line x1="160" y1="40" x2={160 + 8 * Math.cos(Math.PI * (1.1 + p))} y2={40 + 8 * Math.sin(Math.PI * (1.1 + p))} stroke={RED} strokeWidth="2" strokeLinecap="round" />
    </>
  );
}

/** Лаборатория: три пробирки, каждая проба — зелёная галочка. */
function Lab({ p, color, pulse }: Props) {
  const checked = Math.round(3 * clamp(p));
  return (
    <>
      <rect x="30" y="118" width="140" height="10" rx="3" fill="#e9e9e9" />
      {[60, 100, 140].map((x, i) => {
        const ok = i < checked;
        return (
          <g key={x} className={ok ? 'tube ok' : 'tube'}>
            <path d={`M${x - 10} 40 v62 a10 10 0 0 0 20 0 v-62`} fill="#fff" stroke={INK} strokeWidth="2" />
            <path d={`M${x - 8} 72 v30 a8 8 0 0 0 16 0 v-30 z`} fill={color} opacity="0.85" />
            <line x1={x - 14} y1="40" x2={x + 14} y2="40" stroke={INK} strokeWidth="2" />
            {ok && (
              <g className="check">
                <circle cx={x} cy="22" r="10" fill="#1f9d55" />
                <path d={`M${x - 5} 22 l3.5 4 l6.5 -8`} fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </g>
            )}
          </g>
        );
      })}
      {pulse > 0 && checked < 3 && <rect key={pulse} className="scan" x="30" y="40" width="140" height="3" fill={RED} opacity="0.5" />}
    </>
  );
}

const BOTTLE = 'M90 34 h20 v14 q14 9 14 25 v52 q0 7 -7 7 h-34 q-7 0 -7 -7 v-52 q0 -16 14 -25 z';

/** Розлив: конвейер едет, пока держишь; бутылка наполняется, потом крышка и этикетка. */
function Bottle({ p, color }: Props) {
  const h = 84 * clamp(p);
  return (
    <>
      <defs><clipPath id="btl"><path d={BOTTLE} /></clipPath></defs>
      <rect clipPath="url(#btl)" x="70" y={132 - h} width="60" height={h} fill={color} className="level" />
      <path d={BOTTLE} fill="none" stroke={RED} strokeWidth="3" strokeLinejoin="round" />
      {p >= 1 && <rect className="pop-in" x="88" y="26" width="24" height="9" rx="2" fill={RED} />}
      {p > 0.6 && <rect className="pop-in" x="75" y="88" width="50" height="22" rx="3" fill="#fff" stroke={RED} strokeWidth="2" />}
      {p > 0.6 && <text className="pop-in" x="100" y="102" textAnchor="middle" fontSize="7.5" fontWeight="800" fill={RED}>ОЧАКОВО</text>}
      <rect x="10" y="134" width="180" height="10" rx="5" fill="#ddd" />
      <line className="belt" x1="14" y1="139" x2="186" y2="139" stroke="#999" strokeWidth="3" strokeDasharray="8 8" />
      {p < 1 && <path d="M100 6 v18" stroke={color} strokeWidth="4" strokeLinecap="round" className="stream" opacity={p > 0 ? 1 : 0.25} />}
    </>
  );
}

/** Склад: паллеты по одной уезжают в фуру, полная фура уезжает. */
function Truck({ p }: Props) {
  const loaded = Math.round(3 * clamp(p));
  return (
    <>
      <g className={p >= 1 ? 'truck go' : 'truck'}>
        <rect x="96" y="40" width="74" height="70" rx="4" fill="#fff" stroke={RED} strokeWidth="3" />
        <path d="M170 64 h16 l10 18 v28 h-26 z" fill={RED} />
        <circle cx="116" cy="114" r="9" fill={INK} /><circle cx="180" cy="114" r="9" fill={INK} />
        {Array.from({ length: loaded }).map((_, i) => (
          <rect key={i} className="pop-in" x={102 + i * 22} y="78" width="18" height="26" rx="2" fill="#d9a441" stroke={INK} strokeWidth="1.2" />
        ))}
        <text x="133" y="62" textAnchor="middle" fontSize="9" fontWeight="800" fill={RED}>ОЧАКОВО</text>
      </g>
      {Array.from({ length: 3 - loaded }).map((_, i) => (
        <g key={i}>
          <rect x={14 + i * 26} y="96" width="20" height="26" rx="2" fill="#d9a441" stroke={INK} strokeWidth="1.2" />
          <rect x={12 + i * 26} y="122" width="24" height="4" fill="#a87b3a" />
        </g>
      ))}
      <rect x="0" y="126" width="200" height="4" fill="#e3e3e3" />
    </>
  );
}

/** Сироп: кубики сахара падают в кастрюлю, уровень и цвет растут. */
function Syrup({ p, pulse, color }: Props) {
  return (
    <>
      <defs><clipPath id="pot"><path d="M50 60 h100 v52 q0 18 -18 18 h-64 q-18 0 -18 -18 z" /></clipPath></defs>
      <rect clipPath="url(#pot)" x="50" y={124 - 56 * clamp(p) - 6} width="100" height="80" fill={color} opacity={0.25 + 0.6 * p} className="level" />
      <path d="M50 60 h100 v52 q0 18 -18 18 h-64 q-18 0 -18 -18 z" fill="none" stroke={RED} strokeWidth="3" />
      <line x1="38" y1="66" x2="50" y2="66" stroke={RED} strokeWidth="4" strokeLinecap="round" />
      <line x1="150" y1="66" x2="162" y2="66" stroke={RED} strokeWidth="4" strokeLinecap="round" />
      <Drops pulse={pulse} color="#fff" x={100} y={10} shape="cube" />
    </>
  );
}

/** Вкус: фрукты по одному «ныряют» в стакан, напиток окрашивается. */
function Flavor({ p, color }: Props) {
  const added = Math.round(3 * clamp(p));
  const fruits = ['/icons/citrus.png', '/icons/apple.png', '/icons/pear.png'];
  return (
    <>
      <defs><clipPath id="glass"><path d="M66 58 h68 l-8 74 h-52 z" /></clipPath></defs>
      <rect clipPath="url(#glass)" x="60" y={132 - 70 * (0.3 + 0.7 * clamp(p))} width="80" height="80" fill={color} opacity={0.3 + 0.6 * p} className="level" />
      <path d="M66 58 h68 l-8 74 h-52 z" fill="none" stroke={RED} strokeWidth="3" strokeLinejoin="round" />
      {fruits.map((src, i) => (
        <image key={src} href={src} className={i < added ? 'fruit in' : 'fruit'} x={22 + i * 56} y="4" width="40" height="40" />
      ))}
    </>
  );
}

/** Газирование: пока держишь, в бутылке бегут пузырьки. */
function Fizz({ p, active, color }: Props) {
  const n = Math.round(16 * clamp(p));
  const xs = [86, 94, 102, 110, 90, 106, 98, 114, 88, 100, 112, 92, 104, 96, 108, 100];
  return (
    <>
      <defs><clipPath id="fz"><path d={BOTTLE} /></clipPath></defs>
      <rect clipPath="url(#fz)" x="70" y="50" width="60" height="84" fill={color} opacity="0.8" />
      <g clipPath="url(#fz)">
        {xs.slice(0, n).map((x, i) => (
          <circle key={i} className={'bubble' + (active || p >= 1 ? '' : ' slow')} style={{ animationDelay: `${(i * 0.17) % 1.2}s` }} cx={x} cy="128" r={1.5 + (i % 3) * 0.8} fill="#fff" />
        ))}
      </g>
      <path d={BOTTLE} fill="none" stroke={RED} strokeWidth="3" strokeLinejoin="round" />
      <rect x="88" y="26" width="24" height="9" rx="2" fill={RED} />
      <rect x="146" y="60" width="26" height="64" rx="8" fill="#eef3f7" stroke={INK} strokeWidth="1.5" />
      <text x="159" y="96" textAnchor="middle" fontSize="10" fontWeight="800" fill={INK}>CO₂</text>
      <path d="M146 92 h-20" stroke={INK} strokeWidth="2" strokeDasharray={active ? '4 3' : '0'} className={active ? 'flow' : ''} />
    </>
  );
}

const VISUALS: Record<string, (p: Props) => JSX.Element> = {
  hopper: Hopper, kettle: Kettle, ferment: Ferment, lab: Lab, bottle: Bottle, truck: Truck,
  syrup: Syrup, flavor: Flavor, fizz: Fizz,
};
