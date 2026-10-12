import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  Paperclip,
  ExternalLink,
  ShieldAlert,
  Check,
  CheckCheck,
  MessageSquare,
  Store,
  User as UserIcon,
  ChevronRight,
  ArrowRight,
  Smile,
  Clock,
  Sparkles,
  Ban,
  MoreVertical,
  Volume2,
  VolumeX,
  Flag,
  AlertCircle,
  MapPin,
  Calendar,
  Star,
  ShieldCheck,
  CheckCircle2,
  Phone,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useMarket } from '../context/MarketContext';
import { Conversation, ChatMessage, Product, UserRole } from '../types';
import { INITIAL_USERS } from '../data/initialData';
import { formatIQDTabular } from '../utils/currency';
import { playChimeSound } from '../utils/audioAlert';
import { formatPresence, reportUserActivity, fetchUsersPresence } from '../utils/presence';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialConversationId?: string;
  initialRecipientId?: string;
  initialRecipientRole?: UserRole;
  initialRecipientName?: string;
  initialProductId?: string;
  initialOrderId?: string;
  onSelectProduct?: (product: Product) => void;
  onBackToHome?: () => void;
  onOpenStore?: (merchantId: string) => void;
}

const QUICK_EMOJIS = ['👍', '❤️', '📦', '🙏', '😊', '🤝', '✨', '🔥', '🛒', '📍', '✅', '💬'];

export const REPORT_REASONS = [
  'احتيال أو نصب',
  'كلام بذيء أو إساءة',
  'بيع بضاعة ممنوعة',
  'سبب آخر',
] as const;
export type ReportReasonType = typeof REPORT_REASONS[number];

