import { useState, useEffect } from 'react';

export default function LandscapePrompt() {
  const [isPortraitMobile, setIsPortraitMobile] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      // Chỉ ép xoay ngang khi đang ở chế độ dọc VÀ màn hình nhỏ (mobile/tablet < 1024px)
      const isPortrait = window.matchMedia('(orientation: portrait)').matches;
      const isMobile = window.innerWidth <= 1024 || window.innerHeight <= 1024;
      setIsPortraitMobile(isPortrait && isMobile);
    };

    // Kiểm tra lúc mount
    checkOrientation();

    // Lắng nghe thay đổi kích thước/xoay màn hình
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  if (!isPortraitMobile) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-void flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
      <div className="glass-panel p-8 rounded-2xl flex flex-col items-center gap-6 max-w-sm w-full relative overflow-hidden">
        {/* Radar background effect */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,219,231,0.1)_0%,transparent_70%)] pointer-events-none" />
        
        <span className="material-symbols-outlined text-surface-tint text-[64px] animate-pulse">
          screen_rotation
        </span>
        
        <h2 className="font-headline-md text-2xl text-surface-tint tracking-tight">
          Yêu Cầu Xoay Ngang
        </h2>
        
        <p className="font-body-md text-on-surface-variant leading-relaxed">
          Trải nghiệm Echoes of the Lycan tốt nhất khi cầm ngang thiết bị. Vui lòng xoay thiết bị của bạn để tiếp tục.
        </p>

        <div className="mt-4 flex gap-2">
          <div className="w-2 h-2 rounded-full bg-surface-tint animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-surface-tint animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-surface-tint animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}
