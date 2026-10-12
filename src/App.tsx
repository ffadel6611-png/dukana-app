import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MarketProvider, useMarket } from './context/MarketContext';
import { LanguageProvider } from './context/LanguageContext';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { HomeView } from './components/HomeView';
import { CategoriesView } from './components/CategoriesView';
import { OrdersView } from './components/OrdersView';
import { MerchantDashboard } from './components/MerchantDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { UserProfileView } from './components/UserProfileView';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { AuthModal } from './components/AuthModal';
import { SupportModal } from './components/SupportModal';
import { ComplianceModal } from './components/ComplianceModal';
import { ReviewModal } from './components/ReviewModal';
import { ReportReviewModal } from './components/ReportReviewModal';
import { SupportDashboard } from './components/SupportDashboard';
import { AuthScreen } from './components/AuthScreen';
import { Footer } from './components/Footer';
import { StoreDetailModal } from './components/StoreDetailModal';
import { ChatModal } from './components/ChatModal';
import { NotificationsModal } from './components/NotificationsModal';
import { AdvancedSearchView } from './components/AdvancedSearchView';
import { SplashScreen } from './components/SplashScreen';
import { WishlistView } from './components/WishlistView';
import { Product, Review, Order, UserRole } from './types';
import { CheckCircle2, PackageCheck, Lock, ShieldAlert } from 'lucide-react';
import { reportUserActivity } from './utils/presence';