export const ChatModal: React.FC<ChatModalProps> = ({
  isOpen,
  onClose,
  initialConversationId,
  initialRecipientId,
  initialRecipientRole,
  initialRecipientName,
  initialProductId,
  initialOrderId,
  onSelectProduct,
  onBackToHome,
  onOpenStore,
}) => {
  const { currentUser, role, users } = useAuth();
  const { products, merchants } = useMarket();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [presenceMap, setPresenceMap] = useState<Record<string, number>>({});
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [mediaUrlInput, setMediaUrlInput] = useState('');
  const [isAttachingMedia, setIsAttachingMedia] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [attachedProductId, setAttachedProductId] = useState<string | null>(initialProductId || null);

  // UGC Compliance: Reporting state
  const [isReporting, setIsReporting] = useState(false);
  const [selectedReportReason, setSelectedReportReason] = useState<ReportReasonType>('احتيال أو نصب');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSuccess, setReportSuccess] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // UGC Compliance: Real Functional Blocking state
  const [blockedUsers, setBlockedUsers] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('dukkana_blocked_users_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Interactive Counterpart Profile Preview States
  const [isProfilePreviewOpen, setIsProfilePreviewOpen] = useState(false);
  const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false);
  const [isBlockConfirmOpen, setIsBlockConfirmOpen] = useState(false);
  const [blockToast, setBlockToast] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeChatIdRef = useRef<string | null>(null);
  const hasInitializedRef = useRef(false);

  // Safe handler to select conversation without race conditions or message leakage
  const handleSelectConversation = (c: Conversation) => {
    if (activeConversation?.id === c.id) return;
    activeChatIdRef.current = c.id;
    // 1. Immediately reset messages and form inputs to prevent flash/leak from previous chat
    setMessages([]);
    setInputText('');
    setMediaUrlInput('');
    setIsAttachingMedia(false);
    setAttachedProductId(null);
    setIsProfilePreviewOpen(false);
    setIsOptionsMenuOpen(false);
    setIsBlockConfirmOpen(false);
    setBlockToast(null);
    setActiveConversation(c);
  };

  // Reset modal state on open/close
  useEffect(() => {
    if (!isOpen) {
      hasInitializedRef.current = false;
      activeChatIdRef.current = null;
      setActiveConversation(null);
      setMessages([]);
      setIsProfilePreviewOpen(false);
      setIsOptionsMenuOpen(false);
      setIsBlockConfirmOpen(false);
      setBlockToast(null);
    }
  }, [isOpen]);

  // Load conversations for current user with presence enrichment
  const loadConversations = async () => {
    if (!currentUser) return;
    try {
      reportUserActivity(currentUser.id, currentUser.phone);
      const res = await fetch(`/api/chat/conversations?userId=${currentUser.id}`);
      if (res.ok) {
        const data = await res.json();
        const convList: Conversation[] = data.conversations || [];
        setConversations(convList);

        // Populate real-time presence timestamps for all counterparts
        const pMap: Record<string, number> = {};
        for (const c of convList) {
          const cpInfo = getCounterpartInfo(c);
          const cpActive = (c as any).counterpart_last_active || (c as any).counterpartLastActive;
          if (cpInfo.id && typeof cpActive === 'number') {
            pMap[cpInfo.id] = cpActive;
          }
        }
        setPresenceMap(prev => ({ ...prev, ...pMap }));
      }
    } catch (err) {
      console.warn('Error loading conversations:', err);
    }
  };

  useEffect(() => {
    if (isOpen && currentUser) {
      loadConversations();
    }
  }, [isOpen, currentUser]);

  // Handle initial conversation or target recipient opening (Runs once per modal open)
  useEffect(() => {
    if (!isOpen || !currentUser || hasInitializedRef.current) return;

    if (initialConversationId) {
      hasInitializedRef.current = true;
      const target = conversations.find(c => c.id === initialConversationId);
      if (target) {
        handleSelectConversation(target);
      } else {
        fetch(`/api/chat/conversations?userId=${currentUser.id}`)
          .then(res => res.json())
          .then(data => {
            if (data.conversations) {
              setConversations(data.conversations);
              const found = data.conversations.find((c: any) => c.id === initialConversationId);
              if (found) {
                handleSelectConversation(found);
              }
            }
          })
          .catch(() => {});
      }
    } else if (initialRecipientId) {
      hasInitializedRef.current = true;
      async function initTargetChat() {
        try {
          const res = await fetch('/api/chat/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              participant1Id: currentUser!.id,
              participant2Id: initialRecipientId,
              participant1Name: currentUser!.displayName,
              participant2Name: initialRecipientName,
              participant1Role: role || 'customer',
              participant2Role: initialRecipientRole || 'merchant',
              entityType: initialProductId ? 'product' : initialOrderId ? 'order' : 'general',
              entityId: initialProductId || initialOrderId,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            if (data.conversation) {
              handleSelectConversation(data.conversation);
              if (initialProductId) setAttachedProductId(initialProductId);
              loadConversations();
            }
          }
        } catch (err) {
          console.warn('Error initializing target chat:', err);
        }
      }
      initTargetChat();
    }
  }, [isOpen, currentUser, initialConversationId, initialRecipientId]);

  // Load messages strictly for the targeted active conversation with race-condition guard
  const loadMessagesForChat = async (targetConvId: string) => {
    if (!targetConvId || !currentUser) return;
    try {
      const res = await fetch(
        `/api/chat/messages/${targetConvId}?userId=${currentUser.id}`
      );
      if (res.ok) {
        const data = await res.json();
        // Strict guard: Discard response if user has already switched to another conversation
        if (activeChatIdRef.current === targetConvId) {
          const raw = (data.messages || []) as ChatMessage[];
          // UGC Compliance: Strictly filter out any incoming messages from blocked users
          const cleanMsgs = raw.filter(m => {
            const sender = m.sender_id || m.senderId;
            return !sender || !blockedUsers.includes(sender);
          });
          setMessages(cleanMsgs);
          if (data.counterpartId && typeof data.counterpartLastActive === 'number') {
            setPresenceMap(prev => ({
              ...prev,
              [data.counterpartId]: data.counterpartLastActive,
            }));
          }
        }
      }
    } catch (err) {
      console.warn('Error loading messages:', err);
    }
  };

  useEffect(() => {
    if (!activeConversation) {
      activeChatIdRef.current = null;
      setMessages([]);
      return;
    }

    const currentId = activeConversation.id;
    activeChatIdRef.current = currentId;

    loadMessagesForChat(currentId);
    const interval = setInterval(() => {
      loadMessagesForChat(currentId);
    }, 3000);

    return () => clearInterval(interval);
  }, [activeConversation?.id, currentUser?.id]);

  // Live dynamic presence updater: poll counterpart presence every 8s while chat is open
  useEffect(() => {
    if (!activeConversation) return;
    const counterpart = getCounterpartInfo(activeConversation);
    if (!counterpart.id) return;

    const refreshCounterpartPresence = async () => {
      try {
        const pData = await fetchUsersPresence([counterpart.id]);
        if (pData[counterpart.id]) {
          setPresenceMap(prev => ({
            ...prev,
            [counterpart.id]: pData[counterpart.id].lastActiveTimestamp,
          }));
        }
      } catch {}
    };

    refreshCounterpartPresence();
    const presenceInterval = setInterval(refreshCounterpartPresence, 8000);
    return () => clearInterval(presenceInterval);
  }, [activeConversation?.id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConversation || !currentUser) return;
    if (isCounterpartBlocked) return;
    if (!inputText.trim() && !mediaUrlInput.trim() && !attachedProductId) return;

    const sendingText = inputText.trim();
    setIsSending(true);
    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: activeConversation.id,
          senderId: currentUser.id,
          senderRole: role || 'customer',
          text: sendingText,
          mediaUrl: mediaUrlInput.trim() || undefined,
          mediaType: mediaUrlInput.trim() ? (mediaUrlInput.endsWith('.mp4') ? 'video' : 'image') : undefined,
          productId: attachedProductId || undefined,
        }),
      });

      if (res.ok) {
        setInputText('');
        setMediaUrlInput('');
        setIsAttachingMedia(false);
        setShowEmojiPicker(false);
        setAttachedProductId(null);
        await loadMessagesForChat(activeConversation.id);
        reportUserActivity(currentUser.id, currentUser.phone);
        loadConversations();
      }
    } catch (err) {
      console.warn('Error sending message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleInsertEmoji = (emoji: string) => {
    setInputText(prev => prev + emoji);
    inputRef.current?.focus();
  };

  const handleReportAbuse = async () => {
    if (!activeConversation || !currentUser) return;
    setIsSubmittingReport(true);
    try {
      const res = await fetch('/api/chat/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: activeConversation.id,
          reporterId: currentUser.id,
          reason: selectedReportReason,
          details: reportDetails.trim() || undefined,
        }),
      });
      if (res.ok) {
        setReportSuccess('تم استلام بلاغك وسيقوم فريق الدعم بمراجعته');
        setTimeout(() => {
          setIsReporting(false);
          setSelectedReportReason('احتيال أو نصب');
          setReportDetails('');
          setReportSuccess('');
        }, 2000);
      }
    } catch (err) {
      console.warn('Error reporting chat:', err);
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleBlockUser = async () => {
    if (!activeCounterpart?.id || !currentUser) return;
    const targetId = activeCounterpart.id;
    try {
      // 1. Immediately update State & LocalStorage
      setBlockedUsers(prev => {
        const next = Array.from(new Set([...prev, targetId]));
        localStorage.setItem('dukkana_blocked_users_v1', JSON.stringify(next));
        return next;
      });

      // 2. Call backend API
      const res = await fetch('/api/chat/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          blockedUserId: targetId,
          action: 'block',
        }),
      });
      if (res.ok) {
        setBlockToast('تم حظر المستخدم بنجاح. لن تتمكن من مراسلته.');
      }
    } catch {
      setBlockToast('حدث خطأ أثناء تنفيذ الحظر.');
    } finally {
      setTimeout(() => {
        setBlockToast(null);
        setIsBlockConfirmOpen(false);
        setIsProfilePreviewOpen(false);
      }, 1500);
    }
  };

  const handleUnblockUser = async () => {
    if (!activeCounterpart?.id || !currentUser) return;
    const targetId = activeCounterpart.id;
    try {
      setBlockedUsers(prev => {
        const next = prev.filter(id => id !== targetId && id !== (activeCounterpart as any).phone);
        localStorage.setItem('dukkana_blocked_users_v1', JSON.stringify(next));
        return next;
      });

      await fetch('/api/chat/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          blockedUserId: targetId,
          action: 'unblock',
        }),
      });
    } catch (err) {
      console.warn('Error unblocking user:', err);
    }
  };

  // Close active conversation and exit to HomeView
  const handleExitToHome = () => {
    setActiveConversation(null);
    if (onBackToHome) {
      onBackToHome();
    }
    onClose();
    try {
      const homeBtn =
        document.querySelector<HTMLButtonElement>('button[aria-label*="الصفحة الرئيسية"]') ||
        document.querySelector<HTMLButtonElement>('button[aria-label*="الرئيسية"]');
      if (homeBtn) {
        homeBtn.click();
      } else {
        window.dispatchEvent(new CustomEvent('dukkana-navigate-home'));
      }
    } catch {}
  };

  // Helper: Get identity of counterpart in a conversation
  const getCounterpartInfo = (c: Conversation) => {
    const isP1Me = c.participant1_id === currentUser?.id || c.participant1Id === currentUser?.id;
    const counterpartId = isP1Me
      ? c.participant2_id || c.participant2Id
      : c.participant1_id || c.participant1Id;
    const rawName = isP1Me
      ? c.participant2_name || c.participant2Name
      : c.participant1_name || c.participant1Name;
    const rawAvatar = isP1Me
      ? c.participant2_avatar || c.participant2Avatar
      : c.participant1_avatar || c.participant1Avatar;
    const counterpartRole = isP1Me
      ? c.participant2_role || c.participant2Role
      : c.participant1_role || c.participant1Role;

    // 1. Check if counterpart is Admin
    if (counterpartId === 'usr_admin' || counterpartRole === 'admin' || counterpartId === '07862214922' || counterpartId === '+9647862214922') {
      return {
        id: 'usr_admin',
        name: 'إدارة منصة دكانة',
        avatar: undefined,
        role: 'admin' as UserRole,
        governorate: 'بغداد، العراق',
        joinedDate: 'كانون الثاني 2024',
        phone: '+964 786 221 4922',
        isVerified: true,
        description: 'فريق الإدارة والدعم الفني المعتمد رسمياً لمنصة دكانة للتجارة الإلكترونية في العراق.',
      };
    }

    // 2. Check if counterpart matches a registered merchant in MarketContext
    const matchMerchant = merchants.find(
      m => m.id === counterpartId || m.userId === counterpartId || m.phone === counterpartId
    );
    if (matchMerchant) {
      const merchantProductsCount = products.filter(
        p => p.merchantId === matchMerchant.id && p.approvalStatus === 'approved'
      ).length;
      return {
        id: matchMerchant.id || counterpartId || '',
        name: matchMerchant.storeName,
        avatar: matchMerchant.logoUrl || (matchMerchant.images && matchMerchant.images[0]) || rawAvatar,
        role: 'merchant' as UserRole,
        governorate: matchMerchant.governorate || 'بغداد',
        joinedDate: matchMerchant.createdAt
          ? new Date(matchMerchant.createdAt).toLocaleDateString('ar-IQ', { year: 'numeric', month: 'long' })
          : 'آذار 2024',
        phone: matchMerchant.phone,
        isVerified: true,
        rating: matchMerchant.rating || 4.9,
        reviewsCount: matchMerchant.reviewsCount || 42,
        storeId: matchMerchant.id,
        description: matchMerchant.description || 'متجر معتمد وموثق في منصة دكانة مع التوصيل لجميع المحافظات العراقية.',
        totalProducts: merchantProductsCount,
      };
    }

    // 3. Check registered users in AuthContext
    const matchUserInContext = users?.find(
      u => u.id === counterpartId || u.phone === counterpartId || (u.merchantStoreId && u.merchantStoreId === counterpartId)
    );
    if (matchUserInContext && matchUserInContext.displayName && matchUserInContext.displayName !== 'مستخدم دكانة') {
      const userMerchant = merchants.find(m => m.id === matchUserInContext.merchantStoreId || m.userId === matchUserInContext.id);
      const isUserMerchant = matchUserInContext.role === 'merchant' || !!userMerchant;
      const mProductsCount = userMerchant ? products.filter(p => p.merchantId === userMerchant.id && p.approvalStatus === 'approved').length : 0;

      return {
        id: matchUserInContext.id || counterpartId || '',
        name: isUserMerchant && userMerchant ? userMerchant.storeName : matchUserInContext.displayName,
        avatar: (isUserMerchant && userMerchant ? (userMerchant.logoUrl || userMerchant.images?.[0]) : undefined) || matchUserInContext.avatarUrl || rawAvatar,
        role: (isUserMerchant ? 'merchant' : matchUserInContext.role || counterpartRole || 'customer') as UserRole,
        governorate: (userMerchant ? userMerchant.governorate : matchUserInContext.governorate) || 'بغداد',
        joinedDate: (matchUserInContext as any).createdAt
          ? new Date((matchUserInContext as any).createdAt).toLocaleDateString('ar-IQ', { year: 'numeric', month: 'long' })
          : 'نيسان 2024',
        phone: matchUserInContext.phone,
        isVerified: true,
        rating: userMerchant ? (userMerchant.rating || 4.9) : undefined,
        reviewsCount: userMerchant ? (userMerchant.reviewsCount || 36) : undefined,
        storeId: userMerchant ? userMerchant.id : undefined,
        description: userMerchant?.description || (isUserMerchant ? 'متجر معتمد في منصة دكانة' : 'زبون موثق في منصة دكانة'),
        totalProducts: mProductsCount,
      };
    }

    // 4. Check INITIAL_USERS
    const matchUser = INITIAL_USERS.find(
      u => u.id === counterpartId || u.phone === counterpartId
    );
    if (matchUser && matchUser.displayName && matchUser.displayName !== 'مستخدم دكانة') {
      const userMerchant = merchants.find(m => m.id === matchUser.merchantStoreId || m.userId === matchUser.id);
      const isUserMerchant = matchUser.role === 'merchant' || !!userMerchant;
      const mProductsCount = userMerchant ? products.filter(p => p.merchantId === userMerchant.id && p.approvalStatus === 'approved').length : 0;

      return {
        id: matchUser.id || counterpartId || '',
        name: isUserMerchant && userMerchant ? userMerchant.storeName : matchUser.displayName,
        avatar: (isUserMerchant && userMerchant ? (userMerchant.logoUrl || userMerchant.images?.[0]) : undefined) || matchUser.avatarUrl || rawAvatar,
        role: (isUserMerchant ? 'merchant' : matchUser.role || counterpartRole || 'customer') as UserRole,
        governorate: (userMerchant ? userMerchant.governorate : matchUser.governorate) || 'بغداد',
        joinedDate: 'أيار 2024',
        phone: matchUser.phone,
        isVerified: true,
        rating: userMerchant ? (userMerchant.rating || 4.9) : undefined,
        reviewsCount: userMerchant ? (userMerchant.reviewsCount || 28) : undefined,
        storeId: userMerchant ? userMerchant.id : undefined,
        description: userMerchant?.description || (isUserMerchant ? 'متجر معتمد وموثق في دكانة' : 'زبون موثق في منصة دكانة'),
        totalProducts: mProductsCount,
      };
    }

    // 5. Check if rawName is valid and not generic fallback
    const validRawName = rawName && rawName !== 'مستخدم دكانة' ? rawName : '';

    const resolvedName =
      validRawName ||
      (counterpartRole === 'merchant'
        ? 'متجر معتمد'
        : counterpartId && (counterpartId.startsWith('07') || counterpartId.startsWith('+964'))
        ? counterpartId
        : 'زبون دكانة');

    return {
      id: counterpartId || '',
      name: resolvedName,
      avatar: rawAvatar,
      role: (counterpartRole || 'customer') as UserRole,
      governorate: 'العراق',
      joinedDate: '2024',
      phone: counterpartId && (counterpartId.startsWith('07') || counterpartId.startsWith('+964')) ? counterpartId : undefined,
      isVerified: false,
      description: counterpartRole === 'merchant' ? 'متجر معتمد في منصة دكانة' : 'زبون في منصة دكانة',
    };
  };

  const renderRoleBadge = (r?: string) => {
    if (r === 'admin') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 text-[10px] font-bold border border-purple-200">
          <ShieldAlert className="w-2.5 h-2.5 text-purple-700" />
          <span>إدارة المنصة</span>
        </span>
      );
    }
    if (r === 'merchant') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-200/70">
          <Store className="w-2.5 h-2.5 text-indigo-600" />
          <span>تاجر معتمد</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200/70">
        <UserIcon className="w-2.5 h-2.5 text-emerald-600" />
        <span>زبون</span>
      </span>
    );
  };

  const renderAvatar = (name: string, avatarUrl?: string, r?: string, size = 'w-10 h-10', isOnline?: boolean) => {
    return (
      <div className={`relative ${size} shrink-0`}>
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            className="w-full h-full rounded-2xl object-cover border border-zinc-200/80 shadow-xs"
          />
        ) : (
          <div
            className={`w-full h-full rounded-2xl flex items-center justify-center font-black text-xs shadow-xs ${
              r === 'admin'
                ? 'bg-gradient-to-br from-purple-800 to-zinc-950 text-amber-300'
                : r === 'merchant'
                ? 'bg-gradient-to-br from-indigo-600 to-purple-700 text-white'
                : 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white'
            }`}
          >
            {r === 'admin' ? 'د' : r === 'merchant' ? <Store className="w-4 h-4" /> : name.charAt(0) || <UserIcon className="w-4 h-4" />}
          </div>
        )}
        {isOnline && (
          <span
            className="absolute -bottom-0.5 -left-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow-xs z-10"
            title="متصل الآن"
          />
        )}
      </div>
    );
  };

  // Requirement 5: Read Receipts
  // Single gray tick (✓) = Sent
  // Double gray ticks (✓✓) = Delivered
  // Double blue ticks (✓✓) = Read
  const renderMessageStatus = (m: ChatMessage) => {
    const isRead = Boolean(m.is_read || m.isRead || m.status === 'read');
    const isDelivered = m.status === 'delivered';

    if (isRead) {
      return (
        <span className="flex items-center gap-0.5 text-sky-300" title="تمت القراءة (Seen / Read)">
          <CheckCheck className="w-3.5 h-3.5 stroke-[2.5]" />
        </span>
      );
    }

    if (isDelivered) {
      return (
        <span className="flex items-center gap-0.5 text-purple-200" title="تم التسليم (Delivered)">
          <CheckCheck className="w-3.5 h-3.5 stroke-[2]" />
        </span>
      );
    }

    return (
      <span className="flex items-center gap-0.5 text-purple-200/80" title="تم الإرسال (Sent)">
        <Check className="w-3.5 h-3.5 stroke-[2]" />
      </span>
    );
  };

  if (!isOpen) return null;

  const attachedProduct = products.find(p => p.id === attachedProductId);
  const activeCounterpart = activeConversation ? getCounterpartInfo(activeConversation) : null;
  const isCounterpartBlocked = Boolean(
    activeCounterpart?.id && (
      blockedUsers.includes(activeCounterpart.id) ||
      ((activeCounterpart as any).phone && blockedUsers.includes((activeCounterpart as any).phone))
    )
  );
  const activeCounterpartTimestamp = activeCounterpart?.id
    ? presenceMap[activeCounterpart.id] ?? (activeConversation as any)?.counterpart_last_active
    : null;
  const activePresence = formatPresence(activeCounterpartTimestamp);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl w-full max-w-4xl h-[88vh] max-h-[720px] shadow-2xl border border-zinc-200 flex overflow-hidden flex-col md:flex-row text-xs"
        dir="rtl"
      >
        {/* Left Side: Conversations List (Hidden on mobile if chat is open) */}
        <div
          className={`w-full md:w-80 border-l border-zinc-200 flex flex-col bg-zinc-50/80 shrink-0 ${
            activeConversation ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Header with Exit to Home button */}
          <div className="p-3.5 px-4 border-b border-zinc-200 bg-white flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-black text-sm text-zinc-900 truncate">المحادثات</h3>
                <p className="text-[10px] text-zinc-400">تواصل مباشر وآمن</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleExitToHome}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-900 rounded-xl font-bold text-xs transition cursor-pointer border border-purple-200 shrink-0 shadow-2xs hover:shadow-xs active:scale-95"
              title="إغلاق المحادثات والرجوع إلى الصفحة الرئيسية"
            >
              <ArrowRight className="w-3.5 h-3.5 text-purple-700" />
              <span>الرئيسية</span>
            </button>
          </div>

          {/* Conversations Items */}
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 p-2 space-y-1">
            {conversations.length === 0 ? (
              <div className="p-8 text-center text-zinc-400 space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto text-zinc-400">
                  <MessageSquare className="w-6 h-6 stroke-[1.5]" />
                </div>
                <p className="font-bold text-zinc-600">لا توجد محادثات نشطة</p>
                <p className="text-[11px] text-zinc-400">
                  يمكنك بدء محادثة مع أي تاجر من صفحة المنتج أو المتجر مباشرة
                </p>
              </div>
            ) : (
              conversations.map(c => {
                const isSelected = activeConversation?.id === c.id;
                const counterpart = getCounterpartInfo(c);
                const isMeP1 = c.participant1_id === currentUser?.id;
                const unreadCount = isMeP1 ? (c.unread_count_p1 || 0) : (c.unread_count_p2 || 0);
                const cpTimestamp = counterpart.id
                  ? presenceMap[counterpart.id] ?? (c as any).counterpart_last_active
                  : null;
                const cpPresence = formatPresence(cpTimestamp);

                return (
                  <button
                    key={c.id}
                    onClick={() => handleSelectConversation(c)}
                    className={`w-full p-3 rounded-2xl text-right transition cursor-pointer flex items-start gap-3 border ${
                      isSelected
                        ? 'bg-purple-50/80 border-purple-200 shadow-xs'
                        : 'bg-white hover:bg-zinc-100/70 border-zinc-100'
                    }`}
                  >
                    {renderAvatar(counterpart.name, counterpart.avatar, counterpart.role, 'w-10 h-10', cpPresence.isOnline)}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="font-bold text-zinc-900 truncate text-xs">
                          {counterpart.name}
                        </h4>
                        <span className="text-[10px] text-zinc-400 shrink-0">
                          {new Date(c.last_message_time || c.lastMessageTime || Date.now()).toLocaleTimeString('ar-IQ', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-1">
                        <p className="text-zinc-500 truncate text-[11px] flex-1">
                          {c.last_message_text || 'لا توجد رسائل'}
                        </p>
                        {unreadCount > 0 && (
                          <span className="w-4 h-4 rounded-full bg-purple-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                            {unreadCount}
                          </span>
                        )}
                      </div>

                      <div className="mt-1.5 flex items-center justify-between gap-1">
                        {renderRoleBadge(counterpart.role)}
                        {cpPresence.isOnline ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-bold shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            متصل الآن
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-zinc-400 truncate max-w-[130px] shrink-0" title={cpPresence.label}>
                            <Clock className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate">{cpPresence.label}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Active Chat Thread */}
        <div className={`flex-1 flex flex-col bg-white ${!activeConversation ? 'hidden md:flex' : 'flex'}`}>
          {activeConversation && activeCounterpart ? (
            <>
              {/* Modern Chat Top Bar */}
              <div className="p-3 px-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50/90 gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Exit & Return to Home button */}
                  <button
                    type="button"
                    onClick={handleExitToHome}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-900 rounded-xl font-bold text-xs transition cursor-pointer border border-purple-200 shrink-0 shadow-2xs hover:shadow-xs active:scale-95"
                    title="إغلاق المحادثة والرجوع مباشرة إلى الصفحة الرئيسية"
                  >
                    <ArrowRight className="w-3.5 h-3.5 text-purple-700" />
                    <span className="hidden sm:inline">الرئيسية</span>
                  </button>

                  {/* Back to conversations list (Mobile only) */}
                  <button
                    type="button"
                    onClick={() => setActiveConversation(null)}
                    className="md:hidden p-1.5 text-zinc-500 hover:text-zinc-800 rounded-lg hover:bg-zinc-200/60 transition cursor-pointer shrink-0"
                    title="الرجوع لقائمة المحادثات"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  {/* Clickable Counterpart Avatar & Identity to open Profile / Store */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsOptionsMenuOpen(false);
                      if (activeCounterpart.role === 'merchant' && (activeCounterpart as any).storeId && onOpenStore) {
                        onOpenStore((activeCounterpart as any).storeId);
                      } else {
                        setIsProfilePreviewOpen(true);
                      }
                    }}
                    className="flex items-center gap-3 min-w-0 text-right p-1 -m-1 rounded-2xl hover:bg-zinc-200/50 transition cursor-pointer group focus:outline-none"
                    title={
                      activeCounterpart.role === 'merchant' && (activeCounterpart as any).storeId
                        ? 'انقر لفتح متجر التاجر وتصفح المنتجات والتقييمات مباشرة'
                        : 'انقر لعرض الملف الشخصي الكامل'
                    }
                  >
                    {renderAvatar(
                      activeCounterpart.name,
                      activeCounterpart.avatar,
                      activeCounterpart.role,
                      'w-9 h-9',
                      activePresence.isOnline
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-black text-xs text-zinc-900 group-hover:text-purple-700 transition truncate">
                          {activeCounterpart.name}
                        </h3>
                        {renderRoleBadge(activeCounterpart.role)}
                      </div>
                      {activePresence.isOnline ? (
                        <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          متصل الآن
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-500 font-medium flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-zinc-400 shrink-0" />
                          <span>{activePresence.label}</span>
                        </span>
                      )}
                    </div>
                  </button>
                </div>

                <div className="flex items-center gap-1 shrink-0 relative">
                  {/* Three Dots More Options Dropdown (⋮) */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsOptionsMenuOpen(prev => !prev)}
                      className={`p-2 rounded-xl transition cursor-pointer ${
                        isOptionsMenuOpen ? 'bg-purple-100 text-purple-800' : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100'
                      }`}
                      title="خيارات إضافية"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {isOptionsMenuOpen && (
                      <div
                        className="absolute left-0 top-full mt-1.5 w-52 bg-white rounded-2xl shadow-xl border border-zinc-200 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-150"
                        dir="rtl"
                      >
                        {/* Requirement 1: View Profile Option */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsOptionsMenuOpen(false);
                            setIsProfilePreviewOpen(true);
                          }}
                          className="w-full px-3.5 py-2.5 text-right text-xs font-bold text-zinc-800 hover:bg-purple-50 hover:text-purple-900 flex items-center gap-2.5 cursor-pointer transition"
                        >
                          <UserIcon className="w-4 h-4 text-purple-700 shrink-0" />
                          <span>👤 عرض الملف الشخصي</span>
                        </button>

                        {/* Browse Merchant Store if counterpart is merchant */}
                        {activeCounterpart.role === 'merchant' && (activeCounterpart as any).storeId && onOpenStore && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsOptionsMenuOpen(false);
                              onOpenStore((activeCounterpart as any).storeId);
                            }}
                            className="w-full px-3.5 py-2.5 text-right text-xs font-bold text-zinc-800 hover:bg-indigo-50 hover:text-indigo-900 flex items-center gap-2.5 cursor-pointer transition"
                          >
                            <Store className="w-4 h-4 text-indigo-600 shrink-0" />
                            <span>تصفح منتجات المتجر</span>
                          </button>
                        )}

                        <div className="border-t border-zinc-100 my-1"></div>

                        {/* Report Option */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsOptionsMenuOpen(false);
                            setIsReporting(true);
                          }}
                          className="w-full px-3.5 py-2.5 text-right text-xs font-bold text-amber-800 hover:bg-amber-50 flex items-center gap-2.5 cursor-pointer transition"
                        >
                          <Flag className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>إبلاغ عن مخالفة</span>
                        </button>

                        {/* Block / Unblock Option */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsOptionsMenuOpen(false);
                            if (isCounterpartBlocked) {
                              handleUnblockUser();
                            } else {
                              setIsBlockConfirmOpen(true);
                            }
                          }}
                          className={`w-full px-3.5 py-2.5 text-right text-xs font-bold flex items-center gap-2.5 cursor-pointer transition ${
                            isCounterpartBlocked
                              ? 'text-emerald-700 hover:bg-emerald-50'
                              : 'text-rose-600 hover:bg-rose-50'
                          }`}
                        >
                          <Ban className="w-4 h-4 shrink-0" />
                          <span>{isCounterpartBlocked ? 'إلغاء حظر المستخدم' : 'حظر المستخدم'}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsReporting(true)}
                    className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                    title="الإبلاغ عن إساءة استخدام"
                  >
                    <ShieldAlert className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleExitToHome}
                    className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-xl transition cursor-pointer"
                    title="إغلاق المحادثة والرجوع إلى الصفحة الرئيسية"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-zinc-50/50 to-zinc-100/30">
                {messages.length === 0 ? (
                  <div className="p-8 text-center text-zinc-400 space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <p className="font-bold text-zinc-700">ابدأ المحادثة الآن</p>
                    <p className="text-[11px] text-zinc-400 max-w-xs mx-auto">
                      يمكنك الاستفسار عن تفاصيل المنتج، توفر الكميات، والتوصيل السريع لجميع محافظات العراق.
                    </p>
                  </div>
                ) : (
                  messages.map(m => {
                    const isMe = m.sender_id === currentUser?.id || m.senderId === currentUser?.id;
                    const prod = m.product_id ? products.find(p => p.id === m.product_id) : null;
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[82%] sm:max-w-[70%] rounded-2xl p-3.5 space-y-2.5 shadow-2xs ${
                            isMe
                              ? 'bg-purple-700 text-white rounded-bl-xs'
                              : 'bg-white border border-zinc-200 text-zinc-900 rounded-br-xs'
                          }`}
                        >
                          {/* Attached Product Card Preview */}
                          {prod && (
                            <div
                              onClick={() => onSelectProduct && onSelectProduct(prod)}
                              className={`p-2.5 rounded-xl flex items-center gap-2.5 cursor-pointer transition ${
                                isMe
                                  ? 'bg-white/15 hover:bg-white/25 text-white'
                                  : 'bg-zinc-50 hover:bg-zinc-100 border border-zinc-100 text-zinc-900'
                              }`}
                            >
                              <img
                                src={prod.imageUrl}
                                alt={prod.name}
                                className="w-12 h-12 rounded-lg object-cover border border-white/20 shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <h5 className="font-bold text-[11px] truncate">{prod.name}</h5>
                                <span className={`font-black text-xs ${isMe ? 'text-amber-200' : 'text-purple-700'}`}>
                                  {formatIQDTabular(prod.finalPrice)}
                                </span>
                              </div>
                              <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-80" />
                            </div>
                          )}

                          {/* Media (Image / Video) */}
                          {m.media_url && (
                            <div className="rounded-xl overflow-hidden max-w-xs border border-black/10">
                              {m.media_type === 'video' || m.media_url.endsWith('.mp4') ? (
                                <video src={m.media_url} controls className="w-full max-h-56 object-cover" />
                              ) : (
                                <img src={m.media_url} alt="مرفق" className="w-full max-h-56 object-cover" />
                              )}
                            </div>
                          )}

                          {/* Text */}
                          {m.text && (
                            <p className="leading-relaxed text-xs whitespace-pre-wrap select-text">
                              {m.text}
                            </p>
                          )}

                          {/* Time & Read Receipts Status (Requirement 5) */}
                          <div
                            className={`flex items-center gap-1.5 justify-end text-[10px] ${
                              isMe ? 'text-purple-200' : 'text-zinc-400'
                            }`}
                          >
                            <span>
                              {new Date(m.created_at || m.createdAt || Date.now()).toLocaleTimeString('ar-IQ', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {isMe && renderMessageStatus(m)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Product Attachment Tag if active */}
              {attachedProduct && (
                <div className="p-2.5 px-4 bg-purple-50 border-t border-purple-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <img src={attachedProduct.imageUrl} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                    <span className="font-bold text-purple-900 text-[11px] truncate">
                      مرفق بالرسالة: {attachedProduct.name} ({formatIQDTabular(attachedProduct.finalPrice)})
                    </span>
                  </div>
                  <button
                    onClick={() => setAttachedProductId(null)}
                    className="p-1 text-zinc-400 hover:text-zinc-700 cursor-pointer rounded-lg hover:bg-purple-100/50"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Media URL Input Drawer */}
              {isAttachingMedia && (
                <div className="p-3 bg-zinc-50 border-t border-zinc-200 flex items-center gap-2 animate-in fade-in">
                  <input
                    type="url"
                    value={mediaUrlInput}
                    onChange={e => setMediaUrlInput(e.target.value)}
                    placeholder="ضع رابط الصورة أو الفيديو المباشر (https://...)"
                    className="flex-1 px-3 py-2 border border-zinc-200 rounded-xl text-xs bg-white focus:outline-hidden focus:border-purple-600"
                  />
                  <button
                    type="button"
                    onClick={() => setIsAttachingMedia(false)}
                    className="px-3 py-2 text-zinc-500 hover:bg-zinc-200 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              )}

              {/* Input Form or Blocked Notice */}
              {isCounterpartBlocked ? (
                <div className="p-4 bg-rose-50 border-t border-rose-200 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in">
                  <div className="flex items-center gap-2.5 text-rose-800 text-xs font-bold text-center sm:text-right">
                    <Ban className="w-5 h-5 text-rose-600 shrink-0" />
                    <span>لقد قمت بحظر هذا المستخدم، لا يمكنك إرسال أو استقبال الرسائل معه.</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleUnblockUser}
                    className="px-4 py-2 bg-white hover:bg-rose-100 text-rose-700 hover:text-rose-900 border border-rose-300 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs hover:shadow-xs active:scale-95 shrink-0"
                  >
                    إلغاء الحظر
                  </button>
                </div>
              ) : (
                <>
                  {/* Quick Emojis Bar (Requirement 4) */}
                  <div className="px-3 py-1.5 bg-zinc-50/80 border-t border-zinc-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                    <span className="text-[10px] text-zinc-400 font-bold shrink-0 ml-1">تفاعل سريع:</span>
                    {QUICK_EMOJIS.map(em => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => handleInsertEmoji(em)}
                        className="w-7 h-7 rounded-lg hover:bg-zinc-200/80 flex items-center justify-center text-sm transition cursor-pointer shrink-0 active:scale-90"
                        title={`إدراج ${em}`}
                      >
                        {em}
                      </button>
                    ))}
                  </div>

                  {/* Message Input Form */}
                  <form onSubmit={handleSendMessage} className="p-3 border-t border-zinc-200 bg-white flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAttachingMedia(!isAttachingMedia)}
                      className={`p-2.5 rounded-xl transition cursor-pointer ${
                        isAttachingMedia ? 'bg-purple-100 text-purple-700' : 'hover:bg-zinc-100 text-zinc-500'
                      }`}
                      title="إرفاق رابط صورة أو فيديو"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>

                    <input
                      ref={inputRef}
                      type="text"
                      value={inputText}
                      onChange={e => setInputText(e.target.value)}
                      placeholder="اكتب رسالتك هنا..."
                      className="flex-1 px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-2xl text-xs focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600 focus:bg-white transition"
                    />

                    <button
                      type="submit"
                      disabled={isSending || (!inputText.trim() && !mediaUrlInput.trim() && !attachedProductId)}
                      className="p-2.5 px-4 rounded-2xl bg-purple-700 text-white hover:bg-purple-800 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1.5 font-bold cursor-pointer shadow-xs active:scale-95"
                    >
                      <span>إرسال</span>
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col">
              <div className="p-3 px-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <span className="text-zinc-500 font-medium text-xs">منصة محادثات دكانة</span>
                <button
                  type="button"
                  onClick={handleExitToHome}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-900 rounded-xl font-bold text-xs transition cursor-pointer border border-purple-200 shadow-2xs hover:shadow-xs active:scale-95"
                  title="إغلاق المحادثات والرجوع إلى الصفحة الرئيسية"
                >
                  <ArrowRight className="w-4 h-4 text-purple-700" />
                  <span>الرئيسية</span>
                </button>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-400 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <MessageSquare className="w-7 h-7" />
                </div>
                <h4 className="font-bold text-zinc-800 text-sm">اختر محادثة من القائمة</h4>
                <p className="text-xs max-w-xs text-zinc-500">
                  تواصل مع تجار دكانة واستفسر عن المنتجات والأسعار والتوصيل مباشرة وبكل سهولة
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* UGC Compliance: Abuse Report Modal */}
      {isReporting && (
        <div className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 text-xs animate-in zoom-in-95 duration-150" dir="rtl">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h4 className="font-black text-sm text-zinc-900 flex items-center gap-2">
                <Flag className="w-5 h-5 text-amber-600" />
                <span>إبلاغ عن مخالفة</span>
              </h4>
              <button
                type="button"
                onClick={() => {
                  setIsReporting(false);
                  setReportSuccess('');
                }}
                className="p-1 text-zinc-400 hover:text-zinc-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-zinc-500 text-[11px] leading-relaxed">
              يرجى اختيار سبب المخالفة وسيتم مراجعتها فوراً من قبل فريق الدعم وفق سياسات الاستخدام العادل.
            </p>

            {/* Reasons List */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-zinc-700">سبب المخالفة:</label>
              {REPORT_REASONS.map(reason => (
                <label
                  key={reason}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                    selectedReportReason === reason
                      ? 'bg-purple-50 border-purple-300 text-purple-900 font-bold'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  <input
                    type="radio"
                    name="reportReasonOption"
                    value={reason}
                    checked={selectedReportReason === reason}
                    onChange={() => setSelectedReportReason(reason)}
                    className="accent-purple-700"
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>

            {/* Optional Details */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-zinc-700">تفاصيل إضافية (اختياري):</label>
              <textarea
                value={reportDetails}
                onChange={e => setReportDetails(e.target.value)}
                rows={3}
                placeholder="اكتب أي ملاحظات أو تفاصيل تفيد فريق المراجعة..."
                className="w-full p-3 border border-zinc-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-600/30 bg-zinc-50 focus:bg-white resize-none"
              />
            </div>

            {reportSuccess && (
              <div className="text-emerald-800 font-bold bg-emerald-50 p-3 rounded-xl border border-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{reportSuccess}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => {
                  setIsReporting(false);
                  setReportSuccess('');
                }}
                disabled={isSubmittingReport}
                className="px-4 py-2 border rounded-xl text-zinc-600 hover:bg-zinc-50 cursor-pointer font-bold"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleReportAbuse}
                disabled={isSubmittingReport || Boolean(reportSuccess)}
                className="px-4 py-2 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 disabled:opacity-50 cursor-pointer transition shadow-xs flex items-center gap-1.5"
              >
                {isSubmittingReport ? (
                  <span>جارٍ الإرسال...</span>
                ) : (
                  <>
                    <Flag className="w-3.5 h-3.5" />
                    <span>إرسال البلاغ</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Requirement 2: Interactive Counterpart Profile Preview Modal */}
      {isProfilePreviewOpen && activeCounterpart && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div
            className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-zinc-200 overflow-hidden text-xs flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
            dir="rtl"
          >
            {/* Modal Header */}
            <div className="p-3.5 px-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/80">
              <div className="flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-purple-700" />
                <span className="font-black text-sm text-zinc-900">الملف الشخصي</span>
              </div>
              <button
                type="button"
                onClick={() => setIsProfilePreviewOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 rounded-xl transition cursor-pointer"
                title="الرجوع إلى المحادثة"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Card Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
              {/* Banner & Avatar Block */}
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-3">
                  {renderAvatar(
                    activeCounterpart.name,
                    activeCounterpart.avatar,
                    activeCounterpart.role,
                    'w-20 h-20 text-xl',
                    activePresence.isOnline
                  )}
                  {((activeCounterpart as any).isVerified || activeCounterpart.role === 'admin' || activeCounterpart.role === 'merchant') && (
                    <span
                      className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-xs border-2 border-white"
                      title="حساب موثق"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>

                <h3 className="text-base sm:text-lg font-black text-zinc-900 flex items-center gap-1.5">
                  <span>{activeCounterpart.name}</span>
                </h3>

                <div className="mt-1 flex items-center gap-2 flex-wrap justify-center">
                  {renderRoleBadge(activeCounterpart.role)}

                  {activePresence.isOnline ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      متصل الآن
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500 bg-zinc-100 px-2.5 py-0.5 rounded-full border border-zinc-200">
                      <Clock className="w-3 h-3 text-zinc-400" />
                      <span>{activePresence.label}</span>
                    </span>
                  )}
                </div>

                {/* Description / Bio */}
                {Boolean((activeCounterpart as any).description) && (
                  <p className="mt-3 text-zinc-600 text-xs max-w-sm leading-relaxed bg-zinc-50 p-3 rounded-2xl border border-zinc-100">
                    {(activeCounterpart as any).description}
                  </p>
                )}
              </div>

              {/* User Metadata Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* Governorate / City */}
                <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200/80 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] text-zinc-400 block font-medium">المحافظة / المدينة</span>
                    <span className="font-bold text-zinc-900 text-xs truncate block">
                      {(activeCounterpart as any).governorate || 'العراق'}
                    </span>
                  </div>
                </div>

                {/* Joined Date */}
                <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200/80 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 border border-purple-200">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] text-zinc-400 block font-medium">تاريخ الانضمام</span>
                    <span className="font-bold text-zinc-900 text-xs truncate block">
                      {(activeCounterpart as any).joinedDate || '2024'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Merchant / Supplier Specific Block */}
              {activeCounterpart.role === 'merchant' && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/70 to-purple-50/60 border border-indigo-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                      <span className="font-black text-zinc-900 text-xs">
                        {(activeCounterpart as any).rating || 4.9} من 5
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        ({(activeCounterpart as any).reviewsCount || 42} تقييم موثق)
                      </span>
                    </div>

                    <span className="text-[10px] font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-full border border-indigo-200 shadow-2xs">
                      {(activeCounterpart as any).totalProducts || 0} منتج متوفر
                    </span>
                  </div>

                  {/* Browse Products Button */}
                  {(activeCounterpart as any).storeId && onOpenStore && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfilePreviewOpen(false);
                        onOpenStore((activeCounterpart as any).storeId);
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-xs active:scale-98"
                    >
                      <Store className="w-4 h-4" />
                      <span>تصفح منتجات المتجر</span>
                    </button>
                  )}
                </div>
              )}

              {/* Quick Actions (متابعة المحادثة، حظر، إبلاغ) */}
              <div className="pt-2 border-t border-zinc-100 space-y-2">
                {/* Continue Chat Button (Primary Action - preserves chat context) */}
                <button
                  type="button"
                  onClick={() => setIsProfilePreviewOpen(false)}
                  className="w-full py-2.5 px-4 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-xs active:scale-98"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>متابعة المحادثة</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfilePreviewOpen(false);
                      setIsReporting(true);
                    }}
                    className="py-2 px-3 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Flag className="w-3.5 h-3.5 text-amber-600" />
                    <span>إبلاغ عن الحساب</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsProfilePreviewOpen(false);
                      setIsBlockConfirmOpen(true);
                    }}
                    className="py-2 px-3 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-600 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>حظر المستخدم</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Block Confirmation Modal */}
      {isBlockConfirmOpen && activeCounterpart && (
        <div className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 text-xs" dir="rtl">
            <h4 className="font-black text-sm text-zinc-900 flex items-center gap-2">
              <Ban className="w-5 h-5 text-rose-600" />
              <span>تأكيد حظر المستخدم</span>
            </h4>
            <p className="text-zinc-500 text-[11px] leading-relaxed">
              هل أنت متأكد من رغبتك في حظر <strong>{activeCounterpart.name}</strong>؟ لن يتمكن من إرسال رسائل جديدة إليك.
            </p>
            {blockToast && (
              <p className="text-emerald-700 font-bold bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                {blockToast}
              </p>
            )}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsBlockConfirmOpen(false)}
                className="px-4 py-2 border rounded-xl text-zinc-600 hover:bg-zinc-50 cursor-pointer font-bold"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleBlockUser}
                className="px-4 py-2 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 cursor-pointer transition shadow-xs"
              >
                تأكيد الحظر
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
