import React, { useState, useEffect } from 'react';
import {
  Bell,
  X,
  CheckCheck,
  Package,
  MessageSquare,
  Sparkles,
  Info,
  Clock,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NotificationItem {
  id: string;
  recipient_id: string;
  recipient_role?: string;
  title: string;
  message: string;
  type: 'order' | 'chat' | 'product_approval' | 'promotion' | 'system' | 'broadcast';
  entity_id?: string;
  is_read: boolean;
  is_broadcast?: boolean;
  created_at: string;
}

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenChat?: (convId?: string) => void;
  onNavigateOrders?: () => void;
  onNavigateCategories?: () => void;
  onRefreshUnreadCount?: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  onOpenChat,
  onNavigateOrders,
  onNavigateCategories,
  onRefreshUnreadCount,
}) => {
  const { currentUser, role } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'order' | 'chat' | 'product_approval' | 'system'>('all');

  const fetchNotifications = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications?userId=${currentUser.id}&role=${role || 'customer'}`);
      if (res.ok) {
        const data = await res.json();
        const rawList = data.notifications || [];
        // Deduplicate broadcast notifications to ensure single clean notification per user
        const seen = new Set<string>();
        const cleanList: NotificationItem[] = [];
        for (const item of rawList) {
          const dedupKey = item.type === 'broadcast' || item.is_broadcast
            ? (item.entity_id ? `bcast_${item.entity_id}` : `bcast_${item.title}_${item.message}`)
            : item.id;
          if (!seen.has(dedupKey)) {
            seen.add(dedupKey);
            cleanList.push(item);
          }
        }
        setNotifications(cleanList);
      }
    } catch {
      // Ignore network errors in polling
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && currentUser) {
      fetchNotifications();
    }
  }, [isOpen, currentUser]);

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PUT' });
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
      );
      if (onRefreshUnreadCount) onRefreshUnreadCount();
    } catch {}
  };

  const markAllAsRead = async () => {
    if (!currentUser) return;
    try {
      await fetch(`/api/notifications/read-all`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      if (onRefreshUnreadCount) onRefreshUnreadCount();
    } catch {}
  };

  const handleNotificationClick = (notif: NotificationItem) => {
    if (!notif.is_read) {
      markAsRead(notif.id);
    }

    if (notif.type === 'chat' && onOpenChat) {
      onOpenChat(notif.entity_id);
    } else if (notif.type === 'order' && onNavigateOrders) {
      onNavigateOrders();
    } else if (notif.type === 'product_approval' && onNavigateCategories) {
      onNavigateCategories();
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSecs < 60) return 'الآن';
      if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
      if (diffHours < 24) return `منذ ${diffHours} ساعة`;
      if (diffDays === 1) return 'أمس';
      if (diffDays < 7) return `منذ ${diffDays} أيام`;
      return date.toLocaleDateString('ar-IQ');
    } catch {
      return '';
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'order':
        return <Package className="w-4 h-4 text-emerald-600" />;
      case 'chat':
        return <MessageSquare className="w-4 h-4 text-purple-600" />;
      case 'product_approval':
        return <Sparkles className="w-4 h-4 text-amber-500" />;
      case 'broadcast':
        return <Bell className="w-4 h-4 text-purple-600" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  if (!isOpen) return null;

  const filteredNotifs = notifications.filter(n => {
    if (filter === 'all') return true;
    return n.type === filter;
  });

  const unreadTotal = notifications.filter(n => !n.is_read).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh] overflow-hidden border border-zinc-100"
        dir="rtl"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center relative">
              <Bell className="w-5 h-5" />
              {unreadTotal > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-rose-600 border-2 border-white animate-pulse" />
              )}
            </div>
            <div>
              <h2 className="text-base font-black text-zinc-900">الإشعارات والتنبيهات</h2>
              <p className="text-xs text-zinc-500">
                {unreadTotal > 0
                  ? `لديك ${unreadTotal} إشعار غير مقروء`
                  : 'جميع الإشعارات محدثة ومقروءة'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadTotal > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs font-bold text-purple-700 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="تحديد الكل كمقروء"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>تحديد الكل كمقروء</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters Tabs */}
        <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-zinc-100 bg-white overflow-x-auto text-xs no-scrollbar">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
              filter === 'all'
                ? 'bg-zinc-900 text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            الكل ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('order')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1 ${
              filter === 'order'
                ? 'bg-emerald-600 text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>الطلبات</span>
          </button>
          <button
            onClick={() => setFilter('chat')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1 ${
              filter === 'chat'
                ? 'bg-purple-600 text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>المحادثات</span>
          </button>
          <button
            onClick={() => setFilter('product_approval')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1 ${
              filter === 'product_approval'
                ? 'bg-amber-600 text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>المنتجات</span>
          </button>
          <button
            onClick={() => setFilter('system')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1 ${
              filter === 'system'
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>النظام</span>
          </button>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-zinc-50">
          {loading && notifications.length === 0 ? (
            <div className="py-12 text-center text-zinc-400 space-y-2">
              <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs">جارِ تحميل الإشعارات...</p>
            </div>
          ) : filteredNotifs.length === 0 ? (
            <div className="py-12 text-center text-zinc-400 space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400">
                <Bell className="w-6 h-6 stroke-[1.5]" />
              </div>
              <p className="text-xs font-bold text-zinc-600">لا توجد إشعارات حالياً</p>
              <p className="text-[11px] text-zinc-400 max-w-xs mx-auto">
                ستصلك هنا تنبيهات فورية عند وصول رسالة جديدة أو تحديث حالة طلبك أو اعتماد منتجاتك.
              </p>
            </div>
          ) : (
            filteredNotifs.map(n => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`pt-2.5 first:pt-0 p-3 rounded-2xl transition cursor-pointer flex items-start gap-3 border ${
                  !n.is_read
                    ? 'bg-purple-50/60 border-purple-200/70 hover:bg-purple-100/60'
                    : 'bg-white border-zinc-100 hover:bg-zinc-50'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    !n.is_read ? 'bg-white shadow-xs' : 'bg-zinc-100'
                  }`}
                >
                  {getIconForType(n.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4
                      className={`text-xs font-bold truncate ${
                        !n.is_read ? 'text-zinc-900 font-black' : 'text-zinc-700'
                      }`}
                    >
                      {n.title}
                    </h4>
                    <span className="text-[10px] text-zinc-400 flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3" />
                      {formatRelativeTime(n.created_at)}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-600 mt-1 leading-relaxed line-clamp-2">
                    {n.message}
                  </p>

                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    <span className="text-purple-700 font-semibold flex items-center gap-1">
                      <span>عرض التفاصيل</span>
                      <ExternalLink className="w-3 h-3" />
                    </span>

                    {!n.is_read && (
                      <span className="w-2 h-2 rounded-full bg-purple-600 ring-4 ring-purple-100" />
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-zinc-50 border-t border-zinc-100 text-center">
          <p className="text-[11px] text-zinc-500">
            تطبيق دكانة — الإشعارات والتحديثات المباشرة لجميع محافظات العراق
          </p>
        </div>
      </div>
    </div>
  );
};
