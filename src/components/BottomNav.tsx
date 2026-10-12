import React from 'react';
import {
  Home,
  LayoutGrid,
  ShoppingBag,
  PackageCheck,
  User as UserIcon,
  Store,
  ShieldCheck,
} from 'lucide-react';
import { useMarket } from '../context/MarketContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

interface BottomNavProps {
  activeView: 'home' | 'categories' | 'search' | 'orders' | 'profile' | 'merchant' | 'admin' | 'support' | 'wishlist';
  setActiveView: (view: 'home' | 'categories' | 'search' | 'orders' | 'profile' | 'merchant' | 'admin' | 'support' | 'wishlist') => void;
  onOpenCart: () => void;
  onOpenAuth?: () => void;
  unreadNotificationsCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeView,
  setActiveView,
  onOpenCart,
  onOpenAuth,
  unreadNotificationsCount = 0,
}) => {
  const { getCartTotalCount } = useMarket();
  const { role, isAdmin, isMerchant, isAuthenticated, currentUser } = useAuth();
  const { t } = useLanguage();
  const cartCount = getCartTotalCount();

  const handleTabClick = (view: 'home' | 'categories' | 'orders' | 'profile' | 'merchant' | 'admin') => {
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-purple-100/90 shadow-[0_-4px_25px_rgba(88,28,135,0.07)] pb-safe transition-all select-none"
      dir="rtl"
    >
      <div className="grid grid-cols-4 items-center h-16 max-w-lg mx-auto px-2">
        {/* Tab 1: الرئيسية (Home) */}
        <button
          type="button"
          onClick={() => handleTabClick('home')}
          className={`flex flex-col items-center justify-center h-full min-h-[48px] cursor-pointer transition-all ${
            activeView === 'home'
              ? 'text-purple-700 font-black'
              : 'text-zinc-500 hover:text-purple-900'
          }`}
          aria-label={t('nav_home', 'الرئيسية')}
        >
          <div className="relative flex items-center justify-center">
            <Home className={`w-5 h-5 transition-transform ${activeView === 'home' ? 'stroke-[2.5] scale-110' : ''}`} />
            {activeView === 'home' && (
              <span className="absolute -bottom-1.5 w-1.5 h-1.5 rounded-full bg-purple-700 shadow-xs" />
            )}
          </div>
          <span className={`text-[11px] mt-1 tracking-tight ${activeView === 'home' ? 'font-black text-purple-700' : 'font-medium'}`}>
            {t('nav_home', 'الرئيسية')}
          </span>
        </button>

        {/* Tab 2: الأقسام (Categories) */}
        <button
          type="button"
          onClick={() => handleTabClick('categories')}
          className={`flex flex-col items-center justify-center h-full min-h-[48px] cursor-pointer transition-all ${
            activeView === 'categories'
              ? 'text-purple-700 font-black'
              : 'text-zinc-500 hover:text-purple-900'
          }`}
          aria-label={t('nav_categories_short', 'الأقسام')}
        >
          <div className="relative flex items-center justify-center">
            <LayoutGrid className={`w-5 h-5 transition-transform ${activeView === 'categories' ? 'stroke-[2.5] scale-110' : ''}`} />
            {activeView === 'categories' && (
              <span className="absolute -bottom-1.5 w-1.5 h-1.5 rounded-full bg-purple-700 shadow-xs" />
            )}
          </div>
          <span className={`text-[11px] mt-1 tracking-tight ${activeView === 'categories' ? 'font-black text-purple-700' : 'font-medium'}`}>
            {t('nav_categories_short', 'الأقسام')}
          </span>
        </button>

        {/* Tab 3: السلة (Cart) */}
        <button
          type="button"
          onClick={onOpenCart}
          className="relative flex flex-col items-center justify-center h-full min-h-[48px] cursor-pointer text-zinc-500 hover:text-purple-700 transition-all active:scale-95"
          aria-label={t('nav_cart', 'السلة')}
        >
          <div className="relative flex items-center justify-center">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shadow-2xs border border-purple-200/80">
              <ShoppingBag className="w-5 h-5" />
            </div>
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[19px] h-[19px] rounded-full bg-purple-700 text-white text-[10px] font-black flex items-center justify-center px-1 shadow-sm ring-2 ring-white animate-in zoom-in-50">
                {cartCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight font-bold text-purple-800">
            {t('nav_cart', 'السلة')}
          </span>
        </button>

        {/* Tab 4: الحساب (Account / Dashboard / Login) */}
        <button
          type="button"
          onClick={() => {
            if (!isAuthenticated) {
              if (onOpenAuth) onOpenAuth();
              return;
            }
            if (isAdmin) handleTabClick('admin');
            else if (isMerchant) handleTabClick('merchant');
            else handleTabClick('profile');
          }}
          className={`flex flex-col items-center justify-center h-full min-h-[48px] cursor-pointer transition-all ${
            activeView === 'profile' || activeView === 'merchant' || activeView === 'admin'
              ? 'text-purple-700 font-black'
              : 'text-zinc-500 hover:text-purple-900'
          }`}
          aria-label={
            !isAuthenticated
              ? t('btn_login', 'الحساب')
              : isAdmin
              ? t('nav_admin', 'الإدارة')
              : isMerchant
              ? t('nav_merchant', 'المتجر')
              : t('nav_profile', 'الحساب')
          }
        >
          <div className="relative flex items-center justify-center">
            {!isAuthenticated ? (
              <UserIcon className="w-5 h-5" />
            ) : currentUser?.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt=""
                className="w-5 h-5 rounded-full object-cover border border-purple-500 shadow-2xs"
              />
            ) : isAdmin ? (
              <ShieldCheck className="w-5 h-5 text-purple-900" />
            ) : isMerchant ? (
              <Store className="w-5 h-5 text-purple-700" />
            ) : (
              <UserIcon className="w-5 h-5" />
            )}
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse ring-2 ring-white" />
            )}
            {(activeView === 'profile' || activeView === 'merchant' || activeView === 'admin') && (
              <span className="absolute -bottom-1.5 w-1.5 h-1.5 rounded-full bg-purple-700 shadow-xs" />
            )}
          </div>
          <span className={`text-[11px] mt-1 tracking-tight ${
            activeView === 'profile' || activeView === 'merchant' || activeView === 'admin'
              ? 'font-black text-purple-700'
              : 'font-medium'
          }`}>
            {!isAuthenticated
              ? t('nav_profile', 'الحساب')
              : isAdmin
              ? t('nav_admin', 'الإدارة')
              : isMerchant
              ? t('nav_merchant', 'المتجر')
              : t('nav_profile', 'الحساب')}
          </span>
        </button>
      </div>
    </nav>
  );
};
