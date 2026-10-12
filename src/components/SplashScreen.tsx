import React, { useState, useEffect } from 'react';
import { DukkanaLogo } from './DukkanaLogo';
import { Sparkles, X } from 'lucide-react';

interface SplashScreenProps {
  onFinish?: () => void;
  duration?: number;
  allowManualClose?: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  duration = 1600,
  allowManualClose = true,
}) => {
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [progress, setProgress] = useState(10);

  useEffect(() => {
    // Smooth progress increment
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return 95;
        }
        return prev + 15;
      });
    }, duration / 8);

    // Trigger fade out
    const fadeTimer = setTimeout(() => {
      setProgress(100);
      setIsFadingOut(true);
    }, duration);

    // Call onFinish after fade transition completes
    const endTimer = setTimeout(() => {
      if (onFinish) {
        onFinish();
      }
    }, duration + 500);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(fadeTimer);
      clearTimeout(endTimer);
    };
  }, [duration, onFinish]);

  const handleManualDismiss = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      if (onFinish) onFinish();
    }, 300);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="شاشة بدء دكانة"
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-between p-6 sm:p-10 select-none overflow-hidden transition-all duration-500 bg-gradient-to-br from-[#240642] via-[#3b0764] to-[#1e0538] text-white ${
        isFadingOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Ambient Animated Purple Aura (Strictly purple/violet - NO yellow, NO blue) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[500px] h-[340px] sm:h-[500px] bg-purple-600/25 rounded-full blur-[100px] pointer-events-none animate-pulse duration-1000" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[220px] sm:w-[320px] h-[220px] sm:h-[320px] bg-purple-400/20 rounded-full blur-[70px] pointer-events-none" />

      {/* Top Header Row with Skip / Close Option */}
      <div className="w-full flex items-center justify-between z-10 max-w-lg">
        <div className="flex items-center gap-1.5 text-purple-300/80 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-purple-300" />
          <span>السوق العراقي الرقمي الموثوق</span>
        </div>

        {allowManualClose && (
          <button
            onClick={handleManualDismiss}
            className="text-xs bg-purple-950/60 hover:bg-purple-900 border border-purple-500/30 text-purple-200 px-3 py-1 rounded-full transition flex items-center gap-1 cursor-pointer"
            aria-label="تخطي شاشة البداية"
          >
            <span>تخطي</span>
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Central Brand Lockup */}
      <div className="flex flex-col items-center justify-center my-auto z-10 space-y-6 text-center animate-in zoom-in-95 duration-500">
        {/* Modern Purple Gradient SVG Logo */}
        <DukkanaLogo
          size="splash"
          variant="stacked"
          theme="white"
          showSubline={true}
          sublineText="سوقك العراقي الموثوق • 19 محافظة"
        />

        {/* Brand Core Values Tagline */}
        <div className="flex items-center gap-2 text-xs font-medium text-purple-200/90 pt-2">
          <span>دفع نقدي عند الاستلام</span>
          <span className="text-purple-400 opacity-60">•</span>
          <span>تجار محليون موثوقون</span>
          <span className="text-purple-400 opacity-60">•</span>
          <span>ضمان أصالة المنتجات</span>
        </div>
      </div>

      {/* Bottom Progress Bar & Version Info */}
      <div className="w-full max-w-xs flex flex-col items-center gap-3 z-10 pb-4">
        {/* Purple Gradient Progress Bar (NO yellow, NO blue) */}
        <div className="w-full bg-purple-950/80 h-1.5 rounded-full overflow-hidden border border-purple-800/60 shadow-inner">
          <div
            className="bg-gradient-to-r from-purple-400 via-purple-300 to-purple-100 h-full rounded-full transition-all duration-300 ease-out shadow-sm shadow-purple-400/50"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between w-full text-[11px] text-purple-300/70">
          <span>جاري تجهيز السوق...</span>
          <span>{progress}%</span>
        </div>

        <span className="text-[10px] text-purple-400/60 tracking-wider">
          دُكَّانَة © 2026 • متوافق مع معايير Apple & Google
        </span>
      </div>
    </div>
  );
};
