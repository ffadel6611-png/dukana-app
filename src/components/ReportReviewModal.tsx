import React, { useState } from 'react';
import { X, Flag, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Review, ReviewReport } from '../types';
import { useMarket } from '../context/MarketContext';
import { useAuth } from '../context/AuthContext';

interface ReportReviewModalProps {
  review: Review | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReportReviewModal: React.FC<ReportReviewModalProps> = ({
  review,
  isOpen,
  onClose,
}) => {
  const { reportReview } = useMarket();
  const { currentUser } = useAuth();

  const [reason, setReason] = useState<ReviewReport['reason']>('inappropriate');
  const [details, setDetails] = useState('');
  const [msg, setMsg] = useState('');

  if (!isOpen || !review) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const reporterId = currentUser ? currentUser.id : 'anonymous_reporter';
    const reporterPhone = currentUser ? currentUser.phone : 'غير مسجل';

    const res = reportReview(review.id, reporterId, reporterPhone, reason, details);
    if (res.success) {
      setMsg(res.message);
      setTimeout(() => {
        setMsg('');
        onClose();
      }, 1500);
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
          <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-2">
            <Flag className="w-5 h-5" />
          </div>
          <h3 className="text-base font-black text-zinc-900">
            الإبلاغ عن تقييم مخالف للقواعد
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            وفق إرشادات Apple وGoogle، تخضع جميع بلاغات المحتوى لمراجعة فريق الرقابة لحذف المخالفات.
          </p>
        </div>

        {msg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl mb-3">
            {msg}
          </div>
        )}

        <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 mb-4 text-xs">
          <span className="text-zinc-400 block mb-0.5">التقييم المبلغ عنه:</span>
          <p className="text-zinc-700 italic font-medium">"{review.comment || 'بدون تعليق'}"</p>
          <span className="text-[10px] text-zinc-400 mt-1 block">بواسطة: {review.userName}</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-zinc-700 mb-1">سبب البلاغ *</label>
            <select
              value={reason}
              onChange={e => setReason(e.target.value as any)}
              className="w-full px-3 py-2 border border-zinc-200 rounded-xl bg-white focus:ring-2 focus:ring-purple-600/30 cursor-pointer"
            >
              <option value="inappropriate">محتوى غير لائق أو خادش للحياء</option>
              <option value="offensive">ألفاظ مسيئة أو سب وقذف</option>
              <option value="fake">تقييم مضلل أو كيدي أو تجاري مريب</option>
              <option value="spam">إعلانات ورسائل ترويجية مزعجة (Spam)</option>
              <option value="harassment">مضايقة أو تشهير</option>
              <option value="prohibited_item">محاولة ترويج لمنتجات محظورة</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-zinc-700 mb-1">
              تفاصيل إضافية لتوضيح المخالفة *
            </label>
            <textarea
              required
              rows={3}
              value={details}
              onChange={e => setDetails(e.target.value)}
              placeholder="اشرح لإدارة دكانة سبب المخالفة بدقة..."
              className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-purple-600/30"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition cursor-pointer shadow-xs"
          >
            إرسال البلاغ للإدارة للمراجعة
          </button>
        </form>
      </div>
    </div>
  );
};
