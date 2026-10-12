/**
 * DUKKANA PLATFORM - POSTGRESQL DATA MIGRATION PLAN (PREPARATION ONLY)
 * 
 * STRICT CONSTRAINTS:
 * - This file is for preparation, validation, and type-checking ONLY.
 * - NO INSERT, UPDATE, or DELETE operations are executed.
 * - Neon database remains 100% untouched.
 */

import {
  INITIAL_CATEGORIES,
  INITIAL_MERCHANTS,
  INITIAL_PRODUCTS,
  INITIAL_USERS,
  INITIAL_ORDERS,
  INITIAL_REVIEWS,
  INITIAL_SETTINGS,
} from '../data/initialData';
import { ADMIN_PHONE_E164 } from '../types/index';

export const DRY_RUN_ONLY = true;

/**
 * Migration Entity Mapping Specifications
 */
export interface PreparedDataPlan {
  step1_users: Array<{
    id: string;
    phone: string;
    displayName: string;
    role: 'customer' | 'merchant' | 'admin';
    governorate: string;
    status: 'active' | 'suspended' | 'deleted';
    merchantStoreId?: string;
    createdAt: Date;
    source: 'INITIAL_USERS' | 'SERVER_USERS_ADMIN';
  }>;
  step2_addresses: Array<{
    id: string;
    userId: string;
    governorate: string;
    cityOrDistrict: string;
    nearestLandmark: string;
    fullAddress: string;
    isDefault: boolean;
  }>;
  step3_categories: Array<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    iconName: string;
    sortOrder: number;
  }>;
  step4_merchants: Array<{
    id: string;
    userId: string;
    storeName: string;
    description: string;
    governorate: string;
    phone: string;
    status: 'pending' | 'active' | 'suspended';
    commissionRate: number;
    createdAt: Date;
  }>;
  step5_products: Array<{
    id: string;
    merchantId: string;
    categoryId: string;
    name: string;
    description: string;
    originalPrice: number;
    finalPrice: number;
    discountPercentage: number;
    image: string;
    inStock: boolean;
    approvalStatus: 'pending' | 'approved' | 'rejected';
    createdAt: Date;
  }>;
  step6_orders: Array<{
    id: string;
    customerId: string;
    merchantId: string;
    customerName: string;
    customerPhone: string;
    shippingAddress: string;
    governorate: string;
    notes: string | null;
    subtotal: number;
    deliveryFee: number;
    finalTotal: number;
    commissionAmount: number;
    status: 'new' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
    paymentMethod: 'cod';
    createdAt: Date;
  }>;
  step7_orderItems: Array<{
    id: string;
    orderId: string;
    productId: string;
    productName: string;
    productImage: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  step8_reviews: Array<{
    id: string;
    productId: string;
    orderId: string;
    customerId: string;
    customerName: string;
    customerPhone: string;
    rating: number;
    comment: string;
    isVerifiedPurchase: boolean;
    status: 'approved' | 'flagged' | 'hidden';
    createdAt: Date;
  }>;
  step9_platformSettings: {
    id: string;
    supportWhatsApp: string;
    defaultCommissionRate: number;
  };
}

/**
 * Builds the prepared in-memory migration dataset structure (Dry-run preparation).
 * Flags any missing relationships before any database operation can be attempted.
 */
