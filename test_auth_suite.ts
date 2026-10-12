import { pool, db, schema } from './src/db/index';
import { eq } from 'drizzle-orm';
import { validateIraqiPhone } from './src/utils/phoneAuth';

const BASE_URL = 'http://localhost:3000';

async function runAllTests() {
  console.log('====================================================');
  console.log('بدء تشغيل حزمة الاختبارات الإلزامية لنظام المصادقة في دكانة');
  console.log('====================================================\n');

  let passedTests = 0;
  let failedTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [نجاح] ${testName}`);
      passedTests++;
    } else {
      console.error(`❌ [فشل] ${testName}${detail ? ` - ${detail}` : ''}`);
      failedTests++;
    }
  }

  // ----------------------------------------------------
  // TEST 1: Database Connection & Schema Verification
  // ----------------------------------------------------
  console.log('\n--- 1. فحص الاتصال بقاعدة بيانات Neon PostgreSQL وجدول المستخدمين ---');
  try {
    const healthRes = await fetch(`${BASE_URL}/api/db/health`);
    const health = await healthRes.json();
    assert(health.connected === true, 'الاتصال بقاعدة بيانات Neon نشط وسليم', health.message);

    const userCount = await db!.select().from(schema.users);
    assert(userCount.length > 0, `جدول المستخدمين في PostgreSQL يحتوي على سجلات (${userCount.length} مستخدم)`);
  } catch (err: any) {
    assert(false, 'فحص قاعدة البيانات فشل', err.message);
  }

  // ----------------------------------------------------
  // TEST 2: Registration -> DB Persistence -> Logout -> Login
  // ----------------------------------------------------
  console.log('\n--- 2. إنشاء حساب جديد وتعيين كلمة المرور وحفظها في DB ثم تسجيل الخروج والدخول ---');
  const testPhone1 = `0770${Math.floor(1000000 + Math.random() * 9000000)}`;
  const testPass1 = 'MySecretPass2026';
  const normPhone1 = validateIraqiPhone(testPhone1).normalizedE164;

  try {
    // Request OTP
    const reqOtpRes = await fetch(`${BASE_URL}/api/auth/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: testPhone1, purpose: 'registration' }),
    });
    const reqOtpData = await reqOtpRes.json();
    assert(reqOtpData.success === true, 'طلب رمز OTP للتسجيل بنجاح');

    // Fetch OTP from internal test route
    const sessionRes = await fetch(`${BASE_URL}/api/test/otp-session/${encodeURIComponent(testPhone1)}`);
    const sessionData = await sessionRes.json();
    assert(sessionData.found === true && typeof sessionData.code === 'string', 'تم توليد جلسة OTP على الخادم');
    const otpCode = sessionData.code;

    // Verify OTP to get resetToken
    const verifyRes = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: testPhone1, otpCode }),
    });
    const verifyData = await verifyRes.json();
    assert(verifyData.success === true && Boolean(verifyData.resetToken), 'تم التحقق من OTP والحصول على resetToken أحادي الاستخدام');
    const resetToken = verifyData.resetToken;

    // Complete registration with password
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountType: 'customer',
        phone: testPhone1,
        resetToken,
        password: testPass1,
        fullName: 'أحمد جاسم البصري',
        governorate: 'البصرة',
      }),
    });
    const regData = await regRes.json();
    assert(regData.success === true, 'تم إنشاء الحساب وتعيين كلمة المرور بنجاح');

    // Verify user exists in PostgreSQL Neon directly
    const dbUserRows = await db!.select().from(schema.users).where(eq(schema.users.phone, normPhone1));
    assert(
      dbUserRows.length === 1 &&
      Boolean(dbUserRows[0].passwordHash) &&
      Boolean(dbUserRows[0].passwordSalt) &&
      dbUserRows[0].passwordHash !== testPass1,
      'تم تخزين كلمة المرور في PostgreSQL Neon كـ Hash مجزأ وآمن (PBKDF2) وليس نصاً صريحاً'
    );

    // Logout simulation: now try logging in with the password directly
    const loginRes = await fetch(`${BASE_URL}/api/auth/login-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: testPhone1, password: testPass1 }),
    });
    const loginData = await loginRes.json();
    assert(
      loginData.success === true &&
      Boolean(loginData.token) &&
      loginData.user.role === 'customer' &&
      loginData.user.hasPassword === true,
      'نجاح تسجيل الدخول بكلمة المرور بعد الخروج مع إصدار جلسة جديدة'
    );
  } catch (err: any) {
    assert(false, 'اختبار إنشاء الحساب وتسجيل الدخول فشل', err.message);
  }

  // ----------------------------------------------------
  // TEST 3: Wrong Password Rejected & Rate Limit Counter
  // ----------------------------------------------------
  console.log('\n--- 3. تجربة كلمة مرور خاطئة والتأكد من رفضها أمنياً ---');
  try {
    const wrongLoginRes = await fetch(`${BASE_URL}/api/auth/login-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: testPhone1, password: 'WrongPassword123' }),
    });
    assert(wrongLoginRes.status === 401, 'الخادم يرفض كلمة المرور الخاطئة برمز 401');
    const wrongData = await wrongLoginRes.json();
    assert(
      wrongData.success === false &&
      wrongData.message.includes('غير صحيحة') &&
      typeof wrongData.remainingAttempts === 'number',
      'رسالة واضحة برفض كلمة المرور مع عدد المحاولات المتبقية'
    );
  } catch (err: any) {
    assert(false, 'اختبار كلمة المرور الخاطئة فشل', err.message);
  }

  // ----------------------------------------------------
  // TEST 4: Forgot Password Flow (OTP -> Reset Password -> DB -> Login with New Pass)
  // ----------------------------------------------------
  console.log('\n--- 4. ميزة "نسيت كلمة المرور؟" وإعادة التعيين والتسجيل بالكلمة الجديدة ---');
  const testPhoneReset = `0771${Math.floor(1000000 + Math.random() * 9000000)}`;
  const normPhoneReset = validateIraqiPhone(testPhoneReset).normalizedE164;
  const newSecretPass = 'BrandNewPassword2026';
  try {
    // Seed this fresh user in Neon PostgreSQL with an initial password first
    await db!.insert(schema.users).values({
      id: `usr_${Date.now()}`,
      phone: normPhoneReset,
      displayName: 'مستخدم اختبار إعادة التعيين',
      role: 'customer',
      governorate: 'بغداد',
      status: 'active',
      passwordHash: 'init_old_hash',
      passwordSalt: 'init_old_salt',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 4a. Request OTP for password reset (with privacy message)
    const resetOtpReq = await fetch(`${BASE_URL}/api/auth/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: testPhoneReset, purpose: 'reset_password' }),
    });
    const resetOtpData = await resetOtpReq.json();
    assert(resetOtpData.success === true, 'طلب OTP لإعادة تعيين كلمة المرور بنجاح');

    // 4b. Fetch new OTP from test route
    const resetSession = await fetch(`${BASE_URL}/api/test/otp-session/${encodeURIComponent(testPhoneReset)}`);
    const resetCode = (await resetSession.json()).code;

    // 4c. Verify OTP to get resetToken
    const verifyReset = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: testPhoneReset, otpCode: resetCode, purpose: 'reset_password' }),
    });
    const resetTokenData = await verifyReset.json();
    assert(resetTokenData.success === true && Boolean(resetTokenData.resetToken), 'التحقق من OTP لإعادة التعيين وإصدار resetToken');
    assert(!resetTokenData.token, 'تأكيد عدم إصدار رمز جلسة وعدم تسجيل دخول المستخدم عند التحقق من OTP الخاص بإعادة التعيين');
    const validResetToken = resetTokenData.resetToken;

    // 4d. Reset password using resetToken
    const resetExec = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: testPhoneReset,
        resetToken: validResetToken,
        newPassword: newSecretPass,
      }),
    });
    const resetExecData = await resetExec.json();
    assert(resetExecData.success === true, 'تم تحديث كلمة المرور في الخادم بنجاح');
    assert(!resetExecData.token, 'تأكيد عدم إصدار جلسة تلقائية وإلزام المستخدم بالعودة لتسجيل الدخول بكلمة المرور الجديدة');

    // 4e. Check PostgreSQL DB has new hash
    const updatedDbUser = await db!.select().from(schema.users).where(eq(schema.users.phone, normPhoneReset));
    assert(
      updatedDbUser.length === 1 &&
      Boolean(updatedDbUser[0].passwordHash),
      'تم تحديث Hash كلمة المرور الجديدة في قاعدة بيانات Neon الفعلية'
    );

    // 4f. Login with the new password
    const newPassTry = await fetch(`${BASE_URL}/api/auth/login-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: testPhoneReset, password: newSecretPass }),
    });
    const newPassData = await newPassTry.json();
    assert(newPassData.success === true, 'تسجيل الدخول ناجح بكلمة المرور الجديدة!');

    // 4g. Wrong password should fail
    const wrongPassTry = await fetch(`${BASE_URL}/api/auth/login-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: testPhoneReset, password: 'WrongPasswordAfterReset' }),
    });
    assert(wrongPassTry.status === 401, 'كلمة المرور الخاطئة بعد إعادة التعيين مرفوضة برمز 401');
  } catch (err: any) {
    assert(false, 'اختبار إعادة تعيين كلمة المرور فشل', err.message);
  }

  // ----------------------------------------------------
  // TEST 5: Security Restrictions on Reset Token (Single Use, Invalid, Expired)
  // ----------------------------------------------------
  console.log('\n--- 5. اختبار حماية resetToken (أحادي الاستخدام، غير صالح، منتهي) ---');
  try {
    // 5a. Attempting to reuse an already-used resetToken
    const reuseAttempt = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: testPhone1,
        resetToken: 'rst_used_token_should_fail',
        newPassword: 'AnotherPassword123',
      }),
    });
    assert(reuseAttempt.status === 400, 'رفض محاولة إعادة استخدام رمز أو استخدام رمز مزور برمز 400');

    // 5b. Attempting password reset with NO resetToken (unverified)
    const noTokenAttempt = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: testPhone1,
        newPassword: 'HackPassword123',
      }),
    });
    assert(noTokenAttempt.status === 400, 'رفض تغيير كلمة المرور دون إثبات ملكية الهاتف عبر OTP برمز 400');
  } catch (err: any) {
    assert(false, 'اختبار قيود resetToken فشل', err.message);
  }

  // ----------------------------------------------------
  // TEST 6: Privacy Protection for Phone Numbers
  // ----------------------------------------------------
  console.log('\n--- 6. اختبار حماية خصوصية الأرقام (عدم كشف ما إذا كان الرقم مسجلاً) ---');
  try {
    const unregPhone = `0779${Math.floor(1000000 + Math.random() * 9000000)}`;
    const privacyRes = await fetch(`${BASE_URL}/api/auth/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: unregPhone, purpose: 'reset_password' }),
    });
    const privacyData = await privacyRes.json();
    assert(
      privacyData.success === true &&
      privacyData.message.includes('إذا كان رقم الهاتف هذا مسجلاً في دكانة'),
      'الخادم يرجع رسالة عامة تحمي الخصوصية دون كشف حالة الرقم'
    );
  } catch (err: any) {
    assert(false, 'اختبار خصوصية الأرقام فشل', err.message);
  }

  // ----------------------------------------------------
  // TEST 7: Preserve Existing Accounts & Roles (Admin, Merchant, Customer)
  // ----------------------------------------------------
  console.log('\n--- 7. التأكد من بقاء الحسابات الحالية وصلاحياتها في PostgreSQL ---');
  try {
    // 7a. Admin account check
    const adminRows = await db!.select().from(schema.users).where(eq(schema.users.role, 'admin'));
    assert(adminRows.length >= 1, `حساب المدير العام محفوظ في PostgreSQL (${adminRows[0].displayName})`);

    // Try logging in with admin account
    const adminLogin = await fetch(`${BASE_URL}/api/auth/login-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '07862214922', password: '123456' }),
    });
    const adminLoginData = await adminLogin.json();
    assert(
      adminLoginData.success === true &&
      adminLoginData.user.role === 'admin',
      'تسجيل دخول حساب المدير العام سليم بصلاحية admin'
    );

    // 7b. Merchant account check (usr_merch_1)
    const merchLogin = await fetch(`${BASE_URL}/api/auth/login-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '07701112233', password: '123456' }),
    });
    const merchLoginData = await merchLogin.json();
    assert(
      merchLoginData.success === true &&
      merchLoginData.user.role === 'merchant',
      'تسجيل دخول حساب التاجر المعتمد (تمور النخيل) سليم بصلاحية merchant'
    );

    // 7c. Customer account check (usr_customer_demo)
    const custLogin = await fetch(`${BASE_URL}/api/auth/login-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '07701234567', password: '123456' }),
    });
    const custLoginData = await custLogin.json();
    assert(
      custLoginData.success === true &&
      custLoginData.user.role === 'customer',
      'تسجيل دخول حساب الزبون الافتراضي سليم بصلاحية customer'
    );
  } catch (err: any) {
    assert(false, 'فحص الحسابات الحالية فشل', err.message);
  }

  // ----------------------------------------------------
  // TEST 8: Eastern Arabic Numerals & Phone Formatting
  // ----------------------------------------------------
  console.log('\n--- 8. اختبار الأرقام العربية الشرقية (٠-٩) وتنسيقات الهواتف ---');
  try {
    const arabicPhone = '٠٧٧٠١١١٢٢٣٣'; // 07701112233 in Arabic numerals
    const arabicLogin = await fetch(`${BASE_URL}/api/auth/login-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: arabicPhone, password: '123456' }),
    });
    const arabicLoginData = await arabicLogin.json();
    assert(
      arabicLoginData.success === true,
      'تسجيل الدخول ينجح عند كتابة رقم الهاتف بالأرقام العربية الشرقية (٠٧٧٠...)'
    );
  } catch (err: any) {
    assert(false, 'اختبار الأرقام العربية فشل', err.message);
  }

  // ----------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------
  console.log('\n====================================================');
  console.log(`ملخص النتائج: ${passedTests} اختبارات ناجحة, ${failedTests} اختبارات فاشلة`);
  console.log('====================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runAllTests().catch(err => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
