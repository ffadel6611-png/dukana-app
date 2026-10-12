import React, { useState } from 'react';
import {
  ShieldCheck,
  Users,
  Store,
  Package,
  FolderTree,
  DollarSign,
  Star,
  Flag,
  Settings,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Plus,
  Trash2,
  Edit,
  Eye,
  Check,
  X,
  TrendingUp,
  ShieldAlert,
  Sparkles,
  Search,
  Image as ImageIcon,
  ArrowUp,
  ArrowDown,
  Upload,
  Filter,
  MessageSquare,
  Bell,
  Send,
  UserCheck,
  RefreshCw,
  Clock,
  Loader2,
  Flame,
  PauseCircle,
  Megaphone,
  Tag,
  Ticket,
  Percent,
} from 'lucide-react';
import { useMarket } from '../context/MarketContext';
import { useAuth } from '../context/AuthContext';
import { ProductApprovalStatus, MerchantStatus, OrderStatus, HomeBanner, ADMIN_PHONE_E164, AdminStory, Product, CommercialPromotion, PlatformCoupon } from '../types';
import { formatIQDTabular } from '../utils/currency';
import { compressImageFile } from '../utils/storage';

interface AdminDashboardProps {
  onOpenChat?: (recipientId: string, recipientRole?: string, recipientName?: string) => void;
  initialTab?: 'overview' | 'promotions' | 'users' | 'merchants' | 'products' | 'categories' | 'orders' | 'reviews' | 'banners' | 'stories' | 'coupons' | 'settings';
  autoOpenStoryModal?: boolean;
}

