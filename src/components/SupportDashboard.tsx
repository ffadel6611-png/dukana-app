import React, { useState } from 'react';
import {
  HelpCircle,
  MessageCircle,
  Flag,
  CheckCircle2,
  Clock,
  Send,
  Phone,
  ShieldCheck,
  AlertCircle,
  User,
  Filter,
} from 'lucide-react';
import { useMarket } from '../context/MarketContext';
import { useAuth } from '../context/AuthContext';
import { SupportInquiry, ADMIN_PHONE_E164 } from '../types';

export const SupportDashboard: React.FC = () => {
  const { inquiries, replySupportInquiry, reports, setReviewStatus, resolveReport, settings } = useMarket();
  const { currentUser, isSupport, isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<'inquiries' | 'reports'>('inquiries');
  const [selectedInquiry, setSelectedInquiry] = useState<SupportInquiry | null>(null);
  const [replyText, setReplyText] = useState('');
  const [inquiryFilter, setInquiryFilter] = useState<'all' | 'new' | 'resolved'>('all');

  if (!isSupport || currentUser?.phone !== ADMIN_PHONE_E164) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200">
          <HelpCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-zinc-900">لوحة فريق الدعم محمية</h2>
        <p className="text-xs text-zinc-600 leading-relaxed">
          هذه الصفحة مخصصة حصرياً لفريق الدعم المرتبط بالرقم المعتمد رسمياً لدى إدارة المنصة.
        </p>
      </div>
    );
  }

  const pendingReports = reports.filter(r => r.status === 'pending');
  const newInquiriesCount = inquiries.filter(i => i.status === 'new').length;

  const filteredInquiries = inquiries.filter(i => {
    if (inquiryFilter === 'new') return i.status === 'new';
    if (inquiryFilter === 'resolved') return i.status === 'resolved';
    return true;
  });

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInquiry || !replyText.trim()) return;

    replySupportInquiry(selectedInquiry.id, replyText);
    setReplyText('');
    setSelectedInquiry(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-purple-800 to-indigo-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-purple-950/20 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-bold text-purple-200">
              بوابة فريق الدعم الفني وخدمة العملاء المعتمدة
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black">مركز دعم دكانة وإدارة البلاغات</h1>
          <p className="text-xs text-purple-200 mt-1 max-w-xl">
            متابعة استفسارات الزبائن، حل مشاكل الطلبات والشحن، فحص بلاغات المحتوى المخالف، وخدمة عملاء كافة المحافظات الـ 19.
          </p>
          <div className="mt-2 text-[11px] text-purple-300 font-mono" dir="ltr">
            هاتف الدعم الرسمي: {settings.supportWhatsApp}
          </div>
        </div>

        {/* Stats Summary Badges */}
        <div className="flex flex-wrap gap-2 text-xs">
          {newInquiriesCount > 0 && (
            <div className="bg-amber-400/20 text-amber-200 border border-amber-400/30 px-3.5 py-2 rounded-2xl font-bold flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-300" />
              <span>{newInquiriesCount} استفسارات بانتظار الرد</span>
            </div>
          )}
          {pendingReports.length > 0 && (
            <div className="bg-rose-500/20 text-rose-200 border border-rose-500/30 px-3.5 py-2 rounded-2xl font-bold flex items-center gap-1.5">
              <Flag className="w-4 h-4 text-rose-300" />
              <span>{pendingReports.length} بلاغات محتوى قيد التدقيق</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200 pb-2">
        <button
          onClick={() => setActiveTab('inquiries')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer transition ${
            activeTab === 'inquiries'
              ? 'bg-purple-700 text-white shadow-sm'
              : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          <span>تذاكر واستفسارات الزبائن ({inquiries.length})</span>
          {newInquiriesCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-amber-400 text-purple-950 font-black text-[10px] flex items-center justify-center">
              {newInquiriesCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer transition ${
            activeTab === 'reports'
              ? 'bg-purple-700 text-white shadow-sm'
              : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
          }`}
        >
          <Flag className="w-4 h-4" />
          <span>بلاغات التقييمات والنزاعات ({reports.length})</span>
          {pendingReports.length > 0 && (
            <span className="w-5 h-5 rounded-full bg-rose-500 text-white font-black text-[10px] flex items-center justify-center">
              {pendingReports.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: Inquiries List */}
      {activeTab === 'inquiries' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setInquiryFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                  inquiryFilter === 'all'
                    ? 'bg-zinc-900 text-white'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                الكل
              </button>
              <button
                onClick={() => setInquiryFilter('new')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                  inquiryFilter === 'new'
                    ? 'bg-amber-600 text-white'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                جديد بانتظار الرد ({newInquiriesCount})
              </button>
              <button
                onClick={() => setInquiryFilter('resolved')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                  inquiryFilter === 'resolved'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                تم الرد والحل
              </button>
            </div>

            <span className="text-xs text-zinc-400">
              إجمالي التذاكر: {filteredInquiries.length}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Inquiries List */}
            <div className="lg:col-span-6 space-y-3">
              {filteredInquiries.length === 0 ? (
                <div className="bg-white rounded-2xl border border-zinc-200 p-8 text-center text-zinc-400 text-xs">
                  لا توجد استفسارات في هذا التصنيف.
                </div>
              ) : (
                filteredInquiries.map(inq => (
                  <div
                    key={inq.id}
                    onClick={() => {
                      setSelectedInquiry(inq);
                      setReplyText(inq.reply || '');
                    }}
                    className={`p-4 bg-white rounded-2xl border transition cursor-pointer text-xs space-y-2 ${
                      selectedInquiry?.id === inq.id
                        ? 'border-purple-600 shadow-md ring-2 ring-purple-600/10'
                        : 'border-zinc-200 hover:border-purple-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-800 font-bold flex items-center justify-center text-xs">
                          {inq.senderName.charAt(0) || 'م'}
                        </div>
                        <div>
                          <span className="font-bold text-zinc-900 block">{inq.senderName}</span>
                          <span className="text-[10px] text-zinc-400 font-mono" dir="ltr">{inq.senderPhone}</span>
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          inq.status === 'resolved'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {inq.status === 'resolved' ? 'تم الرد' : 'جديد'}
                      </span>
                    </div>

                    <h4 className="font-bold text-zinc-900 text-sm">{inq.subject}</h4>
                    <p className="text-zinc-600 line-clamp-2 text-xs leading-relaxed">
                      {inq.message}
                    </p>

                    <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-[10px] text-zinc-400">
                      <span>التصنيف: {inq.category === 'order' ? 'طلب توصيل' : inq.category === 'payment' ? 'دفع' : 'استفسار عام'}</span>
                      <span>{new Date(inq.createdAt).toLocaleDateString('ar-IQ')}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Selected Inquiry Detail & Response Panel */}
            <div className="lg:col-span-6">
              {selectedInquiry ? (
                <div className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-4 shadow-sm text-xs sticky top-24">
                  <div className="border-b border-zinc-100 pb-3 flex items-center justify-between">
                    <div>
                      <h3 className="font-black text-sm text-zinc-900">{selectedInquiry.subject}</h3>
                      <div className="text-[11px] text-zinc-500 mt-0.5">
                        المرسل: {selectedInquiry.senderName} ({selectedInquiry.senderPhone})
                      </div>
                    </div>
                    <a
                      href={`https://wa.me/${selectedInquiry.senderPhone.replace(/\D/g, '')}?text=${encodeURIComponent('مرحباً، معك فريق دعم تطبيق دكانة بخصوص تذكرتك.')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs flex items-center gap-1 border border-emerald-200"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>واتساب</span>
                    </a>
                  </div>

                  {/* Customer message */}
                  <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200 space-y-1">
                    <span className="text-[11px] font-bold text-zinc-500 block">نص رسالة الزبون:</span>
                    <p className="text-zinc-800 leading-relaxed text-xs">{selectedInquiry.message}</p>
                    <span className="text-[10px] text-zinc-400 block pt-1">
                      بتاريخ: {new Date(selectedInquiry.createdAt).toLocaleString('ar-IQ')}
                    </span>
                  </div>

                  {/* Previous reply if exists */}
                  {selectedInquiry.reply && (
                    <div className="p-3.5 bg-purple-50 rounded-xl border border-purple-200 space-y-1">
                      <div className="flex items-center gap-1.5 text-purple-900 font-bold text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-purple-700" />
                        <span>رد فريق الدعم المسجل:</span>
                      </div>
                      <p className="text-purple-950 text-xs leading-relaxed">{selectedInquiry.reply}</p>
                      {selectedInquiry.repliedAt && (
                        <span className="text-[10px] text-purple-700 block">
                          تم الرد في: {new Date(selectedInquiry.repliedAt).toLocaleString('ar-IQ')}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Reply Form */}
                  <form onSubmit={handleSendReply} className="space-y-3 pt-2 border-t border-zinc-100">
                    <label className="block font-bold text-zinc-800 text-xs">
                      {selectedInquiry.reply ? 'تحديث الرد على الزبون:' : 'إرسال رد رسمي من فريق الدعم:'}
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      placeholder="اكتب رد فريق الدعم بكل مهنية ووضوح..."
                      className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-xl focus:ring-2 focus:ring-purple-600/30"
                    />
                    <button
                      type="submit"
                      className="w-full py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-sm transition"
                    >
                      <Send className="w-4 h-4" />
                      <span>حفظ وإرسال الرد للزبون</span>
                    </button>
                  </form>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-zinc-200 p-8 text-center text-zinc-400 text-xs">
                  اختر استفساراً من القائمة لعرض كامل التفاصيل والرد عليه.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Reports & Moderation */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-zinc-200 p-5">
            <h3 className="font-black text-sm text-zinc-900 mb-1 flex items-center gap-2">
              <Flag className="w-4 h-4 text-rose-600" />
              <span>مراجعة بلاغات التقييمات والمحتوى المخالف</span>
            </h3>
            <p className="text-xs text-zinc-500 mb-4">
              فحص التقييمات المبلغ عنها من قبل المشترين لضمان الالتزام بسياسات Apple وGoogle ومجتمع دكانة.
            </p>

            {reports.length === 0 ? (
              <div className="text-center py-8 text-zinc-400 text-xs">
                لا توجد أي بلاغات مسجلة حالياً.
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map(rep => (
                  <div key={rep.id} className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-900">
                        سبب البلاغ: {rep.reason === 'inappropriate' ? 'محتوى غير لائق' : rep.reason}
                      </span>
                      <span className="text-zinc-400 text-[11px]">
                        {new Date(rep.createdAt).toLocaleDateString('ar-IQ')}
                      </span>
                    </div>
                    <p className="text-zinc-700 bg-white p-2.5 rounded-xl border border-zinc-200">
                      تفاصيل البلاغ: {rep.details}
                    </p>
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200/60">
                      <button
                        onClick={() => {
                          setReviewStatus(rep.reviewId, 'hidden');
                          resolveReport(rep.id, 'action_taken');
                        }}
                        className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-[11px] cursor-pointer"
                      >
                        إخفاء التقييم المخالف
                      </button>
                      <button
                        onClick={() => resolveReport(rep.id, 'dismissed')}
                        className="px-3 py-1 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 rounded-lg font-bold text-[11px] cursor-pointer"
                      >
                        تجاهل البلاغ (سليم)
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
