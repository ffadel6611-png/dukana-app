import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Product,
  Category,
  MerchantStore,
  Order,
  Review,
  ReviewReport,
  AppSettings,
  CartItem,
  OrderStatus,
  IraqiGovernorate,
  MerchantStatus,
  ProductApprovalStatus,
  SupportInquiry,
  HomeBanner,
  JobVacancy,
  PlatformCoupon,
} from '../types';
import {
  INITIAL_CATEGORIES,
  INITIAL_MERCHANTS,
  INITIAL_PRODUCTS,
  INITIAL_ORDERS,
  INITIAL_REVIEWS,
  INITIAL_SETTINGS,
  INITIAL_INQUIRIES,
  INITIAL_BANNERS,
  INITIAL_JOBS,
  INITIAL_COUPONS,
} from '../data/initialData';
import { IRAQI_GOVERNORATES } from '../data/governorates';
import { smartArabicSearchMatch } from '../utils/arabicSearch';
import { safeGetItem, safeSetItem } from '../utils/storage';

interface SplitCheckoutData {
  recipientName: string;
  recipientPhone: string;
  governorate: IraqiGovernorate;
  detailedAddress: string;
  notes?: string;
}

interface MarketContextType {
  products: Product[];
  categories: Category[];
  merchants: MerchantStore[];
  orders: Order[];
  reviews: Review[];
  reports: ReviewReport[];
  settings: AppSettings;
  cart: CartItem[];
  selectedCategorySlug: string;
  searchQuery: string;
  selectedDiscount: number | null; // 10, 30, 50 or null
  selectedGovernorate: IraqiGovernorate | 'all';

  // Filters & Search
  setSearchQuery: (query: string) => void;
  setSelectedCategorySlug: (slug: string) => void;
  setSelectedDiscount: (discount: number | null) => void;
  setSelectedGovernorate: (gov: IraqiGovernorate | 'all') => void;
  getFilteredProductsForCustomer: () => Product[];

  // Cart Management
  addToCart: (product: Product, quantity?: number) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  getCartGroupsByMerchant: () => { merchantId: string; storeName: string; items: CartItem[]; subtotal: number }[];
  getCartTotalCount: () => number;

  // Customer Wishlist
  wishlist: string[];
  toggleWishlist: (productId: string) => boolean;
  isInWishlist: (productId: string) => boolean;
  removeFromWishlist: (productId: string) => void;
  clearWishlist: () => void;

  // Platform Coupons (Admin-Only Managed)
  coupons: PlatformCoupon[];
  addCoupon: (coupon: Omit<PlatformCoupon, 'id' | 'usageCount' | 'createdAt'>) => { success: boolean; message: string };
  updateCoupon: (id: string, updates: Partial<PlatformCoupon>) => void;
  deleteCoupon: (id: string) => void;
  toggleCouponActive: (id: string) => void;
  validateAndApplyCoupon: (code: string, subtotal: number) => { success: boolean; discountAmount: number; coupon?: PlatformCoupon; message: string };

  // Checkout (Split Orders by Merchant)
  executeSplitCheckout: (
    customerId: string,
    customerName: string,
    customerPhone: string,
    data: SplitCheckoutData,
    appliedCoupon?: { code: string; discountAmount: number }
  ) => { success: boolean; createdOrders: Order[]; message: string };

  // Orders Management
  updateOrderStatus: (orderId: string, newStatus: OrderStatus, note?: string) => void;
  getCustomerOrders: (customerId: string) => Order[];
  getMerchantOrders: (merchantId: string) => Order[];

  // Product Management (Merchant & Admin)
  addProduct: (productData: Omit<Product, 'id' | 'createdAt' | 'approvalStatus'>) => void;
  updateProduct: (productId: string, updates: Partial<Product>) => void;
  deleteProduct: (productId: string) => void;
  setProductApproval: (productId: string, status: ProductApprovalStatus, reason?: string) => void;
  promoteProduct: (productId: string) => { success: boolean; message: string };
  unpromoteProduct: (productId: string) => { success: boolean; message: string };
  toggleProductPromotion: (productId: string) => { success: boolean; message: string };
  updateProductImages: (productId: string, images: string[], primaryImage?: string) => void;

  // Merchant Management
  registerMerchantStore: (storeData: Omit<MerchantStore, 'id' | 'createdAt' | 'status' | 'commissionRate'> & { id?: string; status?: MerchantStatus }) => MerchantStore;
  updateMerchantStore: (merchantId: string, updates: Partial<MerchantStore>) => void;
  setMerchantStatus: (merchantId: string, status: MerchantStatus, reason?: string) => void;
  updateStoreImages: (merchantId: string, images: string[], coverUrl?: string) => void;

  // Home Banners Management (Admin)
  banners: HomeBanner[];
  getActiveBanners: () => HomeBanner[];
  addBanner: (bannerData: Omit<HomeBanner, 'id' | 'createdAt'>) => HomeBanner;
  updateBanner: (id: string, updates: Partial<HomeBanner>) => void;
  deleteBanner: (id: string) => void;
  toggleBannerStatus: (id: string) => void;
  reorderBanners: (bannerId: string, direction: 'up' | 'down') => void;

  // Category Management (Admin)
  addCategory: (name: string, description?: string) => void;
  updateCategory: (id: string, name: string, description?: string) => void;
  deleteCategory: (id: string) => void;

