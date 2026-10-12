import React, { useEffect } from 'react';
import {
  X,
  HelpCircle,
  MessageCircle,
  Phone,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';
import { useMarket } from '../context/MarketContext';
import { useLanguage } from '../context/LanguageContext';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose }) => {
  const { settings } = useMarket();
  const { lang, t } = useLanguage();

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Clean WhatsApp phone for direct link
  const cleanWhatsAppNumber = (settings?.supportWhatsApp || '07862214922').replace(/\D/g, '');

  const faqs = [
    {
      q: lang === 'ku' ? 'شێوازی پارەدان لە بازاڕی دوکانە چۆنە؟' : 'كيف يعمل الدفع في سوق دكانة؟',
      a: lang === 'ku'
        ? 'شێوازی فەرمی و پەسەندکراوی پارەدان لە دوکانە بریتییە لە پێدانی کاش لەکاتی وەرگرتنی کاڵا (COD) بە دیناری عێراقی، پاش پشکنینی داواکارییەکەت و دڵنیابوونەوە لە دروستییەکەی.'
        : 'طريقة الدفع الرسمية والمعتمدة في دكانة هي الدفع عند الاستلام (COD) نقداً بالدينار العراقي للمندوب بعد معاينة طلبيتك والتحقق من سلامتها.',
    },
    {
      q: lang === 'ku' ? 'ئایا گەیاندن هەموو پارێزگاکانی عێراق دەگرێتەوە؟' : 'هل يشمل التوصيل جميع محافظات العراق؟',
      a: lang === 'ku'
        ? 'بەڵێ، دوکانە پاڵپشتی گەیاندن دەکات بۆ سەرجەم پارێزگاکانی عێراق (هەولێر، سلێمانی، دهۆک، بەغداد، بەسرە، نەینەوا، کەرکووک، نەجەف، کەربەلا و سەرجەم پارێزگاکانی تر).'
        : 'نعم، يدعم دكانة التوصيل إلى المحافظات العراقية كافة (بغداد، البصرة، نينوى، أربيل، كركوك، النجف، كربلاء، بابل، واسط، الأنبار، صلاح الدين، ديالى، ذي قار، ميسان، المثنى، القادسية، دهوك، السليمانية).',
    },
    {
      q: lang === 'ku' ? 'بۆچی سەبەتەکەم دابەشبوو بەسەر چەند داواکارییەکی جیاوازدا؟' : 'لماذا قُسمت سلتي إلى طلبات منفصلة؟',
      a: lang === 'ku'
        ? 'ئەگەر کاڵات لە چەند فرۆشگایەکی جیاوازەوە دیاری کردبێت، سیستەمەکە بە شێوەیەکی ئۆتۆماتیکی داواکارییەکە بۆ هەر فرۆشگایەک جیا دەکاتەوە چونکە هەر فرۆشیارێک خۆی ئامادەکردن و ناردنی کاڵاکانی لەئەستۆ دەگرێت.'
        : 'إذا قمت بإضافة منتجات من تجار مختلفين، يقوم النظام بتقسيم الطلب تلقائياً لكل متجر، لأن كل تاجر يتولى تجهيز وتوصيل بضاعته بنفسه.',
    },
    {
      q: lang === 'ku' ? 'چۆن دڵنیابم لەوەی هەڵسەنگاندنی بەرهەمەکان ڕاستەقینەن؟' : 'كيف أضمن أن تقييمات المنتجات حقيقية؟',
      a: lang === 'ku'
        ? 'دوکانە بە تەواوی هەڵسەنگاندنی ساختە قەدەغە دەکات. تەنها ئەو کڕیارەی کە کڕینەکەی تەواو کردووە و داواکارییەکەی وەرگرتووە دەتوانێت هەڵسەنگاندن دابنێت و نیشانەی "کڕینی پشتڕاستکراو"ی لەتەنیشت دەردەکەوێت.'
        : 'يمنع دكانة التقييمات الوهمية تماماً. لا يُسمح بإضافة أي تقييم إلا للزبون الذي أتم عملية الشراء واستلم طلبه بنجاح، ويظهر بجانب تقييمه شارة "عملية شراء موثقة".',
    },
    {
      q: lang === 'ku' ? 'چۆن دەتوانم هەژمارەکەم بە یەکجاری بسڕمەوە؟' : 'كيف يمكنني حذف حسابي نهائياً؟',
      a: lang === 'ku'
        ? 'دەتوانیت لە هەر کاتێکدا بێت لە ڕێگەی پەڕەی یاساکانەوە هەژمارەکەت بسڕیتەوە و زانیارییەکانت دەستبەجێ بە پێی سیاسەتی تایبەتمەندی دەسڕدرێنەوە.'
        : 'يمكنك حذف حسابك في أي وقت من خلال نافذة "السياسات والتوافق" -> "حذف الحساب" وسيتم محو بياناتك الشخصية فورياً وفق سياسة الخصوصية.',
    },
  ];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden animate-in fade-in duration-200"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90dvh] sm:max-h-[85vh] border border-zinc-200 overflow-hidden animate-in slide-in-from-bottom-6 duration-300"
      >
        {/* Sticky Header with prominent, touch-friendly close button (X) */}
        <div className="shrink-0 px-4 sm:px-5 py-3.5 sm:py-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50/95 sticky top-0 z-20">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-purple-700 text-white flex items-center justify-center shadow-xs shrink-0">
              <HelpCircle className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-zinc-900 leading-tight">
                {lang === 'ku' ? 'پشتیوانی و هاوکاری' : 'الدعم والمساعدة'}
              </h2>
              <p className="text-[11px] text-zinc-500 leading-tight">
                {lang === 'ku' ? 'تیمی خزمەتگوزاری بەشداربووان لە خزمەتتاندایە' : 'فريق خدمة عملاء دكانة في خدمتكم'}
              </p>
            </div>
          </div>

          {/* Large touch-target close button that never gets hidden on mobile */}
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-zinc-200/80 hover:bg-zinc-300 active:scale-95 text-zinc-700 flex items-center justify-center cursor-pointer transition shadow-2xs shrink-0"
            aria-label={t('btn_close', 'إغلاق')}
            title={t('btn_close', 'إغلاق')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs overscroll-contain">
          {/* Direct WhatsApp Call to Action */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-4 sm:p-5 rounded-2xl shadow-md shadow-emerald-500/15 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-center sm:text-right">
              <span className="text-[11px] font-bold text-emerald-100 block mb-0.5">
                {lang === 'ku' ? 'پەیوەندی ڕاستەوخۆ و خێرا:' : 'تواصل مباشر وسريع:'}
              </span>
              <h3 className="text-sm sm:text-base font-black">
                {lang === 'ku' ? 'وەتسئاپی خزمەتگوزاری کڕیارانی دوکانە' : 'واتساب خدمة عملاء دكانة'}
              </h3>
              <p className="text-xs text-emerald-100 mt-0.5 font-mono" dir="ltr">
                {settings?.supportWhatsApp || '07862214922'}
              </p>
            </div>

            <a
              href={`https://wa.me/${cleanWhatsAppNumber}?text=${encodeURIComponent(lang === 'ku' ? 'سڵاو تیمی دوکانە، پێویستم بە هاوکارییە دەربارەی داواکارییەکەم لە بازاڕ.' : 'مرحباً فريق دكانة، أحتاج مساعدة بخصوص طلبي في السوق.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white text-emerald-700 font-black text-xs hover:bg-emerald-50 active:scale-95 transition shadow-xs flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>{lang === 'ku' ? 'پەیوەندی لە وەتسئاپ' : 'مراسلة عبر واتساب'}</span>
            </a>
          </div>

          {/* Quick FAQ Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-black text-zinc-900 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-purple-700" />
              <span>{lang === 'ku' ? 'پرسیارە باوەکان (FAQ)' : 'الأسئلة الشائعة (FAQ)'}</span>
            </h3>

            <div className="space-y-2">
              {faqs.map((faq, i) => (
                <div
                  key={i}
                  className="bg-zinc-50 p-3.5 rounded-2xl border border-zinc-200/80 space-y-1"
                >
                  <h4 className="font-bold text-zinc-900 text-xs flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-700 shrink-0"></span>
                    <span>{faq.q}</span>
                  </h4>
                  <p className="text-[11px] text-zinc-600 leading-relaxed pr-3">
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sticky / Pinned Bottom Dismiss Footer for Mobile convenience */}
        <div className="shrink-0 p-3 sm:p-4 bg-zinc-50 border-t border-zinc-200 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-zinc-200 hover:bg-zinc-300 text-zinc-800 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
          >
            <X className="w-4 h-4" />
            <span>{t('btn_close', 'إغلاق')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
