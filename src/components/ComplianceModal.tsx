import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  FileText,
  Lock,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Store,
  HelpCircle,
  Smartphone,
  ExternalLink,
  Shield,
  CreditCard,
  Phone,
  Server,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useMarket } from '../context/MarketContext';

export interface ComplianceModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'privacy' | 'terms' | 'merchant_terms' | 'prohibited' | 'delete_account' | 'store_readiness';
}

export const ComplianceModal: React.FC<ComplianceModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'privacy',
}) => {
  const { currentUser, deleteAccount, isAuthenticated } = useAuth();
  const { orders } = useMarket();

  const [activeTab, setActiveTab] = useState<
    'privacy' | 'terms' | 'merchant_terms' | 'prohibited' | 'delete_account' | 'store_readiness'
  >(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  // Account deletion state
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteReason, setDeleteReason] = useState('لم أعد بحاجة لاستخدام التطبيق');
  const [deletionStatus, setDeletionStatus] = useState<{ success?: boolean; msg?: string }>({});
  const [isDeleting, setIsDeleting] = useState(false);

  // Merchant Protection Check: active/undelivered orders
  const isMerchant = currentUser?.role === 'merchant' || !!currentUser?.merchantStoreId;
  const merchantStoreId = currentUser?.merchantStoreId || currentUser?.id;
  const merchantActiveOrders = isMerchant
    ? orders.filter(
        o =>
          (o.merchantId === merchantStoreId || o.merchantId === currentUser?.id) &&
          o.status !== 'delivered' &&
          o.status !== 'cancelled'
      )
    : [];
  const hasMerchantActiveOrders = isMerchant && merchantActiveOrders.length > 0;

  if (!isOpen) return null;

  const handleDeleteAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Merchant Protection enforcement
    if (hasMerchantActiveOrders) {
      setDeletionStatus({
        success: false,
        msg: `حماية التاجر: لا يمكن حذف الحساب حالياً لوجود (${merchantActiveOrders.length}) طلبات نشطة أو قيد التوصيل لم تكتمل بعد. يرجى تسليم كافة الطلبات للزبائن أولاً.`,
      });
      return;
    }

    if (deleteConfirmText.trim() !== 'حذف حسابي') {
      setDeletionStatus({
        success: false,
        msg: 'يرجى كتابة جملة "حذف حسابي" للتأكيد النهائي.',
      });
      return;
    }

    setIsDeleting(true);
    try {
      const res = await deleteAccount(deleteReason);
      setDeletionStatus({ success: res.success, msg: res.message });
      if (res.success) {
        setTimeout(() => {
          onClose();
        }, 2500);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="السياسات وشروط الاستخدام والتوافق"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden my-6 border border-zinc-200 flex flex-col max-h-[90vh] text-right" dir="rtl">
        {/* Header */}
        <div className="p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-700 text-white flex items-center justify-center shadow-xs shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-zinc-900">
                السياسات والشروط والامتثال القانوني (Apple & Google)
              </h2>
              <p className="text-xs text-zinc-500">
                سياسة الخصوصية، شروط الاستخدام، الدفع عند الاستلام، وحماية بيانات الهاتف العراقي
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigator */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar p-2 bg-zinc-100 border-b border-zinc-200 text-xs font-bold shrink-0">
          {[
            { id: 'privacy', label: '🔒 سياسة الخصوصية', icon: Shield },
            { id: 'terms', label: '📜 شروط الاستخدام', icon: FileText },
            { id: 'merchant_terms', label: '🏪 شروط التجار', icon: Store },
            { id: 'prohibited', label: '🚫 المنتجات المحظورة', icon: AlertTriangle },
            { id: 'delete_account', label: '🗑️ حذف الحساب (App Store)', icon: Trash2 },
            { id: 'store_readiness', label: '✅ جاهزية النشر', icon: CheckCircle2 },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setDeletionStatus({});
              }}
              className={`px-3 py-2 rounded-xl whitespace-nowrap cursor-pointer transition flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-white text-purple-900 shadow-xs font-black border border-purple-200/60'
                  : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/50'
              }`}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs leading-relaxed text-zinc-700 flex-1">
          {/* Official Store Notice */}
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-2xl text-purple-900 text-[11px] font-medium flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-purple-700 shrink-0" />
            <span>
              وثيقة تنظيمية معتمدة لمنصة «دُكَّانَة» متوافقة مع متطلبات متجري Apple App Store (Guideline 5.1.1) وGoogle Play وسياسات التجارة الإلكترونية في جمهورية العراق.
            </span>
          </div>

          {/* ========================================================= */}
          {/* Tab 1: Privacy Policy (سياسة الخصوصية)                     */}
          {/* ========================================================= */}
          {activeTab === 'privacy' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="border-b border-zinc-100 pb-3">
                <h3 className="text-lg font-black text-zinc-900 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-purple-700" />
                  <span>سياسة الخصوصية وحماية البيانات الشخصية (Privacy Policy)</span>
                </h3>
                <p className="text-zinc-500 text-xs mt-1">
                  آخر تحديث: أكتوبر 2026 • تغطية شاملة لكافة محافظات العراق الـ 19
                </p>
              </div>

              <p className="text-zinc-700 text-xs leading-relaxed">
                تلتزم منصة <strong>دُكَّانَة (Dukanah)</strong> بأعلى معايير حماية خصوصية المستخدمين (الزبائن والتجار والزوار). توضح هذه السياسة بشفافية تامة آلية جمع البيانات الشخصية، وكيفية استخدامها، وطرق تأمينها، وحقوق المستخدم في التحكم بها أو مسحها نهائياً.
              </p>

              {/* Clause 1: Iraqi Phone Number Handling */}
              <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-2.5">
                <div className="flex items-center gap-2 text-purple-900 font-bold text-sm">
                  <Phone className="w-4 h-4 text-purple-700 shrink-0" />
                  <h4>1. التعامل مع رقم الهاتف العراقي والتحقق الرقمي:</h4>
                </div>
                <ul className="list-disc list-inside space-y-1.5 text-zinc-600 pr-1 text-xs leading-relaxed">
                  <li>
                    <strong>المعرّف الأساسي للحساب:</strong> يُعتبر رقم الهاتف العراقي (بصيغة 07XXXXXXXXX المحلية أو +9647XXXXXXXXX الدولية) عبر شركات الاتصال المعتمدة في العراق (زين العراق، آسيا سيل، كورك تيليكوم) هو المعرف الرقمي الأساسي للمستخدم.
                  </li>
                  <li>
                    <strong>التحقق عبر رمز OTP المؤقت:</strong> يتم إرسال رمز تحقق مؤقت (OTP) صالح لمدة 5 دقائق لمرة واحدة لتأكيد ملكية الرقم والتأكد من عدم استخدام أرقام غير مصرح بها.
                  </li>
                  <li>
                    <strong>استخدام الرقم حصرياً للخدمة:</strong> يُستخدم رقم الهاتف فقط لأغراض: تسجيل الدخول، استعادة كلمة المرور، تأكيد استلام الطلبات، وتنسيق موعد التسليم مع مندوب التوصيل.
                  </li>
                  <li>
                    <strong>منع الرسائل الترويجية المزعجة (No Spam):</strong> نلتزم بعدم استخدام رقم الهاتف لإرسال أي رسائل ترويجية أو إعلانات خارجية غير مرغوب فيها، ولا تتم مشاركة الرقم مع أي معلنين.
                  </li>
                  <li>
                    <strong>الحذف الدائم عند إنهاء الحساب:</strong> عند قيام المستخدم بحذف حسابه، يتم محو رقم الهاتف من سجلات المستخدمين الفعالة نهائياً وفق إرشادات Apple وGoogle.
                  </li>
                </ul>
              </div>

              {/* Clause 2: Cash on Delivery & Financial Data Safety */}
              <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-2.5">
                <div className="flex items-center gap-2 text-purple-900 font-bold text-sm">
                  <CreditCard className="w-4 h-4 text-purple-700 shrink-0" />
                  <h4>2. الدفع عند الاستلام (COD) وأمان البيانات المالية:</h4>
                </div>
                <ul className="list-disc list-inside space-y-1.5 text-zinc-600 pr-1 text-xs leading-relaxed">
                  <li>
                    <strong>لا نطلب ولا نخزن بيانات بطاقات بنكية:</strong> تطبيق دُكَّانَة لا يقوم إطلاقاً بجمع، أو طلب، أو تخزين أي بيانات للبطاقات الائتمانية أو الحسابات المصرفية أو أرقام PIN.
                  </li>
                  <li>
                    <strong>الدفع نقداً عند المعاينة والاستلام:</strong> جميع المعاملات المالية داخل التطبيق تعتمد حصرياً على نظام الدفع نقداً عند الاستلام بالدينار العراقي (IQD). يدفع الزبون للمندوب مباشرة بعد استلام المنتج ومعاينته.
                  </li>
                  <li>
                    <strong>حماية المستهلك ضد الاحتيال الرقمي:</strong> هذا النموذج يلغي تماماً مخاطر اختراق البطاقات أو الاحتيال المالي الإلكتروني عبر الإنترنت ويوفر أقصى حماية للمشتري العراقي.
                  </li>
                </ul>
              </div>

              {/* Clause 3: Data Security, Encryption & Server Storage */}
              <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-2.5">
                <div className="flex items-center gap-2 text-purple-900 font-bold text-sm">
                  <Server className="w-4 h-4 text-purple-700 shrink-0" />
                  <h4>3. تأمين وتشفير البيانات (Data Security & Safeguards):</h4>
                </div>
                <ul className="list-disc list-inside space-y-1.5 text-zinc-600 pr-1 text-xs leading-relaxed">
                  <li>
                    <strong>تشفير كلمات المرور:</strong> يتم تشفير كلمات المرور باستخدام خوارزميات التجزئة المشفرة غير القابلة للعكس (Salted Cryptographic Hashing)، ولا يمكن لأي موظف أو مدير الاطلاع على كلمة مرور المستخدم.
                  </li>
                  <li>
                    <strong>تشفير قنوات الاتصال (SSL/TLS):</strong> يتم تشفير كافة البيانات المنقولة بين تطبيق دُكَّانَة والخوادم السحابية عبر بروتوكولات HTTPS وTLS المعتمدة دولياً.
                  </li>
                  <li>
                    <strong>إدارة الجلسات والأجهزة:</strong> يتيح التطبيق عرض كافة الجلسات والأجهزة النشطة المسجلة مع إمكانية تسجيل الخروج من الأجهزة الأخرى بضغطة زر لحماية الحساب عند فقدان الهاتف.
                  </li>
                  <li>
                    <strong>حظر بيع أو تأجير البيانات:</strong> لا نقوم ببيع أو تأجير أو المتاجرة بالبيانات الشخصية لأي طرف ثالث تحت أي ظرف من الظروف.
                  </li>
                </ul>
              </div>

              {/* Clause 4: User Rights & Data Deletion */}
              <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-2.5">
                <div className="flex items-center gap-2 text-purple-900 font-bold text-sm">
                  <Trash2 className="w-4 h-4 text-purple-700 shrink-0" />
                  <h4>4. حقوق المستخدم ومحو البيانات الشخصية (Right to Erasure):</h4>
                </div>
                <p className="text-zinc-600 text-xs leading-relaxed">
                  يحق لكل مستخدم في أي وقت طلب تعديل بياناته، أو حذف حسابه نهائياً من داخل التطبيق (عبر تبويب حذف الحساب أو من قائمة الملف الشخصي). يتم تنفيذ طلب الحذف فورياً وبشكل دائم دون أي تأخير أو شروط تعجيزية.
                </p>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* Tab 2: Terms of Service (شروط الاستخدام)                   */}
          {/* ========================================================= */}
          {activeTab === 'terms' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="border-b border-zinc-100 pb-3">
                <h3 className="text-lg font-black text-zinc-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-700" />
                  <span>شروط وأحكام استخدام سوق دُكَّانَة (Terms of Service)</span>
                </h3>
                <p className="text-zinc-500 text-xs mt-1">
                  اتفاقية الاستخدام القانونية بين المستخدم ومنصة دُكَّانَة الرقمية
                </p>
              </div>

              <p className="text-zinc-700 text-xs leading-relaxed">
                مرحباً بكم في <strong>دُكَّانَة</strong>. يمثل استخدامك لهذا التطبيق موافقتك الصريحة والكاملة على هذه الشروط والأحكام. إذا كنت لا توافق على أي بند منها، يُرجى التوقف عن استخدام التطبيق.
              </p>

              {/* Terms Section 1: Iraqi Phone & Account Authenticity */}
              <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-2.5">
                <div className="flex items-center gap-2 text-purple-900 font-bold text-sm">
                  <Phone className="w-4 h-4 text-purple-700 shrink-0" />
                  <h4>1. شروط استخدام وتوثيق رقم الهاتف العراقي:</h4>
                </div>
                <ul className="list-disc list-inside space-y-1.5 text-zinc-600 pr-1 text-xs leading-relaxed">
                  <li>
                    يُشترط أن يكون رقم الهاتف المسجل رقماً عراقياً حقيقياً مملوكاً للمستخدم وقابلاً لاستقبال رسائل التحقق النصية والمكالمات الهاتفية من مندوبي التوصيل.
                  </li>
                  <li>
                    يُحظر منعاً باتاً استخدام أرقام هواتف وهمية، أو مؤقتة، أو منتحلة لشخصيات أخرى بقصد التلاعب أو الطلب غير الحقيقي.
                  </li>
                  <li>
                    يحق لإدارة المنصة تعليق أو حظر أي حساب يتبين استخدامه لأرقام احتيالية أو تكرار الطلبات الوهمية دون استلام.
                  </li>
                </ul>
              </div>

              {/* Terms Section 2: Cash on Delivery Terms */}
              <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-2.5">
                <div className="flex items-center gap-2 text-purple-900 font-bold text-sm">
                  <CreditCard className="w-4 h-4 text-purple-700 shrink-0" />
                  <h4>2. أحكام الدفع عند الاستلام والتوصيل (Cash on Delivery):</h4>
                </div>
                <ul className="list-disc list-inside space-y-1.5 text-zinc-600 pr-1 text-xs leading-relaxed">
                  <li>
                    <strong>الالتزام بالدفع النقدي:</strong> بإتمام عملية الطلب عبر سلة المشتريات، يلتزم المشتري بدفع القيمة الإجمالية للطلب بالدينار العراقي نقداً لمندوب التوصيل عند استلام الشحنة.
                  </li>
                  <li>
                    <strong>حق المعاينة:</strong> يحق للمشتري معاينة الطرد والتأكد من مطابقة المنتج للمواصفات المعروضة في المتجر قبل إتمام الدفع للمندوب.
                  </li>
                  <li>
                    <strong>سياسة الإرجاع والاستبدال:</strong> في حال وجود عيب مصنعي أو اختلاف جوهري عن المواصفات المعلنة، يحق للمشتري رفض الاستلام أو طلب استبدال المنتج بالتنسيق مع التاجر عبر المحادثات المباشرة أو الدعم الفني.
                  </li>
                  <li>
                    <strong>عناوين التوصيل:</strong> المستخدم مسؤول عن دقة العنوان والمحافظة المحددة من بين المحافظات العراقية الـ 19 لضمان وصول المندوب في الموعد المحدد.
                  </li>
                </ul>
              </div>

              {/* Terms Section 3: Data Security & Account Safety */}
              <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-2.5">
                <div className="flex items-center gap-2 text-purple-900 font-bold text-sm">
                  <Lock className="w-4 h-4 text-purple-700 shrink-0" />
                  <h4>3. التزامات أمان الحساب وتأمين البيانات:</h4>
                </div>
                <ul className="list-disc list-inside space-y-1.5 text-zinc-600 pr-1 text-xs leading-relaxed">
                  <li>
                    المستخدم مسؤول مسؤولية تامة عن سرية كلمة المرور الخاصة بحسابه وعدم إفشائها لأي طرف آخر.
                  </li>
                  <li>
                    يجب إبلاغ إدارة المنصة فوراً في حال الاشتباه في أي دخول غير مصرح به أو اختراق لرقم الهاتف المسجل.
                  </li>
                  <li>
                    يمنع استخدام أي أدوات برمجية مؤتمتة (Bots/Scrapers) لجمع بيانات المنتجات أو الأسعار من المنصة دون إذن خطي مسبق.
                  </li>
                </ul>
              </div>

              {/* Terms Section 4: Reviews & User Content */}
              <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-2.5">
                <div className="flex items-center gap-2 text-purple-900 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4 text-purple-700 shrink-0" />
                  <h4>4. شروط التقييمات والمراجعات الموثوقة:</h4>
                </div>
                <p className="text-zinc-600 text-xs leading-relaxed">
                  يُسمح بنشر التقييمات فقط للزبائن الذين أتموا عملية شراء وتوصيل حقيقية للمنتج ("عملية شراء موثقة"). يُحظر كتابة تعليقات خادشة للحياء، أو كيدية، أو ترويجية لحسابات أخرى، وتخضع التقييمات لرقابة نظام الإبلاغ والحظر لحماية المجتمع.
                </p>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* Tab 3: Merchant Terms (شروط التجار)                       */}
          {/* ========================================================= */}
          {activeTab === 'merchant_terms' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="border-b border-zinc-100 pb-3">
                <h3 className="text-lg font-black text-zinc-900 flex items-center gap-2">
                  <Store className="w-5 h-5 text-purple-700" />
                  <span>ميثاق وشروط التجار في دُكَّانَة (Merchant Terms)</span>
                </h3>
                <p className="text-zinc-500 text-xs mt-1">
                  الالتزامات القانونية والأخلاقية للتجار المعتمدين في السوق العراقي
                </p>
              </div>

              <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-2.5">
                <h4 className="font-bold text-purple-900 text-sm">1. جودة المنتجات والشفافية:</h4>
                <p className="text-zinc-600 text-xs">
                  يلتزم التاجر بعرض منتجات أصلية، جديدة، ومطابقة للصور والأوصاف المرفوعة. يُحظر عرض أي منتجات مقلدة دون الإفصاح الصريح، أو مجهولة المصدر.
                </p>
              </div>

              <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-2.5">
                <h4 className="font-bold text-purple-900 text-sm">2. التجهيز والتسليم وتحصيل المبالغ:</h4>
                <p className="text-zinc-600 text-xs">
                  التاجر مسؤول عن سرعة تجهيز الطلبات الواردة، وتغليفها الآمن، وتوصيلها إلى عنوان الزبون وتحصيل مبالغ الدفع عند الاستلام المتفق عليها دون أي زيادات غير معلنة.
                </p>
              </div>

              <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-2.5">
                <h4 className="font-bold text-purple-900 text-sm">3. حظر حذف أو التلاعب بالتقييمات:</h4>
                <p className="text-zinc-600 text-xs">
                  لا يملك التاجر صلاحية تعديل أو حذف تقييمات الزبائن الحقيقية لضمان مصداقية السوق. يحق للتاجر تقديم رد توضيحي رسمي أو التواصل الودي مع الزبون لحل أي مشكلة.
                </p>
              </div>

              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 space-y-2 text-amber-950">
                <h4 className="font-bold text-amber-900 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-700" />
                  <span>4. حماية التاجر والالتزامات عند الرغبة في إنهاء الحساب:</span>
                </h4>
                <p className="text-xs leading-relaxed">
                  وفق ميثاق حماية حقوق المشترين، يُمنع التاجر من حذف حسابه طالما كانت لديه طلبات نشطة قيد التجهيز أو في عهدة المندوب قيد التوصيل لم تكتمل بعد. يجب تسليم كافة الطرود للزبائن أو إلغاؤها بالتوافق قبل طلب الحذف النهائي.
                </p>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* Tab 4: Prohibited Products (المنتجات المحظورة)             */}
          {/* ========================================================= */}
          {activeTab === 'prohibited' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="border-b border-zinc-100 pb-3">
                <h3 className="text-lg font-black text-rose-900 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                  <span>قائمة المنتجات والمحتوى المحظور (Apple & Google Guidelines)</span>
                </h3>
                <p className="text-zinc-500 text-xs mt-1">
                  سياسة صارمة لمنع التداول غير المشروع داخل المنصة
                </p>
              </div>

              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 font-bold text-xs">
                يُحظر تماماً وبشكل قاطع بيع أو ترويج أو نشر أي من الأصناف والمواد التالية داخل سوق دُكَّانَة:
              </div>

              <ul className="space-y-2.5 pr-1">
                {[
                  {
                    title: 'الأسلحة والذخائر والمتفجرات:',
                    desc: 'كافة أنواع الأسلحة النارية والبيضاء ومعدات الصيد غير المرخصة وأجهزة الصعق.',
                  },
                  {
                    title: 'المخدرات والمؤثرات العقلية والأدوية غير المرخصة:',
                    desc: 'المواد المخدرة، الأدوية الخاضعة لرقابة الوصفات الطبية، والمستحضرات غير المجازة من وزارة الصحة العراقية.',
                  },
                  {
                    title: 'المحتوى الإباحي والجنسي:',
                    desc: 'أي مواد أو منتجات تخدش الحياء العام أو الآداب الإسلامية والمجتمعية العراقية.',
                  },
                  {
                    title: 'أنشطة القمار واليانصيب والعملات المشفرة غير المنظمة:',
                    desc: 'المراهنات، ألعاب الحظ، والمخططات الهرمية أو الاحتيالية.',
                  },
                  {
                    title: 'السلع المقلدة والمزورة:',
                    desc: 'انتهاك حقوق الملكية الفكرية والعلامات التجارية المحمية محلياً ودولياً.',
                  },
                ].map((item, idx) => (
                  <li
                    key={idx}
                    className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200 flex items-start gap-2.5 text-xs"
                  >
                    <span className="text-rose-600 font-black shrink-0">✕</span>
                    <div>
                      <strong className="text-zinc-900 block">{item.title}</strong>
                      <span className="text-zinc-500 mt-0.5 block">{item.desc}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ========================================================= */}
          {/* Tab 5: Account Deletion (حذف الحساب مع حماية التاجر)       */}
          {/* ========================================================= */}
          {activeTab === 'delete_account' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="border-b border-zinc-100 pb-3">
                <h3 className="text-lg font-black text-rose-900 flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-rose-600" />
                  <span>حذف الحساب ومحو البيانات الشخصية (App Store Guideline 5.1.1(v))</span>
                </h3>
                <p className="text-zinc-500 text-xs mt-1">
                  حق محو كافة البيانات الشخصية المسجلة بشكل فوري ومباشر
                </p>
              </div>

              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-950 space-y-2">
                <div className="font-bold flex items-center gap-2 text-xs">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>متطلب إلزامي رسمي لمتجري Apple App Store وGoogle Play:</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  تمنحك دُكَّانَة الحق الكامل في حذف حسابك وبياناتك الشخصية من داخل التطبيق في أي وقت دون الحاجة لمراسلة البريد الإلكتروني أو الانتظار. عند الحذف، يتم محو رقم الهاتف والاسم والعناوين وسجل الجلسات فورياً.
                </p>
              </div>

              {/* Merchant Protection Alert */}
              {hasMerchantActiveOrders ? (
                <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-amber-950 space-y-2">
                  <div className="font-bold flex items-center gap-2 text-sm text-amber-900">
                    <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
                    <span>حماية التاجر: لا يمكن حذف الحساب حالياً لوجود طلبات نشطة</span>
                  </div>
                  <p className="text-xs leading-relaxed text-amber-800">
                    لديك <strong>({merchantActiveOrders.length}) طلبات نشطة</strong> قيد التجهيز أو في عهدة المندوب قيد التوصيل لم تكتمل بعد.
                    لحماية حقوق المشترين والوفاء بالالتزامات، لا يمكن حذف حساب التاجر حتى يتم تسليم كافة الطلبات المفتوحة أو تسويتها بالكامل أولاً.
                  </p>
                </div>
              ) : null}

              {!isAuthenticated || !currentUser ? (
                <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-200 text-center text-zinc-500 text-xs">
                  أنت لست مسجل الدخول حالياً بحساب نشط. يمكنك تسجيل الدخول للتحكم في حسابك أو حذفه.
                </div>
              ) : (
                <form onSubmit={handleDeleteAccountSubmit} className="space-y-4 pt-1">
                  {deletionStatus.msg && (
                    <div
                      className={`p-3 rounded-xl border text-xs font-bold ${
                        deletionStatus.success
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}
                    >
                      {deletionStatus.msg}
                    </div>
                  )}

                  <div>
                    <label className="block font-bold text-zinc-700 mb-1">
                      الحساب الحالي المراد حذفه:
                    </label>
                    <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-zinc-900 font-bold flex items-center justify-between">
                      <span>{currentUser.displayName} ({currentUser.phone})</span>
                      <span className="text-[11px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">
                        {currentUser.role === 'merchant' ? 'حساب تاجر' : 'حساب زبون'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-zinc-700 mb-1">سبب طلب الحذف:</label>
                    <select
                      value={deleteReason}
                      onChange={e => setDeleteReason(e.target.value)}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-xl bg-white text-xs font-medium"
                    >
                      <option value="لم أعد بحاجة لاستخدام التطبيق">لم أعد بحاجة لاستخدام التطبيق</option>
                      <option value="الرغبة في محو البيانات الشخصية">الرغبة في محو البيانات الشخصية</option>
                      <option value="تغيير رقم الهاتف العراقي">تغيير رقم الهاتف العراقي</option>
                      <option value="أسباب أخرى">أسباب أخرى</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-zinc-700 mb-1">
                      لتأكيد الحذف النهائي، اكتب العبارة: <span className="text-rose-600 font-black">حذف حسابي</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={deleteConfirmText}
                      onChange={e => setDeleteConfirmText(e.target.value)}
                      placeholder="حذف حسابي"
                      disabled={hasMerchantActiveOrders}
                      className="w-full px-3 py-2.5 border border-rose-300 rounded-xl focus:ring-2 focus:ring-rose-500/30 text-xs font-bold disabled:bg-zinc-100 disabled:opacity-60"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isDeleting || hasMerchantActiveOrders}
                    className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl transition cursor-pointer shadow-md shadow-rose-600/20 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDeleting
                      ? 'جاري مسح الحساب وبياناتك...'
                      : hasMerchantActiveOrders
                      ? 'غير متاح - يجب تسليم الطلبات النشطة أولاً'
                      : 'تأكيد حذف الحساب ومحو البيانات نهائياً'}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* Tab 6: Store Readiness (جاهزية متجري Apple وGoogle)         */}
          {/* ========================================================= */}
          {activeTab === 'store_readiness' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="border-b border-zinc-100 pb-3">
                <h3 className="text-lg font-black text-zinc-900 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>جاهزية النشر والامتثال لمتطلبات Apple & Google Play</span>
                </h3>
                <p className="text-zinc-500 text-xs mt-1">
                  قائمة التحقق الأمنية والتنظيمية قبل النشر المباشر
                </p>
              </div>

              <div className="space-y-2.5">
                {[
                  {
                    title: 'حذف الحساب داخل التطبيق (Apple 5.1.1(v) & Google Play)',
                    desc: 'زر واضح للحذف الفوري مع مسح رقم الهاتف والاسم والعناوين وسجل الجلسات نهائياً.',
                    status: 'مكتمل ومطبق بنجاح',
                  },
                  {
                    title: 'حماية التاجر عند حذف الحساب (Merchant Protection)',
                    desc: 'منع حذف الحساب للتاجر الذي لديه طلبات نشطة أو قيد التوصيل لم تكتمل بعد لحماية حقوق الزبائن.',
                    status: 'مكتمل ومطبق بنجاح',
                  },
                  {
                    title: 'إدارة المحتوى والمستخدمين المحظورين (UGC Moderation)',
                    desc: 'قائمة بالمستخدمين المحظورين في الملف الشخصي مع زر إلغاء الحظر، والإبلاغ عن التقييمات المخالفة.',
                    status: 'مكتمل ومطبق بنجاح',
                  },
                  {
                    title: 'توثيق رقم الهاتف العراقي ورمز OTP',
                    desc: 'دعم الأرقام العراقية الـ 11 رقماً، حدود المحاولات وحماية من الإغراق مع تشفير كلمات المرور.',
                    status: 'مكتمل ومطبق بنجاح',
                  },
                  {
                    title: 'الدفع عند الاستلام نقداً فقط (COD) بدون بطاقات وهمية',
                    desc: 'غياب بوابات الدفع البنكية غير المعتمدة والاعتماد الحصري على التسليم اليدوي بالدينار العراقي.',
                    status: 'مكتمل ومطبق بنجاح',
                  },
                  {
                    title: 'شفافية التقييمات الموثوقة (Anti-Fraud Policy)',
                    desc: 'منع نشر التقييمات إلا بعد إتمام عملية شراء وتوصيل حقيقية مسجلة.',
                    status: 'مكتمل ومطبق بنجاح',
                  },
                ].map((item, i) => (
                  <div key={i} className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-zinc-900">{item.title}</div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">{item.desc}</div>
                      <span className="inline-block mt-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
