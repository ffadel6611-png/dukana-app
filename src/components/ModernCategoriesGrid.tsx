import React, { useState } from 'react';
import {
  Store,
  Car,
  Bike,
  Building2,
  Key,
  Briefcase,
  Wrench,
  Smartphone,
  Cpu,
  Laptop,
  Gamepad2,
  Trophy,
  Tv,
  Home,
  Shirt,
  Sparkles,
  UtensilsCrossed,
  PawPrint,
  GraduationCap,
  Factory,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  LayoutGrid,
} from 'lucide-react';
import { useMarket } from '../context/MarketContext';
import { useLanguage } from '../context/LanguageContext';

export interface ModernCategoriesGridProps {
  onSelectCategory: (slug: string) => void;
  className?: string;
  variant?: 'compact' | 'full';
}

const KU_CATEGORIES_MAP: Record<string, { name: string; subtitle: string; badge?: string }> = {
  'stores': { name: 'فرۆشگاکان و کۆمپانیاکان', subtitle: 'ڕێبەری فرۆشگا باوەڕپێکراوەکان', badge: 'باوەڕپێکراو' },
  'cars-vehicles': { name: 'ئۆتۆمبێل و بارھەڵگر', subtitle: 'بازاڕی ئۆتۆمبێلی عێراقی', badge: 'نوێ و بەکارهاتوو' },
  'motorcycles': { name: 'ماتۆڕسکیل', subtitle: 'سکۆتەر و ماتۆڕ', badge: 'خێرا و وەرزشی' },
  'real-estate-sale': { name: 'خانووبەرە بۆ فرۆشتن', subtitle: 'خانوو، شوقە و زەوی', badge: 'تاپۆ سەرف' },
  'real-estate-rent': { name: 'خانووبەرە بۆ کرێ', subtitle: 'شوقەی کەلوپەلدار و دووکان', badge: 'کرێی مانگانە' },
  'jobs-careers': { name: 'هەلی کار', subtitle: 'دەرفەتی کار و دامەزراندن', badge: 'پێشکەشکردنی راستەوخۆ' },
  'services-maintenance': { name: 'خزمەتگوزاری و چاککردنەوە', subtitle: 'سپلیت و کارەبای ناوماڵ', badge: 'وەستای شارەزا' },
  'mobiles-tablets': { name: 'مۆبایل و تابلێت', subtitle: 'ئایفۆن و سامسۆنگ و ئایپاد', badge: 'گرەنتی فەرمی' },
  'electronics': { name: 'ئەلیکترۆنیات', subtitle: 'سەماعە و کامێرا و ئامێر', badge: 'تەکنەلۆژیای نوێ' },
  'laptops-computers': { name: 'لاپتۆپ و کۆمپیوتەر', subtitle: 'کۆمپیوتەری یاری و ماکبووک', badge: 'خوێندن و کار' },
  'gaming-video': { name: 'یاری و ڤیدیۆ', subtitle: 'پلەیستەیشن ٥ و ئێکس بۆکس', badge: 'یاری و کات بەسەربردن' },
  'sports-equipment': { name: 'مەشق و وەرزش', subtitle: 'ئامێری لەشجوانی و ڕاکردن', badge: 'تەندروستی و لەشجوانی' },
  'home-appliances': { name: 'ئامێری ناوماڵ', subtitle: 'سپلیت، سەلاجە و شاشە', badge: 'ئینڤێرتەری کەممەسرەف' },
  'home-garden': { name: 'ماڵ و باخچە', subtitle: 'کەلوپەلی ناوماڵ و ڕازاندنەوە', badge: 'ڕەسەنایەتی و کلتوور' },
  'fashion-kids': { name: 'مۆدە و منداڵان', subtitle: 'جلوبەرگی پیاوان و ئافرەتان', badge: 'شیک و دیزاین' },
  'perfumes-beauty': { name: 'بۆن و جوانکاری', subtitle: 'بۆنی ئەسڵی و ماکیاژ', badge: 'مارکەی جیهانی' },
  'food-grocery': { name: 'خۆراک و مارکێت', subtitle: 'خورمای عێراقی و هەنگوین', badge: 'فرێش و سروشتی' },
  'restaurants-sweets': { name: 'چێشتخانە و شیرینی', subtitle: 'کەباب و خواردنی خێرا', badge: 'گەیاندنی خێرا' },
  'pets-animals': { name: 'ئاژەڵانی ماڵی', subtitle: 'پشیلە و کەلوپەلی ئاژەڵان', badge: 'ئاژەڵی ماڵی' },
  'education-books': { name: 'پەروەردە و پەڕتووک', subtitle: 'پەڕتووک و کەرەستەی خوێندن', badge: 'زانست و فێربوون' },
  'heavy-equipment': { name: 'کەرەستەی پیشەسازی', subtitle: 'ئامێری قورس و مووەلیدە', badge: 'پیشەسازی بەهێز' },
};

