// Откуда пришёл человек: ?from=hh | friend | excursion | fair | ads (vk, tg → ads).
// Запоминаем на время визита, чтобы метка не терялась при переходах по сайту.
const KEY = 'ochakovo_from';
const ALIASES: Record<string, string> = { vk: 'ads', tg: 'ads', telegram: 'ads', ad: 'ads', ads: 'ads',
  hh: 'hh', friend: 'friend', excursion: 'excursion', fair: 'fair', qr: 'fair' };

export const source: string | null = (() => {
  try {
    const raw = new URLSearchParams(location.search).get('from')?.toLowerCase() ?? '';
    const v = ALIASES[raw] ?? null;
    if (v) sessionStorage.setItem(KEY, v);
    return v ?? sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
})();

/** «Отправь другу»: системное меню «Поделиться» на телефоне или копирование ссылки. */
export async function shareWithFriend(): Promise<'shared' | 'copied' | 'failed'> {
  const url = `${location.origin}/?from=friend`;
  const text = 'Смотри: оплачиваемая стажировка в «Очаково» от 60 000 ₽ — и можно самому запустить линию розлива';
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Стажировка в «Очаково»', text, url });
      return 'shared';
    }
  } catch (e) {
    if ((e as Error).name === 'AbortError') return 'failed'; // пользователь закрыл меню
  }
  try {
    await navigator.clipboard.writeText(`${text}: ${url}`);
    return 'copied';
  } catch {
    return 'failed';
  }
}
