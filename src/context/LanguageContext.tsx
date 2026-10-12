import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'ar' | 'ku';

export interface Translations {
  [key: string]: {
    ar: string;
    ku: string;
  };
}

export const translations: Translations = {
  // Navigation & Headers
  nav_home: { ar: 'الرئيسية', ku: 'سەرەکی' },
  nav_search: { ar: 'البحث والفلترة', ku: 'گەڕان و فلتەر' },
  nav_categories: { ar: 'الأقسام والخصومات', ku: 'بەشەکان و داشکاندن' },
  nav_categories_short: { ar: 'الأقسام', ku: 'بەشەکان' },
  nav_orders: { ar: 'طلباتي', ku: 'داواکارییەکانم' },
  nav_orders_merchant: { ar: 'طلبات المتجر', ku: 'داواکارییەکانی فرۆشگا' },
  nav_cart: { ar: 'السلة', ku: 'سەبەتە' },
  nav_cart_full: { ar: 'سلة المشتريات', ku: 'سەبەتەی کڕین' },
  nav_wishlist: { ar: 'المفضلة', ku: 'دڵخوازەکان' },
  nav_wishlist_full: { ar: 'قائمة المفضلة', ku: 'لیستی دڵخوازەکان' },
  nav_profile: { ar: 'حسابي', ku: 'هەژمارەکەم' },
  nav_profile_full: { ar: 'الملف الشخصي', ku: 'پرۆفایلی کەسی' },
  nav_merchant: { ar: 'لوحة المتجر', ku: 'داشبۆردی بازرگان' },
  nav_admin: { ar: 'لوحة المدير', ku: 'داشبۆردی بەڕێوەبەر' },
  nav_support: { ar: 'فريق الدعم', ku: 'تیمی پشتیوانی' },
  nav_support_full: { ar: 'الدعم والمساعدة', ku: 'پشتیوانی و هاوکاری' },
  nav_notifications: { ar: 'الإشعارات والتنبيهات', ku: 'ئاگادارکردنەوەکان' },
  nav_chat: { ar: 'المحادثات الخاصة', ku: 'گفتوگۆ تایبەتەکان' },

  // General Buttons & Actions
  btn_add_to_cart: { ar: 'إضافة إلى السلة', ku: 'زیادکردن بۆ سەبەتە' },
  btn_add: { ar: 'أضف', ku: 'زیادکردن' },
  btn_added: { ar: 'تمت الإضافة!', ku: 'زیادکرا!' },
  btn_buy_now: { ar: 'شراء الآن', ku: 'کڕینی ئێستا' },
  btn_view_details: { ar: 'عرض التفاصيل', ku: 'بینینی وردەکاری' },
  btn_checkout: { ar: 'إتمام الشراء', ku: 'تەواوکردنی کڕین' },
  btn_continue_shopping: { ar: 'متابعة التسوق', ku: 'بەردەوامبوون لە کڕین' },
  btn_close: { ar: 'إغلاق', ku: 'داخستن' },
  btn_save: { ar: 'حفظ', ku: 'پاشەکەوتکردن' },
  btn_cancel: { ar: 'إلغاء', ku: 'هەڵوەشاندنەوە' },
  btn_confirm: { ar: 'تأكيد', ku: 'پشتڕاستکردنەوە' },
  btn_delete: { ar: 'حذف', ku: 'سڕینەوە' },
  btn_clear: { ar: 'تفريغ', ku: 'بەتاڵکردن' },
  btn_login: { ar: 'تسجيل الدخول', ku: 'چوونەژوورەوە' },
  btn_logout: { ar: 'تسجيل الخروج', ku: 'چوونەدەرەوە' },
  btn_guest_browse: { ar: 'تصفح كزائر', ku: 'گەڕان وەک میوان' },
  btn_chat_merchant: { ar: 'محادثة المتجر', ku: 'گفتوگۆ لەگەڵ فرۆشگا' },
  btn_all_in_stock: { ar: 'إضافة المتوفر للسلة', ku: 'زیادکردنی بەردەست بۆ سەبەتە' },

  // Social Share
  share_title: { ar: 'مشاركة المنتج', ku: 'هاوبەشکردنی بەرهەم' },
  share_quick: { ar: 'مشاركة سريعة', ku: 'هاوبەشکردنی خێرا' },
  share_social: { ar: 'مشاركة سريعة عبر وسائل التواصل', ku: 'هاوبەشکردنی خێرا لە تۆڕە کۆمەڵایەتییەکان' },
  share_whatsapp: { ar: 'مشاركة عبر واتساب', ku: 'هاوبەشکردن لە وەتسئاپ' },
  share_telegram: { ar: 'مشاركة عبر تليجرام', ku: 'هاوبەشکردن لە تەلەگرام' },
  share_copy_link: { ar: 'نسخ الرابط', ku: 'کۆپیکردنی بەستەر' },
  share_copied: { ar: 'تم نسخ الرابط بنجاح!', ku: 'بەستەری بەرهەم کۆپیکرا!' },
  share_hint: { ar: 'شارك المنتج مع أصدقائك بضغطة زر واحدة', ku: 'بەرهەمەکە بە یەک کلیک لەگەڵ هاوڕێکانت هاوبەش بکە' },

  // Badges & Statuses
  badge_cod: { ar: 'الدفع نقداً عند الاستلام', ku: 'پارەدان بە کاش لە کاتی وەرگرتن' },
  badge_cod_short: { ar: 'الدفع عند الاستلام', ku: 'پارەدان لە وەرگرتن' },
  badge_promoted: { ar: 'مُميّز', ku: 'تایبەت' },
  badge_new: { ar: 'جديد', ku: 'نوێ' },
  badge_discount: { ar: 'خصم', ku: 'داشکاندن' },
  badge_in_stock: { ar: 'متوفر', ku: 'بەردەستە' },
  badge_out_of_stock: { ar: 'نفدت الكمية', ku: 'نەماوە' },
  badge_free_delivery: { ar: 'توصيل موحد 5,000 د.ع', ku: 'گەیاندنی یەکگرتوو ٥,٠٠٠ د.ع' },
  badge_review: { ar: 'تقييم', ku: 'هەڵسەنگاندن' },

  // Currency & Values
  currency_iqd: { ar: 'د.ع', ku: 'د.ع' },
  currency_iqd_full: { ar: 'دينار عراقي', ku: 'دیناری عێراقی' },

  // Search & Filters
  search_placeholder: { ar: 'ابحث عن منتج، متجر، أو ماركة...', ku: 'بگەڕێ بۆ بەرهەم، فرۆشگا، یان مارکە...' },
  search_no_results: { ar: 'لم يتم العثور على نتائج', ku: 'هیچ ئەنجامێک نەدۆزرایەوە' },
  filter_all: { ar: 'الكل', ku: 'هەمووی' },
  filter_price: { ar: 'السعر', ku: 'نرخ' },
  filter_store: { ar: 'المتجر', ku: 'فرۆشگا' },
  filter_governorate: { ar: 'المحافظة', ku: 'پارێزگا' },

  // Home Page Specific
  home_search_placeholder: { ar: 'ابحث عن سيارات، عقارات، وظائف، هواتف، أجهزة، أو متاجر...', ku: 'بگەڕێ بۆ ئۆتۆمبێل، خانووبەرە، هەلی کار، مۆبایل، ئامێر، یان فرۆشگاکان...' },
  home_search_advanced: { ar: 'بحث متقدم', ku: 'گەڕانی پێشکەوتوو' },
  home_all_categories: { ar: 'كافة الأقسام', ku: 'هەموو بەشەکان' },
  home_cars: { ar: 'سيارات ومركبات', ku: 'ئۆتۆمبێل و بارھەڵگر' },
  home_real_estate_sale: { ar: 'عقارات للبيع', ku: 'خانووبەرە بۆ فرۆشتن' },
  home_real_estate_rent: { ar: 'عقارات للإيجار', ku: 'خانووبەرە بۆ کرێ' },
  home_jobs: { ar: 'وظائف شاغرة', ku: 'هەلی کاری بەردەست' },
  home_services: { ar: 'خدمات وصيانة', ku: 'خزمەتگوزاری و چاککردنەوە' },
  home_mobiles: { ar: 'موبايلات وإلكترونيات', ku: 'مۆبایل و ئەلیکترۆنیات' },
  home_appliances: { ar: 'أجهزة منزلية', ku: 'ئامێرەکانی ناوماڵ' },
  home_fashion: { ar: 'موضة وأزياء', ku: 'مۆدە و پۆشاک' },
  home_stores: { ar: 'المتاجر المعتمدة', ku: 'فرۆشگا باوەڕپێکراوەکان' },
  home_hero_badge: { ar: 'السوق العراقي الأصيل · موثوق ومضمون', ku: 'بازاڕی فەرمی عێراقی · باوەڕپێکراو و دڵنیا' },
  home_hero_reviews: { ar: 'تقييمات موثقة بمشتريات حقيقية', ku: 'هەڵسەنگاندنی باوەڕپێکراو بە کڕینی راستەقینە' },
  home_hero_delivery: { ar: 'توصيل لكافة المحافظات الـ 19', ku: 'گەیاندن بۆ هەموو ١٩ پارێزگاکە' },
  home_hero_browse: { ar: 'تصفح المنتجات الآن', ku: 'گەڕان بەناو بەرهەمەکاندا ئێستا' },
  home_hero_discounts: { ar: 'العروض والخصومات', ku: 'ئۆفەر و داشکاندنەکان' },
  home_featured_title: { ar: 'عروض مميزة / برعاية دكانة', ku: 'ئۆفەری تایبەت / بە سەرپەرشتی دکانە' },
  home_featured_desc: { ar: 'منتجات تجارية مختارة ومروجة بأولوية كبرى لكافة المحافظات', ku: 'بەرهەمی هەڵبژێردراو بە ئەولەویەت بۆ هەموو پارێزگاکان' },
  home_featured_more: { ar: 'المزيد', ku: 'زیاتر' },
  home_big_discounts: { ar: 'تخفيضات السوق العراقي الكبرى', ku: 'داشکاندنە گەورەکانی بازاڕی عێراق' },
  home_big_discounts_desc: { ar: 'منتجات أصلية بأسعار مخفضة لفترة محدودة', ku: 'بەرهەمی ئەسڵی بە نرخی کەمکراوە بۆ ماوەیەکی دیاریکراو' },
  home_disc_50_title: { ar: 'تخفيضات نصف السعر', ku: 'داشکاندنی نیوەی نرخ' },
  home_disc_50_desc: { ar: 'عسل طبيعي ومواد مختارة بنصف القيمة', ku: 'هەنگوینی سروشتی و کەرەستە بە نیوەی نرخ' },
  home_disc_30_title: { ar: 'عروض التمور والمناسبات', ku: 'ئۆفەری خورما و بۆنەکان' },
  home_disc_30_desc: { ar: 'تمور فاخرة وهدايا عراقية مميزة', ku: 'خورمای نایاب و دیاری تایبەت' },
  home_disc_10_title: { ar: 'تخفيضات أطقم الضيافة والمطاعم', ku: 'داشکاندنی میوانداری و چێشتخانە' },
  home_disc_10_desc: { ar: 'استكانات شاي ومشاوي طازجة', ku: 'ئیستکانی چا و کەبابی تازە' },
  home_all_products_title: { ar: 'جميع المنتجات في دكانة', ku: 'هەموو بەرهەمەکان لە دکانە' },
  home_products_available: { ar: 'منتج متاح', ku: 'بەرهەم بەردەستە' },
  home_no_products: { ar: 'لا توجد منتجات مطابقة للبحث', ku: 'هیچ بەرهەمێک لەگەڵ گەڕانەکە یەکناگرێتەوە' },
  home_no_products_desc: { ar: 'تحقق من الكلمات أو ابحث باسم عام مثل "تمور"، "شاي"، "عسل".', ku: 'وشەکان بپشکنە یان بە ناوی گشتی وەک "خورما"، "چا"، یان "هەنگوین" بگەڕێ.' },

  // Product Details Modal
  product_details_title: { ar: 'تفاصيل المنتج:', ku: 'وردەکاری بەرهەم:' },
  product_current_price: { ar: 'السعر الحالي:', ku: 'نرخی ئێستا:' },
  product_saved: { ar: 'وفرت', ku: 'پاشەکەوتت کرد' },
  product_cod_guarantee: { ar: 'الدفع نقداً عند الاستلام بعد معاينة المنتج والتحقق من جودته.', ku: 'پارەدان بە کاش لە کاتی وەرگرتن دوای پشکنینی بەرهەم و دڵنیابوون لە کوالێتی.' },
  product_chat_merchant: { ar: 'محادثة التاجر والاستفسار عن هذا المنتج', ku: 'گفتوگۆ لەگەڵ بازرگان دەربارەی ئەم بەرهەمە' },
  product_verified_reviews: { ar: 'تقييم موثق', ku: 'هەڵسەنگاندنی باوەڕپێکراو' },
  product_no_reviews: { ar: 'لا توجد تقييمات موثقة بعد لهذا المنتج', ku: 'تا ئێستا هیچ هەڵسەنگاندنێکی باوەڕپێکراو نییە بۆ ئەم بەرهەمە' },

  // Cart Drawer
  cart_title: { ar: 'سلة المشتريات', ku: 'سەبەتەی کڕین' },
  cart_empty: { ar: 'السلة فارغة حالياً', ku: 'سەبەتە لە ئێستادا بەتاڵە' },
  cart_empty_desc: { ar: 'ابدأ بالتسوق وأضف منتجاتك المفضلة للدفع عند الاستلام', ku: 'دەست بکە بە کڕین و بەرهەمە دڵخوازەکانت زیاد بکە بۆ پارەدان لە کاتی وەرگرتن' },
  cart_clear: { ar: 'تفريغ السلة', ku: 'بەتاڵکردنی سەبەتە' },
  cart_proceed: { ar: 'متابعة إتمام الطلب', ku: 'بەردەوامبوون بۆ تەواوکردنی داواکاری' },
  cart_subtotal: { ar: 'مجموع المنتجات:', ku: 'کۆی بەرهەمەکان:' },
  cart_delivery: { ar: 'أجور التوصيل:', ku: 'کرێی گەیاندن:' },
  cart_total: { ar: 'المجموع الكلي:', ku: 'کۆی گشتی:' },
  cart_store_package: { ar: 'شحنة متجر', ku: 'باری فرۆشگا' },

  // Categories Grid
  cat_grid_title: { ar: 'شبكة الأقسام والتصنيفات', ku: 'تۆڕی بەشەکان و پۆلێنکردن' },
  cat_grid_subtitle: { ar: 'اختر أي قسم لتصفح كافة المنتجات والإعلانات المندرجة تحته حصراً', ku: 'هەر بەشێک هەڵبژێرە بۆ گەڕان بەناو هەموو بەرهەمەکانی ژێر ئەو بەشە' },
  cat_grid_all: { ar: 'تصفح كل السوق', ku: 'گەڕان لە هەموو بازاڕ' },
  cat_grid_count: { ar: 'قسماً', ku: 'بەش' },

  // Wishlist
  wishlist_title: { ar: 'قائمة المنتجات المفضلة', ku: 'لیستی بەرهەمە دڵخوازەکان' },
  wishlist_subtitle: { ar: 'المنتجات التي قمت بحفظها للرجوع إليها وشرائها بسهولة للدفع عند الاستلام.', ku: 'ئەو بەرهەمانەی پاشەکەوتت کردوون بۆ کڕینی ئاسان و پارەدان لە کاتی وەرگرتن.' },
  wishlist_empty: { ar: 'قائمة المفضلة فارغة حالياً', ku: 'لیستی دڵخوازەکان لە ئێستادا بەتاڵە' },
  wishlist_empty_desc: { ar: 'لم تقم بإضافة أي منتجات إلى قائمة المفضلة بعد. انقر على رمز القلب على أي منتج لحفظه هنا.', ku: 'تا ئێستا هیچ بەرهەمت بۆ دڵخوازەکان زیاد نەکردووە. کرتە لە هێمای دڵ بکە بۆ پاشەکەوتکردن.' },
  wishlist_remove: { ar: 'إزالة من المفضلة', ku: 'سڕینەوە لە دڵخوازەکان' },
  wishlist_add: { ar: 'إضافة إلى المفضلة', ku: 'زیادکردن بۆ دڵخوازەکان' },
  wishlist_bulk_add: { ar: 'إضافة المتوفر للسلة', ku: 'زیادکردنی بەردەست بۆ سەبەتە' },
  wishlist_clear_all: { ar: 'تفريغ المفضلة', ku: 'بەتاڵکردنی دڵخوازەکان' },
  wishlist_items_count: { ar: 'منتج محفوظ', ku: 'بەرهەمی پاشەکەوتکراو' },

  // Orders
  order_tracking_title: { ar: 'متابعة طلباتي', ku: 'بەدواداچوونی داواکارییەکانم' },
  order_tracking_subtitle: { ar: 'متابعة فورية لحالة التوصيل والدفع نقداً عند الاستلام', ku: 'بەدواداچوونی خێرا بۆ گەیاندن و پارەدان لە کاتی وەرگرتن' },
  order_status_new: { ar: 'جديد', ku: 'نوێ' },
  order_status_confirmed: { ar: 'تم التأكيد', ku: 'پشتڕاستکراوە' },
  order_status_preparing: { ar: 'قيد التجهيز', ku: 'لە ئامادەکردندایە' },
  order_status_out_for_delivery: { ar: 'بالطريق للتوصيل', ku: 'لە ڕێگای گەیاندندایە' },
  order_status_delivered: { ar: 'تم الاستلام بنجاح', ku: 'بە سەرکەوتوویی وەرگیرا' },
  order_status_cancelled: { ar: 'ملغي', ku: 'هەڵوەشێنراوە' },
  order_timeline: { ar: 'سجل تتبع الشحنة والتحديثات اللحظية', ku: 'تۆماری بەدواداچوونی بار و نوێکارییە خێراکان' },

  // Financial & Checkout
  checkout_subtotal: { ar: 'مجموع المنتجات:', ku: 'کۆی بەرهەمەکان:' },
  checkout_delivery_fee: { ar: 'أجور التوصيل:', ku: 'کرێی گەیاندن:' },
  checkout_coupon_discount: { ar: 'خصم الكوبون:', ku: 'داشکاندنی کۆپۆن:' },
  checkout_final_total: { ar: 'المبلغ النهائي المطلوب للدفع عند الاستلام:', ku: 'کۆی کۆتایی بۆ پارەدان لە کاتی وەرگرتن:' },
  checkout_coupon_label: { ar: 'كود خصم المنصة (Admin Coupon):', ku: 'کۆدی داشکاندنی پلاتفۆرم:' },
  checkout_coupon_apply: { ar: 'تطبيق', ku: 'جێبەجێکردن' },

  // Roles
  role_admin: { ar: 'المدير الرئيسي', ku: 'بەڕێوەبەری سەرەکی' },
  role_merchant: { ar: 'تاجر دكانة', ku: 'بازرگانی دکانە' },
  role_customer: { ar: 'زبون', ku: 'کڕیار' },

  // Trust Bar & Policies
  top_trust_bar: { ar: 'سوق دُكَّانَة العراقي الرسمي · التوصيل لكافة المحافظات الـ 19 · الدفع نقداً عند الاستلام', ku: 'بازاڕی فەرمی دکانەی عێراقی · گەیاندن بۆ هەموو ١٩ پارێزگاکە · پارەدان بە کاش لە کاتی وەرگرتن' },
  splash_button: { ar: 'شاشة البداية', ku: 'پەڕەی دەستپێک' },
  policy_button: { ar: 'سياسات وتوافق Apple & Google', ku: 'یاسا و سیاسەتەکانی Apple & Google' },
  all_governorates_option: { ar: 'كافة المحافظات العراقية (19)', ku: 'هەموو پارێزگاکانی عێراق (١٩)' },

  // Language toasts
  lang_switch_ar: { ar: 'تم تحويل اللغة إلى العربية', ku: 'تم تحويل اللغة إلى العربية' },
  lang_switch_ku: { ar: 'زمان گۆڕدرا بۆ کوردی', ku: 'زمان گۆڕدرا بۆ کوردی' },
};

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: (key: string, fallback?: string) => string;
  toastMessage: string | null;
  showToast: (message: string) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANG_STORAGE_KEY = 'dukkana_selected_lang_v1';

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(LANG_STORAGE_KEY);
      if (saved === 'ku' || saved === 'ar') return saved;
    } catch {}
    return 'ar';
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync document language attribute and persist
  useEffect(() => {
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
      document.documentElement.lang = lang;
      // Both Arabic and Kurdish Sorani use RTL
      document.documentElement.dir = 'rtl';
    } catch {}
  }, [lang]);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(current => (current === message ? null : current));
    }, 2800);
  };

  const setLang = (newLang: Language) => {
    if (newLang === lang) return;
    setLangState(newLang);
    const message = newLang === 'ku' ? translations.lang_switch_ku.ku : translations.lang_switch_ar.ar;
    showToast(message);
  };

  const toggleLang = () => {
    const nextLang: Language = lang === 'ar' ? 'ku' : 'ar';
    setLang(nextLang);
  };

  const t = (key: string, fallback?: string): string => {
    if (translations[key] && translations[key][lang]) {
      return translations[key][lang];
    }
    if (fallback) return fallback;
    return translations[key]?.ar || key;
  };

  return (
    <LanguageContext.Provider
      value={{
        lang,
        setLang,
        toggleLang,
        t,
        toastMessage,
        showToast,
      }}
    >
      {children}
      {/* Global Toast Notification for Language Switch & Quick Actions */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-zinc-900/95 text-white backdrop-blur-md shadow-xl border border-zinc-700/50 text-xs sm:text-sm font-black whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