export function buildDryRunMigrationPlan(): {
  plan: PreparedDataPlan;
  missingMerchantAccounts: Array<{ storeId: string; requiredUserId: string; storeName: string; phone: string }>;
} {
  // Step 1: Users
  // Existing known users in initialData:
  const usersList: PreparedDataPlan['step1_users'] = INITIAL_USERS.map(u => ({
    id: u.id,
    phone: u.phone,
    displayName: u.displayName,
    role: u.role as 'customer' | 'merchant' | 'admin',
    governorate: u.governorate || 'بغداد',
    status: u.status,
    merchantStoreId: u.merchantStoreId,
    createdAt: new Date(u.createdAt),
    source: 'INITIAL_USERS' as const,
  }));

  // Canonical admin account from server.ts:
  usersList.push({
    id: 'usr_admin',
    phone: ADMIN_PHONE_E164,
    displayName: 'مدير منصة دكانة الرئيسي',
    role: 'admin',
    governorate: 'بغداد',
    status: 'active',
    createdAt: new Date('2026-09-01T10:00:00Z'),
    source: 'SERVER_USERS_ADMIN' as const,
  });

  // Check which merchant stores lack a user record:
  const existingUserIds = new Set(usersList.map(u => u.id));
  const missingMerchantAccounts: Array<{ storeId: string; requiredUserId: string; storeName: string; phone: string }> = [];

  for (const m of INITIAL_MERCHANTS) {
    if (!existingUserIds.has(m.userId)) {
      missingMerchantAccounts.push({
        storeId: m.id,
        requiredUserId: m.userId,
        storeName: m.storeName,
        phone: m.phone,
      });
    }
  }

  // Step 2: Addresses extracted from users
  const addressesList: PreparedDataPlan['step2_addresses'] = [];
  for (const u of INITIAL_USERS) {
    for (const addr of u.addresses) {
      addressesList.push({
        id: addr.id,
        userId: u.id,
        governorate: addr.governorate,
        cityOrDistrict: addr.cityOrDistrict,
        nearestLandmark: addr.nearestLandmark,
        fullAddress: addr.fullAddress,
        isDefault: Boolean(addr.isDefault),
      });
    }
  }

  // Step 3: Categories
  const categoriesList: PreparedDataPlan['step3_categories'] = INITIAL_CATEGORIES.map(c => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description || null,
    iconName: c.iconName || 'LayoutGrid',
    sortOrder: c.displayOrder,
  }));

  // Step 4: Merchants
  const merchantsList: PreparedDataPlan['step4_merchants'] = INITIAL_MERCHANTS.map(m => ({
    id: m.id,
    userId: m.userId,
    storeName: m.storeName,
    description: m.description,
    governorate: m.governorate,
    phone: m.phone,
    status: m.status === 'approved' ? 'active' : 'pending',
    commissionRate: m.commissionRate,
    createdAt: new Date(m.createdAt),
  }));

  // Step 5: Products
  const productsList: PreparedDataPlan['step5_products'] = INITIAL_PRODUCTS.map(p => ({
    id: p.id,
    merchantId: p.merchantId,
    categoryId: p.categoryId,
    name: p.name,
    description: p.description,
    originalPrice: p.originalPrice ?? p.price,
    finalPrice: p.finalPrice,
    discountPercentage: p.discountPercent ?? 0,
    image: p.imageUrl,
    inStock: p.inStock,
    approvalStatus: p.approvalStatus === 'approved' ? 'approved' : 'pending',
    createdAt: new Date(p.createdAt),
  }));

  // Step 6: Orders
  const ordersList: PreparedDataPlan['step6_orders'] = INITIAL_ORDERS.map(o => ({
    id: o.id,
    customerId: o.customerId,
    merchantId: o.merchantId,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    shippingAddress: o.detailedAddress,
    governorate: o.governorate,
    notes: o.notes || null,
    subtotal: o.subtotal,
    deliveryFee: o.deliveryFee,
    finalTotal: o.finalTotal,
    commissionAmount: o.commissionAmount,
    status: o.status === 'delivered' ? 'delivered' : 'new',
    paymentMethod: 'cod',
    createdAt: new Date(o.createdAt),
  }));

  // Step 7: Order Items
  const orderItemsList: PreparedDataPlan['step7_orderItems'] = [];
  for (const o of INITIAL_ORDERS) {
    o.items.forEach((item, index) => {
      orderItemsList.push({
        id: `${o.id}_item_${index + 1}`,
        orderId: o.id,
        productId: item.productId,
        productName: item.productName,
        productImage: item.productImage,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      });
    });
  }

  // Step 8: Reviews
  const reviewsList: PreparedDataPlan['step8_reviews'] = INITIAL_REVIEWS.map(r => ({
    id: r.id,
    productId: r.productId,
    orderId: r.orderId,
    customerId: r.userId,
    customerName: r.userName,
    customerPhone: r.userPhone,
    rating: r.rating,
    comment: r.comment || '',
    isVerifiedPurchase: Boolean(r.isVerifiedPurchase),
    status: 'approved',
    createdAt: new Date(r.createdAt),
  }));

  // Step 9: Platform Settings
  const settingsObj: PreparedDataPlan['step9_platformSettings'] = {
    id: 'default',
    supportWhatsApp: INITIAL_SETTINGS.supportWhatsApp,
    defaultCommissionRate: INITIAL_SETTINGS.defaultCommissionRate,
  };

  return {
    plan: {
      step1_users: usersList,
      step2_addresses: addressesList,
      step3_categories: categoriesList,
      step4_merchants: merchantsList,
      step5_products: productsList,
      step6_orders: ordersList,
      step7_orderItems: orderItemsList,
      step8_reviews: reviewsList,
      step9_platformSettings: settingsObj,
    },
    missingMerchantAccounts,
  };
}
