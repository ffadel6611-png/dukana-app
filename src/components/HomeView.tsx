import React, { useState } from 'react';
import {
  Sparkles,
  Percent,
  Clock,
  ShieldCheck,
  Truck,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Flame,
  BadgeCheck,
  LayoutGrid,
  Shirt,
  Home,
  ShoppingBag,
  UtensilsCrossed,
  Smartphone,
  Laptop,
  Tv,
  Car,
  Bike,
  Building2,
  PawPrint,
  Briefcase,
  Wrench,
  GraduationCap,
  Trophy,
  Factory,
  Search,
  SlidersHorizontal,
  Store,
  X,
} from 'lucide-react';
import { useMarket } from '../context/MarketContext';
import { useLanguage } from '../context/LanguageContext';
import { Product } from '../types';
import { ProductCard } from './ProductCard';
import { ModernCategoriesGrid } from './ModernCategoriesGrid';
import { StoriesBar } from './StoriesBar';

interface HomeViewProps {
  onSelectProduct: (product: Product) => void;
  onNavigateCategories: (slug?: string, discount?: number) => void;
  onOpenStore?: (merchantId: string) => void;
  onNavigateSearch?: (categorySlug?: string, query?: string, tab?: 'products' | 'jobs' | 'stores') => void;
  onOpenStoryAdmin?: () => void;
  isAdmin?: boolean;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onSelectProduct,
  onNavigateCategories,
  onOpenStore,
  onNavigateSearch,
  onOpenStoryAdmin,
  isAdmin,
}) => {
  const {
    products,
    categories,
    selectedCategorySlug,
    setSelectedCategorySlug,
    searchQuery,
    setSearchQuery,
    getFilteredProductsForCustomer,
    getActiveBanners,
  } = useMarket();

  const { lang, t } = useLanguage();
  const [localSearchInput, setLocalSearchInput] = useState('');

  const activeBanners = getActiveBanners();
  const [currentBannerIndex, setCurrentBannerIndex] = React.useState(0);

  // Quick horizontal scroll tabs for the top search bar
  const HOME_QUICK_TABS = [
    { slug: 'all', label: t('home_all_categories', 'كافة الأقسام'), icon: <LayoutGrid className="w-3.5 h-3.5" /> },
    { slug: 'cars-vehicles', label: t('home_cars', 'سيارات ومركبات'), icon: <Car className="w-3.5 h-3.5" /> },
    { slug: 'real-estate-sale', label: t('home_real_estate_sale', 'عقارات للبيع'), icon: <Building2 className="w-3.5 h-3.5" /> },
    { slug: 'real-estate-rent', label: t('home_real_estate_rent', 'عقارات للإيجار'), icon: <Home className="w-3.5 h-3.5" /> },
    { slug: 'jobs-careers', label: t('home_jobs', 'وظائف شاغرة'), icon: <Briefcase className="w-3.5 h-3.5" />, tab: 'jobs' as const },
    { slug: 'services-maintenance', label: t('home_services', 'خدمات وصيانة'), icon: <Wrench className="w-3.5 h-3.5" /> },
    { slug: 'mobiles-tablets', label: t('home_mobiles', 'موبايلات وإلكترونيات'), icon: <Smartphone className="w-3.5 h-3.5" /> },
    { slug: 'home-appliances', label: t('home_appliances', 'أجهزة منزلية'), icon: <Tv className="w-3.5 h-3.5" /> },
    { slug: 'fashion-kids', label: t('home_fashion', 'موضة وأزياء'), icon: <Shirt className="w-3.5 h-3.5" /> },
    { slug: 'stores', label: t('home_stores', 'المتاجر المعتمدة'), icon: <Store className="w-3.5 h-3.5" />, tab: 'stores' as const },
  ];

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (onNavigateSearch) {
      onNavigateSearch(undefined, localSearchInput || searchQuery || undefined);
    } else {
      setSearchQuery(localSearchInput);
      onNavigateCategories('all');
    }
  };

  const handleQuickTabClick = (tab: typeof HOME_QUICK_TABS[0]) => {
    if (onNavigateSearch) {
      onNavigateSearch(tab.slug, localSearchInput || undefined, tab.tab || 'products');
    } else {
      onNavigateCategories(tab.slug);
    }
  };

  const handleCategoryGridSelect = (slug: string) => {
    if (slug === 'stores') {
      if (onNavigateSearch) {
        onNavigateSearch('stores', undefined, 'stores');
      } else {
        onNavigateCategories('all');
      }
      return;
    }

    if (slug === 'jobs-careers') {
      if (onNavigateSearch) {
        onNavigateSearch('jobs-careers', undefined, 'jobs');
      } else {
        onNavigateCategories('jobs-careers');
      }
      return;
    }

    // Direct navigation to browsing products for this category exclusively!
    onNavigateCategories(slug);
  };

  // Auto-play timer for home banners if more than 1 banner
  React.useEffect(() => {
    if (activeBanners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBannerIndex(prev => (prev + 1) % activeBanners.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [activeBanners.length]);

  // Keep index within bounds if banners change
  React.useEffect(() => {
    if (currentBannerIndex >= activeBanners.length && activeBanners.length > 0) {
      setCurrentBannerIndex(0);
    }
  }, [activeBanners.length, currentBannerIndex]);

  const currentBanner = activeBanners[currentBannerIndex];

  const handleNextBanner = () => {
    if (activeBanners.length <= 1) return;
    setCurrentBannerIndex(prev => (prev + 1) % activeBanners.length);
  };

  const handlePrevBanner = () => {
    if (activeBanners.length <= 1) return;
    setCurrentBannerIndex(prev => (prev - 1 + activeBanners.length) % activeBanners.length);
  };

  const customerProducts = getFilteredProductsForCustomer();

  // Highlight Collections:
  const promotedProducts = customerProducts.filter(p => p.isPromoted);
  // Give utmost priority to promoted products in the featured section
  const nonPromoted = customerProducts.filter(p => !p.isPromoted);
  const featuredProducts = [
    ...promotedProducts,
    ...nonPromoted,
  ].slice(0, Math.max(4, promotedProducts.length));
  const discountedProducts = customerProducts.filter(p => (p.discountPercent || 0) > 0);
  const discount50 = customerProducts.filter(p => (p.discountPercent || 0) >= 50);
  const discount30 = customerProducts.filter(p => (p.discountPercent || 0) >= 30);
  const discount10 = customerProducts.filter(p => (p.discountPercent || 0) >= 10);

  const scrollToFeatured = () => {
    const el = document.getElementById('featured-products-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 600, behavior: 'smooth' });
    }
  };

  return (
    <div className="flex flex-col gap-6 sm:gap-8 pb-16 w-full max-w-full overflow-hidden">
      {/* 1. Top Search Bar */}
      <section className="w-full max-w-7xl mx-auto px-3 sm:px-6 pt-2">
        <form onSubmit={handleSearchSubmit} className="relative w-full">
          <div className="relative w-full shadow-2xs rounded-2xl bg-white border border-purple-100/90 focus-within:border-purple-600 focus-within:ring-4 focus-within:ring-purple-600/10 transition">
            <div className="absolute inset-y-0 right-0 pr-3.5 sm:pr-4 flex items-center pointer-events-none text-purple-700">
              <Search className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <input
              type="text"
              value={localSearchInput}
              onChange={e => setLocalSearchInput(e.target.value)}
              placeholder={t('search_placeholder', 'ابحث عن منتج، متجر، أو تصنيف...')}
              className="w-full pr-10 sm:pr-12 pl-10 sm:pl-12 py-3 sm:py-3.5 bg-transparent rounded-2xl text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 font-medium focus:outline-none"
            />
            {localSearchInput ? (
              <button
                type="button"
                onClick={() => setLocalSearchInput('')}
                className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center text-zinc-400 hover:text-zinc-600 cursor-pointer"
                title="مسح"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center text-purple-700 hover:text-purple-950 cursor-pointer"
                title={t('home_search', 'بحث')}
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
            )}
          </div>
        </form>
      </section>

      {/* Stories System: Circular stories tray (renders cleanly only if active stories exist) */}
      <StoriesBar
        isAdmin={isAdmin}
        onOpenStoryAdmin={onOpenStoryAdmin}
        onSelectProduct={onSelectProduct}
        onNavigateProduct={(pId) => {
          const p = products.find(item => item.id === pId || item.id === pId?.replace('product:', ''));
          if (p) {
            onSelectProduct(p);
          } else {
            scrollToFeatured();
          }
        }}
        onScrollToFeatured={scrollToFeatured}
        onNavigateStore={onOpenStore}
      />

      {/* 2. Categories Section (الأقسام) - Placed directly beneath the search bar */}
      <section className="w-full max-w-7xl mx-auto px-3 sm:px-6">
        <ModernCategoriesGrid
          onSelectCategory={handleCategoryGridSelect}
        />
      </section>

      {/* 3. Hero Showcase Banner Slider (البانر العلوي) - Placed after categories */}
      {!searchQuery && (
        <section className="relative overflow-hidden bg-gradient-to-br from-purple-950 via-purple-900 to-purple-800 text-white rounded-2xl sm:rounded-3xl mx-3 sm:mx-6 lg:mx-auto max-w-7xl shadow-xl shadow-purple-950/15">
          {currentBanner ? (
            <div className="relative">
              {/* Mobile View: Clean, vertical single-column hero card (< sm) */}
              <div className="block sm:hidden relative min-h-[210px] overflow-hidden p-4 flex flex-col justify-end">
                {/* Background Image with Dark Purple Gradient Overlay */}
                <img
                  src={currentBanner.imageUrl}
                  alt={currentBanner.title}
                  referrerPolicy="no-referrer"
                  onError={e => {
                    (e.target as HTMLImageElement).src = '/src/assets/images/hero_dukkana_market_1791352449347.jpg';
                  }}
                  className="absolute inset-0 w-full h-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-purple-950 via-purple-950/75 to-purple-950/30" />

                <div className="relative z-10 space-y-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-bold text-purple-200">
                    <Sparkles className="w-3 h-3 text-purple-300" />
                    <span>{currentBanner.badgeText || 'السوق العراقي الأصيل'}</span>
                  </span>

                  <h2 className="text-base font-black text-white leading-tight">
                    {currentBanner.title}
                  </h2>

                  {currentBanner.subtitle && (
                    <p className="text-[11px] text-purple-200 line-clamp-1">
                      {currentBanner.subtitle}
                    </p>
                  )}

                  <div className="pt-1 flex items-center gap-2">
                    <button
                      onClick={() => onNavigateCategories(currentBanner.linkCategorySlug || 'all')}
                      className="px-4 py-2 rounded-xl bg-white text-purple-950 font-black text-xs hover:bg-purple-50 transition shadow-sm cursor-pointer flex items-center gap-1.5"
                    >
                      <span>{t('home_hero_browse', 'تصفح العروض الآن')}</span>
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Minimal Indicator Dots for Mobile */}
                {activeBanners.length > 1 && (
                  <div className="absolute top-3 left-3 z-20 flex items-center gap-1 bg-black/40 px-2 py-1 rounded-full backdrop-blur-xs">
                    {activeBanners.map((b, idx) => (
                      <button
                        key={b.id}
                        onClick={() => setCurrentBannerIndex(idx)}
                        aria-label={`الانتقال إلى الإعلان ${idx + 1}`}
                        className={`h-1.5 rounded-full transition-all ${
                          idx === currentBannerIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Tablet & Desktop View: Rich wide slider (>= sm) */}
              <div className="hidden sm:grid grid-cols-1 lg:grid-cols-12 items-center min-h-[320px] sm:min-h-[420px]">
                {/* Text & CTAs */}
                <div className="p-4 sm:p-8 lg:p-12 lg:col-span-7 space-y-3 sm:space-y-4 z-10">
                  <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[11px] sm:text-xs font-bold text-purple-200">
                    <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-purple-300" />
                    <span>{currentBanner.badgeText || 'السوق العراقي الأصيل · موثوق ومضمون'}</span>
                  </div>

                  <h1 className="text-xl sm:text-3xl lg:text-5xl font-black tracking-tight leading-tight text-white transition-all duration-300">
                    {currentBanner.title}
                  </h1>

                  {currentBanner.subtitle && (
                    <p className="text-xs sm:text-sm text-purple-100 max-w-xl leading-relaxed">
                      {currentBanner.subtitle}
                    </p>
                  )}

                  {/* Fast Features */}
                  <div className="pt-1 sm:pt-2 flex flex-wrap gap-3 sm:gap-4 text-xs font-semibold text-purple-200">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
                      <span>{t('home_hero_reviews', 'تقييمات موثقة بمشتريات حقيقية')}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-300" />
                      <span>{t('home_hero_delivery', 'توصيل لكافة المحافظات الـ 19')}</span>
                    </div>
                  </div>

                  {/* CTA Buttons */}
                  <div className="pt-2 sm:pt-3 flex flex-wrap items-center gap-2 sm:gap-3">
                    <button
                      onClick={() => onNavigateCategories(currentBanner.linkCategorySlug || 'all')}
                      className="px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-white text-purple-950 font-black text-xs hover:bg-purple-50 transition shadow-md cursor-pointer flex items-center gap-2"
                    >
                      <span>{t('home_hero_browse', 'تصفح المنتجات الآن')}</span>
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onNavigateCategories('all', 30)}
                      className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-purple-800/80 hover:bg-purple-800 text-white border border-purple-600 font-bold text-xs transition cursor-pointer"
                    >
                      {t('home_hero_discounts', 'العروض والخصومات')}
                    </button>
                  </div>
                </div>

                {/* Hero Banner Image */}
                <div className="lg:col-span-5 h-64 sm:h-80 lg:h-full relative overflow-hidden bg-purple-900/50">
                  <img
                    src={currentBanner.imageUrl}
                    alt={currentBanner.title}
                    referrerPolicy="no-referrer"
                    onError={e => {
                      (e.target as HTMLImageElement).src = '/src/assets/images/hero_dukkana_market_1791352449347.jpg';
                    }}
                    className="w-full h-full object-cover object-center transition-all duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-purple-950/85 via-purple-950/20 to-transparent pointer-events-none"></div>
                </div>
              </div>

              {/* Slider Navigation Arrows for Tablet & Desktop if more than 1 banner */}
              {activeBanners.length > 1 && (
                <div className="hidden sm:block">
                  <button
                    onClick={handlePrevBanner}
                    aria-label="الإعلان السابق"
                    className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-xs transition cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleNextBanner}
                    aria-label="الإعلان التالي"
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-xs transition cursor-pointer"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>

                  {/* Indicator Dots */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
                    {activeBanners.map((b, idx) => (
                      <button
                        key={b.id}
                        onClick={() => setCurrentBannerIndex(idx)}
                        aria-label={`الانتقال إلى الإعلان ${idx + 1}`}
                        className={`h-2 rounded-full transition-all cursor-pointer ${
                          idx === currentBannerIndex ? 'w-6 bg-white' : 'w-2 bg-white/40 hover:bg-white/70'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Fallback if no banners exist */
            <div className="p-8 sm:p-12 text-center space-y-4">
              <h1 className="text-2xl sm:text-4xl font-black text-white">
                أهلاً بكم في سوق دكانة العراقي
              </h1>
              <p className="text-xs sm:text-sm text-purple-200 max-w-lg mx-auto">
                تسوق من أفضل التجار المحليين مع الدفع نقداً عند الاستلام.
              </p>
              <button
                onClick={() => onNavigateCategories('all')}
                className="px-6 py-2.5 bg-white text-purple-950 font-bold rounded-xl text-xs hover:bg-purple-50 transition cursor-pointer"
              >
                تصفح المنتجات
              </button>
            </div>
          )}
        </section>
      )}

      {/* 4. Products Container (بطاقات المنتجات أسفل بعضها البعض) */}
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 flex flex-col gap-8 sm:gap-12">
        {/* Section 1: Featured & Promoted Products (عروض مميزة / برعاية دكانة) */}
        {featuredProducts.length > 0 && (
          <section id="featured-products-section" data-section="featured" className="space-y-4 scroll-mt-24">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-purple-700 fill-purple-700" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-zinc-900">{t('home_featured_title', 'عروض مميزة / برعاية دكانة')}</h2>
                  <p className="text-[10px] sm:text-[11px] text-zinc-500">{t('home_featured_desc', 'منتجات تجارية مختارة ومروجة بأولوية كبرى لكافة المحافظات')}</p>
                </div>
                {promotedProducts.length > 0 && (
                  <span className="text-[10px] font-black bg-purple-900 text-white px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs mr-2">
                    <Sparkles className="w-2.5 h-2.5 text-purple-200 fill-purple-200" />
                    <span>{t('badge_promoted', 'مُميّز')} ({promotedProducts.length})</span>
                  </span>
                )}
              </div>
              <button
                onClick={() => onNavigateCategories('all')}
                className="text-xs text-purple-700 font-bold hover:underline cursor-pointer"
              >
                {t('home_featured_more', 'المزيد')}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-4 lg:gap-6">
              {featuredProducts.map(p => (
                <ProductCard
                  key={p.id}
                  product={p}
                  onSelect={onSelectProduct}
                  onOpenStore={onOpenStore}
                />
              ))}
            </div>
          </section>
        )}

        {/* Quick Discount Tiers Showcase (خصومات 50%, 30%, 10%) */}
        {!searchQuery && (
          <section className="bg-gradient-to-r from-purple-50 via-white to-purple-50/60 rounded-3xl border border-purple-100 p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-rose-600" />
                <h2 className="text-base sm:text-lg font-black text-zinc-900">
                  {t('home_big_discounts', 'تخفيضات السوق العراقي الكبرى')}
                </h2>
              </div>
              <span className="text-xs text-zinc-500">
                {t('home_big_discounts_desc', 'منتجات أصلية بأسعار مخفضة لفترة محدودة')}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 50% Discounts */}
              <div
                onClick={() => onNavigateCategories('all', 50)}
                className="bg-white p-4 rounded-2xl border border-rose-200 hover:border-rose-400 hover:shadow-sm transition cursor-pointer text-right space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                    {t('badge_discount', 'خصم')} 50%
                  </span>
                  <Percent className="w-4 h-4 text-rose-500" />
                </div>
                <h3 className="font-bold text-sm text-zinc-900">{t('home_disc_50_title', 'تخفيضات نصف السعر')}</h3>
                <p className="text-[11px] text-zinc-500">
                  {t('home_disc_50_desc', 'عسل طبيعي ومواد مختارة بنصف القيمة')} ({discount50.length})
                </p>
              </div>

              {/* 30% Discounts */}
              <div
                onClick={() => onNavigateCategories('all', 30)}
                className="bg-white p-4 rounded-2xl border border-purple-200 hover:border-purple-400 hover:shadow-sm transition cursor-pointer text-right space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                    {t('badge_discount', 'خصم')} 30%
                  </span>
                  <Percent className="w-4 h-4 text-purple-600" />
                </div>
                <h3 className="font-bold text-sm text-zinc-900">{t('home_disc_30_title', 'عروض التمور والمناسبات')}</h3>
                <p className="text-[11px] text-zinc-500">
                  {t('home_disc_30_desc', 'تمور فاخرة وهدايا عراقية مميزة')} ({discount30.length})
                </p>
              </div>

              {/* 10% Discounts */}
              <div
                onClick={() => onNavigateCategories('all', 10)}
                className="bg-white p-4 rounded-2xl border border-zinc-200 hover:border-zinc-400 hover:shadow-sm transition cursor-pointer text-right space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-zinc-800 bg-zinc-100 px-2 py-0.5 rounded-md border border-zinc-200">
                    {t('badge_discount', 'خصم')} 10%
                  </span>
                  <Percent className="w-4 h-4 text-zinc-500" />
                </div>
                <h3 className="font-bold text-sm text-zinc-900">{t('home_disc_10_title', 'تخفيضات أطقم الضيافة والمطاعم')}</h3>
                <p className="text-[11px] text-zinc-500">
                  {t('home_disc_10_desc', 'استكانات شاي ومشاوي طازجة')} ({discount10.length})
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Section 2: All Products (جميع المنتجات المعتمدة) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-zinc-900">
              {searchQuery ? `${t('search_no_results', 'نتائج البحث عن')} "${searchQuery}"` : t('home_all_products_title', 'جميع المنتجات في دكانة')}
            </h2>
            <span className="text-xs text-zinc-400">
              {customerProducts.length} {t('home_products_available', 'منتج متاح')}
            </span>
          </div>

          {searchQuery && (
            <div className="p-3 bg-zinc-100/80 border border-zinc-200 rounded-2xl flex items-center justify-between text-xs text-zinc-700">
              <span>{t('search_no_results', 'نتائج البحث عن')}: "{searchQuery}"</span>
              <span className="text-[11px] font-bold text-zinc-600">
                {customerProducts.length} {t('home_products_available', 'منتج مطابق')}
              </span>
            </div>
          )}

          {customerProducts.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-zinc-200 p-8 space-y-2">
              <h3 className="text-sm font-bold text-zinc-800">{t('home_no_products', 'لا توجد منتجات مطابقة للبحث')}</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                {t('home_no_products_desc', 'تحقق من الكلمات أو ابحث باسم عام مثل "تمور"، "شاي"، "عسل".')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-4 lg:gap-6">
              {customerProducts.map(p => (
                <ProductCard
                  key={p.id}
                  product={p}
                  onSelect={onSelectProduct}
                  onOpenStore={onOpenStore}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
