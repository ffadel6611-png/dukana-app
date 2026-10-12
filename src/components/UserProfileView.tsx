import React, { useState, useEffect, useRef } from 'react';
import {
  User as UserIcon,
  Phone,
  MapPin,
  Plus,
  Trash2,
  LogOut,
  ShieldCheck,
  AlertTriangle,
  FileText,
  HelpCircle,
  Camera,
  Laptop,
  Smartphone,
  Tablet,
  CheckCircle2,
  RefreshCw,
  Lock,
  Globe,
  Clock,
  Sparkles,
  ShieldAlert,
  Ban,
  X,
  Heart,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useMarket } from '../context/MarketContext';
import { IRAQI_GOVERNORATES } from '../data/governorates';
import { IraqiGovernorate, ActiveSession } from '../types';

interface UserProfileViewProps {
  onOpenCompliance: (tab?: 'privacy' | 'terms' | 'merchant_terms' | 'prohibited' | 'delete_account' | 'store_readiness') => void;
  onOpenSupport: () => void;
  onOpenAuth?: () => void;
  onNavigateHome?: () => void;
  onOpenSplash?: () => void;
  onDeleteAccount?: (reason?: string) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
  onNavigateWishlist?: () => void;
  onNavigateOrders?: () => void;
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({
  onOpenCompliance,
  onOpenSupport,
  onOpenAuth,
  onNavigateHome,
  onOpenSplash,
  onDeleteAccount,
  onNavigateWishlist,
  onNavigateOrders,
}) => {
  const {
    currentUser,
    users,
    logout,
    deleteAccount,
    addAddress,
    removeAddress,
    updateDisplayName,
    updateAvatarUrl,
    fetchActiveSessions,
    terminateSession,
    terminateOtherSessions,
    terminateAllSessions,
  } = useAuth();
  const { orders, merchants, wishlist } = useMarket();

  // UGC Compliance: Blocked Users State
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('dukkana_blocked_users_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [blockedToast, setBlockedToast] = useState<string | null>(null);

  // Sessions confirmation modal
  const [isTerminateSessionsModalOpen, setIsTerminateSessionsModalOpen] = useState(false);

  // Logout confirmation state
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  // Delete Account State (Apple & Google compliance)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteToast, setDeleteToast] = useState<string | null>(null);

  // Avatar upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarToast, setAvatarToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Address state
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [newGov, setNewGov] = useState<IraqiGovernorate>('بغداد');
  const [newCity, setNewCity] = useState('');
  const [newLandmark, setNewLandmark] = useState('');
  const [newFullAddress, setNewFullAddress] = useState('');

  // Name editing state
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(currentUser?.displayName || '');

  // Sessions state (Requirement 2 & 3)
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [sessionToast, setSessionToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [terminatingSessionId, setTerminatingSessionId] = useState<string | null>(null);
  const [isTerminatingOthers, setIsTerminatingOthers] = useState(false);

  // Load sessions and blocked users on mount
  useEffect(() => {
    loadSessions();
    loadBlockedUsers();
  }, [currentUser?.id]);

  const loadBlockedUsers = async () => {
    if (!currentUser?.id) return;
    try {
      const res = await fetch(`/api/chat/blocked-users?userId=${currentUser.id}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.blockedUserIds)) {
          setBlockedUserIds(prev => {
            const combined = Array.from(new Set([...prev, ...data.blockedUserIds]));
            localStorage.setItem('dukkana_blocked_users_v1', JSON.stringify(combined));
            return combined;
          });
        }
      }
    } catch (err) {
      console.warn('Error loading blocked users from server:', err);
    }
  };

  const loadSessions = async () => {
    setIsLoadingSessions(true);
    try {
      const res = await fetchActiveSessions();
      if (res.success && res.sessions) {
        setSessions(res.sessions);
      }
    } catch (err) {
      console.warn('Error loading sessions:', err);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4" dir="rtl">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-200 shadow-xs">
          <UserIcon className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-zinc-900">الملف الشخصي لحسابك</h2>
        <p className="text-xs text-zinc-600 leading-relaxed">
          يرجى تسجيل الدخول للوصول إلى بيانات حسابك، عناويني، وإدارة الجلسات والأجهزة.
        </p>
        {onOpenAuth && (
          <button
            type="button"
            onClick={onOpenAuth}
            className="px-6 py-2.5 bg-purple-700 text-white font-bold rounded-xl text-xs hover:bg-purple-800 transition cursor-pointer shadow-xs"
          >
            تسجيل الدخول / إنشاء حساب
          </button>
        )}
      </div>
    );
  }

  // Handle Avatar File Upload
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setAvatarToast({ message: 'يرجى اختيار ملف صورة صالح (JPEG أو PNG أو WebP).', type: 'error' });
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setAvatarToast({ message: 'حجم الصورة كبير جداً. يرجى اختيار صورة أقل من 8 ميغابايت.', type: 'error' });
      return;
    }

    setIsUploadingAvatar(true);
    setAvatarToast(null);

    const reader = new FileReader();
    reader.onload = async event => {
      const rawBase64 = event.target?.result as string;
      try {
        // Compress image via canvas
        const img = new Image();
        img.src = rawBase64;
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          const maxDim = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
            await updateAvatarUrl(optimizedDataUrl);
            setAvatarToast({
              message: 'تم تحديث صورتك الشخصية بنجاح وحفظها في كامل المنصة!',
              type: 'success',
            });
          }
          setIsUploadingAvatar(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        };
      } catch (err) {
        setAvatarToast({ message: 'فشل معالجة الصورة، يرجى المحاولة مرة أخرى.', type: 'error' });
        setIsUploadingAvatar(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = async () => {
    if (!currentUser.avatarUrl) return;
    setIsUploadingAvatar(true);
    try {
      await updateAvatarUrl(null);
      setAvatarToast({ message: 'تمت إزالة الصورة الشخصية بنجاح.', type: 'success' });
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullAddress.trim()) return;

    addAddress({
      governorate: newGov,
      cityOrDistrict: newCity.trim() || newGov,
      nearestLandmark: newLandmark.trim(),
      fullAddress: newFullAddress.trim(),
    });

    setIsAddingAddress(false);
    setNewCity('');
    setNewLandmark('');
    setNewFullAddress('');
  };

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    updateDisplayName(nameInput);
    setIsEditingName(false);
  };

  // Terminate Single Session
  const handleTerminateSession = async (sessionId: string) => {
    setTerminatingSessionId(sessionId);
    setSessionToast(null);
    try {
      const res = await terminateSession(sessionId);
      if (res.success) {
        setSessionToast({ message: res.message, type: 'success' });
        await loadSessions();
      } else {
        setSessionToast({ message: res.message, type: 'error' });
      }
    } finally {
      setTerminatingSessionId(null);
    }
  };

  // Terminate All Other Sessions
  const handleOpenTerminateSessions = () => {
    setIsTerminateSessionsModalOpen(true);
  };

  const handleExecuteTerminateOtherSessions = async () => {
    setIsTerminatingOthers(true);
    setSessionToast(null);
    try {
      const res = await terminateOtherSessions();
      if (res.success) {
        setSessionToast({ message: res.message, type: 'success' });
        await loadSessions();
      } else {
        setSessionToast({ message: res.message, type: 'error' });
      }
    } finally {
      setIsTerminatingOthers(false);
      setIsTerminateSessionsModalOpen(false);
    }
  };

  const handleExecuteTerminateAllSessions = async () => {
    setIsTerminatingOthers(true);
    setSessionToast(null);
    try {
      const res = await terminateAllSessions();
      if (res.success) {
        setSessionToast({ message: res.message, type: 'success' });
        setIsTerminateSessionsModalOpen(false);
        if (onNavigateHome) onNavigateHome();
      } else {
        setSessionToast({ message: res.message, type: 'error' });
      }
    } finally {
      setIsTerminatingOthers(false);
    }
  };

  // UGC Compliance: Unblock user from settings
  const handleUnblockUser = async (targetId: string) => {
    const updated = blockedUserIds.filter(id => id !== targetId);
    setBlockedUserIds(updated);
    localStorage.setItem('dukkana_blocked_users_v1', JSON.stringify(updated));

    try {
      await fetch('/api/chat/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.id,
          blockedUserId: targetId,
          action: 'unblock',
        }),
      });
      setBlockedToast('تم إلغاء حظر المستخدم بنجاح وإعادة تفعيل المحادثات معه.');
      setTimeout(() => setBlockedToast(null), 2500);
    } catch (err) {
      console.warn('Failed to unblock user:', err);
    }
  };

  const getBlockedUserInfo = (id: string) => {
    const m = merchants.find(item => item.id === id || item.userId === id);
    if (m) {
      return {
        name: m.storeName,
        subtitle: `تاجر معتمد · ${m.governorate || 'العراق'}`,
        avatar: m.logoUrl || (m.images && m.images[0]),
      };
    }
    const u = users?.find(item => item.id === id || item.phone === id);
    if (u) {
      return {
        name: u.displayName || u.phone,
        subtitle: u.role === 'merchant' ? 'تاجر في دكانة' : 'زبون في دكانة',
        avatar: u.avatarUrl,
      };
    }
    return {
      name: id.startsWith('+964') || id.startsWith('07') ? id : `مستخدم (${id.slice(-6)})`,
      subtitle: 'مستخدم محظور',
      avatar: undefined,
    };
  };

  // Format Arabic relative time
  const formatArabicTime = (dateStr?: string) => {
    if (!dateStr) return 'نشط الآن';
    const d = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diffSec < 60) return 'نشط الآن';
    if (diffSec < 3600) return `منذ ${Math.floor(diffSec / 60)} دقيقة`;
    if (diffSec < 86400) return `منذ ${Math.floor(diffSec / 3600)} ساعة`;
    return `منذ ${Math.floor(diffSec / 86400)} يوم`;
  };

  const isAdmin = currentUser.role === 'admin';
  const otherSessionsCount = sessions.filter(s => !s.isCurrent).length;

  // Merchant active orders check (prevent account deletion if orders are in progress)
  const isMerchantUser = currentUser.role === 'merchant' || !!currentUser.merchantStoreId;
  const merchantStoreId = currentUser.merchantStoreId || currentUser.id;
  const merchantActiveOrders = isMerchantUser
    ? orders.filter(
        o =>
          (o.merchantId === merchantStoreId || o.merchantId === currentUser.id) &&
          o.status !== 'delivered' &&
          o.status !== 'cancelled'
      )
    : [];
  const hasActiveOrders = isMerchantUser && merchantActiveOrders.length > 0;

  const handleExecuteDeleteAccount = async () => {
    if (hasActiveOrders) {
      setDeleteToast(`حماية التاجر: لا يمكن حذف الحساب حالياً لوجود (${merchantActiveOrders.length}) طلبات نشطة أو قيد التوصيل لم تكتمل بعد. يرجى تسليم كافة الطلبات للزبائن أولاً.`);
      return;
    }
    setIsDeleting(true);
    try {
      const res = onDeleteAccount
        ? await onDeleteAccount('حذف مباشر ونهائي وفق سياسات آبل وجوجل')
        : await deleteAccount('حذف مباشر ونهائي وفق سياسات آبل وجوجل');

      if (res.success) {
        setDeleteToast(res.message);
        setTimeout(() => {
          setIsDeleteModalOpen(false);
          if (onNavigateHome) {
            onNavigateHome();
          }
        }, 1200);
      } else {
        setDeleteToast(res.message || 'فشل حذف الحساب');
        setIsDeleting(false);
      }
    } catch (err) {
      console.error('Error during delete account:', err);
      setDeleteToast('حدث خطأ غير متوقع أثناء معالجة حذف الحساب');
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* 1. Main Profile Card */}
      <div className="bg-white rounded-3xl border border-zinc-200 p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 border-b border-zinc-100 pb-6">
          <div className="flex items-center gap-4">
            {/* Avatar with Upload Badge (Requirement 1) */}
            <div className="relative group shrink-0">
              <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-3xl bg-purple-700 text-white flex items-center justify-center font-black text-3xl shadow-md shadow-purple-700/20 overflow-hidden border-2 border-purple-200">
                {currentUser.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{currentUser.displayName.charAt(0) || 'م'}</span>
                )}
              </div>

              {/* Camera Upload Overlay Trigger */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="absolute -bottom-1 -left-1 p-2 bg-purple-700 hover:bg-purple-800 text-white rounded-2xl shadow-md border-2 border-white transition transform hover:scale-105 cursor-pointer disabled:opacity-50"
                title="تعديل الصورة الشخصية"
              >
                <Camera className="w-4 h-4" />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/webp"
                onChange={handleAvatarFileChange}
                className="hidden"
              />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-zinc-900">
                  {currentUser.displayName}
                </h1>
                <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                  {isAdmin
                    ? 'المدير العام'
                    : currentUser.role === 'merchant'
                    ? 'تاجر معتمد'
                    : 'زبون دكانة'}
                </span>
                {isAdmin && (
                  <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    <span>حد 3 أجهزة</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-mono mt-1.5" dir="ltr">
                <Phone className="w-3.5 h-3.5 text-purple-700" />
                <span>{currentUser.phone}</span>
              </div>

              {/* Avatar action triggers */}
              <div className="flex items-center gap-2 mt-2.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="text-xs text-purple-700 hover:text-purple-900 font-bold hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{isUploadingAvatar ? 'جارٍ المعالجة...' : 'تغيير الصورة الشخصية'}</span>
                </button>
                {currentUser.avatarUrl && (
                  <>
                    <span className="text-zinc-300">·</span>
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      disabled={isUploadingAvatar}
                      className="text-xs text-rose-600 hover:text-rose-800 font-bold hover:underline cursor-pointer"
                    >
                      إزالة الصورة
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditingName(!isEditingName)}
              className="px-3.5 py-2 rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-50 font-bold text-xs cursor-pointer transition"
            >
              تعديل الاسم
            </button>
            <button
              type="button"
              onClick={() => setIsLogoutConfirmOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition active:scale-95"
              title="تسجيل الخروج من الحساب"
            >
              <LogOut className="w-4 h-4" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>

        {/* Avatar Toast */}
        {avatarToast && (
          <div
            className={`mt-4 p-3 rounded-2xl text-xs font-bold flex items-center gap-2 border ${
              avatarToast.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {avatarToast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span>{avatarToast.message}</span>
          </div>
        )}

        {/* Edit Name Inline Form */}
        {isEditingName && (
          <form onSubmit={handleSaveName} className="mt-4 p-4 bg-zinc-50 rounded-2xl border border-zinc-200 flex items-center gap-2">
            <input
              type="text"
              required
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              className="flex-1 px-3 py-2 text-xs border border-zinc-200 rounded-xl bg-white focus:outline-none focus:border-purple-600"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-purple-700 text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-purple-800 transition"
            >
              حفظ
            </button>
          </form>
        )}

        {/* Customer Quick Shortcuts: Wishlist & Orders */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onNavigateWishlist}
            className="p-3.5 bg-rose-50/70 hover:bg-rose-100/70 border border-rose-200/80 rounded-2xl flex items-center justify-between transition cursor-pointer text-right group shadow-2xs"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-white shadow-xs text-rose-600 flex items-center justify-center border border-rose-100">
                <Heart className="w-5 h-5 fill-rose-500 text-rose-500" />
              </div>
              <div>
                <span className="text-xs font-black text-rose-950 block">قائمة المنتجات المفضلة</span>
                <span className="text-[11px] font-bold text-rose-700">{wishlist.length} منتجات محفوظة</span>
              </div>
            </div>
            <span className="text-xs font-bold text-rose-500 group-hover:-translate-x-1 transition-transform">عرض ←</span>
          </button>

          <button
            type="button"
            onClick={onNavigateOrders}
            className="p-3.5 bg-purple-50/70 hover:bg-purple-100/70 border border-purple-200/80 rounded-2xl flex items-center justify-between transition cursor-pointer text-right group shadow-2xs"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-white shadow-xs text-purple-700 flex items-center justify-center border border-purple-100">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-black text-purple-950 block">متابعة طلباتي والشحنات</span>
                <span className="text-[11px] font-bold text-purple-700">تتبع الطلبات والدفع نقداً</span>
              </div>
            </div>
            <span className="text-xs font-bold text-purple-500 group-hover:-translate-x-1 transition-transform">عرض ←</span>
          </button>
        </div>

        {/* 2. Security & Active Sessions Section (Requirement 2 & 3) */}
        <div className="mt-8 pt-6 border-t border-zinc-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-purple-700" />
                <h2 className="text-base font-black text-zinc-900">
                  الأمان والجلسات النشطة (Active Sessions)
                </h2>
                {isAdmin ? (
                  <span className="text-[11px] font-black bg-purple-100 text-purple-900 px-2.5 py-0.5 rounded-full border border-purple-300">
                    {sessions.length} / 3 أجهزة كحد أقصى
                  </span>
                ) : (
                  <span className="text-[11px] font-bold bg-zinc-100 text-zinc-700 px-2.5 py-0.5 rounded-full">
                    {sessions.length} جلسة مفتوحة
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                {isAdmin
                  ? 'لحماية صلاحية الإدارة، يُطبق قيد برمجي صارم بحد أقصى 3 أجهزة/متصفحات فقط بالتزامن لحساب المدير.'
                  : 'يمكنك مراجعة كافة الأجهزة والمتصفحات التي فتحت حسابك منها، وإنهاء أي جلسة بسهولة.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadSessions}
                disabled={isLoadingSessions}
                className="p-2 text-zinc-500 hover:text-purple-700 bg-zinc-50 hover:bg-zinc-100 rounded-xl border border-zinc-200 cursor-pointer transition"
                title="تحديث قائمة الجلسات"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingSessions ? 'animate-spin' : ''}`} />
              </button>

              <button
                type="button"
                onClick={handleOpenTerminateSessions}
                disabled={isTerminatingOthers}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold rounded-xl border border-rose-200 flex items-center gap-1.5 cursor-pointer transition disabled:opacity-50"
                title="إنهاء جميع الجلسات المسجلة في الأجهزة والمتصفحات الأخرى"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>إنهاء جميع الجلسات</span>
              </button>
            </div>
          </div>

          {/* Admin Device Limit Banner (Requirement 3) */}
          {isAdmin && (
            <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl flex items-start gap-3">
              <Lock className="w-5 h-5 text-purple-700 shrink-0 mt-0.5" />
              <div className="text-xs text-purple-900 space-y-1">
                <div className="font-black flex items-center gap-2">
                  <span>نظام تقييد جلسات المدير (Admin 3-Device Limit)</span>
                  <span className="bg-purple-200 text-purple-900 px-2 py-0.2 rounded-md font-mono text-[11px]">
                    الحد الأقصى: 3
                  </span>
                </div>
                <p className="text-purple-800 leading-relaxed">
                  الحساب محمي أمنياً بحيث لا يمكن أن تتجاوز جلساته 3 أجهزة/متصفحات في نفس الوقت.
                  عند محاولة الدخول من جهاز رابع، يرفض النظام الدخول تلقائياً أو يتطلب إنهاء جلسة قديمة لضمان عدم تسريب صلاحيات الإدارة.
                </p>
              </div>
            </div>
          )}

          {/* Session Toast Feedback */}
          {sessionToast && (
            <div
              className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 border ${
                sessionToast.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {sessionToast.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span>{sessionToast.message}</span>
            </div>
          )}

          {/* Sessions List Cards */}
          <div className="space-y-2.5">
            {isLoadingSessions && sessions.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-400 bg-zinc-50 rounded-2xl border border-zinc-200">
                جارٍ فحص الجلسات المفتوحة...
              </div>
            ) : sessions.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-400 bg-zinc-50 rounded-2xl border border-zinc-200">
                لا توجد جلسات أخرى مفتوحة حالياً.
              </div>
            ) : (
              sessions.map(s => {
                const isMobile = s.deviceType === 'mobile';
                const isTablet = s.deviceType === 'tablet';

                return (
                  <div
                    key={s.id}
                    className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                      s.isCurrent
                        ? 'bg-purple-50/40 border-purple-300 ring-1 ring-purple-200'
                        : 'bg-zinc-50 hover:bg-zinc-100/70 border-zinc-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          s.isCurrent
                            ? 'bg-purple-700 text-white shadow-xs'
                            : 'bg-zinc-200 text-zinc-700'
                        }`}
                      >
                        {isMobile ? (
                          <Smartphone className="w-5 h-5" />
                        ) : isTablet ? (
                          <Tablet className="w-5 h-5" />
                        ) : (
                          <Laptop className="w-5 h-5" />
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-zinc-900 text-sm">
                            {s.deviceName}
                          </span>
                          {s.isCurrent && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                              <span>هذا الجهاز حالياً</span>
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-500">
                          <span className="flex items-center gap-1 font-mono">
                            <Globe className="w-3 h-3 text-zinc-400" />
                            <span>{s.location || 'العراق'}</span>
                          </span>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-zinc-400" />
                            <span>آخر نشاط: {formatArabicTime(s.lastActiveAt)}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {!s.isCurrent ? (
                        <button
                          type="button"
                          onClick={() => handleTerminateSession(s.id)}
                          disabled={terminatingSessionId === s.id}
                          className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 hover:text-rose-800 border border-zinc-200 hover:border-rose-300 rounded-xl font-bold text-xs flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>
                            {terminatingSessionId === s.id ? 'جارٍ الإنهاء...' : 'إنهاء الجلسة'}
                          </span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-emerald-700 font-bold px-2 py-1 bg-emerald-50 rounded-lg border border-emerald-200">
                          الجلسة النشطة
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 3. Saved Addresses Section */}
        <div className="mt-8 pt-6 border-t border-zinc-100 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-zinc-900 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-purple-700" />
              <span>عناوين التوصيل المسجلة ({currentUser.addresses.length})</span>
            </h2>
            <button
              onClick={() => setIsAddingAddress(!isAddingAddress)}
              className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة عنوان جديد</span>
            </button>
          </div>

          {/* Add Address Form */}
          {isAddingAddress && (
            <form onSubmit={handleSaveAddress} className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">المحافظة *</label>
                  <select
                    value={newGov}
                    onChange={e => setNewGov(e.target.value as IraqiGovernorate)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl bg-white"
                  >
                    {IRAQI_GOVERNORATES.map(g => (
                      <option key={g.id} value={g.id}>
                        {g.nameAr}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">الحي أو القضاء</label>
                  <input
                    type="text"
                    value={newCity}
                    onChange={e => setNewCity(e.target.value)}
                    placeholder="مثال: الكرادة / المنصور / المعقل"
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">أقرب نقطة دالة</label>
                <input
                  type="text"
                  value={newLandmark}
                  onChange={e => setNewLandmark(e.target.value)}
                  placeholder="مثال: قرب ساحة كهرمانة أو جامع النور"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">العنوان بالتفصيل *</label>
                <textarea
                  required
                  rows={2}
                  value={newFullAddress}
                  onChange={e => setNewFullAddress(e.target.value)}
                  placeholder="المحلة، الزقاق، الدار..."
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingAddress(false)}
                  className="px-3 py-1.5 text-zinc-500 font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl cursor-pointer"
                >
                  حفظ العنوان
                </button>
              </div>
            </form>
          )}

          {/* Addresses list */}
          <div className="space-y-2">
            {currentUser.addresses.length === 0 ? (
              <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 text-center text-xs text-zinc-400">
                لم تقم بحفظ أي عناوين توصيل مسبقة.
              </div>
            ) : (
              currentUser.addresses.map(addr => (
                <div
                  key={addr.id}
                  className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <span className="font-bold text-zinc-900 block">
                      {addr.governorate} - {addr.cityOrDistrict}
                    </span>
                    <span className="text-zinc-600 text-[11px] block mt-0.5">
                      {addr.fullAddress}
                    </span>
                    {addr.nearestLandmark && (
                      <span className="text-zinc-400 text-[10px] block">
                        نقطة دالة: {addr.nearestLandmark}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => removeAddress(addr.id)}
                    className="p-1.5 text-zinc-400 hover:text-rose-600 transition cursor-pointer"
                    title="حذف العنوان"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 4. UGC Compliance: Blocked Users Section (قائمة المستخدمين المحظورين) */}
        <div className="mt-8 pt-6 border-t border-zinc-100 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-zinc-900 flex items-center gap-1.5">
                <Ban className="w-4 h-4 text-rose-600" />
                <span>المستخدمون المحظورون ({blockedUserIds.length})</span>
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                قائمة الحسابات التي قمت بحظرها لمنع وصول أو إرسال أي رسائل معها عبر المحادثات
              </p>
            </div>
          </div>

          {blockedToast && (
            <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-2xl border border-emerald-200 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{blockedToast}</span>
            </div>
          )}

          <div className="space-y-2">
            {blockedUserIds.length === 0 ? (
              <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-200 text-center text-xs text-zinc-400">
                لا يوجد مستخدمون محظورون حالياً.
              </div>
            ) : (
              blockedUserIds.map(id => {
                const info = getBlockedUserInfo(id);
                return (
                  <div
                    key={id}
                    className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 font-bold flex items-center justify-center shrink-0 border border-rose-200 overflow-hidden">
                        {info.avatar ? (
                          <img src={info.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Ban className="w-5 h-5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-zinc-900 block truncate">{info.name}</span>
                        <span className="text-[11px] text-zinc-500 block truncate">{info.subtitle}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleUnblockUser(id)}
                      className="px-3.5 py-1.5 bg-white hover:bg-rose-50 text-rose-700 hover:text-rose-900 border border-zinc-200 hover:border-rose-300 rounded-xl font-bold text-xs cursor-pointer transition shadow-2xs shrink-0"
                    >
                      إلغاء الحظر
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 5. Quick Links & Legal Compliance Section */}
        <div className="mt-8 pt-6 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            <button
              onClick={() => onOpenCompliance('privacy')}
              className="text-purple-700 hover:text-purple-900 font-bold flex items-center gap-1 cursor-pointer transition underline"
              title="عرض سياسة الخصوصية وتأمين بيانات الهاتف العراقي"
            >
              <ShieldCheck className="w-4 h-4 text-purple-700" />
              <span>سياسة الخصوصية</span>
            </button>
            <span className="text-zinc-300">·</span>
            <button
              onClick={() => onOpenCompliance('terms')}
              className="text-purple-700 hover:text-purple-900 font-bold flex items-center gap-1 cursor-pointer transition underline"
              title="عرض شروط وأحكام استخدام سوق دُكَّانَة"
            >
              <FileText className="w-4 h-4 text-purple-700" />
              <span>شروط الاستخدام</span>
            </button>
            <span className="text-zinc-300">·</span>
            <button
              onClick={() => onOpenCompliance('merchant_terms')}
              className="text-zinc-600 hover:text-purple-700 font-semibold flex items-center gap-1 cursor-pointer transition"
              title="عرض ميثاق وشروط التجار"
            >
              <span>ميثاق التجار</span>
            </button>
            <span className="text-zinc-300">·</span>
            <button
              onClick={onOpenSupport}
              className="text-zinc-600 hover:text-purple-700 font-semibold flex items-center gap-1 cursor-pointer transition"
            >
              <HelpCircle className="w-4 h-4" />
              <span>الدعم والمساعدة</span>
            </button>
            {onOpenSplash && (
              <>
                <span className="text-zinc-300">·</span>
                <button
                  onClick={onOpenSplash}
                  className="text-purple-700 hover:text-purple-900 font-bold flex items-center gap-1 cursor-pointer transition"
                  title="عرض شاشة البداية والشعار المطور"
                >
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span>شاشة البداية والشعار</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* 5. Apple & Google App Store Mandatory Account Deletion Section */}
        <div className="mt-6 p-5 sm:p-6 bg-gradient-to-br from-rose-50/70 to-red-50/40 border border-rose-200 rounded-3xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-rose-950 text-sm flex items-center gap-2">
                  <span>حذف الحساب نهائياً</span>
                  <span className="text-[10px] font-bold bg-rose-200/80 text-rose-900 px-2 py-0.5 rounded-full">
                    شروط Apple & Google الإلزامية
                  </span>
                </h3>
                <p className="text-[11px] text-rose-700 mt-0.5">
                  حق محو كافة البيانات الشخصية والحساب المسجل فوراً وبشكل دائم
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5 shrink-0 active:scale-98"
            >
              <Trash2 className="w-4 h-4" />
              <span>🗑️ حذف الحساب نهائياً</span>
            </button>
          </div>

          <p className="text-[11px] text-zinc-600 leading-relaxed">
            وفقاً لسياسات الخصوصية ومتطلبات متجري Apple App Store و Google Play، يحق لك حذف حسابك في أي وقت. هذا الإجراء يقوم بمسح رقم هاتفك واسمك وعناوينك وجلساتك بالكامل ولا يمكن التراجع عنه.
          </p>

          {deleteToast && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{deleteToast}</span>
            </div>
          )}
        </div>

        {/* Delete Account Confirmation Modal (Apple & Google Compliant) */}
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 space-y-4 text-right animate-in zoom-in-95 duration-150" dir="rtl">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>

              <div className="text-center space-y-2">
                <h3 className="font-black text-lg text-zinc-900">
                  تأكيد حذف الحساب نهائياً
                </h3>
                <p className="text-xs text-zinc-600 leading-relaxed max-w-sm mx-auto">
                  هل أنت متأكد من رغبتك في حذف حسابك نهائياً؟ سيتم مسح بياناتك الشخصية وسجل نشاطك بالكامل ولا يمكن التراجع عن هذا الإجراء.
                </p>
              </div>

              {/* Merchant active orders check */}
              {hasActiveOrders ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-2 text-right">
                  <div className="font-bold flex items-center gap-2 text-amber-800 text-sm">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                    <span>تنبيه: لا يمكن حذف حساب التاجر حالياً</span>
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    لديك <strong>{merchantActiveOrders.length} طلبات نشطة</strong> قيد التوصيل أو المعالجة للمشترين. لحماية حقوق الزبائن والوفاء بالالتزامات، لا يمكن حذف الحساب حتى يتم تسوية وتسليم كافة الطلبات المفتوحة أولاً.
                  </p>
                </div>
              ) : (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 space-y-1 text-right">
                  <div className="font-bold text-rose-950">⚠️ الإجراءات الفورية لسياسات Apple & Google:</div>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-rose-800">
                    <li>مسح رقم الهاتف والاسم بالكامل من قواعد البيانات فوراً.</li>
                    <li>إنهاء وإلغاء جميع الجلسات المسجلة لهذا الحساب.</li>
                    <li>مسح عناوين الشحن والتفضيلات المسجلة بشكل نهائي.</li>
                  </ul>
                </div>
              )}

              {deleteToast && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{deleteToast}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  disabled={isDeleting}
                  className="px-4 py-2.5 text-zinc-600 hover:bg-zinc-100 font-bold text-xs rounded-xl cursor-pointer transition"
                >
                  إلغاء
                </button>
                {!hasActiveOrders ? (
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={handleExecuteDeleteAccount}
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl transition cursor-pointer shadow-md shadow-rose-600/20 disabled:opacity-50 active:scale-98"
                  >
                    {isDeleting ? 'جاري مسح الحساب...' : 'تأكيد الحذف نهائياً'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-xs"
                  >
                    إغلاق والتسوية أولاً
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Terminate Sessions Confirmation Dialog */}
        {isTerminateSessionsModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
            <div
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 text-right space-y-4 animate-in zoom-in-95 duration-150"
              dir="rtl"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center mx-auto border border-rose-200">
                <ShieldCheck className="w-6 h-6" />
              </div>

              <div className="text-center space-y-1.5">
                <h3 className="font-black text-base text-zinc-900">
                  إدارة وإنهاء الجلسات
                </h3>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  {sessions.length > 1
                    ? `لديك حالياً (${sessions.length}) جلسات مفتوحة على أجهزة ومتصفحات مختلفة. اختر الإجراء المناسب لتأمين حسابك:`
                    : 'لا توجد جلسات أخرى مفتوحة حالياً، هذا الجهاز هو الجلسة الوحيدة النشطة.'}
                </p>
              </div>

              <div className="space-y-2 pt-2">
                {sessions.length > 1 ? (
                  <button
                    type="button"
                    onClick={handleExecuteTerminateOtherSessions}
                    disabled={isTerminatingOthers}
                    className="w-full py-2.5 px-4 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition shadow-xs disabled:opacity-50"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>إنهاء الجلسات في الأجهزة الأخرى فقط (البقاء هنا)</span>
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={handleExecuteTerminateAllSessions}
                  disabled={isTerminatingOthers}
                  className="w-full py-2.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition disabled:opacity-50"
                >
                  <LogOut className="w-4 h-4 text-rose-600" />
                  <span>إنهاء كافة الجلسات وتسجيل الخروج من كل مكان</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsTerminateSessionsModalOpen(false)}
                  disabled={isTerminatingOthers}
                  className="w-full py-2.5 px-4 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-600 font-bold text-xs cursor-pointer transition"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Logout Confirmation Dialog */}
        {isLogoutConfirmOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
            <div
              className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-zinc-200 text-right space-y-4 animate-in zoom-in-95 duration-150"
              dir="rtl"
            >
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center mx-auto border border-purple-200">
                <LogOut className="w-6 h-6" />
              </div>

              <div className="text-center space-y-1.5">
                <h3 className="font-black text-base text-zinc-900">
                  تسجيل الخروج
                </h3>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  هل أنت متأكد من رغبتك في تسجيل الخروج من حسابك؟
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsLogoutConfirmOpen(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-bold text-xs cursor-pointer transition"
                >
                  إلغاء / البقاء
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsLogoutConfirmOpen(false);
                    logout();
                    if (onNavigateHome) onNavigateHome();
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs cursor-pointer transition shadow-xs active:scale-98"
                >
                  تسجيل الخروج
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
