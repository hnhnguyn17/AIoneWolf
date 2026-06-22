import { useState, useEffect } from 'react';

export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // Ngăn trình duyệt tự hiển thị mini-infobar
      e.preventDefault();
      // Lưu lại event để kích hoạt khi người dùng bấm nút
      setInstallPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const promptInstall = async () => {
    if (!installPrompt) return;
    // Hiển thị hộp thoại cài đặt
    installPrompt.prompt();
    // Đợi người dùng phản hồi
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    // Không thể dùng lại event này, clear nó đi
    setInstallPrompt(null);
  };

  return { isInstallable, promptInstall };
}
