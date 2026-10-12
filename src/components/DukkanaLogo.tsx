import React, { useId } from 'react';

export interface DukkanaLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'splash';
  variant?: 'full' | 'compact' | 'icon' | 'badge' | 'stacked' | 'wordmark';
  theme?: 'dark' | 'light' | 'white' | 'purple';
  showSubline?: boolean;
  className?: string;
  sublineText?: string;
}

/**
 * Integrated Shopping Cart "D" Glyph:
 * The capital letter "D" seamlessly merged with a sleek modern shopping cart:
 * handle on top-left, cart basket formed by the "D" bowl with inner wire mesh,
 * and two miniature cart wheels at the bottom.
 * Strictly purple / white / lavender gradients without yellow or blue.
 */
export const DCartGlyph: React.FC<{
  className?: string;
  theme?: 'dark' | 'light' | 'white' | 'purple';
  idPrefix?: string;
}> = ({ className = 'w-4 h-4', theme = 'dark', idPrefix = 'dcart' }) => {
  const isWhite = theme === 'white' || theme === 'light';

  return (
    <svg
      viewBox="0 0 34 34"
      className={`inline-block shrink-0 ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="D - Shopping Cart"
    >
      <defs>
        <linearGradient id={`${idPrefix}-grad`} x1="0%" y1="0%" x2="100%" y2="100%">
          {isWhite ? (
            <>
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#E9D5FF" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#A855F7" />
              <stop offset="50%" stopColor="#9333EA" />
              <stop offset="100%" stopColor="#6B21A8" />
            </>
          )}
        </linearGradient>
      </defs>

      {/* Cart Handle at top-left extending back */}
      <path
        d="M2.5 8.5 H7.5"
        stroke={`url(#${idPrefix}-grad)`}
        strokeWidth="2.8"
        strokeLinecap="round"
      />

      {/* Cart Basket & Letter 'D' Outer Body */}
      <path
        d="M7.5 7 H19.5 C26 7, 29.5 11, 29.5 16.5 C29.5 22, 26 26, 19.5 26 H7.5 Z"
        fill={`url(#${idPrefix}-grad)`}
      />

      {/* Inner Cutout of the 'D' (Basket Hollow) */}
      <path
        d="M11.5 10.5 H18.5 C22.5 10.5, 25 13, 25 16.5 C25 20, 22.5 22.5, 18.5 22.5 H11.5 Z"
        fill={isWhite ? '#581C87' : '#FFFFFF'}
      />

      {/* Shopping Cart Wire Grill Details */}
      <line
        x1="12"
        y1="14.5"
        x2="23"
        y2="14.5"
        stroke={`url(#${idPrefix}-grad)`}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeOpacity={isWhite ? '0.9' : '0.55'}
      />
      <line
        x1="12"
        y1="18.5"
        x2="22"
        y2="18.5"
        stroke={`url(#${idPrefix}-grad)`}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeOpacity={isWhite ? '0.9' : '0.55'}
      />

      {/* Wheel Axle Mounts */}
      <path
        d="M10.5 26 L11.5 28.5"
        stroke={`url(#${idPrefix}-grad)`}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M20.5 26 L21.5 28.5"
        stroke={`url(#${idPrefix}-grad)`}
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Cart Wheels under the 'D' */}
      <circle cx="11.5" cy="30" r="2.4" fill={`url(#${idPrefix}-grad)`} />
      <circle cx="11.5" cy="30" r="0.9" fill={isWhite ? '#581C87' : '#FFFFFF'} />

      <circle cx="21.5" cy="30" r="2.4" fill={`url(#${idPrefix}-grad)`} />
      <circle cx="21.5" cy="30" r="0.9" fill={isWhite ? '#581C87' : '#FFFFFF'} />
    </svg>
  );
};

export const DukkanaLogo: React.FC<DukkanaLogoProps> = ({
  size = 'md',
  variant = 'full',
  theme = 'dark',
  showSubline = true,
  className = '',
  sublineText = 'سوقك العراقي الموثوق',
}) => {
  const uniqueId = useId().replace(/:/g, '');

  // Sizing matrix
  const dimensions = {
    xs: {
      icon: 'w-7 h-7',
      arabicText: 'text-base',
      englishText: 'text-[10px]',
      dCartSize: 'w-3 h-3',
      subtext: 'text-[8.5px]',
      gap: 'gap-2',
    },
    sm: {
      icon: 'w-8 h-8',
      arabicText: 'text-lg',
      englishText: 'text-[11px]',
      dCartSize: 'w-3.5 h-3.5',
      subtext: 'text-[9.5px]',
      gap: 'gap-2.5',
    },
    md: {
      icon: 'w-10 h-10',
      arabicText: 'text-2xl',
      englishText: 'text-xs',
      dCartSize: 'w-4 h-4',
      subtext: 'text-[10.5px]',
      gap: 'gap-2.5',
    },
    lg: {
      icon: 'w-13 h-13',
      arabicText: 'text-3xl',
      englishText: 'text-sm',
      dCartSize: 'w-4.5 h-4.5',
      subtext: 'text-xs',
      gap: 'gap-3',
    },
    xl: {
      icon: 'w-16 h-16',
      arabicText: 'text-4xl',
      englishText: 'text-base',
      dCartSize: 'w-5.5 h-5.5',
      subtext: 'text-sm',
      gap: 'gap-3.5',
    },
    splash: {
      icon: 'w-24 h-24 sm:w-28 sm:h-28',
      arabicText: 'text-4xl sm:text-5xl',
      englishText: 'text-lg sm:text-xl',
      dCartSize: 'w-7 h-7 sm:w-8 sm:h-8',
      subtext: 'text-sm sm:text-base',
      gap: 'gap-5',
    },
  }[size];

  // Theme text colors - strictly purple / lavender / white, NO yellow, NO blue
  const arabicColor =
    theme === 'white'
      ? 'text-white drop-shadow-sm'
      : theme === 'light'
      ? 'text-purple-100'
      : 'bg-gradient-to-l from-purple-950 via-purple-800 to-purple-900 bg-clip-text text-transparent';

  const englishColor =
    theme === 'white'
      ? 'text-purple-200'
      : theme === 'light'
      ? 'text-purple-200'
      : 'text-purple-800';

  const sublineColor =
    theme === 'white'
      ? 'text-purple-200/80'
      : theme === 'light'
      ? 'text-purple-300'
      : 'text-purple-900/60';

  // SVG Icon Symbol (Shopping Bag & Cart merged with Arabic Dal "د", 100% purple gradient palette)
  const IconSymbol = (
    <div
      className={`relative ${dimensions.icon} rounded-2xl bg-gradient-to-br from-purple-950 via-purple-800 to-purple-600 p-0.5 shadow-md shadow-purple-950/20 shrink-0 select-none overflow-hidden group-hover:scale-105 transition-transform duration-300`}
    >
      {/* Ambient Purple Glow (strictly purple/violet, no yellow, no blue) */}
      <div className="absolute inset-0 bg-gradient-to-tr from-purple-600/30 via-purple-400/20 to-transparent pointer-events-none" />

      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Pure purple & white gradients */}
          <linearGradient id={`bagGrad-${uniqueId}`} x1="0" y1="0" x2="0" y2="100">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#F3E8FF" />
          </linearGradient>

          <linearGradient id={`purpleShine-${uniqueId}`} x1="0" y1="0" x2="100" y2="100">
            <stop offset="0%" stopColor="#E9D5FF" />
            <stop offset="50%" stopColor="#C084FC" />
            <stop offset="100%" stopColor="#9333EA" />
          </linearGradient>

          <linearGradient id={`dalStroke-${uniqueId}`} x1="0" y1="0" x2="100" y2="100">
            <stop offset="0%" stopColor="#7E22CE" />
            <stop offset="100%" stopColor="#581C87" />
          </linearGradient>
        </defs>

        {/* Bag Handle */}
        <path
          d="M38 33 C38 22 62 22 62 33"
          stroke={`url(#bagGrad-${uniqueId})`}
          strokeWidth="5.5"
          strokeLinecap="round"
        />

        {/* Modern Bag Body */}
        <path
          d="M28 36 L72 36 C74.8 36 77 38.4 76.5 41.2 L71.5 76 C71 80 67.5 83 63.5 83 L36.5 83 C32.5 83 29 80 28.5 76 L23.5 41.2 C23 38.4 25.2 36 28 36 Z"
          fill={`url(#bagGrad-${uniqueId})`}
        />

        {/* Calligraphic Arabic Dal "د" integrated inside Bag */}
        <path
          d="M63 47 C63 47 57 46 51 47 C43 49 38 55 38 62 C38 69 43 72.5 50 72.5 C57 72.5 62 70.5 64 69.5"
          stroke={`url(#dalStroke-${uniqueId})`}
          strokeWidth="6.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Miniature Shopping Cart Insignia inside the Bag */}
        <path
          d="M61 43 L63 40 L67 40"
          stroke={`url(#purpleShine-${uniqueId})`}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="63" cy="56" r="2.4" fill={`url(#purpleShine-${uniqueId})`} />
        <circle cx="58" cy="56" r="2" fill={`url(#purpleShine-${uniqueId})`} />
      </svg>
    </div>
  );

  // English "Dukanah" wordmark with shopping cart integrated into initial letter 'D'
  const EnglishWordmark = (
    <div
      className={`inline-flex items-center gap-0.5 font-bold tracking-wider ${dimensions.englishText} ${englishColor} dir-ltr select-none`}
      style={{ direction: 'ltr' }}
      title="Dukanah"
    >
      <DCartGlyph
        className={dimensions.dCartSize}
        theme={theme}
        idPrefix={`sub-${uniqueId}`}
      />
      <span className="font-semibold tracking-wider -ml-0.5 font-sans">ukanah</span>
    </div>
  );

  // Arabic "دُكَّانَة" with full tashkeel / diacritics
  const ArabicTitle = (
    <span
      className={`font-black font-sans tracking-tight leading-none ${dimensions.arabicText} ${arabicColor} transition-colors`}
      title="دُكَّانَة"
    >
      دُكَّانَة
    </span>
  );

  // Variant: Icon Only
  if (variant === 'icon') {
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        {IconSymbol}
      </div>
    );
  }

  // Variant: Wordmark Only (No Icon Emblem)
  if (variant === 'wordmark') {
    return (
      <div className={`inline-flex flex-col items-start leading-tight select-none ${className}`}>
        <div className="flex items-center gap-1.5">{ArabicTitle}</div>
        {EnglishWordmark}
      </div>
    );
  }

  // Variant: Stacked (Centered, ideal for Splash Screen / Splash Modal)
  if (variant === 'stacked') {
    return (
      <div className={`inline-flex flex-col items-center text-center select-none ${dimensions.gap} ${className}`}>
        {IconSymbol}

        <div className="flex flex-col items-center justify-center space-y-1.5">
          <div className="flex items-center gap-2">
            {ArabicTitle}
          </div>

          {EnglishWordmark}

          {showSubline && (
            <span
              className={`font-medium tracking-normal mt-1 block ${dimensions.subtext} ${sublineColor} transition-colors`}
            >
              {sublineText}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Variant: Compact
  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center ${dimensions.gap} text-right select-none ${className}`}>
        {IconSymbol}
        <div className="flex flex-col justify-center leading-none">
          {ArabicTitle}
          <div className="mt-0.5">{EnglishWordmark}</div>
        </div>
      </div>
    );
  }

  // Default: Variant Full (Emblem + Arabic « دُكَّانَة » with full tashkeel + English « Dukanah » with D-cart + Subline)
  return (
    <div
      className={`inline-flex items-center ${dimensions.gap} text-right select-none ${className}`}
    >
      {IconSymbol}

      <div className="flex flex-col justify-center leading-tight">
        <div className="flex items-center gap-2">
          {ArabicTitle}
          {variant === 'badge' && (
            <span className="text-[10px] bg-purple-500/15 text-purple-600 border border-purple-500/20 font-bold px-1.5 py-0.5 rounded-md">
              العراق
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mt-0.5">
          {EnglishWordmark}
          {showSubline && (
            <>
              <span className={`text-[10px] opacity-40 ${sublineColor}`}>•</span>
              <span
                className={`font-medium tracking-normal text-[10px] sm:text-[11px] ${sublineColor} transition-colors truncate max-w-[150px] sm:max-w-none`}
              >
                {sublineText}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
