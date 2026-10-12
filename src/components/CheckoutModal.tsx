import React, { useState, useEffect } from 'react';
import {
  X,
  Truck,
  Phone,
  User as UserIcon,
  MapPin,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Store,
  AlertCircle,
  Tag,
  Check,
} from 'lucide-react';
import { useMarket } from '../context/MarketContext';
import { useAuth } from '../context/AuthContext';
import { IRAQI_GOVERNORATES } from '../data/governorates';
import { IraqiGovernorate, Order } from '../types';
import { validateIraqiPhone } from '../utils/phoneAuth';
import { formatIQDTabular } from '../utils/currency';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderSuccess: (orders: Order[]) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  onOrderSuccess,
}) => {
  const {
    cart,
    getCartGroupsByMerchant,
    executeSplitCheckout,
    selectedGovernorate,
    validateAndApplyCoupon,
  } = useMarket();
  const { currentUser } = useAuth();

  const [recipientName, setRecipientName] = useState(currentUser?.displayName || '');
  const [recipientPhone, setRecipientPhone] = useState(
    currentUser?.phone.replace('+964', '0') || ''
  );
  const [governorate, setGovernorate] = useState<IraqiGovernorate>(
    (selectedGovernorate !== 'all' ? selectedGovernorate : currentUser?.governorate) || 'بغداد'
  );
  const [detailedAddress, setDetailedAddress] = useState(
    currentUser?.addresses[0]?.fullAddress || ''
  );
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Platform Coupon State (Admin-created coupons)
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountAmount: number;
    description?: string;
  } | null>(null);
  const [couponFeedback, setCouponFeedback] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (currentUser) {
        setRecipientName(currentUser.displayName || '');
        setRecipientPhone(currentUser.phone.replace('+964', '0'));
        if (currentUser.addresses && currentUser.addresses.length > 0) {
          const defaultAddr = currentUser.addresses.find(a => a.isDefault) || currentUser.addresses[0];
          setDetailedAddress(defaultAddr.fullAddress);
          if (defaultAddr.governorate) {
            setGovernorate(defaultAddr.governorate);
          }
        }
      }
      if (selectedGovernorate !== 'all') {
        setGovernorate(selectedGovernorate);
      }
    }
  }, [isOpen, currentUser, selectedGovernorate]);

  if (!isOpen) return null;

  const merchantGroups = getCartGroupsByMerchant();
  const selectedGovDetail = IRAQI_GOVERNORATES.find(g => g.id === governorate);
  const deliveryFeePerMerchant = selectedGovDetail ? selectedGovDetail.deliveryFee : 5000;
  const totalDeliveryFees = deliveryFeePerMerchant * merchantGroups.length;

  const subtotalSum = cart.reduce(
    (sum, item) => sum + item.product.finalPrice * item.quantity,
    0
  );

  const couponDiscount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const finalTotalSum = Math.max(0, subtotalSum - couponDiscount) + totalDeliveryFees;

  const handleApplyCoupon = (e: React.MouseEvent) => {
    e.preventDefault();
    setCouponFeedback(null);
    if (!couponCodeInput.trim()) {
      setCouponFeedback({ message: 'يرجى إدخال رمز الكوبون أولاً.', type: 'error' });
      return;
    }
    const res = validateAndApplyCoupon(couponCodeInput, subtotalSum);
    if (res.success && res.coupon) {
      setAppliedCoupon({
        code: res.coupon.code,
        discountAmount: res.discountAmount,
        description: res.coupon.description,
      });
      setCouponFeedback({ message: res.message, type: 'success' });
    } else {
      setCouponFeedback({ message: res.message, type: 'error' });
    }
  };

  const handleRemoveCoupon = (e: React.MouseEvent) => {
    e.preventDefault();
    setAppliedCoupon(null);
    setCouponCodeInput('');
    setCouponFeedback(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!recipientName.trim()) {
      setErrorMsg('يرجى إدخال اسم المستلم.');
      return;
    }

    const phoneVal = validateIraqiPhone(recipientPhone);
    if (!phoneVal.isValid) {
      setErrorMsg(phoneVal.errorMessage || 'رقم هاتف المستلم غير صحيح.');
      return;
    }

    if (!detailedAddress.trim()) {
      setErrorMsg('يرجى كتابة العنوان بالتفصيل (المنطقة، أقرب نقطة دالة).');
      return;
    }

    setIsSubmitting(true);

    const customerId = currentUser ? currentUser.id : `guest_${Date.now()}`;
    const customerName = currentUser ? currentUser.displayName : recipientName;
    const customerPhone = currentUser ? currentUser.phone : phoneVal.normalizedE164;

    const result = executeSplitCheckout(
      customerId,
      customerName,
      customerPhone,
      {
        recipientName: recipientName.trim(),
        recipientPhone: phoneVal.normalizedE164,
        governorate,
        detailedAddress: detailedAddress.trim(),
        notes: notes.trim() || undefined,
      },
      appliedCoupon ? { code: appliedCoupon.code, discountAmount: appliedCoupon.discountAmount } : undefined
    );

    setIsSubmitting(false);

    if (result.success) {
      onOrderSuccess(result.createdOrders);
      onClose();
    } else {
      setErrorMsg(result.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden my-6 border border-zinc-200">
        {/* Header */}
        <div className="p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-purple-700 text-white flex items-center justify-center font-bold">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-zinc-900">
                إتمام الطلب والدفع عند الاستلام
              </h2>
              <p className="text-xs text-zinc-500">
                تسجيل بيانات التوصيل لكافة المحافظات العراقية
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2 font-bold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Notice about split orders by merchant */}
          {merchantGroups.length > 1 && (
            <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 text-xs text-purple-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block mb-0.5">تنبيه تقسيم الطلبات:</span>
                سلتك تحتوي على منتجات من {merchantGroups.length} متاجر مستقلة. سيتم إصدار {merchantGroups.length} طلبات منفصلة برقم تتبع خاص لكل متجر، مع احتساب أجور توصيل كل تاجر.
              </div>
            </div>
          )}

          {/* Recipient Information Form */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-zinc-900 flex items-center gap-1.5">
              <UserIcon className="w-4 h-4 text-purple-700" />
              <span>معلومات المستلم وموقع التوصيل</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Recipient Name */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  اسم المستلم الكامل *
                </label>
                <input
                  type="text"
                  required
                  value={recipientName}
                  onChange={e => setRecipientName(e.target.value)}
                  placeholder="مثال: حيدر أحمد الجبوري"
                  className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-xl focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600 transition"
                />
              </div>

              {/* Recipient Phone (Iraqi) */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  رقم هاتف المستلم (العراق) *
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    name="recipient_phone"
                    required
                    autoComplete="off"
                    value={recipientPhone}
                    onChange={e => setRecipientPhone(e.target.value)}
                    placeholder="07XXXXXXXXX"
                    dir="ltr"
                    className="w-full px-3 py-2 text-xs text-left border border-zinc-200 rounded-xl focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600 transition font-mono"
                  />
                  <span className="absolute right-2 top-2 text-[10px] text-zinc-400 pointer-events-none">
                    IQ
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Iraqi Governorate Selection */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  المحافظة العراقية *
                </label>
                <div className="relative">
                  <select
                    value={governorate}
                    onChange={e => setGovernorate(e.target.value as IraqiGovernorate)}
                    className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-xl focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600 transition appearance-none bg-white cursor-pointer"
                  >
                    {IRAQI_GOVERNORATES.map(gov => (
                      <option key={gov.id} value={gov.id}>
                        {gov.nameAr} ({formatIQDTabular(gov.deliveryFee)} توصيل)
                      </option>
                    ))}
                  </select>
                  <MapPin className="w-3.5 h-3.5 text-purple-700 absolute left-3 top-2.5 pointer-events-none" />
                </div>
              </div>

              {/* Delivery duration notice */}
              <div className="flex items-center text-xs text-zinc-500 bg-zinc-50 border border-zinc-200 px-3 py-2 rounded-xl">
                <span>وقت التوصيل التقديري: </span>
                <span className="font-bold text-zinc-800 mr-1">
                  {selectedGovDetail?.avgDeliveryHours || '24-48 ساعة'}
                </span>
              </div>
            </div>

            {/* Detailed Address */}
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                العنوان بالتفصيل * (الحي، المحلة، الزقاق، الدار، أقرب نقطة دالة)
              </label>
              <textarea
                required
                rows={2}
                value={detailedAddress}
                onChange={e => setDetailedAddress(e.target.value)}
                placeholder="مثال: بغداد، الكرادة داخل، محلة 905، زقاق 12، دار 14، قرب جامع الأورفلي"
                className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-xl focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600 transition"
              />
            </div>

            {/* Optional Notes */}
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                ملاحظات إضافية للتوصيل (اختياري)
              </label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="مثال: الاتصال قبل نصف ساعة من الوصول"
                className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-xl focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600 transition"
              />
            </div>
          </div>

          {/* Payment Method Notice: COD ONLY */}
          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <span className="text-xs font-black text-emerald-950 block">
                  طريقة الدفع: الدفع عند الاستلام (COD)
                </span>
                <span className="text-[11px] text-emerald-800">
                  تدفع المبلغ نقداً بالدينار العراقي للمندوب بعد استلام الطلب ومعاينته.
                </span>
              </div>
            </div>
          </div>

          {/* Platform Coupon Code Section (Admin-managed discounts) */}
          <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-purple-950 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-purple-700" />
                <span>كوبون الخصم الخاص بالمنصة</span>
              </label>
              <span className="text-[11px] text-zinc-500 font-medium">
                كوبونات ترويجية معتمدة من إدارة دكانة
              </span>
            </div>

            {appliedCoupon ? (
              <div className="p-3 bg-white rounded-xl border border-emerald-300 flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                    <Check className="w-4 h-4 text-emerald-700" />
                  </div>
                  <div>
                    <span className="font-mono font-black text-xs text-purple-950 block">
                      {appliedCoupon.code}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-700">
                      وفرت {formatIQDTabular(appliedCoupon.discountAmount)} على طلبك
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  className="px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded-lg font-bold transition cursor-pointer"
                >
                  إلغاء الكوبون
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={couponCodeInput}
                  onChange={e => setCouponCodeInput(e.target.value.toUpperCase())}
                  placeholder="أدخل رمز الكوبون (مثال: DUKKANA10)"
                  className="flex-1 px-3 py-2 text-xs uppercase font-mono tracking-wider bg-white border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600 transition"
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs whitespace-nowrap"
                >
                  تطبيق
                </button>
              </div>
            )}

            {couponFeedback && (
              <div
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${
                  couponFeedback.type === 'success'
                    ? 'text-emerald-800 bg-emerald-50 border border-emerald-200'
                    : 'text-rose-800 bg-rose-50 border border-rose-200'
                }`}
              >
                {couponFeedback.message}
              </div>
            )}
          </div>

          {/* Order Summary Breakdown */}
          <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-2 text-xs">
            <h4 className="font-bold text-zinc-900 mb-2">ملخص الحساب الإجمالي:</h4>

            <div className="flex items-center justify-between text-zinc-600">
              <span>مجموع المنتجات:</span>
              <span className="font-bold text-zinc-800 tabular-nums">
                {formatIQDTabular(subtotalSum)}
              </span>
            </div>

            {appliedCoupon && appliedCoupon.discountAmount > 0 && (
              <div className="flex items-center justify-between text-emerald-700 font-bold">
                <span>خصم كوبون المنصة ({appliedCoupon.code}):</span>
                <span className="tabular-nums">
                  -{formatIQDTabular(appliedCoupon.discountAmount)}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between text-zinc-600">
              <span>
                أجور التوصيل ({merchantGroups.length} {merchantGroups.length > 1 ? 'متاجر' : 'متجر'} × {formatIQDTabular(deliveryFeePerMerchant)}):
              </span>
              <span className="font-bold text-zinc-800 tabular-nums">
                {formatIQDTabular(totalDeliveryFees)}
              </span>
            </div>

            <div className="pt-2 border-t border-zinc-200 flex items-center justify-between text-sm font-black text-purple-950">
              <span>المبلغ النهائي المطلوب للدفع نقداً:</span>
              <span className="text-lg tabular-nums">
                {formatIQDTabular(finalTotalSum)}
              </span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 bg-purple-700 hover:bg-purple-800 text-white font-black text-sm rounded-xl shadow-md shadow-purple-700/20 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <ShieldCheck className="w-5 h-5" />
            <span>تأكيد الطلب الآن</span>
          </button>
        </form>
      </div>
    </div>
  );
};
