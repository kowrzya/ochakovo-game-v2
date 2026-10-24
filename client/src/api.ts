import { source } from './source';
// Идентификатор прохождения (без персональных данных) — для воронки в HR-панели.
const KEY = 'ochakovo_session';
function newId() {
  return (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36));
}
export const sessionId: string = (() => {
  try {
    const id = sessionStorage.getItem(KEY) || newId();
    sessionStorage.setItem(KEY, id);
    return id;
  } catch {
    return newId();
  }
})();

export type EventType = 'open' | 'start' | 'scene' | 'finish' | 'apply';

/** Отправка события. Ошибки сети не мешают игре. */
export function track(type: EventType, extra: { scene?: string; direction?: string } = {}) {
  fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, type, source, ...extra }),
    keepalive: true,
  }).catch(() => {});
}

export async function api<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });
  const body = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw Object.assign(new Error(body?.error || `HTTP ${res.status}`), { status: res.status, body });
  return body as T;
}