export interface AdminPromotionItem {
  id: string;
  merchantId: string;
  storeName: string;
  productId: string;
  productName: string;
  productImage?: string;
  durationDays: number;
  dailyRate: number;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  finalTotal: number;
  status: 'pending_approval' | 'active' | 'rejected' | 'stopped' | 'completed';
  notes?: string;
  rejectionReason?: string;
  startDate?: string;
  endDate?: string;
  createdAt: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onOpenChat,
  initialTab,
  autoOpenStoryModal,
}) => {
  const { currentUser, isAdmin } = useAuth();
  const [serverVerified, setServerVerified] = useState<boolean | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    products,
    merchants,
    orders,
    categories,
    reviews,
    reports,
    settings,
    setProductApproval,
    setMerchantStatus,
    promoteProduct,
    unpromoteProduct,
    addCategory,
    updateCategory,
    deleteCategory,
    setReviewStatus,
    resolveReport,
    updateSettings,
    updateOrderStatus,
    toggleProductPromotion,
    banners,
    addBanner,
    updateBanner,
    deleteBanner,
    toggleBannerStatus,
    reorderBanners,
    coupons,
    addCoupon,
    updateCoupon,
    deleteCoupon,
    toggleCouponActive,
  } = useMarket();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'promotions' | 'users' | 'merchants' | 'products' | 'categories' | 'orders' | 'reviews' | 'banners' | 'stories' | 'coupons' | 'settings'
  >(initialTab || 'overview');

  // Platform Coupons State (Admin-Only Controlled)
  const [showAddCouponModal, setShowAddCouponModal] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponDesc, setCouponDesc] = useState('');
  const [couponType, setCouponType] = useState<'percentage' | 'fixed'>('percentage');
  const [couponValue, setCouponValue] = useState('10');
  const [couponMinSubtotal, setCouponMinSubtotal] = useState('10000');
  const [couponMaxCap, setCouponMaxCap] = useState('25000');
  const [couponExpiryDays, setCouponExpiryDays] = useState('30');
  const [couponMaxUses, setCouponMaxUses] = useState('');
  const [couponFormError, setCouponFormError] = useState('');
  const [couponActionNotice, setCouponActionNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleCreateCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponFormError('');
    const val = Number(couponValue);
    const minSub = Number(couponMinSubtotal) || 0;
    const maxCap = couponMaxCap ? Number(couponMaxCap) : undefined;
    const maxUses = couponMaxUses ? Number(couponMaxUses) : undefined;

    if (!couponCode.trim()) {
      setCouponFormError('يرجى إدخال رمز الكوبون.');
      return;
    }
    if (isNaN(val) || val <= 0) {
      setCouponFormError('يرجى تحديد قيمة خصم صحيحة.');
      return;
    }
    if (couponType === 'percentage' && (val <= 0 || val > 90)) {
      setCouponFormError('نسبة الخصم يجب أن تكون بين 1% و 90%.');
      return;
    }

    let expiresAt: string | undefined;
    if (couponExpiryDays && Number(couponExpiryDays) > 0) {
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + Number(couponExpiryDays));
      expiresAt = expDate.toISOString();
    }

    const res = addCoupon({
      code: couponCode.trim().toUpperCase(),
      description: couponDesc.trim() || `خصم ${couponType === 'percentage' ? `${val}%` : `${val.toLocaleString()} د.ع`} معتمد من إدارة دكانة`,
      discountType: couponType,
      discountValue: val,
      minOrderSubtotal: minSub,
      maxDiscountCap: maxCap,
      isActive: true,
      expiresAt,
      maxUsageLimit: maxUses,
    });

    if (res.success) {
      setCouponActionNotice({ text: res.message, type: 'success' });
      setShowAddCouponModal(false);
      setCouponCode('');
      setCouponDesc('');
      setCouponValue('10');
      setCouponMinSubtotal('10000');
      setCouponMaxCap('25000');
      setTimeout(() => setCouponActionNotice(null), 3000);
    } else {
      setCouponFormError(res.message);
    }
  };

  // Commercial Promotion Requests State (Admin Approval Workflow)
  const [adminPromotions, setAdminPromotions] = useState<AdminPromotionItem[]>([]);
  const [isLoadingPromotions, setIsLoadingPromotions] = useState(false);
  const [promotionsFilter, setPromotionsFilter] = useState<'all' | 'pending' | 'active' | 'rejected' | 'stopped'>('all');
  const [rejectingPromo, setRejectingPromo] = useState<AdminPromotionItem | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [promoNotice, setPromoNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [processingPromoId, setProcessingPromoId] = useState<string | null>(null);

  // Stories Management State (Admin only)
  const [adminStories, setAdminStories] = useState<AdminStory[]>([]);
  const [isLoadingStories, setIsLoadingStories] = useState(false);
  const [showAddStoryModal, setShowAddStoryModal] = useState(false);
  const [storyTitle, setStoryTitle] = useState('');
  const [storyImageUrl, setStoryImageUrl] = useState('');
  const [storyLinkedProductId, setStoryLinkedProductId] = useState('');
  const [storyProductSearchQuery, setStoryProductSearchQuery] = useState('');
  const [storyCtaText, setStoryCtaText] = useState('تسوّق الآن');
  const [storyDurationDays, setStoryDurationDays] = useState(14);
  const [storyFormError, setStoryFormError] = useState('');
  const [storySuccessMsg, setStorySuccessMsg] = useState('');
  const [isSubmittingStory, setIsSubmittingStory] = useState(false);
  const [confirmDeleteStoryId, setConfirmDeleteStoryId] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
    if (autoOpenStoryModal) {
      setShowAddStoryModal(true);
    }
  }, [initialTab, autoOpenStoryModal]);

  // Registered Users (Customers & Merchants) state for Admin only
  const [registeredUsers, setRegisteredUsers] = useState<Array<{
    id: string;
    displayName: string;
    phone: string;
    role: string;
    governorate?: string;
    createdAt?: string;
    status?: string;
    merchantStoreId?: string;
    merchantStatus?: MerchantStatus;
  }>>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [usersSearchQuery, setUsersSearchQuery] = useState('');
  const [usersRoleFilter, setUsersRoleFilter] = useState<'all' | 'customer' | 'merchant' | 'admin'>('all');
  const [updatingMerchantUserId, setUpdatingMerchantUserId] = useState<string | null>(null);
  const [merchantActionToast, setMerchantActionToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Broadcast Notification modal & form state for Admin
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastTarget, setBroadcastTarget] = useState<'all' | 'customers' | 'merchants'>('all');
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);
  const [broadcastSuccessMsg, setBroadcastSuccessMsg] = useState('');
  const [broadcastErrorMsg, setBroadcastErrorMsg] = useState('');

  // Search states for Merchants and Orders
  const [merchantSearchQuery, setMerchantSearchQuery] = useState('');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | OrderStatus>('all');

  // Home Banners state
  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<HomeBanner | null>(null);
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerSubtitle, setBannerSubtitle] = useState('');
  const [bannerImageUrl, setBannerImageUrl] = useState('');
  const [bannerBadge, setBannerBadge] = useState('');
  const [bannerCategorySlug, setBannerCategorySlug] = useState('all');
  const [bannerIsActive, setBannerIsActive] = useState(true);
  const [bannerFormError, setBannerFormError] = useState('');
  const [bannerSuccessMsg, setBannerSuccessMsg] = useState('');

  // Category addition state
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  // Settings update state
  const [supportWhatsApp, setSupportWhatsApp] = useState(settings?.supportWhatsApp || '');
  const [commissionRate, setCommissionRate] = useState(settings?.defaultCommissionRate?.toString() || '5');
  const [promotionPrice, setPromotionPrice] = useState(settings?.promotionPrice?.toString() || '15000');
  const [settingsSuccessMsg, setSettingsSuccessMsg] = useState('');

  // Server-Side Verification: Verify with backend API that caller is strictly the authorized master admin
  React.useEffect(() => {
    let isMounted = true;
    async function verifyWithBackend() {
      try {
        const token = localStorage.getItem('dukkana_session_token_v3') || '';
        const res = await fetch('/api/admin/verify-access', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            token,
          }),
        });
        const data = await res.json();
        if (isMounted) {
          if (res.ok && data.authorized === true) {
            setServerVerified(true);
          } else {
            setServerVerified(false);
            setServerError(data.error || 'رفض الوصول من جهة الخادم: غير مصرح بالدخول إلى لوحة المدير.');
          }
        }
      } catch {
        // Fallback: If network offline, verify against strict canonical phone rule
        if (isMounted) {
          if (currentUser?.phone === ADMIN_PHONE_E164 && isAdmin) {
            setServerVerified(true);
          } else {
            setServerVerified(false);
            setServerError('رفض أمني: رقم الهاتف غير مصرح له كمدير.');
          }
        }
      }
    }
    verifyWithBackend();
    return () => {
      isMounted = false;
    };
  }, [currentUser?.phone, isAdmin]);

  // Keep settings state in sync if settings update
  React.useEffect(() => {
    if (settings) {
      setSupportWhatsApp(settings.supportWhatsApp || '');
      setCommissionRate(settings.defaultCommissionRate?.toString() || '5');
      setPromotionPrice(settings.promotionPrice?.toString() || '15000');
    }
  }, [settings]);

  // Fetch registered users (Customers & Merchants) from server
  const fetchRegisteredUsers = React.useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const token = localStorage.getItem('dukkana_session_token_v3') || '';
      const res = await fetch(`/api/admin/users?phone=${encodeURIComponent(currentUser?.phone || '')}&token=${encodeURIComponent(token)}`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.users)) {
        setRegisteredUsers(data.users);
      } else {
        // Fallback: populate from localStorage if available
        const localSaved = localStorage.getItem('dukkana_users_db_v3');
        if (localSaved) {
          const parsed = JSON.parse(localSaved);
          if (Array.isArray(parsed)) {
            setRegisteredUsers(parsed);
          }
        }
      }
    } catch {
      const localSaved = localStorage.getItem('dukkana_users_db_v3');
      if (localSaved) {
        try {
          const parsed = JSON.parse(localSaved);
          if (Array.isArray(parsed)) {
            setRegisteredUsers(parsed);
          }
        } catch {
          // ignore
        }
      }
    } finally {
      setIsLoadingUsers(false);
    }
  }, [currentUser?.phone]);

  React.useEffect(() => {
    if (activeTab === 'users' && serverVerified) {
      fetchRegisteredUsers();
    }
  }, [activeTab, serverVerified, fetchRegisteredUsers]);

  // Toggle Merchant Approval Status from the Admin Dashboard Registered Users Table
  const handleToggleMerchantStatus = React.useCallback(async (
    targetUser: { id: string; phone: string; merchantStoreId?: string; merchantStatus?: MerchantStatus; role: string },
    newStatus: MerchantStatus
  ) => {
    setUpdatingMerchantUserId(targetUser.id);
    setMerchantActionToast(null);

    // 1. Optimistic UI update in registeredUsers
    setRegisteredUsers(prev =>
      prev.map(u => (u.id === targetUser.id ? { ...u, merchantStatus: newStatus } : u))
    );

    // 2. Also sync with MarketContext merchants if merchant store is found
    const matchingMerchant = merchants.find(
      m => m.userId === targetUser.id || m.phone === targetUser.phone || (targetUser.merchantStoreId && m.id === targetUser.merchantStoreId)
    );
    if (matchingMerchant) {
      setMerchantStatus(matchingMerchant.id, newStatus);
    }

    // 3. Persist to server backend API
    try {
      const token = localStorage.getItem('dukkana_session_token_v3') || '';
      const adminPhone = currentUser?.phone || ADMIN_PHONE_E164;
      const merchantIdStr = String(matchingMerchant?.id || targetUser.merchantStoreId || '').trim();
      const userIdStr = String(targetUser.id || '').trim();
      const merchantPhoneStr = String(targetUser.phone || '').trim();

      // Clean headers to avoid any Browser DOMException ("The string did not match the expected pattern")
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token && typeof token === 'string' && /^[\x20-\x7E]+$/.test(token)) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/admin/toggle-merchant-status', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          adminPhone: adminPhone,
          token: token,
          userId: userIdStr,
          phone: merchantPhoneStr,
          merchantPhone: merchantPhoneStr,
          targetPhone: merchantPhoneStr,
          merchantId: merchantIdStr,
          status: newStatus,
        }),
      });

      let data: any = null;
      try {
        const text = await res.text();
        data = JSON.parse(text);
      } catch {
        data = { success: res.ok };
      }

      if (!res.ok || (data && data.success === false)) {
        throw new Error((data && (data.error || data.message)) || 'فشل تحديث حالة التاجر');
      }

      setMerchantActionToast({
        message: newStatus === 'approved' 
          ? `تم اعتماد التاجر (${targetUser.phone}) بنجاح ✅`
          : `تم إلغاء اعتماد التاجر (${targetUser.phone}) ❌`,
        type: 'success',
      });
      setTimeout(() => setMerchantActionToast(null), 4000);
    } catch (err: any) {
      console.error('Error toggling merchant status:', err);
      // Revert optimistic update
      const prevStatus = matchingMerchant?.status || targetUser.merchantStatus || 'pending';
      setRegisteredUsers(prev =>
        prev.map(u => (u.id === targetUser.id ? { ...u, merchantStatus: prevStatus } : u))
      );
      if (matchingMerchant) {
        setMerchantStatus(matchingMerchant.id, prevStatus);
      }
      setMerchantActionToast({
        message: err.message || 'حدث خطأ أثناء حفظ حالة التاجر في قاعدة البيانات',
        type: 'error',
      });
      setTimeout(() => setMerchantActionToast(null), 5000);
    } finally {
      setUpdatingMerchantUserId(null);
    }
  }, [merchants, setMerchantStatus, currentUser?.phone]);

  // Stats calculation
  const totalDeliveredOrders = orders.filter(o => o.status === 'delivered');
  const totalPlatformCommissions = totalDeliveredOrders.reduce((sum, o) => sum + o.commissionAmount, 0);
  const totalGrossVolume = totalDeliveredOrders.reduce((sum, o) => sum + o.finalTotal, 0);
  const pendingProductsCount = products.filter(p => p.approvalStatus === 'pending').length;
  const pendingMerchantsCount = merchants.filter(m => m.status === 'pending').length;
  const pendingReportsCount = reports.filter(r => r.status === 'pending').length;

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      supportWhatsApp: supportWhatsApp.trim(),
      defaultCommissionRate: Number(commissionRate) || 5,
      promotionPrice: Math.max(0, Number(promotionPrice) || 0),
    });
    setSettingsSuccessMsg('تم حفظ وتحديث إعدادات المنصة وقيمة الترويج بنجاح.');
    setTimeout(() => setSettingsSuccessMsg(''), 3000);
  };

  const handleAddCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    addCategory(newCatName.trim(), newCatDesc.trim() || undefined);
    setNewCatName('');
    setNewCatDesc('');
  };

  // Filtered Merchants by search query (Name, Phone, ID)
  const filteredMerchants = merchants.filter(m => {
    if (!merchantSearchQuery.trim()) return true;
    const q = merchantSearchQuery.trim().toLowerCase();
    return (
      m.storeName.toLowerCase().includes(q) ||
      m.phone.toLowerCase().includes(q) ||
      m.id.toLowerCase().includes(q) ||
      (m.userId && m.userId.toLowerCase().includes(q)) ||
      m.governorate.toLowerCase().includes(q)
    );
  });

  // Filtered Orders by search query & status (Order ID, Customer Name, Phone, Store Name)
  const filteredOrders = orders.filter(o => {
    const matchStatus = orderStatusFilter === 'all' || o.status === orderStatusFilter;
    if (!matchStatus) return false;
    if (!orderSearchQuery.trim()) return true;
    const q = orderSearchQuery.trim().toLowerCase();
    return (
      o.id.toLowerCase().includes(q) ||
      o.recipientName.toLowerCase().includes(q) ||
      o.recipientPhone.toLowerCase().includes(q) ||
      o.storeName.toLowerCase().includes(q) ||
      o.governorate.toLowerCase().includes(q)
    );
  });

  // Filtered Users by search query (Name, Phone, Role, Governorate)
  const filteredUsers = registeredUsers.filter(u => {
    const isMerchant = u.role === 'merchant' || Boolean(u.merchantStoreId) || merchants.some(m => m.userId === u.id || m.phone === u.phone);
    if (usersRoleFilter === 'customer' && isMerchant) return false;
    if (usersRoleFilter === 'merchant' && !isMerchant) return false;
    if (usersRoleFilter === 'admin' && u.role !== 'admin' && u.phone !== ADMIN_PHONE_E164) return false;
    if (!usersSearchQuery.trim()) return true;
    const q = usersSearchQuery.trim().toLowerCase();
    return (
      (u.displayName && u.displayName.toLowerCase().includes(q)) ||
      (u.phone && u.phone.toLowerCase().includes(q)) ||
      (u.id && u.id.toLowerCase().includes(q)) ||
      (u.governorate && u.governorate.toLowerCase().includes(q))
    );
  });

  // Handle Send Broadcast Notification
  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      setBroadcastErrorMsg('يرجى كتابة عنوان الإشعار ونص الرسالة بالكامل.');
      return;
    }

    setIsSendingBroadcast(true);
    setBroadcastErrorMsg('');
    setBroadcastSuccessMsg('');

    try {
      const token = localStorage.getItem('dukkana_session_token_v3') || '';
      const res = await fetch('/api/admin/broadcast-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          phone: currentUser?.phone,
          token,
          title: broadcastTitle.trim(),
          message: broadcastMessage.trim(),
          targetAudience: broadcastTarget,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setBroadcastSuccessMsg(data.message || 'تم إرسال الإشعار العام لجميع المشتركين بنجاح!');
        setTimeout(() => {
          setBroadcastTitle('');
          setBroadcastMessage('');
          setBroadcastSuccessMsg('');
          setIsBroadcastModalOpen(false);
        }, 2200);
      } else {
        setBroadcastErrorMsg(data.error || 'تعذر إرسال الإشعار، يرجى المحاولة لاحقاً.');
      }
    } catch (err: any) {
      setBroadcastErrorMsg('حدث خطأ في الاتصال بالخادم أثناء إرسال الإشعار.');
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  // Banner modal handlers
  const openAddBannerModal = () => {
    setEditingBanner(null);
    setBannerTitle('');
    setBannerSubtitle('');
    setBannerImageUrl('/src/assets/images/hero_dukkana_market_1791352449347.jpg');
    setBannerBadge('');
    setBannerCategorySlug('all');
    setBannerIsActive(true);
    setBannerFormError('');
    setIsBannerModalOpen(true);
  };

  const openEditBannerModal = (b: HomeBanner) => {
    setEditingBanner(b);
    setBannerTitle(b.title);
    setBannerSubtitle(b.subtitle || '');
    setBannerImageUrl(b.imageUrl);
    setBannerBadge(b.badgeText || '');
    setBannerCategorySlug(b.linkCategorySlug || 'all');
    setBannerIsActive(b.isActive);
    setBannerFormError('');
    setIsBannerModalOpen(true);
  };

  const handleBannerImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setBannerFormError('يرجى اختيار ملف صورة صالح (JPEG, PNG, WEBP).');
      return;
    }
    compressImageFile(file, 960, 0.75)
      .then(compressed => {
        setBannerImageUrl(compressed);
      })
      .catch(() => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            setBannerImageUrl(reader.result);
          }
        };
        reader.readAsDataURL(file);
      });
  };

  const handleSaveBanner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerTitle.trim()) {
      setBannerFormError('يرجى إدخال عنوان الإعلان أو الصورة.');
      return;
    }
    if (!bannerImageUrl.trim()) {
      setBannerFormError('يرجى تحديد أو رفع صورة للإعلان.');
      return;
    }
    if (editingBanner) {
      updateBanner(editingBanner.id, {
        title: bannerTitle.trim(),
        subtitle: bannerSubtitle.trim() || undefined,
        imageUrl: bannerImageUrl.trim(),
        badgeText: bannerBadge.trim() || undefined,
        linkCategorySlug: bannerCategorySlug || 'all',
        isActive: bannerIsActive,
      });
      setBannerSuccessMsg('تم تحديث بيانات صورة الصفحة الرئيسية بنجاح.');
    } else {
      addBanner({
        title: bannerTitle.trim(),
        subtitle: bannerSubtitle.trim() || undefined,
        imageUrl: bannerImageUrl.trim(),
        badgeText: bannerBadge.trim() || undefined,
        linkCategorySlug: bannerCategorySlug || 'all',
        isActive: bannerIsActive,
        displayOrder: banners.length + 1,
      });
      setBannerSuccessMsg('تمت إضافة صورة جديدة للواجهة الرئيسية بنجاح.');
    }
    setTimeout(() => setBannerSuccessMsg(''), 3000);
    setIsBannerModalOpen(false);
  };

  // -------------------------------------------------------------
  // Admin Stories Management Handlers (Enforcing 5 Stories Limit)
  // -------------------------------------------------------------
  const fetchAdminStories = React.useCallback(async () => {
    setIsLoadingStories(true);
    try {
      const res = await fetch('/api/admin/stories');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.stories)) {
          setAdminStories(data.stories);
        } else {
          setAdminStories([]);
        }
      } else {
        setAdminStories([]);
      }
    } catch (err) {
      console.warn('Failed to load admin stories:', err);
      setAdminStories([]);
    } finally {
      setIsLoadingStories(false);
    }
  }, []);

  React.useEffect(() => {
    if (isAdmin) {
      fetchAdminStories();
    }
  }, [isAdmin, fetchAdminStories]);

  const openAddStoryModal = () => {
    setStoryTitle('');
    setStoryImageUrl('/src/assets/images/hero_dukkana_market_1791352449347.jpg');
    setStoryLinkedProductId('');
    setStoryProductSearchQuery('');
    setStoryCtaText('تسوّق الآن');
    setStoryDurationDays(14);
    setStoryFormError('');
    setShowAddStoryModal(true);
  };

  const handleStoryImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setStoryFormError('يرجى اختيار ملف صورة صالح (JPEG, PNG, WEBP).');
      return;
    }
    compressImageFile(file, 800, 0.75)
      .then(compressed => {
        setStoryImageUrl(compressed);
        setStoryFormError('');
      })
      .catch(() => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            setStoryImageUrl(reader.result);
          }
        };
        reader.readAsDataURL(file);
      });
  };

  const handleSaveStory = async (e: React.FormEvent) => {
    e.preventDefault();
    setStoryFormError('');

    if (!storyTitle.trim()) {
      setStoryFormError('يرجى إدخال عنوان الستوري.');
      return;
    }
    if (!storyImageUrl.trim()) {
      setStoryFormError('يرجى تحديد أو رفع صورة الستوري.');
      return;
    }

    setIsSubmittingStory(true);
    try {
      const token = localStorage.getItem('dukkana_session_token_v3') || '';
      const duration = Number(storyDurationDays) || 7;
      const expiresAt = new Date(Date.now() + duration * 86400000).toISOString();
      const ctaLink = storyLinkedProductId ? `product:${storyLinkedProductId}` : '';

      const res = await fetch('/api/admin/stories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: storyTitle.trim(),
          imageUrl: storyImageUrl.trim(),
          mediaUrl: storyImageUrl.trim(),
          productId: storyLinkedProductId || undefined,
          durationDays: duration,
          expiresAt,
          endDate: expiresAt,
          ctaText: storyCtaText.trim() || 'تسوّق الآن',
          ctaLink,
          phone: currentUser?.phone || ADMIN_PHONE_E164,
          token,
        }),
      });

      const data = await res.json();
      if (!res.ok || (data && data.success === false)) {
        throw new Error((data && (data.error || data.message)) || 'فشل حفظ الستوري');
      }

      // If a product was linked, also ensure isPromoted = true
      if (storyLinkedProductId) {
        const p = products.find(prod => prod.id === storyLinkedProductId);
        if (p && !p.isPromoted) {
          toggleProductPromotion(storyLinkedProductId);
        }
      }

      setStorySuccessMsg('تمت إضافة ونشر الستوري الإعلاني بنجاح في واجهة الزبائن!');
      setTimeout(() => setStorySuccessMsg(''), 4000);
      setShowAddStoryModal(false);
      setStoryTitle('');
      setStoryImageUrl('');
      setStoryLinkedProductId('');
      setStoryProductSearchQuery('');
      setStoryDurationDays(14);
      setStoryCtaText('تسوّق الآن');
      fetchAdminStories();

      // Notify StoriesBar in real-time
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('stories_updated'));
      }
    } catch (err: any) {
      setStoryFormError(err.message || 'حدث خطأ أثناء حفظ الستوري.');
    } finally {
      setIsSubmittingStory(false);
    }
  };

  const handleToggleStoryActive = async (storyId: string) => {
    try {
      const token = localStorage.getItem('dukkana_session_token_v3') || '';
      await fetch(`/api/admin/stories/${storyId}/toggle`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });
      setAdminStories(prev =>
        prev.map(s => (s.id === storyId ? { ...s, isActive: !s.isActive } : s))
      );
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('stories_updated'));
      }
    } catch (err) {
      console.warn('Failed to toggle story:', err);
    }
  };

  const handleDeleteStory = async (storyId: string) => {
    // Delete immediately from UI state
    setAdminStories(prev => prev.filter(s => s.id !== storyId));
    setConfirmDeleteStoryId(null);

    // Notify StoriesBar in real-time without reloading the page
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('stories_updated', { detail: { deletedStoryId: storyId } }));
    }

    try {
      const token = localStorage.getItem('dukkana_session_token_v3') || '';
      const res = await fetch(`/api/admin/stories/${storyId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          phone: currentUser?.phone || ADMIN_PHONE_E164,
          token,
        }),
      });
      if (res.ok) {
        setStorySuccessMsg('تم حذف الستوري بنجاح نهائياً من الواجهة وسيرفر التخزين.');
      } else {
        fetchAdminStories();
      }
      setTimeout(() => setStorySuccessMsg(''), 3500);
    } catch (err) {
      console.warn('Failed to delete story:', err);
      fetchAdminStories();
    }
  };

  const pendingPromotionsCount = adminPromotions.filter(
    p => p.status === 'pending_approval' || (p.status as any) === 'pending'
  ).length;

  const fetchAdminPromotions = React.useCallback(async () => {
    setIsLoadingPromotions(true);
    try {
      const res = await fetch('/api/admin/promotions');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.promotions)) {
          setAdminPromotions(data.promotions);
        }
      }
    } catch (err) {
      console.warn('Error fetching admin promotions:', err);
    } finally {
      setIsLoadingPromotions(false);
    }
  }, []);

  React.useEffect(() => {
    if (isAdmin) {
      fetchAdminPromotions();
    }
  }, [isAdmin, fetchAdminPromotions]);

  React.useEffect(() => {
    if (activeTab === 'promotions' && isAdmin) {
      fetchAdminPromotions();
    }
  }, [activeTab, isAdmin, fetchAdminPromotions]);

  const handleApprovePromotion = async (promo: AdminPromotionItem) => {
    setProcessingPromoId(promo.id);
    setPromoNotice(null);
    try {
      const res = await fetch(`/api/admin/promotions/${promo.id}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل قبول وتفعيل الحملة');
      }

      setAdminPromotions(prev =>
        prev.map(p =>
          p.id === promo.id
            ? {
                ...p,
                status: 'active',
                startDate: new Date().toISOString(),
                endDate: new Date(Date.now() + (p.durationDays || 7) * 86400000).toISOString(),
              }
            : p
        )
      );

      if (promo.productId) {
        promoteProduct(promo.productId);
      }

      setPromoNotice({
        text: `تم قبول وتفعيل الحملة الترويجية للمنتج "${promo.productName}" بنجاح! أصبح المنتج مروجاً رسمياً في صدارة المتجر وبدأ احتساب الأيام (${promo.durationDays} أيام) 🚀`,
        type: 'success',
      });
    } catch (err: any) {
      setPromoNotice({
        text: err.message || 'حدث خطأ أثناء قبول وتفعيل طلب الترويج.',
        type: 'error',
      });
    } finally {
      setProcessingPromoId(null);
    }
  };

  const handleConfirmRejectPromotion = async () => {
    if (!rejectingPromo) return;
    const reason = rejectionReasonInput.trim();
    if (!reason) {
      alert('يرجى كتابة سبب رفض طلب الترويج لإشعار التاجر به.');
      return;
    }

    setProcessingPromoId(rejectingPromo.id);
    setPromoNotice(null);
    try {
      const res = await fetch(`/api/admin/promotions/${rejectingPromo.id}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectionReason: reason }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل رفض طلب الترويج');
      }

      setAdminPromotions(prev =>
        prev.map(p =>
          p.id === rejectingPromo.id
            ? { ...p, status: 'rejected', rejectionReason: reason }
            : p
        )
      );

      if (rejectingPromo.productId) {
        unpromoteProduct(rejectingPromo.productId);
      }

      setPromoNotice({
        text: `تم رفض طلب الترويج للمنتج "${rejectingPromo.productName}" وإشعار التاجر بسبب الرفض بنجاح.`,
        type: 'success',
      });
      setRejectingPromo(null);
      setRejectionReasonInput('');
    } catch (err: any) {
      setPromoNotice({
        text: err.message || 'حدث خطأ أثناء رفض طلب الترويج.',
        type: 'error',
      });
    } finally {
      setProcessingPromoId(null);
    }
  };

  const handleAdminStopPromotion = async (promo: AdminPromotionItem) => {
    if (!window.confirm(`هل أنت متأكد من إيقاف ترويج "${promo.productName}" فورياً وإلغاء ظهوره في صدارة المتجر؟`)) {
      return;
    }
    setProcessingPromoId(promo.id);
    setPromoNotice(null);
    try {
      const res = await fetch(`/api/promotions/commercial/${promo.id}/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: promo.productId }),
      });
      const data = await res.json().catch(() => ({}));

      setAdminPromotions(prev =>
        prev.map(p =>
          p.id === promo.id ? { ...p, status: 'stopped' } : p
        )
      );

      if (promo.productId) {
        unpromoteProduct(promo.productId);
      }

      setPromoNotice({
        text: data.message || `تم إيقاف ترويج المنتج "${promo.productName}" بنجاح وإلغاء تمييزه من صدارة المتجر.`,
        type: 'success',
      });
    } catch (err: any) {
      setPromoNotice({
        text: 'حدث خطأ أثناء إيقاف الترويج.',
        type: 'error',
      });
    } finally {
      setProcessingPromoId(null);
    }
  };

  // Internal Security Guard: Only the canonical admin phone 07862214922 may view this dashboard
  if (!isAdmin || currentUser?.phone !== ADMIN_PHONE_E164 || serverVerified === false) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-zinc-900">غير مصرح بالدخول إلى لوحة المدير</h2>
        <p className="text-xs text-zinc-600 leading-relaxed">
          {serverError ||
            'لوحة الإدارة محمية برمجياً ومن جهة الخادم ومخصصة حصرياً للمدير الرئيسي المعتمد لمنصة دكانة بعد تسجيل الدخول والتحقق برمز OTP.'}
        </p>
      </div>
    );
  }

  // Loading state while verifying with backend
  if (serverVerified === null) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center space-y-3">
        <div className="w-10 h-10 mx-auto rounded-full border-3 border-purple-700 border-t-transparent animate-spin"></div>
        <p className="text-xs text-zinc-500 font-bold">جاري التحقق الأمني من صلاحيات الإدارة مع الخادم...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Admin Header */}
      <div className="bg-purple-950 text-white rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl shadow-purple-950/20">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-bold text-purple-300">لوحة الإدارة والرقابة الرسمية (Admin)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black">إدارة منصة وسوق دكانة</h1>
          <p className="text-xs text-purple-200 mt-1 max-w-xl">
            التحكم الشامل بالتجار، المنتجات، العمولات، الأقسام، مراجعة التقييمات والبلاغات، وإعدادات المتجر.
          </p>
        </div>

        {/* Header Action Buttons & Badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={() => {
              setBroadcastTitle('');
              setBroadcastMessage('');
              setBroadcastErrorMsg('');
              setBroadcastSuccessMsg('');
              setIsBroadcastModalOpen(true);
            }}
            className="bg-amber-400 hover:bg-amber-300 text-purple-950 px-4 py-2 rounded-2xl font-black flex items-center gap-2 shadow-md cursor-pointer transition transform active:scale-95"
            title="إرسال إشعار عام فوري لجميع المشتركين في المنصة"
          >
            <Bell className="w-4 h-4 text-purple-950" />
            <span>إرسال إشعار عام للجميع</span>
          </button>

          {pendingPromotionsCount > 0 && (
            <button
              onClick={() => setActiveTab('promotions')}
              className="bg-amber-400 hover:bg-amber-300 text-purple-950 border border-amber-300 px-3.5 py-2 rounded-2xl font-black flex items-center gap-1.5 shadow-md cursor-pointer transition transform active:scale-95"
              title="عرض طلبات الترويج والإعلانات المعلقة"
            >
              <Sparkles className="w-4 h-4 text-purple-950 fill-purple-900" />
              <span>{pendingPromotionsCount} طلبات ترويج وإعلانات بانتظار الموافقة 🚀</span>
            </button>
          )}

          {pendingProductsCount > 0 && (
            <div className="bg-amber-500/20 text-amber-200 border border-amber-500/30 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>{pendingProductsCount} منتجات بانتظار الموافقة</span>
            </div>
          )}
          {pendingReportsCount > 0 && (
            <div className="bg-rose-500/20 text-rose-200 border border-rose-500/30 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5">
              <Flag className="w-4 h-4 text-rose-400" />
              <span>{pendingReportsCount} بلاغات تقييم قيد الفحص</span>
            </div>
          )}
        </div>
      </div>

      {/* Admin Tab Navigation */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar p-1.5 bg-zinc-200/70 rounded-2xl text-xs font-bold">
        {[
          { id: 'overview', label: 'نظرة عامة وإحصائيات', icon: <TrendingUp className="w-4 h-4" /> },
          { id: 'promotions', label: `طلبات الترويج والإعلانات (${pendingPromotionsCount > 0 ? `${pendingPromotionsCount} جديد` : adminPromotions.length})`, icon: <Flame className="w-4 h-4 text-rose-600" /> },
          { id: 'users', label: `المستخدمين المسجلين (${registeredUsers.length > 0 ? registeredUsers.length : '...'})`, icon: <Users className="w-4 h-4" /> },
          { id: 'merchants', label: `التجار والمتاجر (${merchants.length})`, icon: <Store className="w-4 h-4" /> },
          { id: 'products', label: `المنتجات والموافقات (${products.length})`, icon: <Package className="w-4 h-4" /> },
          { id: 'orders', label: `الطلبات والعمولات (${orders.length})`, icon: <DollarSign className="w-4 h-4" /> },
          { id: 'banners', label: `صور الصفحة الرئيسية (${banners.length})`, icon: <ImageIcon className="w-4 h-4" /> },
          { id: 'stories', label: `ستوريات دكانة (${adminStories.length}/5)`, icon: <Sparkles className="w-4 h-4 text-purple-700" /> },
          { id: 'categories', label: `الأقسام (${categories.length})`, icon: <FolderTree className="w-4 h-4" /> },
          { id: 'reviews', label: `التقييمات والبلاغات (${reports.length})`, icon: <Star className="w-4 h-4" /> },
          { id: 'coupons', label: `كوبونات الخصم والمنصة (${coupons.length})`, icon: <Tag className="w-4 h-4 text-purple-700" /> },
          { id: 'settings', label: 'إعدادات المنصة وواتساب', icon: <Settings className="w-4 h-4" /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl whitespace-nowrap transition cursor-pointer ${
              activeTab === tab.id
                ? 'bg-white text-purple-950 shadow-sm font-black'
                : 'text-zinc-600 hover:text-zinc-950'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-zinc-200">
              <span className="text-xs text-zinc-500 font-bold block mb-1">إجمالي عمولات دكانة</span>
              <div className="text-2xl font-black text-purple-950 tabular-nums">
                {formatIQDTabular(totalPlatformCommissions)}
              </div>
              <span className="text-[11px] text-zinc-400 mt-1 block">
                محتسبة فقط على الطلبات المسلمة
              </span>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-zinc-200">
              <span className="text-xs text-zinc-500 font-bold block mb-1">حجم التداول المالي (GMV)</span>
              <div className="text-2xl font-black text-zinc-900 tabular-nums">
                {formatIQDTabular(totalGrossVolume)}
              </div>
              <span className="text-[11px] text-zinc-400 mt-1 block">
                مبيعات نقدية عند الاستلام
              </span>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-zinc-200">
              <span className="text-xs text-zinc-500 font-bold block mb-1">المتاجر المسجلة</span>
              <div className="text-2xl font-black text-zinc-900 tabular-nums">
                {merchants.length}
              </div>
              <span className="text-[11px] text-emerald-600 font-bold mt-1 block">
                {merchants.filter(m => m.status === 'approved').length} متاجر معتمدة
              </span>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-zinc-200">
              <span className="text-xs text-zinc-500 font-bold block mb-1">إجمالي المنتجات</span>
              <div className="text-2xl font-black text-zinc-900 tabular-nums">
                {products.filter(p => p.approvalStatus === 'approved').length}
              </div>
              <span className="text-[11px] text-zinc-400 mt-1 block">
                معروضة للزبائن في السوق
              </span>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-zinc-200">
              <span className="text-xs text-zinc-500 font-bold block mb-1">المنتجات المروجة</span>
              <div className="text-2xl font-black text-amber-600 tabular-nums flex items-center gap-1.5">
                <Sparkles className="w-5 h-5 text-amber-500 fill-amber-400" />
                <span>{products.filter(p => p.isPromoted).length}</span>
              </div>
              <span className="text-[11px] text-zinc-400 mt-1 block">
                قيمة الترويج: {formatIQDTabular(settings.promotionPrice || 15000)}
              </span>
            </div>
          </div>

          {/* Quick Actions Bar inside Overview for Admin */}
          <div className="bg-gradient-to-r from-purple-900 via-purple-950 to-indigo-950 p-5 rounded-3xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
            <div className="space-y-1">
              <h3 className="font-black text-sm flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-400" />
                <span>إرسال إشعار عام للمشتركين</span>
              </h3>
              <p className="text-xs text-purple-200">
                بث إشعار فوري لجميع الزبائن والتجار في منصة دكانة يصل لمركز إشعاراتهم مباشرة.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setActiveTab('users')}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Users className="w-3.5 h-3.5" />
                <span>عرض المستخدمين ({registeredUsers.length})</span>
              </button>
              <button
                onClick={() => {
                  setBroadcastTitle('');
                  setBroadcastMessage('');
                  setBroadcastErrorMsg('');
                  setBroadcastSuccessMsg('');
                  setIsBroadcastModalOpen(true);
                }}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-purple-950 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>إرسال إشعار الآن</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Commercial Promotions & Ads Requests (Admin Approval Workflow) */}
      {activeTab === 'promotions' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Header & Controls */}
          <div className="bg-white rounded-3xl border border-zinc-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Flame className="w-6 h-6 text-rose-600" />
                <h2 className="font-black text-lg text-zinc-900">طلبات الترويج والإعلانات التجارية</h2>
                {pendingPromotionsCount > 0 && (
                  <span className="text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-full">
                    {pendingPromotionsCount} طلب جديد بانتظار الاعتماد
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 max-w-2xl leading-relaxed">
                مراجعة واعتماد طلبات الترويج المدفوعة من التجار والموردين للظهور في صدارة المتجر وقسم العروض المميزة مع احتساب الأيام التلقائي.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchAdminPromotions}
                disabled={isLoadingPromotions}
                className="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPromotions ? 'animate-spin' : ''}`} />
                <span>تحديث الطلبات</span>
              </button>
            </div>
          </div>

          {/* Toast Notice */}
          {promoNotice && (
            <div
              className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-2xs animate-in fade-in ${
                promoNotice.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : 'bg-rose-50 text-rose-900 border-rose-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {promoNotice.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{promoNotice.text}</span>
              </div>
              <button
                onClick={() => setPromoNotice(null)}
                className="text-zinc-400 hover:text-zinc-700 font-bold px-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar p-1.5 bg-zinc-100 rounded-2xl text-xs font-bold">
            {[
              { id: 'all', label: `الكل (${adminPromotions.length})` },
              { id: 'pending', label: `بانتظار الموافقة (${pendingPromotionsCount})`, highlight: pendingPromotionsCount > 0 },
              { id: 'active', label: `الحملات النشطة (${adminPromotions.filter(p => p.status === 'active').length})` },
              { id: 'rejected', label: `المرفوضة (${adminPromotions.filter(p => p.status === 'rejected').length})` },
              { id: 'stopped', label: `المتوقفة (${adminPromotions.filter(p => p.status === 'stopped').length})` },
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setPromotionsFilter(f.id as any)}
                className={`px-3.5 py-2 rounded-xl whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                  promotionsFilter === f.id
                    ? 'bg-white text-purple-950 shadow-xs font-black'
                    : f.highlight
                    ? 'bg-amber-100 text-amber-900 font-black'
                    : 'text-zinc-600 hover:text-zinc-950'
                }`}
              >
                <span>{f.label}</span>
              </button>
            ))}
          </div>

          {/* Promotions Table / Cards */}
          {(() => {
            const filteredPromotions = adminPromotions.filter(p => {
              if (promotionsFilter === 'pending') return p.status === 'pending_approval' || (p.status as any) === 'pending';
              if (promotionsFilter === 'active') return p.status === 'active';
              if (promotionsFilter === 'rejected') return p.status === 'rejected';
              if (promotionsFilter === 'stopped') return p.status === 'stopped';
              return true;
            });

            if (isLoadingPromotions && adminPromotions.length === 0) {
              return (
                <div className="bg-white rounded-3xl border border-zinc-200 p-12 text-center text-zinc-400 space-y-3">
                  <Loader2 className="w-8 h-8 mx-auto animate-spin text-purple-600" />
                  <p className="text-xs font-bold">جاري تحميل طلبات الترويج من السيرفر...</p>
                </div>
              );
            }

            if (filteredPromotions.length === 0) {
              return (
                <div className="bg-white rounded-3xl border border-zinc-200 p-12 text-center text-zinc-400 space-y-3">
                  <Megaphone className="w-10 h-10 mx-auto text-zinc-300" />
                  <p className="font-bold text-zinc-700 text-sm">لا توجد طلبات ترويج مطابقة لهذا التصنيف</p>
                  <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                    عند قيام أي تاجر أو مورّد بإطلاق حملة ترويجية جديدة، ستظهر فورياً هنا للمراجعة والاعتماد.
                  </p>
                </div>
              );
            }

            return (
              <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold">
                        <th className="p-4">التاجر / المتجر</th>
                        <th className="p-4">المنتج المروّج</th>
                        <th className="p-4 text-center">المدة المطلوبة</th>
                        <th className="p-4 text-center">المبلغ الإجمالي (IQD)</th>
                        <th className="p-4 text-center">حالة الطلب</th>
                        <th className="p-4 text-center">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200/80">
                      {filteredPromotions.map(promo => {
                        const isPending = promo.status === 'pending_approval' || (promo.status as any) === 'pending';
                        const isActive = promo.status === 'active';
                        const isRejected = promo.status === 'rejected';
                        const isStopped = promo.status === 'stopped';
                        const isBusy = processingPromoId === promo.id;

                        const matchedProd = products.find(p => p.id === promo.productId);
                        const imgSrc = promo.productImage || matchedProd?.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200';
                        const prodName = promo.productName || matchedProd?.name || 'منتج مروّج';
                        const storeName = promo.storeName || 'متجر معتمد';

                        return (
                          <tr key={promo.id} className="hover:bg-purple-50/20 transition">
                            {/* Merchant / Store */}
                            <td className="p-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-black text-xs shrink-0">
                                  <Store className="w-4 h-4" />
                                </div>
                                <div>
                                  <span className="font-black text-zinc-900 block">{storeName}</span>
                                  <span className="text-[10px] text-zinc-400 block font-mono">
                                    {promo.createdAt ? new Date(promo.createdAt).toLocaleDateString('ar-IQ') : 'طلب جديد'}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Product */}
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <img
                                  src={imgSrc}
                                  alt={prodName}
                                  className="w-12 h-12 rounded-xl object-cover bg-zinc-100 shrink-0 border border-zinc-200"
                                />
                                <div className="min-w-0 max-w-xs">
                                  <span className="font-bold text-zinc-900 block truncate" title={prodName}>
                                    {prodName}
                                  </span>
                                  {matchedProd && (
                                    <span className="text-[10px] text-zinc-500 block">
                                      السعر: {formatIQDTabular(matchedProd.finalPrice)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Duration */}
                            <td className="p-4 text-center">
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-purple-50 text-purple-900 font-black text-xs border border-purple-200">
                                <Clock className="w-3.5 h-3.5 text-purple-700" />
                                <span>{promo.durationDays || 7} أيام</span>
                              </span>
                            </td>

                            {/* Total Amount IQD */}
                            <td className="p-4 text-center">
                              <div>
                                <span className="font-black text-sm text-purple-950 block tabular-nums">
                                  {formatIQDTabular(promo.finalTotal || 0)}
                                </span>
                                {promo.discountPercent > 0 && (
                                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                    وفر {promo.discountPercent}%
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Status */}
                            <td className="p-4 text-center">
                              {isPending && (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full font-black text-xs bg-amber-50 text-amber-900 border border-amber-300">
                                  <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                                  <span>قيد المراجعة ⏳</span>
                                </span>
                              )}
                              {isActive && (
                                <div className="space-y-1">
                                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full font-black text-xs bg-emerald-50 text-emerald-900 border border-emerald-300">
                                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 fill-emerald-500" />
                                    <span>نشطة ومميزة 🚀</span>
                                  </span>
                                  {promo.endDate && (
                                    <span className="text-[10px] text-zinc-400 block font-mono">
                                      ينتهي: {new Date(promo.endDate).toLocaleDateString('ar-IQ')}
                                    </span>
                                  )}
                                </div>
                              )}
                              {isRejected && (
                                <div className="space-y-1 max-w-xs mx-auto">
                                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full font-black text-xs bg-rose-50 text-rose-900 border border-rose-300">
                                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                    <span>مرفوضة ❌</span>
                                  </span>
                                  {promo.rejectionReason && (
                                    <span className="text-[10px] text-rose-700 block truncate" title={promo.rejectionReason}>
                                      السبب: {promo.rejectionReason}
                                    </span>
                                  )}
                                </div>
                              )}
                              {isStopped && (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full font-black text-xs bg-zinc-100 text-zinc-700 border border-zinc-300">
                                  <PauseCircle className="w-3.5 h-3.5 text-zinc-500" />
                                  <span>متوقفة ⏸️</span>
                                </span>
                              )}
                            </td>

                            {/* Actions Buttons */}
                            <td className="p-4 text-center">
                              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                {isPending && (
                                  <>
                                    <button
                                      type="button"
                                      disabled={isBusy}
                                      onClick={() => handleApprovePromotion(promo)}
                                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition cursor-pointer flex items-center gap-1 shadow-xs disabled:opacity-50"
                                      title="قبول وتفعيل الحملة فوراً ونقل المنتج لصدارة المتجر"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>قبول وتفعيل</span>
                                    </button>

                                    <button
                                      type="button"
                                      disabled={isBusy}
                                      onClick={() => {
                                        setRejectingPromo(promo);
                                        setRejectionReasonInput('');
                                      }}
                                      className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition cursor-pointer flex items-center gap-1 disabled:opacity-50"
                                      title="رفض الطلب مع إبداء السبب"
                                    >
                                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                      <span>رفض الطلب</span>
                                    </button>
                                  </>
                                )}

                                {isActive && (
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => handleAdminStopPromotion(promo)}
                                    className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition cursor-pointer flex items-center gap-1 disabled:opacity-50"
                                    title="إيقاف الترويج فوراً وإلغاء تمييز المنتج"
                                  >
                                    <PauseCircle className="w-3.5 h-3.5 text-rose-600" />
                                    <span>إيقاف الترويج</span>
                                  </button>
                                )}

                                {isRejected && (
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => handleApprovePromotion(promo)}
                                    className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 font-bold text-xs transition cursor-pointer flex items-center gap-1"
                                    title="إعادة النظر والموافقة على الحملة"
                                  >
                                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                                    <span>موافقة لاحقة</span>
                                  </button>
                                )}

                                {isStopped && (
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => handleApprovePromotion(promo)}
                                    className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 font-bold text-xs transition cursor-pointer flex items-center gap-1"
                                    title="إعادة تفعيل الحملة"
                                  >
                                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                                    <span>إعادة تفعيل</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* Reject Reason Modal */}
          {rejectingPromo && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 space-y-4 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                  <div className="flex items-center gap-2 text-rose-600 font-black">
                    <XCircle className="w-5 h-5" />
                    <h3 className="text-base text-zinc-900">رفض طلب الترويج</h3>
                  </div>
                  <button
                    onClick={() => setRejectingPromo(null)}
                    className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-500 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="bg-rose-50/70 p-3.5 rounded-2xl border border-rose-200/80 text-xs text-rose-900 space-y-1">
                  <span className="font-bold block">تفاصيل الطلب:</span>
                  <div>المنتج: <strong>{rejectingPromo.productName}</strong></div>
                  <div>التاجر: <strong>{rejectingPromo.storeName}</strong> ({rejectingPromo.durationDays} أيام)</div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-zinc-700">
                    سبب الرفض (سيتم إرسال إشعار فوري للتاجر بهذا السبب):
                  </label>
                  <textarea
                    rows={3}
                    value={rejectionReasonInput}
                    onChange={e => setRejectionReasonInput(e.target.value)}
                    placeholder="اكتب سبب الرفض بوضوح لمساعدة التاجر على تصحيحه..."
                    className="w-full p-3 rounded-xl border border-zinc-300 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />

                  {/* Quick Reason Chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[
                      'صورة المنتج غير واضحة',
                      'المنتج غير متوفر في المخزون',
                      'مخالف لسياسة التسعير العادل',
                      'وصف المنتج غير مكتمل',
                    ].map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRejectionReasonInput(r)}
                        className="text-[10px] bg-zinc-100 hover:bg-zinc-200 text-zinc-700 px-2.5 py-1 rounded-lg transition cursor-pointer font-bold"
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => setRejectingPromo(null)}
                    className="px-4 py-2.5 rounded-xl text-zinc-600 hover:bg-zinc-100 font-bold text-xs cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    disabled={processingPromoId === rejectingPromo.id || !rejectionReasonInput.trim()}
                    onClick={handleConfirmRejectPromotion}
                    className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs cursor-pointer shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {processingPromoId === rejectingPromo.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    <span>تأكيد الرفض وإشعار التاجر</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Registered Users Management (Customers & Merchants) - Admin Only */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden shadow-xs space-y-4">
          <div className="p-5 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-base text-zinc-900">سجل المستخدمين المسجلين في دكانة</h2>
                <span className="text-[10px] font-black bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                  لوحة المدير حصراً
                </span>
              </div>
              <span className="text-xs text-zinc-500">
                قائمة كاملة بجميع حسابات الزبائن والتجار مع أرقام هواتفهم وتاريخ التسجيل
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchRegisteredUsers}
                disabled={isLoadingUsers}
                className="px-3 py-1.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-xs font-bold text-zinc-700 flex items-center gap-1.5 cursor-pointer transition disabled:opacity-50"
                title="تحديث قائمة المستخدمين"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingUsers ? 'animate-spin text-purple-700' : ''}`} />
                <span>تحديث</span>
              </button>
              <button
                onClick={() => {
                  setBroadcastTitle('');
                  setBroadcastMessage('');
                  setBroadcastErrorMsg('');
                  setBroadcastSuccessMsg('');
                  setIsBroadcastModalOpen(true);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer transition shadow-xs"
              >
                <Bell className="w-3.5 h-3.5 text-amber-300" />
                <span>إرسال إشعار عام</span>
              </button>
            </div>
          </div>

          {/* Search & Role Filters for Users */}
          <div className="px-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 relative">
              <Search className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={usersSearchQuery}
                onChange={e => setUsersSearchQuery(e.target.value)}
                placeholder="ابحث بالاسم، رقم الهاتف، أو المحافظة..."
                className="w-full pr-10 pl-10 py-2.5 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600 transition"
              />
              {usersSearchQuery && (
                <button
                  onClick={() => setUsersSearchQuery('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-1 text-xs cursor-pointer"
                  title="مسح البحث"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-1">
              {(
                [
                  { id: 'all', label: 'الكل' },
                  { id: 'customer', label: 'الزبائن' },
                  { id: 'merchant', label: 'التجار' },
                ] as const
              ).map(rf => (
                <button
                  key={rf.id}
                  onClick={() => setUsersRoleFilter(rf.id)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    usersRoleFilter === rf.id
                      ? 'bg-purple-900 text-white shadow-xs'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  {rf.label}
                </button>
              ))}
            </div>
          </div>

          {/* Feedback Toast Banner */}
          {merchantActionToast && (
            <div
              className={`mx-5 mb-3 p-3 rounded-2xl flex items-center justify-between text-xs font-bold border transition ${
                merchantActionToast.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {merchantActionToast.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{merchantActionToast.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setMerchantActionToast(null)}
                className="text-zinc-400 hover:text-zinc-700 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Users Table */}
          <div className="overflow-x-auto">
            {isLoadingUsers && registeredUsers.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-8 h-8 mx-auto rounded-full border-3 border-purple-700 border-t-transparent animate-spin"></div>
                <p className="text-xs text-zinc-500 font-bold">جاري تحميل بيانات المستخدمين من قاعدة البيانات...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <Users className="w-10 h-10 mx-auto text-zinc-300" />
                <p className="text-xs font-bold text-zinc-600">لا يوجد مستخدمين مطابقين للبحث أو الفلتر</p>
                {usersSearchQuery && (
                  <button
                    onClick={() => setUsersSearchQuery('')}
                    className="text-xs text-purple-700 hover:underline font-bold"
                  >
                    إعادة ضبط البحث
                  </button>
                )}
              </div>
            ) : (
              <table className="w-full text-right text-xs">
                <thead className="bg-zinc-50 text-zinc-600 font-bold border-b border-zinc-200">
                  <tr>
                    <th className="p-3.5">الاسم الكامل</th>
                    <th className="p-3.5">رقم الهاتف</th>
                    <th className="p-3.5">نوع الحساب (Role)</th>
                    <th className="p-3.5">حالة اعتماد التاجر</th>
                    <th className="p-3.5 text-center">إجراء الاعتماد</th>
                    <th className="p-3.5">المحافظة</th>
                    <th className="p-3.5">تاريخ التسجيل</th>
                    <th className="p-3.5">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredUsers.map(u => {
                    const isMerchantUser = u.role === 'merchant' || Boolean(u.merchantStoreId) || merchants.some(m => m.userId === u.id || m.phone === u.phone);
                    const isAdminUser = u.role === 'admin' || u.phone === ADMIN_PHONE_E164;
                    const matchingMerchant = merchants.find(
                      m => m.userId === u.id || m.phone === u.phone || (u.merchantStoreId && m.id === u.merchantStoreId)
                    );
                    const currentMerchantStatus: MerchantStatus = (u.merchantStatus as MerchantStatus) || matchingMerchant?.status || 'pending';
                    const isApprovedMerchant = currentMerchantStatus === 'approved';
                    const isUpdatingThisUser = updatingMerchantUserId === u.id;

                    const dateFormatted = u.createdAt
                      ? new Date(u.createdAt).toLocaleDateString('ar-IQ', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      : 'غير محدد';

                    return (
                      <tr key={u.id} className="hover:bg-purple-50/30 transition">
                        <td className="p-3.5 font-bold text-zinc-900">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center font-black text-xs shrink-0">
                              {(u.displayName || 'م')[0]}
                            </div>
                            <div>
                              <div>{u.displayName || 'مستخدم بدون اسم'}</div>
                              <div className="text-[10px] text-zinc-400 font-mono">ID: {u.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5 font-mono text-zinc-700 font-bold" dir="ltr">
                          {u.phone}
                        </td>
                        <td className="p-3.5">
                          {isAdminUser ? (
                            <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-900 font-black px-2.5 py-1 rounded-lg text-[11px] border border-purple-200">
                              <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
                              مدير المنصة
                            </span>
                          ) : isMerchantUser ? (
                            <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-900 font-bold px-2.5 py-1 rounded-lg text-[11px] border border-purple-200">
                              <Store className="w-3.5 h-3.5 text-purple-600" />
                              تاجر
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-900 font-bold px-2.5 py-1 rounded-lg text-[11px] border border-blue-200">
                              <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                              زبون
                            </span>
                          )}
                        </td>
                        <td className="p-3.5">
                          {isMerchantUser ? (
                            isApprovedMerchant ? (
                              <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 font-bold px-2.5 py-1 rounded-lg text-[11px] border border-emerald-200 shadow-2xs">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                تاجر معتمد
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-900 font-bold px-2.5 py-1 rounded-lg text-[11px] border border-amber-200 shadow-2xs">
                                <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                تاجر غير معتمد
                              </span>
                            )
                          ) : (
                            <span className="text-zinc-400 text-[11px]">—</span>
                          )}
                        </td>
                        <td className="p-3.5 text-center">
                          {isMerchantUser ? (
                            <div className="flex items-center justify-center">
                              {isApprovedMerchant ? (
                                <button
                                  type="button"
                                  disabled={isUpdatingThisUser}
                                  onClick={() => handleToggleMerchantStatus(u, 'pending')}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-[11px] bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 transition cursor-pointer disabled:opacity-50 shadow-2xs"
                                  title="إلغاء اعتماد هذا التاجر"
                                >
                                  {isUpdatingThisUser ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-700" />
                                  ) : null}
                                  <span>إلغاء الاعتماد ❌</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={isUpdatingThisUser}
                                  onClick={() => handleToggleMerchantStatus(u, 'approved')}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-xs cursor-pointer disabled:opacity-50"
                                  title="اعتماد التاجر فوراً في المنصة"
                                >
                                  {isUpdatingThisUser ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                                  ) : null}
                                  <span>اعتماد التاجر ✅</span>
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-zinc-400 text-[11px]">—</span>
                          )}
                        </td>
                        <td className="p-3.5 text-zinc-600">{u.governorate || 'بغداد'}</td>
                        <td className="p-3.5 text-zinc-500 font-mono text-[11px]">{dateFormatted}</td>
                        <td className="p-3.5">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              u.status === 'suspended'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {u.status === 'suspended' ? 'موقوف' : 'نشط'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="p-4 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
            <span>عدد المستخدمين المعروضين: {filteredUsers.length} من إجمالي {registeredUsers.length}</span>
            <span className="text-[11px] text-zinc-400">البيانات متصلة بقاعدة البيانات ومحمية بصلاحيات المدير</span>
          </div>
        </div>
      )}

      {/* Tab 2: Merchants Management */}
      {activeTab === 'merchants' && (
        <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden shadow-xs space-y-4">
          <div className="p-5 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-black text-base text-zinc-900">إدارة التجار والمتاجر العراقية</h2>
              <span className="text-xs text-zinc-500">موافقة المدير شرط أساسي لظهور متجر التاجر للعامة</span>
            </div>
            <span className="text-xs font-bold text-zinc-500 bg-zinc-100 px-3 py-1 rounded-xl self-start sm:self-auto">
              إجمالي: {filteredMerchants.length} من أصل {merchants.length} متجر
            </span>
          </div>

          {/* Search Box for Merchants */}
          <div className="px-5">
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={merchantSearchQuery}
                onChange={e => setMerchantSearchQuery(e.target.value)}
                placeholder="ابحث عن تاجر بالاسم، برقم الهاتف (07XXXXXXXXX)، أو بمعرف التاجر..."
                className="w-full pr-10 pl-10 py-2.5 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600 transition"
              />
              {merchantSearchQuery && (
                <button
                  onClick={() => setMerchantSearchQuery('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-1 text-xs cursor-pointer"
                  title="مسح البحث"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-zinc-50 text-zinc-600 font-bold border-b border-zinc-200">
                <tr>
                  <th className="p-3.5">معرف المتجر</th>
                  <th className="p-3.5">اسم المتجر</th>
                  <th className="p-3.5">المحافظة</th>
                  <th className="p-3.5">رقم الهاتف</th>
                  <th className="p-3.5">نسبة العمولة</th>
                  <th className="p-3.5">الحالة</th>
                  <th className="p-3.5 text-center">إجراءات الموافقة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {filteredMerchants.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-zinc-500">
                      <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                        <Search className="w-8 h-8 text-zinc-300" />
                        <p className="font-bold text-sm text-zinc-800">لا توجد نتائج مطابقة لبحثك</p>
                        <p className="text-xs text-zinc-500">
                          لم نجد أي تاجر يطابق "{merchantSearchQuery}". يرجى التأكد من كتابة الاسم أو رقم الهاتف أو المعرف بشكل صحيح.
                        </p>
                        <button
                          onClick={() => setMerchantSearchQuery('')}
                          className="mt-2 px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold rounded-lg text-xs transition cursor-pointer"
                        >
                          إلغاء البحث وعرض كافة التجار
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredMerchants.map(m => (
                    <tr key={m.id} className="hover:bg-zinc-50">
                      <td className="p-3.5 font-mono text-[11px] text-zinc-500">{m.id}</td>
                      <td className="p-3.5 font-bold text-zinc-900">{m.storeName}</td>
                      <td className="p-3.5 text-zinc-600">{m.governorate}</td>
                      <td className="p-3.5 text-zinc-600 font-mono" dir="ltr">{m.phone}</td>
                      <td className="p-3.5 font-bold text-purple-900">{m.commissionRate}%</td>
                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] border ${
                            m.status === 'approved'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : m.status === 'rejected'
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : m.status === 'suspended'
                              ? 'bg-zinc-100 text-zinc-700 border-zinc-300'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {m.status === 'approved'
                            ? 'مقبول'
                            : m.status === 'rejected'
                            ? 'مرفوض'
                            : m.status === 'suspended'
                            ? 'موقوف'
                            : 'قيد المراجعة'}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setMerchantStatus(m.id, 'approved')}
                            disabled={m.status === 'approved'}
                            className="px-2 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] disabled:opacity-40 hover:bg-emerald-700 cursor-pointer"
                          >
                            قبول
                          </button>
                          <button
                            onClick={() => setMerchantStatus(m.id, 'rejected')}
                            disabled={m.status === 'rejected'}
                            className="px-2 py-1 rounded-lg bg-rose-600 text-white font-bold text-[11px] disabled:opacity-40 hover:bg-rose-700 cursor-pointer"
                          >
                            رفض
                          </button>
                          <button
                            onClick={() => setMerchantStatus(m.id, 'suspended')}
                            disabled={m.status === 'suspended'}
                            className="px-2 py-1 rounded-lg bg-zinc-600 text-white font-bold text-[11px] disabled:opacity-40 hover:bg-zinc-700 cursor-pointer"
                          >
                            إيقاف
                          </button>
                          {onOpenChat && (
                            <button
                              onClick={() => onOpenChat(m.userId, 'merchant', m.storeName)}
                              className="px-2 py-1 rounded-lg bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                              title="محادثة التاجر مباشرة"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-purple-700" />
                              <span>محادثة</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Products Management */}
      {activeTab === 'products' && (
        <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden shadow-xs">
          <div className="p-5 border-b border-zinc-200 flex items-center justify-between">
            <h2 className="font-black text-base text-zinc-900">مراجعة واعتماد المنتجات</h2>
            <span className="text-xs text-zinc-500">المنتج لا يظهر للزبائن إلا بعد اعتماده من قبل المدير</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-zinc-50 text-zinc-600 font-bold border-b border-zinc-200">
                <tr>
                  <th className="p-3.5">المنتج</th>
                  <th className="p-3.5">المتجر</th>
                  <th className="p-3.5">السعر</th>
                  <th className="p-3.5">حالة الاعتماد</th>
                  <th className="p-3.5">الترويج</th>
                  <th className="p-3.5 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {products.map(p => (
                  <tr key={p.id} className="hover:bg-zinc-50">
                    <td className="p-3.5">
                      <div className="flex items-center gap-2.5">
                        <img src={p.imageUrl} alt={p.name} className="w-10 h-10 rounded-lg object-cover" />
                        <div>
                          <span className="font-bold text-zinc-900 block">{p.name}</span>
                          <span className="text-[11px] text-zinc-400">{p.categoryName}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 text-purple-900 font-semibold">{p.storeName}</td>
                    <td className="p-3.5 font-bold tabular-nums">{formatIQDTabular(p.finalPrice)}</td>
                    <td className="p-3.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] border ${
                          p.approvalStatus === 'approved'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : p.approvalStatus === 'rejected'
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {p.approvalStatus === 'approved'
                          ? 'مقبول (معروض للزبائن)'
                          : p.approvalStatus === 'rejected'
                          ? 'مرفوض'
                          : 'قيد المراجعة'}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5">
                        {p.isPromoted ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] bg-amber-50 text-amber-900 border border-amber-300">
                            <Sparkles className="w-3 h-3 text-amber-500 fill-amber-400" />
                            <span>مروّج ⭐</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full font-medium text-[10px] text-zinc-400 bg-zinc-100">
                            عادي
                          </span>
                        )}
                        <button
                          onClick={() => toggleProductPromotion(p.id)}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer transition ${
                            p.isPromoted
                              ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                              : 'bg-amber-100 hover:bg-amber-200 text-amber-900'
                          }`}
                          title={p.isPromoted ? 'إيقاف ترويج المنتج' : 'ترويج المنتج الآن'}
                        >
                          {p.isPromoted ? 'إيقاف' : 'ترويج'}
                        </button>
                      </div>
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setProductApproval(p.id, 'approved')}
                          disabled={p.approvalStatus === 'approved'}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] disabled:opacity-40 hover:bg-emerald-700 cursor-pointer"
                        >
                          موافقة ونشر
                        </button>
                        <button
                          onClick={() => setProductApproval(p.id, 'rejected')}
                          disabled={p.approvalStatus === 'rejected'}
                          className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold text-[11px] disabled:opacity-40 hover:bg-rose-700 cursor-pointer"
                        >
                          رفض
                        </button>
                        <button
                          onClick={() => setProductApproval(p.id, 'suspended')}
                          disabled={p.approvalStatus === 'suspended'}
                          className="px-2.5 py-1 rounded-lg bg-zinc-600 text-white font-bold text-[11px] disabled:opacity-40 hover:bg-zinc-700 cursor-pointer"
                        >
                          إيقاف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Orders & Commissions Ledger */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden shadow-xs space-y-4">
          <div className="p-5 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-black text-base text-zinc-900">سجل الطلبات والعمولات</h2>
              <span className="text-xs text-zinc-500">
                قاعدة النظام: العمولة تُحتسب فقط عند "تم التوصيل"، والطلب الملغي صفر عمولة.
              </span>
            </div>
            <span className="text-xs font-bold text-zinc-500 bg-zinc-100 px-3 py-1 rounded-xl self-start sm:self-auto">
              إجمالي: {filteredOrders.length} من أصل {orders.length} طلب
            </span>
          </div>

          {/* Search & Filter Controls for Orders */}
          <div className="px-5 flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={orderSearchQuery}
                onChange={e => setOrderSearchQuery(e.target.value)}
                placeholder="ابحث برقم الطلب (ord_...)، اسم الزبون، هاتف الزبون، أو اسم المتجر..."
                className="w-full pr-10 pl-10 py-2.5 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600 transition"
              />
              {orderSearchQuery && (
                <button
                  onClick={() => setOrderSearchQuery('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-1 text-xs cursor-pointer"
                  title="مسح البحث"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
              <Filter className="w-4 h-4 text-zinc-500 shrink-0" />
              <select
                value={orderStatusFilter}
                onChange={e => setOrderStatusFilter(e.target.value as any)}
                className="px-3 py-2.5 text-xs font-bold bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-600/30 cursor-pointer w-full md:w-auto"
              >
                <option value="all">كافة حالات الطلب ({orders.length})</option>
                <option value="new">طلبات جديدة</option>
                <option value="confirmed">تم التأكيد</option>
                <option value="preparing">قيد التجهيز</option>
                <option value="out_for_delivery">خرجت للتوصيل</option>
                <option value="delivered">تم التوصيل (مكتملة)</option>
                <option value="cancelled">ملغاة</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-zinc-50 text-zinc-600 font-bold border-b border-zinc-200">
                <tr>
                  <th className="p-3.5">رقم الطلب</th>
                  <th className="p-3.5">المتجر</th>
                  <th className="p-3.5">المستلم والمحافظة</th>
                  <th className="p-3.5">هاتف المستلم</th>
                  <th className="p-3.5">القيمة الإجمالية</th>
                  <th className="p-3.5">الحالة</th>
                  <th className="p-3.5">عمولة دكانة</th>
                  <th className="p-3.5 text-center">تحديث الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-zinc-500">
                      <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                        <Search className="w-8 h-8 text-zinc-300" />
                        <p className="font-bold text-sm text-zinc-800">لا توجد طلبات مطابقة للبحث</p>
                        <p className="text-xs text-zinc-500">
                          لم يتم العثور على أي طلب يطابق معايير البحث والفلترة المحددة.
                        </p>
                        <button
                          onClick={() => {
                            setOrderSearchQuery('');
                            setOrderStatusFilter('all');
                          }}
                          className="mt-2 px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold rounded-lg text-xs transition cursor-pointer"
                        >
                          إعادة ضبط الفلاتر والبحث
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map(o => (
                    <tr key={o.id} className="hover:bg-zinc-50">
                      <td className="p-3.5 font-mono font-bold text-purple-950">{o.id}</td>
                      <td className="p-3.5 text-zinc-800 font-semibold">{o.storeName}</td>
                      <td className="p-3.5 text-zinc-600">
                        {o.recipientName} ({o.governorate})
                      </td>
                      <td className="p-3.5 text-zinc-600 font-mono text-[11px]" dir="ltr">
                        {o.recipientPhone}
                      </td>
                      <td className="p-3.5 font-bold tabular-nums">{formatIQDTabular(o.finalTotal)}</td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            o.status === 'delivered'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : o.status === 'cancelled'
                              ? 'bg-rose-50 text-rose-800 border border-rose-200'
                              : 'bg-blue-50 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {o.status === 'delivered'
                            ? 'تم التوصيل'
                            : o.status === 'cancelled'
                            ? 'ملغي'
                            : o.status === 'out_for_delivery'
                            ? 'خرج للتوصيل'
                            : o.status === 'preparing'
                            ? 'قيد التجهيز'
                            : o.status === 'confirmed'
                            ? 'تم التأكيد'
                            : 'طلب جديد'}
                        </span>
                      </td>
                      <td className="p-3.5 font-black text-emerald-800 tabular-nums">
                        {o.status === 'delivered' ? formatIQDTabular(o.commissionAmount) : '0 د.ع (غير مسلم)'}
                      </td>
                      <td className="p-3.5 text-center">
                        <select
                          value={o.status}
                          onChange={e => updateOrderStatus(o.id, e.target.value as OrderStatus)}
                          className="px-2 py-1 rounded-lg border border-zinc-200 bg-white text-[11px] font-bold cursor-pointer"
                        >
                          <option value="new">طلب جديد</option>
                          <option value="confirmed">تم تأكيد الطلب</option>
                          <option value="preparing">قيد التجهيز</option>
                          <option value="out_for_delivery">خرج للتوصيل</option>
                          <option value="delivered">تم التوصيل (احتساب العمولة)</option>
                          <option value="cancelled">ملغي (بدون عمولة)</option>
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Home Page Banners Management */}
      {activeTab === 'banners' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-zinc-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <ImageIcon className="w-5 h-5 text-purple-700" />
                <h2 className="text-base font-black text-zinc-900">صور الصفحة الرئيسية (Hero Banners)</h2>
              </div>
              <p className="text-xs text-zinc-500 max-w-xl">
                التحكم بالصور الكبيرة والإعلانات المعروضة في واجهة المتجر الرئيسية للزبائن، مع إمكانية الترتيب وتحديد الصور النشطة وحذفها أو استبدالها في أي وقت.
              </p>
            </div>
            <button
              onClick={openAddBannerModal}
              className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة صورة واجهة جديدة</span>
            </button>
          </div>

          {bannerSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{bannerSuccessMsg}</span>
            </div>
          )}

          {/* Banners List */}
          <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between text-xs font-bold text-zinc-700">
              <span>قائمة صور الواجهة الحالية ({banners.length})</span>
              <span className="text-purple-700">
                {banners.filter(b => b.isActive).length} صور نشطة تظهر للزبائن حالياً
              </span>
            </div>

            {banners.length === 0 ? (
              <div className="p-12 text-center text-zinc-400 text-xs space-y-3">
                <ImageIcon className="w-10 h-10 mx-auto text-zinc-300" />
                <p className="font-bold text-zinc-700 text-sm">لا توجد أي صور واجهة مضافة حالياً</p>
                <p className="text-zinc-400 max-w-sm mx-auto">
                  اضغط على زر "إضافة صورة واجهة جديدة" لرفع صور وبانرات تسويقية كبيرة تظهر في صدارة الصفحة الرئيسية.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-200">
                {[...banners]
                  .sort((a, b) => a.displayOrder - b.displayOrder)
                  .map((b, index, arr) => (
                    <div key={b.id} className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-zinc-50/50 transition">
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <div className="relative w-24 sm:w-32 h-16 sm:h-20 rounded-2xl overflow-hidden bg-zinc-100 shrink-0 border border-zinc-200">
                          <img
                            src={b.imageUrl}
                            alt={b.title}
                            className="w-full h-full object-cover"
                            onError={e => {
                              // Fallback on broken image so it never shows broken icon
                              (e.target as HTMLImageElement).src = '/src/assets/images/hero_dukkana_market_1791352449347.jpg';
                            }}
                          />
                          {!b.isActive && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-[10px] font-bold text-white">
                              معطلة
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm text-zinc-900 truncate">{b.title}</span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                b.isActive
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                              }`}
                            >
                              {b.isActive ? 'نشطة للزبائن' : 'معطلة'}
                            </span>
                            {b.badgeText && (
                              <span className="hidden sm:inline-block px-2 py-0.5 rounded-lg text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                {b.badgeText}
                              </span>
                            )}
                          </div>
                          {b.subtitle && (
                            <p className="text-xs text-zinc-500 line-clamp-1">{b.subtitle}</p>
                          )}
                          <div className="text-[11px] text-zinc-400">
                            الترتيب: #{b.displayOrder} · القسم المرتبط:{' '}
                            <span className="font-semibold text-zinc-600">
                              {categories.find(c => c.slug === b.linkCategorySlug)?.name || 'جميع المنتجات'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Banner Actions */}
                      <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                        {/* Reorder Buttons */}
                        <div className="flex items-center border border-zinc-200 rounded-xl overflow-hidden bg-white">
                          <button
                            onClick={() => reorderBanners(b.id, 'up')}
                            disabled={index === 0}
                            className="p-1.5 text-zinc-600 hover:text-purple-700 hover:bg-zinc-50 disabled:opacity-30 cursor-pointer"
                            title="تحريك للأعلى"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <div className="w-px h-4 bg-zinc-200"></div>
                          <button
                            onClick={() => reorderBanners(b.id, 'down')}
                            disabled={index === arr.length - 1}
                            className="p-1.5 text-zinc-600 hover:text-purple-700 hover:bg-zinc-50 disabled:opacity-30 cursor-pointer"
                            title="تحريك للأسفل"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Toggle Active Button */}
                        <button
                          onClick={() => toggleBannerStatus(b.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition ${
                            b.isActive
                              ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {b.isActive ? 'تعطيل' : 'تفعيل'}
                        </button>

                        {/* Edit Button */}
                        <button
                          onClick={() => openEditBannerModal(b)}
                          className="p-2 text-zinc-600 hover:text-purple-700 hover:bg-purple-50 rounded-xl cursor-pointer transition"
                          title="تعديل أو استبدال الصورة"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => {
                            if (window.confirm(`هل أنت متأكد من حذف صورة الواجهة "${b.title}"؟`)) {
                              deleteBanner(b.id);
                            }
                          }}
                          className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl cursor-pointer transition"
                          title="حذف الصورة"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Exclusive Admin Stories Manager (Enforcing 5 Stories Limit) */}
      {activeTab === 'stories' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-zinc-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-purple-700 fill-purple-700" />
                </div>
                <h2 className="text-base font-black text-zinc-900">ستوريات دكانة الإعلانية (حصري بالمدير)</h2>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                    adminStories.filter(s => s.isActive !== false).length >= 5
                      ? 'bg-rose-50 text-rose-800 border-rose-200'
                      : 'bg-purple-50 text-purple-800 border-purple-200'
                  }`}
                >
                  {adminStories.filter(s => s.isActive !== false).length} / 5 ستوريات نشطة (الحد الأقصى)
                </span>
              </div>
              <p className="text-xs text-zinc-500 max-w-xl">
                التحكم بالقصص الدائرية الإعلانية المعروضة في شريط Story Circles أعلى الصفحة الرئيسية للمشترين. يقتصر النظام برمجياً على 5 ستوريات متزامنة كحد أقصى لضمان تركيز انتباه الزبائن على أفضل العروض.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setStoryTitle('');
                setStoryImageUrl('/src/assets/images/hero_dukkana_market_1791352449347.jpg');
                setStoryLinkedProductId(products[0]?.id || '');
                setStoryDurationDays(14);
                setStoryCtaText('تسوّق الآن');
                setStoryFormError('');
                setShowAddStoryModal(true);
              }}
              className="px-5 py-2.5 font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 shrink-0 bg-purple-700 hover:bg-purple-800 text-white cursor-pointer shadow-purple-700/20"
              title="إضافة ونشر ستوري جديد"
            >
              <Plus className="w-4 h-4" />
              <span>ستوري جديد</span>
            </button>
          </div>

          {storySuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{storySuccessMsg}</span>
            </div>
          )}

          {/* Stories Management Grid */}
          <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between text-xs font-bold text-zinc-700">
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-700" />
                <span>قائمة الستوريات الحالية ({adminStories.length})</span>
              </span>
              <span className="text-purple-800">
                {adminStories.filter(s => s.isActive !== false).length} معروضة للزبائن حالياً
              </span>
            </div>

            {isLoadingStories ? (
              <div className="p-12 text-center text-xs text-zinc-400">
                <div className="w-8 h-8 mx-auto rounded-full border-2 border-purple-700 border-t-transparent animate-spin mb-2" />
                <span>جاري تحميل الستوريات...</span>
              </div>
            ) : adminStories.length === 0 ? (
              <div className="p-12 text-center text-zinc-400 text-xs space-y-3">
                <Sparkles className="w-10 h-10 mx-auto text-zinc-300" />
                <p className="font-bold text-zinc-700 text-sm">لا توجد أي ستوريات إعلانية مضافة حالياً</p>
                <p className="text-zinc-400 max-w-sm mx-auto">
                  اضغط على زر "ستوري جديد" لرفع بانر العرض وتحديد المنتج المروّج لربطه بالزر السريع.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setStoryTitle('');
                    setStoryImageUrl('/src/assets/images/hero_dukkana_market_1791352449347.jpg');
                    setStoryLinkedProductId(products[0]?.id || '');
                    setStoryDurationDays(14);
                    setStoryCtaText('تسوّق الآن');
                    setStoryFormError('');
                    setShowAddStoryModal(true);
                  }}
                  className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
                >
                  + ستوري جديد
                </button>
              </div>
            ) : (
              <div className="divide-y divide-zinc-200">
                {adminStories.map((s, idx) => {
                  const linkedProdId = s.ctaLink?.startsWith('product:') ? s.ctaLink.replace('product:', '') : '';
                  const linkedProduct = products.find(p => p.id === linkedProdId || p.id === s.productId);

                  return (
                    <div
                      key={s.id}
                      className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-zinc-50/50 transition"
                    >
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        {/* Circular Story Preview */}
                        <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full p-1 bg-gradient-to-tr from-purple-950 via-purple-600 to-purple-400 shrink-0 shadow-sm">
                          <div className="w-full h-full rounded-full border-2 border-white overflow-hidden bg-zinc-900">
                            <img
                              src={s.mediaUrl}
                              alt={s.title}
                              className="w-full h-full object-cover"
                              onError={e => {
                                (e.target as HTMLImageElement).src = '/src/assets/images/hero_dukkana_market_1791352449347.jpg';
                              }}
                            />
                          </div>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black text-zinc-400">#{idx + 1}</span>
                            <h4 className="font-bold text-sm text-zinc-900 truncate">{s.title}</h4>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                s.isActive !== false
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-zinc-100 text-zinc-500 border-zinc-200'
                              }`}
                            >
                              {s.isActive !== false ? 'نشط ومعروض' : 'معطل'}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-zinc-500 mt-1 flex-wrap">
                            <span>زر الإجراء: <strong className="text-purple-900">{s.ctaText || 'تسوّق الآن'}</strong></span>
                            {linkedProduct ? (
                              <span className="flex items-center gap-1 text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md font-bold">
                                <span>المنتج المرتبط:</span>
                                <span>{linkedProduct.name} ({formatIQDTabular(linkedProduct.finalPrice)})</span>
                              </span>
                            ) : (
                              <span className="text-zinc-400">بدون ربط منتج مباشر</span>
                            )}
                          </div>

                          {/* Views & Clicks Analytics */}
                          <div className="flex items-center gap-4 text-[11px] text-zinc-400 mt-1.5">
                            <span className="flex items-center gap-1">
                              <Eye className="w-3.5 h-3.5 text-zinc-500" />
                              <span>{s.viewsCount || 0} مشاهدة</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <TrendingUp className="w-3.5 h-3.5 text-purple-600" />
                              <span>{s.clicksCount || 0} نقرة انتقال</span>
                            </span>
                            {s.viewsCount > 0 && (
                              <span className="text-emerald-700 font-bold">
                                نسبة التفاعل: {Math.round(((s.clicksCount || 0) / s.viewsCount) * 100)}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Story Actions */}
                      <div className="flex items-center gap-2 self-end md:self-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStoryActive(s.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                            s.isActive !== false
                              ? 'border-zinc-300 text-zinc-700 hover:bg-zinc-100'
                              : 'border-purple-300 bg-purple-50 text-purple-900 hover:bg-purple-100'
                          }`}
                        >
                          {s.isActive !== false ? 'تعطيل مؤقت' : 'تفعيل'}
                        </button>

                        {/* Explicit Red Delete Story Button with Quick Confirmation */}
                        {confirmDeleteStoryId === s.id ? (
                          <div className="flex items-center gap-1.5 p-1.5 bg-rose-50 border border-rose-300 rounded-xl animate-in fade-in shadow-2xs">
                            <span className="text-[11px] font-bold text-rose-800 pr-1">
                              هل أنت متأكد من حذف هذا الستوري؟
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteStory(s.id)}
                              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-black transition flex items-center gap-1 cursor-pointer shadow-xs"
                              title="تأكيد حذف الستوري"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>نعم، حذف</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteStoryId(null)}
                              className="px-2 py-1 rounded-lg bg-zinc-200 hover:bg-zinc-300 text-zinc-700 text-xs font-bold transition cursor-pointer"
                              title="إلغاء الحذف"
                            >
                              إلغاء
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteStoryId(s.id)}
                            className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs shadow-rose-600/20"
                            title="حذف الستوري نهائياً"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>حذف الستوري</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 5: Categories Management */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-3xl border border-zinc-200">
            <h3 className="font-black text-sm text-zinc-900 mb-3 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-purple-700" />
              <span>إضافة قسم جديد للمتجر</span>
            </h3>
            <form onSubmit={handleAddCategorySubmit} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                required
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                placeholder="اسم القسم (مثال: عطور وبخور عراقية)"
                className="flex-1 px-3 py-2 text-xs border border-zinc-200 rounded-xl focus:ring-2 focus:ring-purple-600/30"
              />
              <input
                type="text"
                value={newCatDesc}
                onChange={e => setNewCatDesc(e.target.value)}
                placeholder="وصف مختصر للقسم"
                className="flex-1 px-3 py-2 text-xs border border-zinc-200 rounded-xl focus:ring-2 focus:ring-purple-600/30"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                إضافة القسم
              </button>
            </form>
          </div>

          <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden">
            <div className="p-4 bg-zinc-50 border-b border-zinc-200 font-bold text-xs text-zinc-700">
              الأقسام الحالية ({categories.length})
            </div>
            <div className="divide-y divide-zinc-200">
              {categories.map(c => (
                <div key={c.id} className="p-4 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-zinc-900 text-sm block">{c.name}</span>
                    <span className="text-zinc-500 text-[11px]">{c.description || 'بدون وصف'}</span>
                  </div>
                  {c.id !== 'cat_all' && (
                    <button
                      onClick={() => {
                        if (window.confirm(`هل أنت متأكد من حذف قسم "${c.name}"؟`)) {
                          deleteCategory(c.id);
                        }
                      }}
                      className="text-zinc-400 hover:text-rose-600 p-1 cursor-pointer"
                      title="حذف القسم"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Reviews Moderation & Reports */}
      {activeTab === 'reviews' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-zinc-200 p-5">
            <h3 className="font-black text-sm text-zinc-900 mb-2 flex items-center gap-2">
              <Flag className="w-4 h-4 text-rose-600" />
              <span>بلاغات التقييمات والمحتوى المخالف ({reports.length})</span>
            </h3>
            <p className="text-xs text-zinc-500 mb-4">
              مراجعة البلاغات الواردة من المستخدمين حول التقييمات غير اللائقة أو المخالفة لسياسات Apple وGoogle.
            </p>

            {reports.length === 0 ? (
              <div className="text-center py-8 text-zinc-400 text-xs">
                لا توجد بلاغات معلقة حالياً. سجل التقييمات نظيف وملتزم.
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map(rep => (
                  <div key={rep.id} className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-900">
                        سبب البلاغ: {rep.reason === 'inappropriate' ? 'محتوى غير لائق' : rep.reason}
                      </span>
                      <span className="text-zinc-400 text-[11px]">
                        {new Date(rep.createdAt).toLocaleDateString('ar-IQ')}
                      </span>
                    </div>
                    <p className="text-zinc-700 bg-white p-2.5 rounded-xl border border-zinc-200">
                      تفاصيل البلاغ: {rep.details}
                    </p>
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200/60">
                      <button
                        onClick={() => {
                          setReviewStatus(rep.reviewId, 'hidden');
                          resolveReport(rep.id, 'action_taken');
                        }}
                        className="px-3 py-1 bg-rose-600 text-white rounded-lg font-bold text-[11px] cursor-pointer"
                      >
                        إخفاء التقييم واتخاذ إجراء
                      </button>
                      <button
                        onClick={() => resolveReport(rep.id, 'dismissed')}
                        className="px-3 py-1 bg-zinc-200 text-zinc-700 rounded-lg font-bold text-[11px] cursor-pointer"
                      >
                        تجاهل البلاغ (سليم)
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* All Reviews Management */}
          <div className="bg-white rounded-3xl border border-zinc-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-sm text-zinc-900 flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span>كافة تقييمات المنصة الموثقة ({reviews.length})</span>
              </h3>
              <span className="text-xs text-zinc-500">
                المدير يستطيع إخفاء أو حذف أي تقييم مخالف للآداب أو لسياسات Apple وGoogle
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-zinc-50 text-zinc-600 font-bold border-b border-zinc-200">
                  <tr>
                    <th className="p-3">المنتج والطلب</th>
                    <th className="p-3">صاحب التقييم</th>
                    <th className="p-3">النجوم</th>
                    <th className="p-3">التعليق</th>
                    <th className="p-3">الحالة</th>
                    <th className="p-3 text-center">إجراءات الرقابة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {reviews.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-zinc-400">
                        لا توجد تقييمات منشورة حتى الآن.
                      </td>
                    </tr>
                  ) : (
                    reviews.map(rev => (
                      <tr key={rev.id} className="hover:bg-zinc-50">
                        <td className="p-3 font-bold text-zinc-900">
                          <div>{rev.productName}</div>
                          <span className="text-[10px] text-zinc-400 font-mono">طلب #{rev.orderId}</span>
                        </td>
                        <td className="p-3 text-zinc-700">
                          <div>{rev.userName}</div>
                          <span className="text-[10px] text-zinc-400 font-mono" dir="ltr">{rev.userPhone}</span>
                        </td>
                        <td className="p-3">
                          <span className="font-black text-amber-600">★ {rev.rating}</span>
                        </td>
                        <td className="p-3 text-zinc-600 max-w-xs truncate">
                          {rev.comment || 'بدون تعليق'}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              rev.status === 'published'
                                ? 'bg-emerald-50 text-emerald-800'
                                : 'bg-rose-50 text-rose-800'
                            }`}
                          >
                            {rev.status === 'published' ? 'منشور للعامة' : 'مخفي للمخالفة'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {rev.status === 'published' ? (
                              <button
                                onClick={() => setReviewStatus(rev.id, 'hidden')}
                                className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-[10px] font-bold cursor-pointer"
                              >
                                إخفاء
                              </button>
                            ) : (
                              <button
                                onClick={() => setReviewStatus(rev.id, 'published')}
                                className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-lg text-[10px] font-bold cursor-pointer"
                              >
                                إظهار
                              </button>
                            )}
                            <button
                              onClick={() => {
                                if (window.confirm('هل أنت متأكد من حذف هذا التقييم نهائياً؟')) {
                                  setReviewStatus(rev.id, 'deleted');
                                }
                              }}
                              className="px-2 py-1 bg-rose-100 hover:bg-rose-200 text-rose-900 rounded-lg text-[10px] font-bold cursor-pointer"
                            >
                              حذف
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Platform Coupons & Admin-Only Discounts */}
      {activeTab === 'coupons' && (
        <div className="space-y-6">
          {/* Admin Exclusive Authorization Notice */}
          <div className="p-4 bg-gradient-to-r from-purple-900 to-indigo-900 text-white rounded-3xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
                <Tag className="w-5 h-5 text-amber-300" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black">إدارة كوبونات الخصم والمنصة</h2>
                  <span className="text-[10px] font-black bg-amber-400 text-purple-950 px-2 py-0.5 rounded-full">
                    صلاحية المدير فقط
                  </span>
                </div>
                <p className="text-xs text-purple-200 max-w-2xl leading-relaxed">
                  تحديد وتفعيل كوبونات الخصم مقتصر حصراً على إدارة المنصة. تظهر الكوبونات للزبائن في سلة المشتريات وصفحة إتمام الطلب لتطبيق الخصم المعتمد على مجموع المنتجات.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setCouponFormError('');
                setShowAddCouponModal(true);
              }}
              className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-purple-950 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>+ إنشاء كوبون جديد</span>
            </button>
          </div>

          {couponActionNotice && (
            <div
              className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 border ${
                couponActionNotice.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{couponActionNotice.text}</span>
            </div>
          )}

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-zinc-200 shadow-2xs">
              <span className="text-xs text-zinc-500 font-bold block mb-1">إجمالي الكوبونات</span>
              <div className="text-2xl font-black text-purple-950 tabular-nums">
                {coupons.length}
              </div>
              <span className="text-[11px] text-zinc-400 mt-1 block">كوبونات مسجلة في النظام</span>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-zinc-200 shadow-2xs">
              <span className="text-xs text-zinc-500 font-bold block mb-1">الكوبونات النشطة حالياً</span>
              <div className="text-2xl font-black text-emerald-700 tabular-nums">
                {coupons.filter(c => c.isActive).length}
              </div>
              <span className="text-[11px] text-zinc-400 mt-1 block">متاحة لاستخدام الزبائن فوراً</span>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-zinc-200 shadow-2xs">
              <span className="text-xs text-zinc-500 font-bold block mb-1">إجمالي مرات الاستخدام</span>
              <div className="text-2xl font-black text-indigo-900 tabular-nums">
                {coupons.reduce((sum, c) => sum + (c.usageCount || 0), 0)}
              </div>
              <span className="text-[11px] text-zinc-400 mt-1 block">مرات تطبيق الخصم بالطلبات</span>
            </div>
          </div>

          {/* Coupons List Table */}
          <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden shadow-xs">
            <div className="p-4 sm:p-5 border-b border-zinc-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ticket className="w-4 h-4 text-purple-700" />
                <h3 className="font-bold text-sm text-zinc-900">قائمة الكوبونات المعتمدة</h3>
              </div>
              <span className="text-xs text-zinc-500">
                {coupons.length} كوبون متوفر
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-zinc-50 text-zinc-600 border-b border-zinc-200 font-bold">
                    <th className="py-3 px-4">رمز الكوبون</th>
                    <th className="py-3 px-4">نوع وقيمة الخصم</th>
                    <th className="py-3 px-4">الحد الأدنى للطلب</th>
                    <th className="py-3 px-4">حد الخصم الأقصى</th>
                    <th className="py-3 px-4">مرات الاستخدام</th>
                    <th className="py-3 px-4">الحالة</th>
                    <th className="py-3 px-4">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {coupons.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-zinc-400">
                        لا توجد كوبونات مسجلة. انقر على "+ إنشاء كوبون جديد" لإضافة أول كود خصم.
                      </td>
                    </tr>
                  ) : (
                    coupons.map(coupon => (
                      <tr key={coupon.id} className="hover:bg-zinc-50/70 transition">
                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            <span className="font-mono font-black text-sm text-purple-950 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-lg inline-block">
                              {coupon.code}
                            </span>
                            <span className="block text-[11px] text-zinc-500 line-clamp-1">
                              {coupon.description}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4 font-bold text-zinc-900">
                          {coupon.discountType === 'percentage' ? (
                            <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              <span>خصم {coupon.discountValue}%</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                              <span>خصم {formatIQDTabular(coupon.discountValue)}</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 font-mono font-medium text-zinc-700">
                          {coupon.minOrderSubtotal > 0
                            ? formatIQDTabular(coupon.minOrderSubtotal)
                            : 'بدون حد أدنى'}
                        </td>

                        <td className="py-3 px-4 font-mono text-zinc-600">
                          {coupon.maxDiscountCap
                            ? formatIQDTabular(coupon.maxDiscountCap)
                            : 'غير مقيد'}
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-bold text-purple-950 bg-purple-100/60 px-2 py-0.5 rounded-md text-[11px]">
                            {coupon.usageCount} {coupon.maxUsageLimit ? `/ ${coupon.maxUsageLimit}` : 'مرة'}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              coupon.isActive
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-zinc-100 text-zinc-500 border border-zinc-200'
                            }`}
                          >
                            {coupon.isActive ? 'مفعّل ونشط' : 'معطّل مؤقتاً'}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleCouponActive(coupon.id)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                                coupon.isActive
                                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200'
                              }`}
                            >
                              {coupon.isActive ? 'تعطيل' : 'تفعيل'}
                            </button>

                            <button
                              onClick={() => {
                                if (window.confirm(`هل أنت متأكد من حذف الكوبون (${coupon.code}) نهائياً؟`)) {
                                  deleteCoupon(coupon.id);
                                }
                              }}
                              className="p-1 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition cursor-pointer"
                              title="حذف الكوبون"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add Coupon Modal */}
          {showAddCouponModal && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl border border-zinc-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95">
                <div className="p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-purple-700 text-white flex items-center justify-center">
                      <Tag className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-black text-sm text-zinc-900">إنشاء كوبون خصم جديد</h3>
                      <p className="text-[11px] text-zinc-500">تحديد خصم رسمي للمنصة برمز مخصص</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAddCouponModal(false)}
                    className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateCoupon} className="p-5 space-y-4 text-xs">
                  {couponFormError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl font-bold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{couponFormError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-zinc-700 mb-1">
                        رمز الكوبون (Code) *
                      </label>
                      <input
                        type="text"
                        required
                        value={couponCode}
                        onChange={e => setCouponCode(e.target.value.toUpperCase())}
                        placeholder="مثال: BAGHDAD15"
                        className="w-full px-3 py-2 border border-zinc-200 rounded-xl uppercase font-mono tracking-wider focus:outline-none focus:border-purple-600"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-zinc-700 mb-1">نوع الخصم *</label>
                      <select
                        value={couponType}
                        onChange={e => setCouponType(e.target.value as any)}
                        className="w-full px-3 py-2 border border-zinc-200 rounded-xl bg-white focus:outline-none focus:border-purple-600 cursor-pointer"
                      >
                        <option value="percentage">نسبة مئوية (%) من المجموع</option>
                        <option value="fixed">مبلغ ثابت (بالدينار العراقي)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-zinc-700 mb-1">
                        {couponType === 'percentage' ? 'نسبة الخصم (%) *' : 'مبلغ الخصم (د.ع) *'}
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        max={couponType === 'percentage' ? '90' : undefined}
                        value={couponValue}
                        onChange={e => setCouponValue(e.target.value)}
                        placeholder={couponType === 'percentage' ? 'مثال: 15' : 'مثال: 5000'}
                        className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:border-purple-600"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-zinc-700 mb-1">
                        الحد الأدنى للطلب (د.ع)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={couponMinSubtotal}
                        onChange={e => setCouponMinSubtotal(e.target.value)}
                        placeholder="مثال: 10000"
                        className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:border-purple-600"
                      />
                    </div>
                  </div>

                  {couponType === 'percentage' && (
                    <div>
                      <label className="block font-bold text-zinc-700 mb-1">
                        الحد الأقصى للخصم (د.ع - اختياري لمنع الخصم المفتوح)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={couponMaxCap}
                        onChange={e => setCouponMaxCap(e.target.value)}
                        placeholder="مثال: 25000"
                        className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:border-purple-600"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-zinc-700 mb-1">
                        صلاحية الكوبون (بالأيام)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={couponExpiryDays}
                        onChange={e => setCouponExpiryDays(e.target.value)}
                        placeholder="مثال: 30"
                        className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:border-purple-600"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-zinc-700 mb-1">
                        الحد الأقصى للاستخدام (اختياري)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={couponMaxUses}
                        onChange={e => setCouponMaxUses(e.target.value)}
                        placeholder="فارغ = استخدام مفتوح"
                        className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:border-purple-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-zinc-700 mb-1">
                      وصف الكوبون الترويجي (يظهر للزبون)
                    </label>
                    <input
                      type="text"
                      value={couponDesc}
                      onChange={e => setCouponDesc(e.target.value)}
                      placeholder="مثال: خصم عيد الفطر المبارك على عموم المنتجات"
                      className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:border-purple-600"
                    />
                  </div>

                  <div className="pt-3 border-t border-zinc-100 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddCouponModal(false)}
                      className="px-4 py-2 border border-zinc-200 rounded-xl font-bold text-zinc-600 hover:bg-zinc-50 cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl shadow-sm cursor-pointer transition"
                    >
                      حفظ وتفعيل الكوبون
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 7: App Settings & WhatsApp */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-3xl border border-zinc-200 p-6 max-w-xl">
          <h2 className="font-black text-base text-zinc-900 mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-purple-700" />
            <span>إعدادات النظام والتواصل</span>
          </h2>

          {settingsSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl mb-4">
              {settingsSuccessMsg}
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-zinc-700 mb-1">
                رقم واتساب الدعم الفني والمساعدة الرسمي *
              </label>
              <input
                type="text"
                required
                value={supportWhatsApp}
                onChange={e => setSupportWhatsApp(e.target.value)}
                placeholder="+9647701234567"
                dir="ltr"
                className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-purple-600/30 font-mono"
              />
              <span className="text-[11px] text-zinc-400 mt-1 block">
                هذا الرقم يظهر في شاشة "الدعم والمساعدة" لجميع زبائن وتجار دكانة.
              </span>
            </div>

            <div>
              <label className="block font-bold text-zinc-700 mb-1">
                نسبة عمولة منصة دكانة الافتراضية (%) *
              </label>
              <input
                type="number"
                required
                min="0"
                max="50"
                value={commissionRate}
                onChange={e => setCommissionRate(e.target.value)}
                placeholder="5"
                className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-purple-600/30"
              />
              <span className="text-[11px] text-zinc-400 mt-1 block">
                تُستقطع العمولة تلقائياً عند تحول حالة الطلب إلى "تم التوصيل" فقط.
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-zinc-700">
                  سعر ترويج المنتج داخل التطبيق (د.ع) *
                </label>
                <span className="text-[11px] font-black text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200">
                  {formatIQDTabular(Number(promotionPrice) || 0)}
                </span>
              </div>
              <input
                type="number"
                required
                min="0"
                step="1000"
                value={promotionPrice}
                onChange={e => setPromotionPrice(e.target.value)}
                placeholder="15000"
                className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-purple-600/30 font-bold"
              />
              <span className="text-[11px] text-zinc-400 mt-1 block">
                القيمة المالية بالدينار العراقي لترويج المنتج في صدارة نتائج البحث وقسم المنتجات المروجة.
              </span>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl cursor-pointer shadow-xs transition"
            >
              حفظ الإعدادات
            </button>
          </form>
        </div>
      )}

      {/* Banner Modal: Add / Edit Home Banner */}
      {isBannerModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 border border-zinc-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-black text-zinc-900 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-purple-700" />
                <span>{editingBanner ? 'تعديل صورة الصفحة الرئيسية' : 'إضافة صورة واجهة جديدة'}</span>
              </h3>
              <button
                onClick={() => setIsBannerModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {bannerFormError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl mb-4 font-bold">
                {bannerFormError}
              </div>
            )}

            <form onSubmit={handleSaveBanner} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-zinc-700 mb-1">عنوان الإعلان الرئيسي *</label>
                <input
                  type="text"
                  required
                  value={bannerTitle}
                  onChange={e => setBannerTitle(e.target.value)}
                  placeholder="مثال: تسوق كل ما تحتاجه في العراق"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-purple-600/30 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">النص الفرعي / الوصف المختصر</label>
                <textarea
                  rows={2}
                  value={bannerSubtitle}
                  onChange={e => setBannerSubtitle(e.target.value)}
                  placeholder="مثال: نخبة التجار العراقيين مع الدفع نقداً عند الاستلام..."
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-purple-600/30"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">شارة مميزة (Badge Text)</label>
                <input
                  type="text"
                  value={bannerBadge}
                  onChange={e => setBannerBadge(e.target.value)}
                  placeholder="مثال: عروض الموسم الحصرية · موثوق ومضمون"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-purple-600/30"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">صورة الواجهة *</label>
                <div className="space-y-3">
                  {bannerImageUrl && (
                    <div className="relative aspect-21/9 rounded-2xl overflow-hidden bg-zinc-100 border border-zinc-200">
                      <img
                        src={bannerImageUrl}
                        alt="معاينة الصورة"
                        className="w-full h-full object-cover"
                        onError={e => {
                          (e.target as HTMLImageElement).src = '/src/assets/images/hero_dukkana_market_1791352449347.jpg';
                        }}
                      />
                      <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-md font-bold">
                        معاينة الواجهة
                      </span>
                    </div>
                  )}

                  <label className="border-2 border-dashed border-zinc-200 hover:border-purple-500 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition bg-zinc-50 hover:bg-white">
                    <Upload className="w-5 h-5 text-purple-600 mb-1" />
                    <span className="font-bold text-zinc-800">اختر صورة من جهازك لرفعها</span>
                    <span className="text-[10px] text-zinc-400">تتم معالجة الصورة تلقائياً بأبعاد وجودة عالية</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBannerImageUpload}
                      className="hidden"
                    />
                  </label>

                  <div>
                    <label className="block text-[11px] text-zinc-500 mb-1">أو أدخل مسار / رابط الصورة مباشرة:</label>
                    <input
                      type="text"
                      value={bannerImageUrl}
                      onChange={e => setBannerImageUrl(e.target.value)}
                      placeholder="/src/assets/images/... أو رابط URL"
                      dir="ltr"
                      className="w-full px-3 py-1.5 border border-zinc-200 rounded-xl text-[11px] font-mono text-zinc-700 focus:ring-2 focus:ring-purple-600/30"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">القسم المرتبط عند النقر</label>
                <select
                  value={bannerCategorySlug}
                  onChange={e => setBannerCategorySlug(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl bg-white focus:ring-2 focus:ring-purple-600/30 cursor-pointer"
                >
                  <option value="all">كافة المنتجات (عام)</option>
                  {categories.filter(c => c.slug !== 'all').map(c => (
                    <option key={c.id} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="bannerActiveCheck"
                  checked={bannerIsActive}
                  onChange={e => setBannerIsActive(e.target.checked)}
                  className="rounded text-purple-700 focus:ring-purple-600 cursor-pointer"
                />
                <label htmlFor="bannerActiveCheck" className="font-bold text-zinc-800 cursor-pointer">
                  الصورة نشطة وتظهر للزبائن في الصفحة الرئيسية
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsBannerModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-zinc-600 hover:bg-zinc-100 font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold cursor-pointer shadow-xs transition"
                >
                  {editingBanner ? 'حفظ التعديلات' : 'إضافة الصورة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Broadcast Notification Modal (Admin Exclusive) */}
      {isBroadcastModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 border border-zinc-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-zinc-900">إرسال إشعار عام للمشتركين</h3>
                  <span className="text-[11px] text-zinc-400">يصل الإشعار لجميع حسابات دكانة المحددة فوراً</span>
                </div>
              </div>
              <button
                onClick={() => setIsBroadcastModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {broadcastSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl mb-4 font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{broadcastSuccessMsg}</span>
              </div>
            )}

            {broadcastErrorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl mb-4 font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{broadcastErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSendBroadcast} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-zinc-700 mb-1">الجمهور المستهدف *</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'all', label: 'كافة المشتركين' },
                    { id: 'customers', label: 'الزبائن فقط' },
                    { id: 'merchants', label: 'التجار فقط' },
                  ].map(tgt => (
                    <button
                      key={tgt.id}
                      type="button"
                      onClick={() => setBroadcastTarget(tgt.id as any)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold transition border cursor-pointer ${
                        broadcastTarget === tgt.id
                          ? 'bg-purple-900 text-white border-purple-900 shadow-xs'
                          : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'
                      }`}
                    >
                      {tgt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">عنوان الإشعار *</label>
                <input
                  type="text"
                  required
                  value={broadcastTitle}
                  onChange={e => setBroadcastTitle(e.target.value)}
                  placeholder="مثال: عروض نهاية الأسبوع الحصرية في سوق دكانة!"
                  className="w-full px-3 py-2.5 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-purple-600/30 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">نص ومحتوى الإشعار *</label>
                <textarea
                  required
                  rows={4}
                  value={broadcastMessage}
                  onChange={e => setBroadcastMessage(e.target.value)}
                  placeholder="اكتب رسالة الإشعار التوضيحية هنا، ستصل مباشرة لمركز إشعارات المستخدمين..."
                  className="w-full px-3 py-2.5 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-purple-600/30"
                />
              </div>

              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-[11px] text-zinc-500 leading-relaxed">
                📢 ملاحظة: الإشعار يرسل من جهة إدارة دكانة الرسمية ويتم تسجيله في قاعدة البيانات لضمان وصوله لجميع المستخدمين عند فتحهم التطبيق.
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsBroadcastModalOpen(false)}
                  disabled={isSendingBroadcast}
                  className="px-4 py-2 rounded-xl text-zinc-600 hover:bg-zinc-100 font-bold cursor-pointer disabled:opacity-50"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSendingBroadcast}
                  className="px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-black cursor-pointer shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSendingBroadcast ? (
                    <>
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                      <span>جاري الإرسال...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>إرسال الإشعار الآن</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Story Modal: Add / Publish New Admin Story */}
      {showAddStoryModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 border border-zinc-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-black text-zinc-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-700" />
                <span>إضافة ستوري إعلاني جديد</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddStoryModal(false)}
                className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {storyFormError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl mb-4 font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{storyFormError}</span>
              </div>
            )}

            <form onSubmit={handleSaveStory} className="space-y-4 text-xs">
              {/* 1. حقل عنوان الستوري (title) */}
              <div>
                <label className="block font-bold text-zinc-700 mb-1">عنوان الستوري (title) *</label>
                <input
                  type="text"
                  required
                  value={storyTitle}
                  onChange={e => setStoryTitle(e.target.value)}
                  placeholder="مثال: عسل سدر فاخر، تمور خستاوي، عروض الأسبوع..."
                  className="w-full px-3 py-2.5 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-purple-600/30 font-bold"
                />
              </div>

              {/* 2. حقل رابط أو رفع الصورة (imageUrl) */}
              <div>
                <label className="block font-bold text-zinc-700 mb-1">رابط أو رفع الصورة (imageUrl) *</label>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-zinc-100 border border-zinc-200 shrink-0 p-0.5">
                      <img
                        src={storyImageUrl || '/src/assets/images/hero_dukkana_market_1791352449347.jpg'}
                        alt="معاينة الستوري"
                        className="w-full h-full object-cover rounded-full"
                      />
                    </div>
                    <label className="flex-1 border-2 border-dashed border-purple-300 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer hover:bg-purple-50/50 transition">
                      <Upload className="w-4 h-4 text-purple-600 mb-1" />
                      <span className="font-bold text-purple-800 text-[11px]">رفع صورة من جهازك (مضغوطة تلقائياً)</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleStoryImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <div>
                    <input
                      type="text"
                      value={storyImageUrl}
                      onChange={e => setStoryImageUrl(e.target.value)}
                      placeholder="أو اكتب رابط الصورة (imageUrl): https://... أو /src/assets/..."
                      dir="ltr"
                      className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-[11px] font-mono text-zinc-700 focus:ring-2 focus:ring-purple-600/30"
                    />
                  </div>
                </div>
              </div>

              {/* 3. منتقي منتجات تفاعلي ذكي (Searchable Product Picker) */}
              <div>
                <label className="block font-bold text-zinc-700 mb-1 flex items-center justify-between">
                  <span>المنتج المرتبط (productId)</span>
                  {storyLinkedProductId && (
                    <span className="text-[10px] text-purple-700 font-black flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      مرتبط بالمنتج
                    </span>
                  )}
                </label>

                {storyLinkedProductId ? (
                  (() => {
                    const selectedProduct = products.find(p => p.id === storyLinkedProductId);
                    return (
                      <div className="p-3.5 bg-gradient-to-r from-purple-50 via-purple-50/80 to-white border-2 border-purple-300 rounded-2xl flex items-center justify-between gap-3 shadow-xs animate-in fade-in">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-13 h-13 rounded-xl overflow-hidden bg-white border border-purple-200 shrink-0 shadow-2xs">
                            <img
                              src={selectedProduct?.imageUrl || '/src/assets/images/hero_dukkana_market_1791352449347.jpg'}
                              alt={selectedProduct?.name || 'منتج مختار'}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-black bg-purple-700 text-white px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
                                <Check className="w-3 h-3" />
                                تم اختيار المنتج
                              </span>
                              <h4 className="text-xs font-black text-zinc-900 truncate">
                                {selectedProduct?.name || storyLinkedProductId}
                              </h4>
                            </div>
                            <div className="text-[11px] text-zinc-500 flex items-center gap-2 mt-1">
                              <span className="text-purple-800 font-black">
                                {selectedProduct ? formatIQDTabular(selectedProduct.finalPrice) : ''}
                              </span>
                              {selectedProduct?.storeName && (
                                <span className="text-zinc-400 font-medium truncate">· {selectedProduct.storeName}</span>
                              )}
                            </div>

                            {/* زر سريع لنسخ صورة المنتج للستوري إذا كانت مختلفة */}
                            {selectedProduct && storyImageUrl !== selectedProduct.imageUrl && (
                              <button
                                type="button"
                                onClick={() => setStoryImageUrl(selectedProduct.imageUrl)}
                                className="mt-1.5 text-[10px] text-purple-700 hover:text-purple-900 font-bold underline cursor-pointer block"
                              >
                                استخدم صورة هذا المنتج كغلاف للستوري
                              </button>
                            )}
                          </div>
                        </div>

                        {/* زر إزالة المنتج المختار (Selected Chip Remove Button ✕) */}
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => setStoryLinkedProductId('')}
                            className="px-3 py-1.5 rounded-xl bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 hover:text-rose-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                            title="إلغاء التحديد وتغيير المنتج"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>تغيير / إلغاء</span>
                          </button>
                          <span className="text-[9px] text-zinc-400 font-medium">انقر لاختيار منتج آخر</span>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="space-y-2">
                    {/* 1. حقل بحث فوري: للبحث السريع باسم المنتج أو المتجر */}
                    <div className="relative">
                      <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-purple-600 pointer-events-none" />
                      <input
                        type="text"
                        value={storyProductSearchQuery}
                        onChange={e => setStoryProductSearchQuery(e.target.value)}
                        placeholder="ابحث باسم المنتج أو المتجر لربطه بالستوري..."
                        className="w-full pr-9 pl-8 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-600/30 text-xs text-zinc-900 font-medium"
                      />
                      {storyProductSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setStoryProductSearchQuery('')}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-1 cursor-pointer"
                          title="مسح البحث"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* 2. قائمة نتائج مصغرة: عرض نتائج البحث في قائمة أنيقة بالصور المصغرة */}
                    <div className="max-h-52 overflow-y-auto no-scrollbar divide-y divide-zinc-100 border border-zinc-200 rounded-2xl bg-zinc-50/70 shadow-2xs">
                      {products
                        .filter(p => {
                          if (!storyProductSearchQuery.trim()) return true;
                          const q = storyProductSearchQuery.trim().toLowerCase();
                          return (
                            p.name.toLowerCase().includes(q) ||
                            (p.storeName && p.storeName.toLowerCase().includes(q)) ||
                            (p.categoryName && p.categoryName.toLowerCase().includes(q))
                          );
                        })
                        .slice(0, 15)
                        .map(p => (
                          <div
                            key={p.id}
                            onClick={() => {
                              setStoryLinkedProductId(p.id);
                              if (!storyTitle) {
                                setStoryTitle(p.name);
                              }
                              if (!storyImageUrl) {
                                setStoryImageUrl(p.imageUrl);
                              }
                            }}
                            className="p-2 sm:p-2.5 flex items-center justify-between gap-3 hover:bg-purple-100/60 transition cursor-pointer group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-11 h-11 rounded-xl overflow-hidden bg-white border border-zinc-200 shrink-0 shadow-2xs group-hover:border-purple-300">
                                <img
                                  src={p.imageUrl}
                                  alt={p.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-xs text-zinc-900 truncate group-hover:text-purple-950">
                                  {p.name}
                                </p>
                                <p className="text-[10px] text-zinc-500 truncate flex items-center gap-1.5">
                                  <span>{p.storeName}</span>
                                  {p.categoryName && <span className="text-zinc-300">·</span>}
                                  {p.categoryName && <span className="text-zinc-400">{p.categoryName}</span>}
                                </p>
                              </div>
                            </div>
                            <div className="text-left shrink-0">
                              <span className="font-black text-xs text-purple-700 block">
                                {formatIQDTabular(p.finalPrice)}
                              </span>
                              <span className="text-[10px] text-purple-600 font-bold group-hover:underline flex items-center justify-end gap-1">
                                <Plus className="w-3 h-3" />
                                اختيار
                              </span>
                            </div>
                          </div>
                        ))}

                      {products.filter(p => {
                        if (!storyProductSearchQuery.trim()) return true;
                        const q = storyProductSearchQuery.trim().toLowerCase();
                        return (
                          p.name.toLowerCase().includes(q) ||
                          (p.storeName && p.storeName.toLowerCase().includes(q)) ||
                          (p.categoryName && p.categoryName.toLowerCase().includes(q))
                        );
                      }).length === 0 && (
                        <div className="p-5 text-center text-xs text-zinc-400">
                          لا توجد منتجات مطابقة للبحث "{storyProductSearchQuery}"
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <span className="text-[10px] text-zinc-400 mt-1.5 block">
                  عند ضغط المشتري على زر "تسوّق الآن" داخل الستوري، سيتم فتح تفاصيل هذا المنتج مباشرة للشراء.
                </span>
              </div>

              {/* 4. حقل تحديد المدة الزمنية بالأيام أو الساعات (durationDays) لحساب expiresAt */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">المدة الزمنية (durationDays / لحساب expiresAt)</label>
                  <select
                    value={storyDurationDays}
                    onChange={e => setStoryDurationDays(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-purple-600/30 font-bold bg-white cursor-pointer"
                  >
                    <option value={1}>1 يوم (24 ساعة)</option>
                    <option value={3}>3 أيام (72 ساعة)</option>
                    <option value={7}>7 أيام (أسبوع)</option>
                    <option value={14}>14 يوماً (أسبوعان)</option>
                    <option value={30}>30 يوماً (شهر كامل)</option>
                  </select>
                  <span className="text-[10px] text-purple-700 mt-1 block font-medium">
                    ينتهي في: {new Date(Date.now() + (Number(storyDurationDays) || 7) * 86400000).toLocaleDateString('ar-IQ')}
                  </span>
                </div>

                <div>
                  <label className="block font-bold text-zinc-700 mb-1">نص زر الإجراء (CTA)</label>
                  <input
                    type="text"
                    value={storyCtaText}
                    onChange={e => setStoryCtaText(e.target.value)}
                    placeholder="تسوّق الآن"
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-purple-600/30 font-bold"
                  />
                  <span className="text-[10px] text-zinc-400 mt-1 block">
                    يظهر على الزر داخل الستوري
                  </span>
                </div>
              </div>

              {/* 5. زر تأكيد الحفظ: يرسل طلب POST /api/admin/stories ثم يُغلق النافذة ويحدّث القائمة */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowAddStoryModal(false)}
                  disabled={isSubmittingStory}
                  className="px-4 py-2 rounded-xl text-zinc-600 hover:bg-zinc-100 font-bold cursor-pointer disabled:opacity-50"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingStory}
                  className="px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-black cursor-pointer shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmittingStory ? (
                    <>
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                      <span>جاري الحفظ...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>تأكيد وحفظ الستوري</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