interface CategoryCardMeta {
  slug: string;
  name: string;
  subtitle: string;
  icon: React.ReactNode;
  bgGradient: string;
  iconColor: string;
  borderColor: string;
  badge?: string;
  type?: 'stores' | 'jobs' | 'products';
}

export const MODERN_CATEGORIES_CONFIG: CategoryCardMeta[] = [
  {
    slug: 'stores',
    name: 'المتاجر والشركات',
    subtitle: 'دليل المتاجر المعتمدة',
    icon: <Store className="w-6 h-6" />,
    bgGradient: 'from-purple-500/10 via-purple-500/5 to-transparent',
    iconColor: 'text-purple-700 bg-purple-100',
    borderColor: 'hover:border-purple-400 group-hover:shadow-purple-500/10',
    badge: 'معتمد رسمياً',
    type: 'stores',
  },
  {
    slug: 'cars-vehicles',
    name: 'سيارات ومركبات',
    subtitle: 'سوق السيارات العراقي',
    icon: <Car className="w-6 h-6" />,
    bgGradient: 'from-blue-500/10 via-blue-500/5 to-transparent',
    iconColor: 'text-blue-700 bg-blue-100',
    borderColor: 'hover:border-blue-400 group-hover:shadow-blue-500/10',
    badge: 'جديد ومستعمل',
  },
  {
    slug: 'motorcycles',
    name: 'دراجات نارية',
    subtitle: 'بطاحات وسكوترات',
    icon: <Bike className="w-6 h-6" />,
    bgGradient: 'from-rose-500/10 via-rose-500/5 to-transparent',
    iconColor: 'text-rose-700 bg-rose-100',
    borderColor: 'hover:border-rose-400 group-hover:shadow-rose-500/10',
    badge: 'سريع ورياضي',
  },
  {
    slug: 'real-estate-sale',
    name: 'عقارات للبيع',
    subtitle: 'بيوت وشقق وأراضي',
    icon: <Building2 className="w-6 h-6" />,
    bgGradient: 'from-emerald-500/10 via-emerald-500/5 to-transparent',
    iconColor: 'text-emerald-700 bg-emerald-100',
    borderColor: 'hover:border-emerald-400 group-hover:shadow-emerald-500/10',
    badge: 'طابو صرف',
  },
  {
    slug: 'real-estate-rent',
    name: 'عقارات للإيجار',
    subtitle: 'شقق مفروشة ومحلات',
    icon: <Key className="w-6 h-6" />,
    bgGradient: 'from-teal-500/10 via-teal-500/5 to-transparent',
    iconColor: 'text-teal-700 bg-teal-100',
    borderColor: 'hover:border-teal-400 group-hover:shadow-teal-500/10',
    badge: 'إيجار شهري',
  },
  {
    slug: 'jobs-careers',
    name: 'وظائف شاغرة',
    subtitle: 'فرص عمل وتوظيف',
    icon: <Briefcase className="w-6 h-6" />,
    bgGradient: 'from-amber-500/10 via-amber-500/5 to-transparent',
    iconColor: 'text-amber-700 bg-amber-100',
    borderColor: 'hover:border-amber-400 group-hover:shadow-amber-500/10',
    badge: 'تقديم مباشر',
    type: 'jobs',
  },
  {
    slug: 'services-maintenance',
    name: 'خدمات وصيانة',
    subtitle: 'سبالت وتأسيسات منزلية',
    icon: <Wrench className="w-6 h-6" />,
    bgGradient: 'from-orange-500/10 via-orange-500/5 to-transparent',
    iconColor: 'text-orange-700 bg-orange-100',
    borderColor: 'hover:border-orange-400 group-hover:shadow-orange-500/10',
    badge: 'فنيون محترفون',
  },
  {
    slug: 'mobiles-tablets',
    name: 'موبايل وتابلت',
    subtitle: 'آيفون وسامسونج وآيباد',
    icon: <Smartphone className="w-6 h-6" />,
    bgGradient: 'from-sky-500/10 via-sky-500/5 to-transparent',
    iconColor: 'text-sky-700 bg-sky-100',
    borderColor: 'hover:border-sky-400 group-hover:shadow-sky-500/10',
    badge: 'ضمان رسمي',
  },
  {
    slug: 'electronics',
    name: 'إلكترونيات',
    subtitle: 'سماعات وكاميرات وأجهزة',
    icon: <Cpu className="w-6 h-6" />,
    bgGradient: 'from-indigo-500/10 via-indigo-500/5 to-transparent',
    iconColor: 'text-indigo-700 bg-indigo-100',
    borderColor: 'hover:border-indigo-400 group-hover:shadow-indigo-500/10',
    badge: 'تقنيات حديثة',
  },
  {
    slug: 'laptops-computers',
    name: 'لابتوب وكمبيوتر',
    subtitle: 'بي سي قيمنق وماك بوك',
    icon: <Laptop className="w-6 h-6" />,
    bgGradient: 'from-cyan-500/10 via-cyan-500/5 to-transparent',
    iconColor: 'text-cyan-700 bg-cyan-100',
    borderColor: 'hover:border-cyan-400 group-hover:shadow-cyan-500/10',
    badge: 'دراسة وعمل',
  },
  {
    slug: 'gaming-video',
    name: 'ألعاب وفيديو',
    subtitle: 'بلايستيشن 5 وإكس بوكس',
    icon: <Gamepad2 className="w-6 h-6" />,
    bgGradient: 'from-violet-500/10 via-violet-500/5 to-transparent',
    iconColor: 'text-violet-700 bg-violet-100',
    borderColor: 'hover:border-violet-400 group-hover:shadow-violet-500/10',
    badge: 'قيمنق ومرح',
  },
  {
    slug: 'sports-equipment',
    name: 'معدات ورياضة',
    subtitle: 'أجهزة لياقة وركض',
    icon: <Trophy className="w-6 h-6" />,
    bgGradient: 'from-yellow-500/10 via-yellow-500/5 to-transparent',
    iconColor: 'text-yellow-700 bg-yellow-100',
    borderColor: 'hover:border-yellow-400 group-hover:shadow-yellow-500/10',
    badge: 'صحة ورشاقة',
  },
  {
    slug: 'home-appliances',
    name: 'أجهزة منزلية',
    subtitle: 'سبالت وثلاجات وشاشات',
    icon: <Tv className="w-6 h-6" />,
    bgGradient: 'from-emerald-600/10 via-emerald-600/5 to-transparent',
    iconColor: 'text-emerald-800 bg-emerald-100',
    borderColor: 'hover:border-emerald-400 group-hover:shadow-emerald-500/10',
    badge: 'إنفيرتر توفير',
  },
  {
    slug: 'home-garden',
    name: 'منزل وحديقة',
    subtitle: 'أثاث واستكانات وديكور',
    icon: <Home className="w-6 h-6" />,
    bgGradient: 'from-amber-600/10 via-amber-600/5 to-transparent',
    iconColor: 'text-amber-800 bg-amber-100',
    borderColor: 'hover:border-amber-400 group-hover:shadow-amber-500/10',
    badge: 'أصالة وتراث',
  },
  {
    slug: 'fashion-kids',
    name: 'موضة وأطفال',
    subtitle: 'دشاديش وعباءات وقاطات',
    icon: <Shirt className="w-6 h-6" />,
    bgGradient: 'from-pink-500/10 via-pink-500/5 to-transparent',
    iconColor: 'text-pink-700 bg-pink-100',
    borderColor: 'hover:border-pink-400 group-hover:shadow-pink-500/10',
    badge: 'أناقة وتطريز',
  },
  {
    slug: 'beauty-health',
    name: 'جمال وصحة',
    subtitle: 'عطور وبخور وعناية',
    icon: <Sparkles className="w-6 h-6" />,
    bgGradient: 'from-fuchsia-500/10 via-fuchsia-500/5 to-transparent',
    iconColor: 'text-fuchsia-700 bg-fuchsia-100',
    borderColor: 'hover:border-fuchsia-400 group-hover:shadow-fuchsia-500/10',
    badge: 'روائح ملكية',
  },
  {
    slug: 'food-groceries',
    name: 'طعام وغذاء',
    subtitle: 'تمور وعسل ومشاوي',
    icon: <UtensilsCrossed className="w-6 h-6" />,
    bgGradient: 'from-red-500/10 via-red-500/5 to-transparent',
    iconColor: 'text-red-700 bg-red-100',
    borderColor: 'hover:border-red-400 group-hover:shadow-red-500/10',
    badge: 'طازج وأصيل',
  },
  {
    slug: 'animals-pets',
    name: 'حيوانات ومواشي',
    subtitle: 'طيور وخيول وأعلاف',
    icon: <PawPrint className="w-6 h-6" />,
    bgGradient: 'from-lime-500/10 via-lime-500/5 to-transparent',
    iconColor: 'text-lime-800 bg-lime-100',
    borderColor: 'hover:border-lime-400 group-hover:shadow-lime-500/10',
    badge: 'مستلزمات وعناية',
  },
  {
    slug: 'education-training',
    name: 'تعليم وتدريب',
    subtitle: 'دورات وكتب وملازم',
    icon: <GraduationCap className="w-6 h-6" />,
    bgGradient: 'from-teal-600/10 via-teal-600/5 to-transparent',
    iconColor: 'text-teal-800 bg-teal-100',
    borderColor: 'hover:border-teal-400 group-hover:shadow-teal-500/10',
    badge: 'تطوير المهارات',
  },
  {
    slug: 'business-industrial',
    name: 'معدات ومصانع',
    subtitle: 'مكائن إنتاج وكرفانات',
    icon: <Factory className="w-6 h-6" />,
    bgGradient: 'from-slate-600/10 via-slate-600/5 to-transparent',
    iconColor: 'text-slate-800 bg-slate-100',
    borderColor: 'hover:border-slate-400 group-hover:shadow-slate-500/10',
    badge: 'شركات وورش',
  },
];