function DukkanaAppContent() {
  const { role, isAuthenticated, isAdmin, isMerchant, isSupport, deleteAccount } = useAuth();
  const { setSelectedCategorySlug, setSelectedDiscount, products } = useMarket();

  // Initial Splash Screen
  const [showSplash, setShowSplash] = useState(true);

  // Guest browse toggle when user is not logged in
  const [guestBrowse, setGuestBrowse] = useState(false);

  // Active Main View
  const [activeView, setActiveView] = useState<
    'home' | 'categories' | 'search' | 'orders' | 'profile' | 'merchant' | 'admin' | 'support' | 'wishlist'
  >('home');
  const [adminInitialTab, setAdminInitialTab] = useState<
    'overview' | 'promotions' | 'users' | 'merchants' | 'products' | 'categories' | 'orders' | 'reviews' | 'banners' | 'stories' | 'coupons' | 'settings' | undefined
  >();
  const [adminAutoOpenStoryModal, setAdminAutoOpenStoryModal] = useState(false);

  // Handle permanent account deletion (Apple & Google Compliant)
  const handleDeleteAccount = async (reason?: string) => {
    const res = await deleteAccount(reason || 'حذف مباشر ونهائي وفق سياسات آبل وجوجل');
    if (res.success) {
      setActiveView('home');
      setIsAuthOpen(false);
      setIsCartOpen(false);
      setIsCheckoutOpen(false);
      setIsChatOpen(false);
      setIsSupportOpen(false);
      setIsComplianceOpen(false);
      setGuestBrowse(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    return res;
  };

  // Search Navigation State
  const [searchInitialCategory, setSearchInitialCategory] = useState<string | undefined>();
  const [searchInitialQuery, setSearchInitialQuery] = useState<string | undefined>();
  const [searchInitialTab, setSearchInitialTab] = useState<'products' | 'jobs' | 'stores' | undefined>();

  const handleNavigateSearch = (categorySlug?: string, query?: string, tab?: 'products' | 'jobs' | 'stores') => {
    setSearchInitialCategory(categorySlug);
    setSearchInitialQuery(query);
    setSearchInitialTab(tab);
    setActiveView('search');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Modals & Drawers
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isComplianceOpen, setIsComplianceOpen] = useState(false);
  const [complianceInitialTab, setComplianceInitialTab] = useState<
    'privacy' | 'terms' | 'merchant_terms' | 'prohibited' | 'delete_account' | 'store_readiness'
  >('privacy');

  const handleOpenCompliance = (
    tab?: 'privacy' | 'terms' | 'merchant_terms' | 'prohibited' | 'delete_account' | 'store_readiness'
  ) => {
    if (tab) setComplianceInitialTab(tab);
    setIsComplianceOpen(true);
  };

  // Chat System State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInitialConversationId, setChatInitialConversationId] = useState<string | undefined>();
  const [chatRecipientId, setChatRecipientId] = useState<string | undefined>();
  const [chatRecipientRole, setChatRecipientRole] = useState<UserRole | undefined>();
  const [chatRecipientName, setChatRecipientName] = useState<string | undefined>();
  const [chatProductId, setChatProductId] = useState<string | undefined>();
  const [chatOrderId, setChatOrderId] = useState<string | undefined>();

  // Notifications System State
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  const { currentUser } = useAuth();

  const pollUnread = React.useCallback(async () => {
    if (!currentUser) {
      setUnreadNotifsCount(0);
      setUnreadChatCount(0);
      return;
    }
    try {
      const [notifRes, convRes] = await Promise.all([
        fetch(`/api/notifications?userId=${currentUser.id}`),
        fetch(`/api/chat/conversations?userId=${currentUser.id}`),
      ]);

      if (notifRes.ok) {
        const nData = await notifRes.json();
        const rawList = nData.notifications || [];
        const seen = new Set<string>();
        let unreadN = 0;
        for (const n of rawList) {
          const dedupKey = n.type === 'broadcast' || n.is_broadcast
            ? (n.entity_id ? `bcast_${n.entity_id}` : `bcast_${n.title}_${n.message}`)
            : n.id;
          if (!seen.has(dedupKey)) {
            seen.add(dedupKey);
            if (!n.is_read && !n.isRead) {
              unreadN++;
            }
          }
        }
        setUnreadNotifsCount(unreadN);
      }

      if (convRes.ok) {
        const cData = await convRes.json();
        let unreadM = 0;
        for (const c of cData.conversations || []) {
          if (c.participant1_id === currentUser.id) {
            unreadM += c.unread_count_p1 || 0;
          } else {
            unreadM += c.unread_count_p2 || 0;
          }
        }
        setUnreadChatCount(unreadM);
      }
    } catch {}
  }, [currentUser]);

  // Poll for unread notification count & unread messages count
  React.useEffect(() => {
    pollUnread();
    const interval = setInterval(pollUnread, 5000);
    return () => clearInterval(interval);
  }, [pollUnread]);

  // Real-time user presence tracking: update lastActiveTimestamp on page navigation or user presence
  React.useEffect(() => {
    if (currentUser) {
      reportUserActivity(currentUser.id, currentUser.phone);
    }
  }, [activeView, currentUser]);

  // Periodic heartbeat every 45s while browsing app
  React.useEffect(() => {
    if (!currentUser) return;
    const heartbeat = setInterval(() => {
      reportUserActivity(currentUser.id, currentUser.phone);
    }, 45000);
    return () => clearInterval(heartbeat);
  }, [currentUser]);

  const handleOpenChat = (
    recipientId?: string,
    recipientRole?: UserRole,
    recipientName?: string,
    prodId?: string,
    ordId?: string
  ) => {
    if (!isAuthenticated) {
      setIsAuthOpen(true);
      return;
    }
    setChatRecipientId(recipientId);
    setChatRecipientRole(recipientRole);
    setChatRecipientName(recipientName);
    setChatProductId(prodId);
    setChatOrderId(ordId);
    setIsChatOpen(true);
  };

  // Selected entities for modals
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedStoreMerchantId, setSelectedStoreMerchantId] = useState<string | null>(null);
  const [reviewModalData, setReviewModalData] = useState<{ productId: string; orderId: string } | null>(null);
  const [reportModalReview, setReportModalReview] = useState<Review | null>(null);

  // Order Success Toast Banner
  const [orderSuccessNotice, setOrderSuccessNotice] = useState<Order[] | null>(null);

  const handleOrderSuccess = (orders: Order[]) => {
    setOrderSuccessNotice(orders);
    setActiveView('orders');
    setTimeout(() => {
      setOrderSuccessNotice(null);
    }, 8000);
  };

  const handleNavigateCategories = (slug?: string, discount?: number) => {
    if (slug) setSelectedCategorySlug(slug);
    if (discount !== undefined) setSelectedDiscount(discount);
    setActiveView('categories');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAuthSuccess = (newRole: UserRole) => {
    setIsAuthOpen(false);
    if (newRole === 'admin') {
      setActiveView('admin');
    } else if (newRole === 'merchant') {
      setActiveView('merchant');
    } else {
      setActiveView('home');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Reset guest browse state if user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      setGuestBrowse(false);
    }
  }, [isAuthenticated]);

  // Deep Link Auto-Open for Shared Products (?product=prod_123)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const sharedProductId = params.get('product');
      if (sharedProductId && products && products.length > 0) {
        const found = products.find(p => p.id === sharedProductId);
        if (found) {
          setSelectedProduct(found);
        }
      }
    } catch {}
  }, [products]);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 flex flex-col font-sans selection:bg-purple-200 selection:text-purple-900 w-full max-w-full overflow-x-hidden">
      {/* Animated Splash Screen with modern purple SVG logo */}
      {showSplash && (
        <SplashScreen onFinish={() => setShowSplash(false)} />
      )}

      {/* Header */}
      <Header
        activeView={activeView}
        setActiveView={setActiveView}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenSupport={() => setIsSupportOpen(true)}
        onOpenCompliance={() => handleOpenCompliance('privacy')}
        onOpenSplash={() => setShowSplash(true)}
        onOpenChat={() => handleOpenChat()}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        unreadNotificationsCount={unreadNotifsCount}
        unreadChatCount={unreadChatCount}
      />

      {/* Order Confirmation Toast Notification */}
      {orderSuccessNotice && (
        <div className="max-w-4xl mx-auto px-4 mt-4 w-full animate-in fade-in slide-in-from-top duration-300">
          <div className="p-4 bg-emerald-700 text-white rounded-2xl shadow-lg flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-200 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <h4 className="font-black text-sm">
                تم استلام طلبك بنجاح والدفع عند الاستلام (نقداً)!
              </h4>
              <p className="mt-1 text-emerald-100">
                أرقام الطلبات الصادرة:{' '}
                <span className="font-mono font-bold text-white">
                  {orderSuccessNotice.map(o => o.id).join(' ، ')}
                </span>
                . سيتواصل معك مندوب كل متجر قبل موعد التوصيل.
              </p>
            </div>
            <button
              onClick={() => setOrderSuccessNotice(null)}
              className="text-emerald-200 hover:text-white font-bold text-sm cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main View Router with Strict Role Enforcement */}
      <main className="flex-1 pb-28 sm:pb-32 md:pb-8 w-full max-w-full overflow-x-hidden">
        {!isAuthenticated && !guestBrowse ? (
          <AuthScreen
            onGuestBrowse={() => setGuestBrowse(true)}
            onSuccess={handleAuthSuccess}
            onOpenCompliance={tab => handleOpenCompliance(tab || 'privacy')}
          />
        ) : (
          <>
            {activeView === 'home' && (
              <HomeView
                onSelectProduct={p => setSelectedProduct(p)}
                onNavigateCategories={handleNavigateCategories}
                onOpenStore={id => setSelectedStoreMerchantId(id)}
                onNavigateSearch={handleNavigateSearch}
                isAdmin={isAdmin}
                onOpenStoryAdmin={() => {
                  setAdminInitialTab('stories');
                  setAdminAutoOpenStoryModal(true);
                  setActiveView('admin');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            )}

            {activeView === 'search' && (
              <AdvancedSearchView
                onSelectProduct={p => setSelectedProduct(p)}
                onOpenStore={id => setSelectedStoreMerchantId(id)}
                onOpenChat={(recId, rRole, rName) => handleOpenChat(recId, rRole, rName)}
                onBackToHome={() => setActiveView('home')}
                initialCategorySlug={searchInitialCategory || 'all'}
                initialQuery={searchInitialQuery || ''}
                initialTab={searchInitialTab || 'products'}
              />
            )}

            {activeView === 'categories' && (
              <CategoriesView
                onSelectProduct={p => setSelectedProduct(p)}
                onOpenStore={id => setSelectedStoreMerchantId(id)}
              />
            )}

            {activeView === 'orders' && (
              <OrdersView
                onOpenReviewModal={(productId, orderId) =>
                  setReviewModalData({ productId, orderId })
                }
                onOpenChat={(mId, ordId, storeName) =>
                  handleOpenChat(mId, 'merchant', storeName, undefined, ordId)
                }
              />
            )}

            {/* Merchant Dashboard: strictly restricted to verified merchants */}
            {activeView === 'merchant' && (
              isMerchant ? (
                <MerchantDashboard
                  onOpenChat={(recId, rRole, rName) =>
                    handleOpenChat(recId || 'usr_admin', (rRole as UserRole) || 'admin', rName || 'إدارة منصة دكانة')
                  }
                />
              ) : (
                <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
                    <Lock className="w-8 h-8" />
                  </div>
                  <h2 className="text-xl font-black text-zinc-900">لوحة التاجر محمية</h2>
                  <p className="text-xs text-zinc-600 leading-relaxed">
                    هذه اللوحة مخصصة حصرياً للتجار المعتمدين في سوق دكانة لإدارة منتجاتهم والطلبات الواردة.
                  </p>
                  <button
                    onClick={() => setActiveView('home')}
                    className="px-5 py-2.5 bg-purple-700 text-white font-bold rounded-xl text-xs hover:bg-purple-800 transition cursor-pointer"
                  >
                    العودة للتسوق في دكانة
                  </button>
                </div>
              )
            )}

            {/* Admin Dashboard: strictly restricted to canonical Admin phone 07862214922 */}
            {activeView === 'admin' && (
              isAdmin ? (
                <AdminDashboard
                  onOpenChat={(recId, rRole, rName) =>
                    handleOpenChat(recId, (rRole as UserRole) || 'merchant', rName)
                  }
                  initialTab={adminInitialTab}
                  autoOpenStoryModal={adminAutoOpenStoryModal}
                />
              ) : (
                <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
                    <ShieldAlert className="w-8 h-8" />
                  </div>
                  <h2 className="text-xl font-black text-zinc-900">غير مصرح بالدخول إلى لوحة المدير</h2>
                  <p className="text-xs text-zinc-600 leading-relaxed">
                    لوحة الإدارة محمية برمجياً ومخصصة حصرياً للمدير الرئيسي الوحيد لمنصة دكانة بعد تسجيل الدخول والتحقق برمز OTP من رقم الهاتف المعتمد رسمياً.
                  </p>
                  <button
                    onClick={() => setActiveView('home')}
                    className="px-5 py-2.5 bg-purple-700 text-white font-bold rounded-xl text-xs hover:bg-purple-800 transition cursor-pointer"
                  >
                    العودة للصفحة الرئيسية
                  </button>
                </div>
              )
            )}

            {/* Support Dashboard: restricted to Admin and Support team */}
            {activeView === 'support' && (
              isSupport ? (
                <SupportDashboard />
              ) : (
                <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200">
                    <Lock className="w-8 h-8" />
                  </div>
                  <h2 className="text-xl font-black text-zinc-900">لوحة فريق الدعم محمية</h2>
                  <p className="text-xs text-zinc-600 leading-relaxed">
                    هذه البوابة مخصصة لفريق خدمة العملاء والدعم الفني المعتمد رسمياً لدى إدارة المنصة.
                  </p>
                  <button
                    onClick={() => setActiveView('home')}
                    className="px-5 py-2.5 bg-purple-700 text-white font-bold rounded-xl text-xs hover:bg-purple-800 transition cursor-pointer"
                  >
                    العودة للصفحة الرئيسية
                  </button>
                </div>
              )
            )}

            {activeView === 'wishlist' && (
              <WishlistView
                onSelectProduct={p => setSelectedProduct(p)}
                onOpenStore={id => setSelectedStoreMerchantId(id)}
                onNavigateHome={() => {
                  setActiveView('home');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onNavigateCategories={() => {
                  setActiveView('categories');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            )}

            {activeView === 'profile' && (
              <UserProfileView
                onOpenAuth={() => setIsAuthOpen(true)}
                onOpenCompliance={tab => handleOpenCompliance(tab || 'privacy')}
                onOpenSupport={() => setIsSupportOpen(true)}
                onOpenSplash={() => setShowSplash(true)}
                onDeleteAccount={handleDeleteAccount}
                onNavigateHome={() => {
                  setActiveView('home');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onNavigateWishlist={() => {
                  setActiveView('wishlist');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onNavigateOrders={() => {
                  setActiveView('orders');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <Footer
        onOpenCompliance={() => handleOpenCompliance('privacy')}
        onOpenSupport={() => setIsSupportOpen(true)}
        onNavigateHome={() => {
          setActiveView('home');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onNavigateCategories={() => {
          setActiveView('categories');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onNavigateOrders={() => {
          setActiveView('orders');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Mobile Fixed Bottom Navigation Bar */}
      <BottomNav
        activeView={activeView}
        setActiveView={setActiveView}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        unreadNotificationsCount={unreadNotifsCount}
      />

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onOpenReviewModal={(prodId, ordId) => {
          setSelectedProduct(null);
          setReviewModalData({ productId: prodId, orderId: ordId });
        }}
        onOpenReportModal={rev => setReportModalReview(rev)}
        onOpenStore={id => {
          setSelectedProduct(null);
          setSelectedStoreMerchantId(id);
        }}
        onOpenChat={(mId, prodId, storeName) => {
          setSelectedProduct(null);
          handleOpenChat(mId, 'merchant', storeName, prodId);
        }}
      />

      {/* Store Detail Modal (صفحة المتجر ومعرض صور المتجر للزبائن) */}
      <StoreDetailModal
        merchantId={selectedStoreMerchantId}
        isOpen={!!selectedStoreMerchantId}
        onClose={() => setSelectedStoreMerchantId(null)}
        onSelectProduct={prod => {
          setSelectedStoreMerchantId(null);
          setSelectedProduct(prod);
        }}
        onOpenChat={(mId, storeName) => {
          setSelectedStoreMerchantId(null);
          handleOpenChat(mId, 'merchant', storeName);
        }}
      />

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onProceedToCheckout={() => {
          setIsCartOpen(false);
          if (!isAuthenticated) {
            setIsAuthOpen(true);
          } else {
            setIsCheckoutOpen(true);
          }
        }}
      />

      {/* Checkout Modal (COD with Split Orders) */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onOrderSuccess={handleOrderSuccess}
      />

      {/* Phone & OTP Authentication Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Support & WhatsApp Help Modal */}
      <SupportModal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} />

      {/* Legal & App Store Compliance Modal (Privacy, Terms, Account Deletion) */}
      <ComplianceModal
        isOpen={isComplianceOpen}
        onClose={() => setIsComplianceOpen(false)}
        initialTab={complianceInitialTab}
      />

      {/* Verified Review Submission Modal */}
      {reviewModalData && (
        <ReviewModal
          productId={reviewModalData.productId}
          orderId={reviewModalData.orderId}
          isOpen={true}
          onClose={() => setReviewModalData(null)}
        />
      )}

      {/* UGC Review Reporting Modal */}
      <ReportReviewModal
        review={reportModalReview}
        isOpen={!!reportModalReview}
        onClose={() => setReportModalReview(null)}
      />

      {/* Chat Modal (Customer <-> Merchant, Merchant <-> Admin) */}
      <ChatModal
        isOpen={isChatOpen}
        onClose={() => {
          setIsChatOpen(false);
          setChatInitialConversationId(undefined);
          setChatRecipientId(undefined);
          setChatRecipientRole(undefined);
          setChatRecipientName(undefined);
          setChatProductId(undefined);
          setChatOrderId(undefined);
        }}
        initialConversationId={chatInitialConversationId}
        initialRecipientId={chatRecipientId}
        initialRecipientRole={chatRecipientRole}
        initialRecipientName={chatRecipientName}
        initialProductId={chatProductId}
        initialOrderId={chatOrderId}
        onSelectProduct={prod => setSelectedProduct(prod)}
        onOpenStore={mId => setSelectedStoreMerchantId(mId)}
      />

      {/* Notifications Modal */}
      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onOpenChat={convId => {
          setIsNotificationsOpen(false);
          setChatInitialConversationId(convId);
          setIsChatOpen(true);
        }}
        onRefreshUnreadCount={pollUnread}
        onNavigateOrders={() => {
          setIsNotificationsOpen(false);
          setActiveView('orders');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onNavigateCategories={() => {
          setIsNotificationsOpen(false);
          setActiveView('categories');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <MarketProvider>
          <DukkanaAppContent />
        </MarketProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
