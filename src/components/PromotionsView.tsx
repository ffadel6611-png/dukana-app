import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  TrendingUp,
  Store,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  Send,
  HelpCircle,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  Tag,
  Flame,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useMarket } from '../context/MarketContext';
import { PromotionRequest, PromotionType, Product } from '../types';
import { formatIQDTabular } from '../utils/currency';

interface PromotionsViewProps {
  onOpenAuth?: () => void;
  onSelectProduct?: (product: Product) => void;
}

export const PromotionsView: React.FC<PromotionsViewProps> = ({ onOpenAuth, onSelectProduct }) => {
  const { currentUser, role, isAuthenticated, isMerchant, isAdmin } = useAuth();
  const { products, merchants, settings } = useMarket();

  const [activeTab, setActiveTab] = useState<'request' | 'my_requests' | 'pricing'>('request');
  const [myRequests, setMyRequests] = useState<PromotionRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);

  // Form State
  const [selectedProductId, setSelectedProductId] = useState('');
  const [promoType, setPromoType] = useState<PromotionType>('product');
  const [durationDays, setDurationDays] = useState(7);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Merchant products
  const merchantStore = merchants.find(m => m.userId === currentUser?.id);
  const merchantProducts = products.filter(
    p => p.merchantId === merchantStore?.id || p.merchantId === currentUser?.id
  );

  // Calculate pricing: 5,000 IQD / day base rate with automatic duration discounts
  const basePricePerDay = 5000;
  const calculatePricingDetails = (days: number, type: PromotionType) => {
    const safeDays = Math.max(1, days);
    let typeMultiplier = 1;
    if (type === 'store') typeMultiplier = 1.3;
    if (type === 'story') typeMultiplier = 1.5;

    const subtotal = Math.round(basePricePerDay * safeDays * typeMultiplier);
    let discountPct = 0;
    let badgeText = '';

    if (safeDays >= 14) {
      discountPct = 25;
      badgeText = 'خصم الأسبوعين الأكثر طلباً (وفر 25%)';
    } else if (safeDays >= 7) {
      discountPct = 15;
      badgeText = 'خصم الأسبوع (وفر 15%)';
    }

    const discountAmount = Math.round((subtotal * discountPct) / 100);
    const finalTotal = subtotal - discountAmount;

    return {
      dailyRate: basePricePerDay,
      days: safeDays,
      subtotal,
      discountPct,
      badgeText,
      discountAmount,
      finalTotal,
    };
  };

  const pricing = calculatePricingDetails(durationDays, promoType);
  const totalPrice = pricing.finalTotal;

  // Fetch merchant requests
  const fetchMyRequests = async () => {
    if (!currentUser) return;
    setIsLoadingRequests(true);
    try {
      const res = await fetch(`/api/promotions?merchantId=${currentUser.id}`);
      if (res.ok) {
        const data = await res.json();
        setMyRequests(data.promotions || []);
      }
    } catch (err) {
      console.warn('Failed to load promotions:', err);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchMyRequests();
    }
  }, [currentUser, isAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitSuccess('');

    if (promoType === 'product' && !selectedProductId) {
      setSubmitError('يرجى اختيار المنتج المراد ترويجه.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantId: currentUser?.id,
          merchantStoreId: merchantStore?.id,
          productId: promoType === 'product' ? selectedProductId : undefined,
          promoType,
          durationDays,
          priceIqd: totalPrice,
          notes,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSubmitSuccess(data.message || 'تم إرسال طلب الترويج بنجاح!');
        setSelectedProductId('');
        setNotes('');
        setIsPreviewOpen(false);
        fetchMyRequests();
        setTimeout(() => setActiveTab('my_requests'), 1500);
      } else {
        setSubmitError(data.error || 'فشل إرسال طلب الترويج');
      }
    } catch (err: any) {
      setSubmitError(err.message || 'تعذر الاتصال بالخادم');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedProduct = products.find(p => p.id === selectedProductId);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-in fade-in duration-200">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-900 text-white p-6 sm:p-10 shadow-xl border border-purple-800/40">
        <div className="max-w-2xl space-y-3 z-10 relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-bold text-amber-300">
            <Sparkles className="w-3.5 h-3.5" />
            <span>نظام الترويج الرسمي في دكانة</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
            خلّي منتجاتك توصل لزبائن أكثر 🚀
          </h1>

          <p className="text-xs sm:text-sm text-purple-200 leading-relaxed">
            ضاعف مبيعاتك وظهورك في الصفحة الأولى وقوائم البحث والأقسام الأكثر زيارة في عموم محافظات العراق.
          </p>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -left-10 -bottom-10 w-72 h-72 rounded-full bg-purple-600/30 blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -top-10 w-60 h-60 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-zinc-200 pb-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('request')}
          className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition cursor-pointer shrink-0 flex items-center gap-2 ${
            activeTab === 'request'
              ? 'bg-purple-700 text-white shadow-sm'
              : 'text-zinc-600 hover:text-purple-700 hover:bg-zinc-100'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>اطلب ترويجاً</span>
        </button>

        <button
          onClick={() => setActiveTab('my_requests')}
          className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition cursor-pointer shrink-0 flex items-center gap-2 relative ${
            activeTab === 'my_requests'
              ? 'bg-purple-700 text-white shadow-sm'
              : 'text-zinc-600 hover:text-purple-700 hover:bg-zinc-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>طلباتي ({myRequests.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('pricing')}
          className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition cursor-pointer shrink-0 flex items-center gap-2 ${
            activeTab === 'pricing'
              ? 'bg-purple-700 text-white shadow-sm'
              : 'text-zinc-600 hover:text-purple-700 hover:bg-zinc-100'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>أنواع وأسعار الترويج</span>
        </button>
      </div>

      {/* TAB 1: REQUEST PROMOTION FORM */}
      {activeTab === 'request' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 bg-white rounded-3xl border border-zinc-200 p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-lg font-black text-zinc-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-700" />
                <span>تقديم طلب ترويج جديد</span>
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                اختر نوع الترويج ومدته وسيقوم فريق إدارة دكانة بمراجعة الطلب وتفعيله فوراً
              </p>
            </div>

            {!isAuthenticated ? (
              <div className="p-6 rounded-2xl bg-purple-50 border border-purple-200 text-center space-y-3">
                <p className="text-xs font-bold text-purple-900">
                  يرجى تسجيل الدخول بحساب تاجر للبدء بطلب ترويج لمنتجاتك
                </p>
                <button
                  onClick={onOpenAuth}
                  className="px-6 py-2.5 bg-purple-700 text-white font-black rounded-xl text-xs hover:bg-purple-800 transition cursor-pointer"
                >
                  تسجيل الدخول / إنشاء حساب تاجر
                </button>
              </div>
            ) : !isMerchant && !isAdmin ? (
              <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 text-center space-y-2">
                <AlertCircle className="w-6 h-6 text-amber-600 mx-auto" />
                <h3 className="text-sm font-black text-amber-900">ترويج المنتجات مخصص للتجار</h3>
                <p className="text-xs text-amber-800">
                  حسابك الحالي زبون. لترويج منتجاتك يلزم توثيق متجرك كتاجر معتمد في سوق دكانة.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5 text-xs">
                {/* 1. Promotion Type Selection */}
                <div>
                  <label className="block font-bold text-zinc-800 mb-2">1. نوع الترويج المتاح *</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setPromoType('product')}
                      className={`p-4 rounded-2xl border text-right transition cursor-pointer flex flex-col justify-between h-28 ${
                        promoType === 'product'
                          ? 'border-purple-600 bg-purple-50/70 ring-2 ring-purple-600/20'
                          : 'border-zinc-200 hover:border-zinc-300 bg-zinc-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <Flame className={`w-5 h-5 ${promoType === 'product' ? 'text-purple-700' : 'text-zinc-400'}`} />
                        <span className="text-[10px] font-black bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                          الأكثر طلباً
                        </span>
                      </div>
                      <div>
                        <h4 className="font-black text-zinc-900 text-xs">ترويج منتج محدد</h4>
                        <span className="text-[11px] text-zinc-500">تمييز وشارة مروّج</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPromoType('store')}
                      className={`p-4 rounded-2xl border text-right transition cursor-pointer flex flex-col justify-between h-28 ${
                        promoType === 'store'
                          ? 'border-purple-600 bg-purple-50/70 ring-2 ring-purple-600/20'
                          : 'border-zinc-200 hover:border-zinc-300 bg-zinc-50/50'
                      }`}
                    >
                      <Store className={`w-5 h-5 ${promoType === 'store' ? 'text-purple-700' : 'text-zinc-400'}`} />
                      <div>
                        <h4 className="font-black text-zinc-900 text-xs">ترويج المتجر كاملاً</h4>
                        <span className="text-[11px] text-zinc-500">في صدارة دليل المتاجر</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPromoType('story')}
                      className={`p-4 rounded-2xl border text-right transition cursor-pointer flex flex-col justify-between h-28 ${
                        promoType === 'story'
                          ? 'border-purple-600 bg-purple-50/70 ring-2 ring-purple-600/20'
                          : 'border-zinc-200 hover:border-zinc-300 bg-zinc-50/50'
                      }`}
                    >
                      <Sparkles className={`w-5 h-5 ${promoType === 'story' ? 'text-purple-700' : 'text-zinc-400'}`} />
                      <div>
                        <h4 className="font-black text-zinc-900 text-xs">ستوري إعلاني</h4>
                        <span className="text-[11px] text-zinc-500">في شريط ستوريات دكانة</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* 2. Product Selection (if product promo) */}
                {promoType === 'product' && (
                  <div>
                    <label className="block font-bold text-zinc-800 mb-1.5">
                      2. اختر المنتج من متجرك *
                    </label>
                    {merchantProducts.length === 0 ? (
                      <p className="text-amber-800 bg-amber-50 p-3 rounded-xl border border-amber-200">
                        لا توجد لديك منتجات معتمدة حالياً. يرجى إضافة منتجات في لوحة المتجر أولاً.
                      </p>
                    ) : (
                      <select
                        value={selectedProductId}
                        onChange={e => setSelectedProductId(e.target.value)}
                        required
                        className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600"
                      >
                        <option value="">-- اختر المنتج المراد ترويجه --</option>
                        {merchantProducts.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({formatIQDTabular(p.finalPrice)})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                {/* 3. Duration Selection */}
                <div>
                  <label className="block font-bold text-zinc-800 mb-1.5">
                    3. مدة الترويج المطلوبة *
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {[
                      { days: 3, label: '3 أيام' },
                      { days: 7, label: 'أسبوع (7 أيام)' },
                      { days: 14, label: 'أسبوعين' },
                      { days: 30, label: 'شهر كامل' },
                    ].map(d => (
                      <button
                        key={d.days}
                        type="button"
                        onClick={() => setDurationDays(d.days)}
                        className={`py-2.5 px-3 rounded-xl border font-bold text-xs transition cursor-pointer text-center ${
                          durationDays === d.days
                            ? 'border-purple-700 bg-purple-700 text-white shadow-xs'
                            : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Notes */}
                <div>
                  <label className="block font-bold text-zinc-800 mb-1">
                    4. ملاحظات أو رغبات إضافية (اختياري)
                  </label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={2}
                    placeholder="أي توجيهات ترغب في توضيحها لإدارة المنصة..."
                    className="w-full px-3.5 py-2.5 border border-zinc-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600"
                  />
                </div>

                {submitError && (
                  <div className="p-3 bg-rose-50 text-rose-800 rounded-xl border border-rose-200 text-xs">
                    {submitError}
                  </div>
                )}

                {submitSuccess && (
                  <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{submitSuccess}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsPreviewOpen(true)}
                    className="w-full sm:w-auto px-5 py-3 border border-zinc-300 hover:bg-zinc-50 font-bold rounded-xl text-zinc-700 transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    <span>معاينة الطلب</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting || (promoType === 'product' && !selectedProductId)}
                    className="flex-1 w-full py-3 bg-purple-700 hover:bg-purple-800 text-white font-black rounded-xl transition cursor-pointer shadow-md shadow-purple-700/20 flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    <span>{isSubmitting ? 'جاري الإرسال...' : `إرسال طلب الترويج (${formatIQDTabular(totalPrice)})`}</span>
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Right Summary Card */}
          <div className="lg:col-span-4 bg-gradient-to-b from-purple-50 to-white rounded-3xl border border-purple-200 p-6 space-y-5 text-xs">
            <h3 className="font-black text-sm text-purple-950 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-700" />
              <span>ملخص التكلفة والمزايا</span>
            </h3>

            <div className="space-y-3 bg-white p-4 rounded-2xl border border-purple-100">
              <div className="flex items-center justify-between text-zinc-600">
                <span>نوع الترويج:</span>
                <span className="font-bold text-zinc-900">
                  {promoType === 'product' ? 'منتج مميز' : promoType === 'store' ? 'متجر معتمد' : 'ستوري إعلاني'}
                </span>
              </div>
              <div className="flex items-center justify-between text-zinc-600">
                <span>المدة المحددة:</span>
                <span className="font-bold text-zinc-900">{durationDays} أيام (5,000 د.ع / اليوم)</span>
              </div>
              <div className="flex items-center justify-between text-zinc-600">
                <span>المبلغ قبل الخصم:</span>
                <span className="font-bold text-zinc-800 tabular-nums">{formatIQDTabular(pricing.subtotal)}</span>
              </div>

              {pricing.discountPct > 0 ? (
                <div className="space-y-1 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl">
                  <div className="flex items-center justify-between text-emerald-800 text-[11px] font-black">
                    <span className="inline-flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                      <span>{pricing.badgeText}</span>
                    </span>
                    <span className="tabular-nums font-bold">-{formatIQDTabular(pricing.discountAmount)}</span>
                  </div>
                  <div className="text-[10px] text-emerald-700">
                    تم تطبيق خصم تلقائي {pricing.discountPct}% لتشجيع النمو التجاري
                  </div>
                </div>
              ) : (
                <div className="text-[10px] text-zinc-400 bg-zinc-50 p-2 rounded-lg">
                  💡 اختر 7 أيام أو أكثر للاستفادة من خصم 15% أو 14 يوماً لخصم 25% تلقائياً
                </div>
              )}

              <div className="border-t border-dashed border-zinc-200 pt-3 flex items-center justify-between">
                <div>
                  <span className="font-black text-zinc-900 block text-xs">المبلغ النهائي المستحق:</span>
                  <span className="text-[10px] text-zinc-400">بالدينار العراقي (IQD)</span>
                </div>
                <span className="text-base font-black text-purple-900 tabular-nums">
                  {formatIQDTabular(pricing.finalTotal)}
                </span>
              </div>
            </div>

            <div className="space-y-2 text-zinc-600">
              <h4 className="font-bold text-zinc-900">ماذا ستحصل بعد الاعتماد؟</h4>
              <ul className="space-y-1.5 text-[11px]">
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>ظهور شارة «مروّج» ذهبية على بطاقة المنتج.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>أولوية الترتيب في نتائج البحث وفي القسم الخاص.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>عرض في قسم «المنتجات المميزة والمروجة» بالصفحة الرئيسية.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>الدفع نقداً أو حسب الاتفاق مع الإدارة عند الاعتماد.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MY PROMOTION REQUESTS */}
      {activeTab === 'my_requests' && (
        <div className="bg-white rounded-3xl border border-zinc-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-zinc-900">سجل طلبات الترويج</h2>
              <p className="text-xs text-zinc-500">تابع حالة طلباتك ومواعيد بدايتها وانتهائها</p>
            </div>
            <button
              onClick={fetchMyRequests}
              className="px-3.5 py-1.5 text-xs text-purple-700 font-bold bg-purple-50 rounded-xl hover:bg-purple-100 transition cursor-pointer"
            >
              تحديث القائمة
            </button>
          </div>

          {isLoadingRequests ? (
            <p className="text-xs text-zinc-400 py-8 text-center">جاري تحميل سجل الطلبات...</p>
          ) : myRequests.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <Clock className="w-10 h-10 text-zinc-300 mx-auto" />
              <h3 className="text-sm font-bold text-zinc-800">لا توجد طلبات ترويج مسجلة بعد</h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                يمكنك التقديم الآن لترويج أحد منتجاتك أو متجرك لتصل إلى آلاف الزبائن في العراق.
              </p>
              <button
                onClick={() => setActiveTab('request')}
                className="px-5 py-2.5 bg-purple-700 text-white font-bold rounded-xl text-xs hover:bg-purple-800 transition cursor-pointer"
              >
                تقديم طلب ترويج جديد
              </button>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {myRequests.map(req => {
                const prod = products.find(p => p.id === req.productId);
                return (
                  <div key={req.id} className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-3">
                      {prod?.imageUrl ? (
                        <img
                          src={prod.imageUrl}
                          alt={prod.name}
                          className="w-14 h-14 rounded-2xl object-cover border border-zinc-200 shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center font-black shrink-0">
                          {req.promoType === 'store' ? <Store className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
                        </div>
                      )}

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-zinc-900 text-sm">
                            {prod?.name || (req.promoType === 'store' ? 'ترويج متجر' : 'ترويج ستوري')}
                          </h4>
                          <span className="text-[10px] text-zinc-400 font-mono">#{req.id.slice(-6)}</span>
                        </div>
                        <p className="text-zinc-500">
                          المدة: <span className="font-bold text-zinc-800">{req.durationDays} أيام</span> · التكلفة:{' '}
                          <span className="font-bold text-purple-800">{formatIQDTabular(req.priceIqd)}</span>
                        </p>
                        {req.startDate && req.endDate && (
                          <p className="text-[11px] text-emerald-700 font-medium">
                            فترة الترويج: من {new Date(req.startDate).toLocaleDateString('ar-IQ')} إلى{' '}
                            {new Date(req.endDate).toLocaleDateString('ar-IQ')}
                          </p>
                        )}
                        {req.status === 'rejected' && req.rejectionReason && (
                          <p className="text-[11px] text-rose-700 font-bold bg-rose-50 px-2 py-1 rounded-lg">
                            سبب الرفض: {req.rejectionReason}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0">
                      {req.status === 'pending' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>بانتظار المراجعة</span>
                        </span>
                      )}
                      {req.status === 'approved' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>مقبول وقيد التنفيذ</span>
                        </span>
                      )}
                      {req.status === 'rejected' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>مرفوض</span>
                        </span>
                      )}
                      {req.status === 'completed' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-zinc-100 text-zinc-700 border border-zinc-200">
                          <span>مكتمل</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PRICING & PROMOTION TYPES */}
      {activeTab === 'pricing' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="bg-white rounded-3xl border border-zinc-200 p-6 space-y-4 shadow-xs relative overflow-hidden">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <Flame className="w-6 h-6" />
              </div>
              <h3 className="font-black text-base text-zinc-900">ترويج منتج فردي</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                يظهر المنتج في مقدمة نتائج البحث، في شريط المنتجات المميزة، ومزود بشارة «مروّج» تجذب الزبائن فوراً.
              </p>
              <div className="border-t border-zinc-100 pt-4">
                <span className="text-[11px] text-zinc-400 block">السعر المعتمد:</span>
                <span className="text-lg font-black text-purple-700">
                  {formatIQDTabular(settings.promotionPrice || 15000)} / أسبوع
                </span>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-white rounded-3xl border-2 border-purple-500 p-6 space-y-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-4 left-4 bg-purple-700 text-white text-[10px] font-black px-2.5 py-1 rounded-full">
                شامل
              </div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <Store className="w-6 h-6" />
              </div>
              <h3 className="font-black text-base text-zinc-900">ترويج متجر متكامل</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                تثبيت متجرك وعلامتك التجارية في صدارة المتاجر المعتمدة، مع زيادة وصول الزبائن لكافة منتجات المتجر.
              </p>
              <div className="border-t border-zinc-100 pt-4">
                <span className="text-[11px] text-zinc-400 block">السعر المعتمد:</span>
                <span className="text-lg font-black text-purple-700">
                  {formatIQDTabular(Math.round((settings.promotionPrice || 15000) * 1.3))} / أسبوع
                </span>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-white rounded-3xl border border-zinc-200 p-6 space-y-4 shadow-xs relative overflow-hidden">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="font-black text-base text-zinc-900">ستوري إعلاني في الرئيسية</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                ستوري فيديو أو صورة تظهر لجميع زوار دكانة في الصفحة الرئيسية أعلى المنتجات مع زر شراء مباشر.
              </p>
              <div className="border-t border-zinc-100 pt-4">
                <span className="text-[11px] text-zinc-400 block">السعر المعتمد:</span>
                <span className="text-lg font-black text-purple-700">
                  {formatIQDTabular(Math.round((settings.promotionPrice || 15000) * 1.5))} / أسبوع
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
