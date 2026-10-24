/** Линейные иконки в стиле фирменных пиктограмм «Очаково» (вместо эмодзи). */
type Name = 'arrowRight' | 'arrowLeft' | 'heart' | 'heartFilled' | 'share' | 'check' | 'close' | 'medal' | 'play';

const PATHS: Record<Name, JSX.Element> = {
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  arrowLeft: <path d="M19 12H5M11 6l-6 6 6 6" />,
  heart: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  heartFilled: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" fill="currentColor" />,
  share: <><path d="M12 15V4M7.5 8.5 12 4l4.5 4.5" /><path d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" /></>,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  medal: <><circle cx="12" cy="15" r="5" /><path d="M9 10.5 6.5 3h4L12 7l1.5-4h4L15 10.5" /><path d="m12 13 .9 1.8 2 .3-1.4 1.4.3 2-1.8-1-1.8 1 .3-2-1.4-1.4 2-.3z" fill="currentColor" stroke="none" /></>,
  play: <><rect x="3.5" y="5" width="17" height="14" rx="3" /><path d="m10.5 9.5 4 2.5-4 2.5z" fill="currentColor" /></>,
};

export default function Icon({ name, size = 18, className = '' }: { name: Name; size?: number; className?: string }) {
  return (
    <svg className={'icon ' + className} width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {PATHS[name]}
    </svg>
  );
}
