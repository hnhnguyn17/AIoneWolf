/**
 * src/components/ThemeToggle.jsx
 * ─────────────────────────────────────────────────────────────
 * Nút bật/tắt theme SÁNG/TỐI cho các màn NGOÀI game (Lobby…).
 * Lưu lựa chọn vào localStorage qua useUserTheme. KHÔNG ảnh hưởng
 * màn trong game — game tự đổi sáng/tối theo pha.
 */
import { useUserTheme } from '../lib/theme.js';

export default function ThemeToggle({ className = '' }) {
  const { isDay, toggle } = useUserTheme();
  return (
    <button
      onClick={toggle}
      title={isDay ? 'Đang: Sáng — bấm để chuyển Tối' : 'Đang: Tối — bấm để chuyển Sáng'}
      aria-label="Đổi giao diện sáng/tối"
      className={`flex items-center gap-2 px-3 py-2 rounded-full border border-outline-variant/40 bg-surface-container/40 text-on-surface hover:border-surface-tint/60 transition-colors ${className}`}
    >
      <span className="material-symbols-outlined text-surface-tint text-[20px]">
        {isDay ? 'light_mode' : 'dark_mode'}
      </span>
      <span className="font-button text-button normal-case hidden sm:inline">
        {isDay ? 'Sáng' : 'Tối'}
      </span>
    </button>
  );
}
