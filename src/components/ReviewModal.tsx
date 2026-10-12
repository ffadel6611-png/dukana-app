import React, { useState } from 'react';
import { X, Star, ShieldCheck, BadgeCheck } from 'lucide-react';
import { useMarket } from '../context/MarketContext';
import { useAuth } from '../context/AuthContext';

interface ReviewModalProps {
  productId: string;
  orderId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  productId,
  orderId,
  isOpen,
  onClose,
}) => {
  const { products, submitReview } = useMarket();
  const { currentUser } = useAuth();

  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const product = products.find(p => p.id === productId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setErrorMsg('يجب تسجيل الدخول بالهاتف أولاً.');
      return;
    }

    const result = submitReview(
      currentUser.id,
      currentUser.displayName,
      currentUser.phone,
      productId,
      orderId,
      rating,
      comment
    );

    if (result.success) {
      setSuccessMsg(result.message);
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1500);
    } else {
      setErrorMsg(result.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 border border-zinc-200">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-1 rounded-lg text-zinc-400 hover:text-zinc-700 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-right mb-4">
          <div className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 mb-2">
            <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>عملية شراء موثقة (طلب #{orderId})</span>
          </div>
          <h3 className="text-base font-black text-zinc-900">تقييم منتج: {product?.name}</h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            تقييمك الصادق يساعد المشترين الآخرين في اختيار المنتجات الأفضل.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl mb-3">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl mb-3">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Star selector */}
          <div className="text-center py-2 bg-zinc-50 rounded-2xl border border-zinc-100">
            <span className="block text-zinc-500 font-bold mb-1">اختر عدد النجوم:</span>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  type="button"
                  key={star}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="p-1 cursor-pointer transition hover:scale-110"
                >
                  <Star
                    className={`w-7 h-7 ${
                      star <= (hoverRating || rating)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-zinc-200'
                    }`}
                  />
                </button>
              ))}
            </div>
            <span className="text-xs font-bold text-amber-700 mt-1 block">
              {rating === 5
                ? 'ممتاز جداً ★★★★★'
                : rating === 4
                ? 'جيد جداً ★★★★'
                : rating === 3
                ? 'متوسط ★★★'
                : rating === 2
                ? 'دون التوقع ★★'
                : 'سيء ★'}
            </span>
          </div>

          <div>
            <label className="block font-bold text-zinc-700 mb-1">
              تعليقك وتجربتك مع المنتج (اختياري)
            </label>
            <textarea
              rows={3}
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="اكتب ملاحظاتك بصدق حول الجودة، التغليف، والخدمة..."
              className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-purple-600/30"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl transition cursor-pointer shadow-xs"
          >
            نشر التقييم الموثق
          </button>
        </form>
      </div>
    </div>
  );
};