  // Reviews & UGC Moderation
  getProductReviews: (productId: string) => Review[];
  canUserReviewProduct: (userId: string, productId: string) => { canReview: boolean; orderId?: string; reason?: string };
  submitReview: (userId: string, userName: string, userPhone: string, productId: string, orderId: string, rating: number, comment?: string) => { success: boolean; message: string };
  reportReview: (reviewId: string, reporterUserId: string, reporterPhone: string, reason: ReviewReport['reason'], details: string) => { success: boolean; message: string };
  setReviewStatus: (reviewId: string, status: Review['status']) => void;
  resolveReport: (reportId: string, action: 'dismissed' | 'action_taken') => void;

  // Support Team Inquiries
  inquiries: SupportInquiry[];
  submitSupportInquiry: (
    senderName: string,
    senderPhone: string,
    subject: string,
    message: string,
    category: SupportInquiry['category']
  ) => { success: boolean; message: string };
  replySupportInquiry: (inquiryId: string, replyText: string) => void;

  // Jobs & Careers
  jobs: JobVacancy[];
  applyForJob: (
    jobId: string,
    applicantName: string,
    applicantPhone: string,
    notes?: string
  ) => { success: boolean; message: string };

  // Settings (Admin)
  updateSettings: (newSettings: Partial<AppSettings>) => void;
}

const MarketContext = createContext<MarketContextType | undefined>(undefined);

const PRODUCTS_KEY = 'dukkana_products_db_v2';
const MERCHANTS_KEY = 'dukkana_merchants_db_v2';
const CATEGORIES_KEY = 'dukkana_categories_db_v3';
const ORDERS_KEY = 'dukkana_orders_db_v2';
const REVIEWS_KEY = 'dukkana_reviews_db_v2';
const REPORTS_KEY = 'dukkana_reports_db_v2';
const INQUIRIES_KEY = 'dukkana_inquiries_db_v2';
const SETTINGS_KEY = 'dukkana_settings_db_v2';
const CART_KEY = 'dukkana_cart_v2';
const BANNERS_KEY = 'dukkana_banners_db_v1';
const JOBS_KEY = 'dukkana_jobs_db_v1';
const WISHLIST_KEY = 'dukkana_wishlist_v2';
const COUPONS_KEY = 'dukkana_coupons_db_v1';

