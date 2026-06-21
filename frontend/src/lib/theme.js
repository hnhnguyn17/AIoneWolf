/**
 * src/lib/theme.js
 * ─────────────────────────────────────────────────────────────
 * Theme SÁNG/TỐI cho các màn NGOÀI game (Lobby, Profile, WaitingRoom).
 *
 * Quy ước (theo yêu cầu):
 *   - NGOÀI game: theme theo NGƯỜI DÙNG chọn, lưu localStorage (giữ qua phiên).
 *   - TRONG game: KHÔNG dùng cái này — màn game tự đổi sáng/tối theo PHA
 *     (GameBoardDay = ngày, NightScreen = đêm).
 *
 * Giá trị: 'day' (sáng) | 'night' (tối). Mặc định 'night' (đúng tông VOIR_ABYSS).
 * Đồng bộ qua localStorage + custom event để mọi component cùng cập nhật.
 */
import { useEffect, useState } from 'react';

const KEY = 'aionewolf-theme';
const EVENT = 'aionewolf-theme-change';

/** Đọc theme đã lưu (mặc định 'night'). */
export function getTheme() {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'day' || v === 'night' ? v : 'night';
  } catch {
    return 'night';
  }
}

/** Ghi theme + phát event để các hook khác đồng bộ. */
export function setTheme(theme) {
  const t = theme === 'day' ? 'day' : 'night';
  try {
    localStorage.setItem(KEY, t);
  } catch {
    /* ignore */
  }
  // Phản ánh lên <html data-theme> để CSS/đồ hoạ ngoài React cũng dùng được.
  try {
    document.documentElement.dataset.theme = t;
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: t }));
  return t;
}

/**
 * Hook theme cho màn NGOÀI game.
 * @returns {{ theme:'day'|'night', isDay:boolean, toggle:()=>void, set:(t)=>void }}
 */
export function useUserTheme() {
  const [theme, setLocal] = useState(getTheme);

  useEffect(() => {
    // Áp ngay khi mount (đề phòng lần đầu chưa set data-theme).
    document.documentElement.dataset.theme = theme;
    const onChange = (e) => setLocal(e.detail || getTheme());
    const onStorage = (e) => { if (e.key === KEY) setLocal(getTheme()); };
    window.addEventListener(EVENT, onChange);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener('storage', onStorage);
    };
  }, [theme]);

  return {
    theme,
    isDay: theme === 'day',
    toggle: () => setLocal(setTheme(theme === 'day' ? 'night' : 'day')),
    set: (t) => setLocal(setTheme(t)),
  };
}

export default useUserTheme;
