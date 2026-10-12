export type IraqiGovernorate =
  | 'بغداد'
  | 'البصرة'
  | 'نينوى'
  | 'أربيل'
  | 'الأنبار'
  | 'كركوك'
  | 'النجف'
  | 'كربلاء'
  | 'بابل'
  | 'واسط'
  | 'صلاح الدين'
  | 'ديالى'
  | 'ذي قار'
  | 'ميسان'
  | 'المثنى'
  | 'القادسية'
  | 'دهوك'
  | 'السليمانية'
  | 'حلبجة';

export const ADMIN_PHONE_E164 = '+9647862214922';
export const ADMIN_PHONE_LOCAL = '07862214922';

export type UserRole = 'customer' | 'merchant' | 'admin' | 'support';

export type MerchantStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export type ProductApprovalStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export type OrderStatus =
  | 'new'              // طلب جديد
  | 'confirmed'        // تم تأكيد الطلب
  | 'preparing'        // قيد التجهيز
  | 'out_for_delivery' // خرج للتوصيل
  | 'delivered'        // تم التوصيل
  | 'cancelled';       // ملغي

export interface Address {
  id: string;
  governorate: IraqiGovernorate;
  cityOrDistrict: string;
  nearestLandmark: string;
  fullAddress: string;
  isDefault?: boolean;
}

export interface User {
  id: string;
  phone: string; // E.164: +9647XXXXXXXXX
  displayName: string;
  role: UserRole;
  governorate?: IraqiGovernorate;
  addresses: Address[];
  createdAt: string;
  status: 'active' | 'suspended' | 'deleted';
  merchantStoreId?: string;
  hasPassword?: boolean;
  avatarUrl?: string; // Profile picture for all roles (Admin, Merchant, Customer)
  lastActiveTimestamp?: number; // Real-time activity timestamp in ms
}

export interface ActiveSession {
  id: string;
  token?: string;
  userId: string;
  phone: string;
  role: UserRole;
  deviceName: string;
  browser: string;
  os: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  ipAddress?: string;
  location?: string;
  isCurrent: boolean;
  createdAt: string;
  lastActiveAt: string;
}

export interface MerchantStore {
  id: string;
  userId: string;
  storeName: string;
  description: string;
  governorate: IraqiGovernorate;
  phone: string;
  logoUrl?: string;
  coverUrl?: string;
  images?: string[];
  status: MerchantStatus;
  rejectionReason?: string;
  commissionRate: number; // e.g. 5 means 5%
  merchantType?: 'retail' | 'wholesale'; // تجزئة أو جملة وتوريد
  rating?: number;
  reviewsCount?: number;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  iconName?: string;
  displayOrder: number;
}

export interface Product {
  id: string;
  merchantId: string;
  storeName: string;
  name: string;
  description: string;
  price: number; // in IQD (الدينار العراقي)
  originalPrice?: number;
  discountPercent?: number; // e.g. 10, 30, 50
  finalPrice: number;
  categoryId: string;
  categoryName: string;
  imageUrl: string; // الصورة الرئيسية
  images?: string[]; // قائمة بكافة صور المنتج
  inStock: boolean;
  approvalStatus: ProductApprovalStatus;
  rejectionReason?: string;
  isPromoted?: boolean;
  promotedAt?: string;
  condition?: 'new' | 'used'; // 'جديد' أو 'مستعمل'
  governorate?: IraqiGovernorate;
  viewsCount?: number;
  featured?: boolean;
  stockQuantity?: number; // كمية المخزون (بالآلاف أو الملايين لبضائع الجملة)
  minWholesaleQty?: number; // الحد الأدنى لطلب الجملة
  wholesalePrice?: number; // سعر الجملة للقطعة / الكارتون
  unit?: string; // وحدة القياس: كارتون، صندوق، طن، دستة، قطعة
  tags?: string[]; // وسوم وكلمات مفتاحية محلية عراقية (Auto Tags)
  createdAt: string;
}

