import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  Store,
  ShieldCheck,
  Phone,
  Send,
  KeyRound,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  X,
  ArrowRight,
  ShoppingBag,
  Sparkles,
  HelpCircle,
  MapPin,
  Lock,
  Eye,
  EyeOff,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DukkanaLogo } from './DukkanaLogo';
import { ComplianceModal } from './ComplianceModal';
import { validateIraqiPhone, normalizeArabicDigits } from '../utils/phoneAuth';
import { IRAQI_GOVERNORATES } from '../data/governorates';
import { IraqiGovernorate, UserRole, ADMIN_PHONE_LOCAL, ADMIN_PHONE_E164 } from '../types';

interface AuthScreenProps {
  onSuccess?: (role: UserRole) => void;
  onCancel?: () => void;
  onGuestBrowse?: () => void;
  onOpenCompliance?: (tab?: 'privacy' | 'terms') => void;
  isModal?: boolean;
  initialNotice?: string;
}

type AuthMode =
  | 'welcome'
  | 'register_choose_role'
  | 'register_form'
  | 'login_form'
  | 'otp_verify'
  | 'create_password'
  | 'forgot_password';

type AccountChoice = 'customer' | 'merchant' | 'admin_staff';

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onSuccess,
  onCancel,
  onGuestBrowse,
  onOpenCompliance,
  isModal = false,
  initialNotice,
}) => {
  const {
    requestOTPForPhone,
    verifyOTPOnly,
    loginWithPassword,
    resetPassword,
    registerAccount,
    loginWithPhone,
  } = useAuth();

  // Legal Compliance Modal state (Direct links to Privacy Policy & Terms of Service)
  const [complianceModalTab, setComplianceModalTab] = useState<'privacy' | 'terms' | null>(null);

  const openCompliance = (tab: 'privacy' | 'terms') => {
    if (onOpenCompliance) {
      onOpenCompliance(tab);
    } else {
      setComplianceModalTab(tab);
    }
  };

  // Navigation State
  const [mode, setMode] = useState<AuthMode>('welcome');
  const [accountType, setAccountType] = useState<AccountChoice>('customer');
  const [merchantType, setMerchantType] = useState<'retail' | 'wholesale'>('retail');

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [governorate, setGovernorate] = useState<IraqiGovernorate>('بغداد');
  const [storeName, setStoreName] = useState('');
  const [storeDescription, setStoreDescription] = useState('');
  const [detailedAddress, setDetailedAddress] = useState('');

  // Password fields
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Login form states
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginWithOTPMode, setLoginWithOTPMode] = useState(false);

  // OTP & Flow State
  const [otpCode, setOtpCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [isResetFlow, setIsResetFlow] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Status Feedback & Admin 3-Device Limit State
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [adminLimitReached, setAdminLimitReached] = useState(false);

  // Read initialNotice or sessionStorage notice upon mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('dukkana_auth_notice') || localStorage.getItem('dukkana_auth_notice');
      if (stored) {
        setSuccessMsg(stored);
        sessionStorage.removeItem('dukkana_auth_notice');
        localStorage.removeItem('dukkana_auth_notice');
      } else if (initialNotice) {
        setSuccessMsg(initialNotice);
      }
    } catch {}
  }, [initialNotice]);

  // Countdown timer for OTP resend
  useEffect(() => {
    let timer: any = null;
    if (cooldownSeconds > 0) {
      timer = setInterval(() => {
        setCooldownSeconds(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  // Clean error/success on mode changes
  const changeMode = (newMode: AuthMode) => {
    setErrorMsg('');
    setSuccessMsg('');
    setAdminLimitReached(false);
    setMode(newMode);
  };

  // ==========================================
  // Flow 1: Direct Password Login (No OTP Sent)
  // ==========================================
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setAdminLimitReached(false);

    const validation = validateIraqiPhone(phone);
    if (!validation.isValid) {
      setErrorMsg(validation.errorMessage || 'يرجى إدخال رقم هاتف عراقي صحيح.');
      return;
    }

    if (!loginPassword || loginPassword.length < 6) {
      setErrorMsg('يرجى إدخال كلمة مرور صحيحة (6 خانات على الأقل).');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await loginWithPassword(phone, loginPassword);
      if (res.success) {
        setAdminLimitReached(false);
        setSuccessMsg(res.message);
        setTimeout(() => {
          if (onSuccess && res.detectedRole) {
            onSuccess(res.detectedRole);
          }
        }, 1000);
      } else if (res.maxSessionsReached) {
        // Requirement 3: Admin 3-Device Limit Reached
        setAdminLimitReached(true);
        setErrorMsg('تم تجاوز الحد الأقصى للجلسات (3 أجهزة مسموحة فقط)، يرجى إنهاء جلسة أخرى أولاً');
      } else if (res.requiresPasswordSetup) {
        // User exists but has no password yet: send OTP and force password setup
        setErrorMsg('لم يتم إنشاء كلمة مرور لهذا الحساب بعد. جاري إرسال رمز OTP لتأكيد الحساب وتعيين كلمة المرور...');
        const otpRes = await requestOTPForPhone(phone);
        if (otpRes.success) {
          setIsResetFlow(true);
          setCooldownSeconds(60);
          setSuccessMsg(otpRes.message);
          setMode('otp_verify');
        } else {
          setErrorMsg(otpRes.message);
        }
      } else {
        setErrorMsg(res.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Requirement 3: Option to terminate the oldest session and login immediately
  const handleForceLoginTerminateOldest = async () => {
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const res = await loginWithPassword(phone, loginPassword, { terminateOldest: true });
      if (res.success) {
        setAdminLimitReached(false);
        setSuccessMsg('تم إنهاء الجلسة الأقدم بنجاح وتسجيل الدخول للجهاز الحالي.');
        setTimeout(() => {
          if (onSuccess && res.detectedRole) {
            onSuccess(res.detectedRole);
          }
        }, 1000);
      } else {
        setErrorMsg(res.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // Flow 2: Send OTP (For Registration, Forgot Password, or OTP Login)
  // ==========================================
  const handleInitiateOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const validation = validateIraqiPhone(phone);
    if (!validation.isValid) {
      setErrorMsg(validation.errorMessage || 'يرجى إدخال رقم هاتف عراقي صحيح.');
      return;
    }

    if (mode === 'register_form') {
      if (!fullName.trim()) {
        setErrorMsg('يرجى إدخال الاسم بالكامل.');
        return;
      }
      if (accountType === 'merchant' && !storeName.trim()) {
        setErrorMsg('يرجى إدخال اسم المتجر التجاري.');
        return;
      }
      if (accountType === 'admin_staff' && validation.normalizedE164 !== ADMIN_PHONE_E164) {
        setErrorMsg(
          `تم رفض الطلب: رقم الهاتف غير مصرح له بصلاحية إدارة المنصة. صلاحية المدير محصورة بالرقم الرسمي المعتمد لدى إدارة دكانة.`
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const isReset = mode === 'forgot_password' || isResetFlow;
      const res = await requestOTPForPhone(phone, {
        purpose: isReset ? 'reset_password' : 'registration',
      });
      if (res.success) {
        setMode('otp_verify');
        setCooldownSeconds(60);
        setSuccessMsg(res.message);
      } else {
        setErrorMsg(res.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // Flow 3: Verify OTP
  // ==========================================
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanCode = normalizeArabicDigits(otpCode.trim()).replace(/\D/g, '');
    if (!cleanCode || cleanCode.length !== 6) {
      setErrorMsg('يرجى إدخال رمز التحقق المكوّن من 6 أرقام.');
      return;
    }

    setIsSubmitting(true);
    try {
      const isReset = isResetFlow || mode === 'forgot_password';
      const verifyRes = await verifyOTPOnly(phone, cleanCode, {
        purpose: isReset ? 'reset_password' : (fullName ? 'registration' : 'login'),
      });
      if (!verifyRes.success) {
        setErrorMsg(verifyRes.message);
        return;
      }

      setResetToken(verifyRes.resetToken || '');

      // 1. Forgot Password flow -> ALWAYS Transition to Set New Password screen (no direct login)
      if (isReset) {
        setIsResetFlow(true);
        setSuccessMsg('تم التحقق من رمز OTP بنجاح! أدخل الآن كلمة المرور الجديدة لحسابك.');
        setMode('create_password');
        return;
      }

      // 2. New Registration -> Transition to Create Password
      if (mode === 'otp_verify' && fullName && !isResetFlow) {
        setSuccessMsg('تم التحقق من الرمز بنجاح! يرجى الآن إنشاء كلمة مرور لحسابك الجديد.');
        setMode('create_password');
        return;
      }

      // 3. User logged in via OTP directly (loginWithOTPMode): check if user has password
      if (!verifyRes.hasPassword) {
        setSuccessMsg('تم التحقق بنجاح! لم يتم تعيين كلمة مرور لهذا الحساب مسبقاً. يرجى إنشاء كلمة مرور للمتابعة.');
        setIsResetFlow(true);
        setMode('create_password');
        return;
      }

      // 4. User logged in via OTP and already has password (only in OTP login mode)
      setSuccessMsg(verifyRes.message || 'تم تسجيل الدخول بنجاح.');
      setTimeout(() => {
        if (onSuccess) {
          const detectedRole = (verifyRes.user?.role as UserRole) || (phone === ADMIN_PHONE_LOCAL ? 'admin' : 'customer');
          onSuccess(detectedRole);
        }
      }, 1000);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // Flow 4: Create or Reset Password Submit
  // ==========================================
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!password || password.length < 6) {
      setErrorMsg('يجب ألا تقل كلمة المرور عن 6 خانات (أحرف أو أرقام).');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('كلمتا المرور غير متطابقتين. يرجى التأكد وإعادة الإدخال.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isResetFlow) {
        // Forgot password or setting password for existing user
        const res = await resetPassword(phone, resetToken, password);
        if (res.success) {
          setSuccessMsg('تم تعيين كلمة المرور الجديدة بنجاح! جاري توجيهك لشاشة الدخول لتسجيل الدخول بها.');
          setPassword('');
          setConfirmPassword('');
          setLoginPassword('');
          setIsResetFlow(false);
          // Return to login screen so user enters new password to log in
          setTimeout(() => {
            setMode('login_form');
            setLoginWithOTPMode(false);
          }, 1500);
        } else {
          setErrorMsg(res.message);
        }
      } else {
        // New user registration
        const regRes = await registerAccount({
          accountType,
          merchantType: accountType === 'merchant' ? merchantType : undefined,
          phone,
          password,
          resetToken,
          fullName,
          governorate,
          storeName: accountType === 'merchant' ? storeName : undefined,
          storeDescription: accountType === 'merchant' ? storeDescription : undefined,
          address: detailedAddress,
        });

        if (regRes.success) {
          setSuccessMsg(regRes.message);
          setTimeout(() => {
            if (onSuccess && regRes.assignedRole) {
              onSuccess(regRes.assignedRole);
            }
          }, 1200);
        } else {
          setErrorMsg(regRes.message);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resend OTP
  const handleResend = async () => {
    if (cooldownSeconds > 0) return;
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      const isReset = mode === 'forgot_password' || isResetFlow;
      const res = await requestOTPForPhone(phone, {
        purpose: isReset ? 'reset_password' : 'registration',
      });
      if (res.success) {
        setCooldownSeconds(60);
        setSuccessMsg(res.message);
      } else {
        setErrorMsg(res.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`w-full ${isModal ? '' : 'min-h-[85vh] flex items-center justify-center py-8 px-4'}`}>
      <div className="relative w-full max-w-xl mx-auto bg-white rounded-3xl shadow-xl border border-zinc-200 overflow-hidden">
        {/* Modal Close Button */}
        {onCancel && isModal && (
          <button
            onClick={onCancel}
            className="absolute top-4 left-4 p-2 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition z-10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-purple-950 via-purple-900 to-purple-950 text-white p-6 sm:p-7 relative border-b border-purple-800/40">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <DukkanaLogo
              size="lg"
              theme="white"
              variant="full"
              sublineText="بوابة الحسابات المعتمدة لكافة محافظات العراق الـ 19"
            />
            <span className="text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold px-3 py-1 rounded-full shadow-xs">
              نظام التوثيق الرسمي
            </span>
          </div>
        </div>

        {/* Status Alerts */}
        <div className="p-6 pb-2 space-y-3">
          {adminLimitReached && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-xs space-y-2.5 animate-in fade-in">
              <div className="flex items-start gap-2 text-amber-950 font-bold">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-black text-amber-900">
                    تم تجاوز الحد الأقصى للجلسات (3 أجهزة مسموحة فقط)، يرجى إنهاء جلسة أخرى أولاً
                  </p>
                  <p className="text-amber-800 text-[11px] font-normal mt-1 leading-relaxed">
                    حساب المدير مقيد بـ 3 متصفحات/أجهزة نشطة في نفس الوقت لأمان المنصة. يمكنك إنهاء الجلسة الأقدم تلقائياً لتسجيل الدخول فوراً من هذا المتصفح.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleForceLoginTerminateOldest}
                disabled={isSubmitting}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition shadow-xs disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSubmitting ? 'animate-spin' : ''}`} />
                <span>إنهاء الجلسة الأقدم وتسجيل الدخول فوراً</span>
              </button>
            </div>
          )}

          {errorMsg && !adminLimitReached && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-2xl flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* STEP 1: WELCOME SCREEN (Two Clear Primary Options) */}
        {mode === 'welcome' && (
          <div className="p-6 sm:p-8 pt-4 space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-xl sm:text-2xl font-black text-zinc-900">
                مرحباً بك في دكانة
              </h2>
              <p className="text-xs text-zinc-500 max-w-md mx-auto">
                اختر ما إذا كنت ترغب في إنشاء حساب جديد واختيار نوع حسابك (زبون، تاجر، موظف/مدير)، أو تسجيل الدخول لحسابك الحالي.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* Option 1: Create New Account */}
              <button
                onClick={() => {
                  setIsResetFlow(false);
                  changeMode('register_choose_role');
                }}
                className="p-6 bg-purple-700 hover:bg-purple-800 text-white rounded-3xl transition shadow-lg shadow-purple-900/20 text-right space-y-3 group cursor-pointer border border-purple-600 flex flex-col justify-between"
              >
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white">
                  <UserIcon className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-purple-200 block">
                    مستخدم جديد لأول مرة
                  </span>
                  <h3 className="text-lg font-black mt-0.5 group-hover:translate-x-[-2px] transition-transform">
                    1. إنشاء حساب جديد
                  </h3>
                  <p className="text-xs text-purple-100/90 mt-1.5 leading-relaxed">
                    حدد نوع حسابك (زبون، تاجر، موظف/مدير) وتحقق برقم الهاتف وأنشئ كلمة مرورك.
                  </p>
                </div>
              </button>

              {/* Option 2: Sign In */}
              <button
                onClick={() => {
                  setFullName('');
                  setIsResetFlow(false);
                  setLoginWithOTPMode(false);
                  changeMode('login_form');
                }}
                className="p-6 bg-zinc-50 hover:bg-zinc-100 text-zinc-900 rounded-3xl transition border border-zinc-200 text-right space-y-3 group cursor-pointer flex flex-col justify-between"
              >
                <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center">
                  <KeyRound className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-zinc-500 block">
                    لديك حساب مسجل مسبقاً
                  </span>
                  <h3 className="text-lg font-black mt-0.5 group-hover:translate-x-[-2px] transition-transform">
                    2. تسجيل الدخول
                  </h3>
                  <p className="text-xs text-zinc-600 mt-1.5 leading-relaxed">
                    تسجيل الدخول المباشر برقم الهاتف وكلمة المرور بدون الحاجة لانتظار رمز OTP.
                  </p>
                </div>
              </button>
            </div>

            {/* Guest browsing option */}
            {onGuestBrowse && (
              <div className="pt-2 text-center border-t border-zinc-100">
                <button
                  onClick={onGuestBrowse}
                  className="text-xs text-zinc-500 hover:text-purple-700 font-bold transition inline-flex items-center gap-1.5 cursor-pointer py-1"
                >
                  <span>تصفح سوق دكانة كزائر أولاً</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Direct Links to Legal Compliance: Privacy Policy & Terms of Service */}
            <div className="pt-3 border-t border-zinc-100 flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-[11px] text-zinc-500 font-medium">
              <span>بالاستمرار في دُكَّانَة، فإنك توافق على</span>
              <button
                type="button"
                onClick={() => openCompliance('terms')}
                className="text-purple-700 hover:text-purple-900 font-bold underline cursor-pointer"
              >
                شروط الاستخدام
              </button>
              <span className="text-zinc-300">و</span>
              <button
                type="button"
                onClick={() => openCompliance('privacy')}
                className="text-purple-700 hover:text-purple-900 font-bold underline cursor-pointer"
              >
                سياسة الخصوصية
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: CHOOSE ACCOUNT ROLE (Customer / Merchant / Staff & Admin) */}
        {mode === 'register_choose_role' && (
          <div className="p-6 sm:p-8 pt-4 space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h2 className="text-lg font-black text-zinc-900">
                  اختر نوع الحساب المراد إنشاؤه
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  النظام يقوم بتوثيق الصلاحية وتخصيص واجهتك وفق اختيارك والتحقق الأمني.
                </p>
              </div>
              <button
                onClick={() => changeMode('welcome')}
                className="text-xs text-zinc-500 hover:text-purple-700 font-bold cursor-pointer"
              >
                العودة
              </button>
            </div>

            <div className="space-y-3">
              {/* Role 1: Customer */}
              <button
                onClick={() => {
                  setAccountType('customer');
                  changeMode('register_form');
                }}
                className="w-full p-4 rounded-2xl border-2 border-zinc-200 hover:border-purple-600 hover:bg-purple-50/40 text-right transition flex items-start gap-4 group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 group-hover:bg-purple-700 group-hover:text-white transition">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-sm text-zinc-900">
                      1. حساب زبون (مشتري)
                    </h3>
                    <span className="text-[11px] font-bold text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full">
                      تسوّق ودفع نقدي
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
                    تصفح آلاف المنتجات العراقية، طلب البضائع بالدينار العراقي، والدفع عند الاستلام (COD) مع متابعة حالة الشحنة.
                  </p>
                </div>
              </button>

              {/* Role 2: Merchant & Supplier */}
              <button
                onClick={() => {
                  setAccountType('merchant');
                  changeMode('register_form');
                }}
                className="w-full p-4 rounded-2xl border-2 border-zinc-200 hover:border-purple-600 hover:bg-purple-50/40 text-right transition flex items-start gap-4 group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 group-hover:bg-amber-600 group-hover:text-white transition">
                  <Store className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-sm text-zinc-900">
                      2. حساب تاجر / مورّد
                    </h3>
                    <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
                      تجزئة / جملة وتوريد
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
                    إنشاء حساب تاجر أو مورّد جملة، إضافة كميات ضخمة وبضائع التوريد والمفرد، واستقبال طلبات الزبائن والمتاجر في كافة المحافظات.
                  </p>
                </div>
              </button>

              {/* Role 3: Staff / Admin */}
              <button
                onClick={() => {
                  setAccountType('admin_staff');
                  changeMode('register_form');
                }}
                className="w-full p-4 rounded-2xl border-2 border-zinc-200 hover:border-purple-600 hover:bg-purple-50/40 text-right transition flex items-start gap-4 group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 group-hover:bg-indigo-700 group-hover:text-white transition">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-sm text-zinc-900">
                      3. حساب موظف / مدير
                    </h3>
                    <span className="text-[11px] font-bold text-indigo-800 bg-indigo-100 px-2.5 py-0.5 rounded-full">
                      إدارة ودعم فني
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
                    إدارة المنصة وفريق خدمة العملاء. (ملاحظة: صلاحيات الإدارة العليا محصورة بالرقم المعتمد رسمياً لدى إدارة المنصة).
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: REGISTRATION FORM */}
        {mode === 'register_form' && (
          <form onSubmit={handleInitiateOTP} className="p-6 sm:p-8 pt-4 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h2 className="text-base sm:text-lg font-black text-zinc-900">
                  {accountType === 'customer'
                    ? 'تسجيل حساب زبون جديد'
                    : accountType === 'merchant'
                    ? 'تسجيل حساب تاجر / مورّد جديد'
                    : 'تسجيل حساب موظف / مدير'}
                </h2>
                <p className="text-[11px] text-zinc-500">
                  الخطوة 1 من 2: التحقق برقم الهاتف العراقي عبر رمز OTP
                </p>
              </div>
              <button
                type="button"
                onClick={() => changeMode('register_choose_role')}
                className="text-xs text-zinc-500 hover:text-purple-700 font-bold cursor-pointer"
              >
                تغيير النوع
              </button>
            </div>

            {/* Special Notice for Admin / Staff */}
            {accountType === 'admin_staff' && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-[11px] space-y-1">
                <div className="font-black flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-amber-700" />
                  <span>تنبيه أمني لصلاحيات المدير:</span>
                </div>
                <p className="leading-relaxed">
                  صلاحية المدير الرئيسي (Admin) محصورة بالرقم المعتمد رسمياً لدى إدارة منصة دكانة فقط.
                  أي رقم آخر يسجل كـ «موظف/مدير» سيُسجل كموظف دعم فني فقط ولن يحصل على صلاحيات Admin كاملة.
                </p>
              </div>
            )}

            {/* Merchant Account Type Selector: Retail vs Wholesale */}
            {accountType === 'merchant' && (
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-2">
                <label className="block font-bold text-amber-950 text-xs">
                  اختر تخصص ونوع الحساب التجاري *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMerchantType('retail')}
                    className={`p-2.5 rounded-xl border text-right transition flex flex-col gap-0.5 cursor-pointer ${
                      merchantType === 'retail'
                        ? 'bg-amber-100 border-amber-500 font-black text-amber-950 shadow-xs ring-2 ring-amber-500/20'
                        : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                    }`}
                  >
                    <span className="text-xs font-bold">🛍️ متجر تجزئة (مفرد)</span>
                    <span className="text-[10px] text-zinc-500 font-normal">بيع للزبائن بالقطعة والمفرد</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMerchantType('wholesale')}
                    className={`p-2.5 rounded-xl border text-right transition flex flex-col gap-0.5 cursor-pointer ${
                      merchantType === 'wholesale'
                        ? 'bg-amber-100 border-amber-500 font-black text-amber-950 shadow-xs ring-2 ring-amber-500/20'
                        : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                    }`}
                  >
                    <span className="text-xs font-bold">🏭 تاجر / مورّد جملة</span>
                    <span className="text-[10px] text-zinc-500 font-normal">بضائع وكميات وتوريد عام</span>
                  </button>
                </div>
              </div>
            )}

            {/* Full Name */}
            <div>
              <label className="block font-bold text-zinc-700 mb-1">
                {accountType === 'merchant' ? 'اسم صاحب المتجر / المسؤول *' : 'الاسم الكامل *'}
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="مثال: أحمد عبد الله الكرخي"
                className="w-full px-3.5 py-2.5 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600 text-xs font-semibold"
              />
            </div>

            {/* Merchant Specific: Store Name & Activity */}
            {accountType === 'merchant' && (
              <>
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">
                    اسم المتجر التجاري *
                  </label>
                  <input
                    type="text"
                    required
                    value={storeName}
                    onChange={e => setStoreName(e.target.value)}
                    placeholder="مثال: تمور الفيحاء الملكية / أزياء بابل"
                    className="w-full px-3.5 py-2.5 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-purple-600/30 text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-zinc-700 mb-1">
                    وصف المتجر ونوع المنتجات
                  </label>
                  <input
                    type="text"
                    value={storeDescription}
                    onChange={e => setStoreDescription(e.target.value)}
                    placeholder="مثال: بيع الألبسة والجلابيات، تمور، مواد منزلية..."
                    className="w-full px-3.5 py-2.5 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-purple-600/30 text-xs"
                  />
                </div>
              </>
            )}

            {/* Phone Number */}
            <div>
              <label className="block font-bold text-zinc-700 mb-1">
                رقم الهاتف العراقي (لإرسال رمز OTP) *
              </label>
              <div className="relative">
                <input
                  type="tel"
                  name="dukana_reg_phone"
                  required
                  autoComplete="off"
                  data-lpignore="true"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="07XXXXXXXXX"
                  dir="ltr"
                  className="w-full px-3.5 py-2.5 text-left border border-zinc-200 rounded-xl focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600 font-mono tracking-wide text-xs"
                />
                <span className="absolute right-3 top-2.5 text-xs text-purple-700 font-bold pointer-events-none">
                  العراق 🇮🇶
                </span>
              </div>
              <span className="text-[11px] text-zinc-500 mt-1 block">
                مثال توضيحي: 07XXXXXXXXX (هذا مجرد مثال توضيحي وليس رقم تسجيل حقيقي، يرجى كتابة رقم هاتفك الفعلي)
              </span>
            </div>

            {/* Governorate */}
            <div>
              <label className="block font-bold text-zinc-700 mb-1">
                {accountType === 'merchant' ? 'المحافظة (مقر المتجر) *' : 'المحافظة *'}
              </label>
              <select
                value={governorate}
                onChange={e => setGovernorate(e.target.value as IraqiGovernorate)}
                className="w-full px-3.5 py-2.5 border border-zinc-200 rounded-xl bg-white text-xs font-semibold"
              >
                {IRAQI_GOVERNORATES.map(gov => (
                  <option key={gov.id} value={gov.id}>
                    {gov.nameAr}
                  </option>
                ))}
              </select>
            </div>

            {/* Address (For Customer) */}
            {accountType === 'customer' && (
              <div>
                <label className="block font-bold text-zinc-700 mb-1">
                  العنوان التفصيلي للتوصيل (اختياري)
                </label>
                <input
                  type="text"
                  value={detailedAddress}
                  onChange={e => setDetailedAddress(e.target.value)}
                  placeholder="مثال: الكرادة خارج، محلة 903، زقاق 12"
                  className="w-full px-3.5 py-2.5 border border-zinc-200 rounded-xl text-xs"
                />
              </div>
            )}

            {/* Legal Terms & Privacy Consent Notice */}
            <div className="p-3 bg-purple-50/70 border border-purple-200/80 rounded-xl text-[11px] text-zinc-600 flex items-start gap-2 text-right">
              <ShieldCheck className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                بالنقر على المتابعة، فإنك توافق وتلتزم بـ{' '}
                <button
                  type="button"
                  onClick={() => openCompliance('terms')}
                  className="text-purple-800 font-bold underline hover:text-purple-950 cursor-pointer"
                >
                  شروط الاستخدام
                </button>{' '}
                و{' '}
                <button
                  type="button"
                  onClick={() => openCompliance('privacy')}
                  className="text-purple-800 font-bold underline hover:text-purple-950 cursor-pointer"
                >
                  سياسة الخصوصية وتأمين بيانات الهاتف العراقي
                </button>.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-purple-700 hover:bg-purple-800 text-white font-black rounded-xl transition cursor-pointer shadow-md shadow-purple-700/20 flex items-center justify-center gap-2 mt-2 disabled:opacity-60"
            >
              <span>{isSubmitting ? 'جاري الإرسال...' : 'إرسال رمز التحقق OTP للرقم'}</span>
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* STEP 4: LOGIN FORM (Phone + Password Direct Login, or OTP switch) */}
        {mode === 'login_form' && (
          <form
            onSubmit={loginWithOTPMode ? handleInitiateOTP : handlePasswordLogin}
            className="p-6 sm:p-8 pt-4 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h2 className="text-base sm:text-lg font-black text-zinc-900">
                  {loginWithOTPMode ? 'تسجيل الدخول عبر رمز التحقق OTP' : 'تسجيل الدخول (زبون / تاجر ومورّد / إدارة)'}
                </h2>
                <p className="text-[11px] text-zinc-500">
                  {loginWithOTPMode
                    ? 'أدخل رقم هاتفك لتلقي رمز التحقق OTP للدخول لحسابك'
                    : 'أدخل رقم الهاتف المسجل وكلمة المرور للدخول المباشر إلى حسابك أو متجرك'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => changeMode('welcome')}
                className="text-xs text-zinc-500 hover:text-purple-700 font-bold cursor-pointer"
              >
                العودة
              </button>
            </div>

            {/* Phone Number Input */}
            <div>
              <label className="block font-bold text-zinc-700 mb-1">
                رقم الهاتف العراقي المسجل *
              </label>
              <div className="relative">
                <input
                  type="tel"
                  name="dukana_login_phone"
                  required
                  autoComplete="off"
                  data-lpignore="true"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="07XXXXXXXXX"
                  dir="ltr"
                  className="w-full px-3.5 py-3 text-left border border-zinc-200 rounded-xl focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600 font-mono tracking-wide text-sm font-bold"
                />
                <span className="absolute right-3 top-3 text-xs text-purple-700 font-bold pointer-events-none">
                  العراق 🇮🇶
                </span>
              </div>
              <span className="text-[11px] text-zinc-500 mt-1 block">
                مثال توضيحي: 07XXXXXXXXX (هذا مجرد مثال توضيحي وليس رقم تسجيل حقيقي، يرجى كتابة رقم هاتفك الفعلي المسجل).
              </span>
            </div>

            {/* Password Input (Direct Login mode) */}
            {!loginWithOTPMode && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-zinc-700">
                    كلمة المرور *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsResetFlow(true);
                      changeMode('forgot_password');
                    }}
                    className="text-[11px] text-purple-700 hover:text-purple-900 font-bold cursor-pointer hover:underline"
                  >
                    نسيت كلمة المرور؟
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    dir="ltr"
                    className="w-full px-3.5 py-3 pl-10 text-left border border-zinc-200 rounded-xl focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600 font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute left-3 top-3 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-purple-700 hover:bg-purple-800 text-white font-black rounded-xl transition cursor-pointer shadow-md shadow-purple-700/20 flex items-center justify-center gap-2 mt-2 disabled:opacity-60"
            >
              {loginWithOTPMode ? (
                <>
                  <span>{isSubmitting ? 'جاري الإرسال...' : 'إرسال رمز التحقق OTP للدخول'}</span>
                  <Send className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>{isSubmitting ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}</span>
                  <KeyRound className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Switch between Password and OTP Login */}
            <div className="pt-2 text-center flex flex-col items-center gap-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => {
                  setErrorMsg('');
                  setLoginWithOTPMode(!loginWithOTPMode);
                }}
                className="text-xs text-zinc-600 hover:text-purple-700 font-semibold cursor-pointer underline"
              >
                {loginWithOTPMode
                  ? 'تسجيل الدخول بكلمة المرور بدلاً من رمز OTP'
                  : 'تسجيل الدخول عبر رمز التحقق OTP'}
              </button>

              <div className="text-zinc-500">
                ليس لديك حساب بعد؟{' '}
                <button
                  type="button"
                  onClick={() => changeMode('register_choose_role')}
                  className="text-purple-700 font-bold hover:underline cursor-pointer"
                >
                  إنشاء حساب جديد
                </button>
              </div>

              {/* Legal Compliance Links in Login */}
              <div className="pt-2 text-center flex items-center justify-center gap-3 text-[11px] text-zinc-500 font-medium">
                <button
                  type="button"
                  onClick={() => openCompliance('privacy')}
                  className="hover:text-purple-700 transition cursor-pointer underline"
                >
                  سياسة الخصوصية
                </button>
                <span className="text-zinc-300">·</span>
                <button
                  type="button"
                  onClick={() => openCompliance('terms')}
                  className="hover:text-purple-700 transition cursor-pointer underline"
                >
                  شروط الاستخدام
                </button>
                <span className="text-zinc-300">·</span>
                <span className="text-zinc-400">سوق دُكَّانَة</span>
              </div>
            </div>
          </form>
        )}

        {/* STEP 5: FORGOT PASSWORD */}
        {mode === 'forgot_password' && (
          <form onSubmit={handleInitiateOTP} className="p-6 sm:p-8 pt-4 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h2 className="text-base sm:text-lg font-black text-zinc-900">
                  استعادة كلمة المرور
                </h2>
                <p className="text-[11px] text-zinc-500">
                  أدخل رقم هاتفك المسجل وسنرسل لك رمز OTP عبر SMS لتعيين كلمة مرور جديدة
                </p>
              </div>
              <button
                type="button"
                onClick={() => changeMode('login_form')}
                className="text-xs text-zinc-500 hover:text-purple-700 font-bold cursor-pointer"
              >
                العودة
              </button>
            </div>

            <div>
              <label className="block font-bold text-zinc-700 mb-1">
                رقم الهاتف المسجل (عراقي أو دولي) *
              </label>
              <div className="relative">
                <input
                  type="tel"
                  name="dukana_reset_phone"
                  required
                  autoComplete="off"
                  data-lpignore="true"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="07XXXXXXXXX"
                  dir="ltr"
                  className="w-full px-3.5 py-3 text-left border border-zinc-200 rounded-xl focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600 font-mono tracking-wide text-sm font-bold"
                />
                <span className="absolute right-3 top-3 text-xs text-purple-700 font-bold pointer-events-none">
                  العراق 🇮🇶 / 🌍
                </span>
              </div>
              <span className="text-[11px] text-zinc-500 mt-1 block">
                مثال توضيحي: 07XXXXXXXXX (هذا مجرد مثال توضيحي وليس رقماً حقيقياً، يرجى كتابة رقم هاتفك المسجل).
              </span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-purple-700 hover:bg-purple-800 text-white font-black rounded-xl transition cursor-pointer shadow-md shadow-purple-700/20 flex items-center justify-center gap-2 mt-2 disabled:opacity-60"
            >
              <span>{isSubmitting ? 'جاري الإرسال...' : 'إرسال رمز التحقق OTP'}</span>
              <Send className="w-4 h-4" />
            </button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => changeMode('login_form')}
                className="text-purple-700 font-bold hover:underline cursor-pointer"
              >
                تذكرت كلمة المرور؟ تسجيل الدخول الآن
              </button>
            </div>
          </form>
        )}

        {/* STEP 6: OTP VERIFICATION */}
        {mode === 'otp_verify' && (
          <form onSubmit={handleVerifyOTP} className="p-6 sm:p-8 pt-4 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h2 className="text-base sm:text-lg font-black text-zinc-900">
                  التحقق من رمز OTP
                </h2>
                <p className="text-[11px] text-zinc-500">
                  تم إرسال رمز التحقق إلى الرقم <span className="font-mono font-bold text-zinc-800" dir="ltr">{phone}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => changeMode(fullName ? 'register_form' : 'login_form')}
                className="text-xs text-zinc-500 hover:text-purple-700 font-bold cursor-pointer"
              >
                تغيير الرقم
              </button>
            </div>

            <div>
              <label className="block font-bold text-zinc-700 mb-1 text-center">
                أدخل رمز التحقق (6 أرقام) *
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={otpCode}
                onChange={e => setOtpCode(e.target.value)}
                placeholder="• • • • • •"
                dir="ltr"
                className="w-full px-4 py-3 text-center text-xl tracking-[0.5em] font-mono font-black border border-purple-300 rounded-2xl focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600"
              />
              <span className="text-[11px] text-zinc-400 mt-1 block text-center">
                صلاحية الرمز 5 دقائق · الحد الأقصى 3 محاولات إدخال
              </span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-purple-700 hover:bg-purple-800 text-white font-black rounded-xl transition cursor-pointer shadow-md shadow-purple-700/20 text-sm disabled:opacity-60"
            >
              {isSubmitting ? 'جاري التحقق...' : 'تأكيد الرمز والمتابعة'}
            </button>

            {/* Resend & Cooldown */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
              <span className="text-zinc-500">لم يصلك الرمز؟</span>
              <button
                type="button"
                disabled={cooldownSeconds > 0 || isSubmitting}
                onClick={handleResend}
                className="text-purple-700 disabled:text-zinc-400 font-bold flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>
                  {cooldownSeconds > 0
                    ? `إعادة الإرسال بعد ${cooldownSeconds} ثانية`
                    : 'إعادة إرسال الرمز الآن'}
                </span>
              </button>
            </div>
          </form>
        )}

        {/* STEP 7: CREATE OR RESET PASSWORD */}
        {mode === 'create_password' && (
          <form onSubmit={handlePasswordSubmit} className="p-6 sm:p-8 pt-4 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h2 className="text-base sm:text-lg font-black text-zinc-900">
                  {isResetFlow ? 'تعيين كلمة مرور جديدة' : 'إنشاء كلمة مرور لحسابك'}
                </h2>
                <p className="text-[11px] text-zinc-500">
                  {isResetFlow
                    ? 'أدخل كلمة المرور الجديدة وأكدها لتحديث حسابك والدخول به'
                    : 'أنشئ كلمة مرور قوية للدخول بها مستقبلاً مباشرة بدون انتظار رمز OTP'}
                </p>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block font-bold text-zinc-700 mb-1">
                {isResetFlow ? 'كلمة المرور الجديدة *' : 'كلمة المرور *'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  dir="ltr"
                  className="w-full px-3.5 py-3 pl-10 text-left border border-zinc-200 rounded-xl focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-3 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block font-bold text-zinc-700 mb-1">
                تأكيد كلمة المرور *
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  dir="ltr"
                  className="w-full px-3.5 py-3 pl-10 text-left border border-zinc-200 rounded-xl focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute left-3 top-3 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Password Validation Checklist */}
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-2xl space-y-1.5 text-[11px]">
              <div className="flex items-center gap-1.5">
                <Check
                  className={`w-3.5 h-3.5 ${
                    password.length >= 6 ? 'text-emerald-600' : 'text-zinc-300'
                  }`}
                />
                <span className={password.length >= 6 ? 'text-zinc-800 font-semibold' : 'text-zinc-500'}>
                  6 خانات على الأقل
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check
                  className={`w-3.5 h-3.5 ${
                    password && password === confirmPassword ? 'text-emerald-600' : 'text-zinc-300'
                  }`}
                />
                <span className={password && password === confirmPassword ? 'text-zinc-800 font-semibold' : 'text-zinc-500'}>
                  تطابق كلمتي المرور
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || password.length < 6 || password !== confirmPassword}
              className="w-full py-3 bg-purple-700 hover:bg-purple-800 text-white font-black rounded-xl transition cursor-pointer shadow-md shadow-purple-700/20 text-sm disabled:opacity-50"
            >
              {isSubmitting
                ? 'جاري الحفظ...'
                : isResetFlow
                ? 'حفظ كلمة المرور والعودة لتسجيل الدخول'
                : 'إنشاء كلمة المرور وإتمام التسجيل'}
            </button>

            {isResetFlow && (
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => changeMode('login_form')}
                  className="text-xs text-zinc-500 hover:text-purple-700 font-semibold cursor-pointer underline"
                >
                  العودة إلى شاشة تسجيل الدخول
                </button>
              </div>
            )}
          </form>
        )}

        {/* Modal for Privacy Policy & Terms of Service */}
        {complianceModalTab && (
          <ComplianceModal
            isOpen={true}
            onClose={() => setComplianceModalTab(null)}
            initialTab={complianceModalTab}
          />
        )}
      </div>
    </div>
  );
};
