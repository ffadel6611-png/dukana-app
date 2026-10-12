import React, { useState } from 'react';
import { Share2, Copy, Check } from 'lucide-react';
import { Product } from '../types';
import { formatIQDTabular } from '../utils/currency';
import { useLanguage } from '../context/LanguageContext';

// Verified SVG Icon for WhatsApp
export const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    className={className}
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M17.472 14.382c-.301-.15-1.782-.88-2.059-.98-.276-.1-.477-.15-.678.15-.2.301-.778.98-.954 1.18-.176.2-.352.226-.653.075-.301-.15-1.272-.469-2.423-1.496-.895-.798-1.5-1.784-1.676-2.085-.176-.301-.019-.464.132-.614.136-.135.301-.351.452-.527.15-.175.2-.3.301-.502.101-.2.05-.376-.025-.526-.075-.15-.678-1.634-.929-2.239-.244-.589-.493-.509-.678-.518-.175-.009-.376-.009-.577-.009-.201 0-.527.075-.803.376s-1.054 1.03-1.054 2.512 1.079 2.913 1.23 3.114c.15.201 2.123 3.242 5.143 4.547.719.311 1.28.497 1.718.636.722.23 1.379.197 1.898.12.578-.087 1.782-.728 2.033-1.431.251-.703.251-1.306.176-1.431-.076-.126-.277-.201-.578-.352zM12.04 2C6.544 2 2.08 6.464 2.08 11.96c0 1.986.582 3.842 1.602 5.414L2 22l4.78-1.624c1.514.939 3.298 1.484 5.26 1.484 5.496 0 9.96-4.464 9.96-9.96S17.536 2 12.04 2zm0 18.23c-1.748 0-3.37-.532-4.72-1.442l-.338-.228-2.837.964.975-2.766-.248-.358c-1.01-1.453-1.552-3.176-1.552-4.99 0-4.555 3.705-8.26 8.26-8.26 4.555 0 8.26 3.705 8.26 8.26 0 4.555-3.705 8.26-8.26 8.26z" />
  </svg>
);

// Verified SVG Icon for Telegram
export const TelegramIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    className={className}
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.52 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .37z" />
  </svg>
);

export function buildProductSharePayload(product: Product, lang: 'ar' | 'ku' = 'ar') {
  const isKu = lang === 'ku';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const productUrl = `${origin}${pathname}?product=${product.id}`;

  const title = isKu
    ? `🛍️ بەرهەم لە دکانە: ${product.name}`
    : `🛍️ تسوّق عبر دكانة: ${product.name}`;

  const storeText = isKu
    ? `🏪 فرۆشگا: ${product.storeName}`
    : `🏪 المتجر: ${product.storeName}`;

  const priceText = isKu
    ? `💰 نرخ: ${formatIQDTabular(product.finalPrice)} (پارەدان لە کاتی وەرگرتن)`
    : `💰 السعر: ${formatIQDTabular(product.finalPrice)} (الدفع عند الاستلام)`;

  const callToAction = isKu
    ? `📱 بۆ داواکردن و کڕینی خێرا کرتە لێرە بکە:`
    : `📱 للطلب والشراء المباشر انقر على الرابط:`;

  const fullText = `${title}\n${storeText}\n${priceText}\n${callToAction}\n${productUrl}`;

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(fullText)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(productUrl)}&text=${encodeURIComponent(
    `${title}\n${storeText}\n${priceText}`
  )}`;

  return {
    productUrl,
    fullText,
    whatsappUrl,
    telegramUrl,
  };
}

interface SocialShareBarProps {
  product: Product;
  compact?: boolean;
}

export const SocialShareBar: React.FC<SocialShareBarProps> = ({ product, compact = false }) => {
  const { lang, t, showToast } = useLanguage();
  const [copied, setCopied] = useState(false);
  const sharePayload = buildProductSharePayload(product, lang);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(sharePayload.productUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = sharePayload.productUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      showToast(t('share_copied', 'تم نسخ رابط المنتج بنجاح!'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast(t('share_copied', 'تم نسخ رابط المنتج بنجاح!'));
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
        {/* Quick Circular WhatsApp Share Button */}
        <a
          href={sharePayload.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-110 active:scale-95"
          title={t('share_whatsapp', 'مشاركة عبر واتساب')}
          aria-label="مشاركة عبر واتساب"
        >
          <WhatsAppIcon className="w-3.5 h-3.5 fill-white" />
        </a>

        {/* Quick Circular Telegram Share Button */}
        <a
          href={sharePayload.telegramUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-full bg-sky-500 hover:bg-sky-600 text-white flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-110 active:scale-95"
          title={t('share_telegram', 'مشاركة عبر تليجرام')}
          aria-label="مشاركة عبر تليجرام"
        >
          <TelegramIcon className="w-3.5 h-3.5 fill-white" />
        </a>

        {/* Quick Circular Copy Link Button */}
        <button
          type="button"
          onClick={handleCopy}
          className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-full bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200/90 flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-110 active:scale-95"
          title={t('share_copy_link', 'نسخ الرابط')}
          aria-label="نسخ الرابط"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 pt-4 border-t border-zinc-200/80 space-y-2.5" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-zinc-900 flex items-center gap-1.5">
          <Share2 className="w-4 h-4 text-purple-700" />
          <span>{t('share_social', 'مشاركة سريعة عبر وسائل التواصل')}</span>
        </span>
        <span className="text-[11px] text-zinc-500">
          {t('share_hint', 'شارك المنتج مع أصدقائك بضغطة زر واحدة')}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {/* WhatsApp Direct Share */}
        <a
          href={sharePayload.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all cursor-pointer shadow-2xs hover:shadow-emerald-600/20 active:scale-[0.98]"
        >
          <WhatsAppIcon className="w-4 h-4 fill-white shrink-0" />
          <span>{t('share_whatsapp', 'مشاركة عبر واتساب')}</span>
        </a>

        {/* Telegram Direct Share */}
        <a
          href={sharePayload.telegramUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs transition-all cursor-pointer shadow-2xs hover:shadow-sky-500/20 active:scale-[0.98]"
        >
          <TelegramIcon className="w-4 h-4 fill-white shrink-0" />
          <span>{t('share_telegram', 'مشاركة عبر تليجرام')}</span>
        </a>

        {/* Copy Link Button */}
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-800 font-bold text-xs transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-600 shrink-0" /> : <Copy className="w-4 h-4 shrink-0" />}
          <span>{copied ? t('share_copied', 'تم نسخ الرابط!') : t('share_copy_link', 'نسخ الرابط')}</span>
        </button>
      </div>
    </div>
  );
};