export interface JobVacancy {
  id: string;
  title: string;
  companyName: string;
  merchantId?: string;
  governorate: IraqiGovernorate;
  jobType: 'دوام كامل' | 'دوام جزئي' | 'عن بُعد' | 'عمل حر';
  salaryRange: string;
  description: string;
  requirements: string[];
  contactPhone: string;
  postedAt: string;
  applicantsCount?: number;
}

export interface HomeBanner {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  badgeText?: string;
  linkCategorySlug?: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface OrderItem {
  productId: string;
  productName: string;
  productImage: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
}

export interface OrderStatusHistoryItem {
  status: OrderStatus;
  timestamp: string;
  note?: string;
}

export interface Order {
  id: string; // DUK-XXXXXX
  customerId: string;
  customerName: string;
  customerPhone: string;
  recipientName: string;
  recipientPhone: string;
  governorate: IraqiGovernorate;
  detailedAddress: string;
  notes?: string;
  merchantId: string;
  storeName: string;
  items: OrderItem[];
  subtotal: number;
  discountTotal: number;
  deliveryFee: number;
  finalTotal: number;
  paymentMethod: 'cod'; // الدفع عند الاستلام فقط
  status: OrderStatus;
  statusHistory: OrderStatusHistoryItem[];
  commissionRate: number;
  commissionAmount: number; // calculated ONLY when status === 'delivered', 0 if cancelled
  appliedCoupon?: {
    code: string;
    discountAmount: number;
  };
  createdAt: string;
  deliveredAt?: string;
}

export interface PlatformCoupon {
  id: string;
  code: string; // e.g. DUKKANA10, BAGHDAD2026
  description: string;
  discountType: 'percentage' | 'fixed'; // percentage or fixed IQD
  discountValue: number; // e.g. 15 or 5000
  minOrderSubtotal: number; // in IQD
  maxDiscountCap?: number; // max IQD discount cap
  isActive: boolean;
  expiresAt?: string; // ISO date string
  usageCount: number;
  maxUsageLimit?: number;
  createdAt: string;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  orderId: string;
  productId: string;
  productName: string;
  rating: number; // 1 to 5
  comment?: string;
  createdAt: string;
  status: 'published' | 'hidden' | 'deleted';
  isVerifiedPurchase: true; // Verified COD delivered order
}

export interface ReviewReport {
  id: string;
  reviewId: string;
  reporterUserId: string;
  reporterPhone: string;
  reason: 'inappropriate' | 'spam' | 'fake' | 'harassment' | 'offensive' | 'prohibited_item';
  details: string;
  status: 'pending' | 'reviewed' | 'dismissed' | 'action_taken';
  createdAt: string;
}

export interface SupportInquiry {
  id: string;
  senderName: string;
  senderPhone: string;
  subject: string;
  message: string;
  category: 'order' | 'merchant' | 'payment' | 'general' | 'complaint';
  status: 'new' | 'in_progress' | 'resolved';
  reply?: string;
  repliedAt?: string;
  createdAt: string;
}

export interface AppSettings {
  appName: string;
  defaultCommissionRate: number; // percentage, e.g. 5
  promotionPrice: number; // in IQD (سعر الترويج المدفوع داخل التطبيق)
  supportWhatsApp: string; // e.g. +9647701234567
  supportPhone: string;
  minOrderAmount: number;
  allowMerchantRegistration: boolean;
  termsLastUpdated: string;
}

// ==========================================
// Chat Types
// ==========================================
export interface Conversation {
  id: string;
  participant1Id?: string;
  participant2Id?: string;
  participant1_id?: string;
  participant2_id?: string;
  participant1Name?: string;
  participant2Name?: string;
  participant1_name?: string;
  participant2_name?: string;
  participant1Avatar?: string;
  participant2Avatar?: string;
  participant1_avatar?: string;
  participant2_avatar?: string;
  participant1Role?: UserRole;
  participant2Role?: UserRole;
  participant1_role?: UserRole;
  participant2_role?: UserRole;
  participant1_last_active?: number;
  participant2_last_active?: number;
  counterpart_last_active?: number;
  counterpartLastActive?: number;
  entityType?: 'product' | 'order' | 'support' | 'general';
  entity_type?: 'product' | 'order' | 'support' | 'general';
  entityId?: string;
  entity_id?: string;
  lastMessageText?: string;
  last_message_text?: string;
  lastMessageTime?: string;
  last_message_time?: string;
  unreadCount?: number;
  unread_count_p1?: number;
  unread_count_p2?: number;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

export interface ChatMessage {
  id: string;
  conversationId?: string;
  conversation_id?: string;
  senderId?: string;
  sender_id?: string;
  senderName?: string;
  sender_name?: string;
  senderAvatar?: string;
  sender_avatar?: string;
  senderRole?: UserRole;
  sender_role?: UserRole;
  text?: string;
  mediaUrl?: string;
  media_url?: string;
  mediaType?: 'image' | 'video' | 'file';
  media_type?: 'image' | 'video' | 'file';
  productId?: string;
  product_id?: string;
  productPreview?: {
    id: string;
    name: string;
    image: string;
    price: number;
  };
  orderId?: string;
  order_id?: string;
  status?: 'sent' | 'delivered' | 'read';
  isRead?: boolean;
  is_read?: boolean;
  createdAt?: string;
  created_at?: string;
}

export interface ChatReport {
  id: string;
  conversationId: string;
  reporterId: string;
  reason: string;
  status: 'pending' | 'resolved';
  createdAt: string;
}

export interface BlockedUser {
  id: string;
  userId: string;
  blockedUserId: string;
  blockedUserName?: string;
  createdAt: string;
}

// ==========================================
// Notification Types
// ==========================================
export type NotificationType =
  | 'chat'
  | 'order'
  | 'product_approval'
  | 'system'
  | 'broadcast'
  | 'promo';

export interface NotificationItem {
  id: string;
  recipientId: string;
  recipientRole?: UserRole;
  title: string;
  message: string;
  type: NotificationType;
  entityId?: string;
  isRead: boolean;
  isBroadcast?: boolean;
  createdAt: string;
}

export interface BroadcastNotificationRequest {
  title: string;
  message: string;
  targetAudience: 'all' | 'customers' | 'merchants';
}

// ==========================================
// Admin Stories Types
// ==========================================
export interface AdminStory {
  id: string;
  title: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  ctaText?: string;
  ctaLink?: string;
  productId?: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  viewsCount: number;
  clicksCount: number;
  sortOrder: number;
  createdAt: string;
}

// ==========================================
// Promotion Request Types
// ==========================================
export type PromotionType = 'product' | 'store' | 'story';
export type PromotionStatus = 'pending' | 'approved' | 'rejected' | 'active' | 'completed';

export interface PromotionRequest {
  id: string;
  merchantId: string;
  merchantStoreId?: string;
  storeName?: string;
  productId?: string;
  productName?: string;
  productImage?: string;
  promoType: PromotionType;
  durationDays: number;
  priceIqd: number;
  notes?: string;
  status: PromotionStatus;
  rejectionReason?: string;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// Drafts & Commercial Promotions Types
// ==========================================
export interface ProductDraft {
  id: string;
  merchantId: string;
  name: string;
  description?: string;
  price?: number;
  originalPrice?: number;
  categoryId?: string;
  categoryName?: string;
  imageUrl?: string;
  images?: string[];
  inStock?: boolean;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AdCampaignDraft {
  id: string;
  merchantId: string;
  productId: string;
  productName: string;
  productImage?: string;
  durationDays: number;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  finalTotal: number;
  notes?: string;
  createdAt: string;
}

export interface CommercialPromotion {
  id: string;
  merchantId: string;
  storeName?: string;
  productId: string;
  productName: string;
  productImage?: string;
  durationDays: number;
  dailyRate: number; // 5000 IQD
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  finalTotal: number;
  status: 'pending_approval' | 'active' | 'rejected' | 'stopped' | 'completed';
  notes?: string;
  rejectionReason?: string;
  startDate?: string | null;
  endDate?: string | null;
  createdAt: string;
  stoppedAt?: string;
}