export const MarketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = safeGetItem(PRODUCTS_KEY);
    if (!saved) return INITIAL_PRODUCTS;
    try {
      return JSON.parse(saved);
    } catch {
      return INITIAL_PRODUCTS;
    }
  });

  const [merchants, setMerchants] = useState<MerchantStore[]>(() => {
    const saved = safeGetItem(MERCHANTS_KEY);
    if (!saved) return INITIAL_MERCHANTS;
    try {
      return JSON.parse(saved);
    } catch {
      return INITIAL_MERCHANTS;
    }
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = safeGetItem(CATEGORIES_KEY);
    if (!saved) return INITIAL_CATEGORIES;
    try {
      return JSON.parse(saved);
    } catch {
      return INITIAL_CATEGORIES;
    }
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = safeGetItem(ORDERS_KEY);
    if (!saved) return INITIAL_ORDERS;
    try {
      return JSON.parse(saved);
    } catch {
      return INITIAL_ORDERS;
    }
  });

  const [reviews, setReviews] = useState<Review[]>(() => {
    const saved = safeGetItem(REVIEWS_KEY);
    if (!saved) return INITIAL_REVIEWS;
    try {
      return JSON.parse(saved);
    } catch {
      return INITIAL_REVIEWS;
    }
  });

  const [reports, setReports] = useState<ReviewReport[]>(() => {
    const saved = safeGetItem(REPORTS_KEY);
    if (!saved) return [];
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  });

  const [inquiries, setInquiries] = useState<SupportInquiry[]>(() => {
    const saved = safeGetItem(INQUIRIES_KEY);
    if (!saved) return INITIAL_INQUIRIES;
    try {
      return JSON.parse(saved);
    } catch {
      return INITIAL_INQUIRIES;
    }
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = safeGetItem(SETTINGS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...INITIAL_SETTINGS,
          ...parsed,
          promotionPrice:
            typeof parsed.promotionPrice === 'number'
              ? parsed.promotionPrice
              : INITIAL_SETTINGS.promotionPrice,
        };
      } catch {
        return INITIAL_SETTINGS;
      }
    }
    return INITIAL_SETTINGS;
  });

  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = safeGetItem(CART_KEY);
    if (!saved) return [];
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  });

  const [banners, setBanners] = useState<HomeBanner[]>(() => {
    const saved = safeGetItem(BANNERS_KEY);
    if (!saved) return INITIAL_BANNERS;
    try {
      return JSON.parse(saved);
    } catch {
      return INITIAL_BANNERS;
    }
  });

  const [jobs, setJobs] = useState<JobVacancy[]>(() => {
    const saved = safeGetItem(JOBS_KEY);
    if (!saved) return INITIAL_JOBS;
    try {
      return JSON.parse(saved);
    } catch {
      return INITIAL_JOBS;
    }
  });

  const [wishlist, setWishlist] = useState<string[]>(() => {
    const saved = safeGetItem(WISHLIST_KEY);
    if (!saved) return [];
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  });

  const [coupons, setCoupons] = useState<PlatformCoupon[]>(() => {
    const saved = safeGetItem(COUPONS_KEY);
    if (!saved) return INITIAL_COUPONS;
    try {
      return JSON.parse(saved);
    } catch {
      return INITIAL_COUPONS;
    }
  });

  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDiscount, setSelectedDiscount] = useState<number | null>(null);
  const [selectedGovernorate, setSelectedGovernorate] = useState<IraqiGovernorate | 'all'>('all');

  useEffect(() => {
    safeSetItem(WISHLIST_KEY, JSON.stringify(wishlist));
  }, [wishlist]);

  useEffect(() => {
    safeSetItem(COUPONS_KEY, JSON.stringify(coupons));
  }, [coupons]);

  // Wishlist operations
  const toggleWishlist = (productId: string) => {
    let isAdded = false;
    setWishlist(prev => {
      if (prev.includes(productId)) {
        return prev.filter(id => id !== productId);
      } else {
        isAdded = true;
        return [...prev, productId];
      }
    });
    return isAdded;
  };

  const isInWishlist = (productId: string) => {
    return wishlist.includes(productId);
  };

  const removeFromWishlist = (productId: string) => {
    setWishlist(prev => prev.filter(id => id !== productId));
  };

  const clearWishlist = () => {
    setWishlist([]);
  };

  // Platform Coupons operations (Admin-Only Managed)
  const addCoupon = (couponData: Omit<PlatformCoupon, 'id' | 'usageCount' | 'createdAt'>) => {
    const cleanCode = couponData.code.trim().toUpperCase();
    if (!cleanCode) {
      return { success: false, message: 'يرجى إدخال رمز الكوبون.' };
    }
    if (coupons.some(c => c.code.toUpperCase() === cleanCode)) {
      return { success: false, message: `رمز الكوبون (${cleanCode}) موجود مسبقاً.` };
    }
    const newCoupon: PlatformCoupon = {
      ...couponData,
      id: `coupon_${Date.now()}`,
      code: cleanCode,
      usageCount: 0,
      createdAt: new Date().toISOString(),
    };
    setCoupons(prev => [newCoupon, ...prev]);
    return { success: true, message: `تم إنشاء كوبون الخصم (${cleanCode}) بنجاح.` };
  };

  const updateCoupon = (id: string, updates: Partial<PlatformCoupon>) => {
    setCoupons(prev =>
      prev.map(c => {
        if (c.id !== id) return c;
        return {
          ...c,
          ...updates,
          code: updates.code ? updates.code.trim().toUpperCase() : c.code,
        };
      })
    );
  };

  const deleteCoupon = (id: string) => {
    setCoupons(prev => prev.filter(c => c.id !== id));
  };

  const toggleCouponActive = (id: string) => {
    setCoupons(prev =>
      prev.map(c => (c.id === id ? { ...c, isActive: !c.isActive } : c))
    );
  };

  const validateAndApplyCoupon = (code: string, subtotal: number) => {
    const cleanCode = code.trim().toUpperCase();
    const found = coupons.find(c => c.code.toUpperCase() === cleanCode);
    if (!found) {
      return { success: false, discountAmount: 0, message: 'كوبون الخصم غير موجود أو غير صحيح.' };
    }
    if (!found.isActive) {
      return { success: false, discountAmount: 0, message: 'هذا الكوبون معطّل حالياً من قِبل إدارة المنصة.' };
    }
    if (found.expiresAt && new Date(found.expiresAt) < new Date()) {
      return { success: false, discountAmount: 0, message: 'انتهت صلاحية استخدام هذا الكوبون.' };
    }
    if (found.maxUsageLimit && found.usageCount >= found.maxUsageLimit) {
      return { success: false, discountAmount: 0, message: 'بلغ هذا الكوبون الحد الأقصى للاستخدام.' };
    }
    if (subtotal < (found.minOrderSubtotal || 0)) {
      return {
        success: false,
        discountAmount: 0,
        message: `الحد الأدنى لقيمة الطلب لتطبيق هذا الكوبون هو ${(found.minOrderSubtotal || 0).toLocaleString()} د.ع.`,
      };
    }

    let discountAmount = 0;
    if (found.discountType === 'percentage') {
      discountAmount = Math.round((subtotal * found.discountValue) / 100);
      if (found.maxDiscountCap && discountAmount > found.maxDiscountCap) {
        discountAmount = found.maxDiscountCap;
      }
    } else {
      discountAmount = Math.min(found.discountValue, subtotal);
    }

    return {
      success: true,
      discountAmount,
      coupon: found,
      message: `تم تطبيق كوبون (${found.code}) بنجاح! خصم ${discountAmount.toLocaleString()} د.ع.`,
    };
  };

  useEffect(() => {
    safeSetItem(JOBS_KEY, JSON.stringify(jobs));
  }, [jobs]);

  const applyForJob = (
    jobId: string,
    applicantName: string,
    applicantPhone: string,
    notes?: string
  ) => {
    setJobs(prev =>
      prev.map(j => {
        if (j.id === jobId) {
          return { ...j, applicantsCount: (j.applicantsCount || 0) + 1 };
        }
        return j;
      })
    );
    return {
      success: true,
      message: `تم إرسال طلب التقديم على الوظيفة بنجاح باسم (${applicantName})! سيتم التواصل معك قريباً.`,
    };
  };

  useEffect(() => {
    safeSetItem(PRODUCTS_KEY, JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    safeSetItem(MERCHANTS_KEY, JSON.stringify(merchants));
  }, [merchants]);

  useEffect(() => {
    safeSetItem(CATEGORIES_KEY, JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    safeSetItem(ORDERS_KEY, JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    safeSetItem(REVIEWS_KEY, JSON.stringify(reviews));
  }, [reviews]);

  useEffect(() => {
    safeSetItem(REPORTS_KEY, JSON.stringify(reports));
  }, [reports]);

  useEffect(() => {
    safeSetItem(INQUIRIES_KEY, JSON.stringify(inquiries));
  }, [inquiries]);

  useEffect(() => {
    safeSetItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    safeSetItem(CART_KEY, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    safeSetItem(BANNERS_KEY, JSON.stringify(banners));
  }, [banners]);

  // Cart operations
  const addToCart = (product: Product, quantity = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity }];
    });
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev =>
      prev.map(item =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const getCartTotalCount = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  // Group items by Merchant for split multi-vendor order structure
  const getCartGroupsByMerchant = () => {
    const groupsMap = new Map<string, { merchantId: string; storeName: string; items: CartItem[]; subtotal: number }>();

    for (const item of cart) {
      const mId = item.product.merchantId;
      const existing = groupsMap.get(mId);
      const itemSubtotal = item.product.finalPrice * item.quantity;

      if (existing) {
        existing.items.push(item);
        existing.subtotal += itemSubtotal;
      } else {
        groupsMap.set(mId, {
          merchantId: mId,
          storeName: item.product.storeName,
          items: [item],
          subtotal: itemSubtotal,
        });
      }
    }

    return Array.from(groupsMap.values());
  };

  // Customer filtered products
  const getFilteredProductsForCustomer = () => {
    // Only approved products from approved merchants are visible to customers!
    const approvedMerchantIds = new Set(
      merchants.filter(m => m.status === 'approved').map(m => m.id)
    );

    let list = products.filter(
      p => p.approvalStatus === 'approved' && approvedMerchantIds.has(p.merchantId)
    );

    // Filter by governorate
    if (selectedGovernorate !== 'all') {
      const merchantsInGov = new Set(
        merchants.filter(m => m.governorate === selectedGovernorate).map(m => m.id)
      );
      list = list.filter(p => merchantsInGov.has(p.merchantId));
    }

    // Filter by category
    if (selectedCategorySlug !== 'all') {
      const cat = categories.find(c => c.slug === selectedCategorySlug);
      if (cat) {
        list = list.filter(p => {
          if (p.categoryId === cat.id) return true;
          // Slug-based intelligent mapping
          const pName = p.name.toLowerCase();
          const pTags = (p.tags || []).join(' ').toLowerCase();
          const pCategory = p.categoryName.toLowerCase();
          switch (cat.slug) {
            case 'real-estate-sale':
              return (p.categoryId === 'cat_real_estate' || pCategory.includes('عقار')) &&
                (pName.includes('بيع') || pTags.includes('بيع') || pName.includes('دار') || pName.includes('بيت'));
            case 'real-estate-rent':
              return (p.categoryId === 'cat_real_estate' || pCategory.includes('عقار')) &&
                (pName.includes('إيجار') || pName.includes('ايجار') || pTags.includes('إيجار') || pName.includes('شقة'));
            case 'cars-vehicles':
              return p.categoryId === 'cat_vehicles' || pCategory.includes('سيار') || pCategory.includes('مركب');
            case 'motorcycles':
              return p.categoryId === 'cat_motorcycles' || pCategory.includes('دراج') || pName.includes('بطاحة');
            case 'mobiles-tablets':
              return p.categoryId === 'cat_mobiles' || pCategory.includes('موبايل') || pCategory.includes('هاتف');
            case 'electronics':
              return p.categoryId === 'cat_electronics' || p.categoryId === 'cat_mobiles' || pCategory.includes('إلكترون');
            case 'laptops-computers':
              return p.categoryId === 'cat_laptops' || pCategory.includes('لابتوب') || pCategory.includes('كمبيوتر');
            case 'gaming-video':
              return p.categoryId === 'cat_gaming' || pTags.includes('بلايستيشن') || pTags.includes('ألعاب') || pTags.includes('ps5');
            case 'sports-equipment':
              return p.categoryId === 'cat_sports' || pCategory.includes('رياض') || pTags.includes('لياقة');
            case 'home-appliances':
              return p.categoryId === 'cat_appliances' || pCategory.includes('أجهزة') || pName.includes('سبلت');
            case 'home-garden':
              return p.categoryId === 'cat_home' || pCategory.includes('منزل') || pCategory.includes('أثاث');
            case 'fashion-kids':
              return p.categoryId === 'cat_fashion' || p.categoryId === 'cat_clothing' || pCategory.includes('ملابس') || pCategory.includes('أزياء');
            case 'beauty-health':
              return p.categoryId === 'cat_beauty' || p.categoryId === 'cat_daily_needs' || pTags.includes('بخور') || pCategory.includes('جمال');
            case 'food-groceries':
              return p.categoryId === 'cat_food' || p.categoryId === 'cat_restaurants' || pCategory.includes('غذائ') || pCategory.includes('مطاعم');
            case 'services-maintenance':
              return p.categoryId === 'cat_services' || pCategory.includes('صيانة') || pCategory.includes('خدمات');
            default:
              return p.categoryId === cat.id;
          }
        });
      }
    }

    // Filter by discount (10%, 30%, 50%)
    if (selectedDiscount !== null) {
      list = list.filter(p => (p.discountPercent || 0) >= selectedDiscount);
    }

    // Smart Arabic Search
    if (searchQuery.trim()) {
      list = list
        .map(product => {
          const searchFields = [
            product.name,
            product.description,
            product.storeName,
            product.categoryName,
            ...(product.tags || []),
          ];
          const matchResult = smartArabicSearchMatch(searchFields, searchQuery);
          return { product, matchResult };
        })
        .filter(item => item.matchResult.matches)
        .sort((a, b) => {
          if (a.product.isPromoted && !b.product.isPromoted) return -1;
          if (!a.product.isPromoted && b.product.isPromoted) return 1;
          return b.matchResult.score - a.matchResult.score;
        })
        .map(item => item.product);
    } else {
      // Prioritize promoted products (المنتجات المروجة أولاً)
      list.sort((a, b) => {
        if (a.isPromoted && !b.isPromoted) return -1;
        if (!a.isPromoted && b.isPromoted) return 1;
        return 0;
      });
    }

    return list;
  };

  // Execute Split Checkout
  const executeSplitCheckout = (
    customerId: string,
    customerName: string,
    customerPhone: string,
    data: SplitCheckoutData,
    appliedCoupon?: { code: string; discountAmount: number }
  ) => {
    if (cart.length === 0) {
      return { success: false, createdOrders: [], message: 'السلة فارغة.' };
    }

    const merchantGroups = getCartGroupsByMerchant();
    const createdOrders: Order[] = [];
    const now = new Date().toISOString();
    const totalCartSubtotal = cart.reduce((s, i) => s + i.product.finalPrice * i.quantity, 0) || 1;

    for (const group of merchantGroups) {
      const orderNumber = `DUK-${Math.floor(100000 + Math.random() * 900000)}`;
      const merchant = merchants.find(m => m.id === group.merchantId);
      const commissionRate = merchant ? merchant.commissionRate : settings.defaultCommissionRate;
      const govDetail = IRAQI_GOVERNORATES.find(g => g.id === data.governorate);
      const deliveryFee = govDetail ? govDetail.deliveryFee : 5000;

      // Allocate proportional coupon discount to this merchant group
      const couponShare = appliedCoupon
        ? Math.min(group.subtotal, Math.round((appliedCoupon.discountAmount * group.subtotal) / totalCartSubtotal))
        : 0;

      const finalTotal = Math.max(0, group.subtotal - couponShare) + deliveryFee;

      const itemDiscounts = group.items.reduce((acc, item) => {
        const orig = item.product.originalPrice || item.product.finalPrice;
        return acc + (orig - item.product.finalPrice) * item.quantity;
      }, 0);

      const newOrder: Order = {
        id: orderNumber,
        customerId,
        customerName,
        customerPhone,
        recipientName: data.recipientName,
        recipientPhone: data.recipientPhone,
        governorate: data.governorate,
        detailedAddress: data.detailedAddress,
        notes: data.notes,
        merchantId: group.merchantId,
        storeName: group.storeName,
        items: group.items.map(item => ({
          productId: item.product.id,
          productName: item.product.name,
          productImage: item.product.imageUrl,
          unitPrice: item.product.finalPrice,
          quantity: item.quantity,
          totalPrice: item.product.finalPrice * item.quantity,
        })),
        subtotal: group.subtotal,
        discountTotal: itemDiscounts + couponShare,
        deliveryFee,
        finalTotal,
        paymentMethod: 'cod',
        status: 'new',
        statusHistory: [
          { status: 'new', timestamp: now, note: 'تم إنشاء الطلب بنجاح وهو بانتظار تأكيد التاجر' },
        ],
        commissionRate,
        commissionAmount: 0, // Zero until delivered!
        appliedCoupon: appliedCoupon && couponShare > 0
          ? { code: appliedCoupon.code, discountAmount: couponShare }
          : undefined,
        createdAt: now,
      };

      createdOrders.push(newOrder);

      // 1. Emit Instant Notification to Merchant
      fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: group.merchantId,
          recipientRole: 'merchant',
          title: '📦 طلب شراء جديد وارد إلى متجرك!',
          message: `تم استلام طلب شراء جديد برقم #${orderNumber} من الزبون ${data.recipientName} (${data.governorate}) بقيمة ${finalTotal.toLocaleString()} د.ع للدفع عند الاستلام.`,
          type: 'order',
          entityId: orderNumber,
        }),
      }).catch(() => {});

      // 2. Emit Notification to Master Admin
      fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: 'usr_admin',
          recipientRole: 'admin',
          title: 'طلب شراء جديد في منصة دكانة',
          message: `طلب جديد برقم #${orderNumber} لمتجر ${group.storeName} بقيمة ${finalTotal.toLocaleString()} د.ع.`,
          type: 'order',
          entityId: orderNumber,
        }),
      }).catch(() => {});

      // 3. Dispatch global event for instant UI alert across dashboard
      try {
        const orderSnap = newOrder;
        const merchantSnap = group.merchantId;
        setTimeout(() => {
          try {
            window.dispatchEvent(
              new CustomEvent('new_order_placed', {
                detail: { order: orderSnap, merchantId: merchantSnap },
              })
            );
          } catch {}
        }, 0);
      } catch {}
    }

    setOrders(prev => [...createdOrders, ...prev]);
    if (appliedCoupon) {
      setCoupons(prev =>
        prev.map(c =>
          c.code.toUpperCase() === appliedCoupon.code.toUpperCase()
            ? { ...c, usageCount: (c.usageCount || 0) + 1 }
            : c
        )
      );
    }
    clearCart();

    return {
      success: true,
      createdOrders,
      message: `تم إنشاء ${createdOrders.length} ${createdOrders.length > 1 ? 'طلبات مستقلة' : 'طلب'} بنجاح للدفع عند الاستلام.`,
    };
  };

  // Update Order Status
  const updateOrderStatus = (orderId: string, newStatus: OrderStatus, note?: string) => {
    const now = new Date().toISOString();
    const existingOrder = orders.find(ord => ord.id === orderId);

    const statusLabel =
      newStatus === 'confirmed'
        ? 'تمت الموافقة على طلبك وتأكيده بنجاح'
        : newStatus === 'preparing'
        ? 'الطلب قيد التجهيز والتغليف لدى المتجر'
        : newStatus === 'out_for_delivery'
        ? 'خرج الطلب للتوصيل مع مندوب المتجر'
        : newStatus === 'delivered'
        ? 'تم تسليم الطلب واستلام المبلغ نقداً بنجاح'
        : newStatus === 'cancelled'
        ? 'تم إلغاء الطلب من قِبل المتجر'
        : 'تحديث حالة الطلب';

    setOrders(prev =>
      prev.map(ord => {
        if (ord.id !== orderId) return ord;

        // Platform Commission Calculation Rule:
        // Calculated strictly upon 'delivered' (تم التوصيل), 0 if cancelled (ملغي)
        let commissionAmount = ord.commissionAmount;
        let deliveredAt = ord.deliveredAt;

        if (newStatus === 'delivered') {
          commissionAmount = Math.round(ord.subtotal * (ord.commissionRate / 100));
          deliveredAt = now;
        } else if (newStatus === 'cancelled') {
          commissionAmount = 0;
        }

        return {
          ...ord,
          status: newStatus,
          deliveredAt,
          commissionAmount,
          statusHistory: [
            ...ord.statusHistory,
            { status: newStatus, timestamp: now, note: note || statusLabel },
          ],
        };
      })
    );

    // Side-effects: dispatch notification and event safely outside of React's state updater
    if (existingOrder) {
      const customerId = existingOrder.customerId;
      const storeName = existingOrder.storeName;
      setTimeout(() => {
        fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipientId: customerId,
            recipientRole: 'customer',
            title: `تحديث حالة طلبك #${orderId}: ${statusLabel}`,
            message: `قام متجر "${storeName}" بتحديث حالة طلبك إلى: "${statusLabel}".`,
            type: 'order',
            entityId: orderId,
          }),
        }).catch(() => {});

        try {
          window.dispatchEvent(
            new CustomEvent('order_status_updated', {
              detail: { orderId, newStatus, customerId },
            })
          );
        } catch {}
      }, 0);
    }
  };

  const getCustomerOrders = (customerId: string) => {
    return orders.filter(o => o.customerId === customerId);
  };

  const getMerchantOrders = (merchantId: string) => {
    return orders.filter(o => o.merchantId === merchantId);
  };

  // Product actions
  const addProduct = (productData: Omit<Product, 'id' | 'createdAt' | 'approvalStatus'>) => {
    const newProduct: Product = {
      ...productData,
      id: `prod_${Date.now()}`,
      createdAt: new Date().toISOString(),
      approvalStatus: 'pending', // Requires admin approval!
    };
    setProducts(prev => [newProduct, ...prev]);

    // Notify Admin about new product pending approval
    fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipientId: 'usr_admin',
        recipientRole: 'admin',
        title: 'منتج جديد بحاجة إلى تدقيق واعتماد',
        message: `أضاف متجر منتجاً جديداً "${productData.name}" بسعر ${productData.finalPrice.toLocaleString()} د.ع وهو بانتظار موافقتك.`,
        type: 'product',
        entityId: newProduct.id,
      }),
    }).catch(() => {});
  };

  const updateProduct = (productId: string, updates: Partial<Product>) => {
    setProducts(prev =>
      prev.map(p => (p.id === productId ? { ...p, ...updates } : p))
    );
  };

  const deleteProduct = (productId: string) => {
    setProducts(prev => prev.filter(p => p.id !== productId));
  };

  const setProductApproval = (productId: string, status: ProductApprovalStatus, reason?: string) => {
    const targetProd = products.find(p => p.id === productId);
    if (targetProd) {
      // Notify Merchant
      fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: targetProd.merchantId,
          recipientRole: 'merchant',
          title: status === 'approved' ? 'تمت الموافقة على منتجك!' : 'تحديث بشأن منتجك',
          message:
            status === 'approved'
              ? `تم اعتماد ونشر منتجك "${targetProd.name}" في سوق دكانة بنجاح.`
              : `تم رفض نشر المنتج "${targetProd.name}". السبب: ${reason || 'يرجى مراجعة الإدارة'}.`,
          type: 'product',
          entityId: targetProd.id,
        }),
      }).catch(() => {});
    }

    setProducts(prev =>
      prev.map(p =>
        p.id === productId
          ? { ...p, approvalStatus: status, rejectionReason: reason }
          : p
      )
    );
  };

  const promoteProduct = (productId: string) => {
    const target = products.find(p => p.id === productId);
    if (!target) {
      return { success: false, message: 'المنتج غير موجود.' };
    }
    setProducts(prev =>
      prev.map(p =>
        p.id === productId
          ? { ...p, isPromoted: true, promotedAt: new Date().toISOString() }
          : p
      )
    );
    return {
      success: true,
      message: `تم ترويج المنتج "${target.name}" بنجاح! سيظهر الآن في صدارة المتجر وقسم المنتجات المميزة.`,
    };
  };

  const unpromoteProduct = (productId: string) => {
    const target = products.find(p => p.id === productId);
    if (!target) {
      return { success: false, message: 'المنتج غير موجود.' };
    }
    setProducts(prev =>
      prev.map(p =>
        p.id === productId
          ? { ...p, isPromoted: false, promotedAt: undefined }
          : p
      )
    );
    // Real Backend API call to stop promotion and update DB/memory
    fetch(`/api/promotions/commercial/${productId}/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId }),
    }).catch(err => {
      console.warn('Backend stop promo request warning:', err);
    });

    return {
      success: true,
      message: `تم إيقاف ترويج المنتج "${target.name}" بنجاح وإلغاء تمييزه من صدارة المتجر.`,
    };
  };

  const toggleProductPromotion = (productId: string) => {
    const target = products.find(p => p.id === productId);
    if (!target) {
      return { success: false, message: 'المنتج غير موجود.' };
    }
    return target.isPromoted ? unpromoteProduct(productId) : promoteProduct(productId);
  };

  const updateProductImages = (productId: string, images: string[], primaryImage?: string) => {
    setProducts(prev =>
      prev.map(p => {
        if (p.id !== productId) return p;
        const main = primaryImage || images[0] || p.imageUrl;
        const allImages = images.length > 0 ? images : [main];
        return {
          ...p,
          imageUrl: main,
          images: allImages,
        };
      })
    );
  };

  // Merchant actions
  const registerMerchantStore = (
    storeData: Omit<MerchantStore, 'id' | 'createdAt' | 'status' | 'commissionRate'> & { id?: string; status?: MerchantStatus }
  ): MerchantStore => {
    const newStore: MerchantStore = {
      ...storeData,
      id: storeData.id || `merch_${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: storeData.status || 'approved', // auto-approve so merchant can manage their store immediately
      commissionRate: settings.defaultCommissionRate,
    };
    setMerchants(prev => [newStore, ...prev]);
    return newStore;
  };

  const updateMerchantStore = (merchantId: string, updates: Partial<MerchantStore>) => {
    setMerchants(prev =>
      prev.map(m => (m.id === merchantId ? { ...m, ...updates } : m))
    );
    if (updates.storeName) {
      const newName = updates.storeName;
      setProducts(prev =>
        prev.map(p => (p.merchantId === merchantId ? { ...p, storeName: newName } : p))
      );
    }
  };

  const setMerchantStatus = (merchantId: string, status: MerchantStatus, reason?: string) => {
    setMerchants(prev =>
      prev.map(m =>
        m.id === merchantId
          ? { ...m, status, rejectionReason: reason }
          : m
      )
    );
  };

  const updateStoreImages = (merchantId: string, images: string[], coverUrl?: string) => {
    setMerchants(prev =>
      prev.map(m => {
        if (m.id !== merchantId) return m;
        const mainCover = coverUrl !== undefined ? coverUrl : (images.length > 0 ? images[0] : '');
        return {
          ...m,
          coverUrl: mainCover,
          images,
        };
      })
    );
  };

  // Category actions
  const addCategory = (name: string, description?: string) => {
    const slug = name.trim().replace(/\s+/g, '-');
    const newCat: Category = {
      id: `cat_${Date.now()}`,
      name: name.trim(),
      slug,
      description,
      displayOrder: categories.length + 1,
    };
    setCategories(prev => [...prev, newCat]);
  };

  const updateCategory = (id: string, name: string, description?: string) => {
    setCategories(prev =>
      prev.map(c => (c.id === id ? { ...c, name: name.trim(), description } : c))
    );
  };

  const deleteCategory = (id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  // Reviews & Verification Logic
  const getProductReviews = (productId: string) => {
    return reviews.filter(r => r.productId === productId && r.status === 'published');
  };

  const canUserReviewProduct = (
    userId: string,
    productId: string
  ): { canReview: boolean; orderId?: string; reason?: string } => {
    // 1. Must have a delivered order containing this product
    const deliveredOrdersWithProduct = orders.filter(
      o =>
        o.customerId === userId &&
        o.status === 'delivered' &&
        o.items.some(item => item.productId === productId)
    );

    if (deliveredOrdersWithProduct.length === 0) {
      return {
        canReview: false,
        reason: 'لا يمكنك تقييم المنتج إلا بعد إتمام عملية الشراء وتأكيد استلام الطلب ("تم التوصيل").',
      };
    }

    // 2. Find any delivered order that has not been reviewed yet
    const unreviewedOrder = deliveredOrdersWithProduct.find(
      o => !reviews.some(r => r.userId === userId && r.productId === productId && r.orderId === o.id)
    );

    if (!unreviewedOrder) {
      return {
        canReview: false,
        reason: 'لقد قمت بتقييم هذا المنتج مسبقاً لجميع طلباتك المكتملة.',
      };
    }

    return {
      canReview: true,
      orderId: unreviewedOrder.id,
    };
  };

  const submitReview = (
    userId: string,
    userName: string,
    userPhone: string,
    productId: string,
    orderId: string,
    rating: number,
    comment?: string
  ) => {
    const order = orders.find(
      o => o.id === orderId && o.customerId === userId && o.status === 'delivered'
    );
    if (!order || !order.items.some(item => item.productId === productId)) {
      return {
        success: false,
        message: 'لا يمكنك تقييم المنتج إلا بعد إتمام عملية الشراء وتأكيد استلام الطلب ("تم التوصيل").',
      };
    }

    const alreadyReviewed = reviews.some(
      r => r.userId === userId && r.productId === productId && r.orderId === orderId
    );
    if (alreadyReviewed) {
      return {
        success: false,
        message: 'لقد قمت بتقييم هذا المنتج مسبقاً لهذا الطلب.',
      };
    }

    const targetProduct = products.find(p => p.id === productId);

    const newReview: Review = {
      id: `rev_${Date.now()}`,
      userId,
      userName,
      userPhone,
      orderId,
      productId,
      productName: targetProduct ? targetProduct.name : 'منتج دكانة',
      rating: Math.min(5, Math.max(1, rating)),
      comment: comment?.trim() || undefined,
      createdAt: new Date().toISOString(),
      status: 'published',
      isVerifiedPurchase: true,
    };

    setReviews(prev => [newReview, ...prev]);
    return { success: true, message: 'تم نشر تقييمك الموثق بنجاح. شكراً لمشاركتك رأيك!' };
  };

  const reportReview = (
    reviewId: string,
    reporterUserId: string,
    reporterPhone: string,
    reason: ReviewReport['reason'],
    details: string
  ) => {
    const newReport: ReviewReport = {
      id: `rep_${Date.now()}`,
      reviewId,
      reporterUserId,
      reporterPhone,
      reason,
      details: details.trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    setReports(prev => [newReport, ...prev]);
    return {
      success: true,
      message: 'تم استلام بلاغك وإرساله إلى إدارة دكانة للمراجعة والتدقيق.',
    };
  };

  const setReviewStatus = (reviewId: string, status: Review['status']) => {
    setReviews(prev =>
      prev.map(r => (r.id === reviewId ? { ...r, status } : r))
    );
  };

  const resolveReport = (reportId: string, action: 'dismissed' | 'action_taken') => {
    setReports(prev =>
      prev.map(rep => (rep.id === reportId ? { ...rep, status: action } : rep))
    );
  };

  const submitSupportInquiry = (
    senderName: string,
    senderPhone: string,
    subject: string,
    message: string,
    category: SupportInquiry['category']
  ) => {
    const newInquiry: SupportInquiry = {
      id: `inq_${Date.now()}`,
      senderName: senderName.trim(),
      senderPhone: senderPhone.trim(),
      subject: subject.trim(),
      message: message.trim(),
      category,
      status: 'new',
      createdAt: new Date().toISOString(),
    };
    setInquiries(prev => [newInquiry, ...prev]);
    return {
      success: true,
      message: 'تم إرسال رسالتك إلى فريق الدعم الفني لدكانة بنجاح، وستتم مراجعتها والرد عليها.',
    };
  };

  const replySupportInquiry = (inquiryId: string, replyText: string) => {
    setInquiries(prev =>
      prev.map(inq =>
        inq.id === inquiryId
          ? {
              ...inq,
              reply: replyText.trim(),
              repliedAt: new Date().toISOString(),
              status: 'resolved',
            }
          : inq
      )
    );
  };

  const getActiveBanners = (): HomeBanner[] => {
    return banners
      .filter(b => b.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  };

  const addBanner = (bannerData: Omit<HomeBanner, 'id' | 'createdAt'>): HomeBanner => {
    const newBanner: HomeBanner = {
      ...bannerData,
      id: `banner_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setBanners(prev => [...prev, newBanner]);
    return newBanner;
  };

  const updateBanner = (id: string, updates: Partial<HomeBanner>) => {
    setBanners(prev =>
      prev.map(b => (b.id === id ? { ...b, ...updates } : b))
    );
  };

  const deleteBanner = (id: string) => {
    setBanners(prev => prev.filter(b => b.id !== id));
  };

  const toggleBannerStatus = (id: string) => {
    setBanners(prev =>
      prev.map(b => (b.id === id ? { ...b, isActive: !b.isActive } : b))
    );
  };

  const reorderBanners = (bannerId: string, direction: 'up' | 'down') => {
    setBanners(prev => {
      const sorted = [...prev].sort((a, b) => a.displayOrder - b.displayOrder);
      const index = sorted.findIndex(b => b.id === bannerId);
      if (index === -1) return prev;
      if (direction === 'up' && index === 0) return prev;
      if (direction === 'down' && index === sorted.length - 1) return prev;

      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      const current = sorted[index];
      const target = sorted[targetIndex];

      const currentOrder = current.displayOrder;
      current.displayOrder = target.displayOrder;
      target.displayOrder = currentOrder;

      return [...sorted].sort((a, b) => a.displayOrder - b.displayOrder);
    });
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  return (
    <MarketContext.Provider
      value={{
        products,
        categories,
        merchants,
        orders,
        reviews,
        reports,
        inquiries,
        submitSupportInquiry,
        replySupportInquiry,
        settings,
        cart,
        selectedCategorySlug,
        searchQuery,
        selectedDiscount,
        selectedGovernorate,
        setSearchQuery,
        setSelectedCategorySlug,
        setSelectedDiscount,
        setSelectedGovernorate,
        getFilteredProductsForCustomer,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        getCartGroupsByMerchant,
        getCartTotalCount,
        executeSplitCheckout,
        updateOrderStatus,
        getCustomerOrders,
        getMerchantOrders,
        addProduct,
        updateProduct,
        deleteProduct,
        setProductApproval,
        promoteProduct,
        unpromoteProduct,
        toggleProductPromotion,
        updateProductImages,
        registerMerchantStore,
        updateMerchantStore,
        setMerchantStatus,
        updateStoreImages,
        banners,
        getActiveBanners,
        addBanner,
        updateBanner,
        deleteBanner,
        toggleBannerStatus,
        reorderBanners,
        addCategory,
        updateCategory,
        deleteCategory,
        getProductReviews,
        canUserReviewProduct,
        submitReview,
        reportReview,
        setReviewStatus,
        resolveReport,
        updateSettings,
        jobs,
        applyForJob,
        wishlist,
        toggleWishlist,
        isInWishlist,
        removeFromWishlist,
        clearWishlist,
        coupons,
        addCoupon,
        updateCoupon,
        deleteCoupon,
        toggleCouponActive,
        validateAndApplyCoupon,
      }}
    >
      {children}
    </MarketContext.Provider>
  );
};

export const useMarket = () => {
  const context = useContext(MarketContext);
  if (!context) {
    throw new Error('useMarket must be used within a MarketProvider');
  }
  return context;
};
