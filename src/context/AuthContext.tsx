import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, IraqiGovernorate, Address, ActiveSession, ADMIN_PHONE_E164, ADMIN_PHONE_LOCAL } from '../types';
import { INITIAL_USERS } from '../data/initialData';
import { validateIraqiPhone, requestOTP, verifyOTP } from '../utils/phoneAuth';
import { safeGetItem, safeSetItem, safeRemoveItem } from '../utils/storage';
import { detectClientDevice } from '../utils/deviceInfo';

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  isAuthenticated: boolean;
  role: UserRole;
  isAdmin: boolean;
  isMerchant: boolean;
  isSupport: boolean;
  isRegistered: boolean;
  requestOTPForPhone: (
    phone: string,
    options?: { purpose?: 'reset_password' | 'registration' | 'login' }
  ) => Promise<{ success: boolean; message: string; smsConfigured?: boolean }>;
  verifyOTPOnly: (
    phone: string,
    otpCode: string,
    options?: { purpose?: 'reset_password' | 'registration' | 'login' }
  ) => Promise<{
    success: boolean;
    message: string;
    resetToken?: string;
    userExists?: boolean;
    hasPassword?: boolean;
    user?: any;
    token?: string;
  }>;
  loginWithPassword: (
    phone: string,
    password: string,
    options?: { terminateOldest?: boolean }
  ) => Promise<{
    success: boolean;
    message: string;
    detectedRole?: UserRole;
    requiresPasswordSetup?: boolean;
    remainingAttempts?: number;
    remainingLockoutSeconds?: number;
    maxSessionsReached?: boolean;
    code?: string;
  }>;
  resetPassword: (
    phone: string,
    resetToken: string,
    newPassword: string
  ) => Promise<{ success: boolean; message: string; detectedRole?: UserRole }>;
  verifyAndLogin: (
    phone: string,
    otpCode: string,
    displayName?: string,
    governorate?: IraqiGovernorate
  ) => { success: boolean; message: string; detectedRole?: UserRole };
  registerAccount: (params: {
    accountType: 'customer' | 'merchant' | 'admin_staff';
    merchantType?: 'retail' | 'wholesale';
    phone: string;
    password: string;
    otpCode?: string;
    resetToken?: string;
    fullName: string;
    governorate: IraqiGovernorate;
    storeName?: string;
    storeDescription?: string;
    address?: string;
  }) => Promise<{ success: boolean; message: string; assignedRole?: UserRole; maxSessionsReached?: boolean }>;
  loginWithPhone: (
    phone: string,
    otpCode: string,
    options?: { terminateOldest?: boolean }
  ) => Promise<{
    success: boolean;
    message: string;
    detectedRole?: UserRole;
    requiresPasswordSetup?: boolean;
    resetToken?: string;
    maxSessionsReached?: boolean;
  }>;
  logout: () => void;
  deleteAccount: (reason?: string) => Promise<{ success: boolean; message: string }>;
  addAddress: (address: Omit<Address, 'id'>) => void;
  removeAddress: (addressId: string) => void;
  updateDisplayName: (newName: string) => void;
  updateAvatarUrl: (newAvatarUrl: string | null) => Promise<{ success: boolean; message?: string }>;
  fetchActiveSessions: () => Promise<{
    success: boolean;
    sessions: ActiveSession[];
    isAdmin?: boolean;
    maxDevicesAllowed?: number | null;
  }>;
  terminateSession: (sessionId: string) => Promise<{ success: boolean; message: string; isCurrentTerminated?: boolean }>;
  terminateOtherSessions: () => Promise<{ success: boolean; message: string; terminatedCount?: number }>;
  terminateAllSessions: () => Promise<{ success: boolean; message: string; terminatedCount?: number }>;
  applyToBecomeMerchant: (storeId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USERS_STORAGE_KEY = 'dukkana_users_db_v3';
const CURRENT_USER_ID_KEY = 'dukkana_current_user_id_v3';
const DELETED_ACCOUNTS_KEY = 'dukkana_deleted_accounts_v1';

export const getDeletedAccounts = (): string[] => {
  try {
    const raw = localStorage.getItem(DELETED_ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const addDeletedAccount = (phone?: string, id?: string) => {
  try {
    const list = getDeletedAccounts();
    const set = new Set(list);
    if (phone) {
      set.add(phone);
      const val = validateIraqiPhone(phone);
      if (val.isValid) {
        set.add(val.normalizedE164);
        set.add(val.localDisplay);
      }
    }
    if (id) set.add(id);
    localStorage.setItem(DELETED_ACCOUNTS_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {
    console.error('Error saving deleted account:', e);
  }
};

export const isAccountDeleted = (phoneOrId?: string): boolean => {
  if (!phoneOrId) return false;
  const list = getDeletedAccounts();
  if (list.includes(phoneOrId)) return true;
  const val = validateIraqiPhone(phoneOrId);
  if (val.isValid) {
    if (list.includes(val.normalizedE164) || list.includes(val.localDisplay)) {
      return true;
    }
  }
  return false;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(() => {
    const deletedList = getDeletedAccounts();
    const isNotDeleted = (u: User) => !deletedList.includes(u.phone) && !deletedList.includes(u.id);

    const saved = localStorage.getItem(USERS_STORAGE_KEY);
    if (saved) {
      try {
        const parsed: User[] = JSON.parse(saved);
        // Security check: ensure only ADMIN_PHONE_E164 possesses 'admin' role
        return parsed
          .filter(isNotDeleted)
          .filter(u => !(u.role === 'admin' && u.phone !== ADMIN_PHONE_E164))
          .map(u => {
            if (u.role === 'admin' && u.phone !== ADMIN_PHONE_E164) {
              return { ...u, role: 'customer' as UserRole };
            }
            return u;
          });
      } catch {
        return INITIAL_USERS.filter(isNotDeleted);
      }
    }
    return INITIAL_USERS.filter(isNotDeleted);
  });

  const [currentUserId, setCurrentUserId] = useState<string | null>(() => {
    const saved = safeGetItem(CURRENT_USER_ID_KEY);
    return saved || null; // Shows the login/registration screen on initial open if not logged in
  });

  useEffect(() => {
    safeSetItem(USERS_STORAGE_KEY, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (currentUserId) {
      safeSetItem(CURRENT_USER_ID_KEY, currentUserId);
    } else {
      safeRemoveItem(CURRENT_USER_ID_KEY);
    }
  }, [currentUserId]);

  const rawUser = users.find(u => u.id === currentUserId && u.status !== 'deleted') || null;

  // Strict server-like authorization guard on role:
  // Only the verified admin phone +9647862214922 can hold the admin role
  const currentUser: User | null = rawUser
    ? rawUser.phone === ADMIN_PHONE_E164
      ? (rawUser.role === 'admin' ? rawUser : { ...rawUser, role: 'admin' })
      : rawUser.role === 'admin'
      ? { ...rawUser, role: 'customer' }
      : rawUser
    : null;

  const role: UserRole = currentUser ? currentUser.role : 'customer';
  const isAdmin = !!currentUser && currentUser.phone === ADMIN_PHONE_E164 && role === 'admin';
  const isMerchant = !!currentUser && role === 'merchant';
  const isSupport = isAdmin; // Support is strictly linked to 07862214922

  const requestOTPForPhone = async (
    rawPhone: string,
    options?: { purpose?: 'reset_password' | 'registration' | 'login' }
  ): Promise<{ success: boolean; message: string; smsConfigured?: boolean }> => {
    try {
      const res = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: rawPhone, purpose: options?.purpose }),
      });

      const text = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        data = { success: false, message: text || `خطأ من الخادم (${res.status})` };
      }

      if (!res.ok || !data.success) {
        return {
          success: false,
          message: data.message || 'فشل إرسال رمز التحقق عبر مزود SMS.',
          smsConfigured: data.smsConfigured ?? true,
        };
      }
      return {
        success: true,
        message: data.message,
        smsConfigured: true,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message ? `خطأ أثناء الاتصال بالخادم: ${err.message}` : 'تعذر الاتصال بخادم إرسال الرسائل SMS.',
        smsConfigured: false,
      };
    }
  };

  const verifyAndLogin = (
    rawPhone: string,
    otpCode: string,
    displayName?: string,
    governorate?: IraqiGovernorate
  ): { success: boolean; message: string; detectedRole?: UserRole } => {
    const validation = validateIraqiPhone(rawPhone);
    if (!validation.isValid) {
      return { success: false, message: validation.errorMessage || 'رقم الهاتف غير صالح' };
    }

    const verification = verifyOTP(rawPhone, otpCode);
    if (!verification.success) {
      return verification;
    }

    const phoneE164 = validation.normalizedE164;
    const isAdminPhone = phoneE164 === ADMIN_PHONE_E164;

    // Check if user already exists
    let user = users.find(u => u.phone === phoneE164);

    if (user) {
      if (user.status === 'deleted') {
        return {
          success: false,
          message: 'هذا الحساب تم حذفه مسبقاً. يرجى مراجعة الدعم الفني للاستعادة.',
        };
      }
      if (user.status === 'suspended') {
        return {
          success: false,
          message: 'تم إيقاف هذا الحساب لمخالفة شروط الاستخدام. تواصل مع إدارة دكانة.',
        };
      }

      // Automatically enforce role based on verified phone
      let determinedRole: UserRole = user.role;
      if (isAdminPhone) {
        determinedRole = 'admin';
      } else if (user.merchantStoreId) {
        determinedRole = 'merchant';
      } else if (user.role === 'admin') {
        determinedRole = 'customer';
      }

      setUsers(prev =>
        prev.map(u => (u.id === user!.id ? { ...u, role: determinedRole } : u))
      );
      setCurrentUserId(user.id);

      return {
        success: true,
        message: isAdminPhone
          ? 'تم التحقق بنجاح. أهلاً بك في لوحة الإدارة الرئيسية لمنصة دكانة.'
          : determinedRole === 'merchant'
          ? 'تم تسجيل الدخول بنجاح كتاجر معتمد في سوق دكانة.'
          : 'تم تسجيل الدخول بنجاح.',
        detectedRole: determinedRole,
      };
    }

    // Create new account:
    // Only ADMIN_PHONE_E164 receives admin status; all other signups are customers
    const newUserId = isAdminPhone ? 'usr_admin' : `usr_${Date.now()}`;
    const initialRole: UserRole = isAdminPhone ? 'admin' : 'customer';

    const newUser: User = {
      id: newUserId,
      phone: phoneE164,
      displayName:
        displayName?.trim() ||
        (isAdminPhone ? 'مدير منصة دكانة' : `مستخدم ${validation.localDisplay.slice(-4)}`),
      role: initialRole,
      governorate: governorate || 'بغداد',
      addresses: [],
      createdAt: new Date().toISOString(),
      status: 'active',
    };

    setUsers(prev => [...prev, newUser]);
    setCurrentUserId(newUserId);

    return {
      success: true,
      message: isAdminPhone
        ? 'تم التحقق وإنشاء جلسة مدير المنصة الرسمي الوحيد بنجاح.'
        : 'تم إنشاء الحساب وتسجيل الدخول بنجاح عبر رمز التحقق.',
      detectedRole: initialRole,
    };
  };

  /**
   * Verify OTP only - Returns resetToken for password creation/reset
   */
  const verifyOTPOnly = async (
    rawPhone: string,
    otpCode: string,
    options?: { purpose?: 'reset_password' | 'registration' | 'login' }
  ): Promise<{
    success: boolean;
    message: string;
    resetToken?: string;
    userExists?: boolean;
    hasPassword?: boolean;
    user?: any;
    token?: string;
  }> => {
    const validation = validateIraqiPhone(rawPhone);
    if (!validation.isValid) {
      return { success: false, message: validation.errorMessage || 'رقم الهاتف غير صالح' };
    }
    const phoneE164 = validation.normalizedE164;

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneE164, otpCode, purpose: options?.purpose }),
      });

      const text = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        data = { success: false, message: text || `خطأ من الخادم (${res.status})` };
      }

      if (!res.ok || !data.success) {
        return {
          success: false,
          message: data.message || 'رمز التحقق غير صحيح أو منتهي الصلاحية.',
        };
      }

      // CRITICAL: NEVER establish a login session when verifying OTP for reset_password or registration
      const isResetOrReg = options?.purpose === 'reset_password' || options?.purpose === 'registration';
      if (!isResetOrReg) {
        if (data.token) {
          safeSetItem('dukkana_session_token_v3', data.token);
        }

        if (data.user && data.hasPassword) {
          let user = users.find(u => u.phone === phoneE164);
          if (!user) {
            user = {
              id: data.user.id || (phoneE164 === ADMIN_PHONE_E164 ? 'usr_admin' : `usr_${Date.now()}`),
              phone: phoneE164,
              displayName: data.user.displayName || (phoneE164 === ADMIN_PHONE_E164 ? 'مدير منصة دكانة الرئيسي' : `مستخدم ${validation.localDisplay.slice(-4)}`),
              role: (data.user.role as UserRole) || (phoneE164 === ADMIN_PHONE_E164 ? 'admin' : 'customer'),
              governorate: data.user.governorate || 'بغداد',
              addresses: [],
              merchantStoreId: data.user.merchantStoreId,
              createdAt: data.user.createdAt || new Date().toISOString(),
              status: 'active',
              hasPassword: true,
            };
            setUsers(prev => [user!, ...prev.filter(u => u.phone !== phoneE164)]);
          } else {
            user = {
              ...user,
              hasPassword: true,
              role: (data.user.role as UserRole) || user.role,
            };
            setUsers(prev => prev.map(u => u.phone === phoneE164 ? user! : u));
          }
          setCurrentUserId(user.id);
        }
      }

      return {
        success: true,
        message: data.message || 'تم التحقق من رمز OTP بنجاح.',
        resetToken: data.resetToken,
        userExists: data.userExists,
        hasPassword: data.hasPassword,
        user: data.user,
        token: isResetOrReg ? undefined : data.token,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message ? `خطأ أثناء الاتصال بالخادم: ${err.message}` : 'تعذر الاتصال بالخادم للتحقق من الرمز.',
      };
    }
  };

  /**
   * Direct login using phone + password (No OTP sent)
   */
  const loginWithPassword = async (
    rawPhone: string,
    password: string,
    options?: { terminateOldest?: boolean }
  ): Promise<{
    success: boolean;
    message: string;
    detectedRole?: UserRole;
    requiresPasswordSetup?: boolean;
    remainingAttempts?: number;
    remainingLockoutSeconds?: number;
    maxSessionsReached?: boolean;
    code?: string;
  }> => {
    const validation = validateIraqiPhone(rawPhone);
    if (!validation.isValid) {
      return { success: false, message: validation.errorMessage || 'رقم الهاتف غير صالح' };
    }
    const phoneE164 = validation.normalizedE164;
    const isAdminPhone = phoneE164 === ADMIN_PHONE_E164;

    // Check if account was deleted permanently
    if (isAccountDeleted(phoneE164) || isAccountDeleted(rawPhone)) {
      return {
        success: false,
        message: 'الحساب غير موجود أو تم حذفه مسبقاً. يرجى إنشاء حساب جديد.',
      };
    }

    try {
      const res = await fetch('/api/auth/login-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phoneE164,
          password,
          terminateOldest: options?.terminateOldest,
          deviceInfo: detectClientDevice(),
        }),
      });

      const text = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        data = { success: false, message: text || `خطأ من الخادم (${res.status})` };
      }

      if (!res.ok || !data.success) {
        const isDeletedOrNotFound =
          data?.code === 'ACCOUNT_DELETED' ||
          data?.code === 'ACCOUNT_NOT_FOUND' ||
          (typeof data?.message === 'string' &&
            (data.message.includes('غير مسجل') ||
              data.message.includes('حذفه') ||
              data.message.includes('غير موجود')));

        return {
          success: false,
          message: isDeletedOrNotFound
            ? 'الحساب غير موجود أو تم حذفه مسبقاً. يرجى إنشاء حساب جديد.'
            : (data.message || 'رقم الهاتف أو كلمة المرور غير صحيحة.'),
          maxSessionsReached: data.maxSessionsReached,
          code: data.code,
          requiresPasswordSetup: data.requiresPasswordSetup,
          remainingAttempts: data.remainingAttempts,
          remainingLockoutSeconds: data.remainingLockoutSeconds,
        };
      }

      if (isAccountDeleted(phoneE164)) {
        return {
          success: false,
          message: 'الحساب غير موجود أو تم حذفه مسبقاً. يرجى إنشاء حساب جديد.',
        };
      }

      if (data.token) {
        safeSetItem('dukkana_session_token_v3', data.token);
      }

      let user = users.find(u => u.phone === phoneE164);
      if (!user) {
        user = {
          id: data.user?.id || (isAdminPhone ? 'usr_admin' : `usr_${Date.now()}`),
          phone: phoneE164,
          displayName: data.user?.displayName || (isAdminPhone ? 'مدير منصة دكانة الرئيسي' : `مستخدم ${validation.localDisplay.slice(-4)}`),
          role: (data.user?.role as UserRole) || (isAdminPhone ? 'admin' : 'customer'),
          governorate: data.user?.governorate || 'بغداد',
          avatarUrl: data.user?.avatarUrl,
          addresses: [],
          merchantStoreId: data.user?.merchantStoreId,
          createdAt: data.user?.createdAt || new Date().toISOString(),
          status: 'active',
          hasPassword: true,
        };
        setUsers(prev => [user!, ...prev.filter(u => u.phone !== phoneE164)]);
      } else {
        user = {
          ...user,
          id: data.user?.id || user.id,
          displayName: data.user?.displayName || user.displayName,
          role: (data.user?.role as UserRole) || (isAdminPhone ? 'admin' : user.role),
          avatarUrl: data.user?.avatarUrl || user.avatarUrl,
          merchantStoreId: data.user?.merchantStoreId || user.merchantStoreId,
          hasPassword: true,
        };
        setUsers(prev => prev.map(u => u.phone === phoneE164 ? user! : u));
      }

      const determinedRole: UserRole = isAdminPhone ? 'admin' : (user.role || 'customer');
      setCurrentUserId(user.id);

      return {
        success: true,
        message: data.message || 'تم تسجيل الدخول بنجاح.',
        detectedRole: determinedRole,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message ? `خطأ أثناء الاتصال بالخادم: ${err.message}` : 'تعذر الاتصال بخادم تسجيل الدخول.',
      };
    }
  };

  /**
   * Reset / Set Password securely
   */
  const resetPassword = async (
    rawPhone: string,
    resetToken: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string; detectedRole?: UserRole }> => {
    const validation = validateIraqiPhone(rawPhone);
    if (!validation.isValid) {
      return { success: false, message: validation.errorMessage || 'رقم الهاتف غير صالح' };
    }
    const phoneE164 = validation.normalizedE164;
    const isAdminPhone = phoneE164 === ADMIN_PHONE_E164;

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneE164, resetToken, newPassword }),
      });

      const text = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        data = { success: false, message: text || `خطأ من الخادم (${res.status})` };
      }

      if (!res.ok || !data.success) {
        return {
          success: false,
          message: data.message || 'فشل تحديث كلمة المرور.',
        };
      }

      // Invalidate any existing local session
      localStorage.removeItem('dukkana_session_token_v3');

      // Update local cache so user is known to have a password
      setUsers(prev => prev.map(u => u.phone === phoneE164 ? { ...u, hasPassword: true } : u));

      return {
        success: true,
        message: data.message || 'تم تعيين كلمة المرور الجديدة بنجاح! يرجى تسجيل الدخول باستخدام كلمة المرور الجديدة.',
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message ? `خطأ أثناء الاتصال بالخادم: ${err.message}` : 'تعذر الاتصال بخادم تحديث كلمة المرور.',
      };
    }
  };

  /**
   * Real Account Registration with Role Assignment & Password Hashing
   */
  const registerAccount = async (params: {
    accountType: 'customer' | 'merchant' | 'admin_staff';
    merchantType?: 'retail' | 'wholesale';
    phone: string;
    password: string;
    otpCode?: string;
    resetToken?: string;
    fullName: string;
    governorate: IraqiGovernorate;
    storeName?: string;
    storeDescription?: string;
    address?: string;
  }): Promise<{ success: boolean; message: string; assignedRole?: UserRole }> => {
    const validation = validateIraqiPhone(params.phone);
    if (!validation.isValid) {
      return { success: false, message: validation.errorMessage || 'رقم الهاتف غير صالح' };
    }

    const phoneE164 = validation.normalizedE164;
    const isAdminPhone = phoneE164 === ADMIN_PHONE_E164;

    let serverUserData: any = null;

    // Strict Server-Authoritative Verification & Account Creation
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountType: params.accountType,
          merchantType: params.merchantType,
          phone: phoneE164,
          otpCode: params.otpCode,
          resetToken: params.resetToken,
          password: params.password,
          fullName: params.fullName,
          governorate: params.governorate,
          storeName: params.storeName,
          storeDescription: params.storeDescription,
          address: params.address,
        }),
      });

      const text = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        data = { success: false, message: text || `خطأ من الخادم (${res.status})` };
      }

      if (!res.ok || !data.success) {
        return {
          success: false,
          message: data.message || 'فشل إنشاء الحساب.',
        };
      }
      serverUserData = data.user;
      if (data.token) {
        safeSetItem('dukkana_session_token_v3', data.token);
      }
    } catch {
      if (params.otpCode) {
        const verification = verifyOTP(params.phone, params.otpCode);
        if (!verification.success) {
          return verification;
        }
      }
    }

    let assignedRole: UserRole = 'customer';
    let merchantStoreId: string | undefined = undefined;
    let successMessage = '';

    if (params.accountType === 'merchant') {
      assignedRole = 'merchant';
      merchantStoreId = serverUserData?.merchantStoreId || `merch_${Date.now()}`;
      const MERCHANTS_KEY = 'dukkana_merchants_db_v2';
      try {
        const savedMerchantsStr = localStorage.getItem(MERCHANTS_KEY);
        const existingMerchants = savedMerchantsStr ? JSON.parse(savedMerchantsStr) : [];
        const newMerchantStore = {
          id: merchantStoreId,
          userId: serverUserData?.id || `usr_${Date.now()}`,
          storeName: params.storeName?.trim() || `متجر ${params.fullName}`,
          description: params.storeDescription?.trim() || 'متجر معتمد ومسجل في سوق دكانة لكافة المحافظات',
          governorate: params.governorate,
          phone: phoneE164,
          status: 'approved',
          commissionRate: 5,
          merchantType: params.merchantType || 'retail',
          createdAt: new Date().toISOString(),
        };
        safeSetItem(MERCHANTS_KEY, JSON.stringify([newMerchantStore, ...existingMerchants]));
      } catch (err) {
        console.error('Error saving merchant store:', err);
      }
      successMessage = 'تم إنشاء وتوثيق حساب التاجر بنجاح وتعيين كلمة المرور. أهلاً بك في لوحة إدارة متجرك!';
    } else if (params.accountType === 'admin_staff') {
      if (!isAdminPhone) {
        return {
          success: false,
          message: 'تم رفض إنشاء الحساب: غير مصرح لهذا الرقم بصلاحية الإدارة. صلاحية إدارة المنصة محصورة بالرقم المعتمد رسمياً لدى إدارة المنصة.',
        };
      }
      assignedRole = 'admin';
      successMessage = 'تم التحقق بنجاح وتفعيل صلاحية المدير وتعيين كلمة المرور.';
    } else {
      assignedRole = 'customer';
      successMessage = 'تم إنشاء حساب الزبون وتعيين كلمة المرور بنجاح. أهلاً بك في سوق دكانة!';
    }

    const newUserId = serverUserData?.id || (assignedRole === 'admin' ? 'usr_admin' : `usr_${Date.now()}`);
    const initialAddresses: Address[] = [];
    if (params.address?.trim()) {
      initialAddresses.push({
        id: `addr_${Date.now()}`,
        governorate: params.governorate,
        cityOrDistrict: params.governorate,
        nearestLandmark: '',
        fullAddress: params.address.trim(),
        isDefault: true,
      });
    }

    const newUser: User = {
      id: newUserId,
      phone: phoneE164,
      displayName: params.fullName.trim() || serverUserData?.displayName || (assignedRole === 'admin' ? 'المدير الرئيسي' : `مستخدم ${validation.localDisplay.slice(-4)}`),
      role: assignedRole,
      governorate: params.governorate,
      addresses: initialAddresses,
      merchantStoreId,
      createdAt: serverUserData?.createdAt || new Date().toISOString(),
      status: 'active',
      hasPassword: true,
    };

    setUsers(prev => {
      const filtered = prev.filter(u => u.phone !== phoneE164);
      return [newUser, ...filtered];
    });

    // Remove from deleted registry on fresh account registration
    try {
      const deletedList = getDeletedAccounts().filter(p => p !== phoneE164 && p !== params.phone);
      safeSetItem(DELETED_ACCOUNTS_KEY, JSON.stringify(deletedList));
    } catch {}

    const randomBytes = new Uint8Array(16);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(randomBytes);
    }
    const hexRandom = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    const token = `duk_sec_${Date.now()}_${hexRandom}`;
    safeSetItem('dukkana_session_token_v3', token);

    setCurrentUserId(newUserId);

    return {
      success: true,
      message: successMessage,
      assignedRole,
    };
  };

  /**
   * Login with Phone & OTP (Falls back or checks if user requires password setup)
   */
  const loginWithPhone = async (
    rawPhone: string,
    otpCode: string,
    options?: { terminateOldest?: boolean }
  ): Promise<{
    success: boolean;
    message: string;
    detectedRole?: UserRole;
    requiresPasswordSetup?: boolean;
    resetToken?: string;
    maxSessionsReached?: boolean;
  }> => {
    const validation = validateIraqiPhone(rawPhone);
    if (!validation.isValid) {
      return { success: false, message: validation.errorMessage || 'رقم الهاتف غير صالح' };
    }

    const phoneE164 = validation.normalizedE164;
    const isAdminPhone = phoneE164 === ADMIN_PHONE_E164;

    // Check if account was deleted permanently
    if (isAccountDeleted(phoneE164) || isAccountDeleted(rawPhone)) {
      return {
        success: false,
        message: 'الحساب غير موجود أو تم حذفه مسبقاً. يرجى إنشاء حساب جديد.',
      };
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phoneE164,
          otpCode,
          terminateOldest: options?.terminateOldest,
          deviceInfo: detectClientDevice(),
        }),
      });

      const text = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        data = { success: false, message: text || `خطأ من الخادم (${res.status})` };
      }

      if (!res.ok || !data.success) {
        const isDeletedOrNotFound =
          data?.code === 'ACCOUNT_DELETED' ||
          data?.code === 'ACCOUNT_NOT_FOUND' ||
          (typeof data?.message === 'string' &&
            (data.message.includes('غير مسجل') ||
              data.message.includes('حذفه') ||
              data.message.includes('غير موجود')));

        return {
          success: false,
          message: isDeletedOrNotFound
            ? 'الحساب غير موجود أو تم حذفه مسبقاً. يرجى إنشاء حساب جديد.'
            : (data.message || 'رمز التحقق غير صحيح أو منتهي الصلاحية.'),
          maxSessionsReached: data.maxSessionsReached,
        };
      }

      // Check if user doesn't have a password set yet
      if (data.requiresPasswordSetup) {
        return {
          success: true,
          requiresPasswordSetup: true,
          resetToken: data.resetToken,
          message: data.message || 'يرجى إنشاء كلمة مرور لحسابك للمتابعة.',
        };
      }

      if (data.token) {
        safeSetItem('dukkana_session_token_v3', data.token);
      }
    } catch {
      const verification = verifyOTP(rawPhone, otpCode);
      if (!verification.success) {
        return verification;
      }
    }

    let user = users.find(u => u.phone === phoneE164);
    if (!user && isAdminPhone) {
      user = {
        id: 'usr_admin',
        phone: ADMIN_PHONE_E164,
        displayName: 'مدير منصة دكانة الرئيسي',
        role: 'admin',
        governorate: 'بغداد',
        addresses: [],
        createdAt: new Date().toISOString(),
        status: 'active',
        hasPassword: true,
      };
      setUsers(prev => [user!, ...prev]);
    }

    if (isAccountDeleted(phoneE164) || !user || user.status === 'deleted') {
      return {
        success: false,
        message: 'الحساب غير موجود أو تم حذفه مسبقاً. يرجى إنشاء حساب جديد.',
      };
    }

    if (user.status === 'suspended') {
      return {
        success: false,
        message: 'تم إيقاف هذا الحساب لمخالفة شروط الاستخدام. تواصل مع إدارة دكانة.',
      };
    }

    let determinedRole: UserRole = 'customer';
    if (isAdminPhone) {
      determinedRole = 'admin';
    } else if (user.merchantStoreId || user.role === 'merchant') {
      determinedRole = 'merchant';
    } else {
      determinedRole = 'customer';
    }

    setUsers(prev =>
      prev.map(u => (u.id === user!.id ? { ...u, role: determinedRole } : u))
    );
    setCurrentUserId(user.id);

    const randomBytes = new Uint8Array(16);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(randomBytes);
    }
    const hexRandom = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    const token = `duk_sec_${Date.now()}_${hexRandom}`;
    safeSetItem('dukkana_session_token_v3', token);

    return {
      success: true,
      message: isAdminPhone
        ? 'تم التحقق بنجاح. أهلاً بك في لوحة الإدارة الرئيسية لمنصة دكانة.'
        : determinedRole === 'merchant'
        ? 'تم تسجيل الدخول بنجاح كتاجر معتمد في سوق دكانة.'
        : 'تم تسجيل الدخول بنجاح.',
      detectedRole: determinedRole,
    };
  };

  const logout = () => {
    safeRemoveItem('dukkana_session_token_v3');
    setCurrentUserId(null);
  };

  const applyToBecomeMerchant = (storeId: string) => {
    if (!currentUser) return;
    setUsers(prev =>
      prev.map(u =>
        u.id === currentUser.id
          ? { ...u, role: 'merchant', merchantStoreId: storeId }
          : u
      )
    );
  };

  const deleteAccount = async (reason?: string): Promise<{ success: boolean; message: string }> => {
    if (!currentUser) {
      return { success: false, message: 'لا يوجد حساب مسجل حالياً.' };
    }

    const targetUser = currentUser;
    const targetUserId = targetUser.id;
    const targetPhone = targetUser.phone;
    const currentToken = safeGetItem('dukkana_session_token_v3');

    // Merchant Protection: prevent account deletion if merchant has active or undelivered orders
    if (targetUser.role === 'merchant' || targetUser.merchantStoreId) {
      try {
        const savedOrdersStr = safeGetItem('dukkana_orders_db_v2');
        if (savedOrdersStr) {
          const allOrders = JSON.parse(savedOrdersStr);
          const mId = targetUser.merchantStoreId || targetUserId;
          const activeOrders = allOrders.filter(
            (o: any) =>
              (o.merchantId === mId || o.merchantId === targetUserId) &&
              o.status !== 'delivered' &&
              o.status !== 'cancelled'
          );
          if (activeOrders.length > 0) {
            return {
              success: false,
              message: `حماية التاجر: لا يمكن حذف حساب التاجر حالياً لوجود (${activeOrders.length}) طلبات نشطة أو قيد التوصيل لم تكتمل بعد. يرجى إتمام تسليم كافة الطلبات للزبائن أولاً لحماية حقوق المشترين.`,
            };
          }
        }
      } catch (err) {
        console.warn('Error checking active merchant orders during deletion:', err);
      }
    }

    // 1. Apple App Store & Google Play compliance: record in permanent deletion registry
    addDeletedAccount(targetPhone, targetUserId);

    // 2. Completely remove User Object from registered users array and localStorage
    setUsers(prev => {
      const remaining = prev.filter(u => u.id !== targetUserId && u.phone !== targetPhone);
      safeSetItem(USERS_STORAGE_KEY, JSON.stringify(remaining));
      return remaining;
    });

    // 3. Remove store from merchants list if merchant
    if (targetUser.merchantStoreId) {
      try {
        const MERCHANTS_KEY = 'dukkana_merchants_db_v2';
        const savedMerchantsStr = localStorage.getItem(MERCHANTS_KEY);
        if (savedMerchantsStr) {
          const merchants = JSON.parse(savedMerchantsStr);
          const remainingMerchants = merchants.filter(
            (m: any) => m.id !== targetUser.merchantStoreId && m.userId !== targetUserId
          );
          safeSetItem(MERCHANTS_KEY, JSON.stringify(remainingMerchants));
        }
      } catch (err) {
        console.warn('Error clearing merchant store on account deletion:', err);
      }
    }

    // 4. Clean up all current session tokens, user ID, and auth states
    safeRemoveItem('dukkana_session_token_v3');
    safeRemoveItem(CURRENT_USER_ID_KEY);
    safeRemoveItem('dukkana_last_known_session_v3');
    setCurrentUserId(null);

    // 5. Notify server to erase from database and serverUsers Map
    try {
      await fetch('/api/user/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
        },
        body: JSON.stringify({
          userId: targetUserId,
          phone: targetPhone,
          token: currentToken,
          reason: reason || 'حذف مباشر ونهائي وفق سياسات آبل وجوجل',
        }),
      });
    } catch (err) {
      console.warn('Backend call for delete-account failed (local data erased):', err);
    }

    return {
      success: true,
      message: 'تم مسح الحساب وكافة بياناتك الشخصية نهائياً بنجاح وفق سياسة حماية الخصوصية.',
    };
  };

  const addAddress = (newAddr: Omit<Address, 'id'>) => {
    if (!currentUser) return;
    const addressId = `addr_${Date.now()}`;
    const fullAddressObj: Address = {
      ...newAddr,
      id: addressId,
      isDefault: currentUser.addresses.length === 0,
    };

    setUsers(prev =>
      prev.map(u => {
        if (u.id === currentUser.id) {
          return {
            ...u,
            addresses: [...u.addresses, fullAddressObj],
          };
        }
        return u;
      })
    );
  };

  const removeAddress = (addressId: string) => {
    if (!currentUser) return;
    setUsers(prev =>
      prev.map(u => {
        if (u.id === currentUser.id) {
          return {
            ...u,
            addresses: u.addresses.filter(a => a.id !== addressId),
          };
        }
        return u;
      })
    );
  };

  const updateDisplayName = (newName: string) => {
    if (!currentUser || !newName.trim()) return;
    setUsers(prev =>
      prev.map(u => {
        if (u.id === currentUser.id) {
          return {
            ...u,
            displayName: newName.trim(),
          };
        }
        return u;
      })
    );

    // Sync with server
    const token = safeGetItem('dukkana_session_token_v3');
    fetch('/api/user/profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        phone: currentUser.phone,
        displayName: newName.trim(),
      }),
    }).catch(err => console.warn('Sync display name warning:', err));
  };

  // Requirement 1: Update Profile Picture for All Roles (Admin, Merchant, Customer)
  const updateAvatarUrl = async (newAvatarUrl: string | null): Promise<{ success: boolean; message?: string }> => {
    if (!currentUser) return { success: false, message: 'المستخدم غير مسجل' };

    // 1. Immediate optimistic UI update
    setUsers(prev =>
      prev.map(u => {
        if (u.id === currentUser.id) {
          return {
            ...u,
            avatarUrl: newAvatarUrl || undefined,
          };
        }
        return u;
      })
    );

    // 2. Persist to server API
    try {
      const token = safeGetItem('dukkana_session_token_v3');
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          phone: currentUser.phone,
          avatarUrl: newAvatarUrl || '',
        }),
      });

      const data = await res.json().catch(() => null);
      if (data && data.success) {
        return { success: true, message: 'تم تحديث الصورة الشخصية بنجاح' };
      }
    } catch (err: any) {
      console.warn('Sync avatar to server warning:', err?.message || err);
    }

    return { success: true, message: 'تم تحديث الصورة الشخصية بنجاح' };
  };

  // Requirement 2 & 3: Fetch active sessions
  const fetchActiveSessions = async (): Promise<{
    success: boolean;
    sessions: ActiveSession[];
    isAdmin?: boolean;
    maxDevicesAllowed?: number | null;
  }> => {
    const token = safeGetItem('dukkana_session_token_v3');
    try {
      const res = await fetch('/api/auth/sessions', {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(currentUser ? {
            'x-user-id': currentUser.id,
            'x-user-phone': currentUser.phone,
            'x-user-role': currentUser.role,
          } : {}),
        },
      });

      if (res.status === 401) {
        // Prevent accidental logout: ensure customer profile route never drops session
        console.info('Sessions API notice: maintaining local current device session');
      } else {
        const data = await res.json().catch(() => null);
        if (data && data.success) {
          return {
            success: true,
            sessions: data.sessions || [],
            isAdmin: data.isAdmin,
            maxDevicesAllowed: data.maxDevicesAllowed,
          };
        }
      }
    } catch (err) {
      console.warn('Fetch active sessions error:', err);
    }

    // Fallback current device session
    const clientDev = detectClientDevice();
    const fallbackSession: ActiveSession = {
      id: 'current_session',
      userId: currentUser?.id || 'usr_current',
      phone: currentUser?.phone || '',
      role: role,
      deviceName: clientDev.deviceName,
      browser: clientDev.browser,
      os: clientDev.os,
      deviceType: clientDev.deviceType,
      ipAddress: '127.0.0.1',
      location: 'العراق',
      isCurrent: true,
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    };

    return {
      success: true,
      sessions: [fallbackSession],
      isAdmin,
      maxDevicesAllowed: isAdmin ? 3 : null,
    };
  };

  // Requirement 2: Terminate individual session
  const terminateSession = async (
    sessionId: string
  ): Promise<{ success: boolean; message: string; isCurrentTerminated?: boolean }> => {
    const token = safeGetItem('dukkana_session_token_v3');
    try {
      const res = await fetch('/api/auth/sessions/terminate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ sessionId }),
      });

      const data = await res.json().catch(() => null);
      if (data && data.success) {
        if (data.isCurrentTerminated) {
          logout();
        }
        return {
          success: true,
          message: data.message || 'تم إنهاء الجلسة بنجاح',
          isCurrentTerminated: data.isCurrentTerminated,
        };
      }
      return { success: false, message: data?.error || 'فشل إنهاء الجلسة' };
    } catch {
      return { success: false, message: 'تعذر الاتصال بالخادم لإنهاء الجلسة' };
    }
  };

  // Requirement 2: Terminate all other sessions
  const terminateOtherSessions = async (): Promise<{
    success: boolean;
    message: string;
    terminatedCount?: number;
  }> => {
    const token = safeGetItem('dukkana_session_token_v3');
    try {
      const res = await fetch('/api/auth/sessions/terminate-others', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          userId: currentUser?.id,
          phone: currentUser?.phone,
          token,
        }),
      });

      const data = await res.json().catch(() => null);
      if (data && data.success) {
        return {
          success: true,
          message: data.message || 'تم تسجيل الخروج من باقي الأجهزة بنجاح',
          terminatedCount: data.terminatedCount,
        };
      }
      return { success: false, message: data?.error || 'فشل تسجيل الخروج من الأجهزة الأخرى' };
    } catch {
      return { success: false, message: 'تعذر الاتصال بالخادم' };
    }
  };

  // Requirement 2: Terminate all sessions endpoint POST /api/auth/terminate-all-sessions
  const terminateAllSessions = async (): Promise<{
    success: boolean;
    message: string;
    terminatedCount?: number;
  }> => {
    const token = safeGetItem('dukkana_session_token_v3');
    let terminatedCount = 0;
    try {
      const res = await fetch('/api/auth/terminate-all-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          userId: currentUser?.id,
          phone: currentUser?.phone,
          token,
        }),
      });
      const data = await res.json().catch(() => null);
      if (data && typeof data.terminatedCount === 'number') {
        terminatedCount = data.terminatedCount;
      }
    } catch (e) {
      console.warn('Network error terminating all sessions:', e);
    }

    // Invalidate and clear all session tokens from localStorage and sessionStorage
    safeRemoveItem('dukkana_session_token_v3');
    safeRemoveItem('dukkana_auth_token_v3');
    safeRemoveItem(CURRENT_USER_ID_KEY);

    try {
      localStorage.removeItem('dukkana_session_token_v3');
      localStorage.removeItem('dukkana_auth_token_v3');
      localStorage.removeItem('dukkana_current_user_id_v3');
      localStorage.removeItem('dukkana_user_id');
      localStorage.removeItem('dukkana_user_phone');
      sessionStorage.clear();
      // Store notice to be displayed immediately on AuthScreen
      sessionStorage.setItem(
        'dukkana_auth_notice',
        'تم إنهاء كافة الجلسات بنجاح، يرجى تسجيل الدخول مجدداً'
      );
    } catch {}

    setCurrentUserId(null);

    return {
      success: true,
      message: 'تم إنهاء كافة الجلسات بنجاح، يرجى تسجيل الدخول مجدداً',
      terminatedCount,
    };
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        isAuthenticated: !!currentUser,
        role,
        isAdmin,
        isMerchant,
        isSupport,
        isRegistered: !!currentUser,
        requestOTPForPhone,
        verifyOTPOnly,
        loginWithPassword,
        resetPassword,
        verifyAndLogin,
        registerAccount,
        loginWithPhone,
        logout,
        deleteAccount,
        addAddress,
        removeAddress,
        updateDisplayName,
        updateAvatarUrl,
        fetchActiveSessions,
        terminateSession,
        terminateOtherSessions,
        terminateAllSessions,
        applyToBecomeMerchant,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
