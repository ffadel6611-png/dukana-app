import { relations } from 'drizzle-orm';
import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core';

// ==========================================
// 1. Users Table (Customer, Merchant, Admin)
// ==========================================
export const users = pgTable('users', {
  id: varchar('id', { length: 64 }).primaryKey(),
  phone: varchar('phone', { length: 32 }).notNull().unique(), // E.164: +9647XXXXXXXXX
  displayName: varchar('display_name', { length: 150 }).notNull(),
  role: varchar('role', { length: 20 }).notNull().default('customer'), // 'customer' | 'merchant' | 'admin'
  governorate: varchar('governorate', { length: 50 }).notNull().default('بغداد'),
  avatarUrl: text('avatar_url'), // Profile picture URL / Base64
  passwordHash: text('password_hash'),
  passwordSalt: text('password_salt'),
  status: varchar('status', { length: 20 }).notNull().default('active'), // 'active' | 'suspended' | 'deleted'
  merchantStoreId: varchar('merchant_store_id', { length: 64 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ==========================================
// 1.1 Active User Sessions Table (Security & Device Tracking)
// ==========================================
export const userSessions = pgTable('user_sessions', {
  id: varchar('id', { length: 64 }).primaryKey(),
  token: varchar('token', { length: 128 }).notNull().unique(),
  userId: varchar('user_id', { length: 64 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  phone: varchar('phone', { length: 32 }).notNull(),
  role: varchar('role', { length: 20 }).notNull().default('customer'),
  deviceName: varchar('device_name', { length: 150 }).notNull(),
  browser: varchar('browser', { length: 80 }).notNull(),
  os: varchar('os', { length: 80 }).notNull(),
  deviceType: varchar('device_type', { length: 30 }).notNull().default('desktop'),
  ipAddress: varchar('ip_address', { length: 64 }),
  location: varchar('location', { length: 100 }),
  lastActiveAt: timestamp('last_active_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});

// ==========================================
// 2. User Addresses Table
// ==========================================
export const userAddresses = pgTable('user_addresses', {
  id: varchar('id', { length: 64 }).primaryKey(),
  userId: varchar('user_id', { length: 64 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  governorate: varchar('governorate', { length: 50 }).notNull(),
  cityOrDistrict: varchar('city_or_district', { length: 120 }).notNull(),
  nearestLandmark: text('nearest_landmark'),
  fullAddress: text('full_address').notNull(),
  isDefault: boolean('is_default').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ==========================================
// 3. Merchants / Stores Table
// ==========================================
export const merchants = pgTable('merchants', {
  id: varchar('id', { length: 64 }).primaryKey(),
  userId: varchar('user_id', { length: 64 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  storeName: varchar('store_name', { length: 180 }).notNull(),
  description: text('description'),
  governorate: varchar('governorate', { length: 50 }).notNull().default('بغداد'),
  phone: varchar('phone', { length: 32 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // 'pending' | 'active' | 'suspended'
  commissionRate: integer('commission_rate').notNull().default(5),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ==========================================
// 4. Categories Table
// ==========================================
export const categories = pgTable('categories', {
  id: varchar('id', { length: 64 }).primaryKey(),
  name: varchar('name', { length: 120 }).notNull(),
  slug: varchar('slug', { length: 120 }).notNull().unique(),
  description: text('description'),
  iconName: varchar('icon_name', { length: 60 }).notNull().default('LayoutGrid'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ==========================================
// 5. Products Table
// ==========================================
export const products = pgTable('products', {
  id: varchar('id', { length: 64 }).primaryKey(),
  merchantId: varchar('merchant_id', { length: 64 })
    .notNull()
    .references(() => merchants.id, { onDelete: 'cascade' }),
  categoryId: varchar('category_id', { length: 64 })
    .notNull()
    .references(() => categories.id, { onDelete: 'restrict' }),
  name: varchar('name', { length: 250 }).notNull(),
  description: text('description'),
  originalPrice: integer('original_price').notNull(),
  finalPrice: integer('final_price').notNull(),
  discountPercentage: integer('discount_percentage').notNull().default(0),
  image: text('image').notNull(),
  inStock: boolean('in_stock').notNull().default(true),
  approvalStatus: varchar('approval_status', { length: 20 }).notNull().default('pending'), // 'pending' | 'approved' | 'rejected'
  rejectionReason: text('rejection_reason'),
  isPromoted: boolean('is_promoted').notNull().default(false),
  featured: boolean('featured').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ==========================================
// 6. Orders Table (Split per Merchant)
// ==========================================
export const orders = pgTable('orders', {
  id: varchar('id', { length: 64 }).primaryKey(),
  customerId: varchar('customer_id', { length: 64 })
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  merchantId: varchar('merchant_id', { length: 64 })
    .notNull()
    .references(() => merchants.id, { onDelete: 'restrict' }),
  customerName: varchar('customer_name', { length: 150 }).notNull(),
  customerPhone: varchar('customer_phone', { length: 32 }).notNull(),
  shippingAddress: text('shipping_address').notNull(),
  governorate: varchar('governorate', { length: 50 }).notNull(),
  notes: text('notes'),
  subtotal: integer('subtotal').notNull(),
  deliveryFee: integer('delivery_fee').notNull().default(0),
  finalTotal: integer('final_total').notNull(),
  commissionAmount: integer('commission_amount').notNull().default(0),
  status: varchar('status', { length: 20 }).notNull().default('new'), // 'new' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  paymentMethod: varchar('payment_method', { length: 20 }).notNull().default('cod'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ==========================================
// 7. Order Items Table
// ==========================================
export const orderItems = pgTable('order_items', {
  id: varchar('id', { length: 64 }).primaryKey(),
  orderId: varchar('order_id', { length: 64 })
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  productId: varchar('product_id', { length: 64 })
    .notNull()
    .references(() => products.id, { onDelete: 'restrict' }),
  productName: varchar('product_name', { length: 250 }).notNull(),
  productImage: text('product_image'),
  quantity: integer('quantity').notNull().default(1),
  unitPrice: integer('unit_price').notNull(),
  totalPrice: integer('total_price').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ==========================================
// 8. Reviews Table (Verified Purchases)
// ==========================================
export const reviews = pgTable('reviews', {
  id: varchar('id', { length: 64 }).primaryKey(),
  productId: varchar('product_id', { length: 64 })
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  orderId: varchar('order_id', { length: 64 })
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  customerId: varchar('customer_id', { length: 64 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  customerName: varchar('customer_name', { length: 150 }).notNull(),
  customerPhone: varchar('customer_phone', { length: 32 }).notNull(),
  rating: integer('rating').notNull().default(5),
  comment: text('comment').notNull(),
  isVerifiedPurchase: boolean('is_verified_purchase').notNull().default(true),
  status: varchar('status', { length: 20 }).notNull().default('approved'), // 'approved' | 'flagged' | 'hidden'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ==========================================
// 9. Review Reports Table
// ==========================================
export const reviewReports = pgTable('review_reports', {
  id: varchar('id', { length: 64 }).primaryKey(),
  reviewId: varchar('review_id', { length: 64 })
    .notNull()
    .references(() => reviews.id, { onDelete: 'cascade' }),
  reporterName: varchar('reporter_name', { length: 150 }).notNull(),
  reporterRole: varchar('reporter_role', { length: 20 }).notNull().default('merchant'),
  reason: text('reason').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // 'pending' | 'resolved' | 'dismissed'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ==========================================
// 10. Platform Settings Table
// ==========================================
export const platformSettings = pgTable('platform_settings', {
  id: varchar('id', { length: 64 }).primaryKey().default('default'),
  supportWhatsApp: varchar('support_whatsapp', { length: 32 }).notNull().default('07862214922'),
  defaultCommissionRate: integer('default_commission_rate').notNull().default(5),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ==========================================
// 11. Conversations Table
// ==========================================
export const conversations = pgTable('conversations', {
  id: varchar('id', { length: 64 }).primaryKey(),
  participant1Id: varchar('participant1_id', { length: 64 }).notNull(),
  participant2Id: varchar('participant2_id', { length: 64 }).notNull(),
  participant1Role: varchar('participant1_role', { length: 20 }).notNull().default('customer'),
  participant2Role: varchar('participant2_role', { length: 20 }).notNull().default('merchant'),
  entityType: varchar('entity_type', { length: 30 }).default('general'), // 'product' | 'order' | 'support' | 'general'
  entityId: varchar('entity_id', { length: 64 }),
  lastMessageText: text('last_message_text'),
  lastMessageTime: timestamp('last_message_time', { withTimezone: true }).defaultNow().notNull(),
  unreadCountP1: integer('unread_count_p1').notNull().default(0),
  unreadCountP2: integer('unread_count_p2').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ==========================================
// 12. Chat Messages Table
// ==========================================
export const chatMessages = pgTable('chat_messages', {
  id: varchar('id', { length: 64 }).primaryKey(),
  conversationId: varchar('conversation_id', { length: 64 })
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  senderId: varchar('sender_id', { length: 64 }).notNull(),
  senderRole: varchar('sender_role', { length: 20 }).notNull(),
  text: text('text'),
  mediaUrl: text('media_url'),
  mediaType: varchar('media_type', { length: 20 }), // 'image' | 'video' | 'file'
  productId: varchar('productId', { length: 64 }),
  orderId: varchar('orderId', { length: 64 }),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ==========================================
// 13. Chat Reports Table
// ==========================================
export const chatReports = pgTable('chat_reports', {
  id: varchar('id', { length: 64 }).primaryKey(),
  conversationId: varchar('conversation_id', { length: 64 })
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  reporterId: varchar('reporter_id', { length: 64 }).notNull(),
  reason: text('reason').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ==========================================
// 14. Notifications Table
// ==========================================
export const notifications = pgTable('notifications', {
  id: varchar('id', { length: 64 }).primaryKey(),
  recipientId: varchar('recipient_id', { length: 64 }).notNull(),
  recipientRole: varchar('recipient_role', { length: 20 }),
  title: varchar('title', { length: 200 }).notNull(),
  message: text('message').notNull(),
  type: varchar('type', { length: 40 }).notNull().default('system'),
  entityId: varchar('entity_id', { length: 64 }),
  isRead: boolean('is_read').notNull().default(false),
  isBroadcast: boolean('is_broadcast').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ==========================================
// 15. Admin Stories Table
// ==========================================
export const adminStories = pgTable('admin_stories', {
  id: varchar('id', { length: 64 }).primaryKey(),
  title: varchar('title', { length: 150 }).notNull(),
  mediaUrl: text('media_url').notNull(),
  mediaType: varchar('media_type', { length: 20 }).notNull().default('image'),
  ctaText: varchar('cta_text', { length: 100 }).default('تسوّق الآن'),
  ctaLink: text('cta_link'),
  startDate: timestamp('start_date', { withTimezone: true }).defaultNow().notNull(),
  endDate: timestamp('end_date', { withTimezone: true }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  viewsCount: integer('views_count').notNull().default(0),
  clicksCount: integer('clicks_count').notNull().default(0),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ==========================================
// 16. Promotion Requests Table
// ==========================================
export const promotionRequests = pgTable('promotion_requests', {
  id: varchar('id', { length: 64 }).primaryKey(),
  merchantId: varchar('merchant_id', { length: 64 }).notNull(),
  merchantStoreId: varchar('merchant_store_id', { length: 64 }),
  productId: varchar('product_id', { length: 64 }),
  promoType: varchar('promo_type', { length: 40 }).notNull().default('product'), // 'product' | 'store' | 'story'
  durationDays: integer('duration_days').notNull().default(7),
  priceIqd: integer('price_iqd').notNull().default(15000),
  notes: text('notes'),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // 'pending' | 'approved' | 'rejected' | 'active' | 'completed'
  rejectionReason: text('rejection_reason'),
  startDate: timestamp('start_date', { withTimezone: true }),
  endDate: timestamp('end_date', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ==========================================
// Relationships Definitions
// ==========================================
export const usersRelations = relations(users, ({ many }) => ({
  addresses: many(userAddresses),
  merchants: many(merchants),
  orders: many(orders),
  reviews: many(reviews),
}));

export const userAddressesRelations = relations(userAddresses, ({ one }) => ({
  user: one(users, {
    fields: [userAddresses.userId],
    references: [users.id],
  }),
}));

export const merchantsRelations = relations(merchants, ({ one, many }) => ({
  user: one(users, {
    fields: [merchants.userId],
    references: [users.id],
  }),
  products: many(products),
  orders: many(orders),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  merchant: one(merchants, {
    fields: [products.merchantId],
    references: [merchants.id],
  }),
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  orderItems: many(orderItems),
  reviews: many(reviews),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(users, {
    fields: [orders.customerId],
    references: [users.id],
  }),
  merchant: one(merchants, {
    fields: [orders.merchantId],
    references: [merchants.id],
  }),
  items: many(orderItems),
  reviews: many(reviews),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one, many }) => ({
  product: one(products, {
    fields: [reviews.productId],
    references: [products.id],
  }),
  order: one(orders, {
    fields: [reviews.orderId],
    references: [orders.id],
  }),
  customer: one(users, {
    fields: [reviews.customerId],
    references: [users.id],
  }),
  reports: many(reviewReports),
}));

export const reviewReportsRelations = relations(reviewReports, ({ one }) => ({
  review: one(reviews, {
    fields: [reviewReports.reviewId],
    references: [reviews.id],
  }),
}));
