import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  User as UserIcon,
  HelpCircle,
  ShieldCheck,
  Store,
  Search,
  X,
  MapPin,
  Menu,
  MessageSquare,
  Bell,
  Heart,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  LogOut,
  PackageCheck,
  LayoutGrid,
  Home,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useMarket } from '../context/MarketContext';
import { useLanguage } from '../context/LanguageContext';
import { DukkanaLogo } from './DukkanaLogo';
import { IRAQI_GOVERNORATES } from '../data/governorates';
import { IraqiGovernorate } from '../types';

interface HeaderProps {
  onOpenCart: () => void;
  onOpenAuth: () => void;
  onOpenSupport: () => void;
  onOpenCompliance: () => void;
  onOpenSplash?: () => void;
  onOpenChat?: () => void;
  onOpenNotifications?: () => void;
  unreadNotificationsCount?: number;
  unreadChatCount?: number;
  onOpenMerchantDashboard?: () => void;
  onOpenAdminDashboard?: () => void;
  activeView: 'home' | 'categories' | 'search' | 'orders' | 'profile' | 'merchant' | 'admin' | 'support' | 'wishlist';
  setActiveView: (view: 'home' | 'categories' | 'search' | 'orders' | 'profile' | 'merchant' | 'admin' | 'support' | 'wishlist') => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenCart,
  onOpenAuth,
  onOpenSupport,
  onOpenCompliance,
  onOpenSplash,
  onOpenChat,
  onOpenNotifications,
  unreadNotificationsCount = 0,
  unreadChatCount = 0,
  activeView,
  setActiveView,
}) => {
  const { currentUser, role, isAuthenticated, isAdmin, isMerchant, isSupport, logout } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const {
    getCartTotalCount,
    searchQuery,
    setSearchQuery,
    selectedGovernorate,
    setSelectedGovernorate,
    wishlist,
  } = useMarket();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  // Close mobile menu when active view changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [activeView]);

  // Close mobile menu on Esc key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const cartCount = getCartTotalCount();

  const handleNavClick = (view: typeof activeView) => {
    setActiveView(view);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-zinc-200 shadow-xs">
      {/* Top Notification / Trust Bar (Desktop Only) */}
      <div className="hidden md:flex bg-purple-900 text-white text-xs py-1 px-4 text-center font-medium items-center justify-between">
        <div className="flex items-center gap-2 mx-auto">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>{t('top_trust_bar', 'سوق دُكَّانَة العراقي الرسمي · التوصيل لكافة المحافظات الـ 19 · الدفع نقداً عند الاستلام')}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {onOpenSplash && (
            <button
              onClick={onOpenSplash}
              className="text-purple-200 hover:text-white text-[11px] inline-flex items-center gap-1 cursor-pointer transition"
              title={t('splash_button', 'عرض شاشة البداية')}
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-300" />
              {t('splash_button', 'شاشة البداية')}
            </button>
          )}
          <button
            onClick={onOpenCompliance}
            className="text-purple-200 hover:text-white underline text-[11px] inline-flex items-center gap-1 cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            {t('policy_button', 'سياسات وتوافق Apple & Google')}
          </button>
        </div>
      </div>

      {/* Main Top Bar: Brand | Desktop Nav | Actions & Mobile Switcher */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Zone 1: Brand Logo - Mobile Responsive & Crisp */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handleNavClick('home')}
            className="flex items-center group text-right cursor-pointer focus:outline-none"
            aria-label="دُكَّانَة - الصفحة الرئيسية"
          >
            <div className="block sm:hidden">
              <DukkanaLogo size="xs" variant="compact" showSubline={false} />
            </div>
            <div className="hidden sm:block">
              <DukkanaLogo size="md" variant="full" />
            </div>
          </button>
        </div>

        {/* Zone 2: Desktop Navigation Links (Hidden on Mobile) */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-zinc-600">
          <button
            onClick={() => handleNavClick('home')}
            className={`cursor-pointer transition-colors ${
              activeView === 'home' ? 'text-purple-700 font-bold border-b-2 border-purple-700 pb-0.5' : 'hover:text-zinc-950'
            }`}
          >
            {t('nav_home', 'الرئيسية')}
          </button>
          <button
            onClick={() => handleNavClick('search')}
            className={`cursor-pointer transition-colors ${
              activeView === 'search' ? 'text-purple-700 font-bold border-b-2 border-purple-700 pb-0.5' : 'hover:text-zinc-950'
            }`}
          >
            {t('nav_search', 'البحث والفلترة')}
          </button>
          <button
            onClick={() => handleNavClick('categories')}
            className={`cursor-pointer transition-colors ${
              activeView === 'categories' ? 'text-purple-700 font-bold border-b-2 border-purple-700 pb-0.5' : 'hover:text-zinc-950'
            }`}
          >
            {t('nav_categories', 'الأقسام والخصومات')}
          </button>
          <button
            onClick={() => handleNavClick('orders')}
            className={`cursor-pointer transition-colors ${
              activeView === 'orders' ? 'text-purple-700 font-bold border-b-2 border-purple-700 pb-0.5' : 'hover:text-zinc-950'
            }`}
          >
            {role === 'merchant' ? t('nav_orders_merchant', 'طلبات المتجر') : t('nav_orders', 'طلباتي')}
          </button>

          {/* Merchant Exclusive Portal Tab */}
          {role === 'merchant' && (
            <button
              onClick={() => handleNavClick('merchant')}
              className={`cursor-pointer text-purple-700 font-bold flex items-center gap-1.5 ${
                activeView === 'merchant' ? 'border-b-2 border-purple-700 pb-0.5' : ''
              }`}
            >
              <Store className="w-4 h-4" />
              <span>{t('nav_merchant', 'لوحة المتجر')}</span>
            </button>
          )}

          {/* Admin Exclusive Portal Tab */}
          {isAdmin && (
            <>
              <button
                onClick={() => handleNavClick('admin')}
                className={`cursor-pointer text-purple-950 font-black flex items-center gap-1.5 ${
                  activeView === 'admin' ? 'border-b-2 border-purple-900 pb-0.5' : ''
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-purple-700" />
                <span>{t('nav_admin', 'لوحة المدير')}</span>
              </button>
              <button
                onClick={() => handleNavClick('support')}
                className={`cursor-pointer text-indigo-900 font-bold flex items-center gap-1.5 ${
                  activeView === 'support' ? 'border-b-2 border-indigo-700 pb-0.5' : ''
                }`}
              >
                <HelpCircle className="w-4 h-4 text-indigo-700" />
                <span>{t('nav_support', 'فريق الدعم')}</span>
              </button>
            </>
          )}
        </nav>

        {/* Zone 3: Actions (Language Switcher, Role Badge, Support, Cart, User, Hamburger) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Distinct Language Switcher (عربي / کوردی) - Always Visible & Prominent (Single-Row Segmented) */}
          <div className="inline-flex items-center bg-purple-100/90 p-0.5 rounded-xl border border-purple-200/90 shrink-0 flex-nowrap gap-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => setLang('ar')}
              className={`px-2 sm:px-2.5 py-1 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer select-none ${
                lang === 'ar'
                  ? 'bg-purple-900 text-white shadow-xs'
                  : 'text-purple-700 hover:text-purple-950 hover:bg-purple-200/60'
              }`}
              title="التحويل إلى اللغة العربية"
              aria-label="اللغة العربية"
            >
              عربي
            </button>
            <button
              type="button"
              onClick={() => setLang('ku')}
              className={`px-2 sm:px-2.5 py-1 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer select-none ${
                lang === 'ku'
                  ? 'bg-purple-900 text-white shadow-xs'
                  : 'text-purple-700 hover:text-purple-950 hover:bg-purple-200/60'
              }`}
              title="گۆڕین بۆ زمانی کوردی (سۆرانی)"
              aria-label="زمانی کوردی"
            >
              کوردی
            </button>
          </div>

          {/* Desktop-only Role Badge */}
          {isAuthenticated && currentUser && (
            <div
              className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${
                isAdmin
                  ? 'bg-purple-950 text-purple-100 border-purple-800'
                  : role === 'merchant'
                  ? 'bg-purple-50 text-purple-900 border-purple-200'
                  : 'bg-zinc-100 text-zinc-700 border-zinc-200'
              }`}
            >
              {isAdmin ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t('role_admin', 'المدير الرئيسي')}</span>
                </>
              ) : role === 'merchant' ? (
                <>
                  <Store className="w-3.5 h-3.5 text-purple-700" />
                  <span>{t('role_merchant', 'تاجر دكانة')}</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>{t('role_customer', 'زبون')}</span>
                </>
              )}
            </div>
          )}

          {/* Desktop-only Notifications Button */}
          {isAuthenticated && onOpenNotifications && (
            <button
              onClick={onOpenNotifications}
              className="hidden md:flex relative p-2 sm:p-2.5 rounded-xl text-zinc-600 hover:text-purple-700 hover:bg-zinc-100 transition cursor-pointer"
              title={t('nav_notifications', 'الإشعارات والتنبيهات')}
            >
              <Bell className="w-5 h-5" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-purple-600 text-white text-[10px] font-black flex items-center justify-center px-1 shadow-sm animate-pulse">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>
          )}

          {/* Desktop-only Chat Button */}
          {isAuthenticated && onOpenChat && (
            <button
              onClick={onOpenChat}
              className="hidden md:flex relative p-2 sm:p-2.5 rounded-xl text-zinc-600 hover:text-purple-700 hover:bg-zinc-100 transition cursor-pointer"
              title={t('nav_chat', 'المحادثات الخاصة')}
            >
              <MessageSquare className="w-5 h-5" />
              {unreadChatCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center px-1 shadow-sm">
                  {unreadChatCount}
                </span>
              )}
            </button>
          )}

          {/* Desktop-only Support Modal Button */}
          <button
            onClick={onOpenSupport}
            className="hidden md:flex p-2 sm:p-2.5 rounded-xl text-zinc-600 hover:text-purple-700 hover:bg-zinc-100 transition cursor-pointer"
            title={t('nav_support_full', 'الدعم والمساعدة')}
          >
            <HelpCircle className="w-5 h-5" />
          </button>

          {/* Desktop-only Wishlist Button */}
          <button
            onClick={() => handleNavClick('wishlist')}
            className={`hidden md:flex relative p-2 sm:p-2.5 rounded-xl transition cursor-pointer ${
              activeView === 'wishlist'
                ? 'bg-rose-50 text-rose-600 border border-rose-200'
                : 'text-zinc-600 hover:text-rose-600 hover:bg-zinc-100'
            }`}
            title={t('nav_wishlist_full', 'قائمة المفضلة')}
          >
            <Heart className={`w-5 h-5 ${wishlist.length > 0 ? 'fill-rose-500/20 text-rose-600' : ''}`} />
            {wishlist.length > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[19px] h-[19px] rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center px-1 shadow-sm">
                {wishlist.length}
              </span>
            )}
          </button>

          {/* Desktop-only Shopping Bag Button with count badge (On mobile it is located in the fixed bottom navigation bar) */}
          <button
            onClick={onOpenCart}
            className="hidden md:flex relative p-2 sm:p-2.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 transition cursor-pointer shrink-0"
            title={t('nav_cart_full', 'سلة المشتريات')}
          >
            <ShoppingBag className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[19px] h-[19px] rounded-full bg-purple-600 text-white text-[10px] font-bold flex items-center justify-center px-1 shadow-sm">
                {cartCount}
              </span>
            )}
          </button>

          {/* Desktop-only User Auth / Profile Button */}
          <div className="hidden md:block">
            {isAuthenticated && currentUser ? (
              <button
                onClick={() => handleNavClick('profile')}
                className="flex items-center gap-1.5 p-1.5 pr-2.5 rounded-xl border border-zinc-200 hover:border-purple-300 text-xs font-bold text-zinc-800 transition cursor-pointer"
              >
                <div className="w-6 h-6 rounded-full bg-purple-700 text-white flex items-center justify-center text-xs font-bold overflow-hidden border border-purple-200 shrink-0 shadow-xs">
                  {currentUser.avatarUrl ? (
                    <img
                      src={currentUser.avatarUrl}
                      alt={currentUser.displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    currentUser.displayName.charAt(0) || 'م'
                  )}
                </div>
                <span className="max-w-[90px] truncate">{currentUser.displayName}</span>
              </button>
            ) : (
              <button
                onClick={onOpenAuth}
                className="px-3 py-1.5 rounded-xl bg-purple-700 text-white text-xs font-bold hover:bg-purple-800 transition cursor-pointer flex items-center gap-1 shadow-sm"
              >
                <UserIcon className="w-4 h-4" />
                <span>{t('btn_login', 'تسجيل الدخول / إنشاء حساب')}</span>
              </button>
            )}
          </div>

          {/* Mobile Hamburger Menu Toggle Button (Visible only on mobile screens < md) */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(prev => !prev)}
            className="md:hidden relative p-2 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 hover:text-purple-700 transition cursor-pointer shrink-0"
            aria-label="القائمة الرئيسية"
            title="القائمة الرئيسية"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5 text-purple-700" /> : <Menu className="w-5 h-5" />}
            {/* Unread indicator dot */}
            {(unreadNotificationsCount > 0 || unreadChatCount > 0) && !isMobileMenuOpen && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse ring-2 ring-white"></span>
            )}
          </button>
        </div>
      </div>

      {/* Sub-bar: Standard Direct Search & Governorate Selection (Desktop Only) */}
      <div className="hidden md:block bg-zinc-50 border-t border-zinc-200/80 px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-row items-center gap-2">
          {/* Standard Text Search Input */}
          <div className="flex-1 min-w-0 relative">
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-zinc-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                if (e.target.value && activeView !== 'search' && activeView !== 'home') {
                  setActiveView('search');
                }
              }}
              placeholder={t('search_placeholder', 'ابحث عن منتج، متجر، أو تصنيف...')}
              className="w-full pr-9 pl-7 py-2 sm:py-2.5 bg-white rounded-xl border border-zinc-200 text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600 transition shadow-2xs font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 left-0 pl-2 flex items-center text-zinc-400 hover:text-zinc-600 cursor-pointer"
                title="مسح البحث"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Iraqi Governorate Fast Selector */}
          <div className="w-52 shrink-0">
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-purple-700">
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <select
                value={selectedGovernorate}
                onChange={e => setSelectedGovernorate(e.target.value as IraqiGovernorate | 'all')}
                className="w-full pr-7 pl-2 py-2 sm:py-2.5 bg-white rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600 transition cursor-pointer appearance-none truncate"
              >
                <option value="all">{t('all_governorates_option', 'كافة المحافظات العراقية (19)')}</option>
                {IRAQI_GOVERNORATES.map(gov => (
                  <option key={gov.id} value={gov.id}>
                    {lang === 'ku' && gov.nameKu ? gov.nameKu : gov.nameAr}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </header>

    {/* Header Placeholder Spacer (Strictly matches fixed header height so search bar and content start cleanly beneath) */}
    <div className="h-14 sm:h-16 md:h-[88px] shrink-0 pointer-events-none select-none" aria-hidden="true" />

    {/* Mobile Hamburger Side Drawer Menu - Overlay & Slide-in Drawer */}
    {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 overflow-hidden" dir="rtl">
          {/* Semi-transparent Backdrop Overlay */}
          <div
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-300 cursor-pointer"
            aria-hidden="true"
          />

          {/* Side Drawer Panel (Slides in from the right in RTL) */}
          <aside
            onClick={e => e.stopPropagation()}
            className="fixed inset-y-0 right-0 max-w-[85vw] w-80 bg-white h-full shadow-2xl flex flex-col z-50 border-l border-purple-100/80 animate-in slide-in-from-right duration-300 overflow-hidden"
          >
            {/* Drawer Header with Logo & Clear Close Button (X) */}
            <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-purple-50/60 shrink-0">
              <div className="flex items-center gap-2">
                <DukkanaLogo size="xs" variant="compact" showSubline={false} />
              </div>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-9 h-9 rounded-xl bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-600 hover:text-zinc-950 flex items-center justify-center transition cursor-pointer shadow-xs focus:outline-none"
                aria-label="إغلاق القائمة"
                title="إغلاق"
              >
                <X className="w-5 h-5 text-zinc-700" />
              </button>
            </div>

            {/* Scrollable Drawer Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
              {/* User Profile / Login Card */}
              <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200/90 flex items-center justify-between gap-3">
                {isAuthenticated && currentUser ? (
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-purple-700 text-white flex items-center justify-center font-bold text-sm overflow-hidden border border-purple-200 shadow-xs shrink-0">
                      {currentUser.avatarUrl ? (
                        <img src={currentUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        currentUser.displayName.charAt(0) || 'م'
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-zinc-900 truncate">{currentUser.displayName}</h4>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-900">
                          {isAdmin
                            ? t('role_admin', 'المدير الرئيسي')
                            : role === 'merchant'
                            ? t('role_merchant', 'تاجر دكانة')
                            : t('role_customer', 'زبون')}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between w-full">
                    <div>
                      <h4 className="text-xs font-black text-zinc-900">{lang === 'ku' ? 'بەخێربێن بۆ دوکانە' : 'أهلاً بك في دكانة'}</h4>
                      <p className="text-[10px] text-zinc-500">{lang === 'ku' ? 'چوونەژوورەوە بۆ سوودمەندبوون لە خزمەتگوزارییەکان' : 'سجل الدخول لإدارة طلباتك'}</p>
                    </div>
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onOpenAuth();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-purple-700 text-white text-xs font-bold hover:bg-purple-800 transition cursor-pointer shadow-xs shrink-0"
                    >
                      {t('btn_login', 'تسجيل الدخول')}
                    </button>
                  </div>
                )}

                {isAuthenticated && currentUser && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleNavClick('profile')}
                      className="px-2 py-1 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-100 text-[10px] font-bold text-zinc-700 transition"
                    >
                      {t('nav_profile', 'حسابي')}
                    </button>
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        logout();
                      }}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      title={t('btn_logout', 'تسجيل الخروج')}
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Quick Search & Governorate Selector in Mobile Drawer */}
              <div className="space-y-2 pb-2 border-b border-zinc-100">
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-zinc-400">
                    <Search className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => {
                      setSearchQuery(e.target.value);
                      if (e.target.value && activeView !== 'search' && activeView !== 'home') {
                        setActiveView('search');
                      }
                    }}
                    placeholder={t('search_placeholder', 'ابحث عن منتج، متجر، أو تصنيف...')}
                    className="w-full pr-8 pl-3 py-2 bg-zinc-50 rounded-xl border border-zinc-200 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600 font-medium"
                  />
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-purple-700">
                    <MapPin className="w-3.5 h-3.5" />
                  </div>
                  <select
                    value={selectedGovernorate}
                    onChange={e => setSelectedGovernorate(e.target.value as IraqiGovernorate | 'all')}
                    className="w-full pr-8 pl-3 py-2 bg-zinc-50 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600 appearance-none"
                  >
                    <option value="all">{t('all_governorates_option', 'كافة المحافظات العراقية (19)')}</option>
                    {IRAQI_GOVERNORATES.map(gov => (
                      <option key={gov.id} value={gov.id}>
                        {lang === 'ku' && gov.nameKu ? gov.nameKu : gov.nameAr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Main Navigation Links List */}
              <div className="space-y-1">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider px-2">
                  {lang === 'ku' ? 'بەشە سەرەکییەکان' : 'الأقسام الرئيسية'}
                </span>

                <button
                  onClick={() => handleNavClick('home')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition ${
                    activeView === 'home' ? 'bg-purple-50 text-purple-700 font-black' : 'text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Home className="w-4 h-4 text-purple-700" />
                    <span>{t('nav_home', 'الرئيسية')}</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-zinc-400" />
                </button>

                <button
                  onClick={() => handleNavClick('search')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition ${
                    activeView === 'search' ? 'bg-purple-50 text-purple-700 font-black' : 'text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Search className="w-4 h-4 text-purple-700" />
                    <span>{t('nav_search', 'البحث والفلترة')}</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-zinc-400" />
                </button>

                <button
                  onClick={() => handleNavClick('categories')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition ${
                    activeView === 'categories' ? 'bg-purple-50 text-purple-700 font-black' : 'text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <LayoutGrid className="w-4 h-4 text-purple-700" />
                    <span>{t('nav_categories', 'الأقسام والخصومات')}</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-zinc-400" />
                </button>

                <button
                  onClick={() => handleNavClick('orders')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition ${
                    activeView === 'orders' ? 'bg-purple-50 text-purple-700 font-black' : 'text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <PackageCheck className="w-4 h-4 text-purple-700" />
                    <span>{role === 'merchant' ? t('nav_orders_merchant', 'طلبات المتجر') : t('nav_orders', 'طلباتي')}</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-zinc-400" />
                </button>

                {/* Merchant Dashboard Tab */}
                {role === 'merchant' && (
                  <button
                    onClick={() => handleNavClick('merchant')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition ${
                      activeView === 'merchant' ? 'bg-purple-50 text-purple-700 font-black' : 'text-purple-700 hover:bg-purple-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Store className="w-4 h-4 text-purple-700" />
                      <span>{t('nav_merchant', 'لوحة المتجر')}</span>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-purple-400" />
                  </button>
                )}

                {/* Admin Dashboard Tab */}
                {isAdmin && (
                  <>
                    <button
                      onClick={() => handleNavClick('admin')}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition ${
                        activeView === 'admin' ? 'bg-purple-100 text-purple-950 font-black' : 'text-purple-950 hover:bg-purple-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <ShieldCheck className="w-4 h-4 text-purple-800" />
                        <span>{t('nav_admin', 'لوحة المدير')}</span>
                      </div>
                      <ChevronLeft className="w-4 h-4 text-purple-400" />
                    </button>
                    <button
                      onClick={() => handleNavClick('support')}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition ${
                        activeView === 'support' ? 'bg-indigo-50 text-indigo-900 font-black' : 'text-indigo-900 hover:bg-indigo-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <HelpCircle className="w-4 h-4 text-indigo-700" />
                        <span>{t('nav_support', 'فريق الدعم')}</span>
                      </div>
                      <ChevronLeft className="w-4 h-4 text-indigo-400" />
                    </button>
                  </>
                )}
              </div>

              {/* Quick Actions & Features Grid */}
              <div className="pt-2 border-t border-zinc-100">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider px-2 block mb-2">
                  {lang === 'ku' ? 'خزمەتگوزارییە خێراکان' : 'الخدمات السريعة'}
                </span>

                <div className="grid grid-cols-2 gap-2">
                  {/* Cart */}
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenCart();
                    }}
                    className="flex items-center gap-1.5 p-2 rounded-xl border border-purple-200 bg-purple-50/70 hover:bg-purple-100 text-xs font-bold text-purple-900 transition"
                  >
                    <ShoppingBag className="w-3.5 h-3.5 text-purple-700" />
                    <span>{t('nav_cart', 'السلة')}</span>
                    {cartCount > 0 && (
                      <span className="mr-auto px-1.5 py-0.5 rounded-full bg-purple-700 text-white text-[9px] font-bold">
                        {cartCount}
                      </span>
                    )}
                  </button>

                  {/* Wishlist */}
                  <button
                    onClick={() => handleNavClick('wishlist')}
                    className="flex items-center gap-1.5 p-2 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-xs font-bold text-zinc-700 transition"
                  >
                    <Heart className={`w-3.5 h-3.5 text-rose-500 ${wishlist.length > 0 ? 'fill-rose-500' : ''}`} />
                    <span>{t('nav_wishlist', 'المفضلة')}</span>
                    {wishlist.length > 0 && (
                      <span className="mr-auto px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-bold">
                        {wishlist.length}
                      </span>
                    )}
                  </button>

                  {/* Support */}
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenSupport();
                    }}
                    className="flex items-center gap-1.5 p-2 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-xs font-bold text-zinc-700 transition"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-purple-700" />
                    <span>{t('nav_support_full', 'الدعم والمساعدة')}</span>
                  </button>

                  {/* Notifications */}
                  {isAuthenticated && onOpenNotifications && (
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onOpenNotifications();
                      }}
                      className="flex items-center gap-1.5 p-2 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-xs font-bold text-zinc-700 transition"
                    >
                      <Bell className="w-3.5 h-3.5 text-purple-700" />
                      <span>{t('nav_notifications', 'الإشعارات')}</span>
                      {unreadNotificationsCount > 0 && (
                        <span className="mr-auto px-1.5 py-0.5 rounded-full bg-purple-600 text-white text-[9px] font-bold">
                          {unreadNotificationsCount}
                        </span>
                      )}
                    </button>
                  )}

                  {/* Chat */}
                  {isAuthenticated && onOpenChat && (
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onOpenChat();
                      }}
                      className="flex items-center gap-1.5 p-2 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-xs font-bold text-zinc-700 transition"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-purple-700" />
                      <span>{t('nav_chat', 'المحادثات')}</span>
                      {unreadChatCount > 0 && (
                        <span className="mr-auto px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[9px] font-bold">
                          {unreadChatCount}
                        </span>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Policy & Compliance Links */}
              <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500">
                {onOpenSplash && (
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenSplash();
                    }}
                    className="hover:text-purple-700 inline-flex items-center gap-1 font-bold cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    <span>{t('splash_button', 'شاشة البداية')}</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenCompliance();
                  }}
                  className="hover:text-purple-700 inline-flex items-center gap-1 font-bold cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                  <span>{t('policy_button', 'السياسات والتوافق')}</span>
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
};