export const ModernCategoriesGrid: React.FC<ModernCategoriesGridProps> = ({
  onSelectCategory,
  className = '',
  variant = 'full',
}) => {
  const { products, merchants, jobs } = useMarket();
  const { lang, t } = useLanguage();

  // Helper to compute category count dynamically
  const getCategoryCount = (item: CategoryCardMeta) => {
    if (item.slug === 'stores') {
      const cnt = merchants.filter(m => m.status === 'approved').length;
      return `${cnt} ${lang === 'ku' ? 'فرۆشگا' : 'متجر'}`;
    }
    if (item.slug === 'jobs-careers') {
      const cnt = jobs.length;
      return `${cnt} ${lang === 'ku' ? 'هەلی کار' : 'وظائف'}`;
    }

    const count = products.filter(p => {
      if (p.approvalStatus !== 'approved') return false;
      const name = p.name.toLowerCase();
      const cat = p.categoryName.toLowerCase();
      const tags = (p.tags || []).join(' ').toLowerCase();

      switch (item.slug) {
        case 'cars-vehicles':
          return p.categoryId === 'cat_vehicles' || cat.includes('سيار') || cat.includes('مركب');
        case 'motorcycles':
          return p.categoryId === 'cat_motorcycles' || cat.includes('دراج') || name.includes('بطاحة');
        case 'real-estate-sale':
          return (p.categoryId === 'cat_real_estate' || cat.includes('عقار')) &&
            (name.includes('بيع') || tags.includes('بيع') || name.includes('دار') || name.includes('بيت'));
        case 'real-estate-rent':
          return (p.categoryId === 'cat_real_estate' || cat.includes('عقار')) &&
            (name.includes('إيجار') || name.includes('ايجار') || tags.includes('إيجار') || name.includes('شقة'));
        case 'mobiles-tablets':
          return p.categoryId === 'cat_mobiles' || cat.includes('موبايل') || cat.includes('هاتف');
        case 'electronics':
          return p.categoryId === 'cat_electronics' || p.categoryId === 'cat_mobiles' || cat.includes('إلكترون');
        case 'laptops-computers':
          return p.categoryId === 'cat_laptops' || cat.includes('لابتوب') || cat.includes('كمبيوتر');
        case 'gaming-video':
          return p.categoryId === 'cat_gaming' || tags.includes('بلايستيشن') || tags.includes('ألعاب') || tags.includes('ps5');
        case 'sports-equipment':
          return p.categoryId === 'cat_sports' || cat.includes('رياض') || tags.includes('لياقة');
        case 'home-appliances':
          return p.categoryId === 'cat_appliances' || cat.includes('أجهزة') || name.includes('سبلت');
        case 'home-garden':
          return p.categoryId === 'cat_home' || cat.includes('منزل') || cat.includes('أثاث');
        case 'fashion-kids':
          return p.categoryId === 'cat_fashion' || p.categoryId === 'cat_clothing' || cat.includes('ملابس') || cat.includes('أزياء');
        case 'beauty-health':
          return p.categoryId === 'cat_beauty' || p.categoryId === 'cat_daily_needs' || tags.includes('بخور') || cat.includes('جمال');
        case 'food-groceries':
          return p.categoryId === 'cat_food' || p.categoryId === 'cat_restaurants' || cat.includes('غذائ') || cat.includes('مطاعم');
        case 'services-maintenance':
          return p.categoryId === 'cat_services' || cat.includes('صيانة') || cat.includes('خدمات');
        case 'animals-pets':
          return p.categoryId === 'cat_animals' || cat.includes('حيوان');
        case 'education-training':
          return p.categoryId === 'cat_education' || cat.includes('تعليم');
        case 'business-industrial':
          return p.categoryId === 'cat_business' || cat.includes('معدات');
        default:
          return true;
      }
    }).length;

    return `${count} ${lang === 'ku' ? 'ئاگاداری' : 'إعلان'}`;
  };

  const [mobileExpanded, setMobileExpanded] = useState(false);

  const fullList = variant === 'compact' ? MODERN_CATEGORIES_CONFIG.slice(0, 12) : MODERN_CATEGORIES_CONFIG;

  return (
    <section className={`space-y-4 ${className}`}>
      {/* Section Header with Clean Aesthetic */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-xs">
            <LayoutGrid className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-lg font-black text-zinc-900 tracking-tight flex items-center gap-2">
              <span>{t('cat_grid_title', 'شبكة الأقسام والتصنيفات')}</span>
              <span className="text-[10px] sm:text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200/60">
                {MODERN_CATEGORIES_CONFIG.length} {t('cat_grid_count', 'قسماً')}
              </span>
            </h2>
            <p className="text-[11px] text-zinc-500 mt-0.5 hidden sm:block">
              {t('cat_grid_subtitle', 'اختر أي قسم لتصفح كافة المنتجات والإعلانات المندرجة تحته حصراً')}
            </p>
          </div>
        </div>

        <button
          onClick={() => onSelectCategory('all')}
          className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 transition cursor-pointer hover:underline"
        >
          <span>{t('cat_grid_all', 'تصفح كل السوق')}</span>
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Modern 3D-Styled Category Grid: Compact 6 on mobile by default, fully expanded on desktop or when toggled */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-4">
        {fullList.map((item, idx) => {
          // On mobile screens (<sm), show only the first 6 items unless user clicked expand
          const isHiddenOnMobile = !mobileExpanded && idx >= 6;
          const countLabel = getCategoryCount(item);
          const kuData = KU_CATEGORIES_MAP[item.slug];
          const itemName = lang === 'ku' && kuData ? kuData.name : item.name;
          const itemSubtitle = lang === 'ku' && kuData ? kuData.subtitle : item.subtitle;
          const itemBadge = lang === 'ku' && kuData?.badge ? kuData.badge : item.badge;

          return (
            <button
              key={item.slug}
              onClick={() => onSelectCategory(item.slug)}
              className={`group relative text-right p-3 sm:p-4 rounded-2xl border border-zinc-200/80 bg-white hover:bg-gradient-to-b hover:${item.bgGradient} transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[110px] sm:min-h-[136px] overflow-hidden shadow-2xs hover:shadow-md hover:-translate-y-0.5 ${item.borderColor} ${
                isHiddenOnMobile ? 'hidden sm:flex' : 'flex'
              }`}
            >
              {/* Top Row: Icon Container & Count Tag */}
              <div className="flex items-start justify-between w-full">
                <div
                  className={`w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 shadow-xs ${item.iconColor}`}
                >
                  {item.icon}
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] font-bold text-zinc-400 group-hover:text-zinc-600 transition tabular-nums bg-zinc-50 group-hover:bg-white px-2 py-0.5 rounded-md border border-zinc-100">
                    {countLabel}
                  </span>
                  {itemBadge && (
                    <span className="text-[9px] font-semibold text-purple-600 hidden sm:inline-block">
                      {itemBadge}
                    </span>
                  )}
                </div>
              </div>

              {/* Bottom Row: Title & Subtitle */}
              <div className="mt-2.5 sm:mt-3 w-full">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-black text-zinc-900 group-hover:text-purple-950 transition line-clamp-1 block">
                    {itemName}
                  </span>
                  <ChevronLeft className="w-3.5 h-3.5 text-zinc-300 group-hover:text-purple-600 transition-transform group-hover:-translate-x-0.5 shrink-0" />
                </div>
                <span className="text-[10px] text-zinc-500 group-hover:text-zinc-600 line-clamp-1 mt-0.5 block">
                  {itemSubtitle}
                </span>
              </div>

              {/* Subtle hover accent line at bottom */}
              <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-purple-600/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          );
        })}
      </div>

      {/* Mobile Expand / Collapse Button */}
      <div className="sm:hidden text-center pt-1">
        <button
          type="button"
          onClick={() => setMobileExpanded(prev => !prev)}
          className="w-full py-2.5 px-4 bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-bold rounded-xl border border-purple-200/80 transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
        >
          {mobileExpanded ? (
            <>
              <span>{lang === 'ku' ? 'شاردنەوەی بەشەکان' : 'إخفاء بقية الأقسام'}</span>
              <ChevronUp className="w-4 h-4 text-purple-700" />
            </>
          ) : (
            <>
              <span>{lang === 'ku' ? `پیشاندانی هەموو بەشەکان (${MODERN_CATEGORIES_CONFIG.length})` : `عرض كافة الأقسام (${MODERN_CATEGORIES_CONFIG.length} قسماً)`}</span>
              <ChevronDown className="w-4 h-4 text-purple-700" />
            </>
          )}
        </button>
      </div>
    </section>
  );
};
