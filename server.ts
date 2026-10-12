import 'dotenv/config';
import http from 'http';
import express from 'express';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { ADMIN_PHONE_E164, ADMIN_PHONE_LOCAL } from './src/types/index';
import { validateIraqiPhone, normalizeArabicDigits } from './src/utils/phoneAuth';
import { checkDatabaseHealth, db, schema, pool } from './src/db/index';
import { eq } from 'drizzle-orm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Server-side in-memory secure stores (Server-Authoritative Database)
interface ServerUser {
  id: string;
  phone: string;
  displayName: string;
  role: 'customer' | 'merchant' | 'admin';
  governorate?: string;
  avatarUrl?: string;
  merchantStoreId?: string;
  createdAt: string;
  status: 'active' | 'suspended' | 'deleted';
  merchantStatus?: 'approved' | 'pending' | 'rejected' | 'suspended';
  passwordHash?: string;
  passwordSalt?: string;
}

interface ServerSession {
  id: string;
  token: string;
  userId: string;
  phone: string;
  role: 'customer' | 'merchant' | 'admin';
  deviceName: string;
  browser: string;
  os: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  ipAddress?: string;
  location?: string;
  createdAt: number;
  lastActiveAt: number;
  expiresAt: number;
}

interface ServerOTPSession {
  phone: string;
  code: string;
  expiresAt: number;
  attemptsRemaining: number;
}

const serverUsers = new Map<string, ServerUser>();
const serverSessions = new Map<string, ServerSession>();
const serverOTPs = new Map<string, ServerOTPSession>();

interface ServerResetToken {
  phone: string;
  expiresAt: number;
}
const serverResetTokens = new Map<string, ServerResetToken>();

// ==========================================
// Persistent Storage (Neon PostgreSQL + Local Disk Fallback)
// Guarantees users, sessions and hashed passwords survive any server restart/reload
// ==========================================
const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE_PATH = path.join(DATA_DIR, 'server_users.json');
const SESSIONS_FILE_PATH = path.join(DATA_DIR, 'server_sessions.json');
const DELETED_PHONES_FILE_PATH = path.join(DATA_DIR, 'deleted_phones.json');

const deletedPhones = new Set<string>();

function saveDeletedPhonesToDisk(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DELETED_PHONES_FILE_PATH, JSON.stringify(Array.from(deletedPhones)), 'utf-8');
  } catch (err) {
    console.warn('[Server] Failed to save deleted phones:', err);
  }
}

function loadDeletedPhonesFromDisk(): void {
  try {
    if (fs.existsSync(DELETED_PHONES_FILE_PATH)) {
      const raw = fs.readFileSync(DELETED_PHONES_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const p of parsed) {
          if (p && typeof p === 'string') {
            deletedPhones.add(p);
          }
        }
      }
    }
  } catch (err) {
    console.warn('[Server] Failed to load deleted phones:', err);
  }
}

function saveUsersToDisk(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const list = Array.from(serverUsers.values()).filter(u => !deletedPhones.has(u.phone));
    fs.writeFileSync(USERS_FILE_PATH, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Server] Failed to save users to disk:', err);
  }
}

function loadUsersFromDisk(): void {
  try {
    if (fs.existsSync(USERS_FILE_PATH)) {
      const raw = fs.readFileSync(USERS_FILE_PATH, 'utf-8');
      const parsed: ServerUser[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const u of parsed) {
          if (u && u.phone && !deletedPhones.has(u.phone)) {
            serverUsers.set(u.phone, u);
          }
        }
      }
    }
  } catch (err) {
    console.warn('[Server] Failed to load users from disk:', err);
  }
}

function saveSessionsToDisk(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const list = Array.from(serverSessions.values());
    fs.writeFileSync(SESSIONS_FILE_PATH, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Server] Failed to save sessions to disk:', err);
  }
}

function loadSessionsFromDisk(): void {
  try {
    if (fs.existsSync(SESSIONS_FILE_PATH)) {
      const raw = fs.readFileSync(SESSIONS_FILE_PATH, 'utf-8');
      const parsed: ServerSession[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const now = Date.now();
        for (const s of parsed) {
          if (s && s.token && s.expiresAt > now) {
            serverSessions.set(s.token, s);
          }
        }
      }
    }
  } catch (err) {
    console.warn('[Server] Failed to load sessions from disk:', err);
  }
}

/**
 * Save user to both PostgreSQL Neon DB and local storage/memory
 */
async function saveUserToDatabase(user: ServerUser): Promise<void> {
  // 1. Update in-memory Map
  serverUsers.set(user.phone, user);
  // 2. Persist to local disk backup
  saveUsersToDisk();

  // 3. Persist directly to Neon PostgreSQL `users` table
  if (db) {
    try {
      await db.insert(schema.users).values({
        id: user.id,
        phone: user.phone,
        displayName: user.displayName,
        role: user.role,
        governorate: user.governorate || 'بغداد',
        avatarUrl: user.avatarUrl || null,
        merchantStoreId: user.merchantStoreId || null,
        status: user.status || 'active',
        passwordHash: user.passwordHash || null,
        passwordSalt: user.passwordSalt || null,
        createdAt: new Date(user.createdAt || Date.now()),
        updatedAt: new Date(),
      }).onConflictDoUpdate({
        target: schema.users.phone,
        set: {
          displayName: user.displayName,
          role: user.role,
          governorate: user.governorate || 'بغداد',
          avatarUrl: user.avatarUrl || null,
          merchantStoreId: user.merchantStoreId || null,
          status: user.status || 'active',
          passwordHash: user.passwordHash || null,
          passwordSalt: user.passwordSalt || null,
          updatedAt: new Date(),
        },
      });
    } catch (err: any) {
      console.warn('[PostgreSQL] Failed to persist user to database:', err?.message || err);
    }
  }
}

/**
 * Retrieve user by phone from PostgreSQL Neon DB (authoritative) or in-memory cache
 */
async function getUserByPhone(rawPhone: string): Promise<ServerUser | null> {
  const validation = validateIraqiPhone(rawPhone);
  const phone = validation.isValid ? validation.normalizedE164 : rawPhone;

  // Immediately return null if account was deleted
  if (deletedPhones.has(phone)) {
    return null;
  }

  // 1. Check PostgreSQL DB first (authoritative persistent storage)
  if (db) {
    try {
      const rows = await db.select().from(schema.users).where(eq(schema.users.phone, phone)).limit(1);
      if (rows && rows.length > 0) {
        const u = rows[0];
        const serverUser: ServerUser = {
          id: u.id,
          phone: u.phone,
          displayName: u.displayName,
          role: u.role as any,
          governorate: u.governorate,
          avatarUrl: u.avatarUrl || undefined,
          merchantStoreId: u.merchantStoreId || undefined,
          createdAt: u.createdAt.toISOString(),
          status: (u.status as any) || 'active',
          passwordHash: u.passwordHash || undefined,
          passwordSalt: u.passwordSalt || undefined,
        };
        serverUsers.set(phone, serverUser);
        return serverUser;
      }
    } catch (err: any) {
      console.warn('[PostgreSQL] Error fetching user by phone:', err?.message || err);
    }
  }

  // 2. Fallback to in-memory store
  const cached = serverUsers.get(phone);
  if (cached) return cached;

  return null;
}

// ==========================================
// Password Hashing & Security Helpers
// ==========================================
function normalizePasswordString(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  return normalizeArabicDigits(raw.trim());
}

function hashPassword(password: string): { salt: string; hash: string } {
  const normalizedPass = normalizePasswordString(password);
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(normalizedPass, salt, 100000, 64, 'sha512').toString('hex');
  return { salt, hash };
}

function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  try {
    if (!password || !salt || !expectedHash) return false;
    const candidate1 = normalizePasswordString(password);
    const candidate2 = typeof password === 'string' ? password : '';

    // Check with normalized password
    const hash1 = crypto.pbkdf2Sync(candidate1, salt, 100000, 64, 'sha512').toString('hex');
    const hashBuf1 = Buffer.from(hash1, 'hex');
    const expBuf = Buffer.from(expectedHash, 'hex');
    if (hashBuf1.length === expBuf.length && crypto.timingSafeEqual(hashBuf1, expBuf)) {
      return true;
    }

    // Check with raw un-normalized password as fallback
    if (candidate2 && candidate2 !== candidate1) {
      const hash2 = crypto.pbkdf2Sync(candidate2, salt, 100000, 64, 'sha512').toString('hex');
      const hashBuf2 = Buffer.from(hash2, 'hex');
      if (hashBuf2.length === expBuf.length && crypto.timingSafeEqual(hashBuf2, expBuf)) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

function sanitizeUser(user: ServerUser): Omit<ServerUser, 'passwordHash' | 'passwordSalt'> & { hasPassword: boolean } {
  const { passwordHash, passwordSalt, ...rest } = user;
  return {
    ...rest,
    hasPassword: Boolean(passwordHash && passwordSalt),
  };
}

// Invalidate all active sessions for a given phone (e.g. after password reset)
function invalidateUserSessions(phone: string): void {
  for (const [token, session] of serverSessions.entries()) {
    if (session.phone === phone) {
      serverSessions.delete(token);
    }
  }
}

// ==========================================
// Rate Limiting (Brute-Force & Flood Protection)
// ==========================================
// Failed login tracking: Map<phone, { failedCount: number; lockedUntil: number }>
const loginAttempts = new Map<string, { failedCount: number; lockedUntil: number }>();

// OTP rate limit tracking: Map<phone, { lastRequestedAt: number; countInWindow: number; windowStart: number }>
const otpRateLimits = new Map<string, { lastRequestedAt: number; countInWindow: number; windowStart: number }>();

function checkLoginRateLimit(phone: string): { allowed: boolean; remainingLockoutSeconds?: number } {
  const record = loginAttempts.get(phone);
  if (!record) return { allowed: true };
  const now = Date.now();
  if (record.lockedUntil > now) {
    const remaining = Math.ceil((record.lockedUntil - now) / 1000);
    return { allowed: false, remainingLockoutSeconds: remaining };
  }
  if (record.lockedUntil <= now && record.failedCount >= 5) {
    loginAttempts.delete(phone);
  }
  return { allowed: true };
}

function recordFailedLogin(phone: string): { lockedNow: boolean; remainingAttempts: number } {
  const now = Date.now();
  const record = loginAttempts.get(phone) || { failedCount: 0, lockedUntil: 0 };
  record.failedCount += 1;
  if (record.failedCount >= 5) {
    record.lockedUntil = now + 15 * 60 * 1000; // 15 minutes lockout
    loginAttempts.set(phone, record);
    return { lockedNow: true, remainingAttempts: 0 };
  }
  loginAttempts.set(phone, record);
  return { lockedNow: false, remainingAttempts: 5 - record.failedCount };
}

function resetFailedLogin(phone: string): void {
  loginAttempts.delete(phone);
}

function checkOTPRateLimit(phone: string): { allowed: boolean; waitSeconds?: number; reason?: string } {
  const now = Date.now();
  const record = otpRateLimits.get(phone);
  if (!record) {
    otpRateLimits.set(phone, { lastRequestedAt: now, countInWindow: 1, windowStart: now });
    return { allowed: true };
  }

  // Cooldown: 60 seconds
  const elapsedSinceLast = now - record.lastRequestedAt;
  if (elapsedSinceLast < 60 * 1000) {
    const wait = Math.ceil((60 * 1000 - elapsedSinceLast) / 1000);
    return { allowed: false, waitSeconds: wait, reason: `يرجى الانتظار ${wait} ثانية قبل طلب رمز جديد.` };
  }

  // Hourly limit: max 5 OTPs per 60 minutes
  if (now - record.windowStart > 60 * 60 * 1000) {
    record.windowStart = now;
    record.countInWindow = 1;
    record.lastRequestedAt = now;
    return { allowed: true };
  }

  if (record.countInWindow >= 5) {
    const wait = Math.ceil((60 * 60 * 1000 - (now - record.windowStart)) / 60000);
    return {
      allowed: false,
      reason: `تم تجاوز الحد الأقصى لطلبات رمز التحقق (5 طلبات خلال ساعة). يرجى المحاولة بعد ${wait} دقيقة.`,
    };
  }

  record.countInWindow += 1;
  record.lastRequestedAt = now;
  return { allowed: true };
}

// Seed demo users with hashed password ('123456') for smooth testing
const defaultDemoPass = hashPassword('123456');

// Seed verified merchant in server DB
serverUsers.set('+9647701112233', {
  id: 'usr_merch_1',
  phone: '+9647701112233',
  displayName: 'الحاج مهدي التميمي (تمور النخيل)',
  role: 'merchant',
  merchantStoreId: 'merch_dates_1',
  governorate: 'بغداد',
  createdAt: '2026-09-01T10:00:00Z',
  status: 'active',
  merchantStatus: 'approved',
  passwordSalt: defaultDemoPass.salt,
  passwordHash: defaultDemoPass.hash,
});

// Seed merchant without password in server DB (usr_merch_5 - requires password creation)
serverUsers.set('+9647705556677', {
  id: 'usr_merch_5',
  phone: '+9647705556677',
  displayName: 'الأستاذ حيدر الرشيد (أزياء الرشيد)',
  role: 'merchant',
  merchantStoreId: 'merch_fashion_5',
  governorate: 'بغداد',
  createdAt: '2026-09-18T10:00:00Z',
  status: 'active',
  merchantStatus: 'pending',
});

// Seed demo customer in server DB
serverUsers.set('+9647701234567', {
  id: 'usr_customer_demo',
  phone: '+9647701234567',
  displayName: 'علي كريم الربيعي',
  role: 'customer',
  governorate: 'بغداد',
  createdAt: '2026-09-25T11:00:00Z',
  status: 'active',
  passwordSalt: defaultDemoPass.salt,
  passwordHash: defaultDemoPass.hash,
});

// Seed canonical Admin account in server DB with default password ('123456')
serverUsers.set(ADMIN_PHONE_E164, {
  id: 'usr_admin',
  phone: ADMIN_PHONE_E164,
  displayName: 'مدير منصة دكانة الرئيسي',
  role: 'admin',
  governorate: 'بغداد',
  createdAt: '2026-09-01T10:00:00Z',
  status: 'active',
  passwordSalt: defaultDemoPass.salt,
  passwordHash: defaultDemoPass.hash,
});

// Load deleted accounts registry first
loadDeletedPhonesFromDisk();

// Remove any deleted accounts that might have been seeded
for (const phone of deletedPhones) {
  serverUsers.delete(phone);
}

// Load any persistent users from disk and merge
loadUsersFromDisk();

// Remove again in case disk had old users
for (const phone of deletedPhones) {
  serverUsers.delete(phone);
}

// Ensure initial or loaded users are safely written to disk
saveUsersToDisk();

// Synchronize with PostgreSQL Neon Database
async function syncDatabaseUsers(): Promise<void> {
  if (!db) return;
  try {
    const existingDbUsers = await db.select().from(schema.users);
    for (const u of existingDbUsers) {
      if (deletedPhones.has(u.phone)) continue;
      serverUsers.set(u.phone, {
        id: u.id,
        phone: u.phone,
        displayName: u.displayName,
        role: u.role as any,
        governorate: u.governorate,
        avatarUrl: u.avatarUrl || undefined,
        merchantStoreId: u.merchantStoreId || undefined,
        createdAt: u.createdAt.toISOString(),
        status: (u.status as any) || 'active',
        passwordHash: u.passwordHash || undefined,
        passwordSalt: u.passwordSalt || undefined,
      });
    }

    for (const [phone, u] of serverUsers.entries()) {
      const inDb = existingDbUsers.some(d => d.phone === phone);
      if (!inDb) {
        await db.insert(schema.users).values({
          id: u.id,
          phone: u.phone,
          displayName: u.displayName,
          role: u.role,
          governorate: u.governorate || 'بغداد',
          avatarUrl: u.avatarUrl || null,
          merchantStoreId: u.merchantStoreId || null,
          status: u.status || 'active',
          passwordHash: u.passwordHash || null,
          passwordSalt: u.passwordSalt || null,
          createdAt: new Date(u.createdAt || Date.now()),
          updatedAt: new Date(),
        }).onConflictDoNothing();
      }
    }
    saveUsersToDisk();
    console.log(`[PostgreSQL] Users synced with Neon database (${serverUsers.size} users active)`);
  } catch (err: any) {
    console.warn('[PostgreSQL] Database synchronization warning:', err?.message || err);
  }
}
syncDatabaseUsers();

// Load sessions from disk on startup
loadSessionsFromDisk();

// Helper: generate random session token using cryptographically secure generator
function generateToken(): string {
  return `duk_sec_${Date.now()}_${crypto.randomBytes(24).toString('hex')}`;
}

// Helper: Parse client device & browser info from request headers or body
function parseDeviceInfo(req: express.Request): {
  deviceName: string;
  browser: string;
  os: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  ipAddress: string;
  location: string;
} {
  const bodyDev = req.body?.deviceInfo;
  const ua = req.headers['user-agent'] || '';
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress || '127.0.0.1';

  let browser = bodyDev?.browser || 'متصفح ويب';
  let os = bodyDev?.os || 'نظام تشغيل';
  let deviceType: 'desktop' | 'mobile' | 'tablet' = bodyDev?.deviceType || 'desktop';

  if (!bodyDev?.browser || !bodyDev?.os) {
    if (/iPad|Tablet/i.test(ua)) {
      deviceType = 'tablet';
      os = 'iPadOS / لوحي';
    } else if (/iPhone/i.test(ua)) {
      deviceType = 'mobile';
      os = 'iPhone (iOS)';
    } else if (/Android/i.test(ua)) {
      deviceType = /Mobile/i.test(ua) ? 'mobile' : 'tablet';
      os = 'Android';
    } else if (/Macintosh|Mac OS X/i.test(ua)) {
      deviceType = 'desktop';
      os = 'macOS';
    } else if (/Windows/i.test(ua)) {
      deviceType = 'desktop';
      os = 'Windows';
    } else if (/Linux/i.test(ua)) {
      deviceType = 'desktop';
      os = 'Linux';
    }

    if (/Edg\//i.test(ua)) browser = 'Microsoft Edge';
    else if (/Chrome\//i.test(ua)) browser = 'Google Chrome';
    else if (/Safari\//i.test(ua)) browser = 'Safari';
    else if (/Firefox\//i.test(ua)) browser = 'Mozilla Firefox';
    else if (/Opera|OPR\//i.test(ua)) browser = 'Opera';
  }

  const deviceName = bodyDev?.deviceName || `${browser} على ${os}`;

  return {
    deviceName,
    browser,
    os,
    deviceType,
    ipAddress: ip,
    location: 'العراق',
  };
}

// Security: Retrieve active admin sessions sorted from oldest to newest
function getActiveAdminSessions(): Array<{ token: string; session: ServerSession }> {
  const now = Date.now();
  const list: Array<{ token: string; session: ServerSession }> = [];
  for (const [token, s] of serverSessions.entries()) {
    if (s.expiresAt > now && (s.phone === ADMIN_PHONE_E164 || s.role === 'admin' || s.userId === 'usr_admin')) {
      list.push({ token, session: s });
    }
  }
  list.sort((a, b) => (a.session.createdAt || 0) - (b.session.createdAt || 0));
  return list;
}

// Security Requirement 3: Admin 3-Device Limit
// Restricts admin active sessions strictly to 3 devices/browsers at any time.
function handleAdminDeviceLimit(
  terminateOldest: boolean
): { allowed: boolean; message?: string; evictedCount?: number } {
  const activeSessions = getActiveAdminSessions();
  if (activeSessions.length < 3) {
    return { allowed: true };
  }

  // Admin already has 3 active sessions
  if (terminateOldest) {
    let evictedCount = 0;
    while (activeSessions.length >= 3) {
      const oldest = activeSessions.shift();
      if (oldest) {
        serverSessions.delete(oldest.token);
        if (db) {
          db.delete(schema.userSessions).where(eq(schema.userSessions.token, oldest.token)).catch(() => {});
        }
        evictedCount++;
      }
    }
    saveSessionsToDisk();
    return { allowed: true, evictedCount };
  }

  return {
    allowed: false,
    message: 'تم تجاوز الحد الأقصى للجلسات (3 أجهزة مسموحة فقط)، يرجى إنهاء جلسة أخرى أولاً',
  };
}

// Session Creation Helper with device info and admin limit guarantee
async function createServerSession(
  user: ServerUser,
  req: express.Request
): Promise<ServerSession> {
  const dev = parseDeviceInfo(req);
  const token = generateToken();
  const sessionId = `ses_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  const now = Date.now();
  const session: ServerSession = {
    id: sessionId,
    token,
    userId: user.id,
    phone: user.phone,
    role: user.role,
    deviceName: dev.deviceName,
    browser: dev.browser,
    os: dev.os,
    deviceType: dev.deviceType,
    ipAddress: dev.ipAddress,
    location: dev.location,
    createdAt: now,
    lastActiveAt: now,
    expiresAt: now + 30 * 24 * 60 * 60 * 1000,
  };

  // Strictly enforce admin max 3 devices constraint
  if (user.role === 'admin' || user.phone === ADMIN_PHONE_E164) {
    const adminSessions = getActiveAdminSessions();
    while (adminSessions.length >= 3) {
      const oldest = adminSessions.shift();
      if (oldest) {
        serverSessions.delete(oldest.token);
        if (db) {
          db.delete(schema.userSessions).where(eq(schema.userSessions.token, oldest.token)).catch(() => {});
        }
      }
    }
  }

  serverSessions.set(token, session);
  saveSessionsToDisk();

  if (db) {
    try {
      await db.insert(schema.userSessions).values({
        id: sessionId,
        token,
        userId: user.id,
        phone: user.phone,
        role: user.role,
        deviceName: dev.deviceName,
        browser: dev.browser,
        os: dev.os,
        deviceType: dev.deviceType,
        ipAddress: dev.ipAddress,
        location: dev.location,
        createdAt: new Date(now),
        lastActiveAt: new Date(now),
        expiresAt: new Date(now + 30 * 24 * 60 * 60 * 1000),
      }).onConflictDoNothing();
    } catch (err: any) {
      console.warn('[PostgreSQL] Failed to persist session to database:', err?.message || err);
    }
  }

  return session;
}

// ==========================================
// Real SMS Dispatcher Engine (Official OTPIQ Gateway)
// Endpoint: POST https://api.otpiq.com/api/sms
// Authentication: Bearer OTPIQ_API_KEY
// ==========================================
async function dispatchOtpiqSMS(
  normalizedE164: string,
  code: string,
  customMessage?: string
): Promise<{ success: boolean; error?: string; provider?: string; smsId?: string; remainingCredit?: number }> {
  const rawApiKey = process.env.OTPIQ_API_KEY;

  if (!rawApiKey || !rawApiKey.trim()) {
    return {
      success: false,
      error:
        'خدمة إرسال SMS الحقيقية عبر OTPIQ غير مربوطة حالياً. لم يتم إدخال مفتاح OTPIQ_API_KEY في متغيرات البيئة.',
      provider: 'otpiq',
    };
  }

  // Sanitize API key (strip accidental quotes or excess whitespace)
  const apiKey = rawApiKey.trim().replace(/^['"]|['"]$/g, '');

  // Iraqi Phone Number Normalization for OTPIQ:
  // Must be clean numeric string without spaces or symbols (e.g. '9647862214922')
  const phoneNumber = normalizedE164.replace(/\D/g, '');
  const cleanCode = String(code).trim();
  const messageText =
    customMessage ||
    `رمز التحقق الخاص بك في تطبيق دكانة هو: ${cleanCode}. لا تشارك هذا الرمز مع أي شخص حفاظاً على أمان حسابك.`;

  try {
    const response = await fetch('https://api.otpiq.com/api/sms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        phoneNumber,
        smsType: 'verification',
        verificationCode: cleanCode,
        message: messageText,
      }),
    });

    const responseText = await response.text();
    let responseData: any = null;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    if (!response.ok) {
      // Extract the actual error message from OTPIQ API response (e.g. responseData.error or responseData.message)
      const errMsg =
        responseData?.error ||
        responseData?.message ||
        responseData?.msg ||
        (typeof responseData?.raw === 'string' && responseData.raw ? responseData.raw : null) ||
        `خطأ من خادم OTPIQ (رمز الحالة: ${response.status})`;
      return {
        success: false,
        error: `فشل إرسال رسالة SMS عبر OTPIQ: ${errMsg}`,
        provider: 'otpiq',
      };
    }

    // Check if provider payload itself indicates failure
    if (
      responseData &&
      (responseData.success === false ||
        responseData.status === 'failed' ||
        responseData.status === 'error' ||
        Boolean(responseData.error))
    ) {
      return {
        success: false,
        error: `فشل الإرسال من مزود OTPIQ: ${
          responseData.error || responseData.message || 'فشلت معالجة الطلب'
        }`,
        provider: 'otpiq',
      };
    }

    // Check account balance coverage
    if (responseData && responseData.canCover === false) {
      return {
        success: false,
        error: 'رصيد حساب OTPIQ غير كافٍ لإتمام إرسال رسالة SMS.',
        provider: 'otpiq',
      };
    }

    return {
      success: true,
      provider: 'otpiq',
      smsId: responseData?.smsId,
      remainingCredit: responseData?.remainingCredit,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `فشل الاتصال بخدمة OTPIQ: ${err?.message || 'تعذر الوصول إلى مزود الخدمة'}`,
      provider: 'otpiq',
    };
  }
}

// ==========================================
// 1. API: Health Check (Server, SMS Gateway & Database Status)
// ==========================================
app.get('/api/health', async (req, res) => {
  const isOtpiqSet = !!(process.env.OTPIQ_API_KEY && process.env.OTPIQ_API_KEY.trim());
  const dbHealth = await checkDatabaseHealth();
  res.json({
    status: 'ok',
    serverTime: new Date().toISOString(),
    smsProvider: isOtpiqSet ? 'otpiq' : 'not_configured',
    database: {
      configured: dbHealth.configured,
      connected: dbHealth.connected,
      latencyMs: dbHealth.latencyMs,
      message: dbHealth.message,
    },
  });
});

// Dedicated Safe Database Health Check Route
app.get('/api/db/health', async (req, res) => {
  const dbHealth = await checkDatabaseHealth();
  res.json(dbHealth);
});

// ==========================================
// 2. API: Request OTP (Server-Side with Real Dispatch & Privacy Protection)
// ==========================================
app.post('/api/auth/request-otp', async (req, res) => {
  const { phone, purpose } = req.body;
  const validation = validateIraqiPhone(phone);
  if (!validation.isValid) {
    return res.status(400).json({ success: false, message: validation.errorMessage || 'رقم هاتف غير صالح.' });
  }

  const normalized = validation.normalizedE164;

  // Rate Limiting Check (max 1 OTP per 60s, max 5 per hour)
  const rateLimit = checkOTPRateLimit(normalized);
  if (!rateLimit.allowed) {
    return res.status(429).json({
      success: false,
      message: rateLimit.reason || 'يرجى الانتظار قبل طلب رمز جديد.',
    });
  }

  // Privacy Protection for Password Reset (Requirement 10: Do not leak whether phone exists)
  if (purpose === 'reset_password') {
    const existing = await getUserByPhone(normalized);
    if (!existing) {
      return res.json({
        success: true,
        smsConfigured: true,
        message: 'إذا كان رقم الهاتف هذا مسجلاً في دكانة، فقد تم إرسال رمز التحقق إليه في رسالة SMS.',
      });
    }
  }

  // Cryptographically secure 6-digit OTP generation (100000 to 999999)
  const code = crypto.randomInt(100000, 1000000).toString();

  const dispatchResult = await dispatchOtpiqSMS(normalized, code);

  if (!dispatchResult.success) {
    let friendlyMessage = dispatchResult.error || 'فشل إرسال رمز التحقق عبر مزود SMS.';
    if (friendlyMessage.includes('trial mode') || friendlyMessage.includes('own phone number')) {
      friendlyMessage =
        'تنبيه من مزود OTPIQ: الحساب حالياً في الوضع التجريبي (Trial Mode) ويسمح بإرسال رسائل SMS فقط إلى رقم الهاتف المسجل في حساب OTPIQ (07862214922). لتفعيل إرسال الرسائل لجميع أرقام الزبائن والتجار، يرجى تفعيل الرصيد في حسابك على OTPIQ.';
    }

    return res.status(400).json({
      success: false,
      smsConfigured: Boolean(process.env.OTPIQ_API_KEY),
      normalizedPhone: normalized,
      message: friendlyMessage,
      rawError: dispatchResult.error,
    });
  }

  serverOTPs.set(normalized, {
    phone: normalized,
    code,
    expiresAt: Date.now() + 5 * 60 * 1000,
    attemptsRemaining: 3,
  });

  const successMsg = purpose === 'reset_password'
    ? 'إذا كان رقم الهاتف هذا مسجلاً في دكانة، فقد تم إرسال رمز التحقق إليه في رسالة SMS.'
    : `تم إرسال رمز التحقق بنجاح إلى الرقم ${validation.localDisplay} (${normalized}) في رسالة SMS حقيقية عبر OTPIQ.`;

  // Never return the OTP code in the response
  res.json({
    success: true,
    smsConfigured: true,
    message: successMsg,
  });
});

// ==========================================
// 3. API: Verify OTP Only (Issues short-lived single-use reset/register token)
// ==========================================
app.post('/api/auth/verify-otp', async (req, res) => {
  const { phone, otpCode, purpose } = req.body;
  const validation = validateIraqiPhone(phone);
  if (!validation.isValid) {
    return res.status(400).json({ success: false, message: validation.errorMessage || 'رقم هاتف غير صالح.' });
  }

  const normalized = validation.normalizedE164;
  const session = serverOTPs.get(normalized);

  if (!session) {
    return res.status(400).json({
      success: false,
      message: 'لم يتم العثور على طلب رمز تحقق نشط أو انتهت صلاحيته. يرجى طلب رمز جديد.',
    });
  }

  if (Date.now() > session.expiresAt) {
    serverOTPs.delete(normalized);
    return res.status(400).json({
      success: false,
      message: 'انتهت صلاحية رمز التحقق (5 دقائق). يرجى طلب رمز جديد.',
    });
  }

  const cleanEntered = (otpCode || '').toString().trim().replace(/\D/g, '');
  if (cleanEntered !== session.code) {
    session.attemptsRemaining -= 1;
    if (session.attemptsRemaining <= 0) {
      serverOTPs.delete(normalized);
      return res.status(400).json({
        success: false,
        message: 'تم استنفاد كافة المحاولات المتاحة لهذا الرمز (3 محاولات). يرجى طلب رمز جديد.',
      });
    }
    return res.status(400).json({
      success: false,
      message: `رمز التحقق غير صحيح. متبقي لديك ${session.attemptsRemaining} محاولات.`,
      attemptsRemaining: session.attemptsRemaining,
    });
  }

  // OTP verified successfully: delete single-use OTP
  serverOTPs.delete(normalized);

  // Generate a verified token valid for 15 minutes for password creation/reset
  const resetToken = `rst_${Date.now()}_${crypto.randomBytes(24).toString('hex')}`;
  serverResetTokens.set(resetToken, {
    phone: normalized,
    expiresAt: Date.now() + 15 * 60 * 1000,
  });

  const existingUser = await getUserByPhone(normalized);
  const hasPassword = Boolean(existingUser && existingUser.passwordHash && existingUser.passwordSalt);

  // If purpose is 'reset_password' or 'registration', NEVER issue a login session token
  const isResetOrRegFlow = purpose === 'reset_password' || purpose === 'registration';
  let token: string | undefined = undefined;

  if (!isResetOrRegFlow && existingUser && hasPassword) {
    const terminateOldest = Boolean(req.body.terminateOldest || req.query.terminateOldest);
    if (existingUser.role === 'admin' || normalized === ADMIN_PHONE_E164) {
      const check = handleAdminDeviceLimit(terminateOldest);
      if (!check.allowed) {
        return res.status(403).json({
          success: false,
          maxSessionsReached: true,
          code: 'ADMIN_MAX_SESSIONS_EXCEEDED',
          message: check.message || 'تم تجاوز الحد الأقصى للجلسات (3 أجهزة مسموحة فقط)، يرجى إنهاء جلسة أخرى أولاً',
          allowedMax: 3,
        });
      }
    }
    const session = await createServerSession(existingUser, req);
    token = session.token;
  }

  res.json({
    success: true,
    message: isResetOrRegFlow
      ? 'تم التحقق من رمز OTP بنجاح. يرجى تعيين كلمة المرور الجديدة.'
      : existingUser && hasPassword
      ? (existingUser.role === 'admin'
        ? 'تم التحقق بنجاح. أهلاً بك في لوحة الإدارة الرئيسية لمنصة دكانة.'
        : 'تم التحقق وتسجيل الدخول بنجاح.')
      : 'تم التحقق من رمز OTP بنجاح.',
    resetToken,
    userExists: Boolean(existingUser),
    hasPassword,
    user: existingUser ? sanitizeUser(existingUser) : undefined,
    token,
  });
});

// ==========================================
// 4. API: Login with Phone & Password (Direct, No OTP sent)
// ==========================================
app.post('/api/auth/login-password', async (req, res) => {
  const { phone } = req.body;
  const password = req.body.password ?? req.body.newPassword;

  const validation = validateIraqiPhone(phone);
  if (!validation.isValid) {
    return res.status(400).json({ success: false, message: validation.errorMessage || 'رقم الهاتف غير صالح.' });
  }

  const normalized = validation.normalizedE164;

  // Rate Limiting Check (5 failed attempts -> 15 min lock)
  const limit = checkLoginRateLimit(normalized);
  if (!limit.allowed) {
    return res.status(429).json({
      success: false,
      message: `تم قفل محاولات تسجيل الدخول مؤقتاً لتكرار الخطأ. يرجى المحاولة بعد ${limit.remainingLockoutSeconds} ثانية أو استخدام "نسيت كلمة المرور".`,
      remainingLockoutSeconds: limit.remainingLockoutSeconds,
    });
  }

  if (!password || typeof password !== 'string') {
    return res.status(400).json({ success: false, message: 'يرجى إدخال كلمة المرور.' });
  }

  if (deletedPhones.has(normalized)) {
    return res.status(401).json({
      success: false,
      code: 'ACCOUNT_DELETED',
      message: 'الحساب غير موجود أو تم حذفه مسبقاً. يرجى إنشاء حساب جديد.',
    });
  }

  let user = await getUserByPhone(normalized);

  // If user does not exist in server users or was deleted
  if (!user || user.status === 'suspended' || user.status === 'deleted') {
    const fail = recordFailedLogin(normalized);
    if (fail.lockedNow) {
      return res.status(429).json({
        success: false,
        message: 'تم قفل الحساب مؤقتاً لمدة 15 دقيقة بعد 5 محاولات خاطئة. يرجى استخدام "نسيت كلمة المرور".',
      });
    }
    return res.status(401).json({
      success: false,
      code: 'ACCOUNT_NOT_FOUND',
      message: 'الحساب غير موجود أو تم حذفه مسبقاً. يرجى إنشاء حساب جديد.',
      remainingAttempts: fail.remainingAttempts,
    });
  }

  // If user exists but hasn't set up a password yet
  if (!user.passwordHash || !user.passwordSalt) {
    return res.status(200).json({
      success: false,
      requiresPasswordSetup: true,
      message: 'لم يتم تعيين كلمة مرور لهذا الحساب بعد. يرجى التحقق برمز OTP لإنشاء كلمة مرور جديدة.',
    });
  }

  // Verify hashed password safely
  const isValid = verifyPassword(password, user.passwordSalt, user.passwordHash);
  if (!isValid) {
    const fail = recordFailedLogin(normalized);
    if (fail.lockedNow) {
      return res.status(429).json({
        success: false,
        message: 'تم قفل الحساب مؤقتاً لمدة 15 دقيقة بعد 5 محاولات خاطئة. يرجى استخدام "نسيت كلمة المرور".',
      });
    }
    return res.status(401).json({
      success: false,
      message: 'كلمة المرور غير صحيحة. يرجى التأكد وإعادة المحاولة أو النقر على "نسيت كلمة المرور".',
      remainingAttempts: fail.remainingAttempts,
    });
  }

  // Password matches: reset failed attempts
  resetFailedLogin(normalized);

  const terminateOldest = Boolean(req.body.terminateOldest || req.query.terminateOldest);
  if (user.role === 'admin' || normalized === ADMIN_PHONE_E164) {
    const check = handleAdminDeviceLimit(terminateOldest);
    if (!check.allowed) {
      return res.status(403).json({
        success: false,
        maxSessionsReached: true,
        code: 'ADMIN_MAX_SESSIONS_EXCEEDED',
        message: check.message || 'تم تجاوز الحد الأقصى للجلسات (3 أجهزة مسموحة فقط)، يرجى إنهاء جلسة أخرى أولاً',
        allowedMax: 3,
      });
    }
  }

  // Issue session token with device tracking
  const session = await createServerSession(user, req);

  res.json({
    success: true,
    message: user.role === 'admin'
      ? 'تم التحقق بنجاح. أهلاً بك في لوحة الإدارة الرئيسية لمنصة دكانة.'
      : 'تم تسجيل الدخول بنجاح.',
    user: sanitizeUser(user),
    token: session.token,
    sessionId: session.id,
  });
});

// ==========================================
// 5. API: Reset / Set Password (Using Verified Reset Token)
// Also available at /api/auth/set-password
// ==========================================
app.post(['/api/auth/reset-password', '/api/auth/set-password'], async (req, res) => {
  const { phone, resetToken } = req.body;
  const newPassword = req.body.newPassword ?? req.body.password;

  const validation = validateIraqiPhone(phone);
  if (!validation.isValid) {
    return res.status(400).json({ success: false, message: validation.errorMessage || 'رقم الهاتف غير صالح.' });
  }

  const normalized = validation.normalizedE164;

  if (!resetToken) {
    return res.status(400).json({ success: false, message: 'رمز التحقق مفقود أو غير صالح.' });
  }

  const tokenData = serverResetTokens.get(resetToken);
  if (!tokenData || tokenData.phone !== normalized || Date.now() > tokenData.expiresAt) {
    serverResetTokens.delete(resetToken);
    return res.status(400).json({
      success: false,
      message: 'انتهت صلاحية جلسة إعادة تعيين كلمة المرور أو تم استخدام الرمز مسبقاً. يرجى طلب رمز OTP جديد.',
    });
  }

  if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 6) {
    return res.status(400).json({
      success: false,
      message: 'يجب ألا تقل كلمة المرور عن 6 أحرف أو أرقام.',
    });
  }

  // Token is valid: remove it immediately so it cannot be reused
  serverResetTokens.delete(resetToken);

  let user = await getUserByPhone(normalized);
  if (!user) {
    const isMasterAdmin = normalized === ADMIN_PHONE_E164;
    user = {
      id: isMasterAdmin ? 'usr_admin' : `usr_${Date.now()}`,
      phone: normalized,
      displayName: isMasterAdmin ? 'مدير منصة دكانة الرئيسي' : (normalized || 'عميل دكانة'),
      role: isMasterAdmin ? 'admin' : 'customer',
      governorate: 'بغداد',
      createdAt: new Date().toISOString(),
      status: 'active',
    };
  }

  // Strong password hash (PBKDF2 with 100,000 iterations & salt)
  const { salt, hash } = hashPassword(newPassword);
  user.passwordSalt = salt;
  user.passwordHash = hash;

  // Persist updated user to Neon PostgreSQL DB + disk + in-memory Map
  await saveUserToDatabase(user);

  // Invalidate any old sessions after password reset
  invalidateUserSessions(normalized);

  // Clear any failed login rate limit lockouts
  resetFailedLogin(normalized);

  res.json({
    success: true,
    message: 'تم تعيين كلمة المرور الجديدة بنجاح. يرجى تسجيل الدخول باستخدام كلمة المرور الجديدة.',
    user: sanitizeUser(user),
  });
});

// ==========================================
// 6. API: Verify OTP & Register New User with Password
// Also available at /api/auth/complete-registration
// ==========================================
app.post(['/api/auth/register', '/api/auth/complete-registration'], async (req, res) => {
  const {
    accountType,
    phone,
    otpCode,
    resetToken,
    fullName,
    governorate,
    storeName,
    storeDescription,
    address,
  } = req.body;

  const password = req.body.password ?? req.body.newPassword;

  const validation = validateIraqiPhone(phone);
  if (!validation.isValid) {
    return res.status(400).json({ success: false, message: validation.errorMessage || 'رقم الهاتف غير صالح.' });
  }

  const normalized = validation.normalizedE164;
  const isAdminPhone = normalized === ADMIN_PHONE_E164;

  // Verification via resetToken OR direct otpCode
  let isVerified = false;
  if (resetToken) {
    const tokenData = serverResetTokens.get(resetToken);
    if (tokenData && tokenData.phone === normalized && Date.now() <= tokenData.expiresAt) {
      isVerified = true;
      serverResetTokens.delete(resetToken);
    }
  }

  if (!isVerified && otpCode) {
    const cleanEntered = (otpCode || '').toString().trim().replace(/\D/g, '');
    const session = serverOTPs.get(normalized);
    if (session && cleanEntered === session.code && Date.now() <= session.expiresAt) {
      isVerified = true;
      serverOTPs.delete(normalized);
    }
  }

  if (!isVerified) {
    return res.status(401).json({
      success: false,
      message: 'رمز التحقق غير صحيح أو منتهي الصلاحية. يرجى طلب رمز جديد.',
    });
  }

  // Password validation & hashing
  if (!password || typeof password !== 'string' || password.trim().length < 6) {
    return res.status(400).json({
      success: false,
      message: 'يجب أن تحتوي كلمة المرور على 6 أحرف أو أرقام على الأقل.',
    });
  }

  const { salt, hash } = hashPassword(password);

  // SERVER-SIDE STRICT ROLE AUTHORIZATION:
  // ONLY ADMIN_PHONE_E164 can be granted 'admin' role
  if (accountType === 'admin_staff') {
    if (!isAdminPhone) {
      return res.status(403).json({
        success: false,
        message: 'تم رفض إنشاء الحساب من جهة الخادم: رقم الهاتف هذا غير مصرح له بصلاحيات الإدارة. رقم المدير المعتمد الوحيد هو 07862214922.',
      });
    }
  }

  const assignedRole: 'customer' | 'merchant' | 'admin' =
    accountType === 'admin_staff' && isAdminPhone
      ? 'admin'
      : accountType === 'merchant'
      ? 'merchant'
      : 'customer';

  const existingUser = await getUserByPhone(normalized);
  const userId = existingUser ? existingUser.id : (assignedRole === 'admin' ? 'usr_admin' : `usr_${Date.now()}`);
  const newUser: ServerUser = {
    id: userId,
    phone: normalized,
    displayName: (fullName || storeName || '').trim() || (existingUser?.displayName) || (assignedRole === 'merchant' ? (storeName || 'متجر معتمد في دكانة') : assignedRole === 'admin' ? 'مدير منصة دكانة' : 'عميل دكانة'),
    role: assignedRole,
    governorate: governorate || existingUser?.governorate || 'بغداد',
    merchantStoreId: assignedRole === 'merchant' ? (existingUser?.merchantStoreId || `merch_${Date.now()}`) : undefined,
    createdAt: existingUser?.createdAt || new Date().toISOString(),
    status: 'active',
    passwordSalt: salt,
    passwordHash: hash,
  };

  // Persist new/updated user to Neon PostgreSQL DB + disk + in-memory Map
  await saveUserToDatabase(newUser);

  // Remove from deleted phones registry if user registers anew
  if (deletedPhones.has(normalized)) {
    deletedPhones.delete(normalized);
    saveDeletedPhonesToDisk();
  }

  // Clear any failed login rate limit lockouts
  resetFailedLogin(normalized);

  const terminateOldest = Boolean(req.body.terminateOldest || req.query.terminateOldest);
  if (assignedRole === 'admin' || normalized === ADMIN_PHONE_E164) {
    const check = handleAdminDeviceLimit(terminateOldest);
    if (!check.allowed) {
      return res.status(403).json({
        success: false,
        maxSessionsReached: true,
        code: 'ADMIN_MAX_SESSIONS_EXCEEDED',
        message: check.message || 'تم تجاوز الحد الأقصى للجلسات (3 أجهزة مسموحة فقط)، يرجى إنهاء جلسة أخرى أولاً',
        allowedMax: 3,
      });
    }
  }

  // Issue session token with device tracking
  const session = await createServerSession(newUser, req);

  res.json({
    success: true,
    message: assignedRole === 'admin'
      ? 'تم التحقق بنجاح وتفعيل صلاحية المدير الرسمي وتعيين كلمة المرور.'
      : 'تم إنشاء الحساب وتعيين كلمة المرور بنجاح.',
    user: sanitizeUser(newUser),
    token: session.token,
    sessionId: session.id,
  });
});

// ==========================================
// 7. API: Verify OTP & Login (Or Unified Auth Dispatcher)
// ==========================================
app.post('/api/auth/login', async (req, res) => {
  const { phone, otpCode, password } = req.body;

  // If password provided, dispatch directly to password flow
  const pass = password ?? req.body.newPassword;
  if (pass && typeof pass === 'string') {
    const validation = validateIraqiPhone(phone);
    if (!validation.isValid) {
      return res.status(400).json({ success: false, message: validation.errorMessage || 'رقم الهاتف غير صالح.' });
    }
    const normalized = validation.normalizedE164;
    const limit = checkLoginRateLimit(normalized);
    if (!limit.allowed) {
      return res.status(429).json({
        success: false,
        message: `تم قفل محاولات تسجيل الدخول مؤقتاً لتكرار الخطأ. يرجى المحاولة بعد ${limit.remainingLockoutSeconds} ثانية أو استخدام "نسيت كلمة المرور".`,
      });
    }
    if (deletedPhones.has(normalized)) {
      return res.status(401).json({
        success: false,
        code: 'ACCOUNT_DELETED',
        message: 'الحساب غير موجود أو تم حذفه مسبقاً. يرجى إنشاء حساب جديد.',
      });
    }
    let user = await getUserByPhone(normalized);
    if (!user || user.status === 'suspended' || user.status === 'deleted') {
      const fail = recordFailedLogin(normalized);
      return res.status(401).json({
        success: false,
        code: 'ACCOUNT_NOT_FOUND',
        message: 'الحساب غير موجود أو تم حذفه مسبقاً. يرجى إنشاء حساب جديد.',
        remainingAttempts: fail.remainingAttempts,
      });
    }
    if (!user.passwordSalt || !user.passwordHash) {
      return res.status(200).json({
        success: false,
        requiresPasswordSetup: true,
        message: 'لم يتم تعيين كلمة مرور لهذا الحساب بعد. يرجى التحقق برمز OTP لإنشاء كلمة مرور جديدة.',
      });
    }
    const isValid = verifyPassword(pass, user.passwordSalt, user.passwordHash);
    if (!isValid) {
      const fail = recordFailedLogin(normalized);
      return res.status(401).json({
        success: false,
        message: 'كلمة المرور غير صحيحة. يرجى التأكد وإعادة المحاولة أو النقر على "نسيت كلمة المرور".',
        remainingAttempts: fail.remainingAttempts,
      });
    }
    resetFailedLogin(normalized);

    const terminateOldest = Boolean(req.body.terminateOldest || req.query.terminateOldest);
    if (user.role === 'admin' || normalized === ADMIN_PHONE_E164) {
      const check = handleAdminDeviceLimit(terminateOldest);
      if (!check.allowed) {
        return res.status(403).json({
          success: false,
          maxSessionsReached: true,
          code: 'ADMIN_MAX_SESSIONS_EXCEEDED',
          message: check.message || 'تم تجاوز الحد الأقصى للجلسات (3 أجهزة مسموحة فقط)، يرجى إنهاء جلسة أخرى أولاً',
          allowedMax: 3,
        });
      }
    }

    const session = await createServerSession(user, req);
    return res.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح.',
      user: sanitizeUser(user),
      token: session.token,
      sessionId: session.id,
    });
  }

  // Otherwise, verify OTP flow
  const validation = validateIraqiPhone(phone);
  if (!validation.isValid) {
    return res.status(400).json({ success: false, message: validation.errorMessage || 'رقم الهاتف غير صالح.' });
  }

  const normalized = validation.normalizedE164;
  const isAdminPhone = normalized === ADMIN_PHONE_E164;

  if (deletedPhones.has(normalized)) {
    return res.status(401).json({
      success: false,
      code: 'ACCOUNT_DELETED',
      message: 'الحساب غير موجود أو تم حذفه مسبقاً. يرجى إنشاء حساب جديد.',
    });
  }

  const cleanEntered = (otpCode || '').toString().trim().replace(/\D/g, '');
  const otpRecord = serverOTPs.get(normalized);
  const isValidOTP = !!otpRecord && cleanEntered === otpRecord.code && Date.now() <= otpRecord.expiresAt;

  if (!isValidOTP) {
    return res.status(401).json({ success: false, message: 'رمز التحقق غير صحيح أو منتهي الصلاحية.' });
  }
  serverOTPs.delete(normalized);

  // Retrieve user or instantiate canonical admin if matching admin phone
  let user = await getUserByPhone(normalized);
  if (!user && isAdminPhone) {
    const adminPass = hashPassword('123456');
    user = {
      id: 'usr_admin',
      phone: ADMIN_PHONE_E164,
      displayName: 'مدير منصة دكانة الرئيسي',
      role: 'admin',
      governorate: 'بغداد',
      createdAt: new Date().toISOString(),
      status: 'active',
      passwordSalt: adminPass.salt,
      passwordHash: adminPass.hash,
    };
    await saveUserToDatabase(user);
  }

  if (!user) {
    const resetToken = `rst_${Date.now()}_${crypto.randomBytes(24).toString('hex')}`;
    serverResetTokens.set(resetToken, {
      phone: normalized,
      expiresAt: Date.now() + 15 * 60 * 1000,
    });

    return res.json({
      success: true,
      requiresPasswordSetup: true,
      resetToken,
      message: 'تم التحقق بنجاح. يرجى إنشاء كلمة مرور لحسابك للمتابعة.',
    });
  }

  // Check if existing user does NOT have a password yet -> Force password creation
  if (!user.passwordHash || !user.passwordSalt) {
    const resetToken = `rst_${Date.now()}_${crypto.randomBytes(24).toString('hex')}`;
    serverResetTokens.set(resetToken, {
      phone: normalized,
      expiresAt: Date.now() + 15 * 60 * 1000,
    });

    return res.json({
      success: true,
      requiresPasswordSetup: true,
      resetToken,
      message: 'تم التحقق بنجاح. يرجى إنشاء كلمة مرور لحسابك للمتابعة.',
      user: sanitizeUser(user),
    });
  }

  // Check admin 3-device limit before issuing session token
  const terminateOldest = Boolean(req.body.terminateOldest || req.query.terminateOldest);
  if (user.role === 'admin' || isAdminPhone) {
    const check = handleAdminDeviceLimit(terminateOldest);
    if (!check.allowed) {
      return res.status(403).json({
        success: false,
        maxSessionsReached: true,
        code: 'ADMIN_MAX_SESSIONS_EXCEEDED',
        message: check.message || 'تم تجاوز الحد الأقصى للجلسات (3 أجهزة مسموحة فقط)، يرجى إنهاء جلسة أخرى أولاً',
        allowedMax: 3,
      });
    }
  }

  // Issue session token with device tracking
  const session = await createServerSession(user, req);

  res.json({
    success: true,
    message: isAdminPhone
      ? 'تم التحقق بنجاح. أهلاً بك في لوحة الإدارة الرئيسية لمنصة دكانة.'
      : 'تم تسجيل الدخول بنجاح.',
    user: sanitizeUser(user),
    token: session.token,
    sessionId: session.id,
  });
});

// ==========================================
// 4.1 API: Active Sessions Management & Security (Requirements 2 & 3)
// ==========================================
app.get('/api/auth/sessions', async (req, res) => {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;
  const rawToken = bearerToken || (typeof req.query?.token === 'string' ? req.query.token.trim() : null);

  if (!rawToken) {
    return res.status(401).json({ success: false, error: 'رمز الجلسة غير متوفر' });
  }

  const currentSession: ServerSession | undefined = serverSessions.get(rawToken);
  if (!currentSession || currentSession.expiresAt <= Date.now()) {
    if (currentSession) {
      serverSessions.delete(rawToken);
      saveSessionsToDisk();
    }
    return res.status(401).json({
      success: false,
      error: 'الجلسة غير صالحة أو منتهية الصلاحية. يرجى تسجيل الدخول مجدداً.',
    });
  }

  // Update last active timestamp
  currentSession.lastActiveAt = Date.now();
  saveSessionsToDisk();

  const now = Date.now();
  const userSessionsList: any[] = [];

  for (const [token, s] of serverSessions.entries()) {
    if (s.expiresAt > now && (s.phone === currentSession.phone || s.userId === currentSession.userId)) {
      userSessionsList.push({
        id: s.id,
        deviceName: s.deviceName,
        browser: s.browser,
        os: s.os,
        deviceType: s.deviceType,
        ipAddress: s.ipAddress || '127.0.0.1',
        location: s.location || 'العراق',
        isCurrent: token === rawToken,
        createdAt: new Date(s.createdAt).toISOString(),
        lastActiveAt: new Date(s.lastActiveAt).toISOString(),
      });
    }
  }

  // Sort so current device is first, then newest active
  userSessionsList.sort((a, b) => {
    if (a.isCurrent) return -1;
    if (b.isCurrent) return 1;
    return new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime();
  });

  const isAdmin = currentSession.role === 'admin' || currentSession.phone === ADMIN_PHONE_E164;

  res.json({
    success: true,
    sessions: userSessionsList,
    totalActive: userSessionsList.length,
    isAdmin,
    maxDevicesAllowed: isAdmin ? 3 : null,
  });
});

app.post('/api/auth/sessions/terminate', async (req, res) => {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
  const currentToken = bearerToken || req.body?.token;
  const targetSessionId = req.body?.sessionId;

  if (!currentToken) {
    return res.status(401).json({ success: false, error: 'غير مصرح' });
  }

  const currentSession = serverSessions.get(currentToken);
  if (!currentSession) {
    return res.status(401).json({ success: false, error: 'الجلسة غير صالحة' });
  }

  if (!targetSessionId) {
    return res.status(400).json({ success: false, error: 'معرّف الجلسة مطلوب' });
  }

  let isCurrentTerminated = false;
  let found = false;

  for (const [token, s] of serverSessions.entries()) {
    if (s.id === targetSessionId && (s.phone === currentSession.phone || s.userId === currentSession.userId)) {
      found = true;
      if (token === currentToken) {
        isCurrentTerminated = true;
      }
      serverSessions.delete(token);
      if (db) {
        db.delete(schema.userSessions).where(eq(schema.userSessions.token, token)).catch(() => {});
      }
      break;
    }
  }

  saveSessionsToDisk();

  if (!found) {
    return res.status(404).json({ success: false, error: 'لم يتم العثور على الجلسة المحددة' });
  }

  res.json({
    success: true,
    message: isCurrentTerminated ? 'تم إنهاء الجلسة الحالية وتسجيل الخروج.' : 'تم إنهاء الجلسة بنجاح.',
    isCurrentTerminated,
  });
});

app.post(['/api/auth/sessions/terminate-others', '/api/auth/sessions/terminate-all'], async (req, res) => {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;
  const currentToken = bearerToken || (typeof req.body?.token === 'string' ? req.body.token.trim() : null);

  if (!currentToken) {
    return res.status(401).json({ success: false, error: 'غير مصرح: رمز الجلسة مطلوب' });
  }

  const currentSession = serverSessions.get(currentToken);
  if (!currentSession || currentSession.expiresAt <= Date.now()) {
    return res.status(401).json({ success: false, error: 'الجلسة غير صالحة أو منتهية الصلاحية. يرجى تسجيل الدخول مجدداً.' });
  }

  const effectiveUserId = currentSession.userId;
  const effectivePhone = currentSession.phone;

  let terminatedCount = 0;
  for (const [token, s] of serverSessions.entries()) {
    if (token !== currentToken && ((effectivePhone && s.phone === effectivePhone) || (effectiveUserId && s.userId === effectiveUserId))) {
      serverSessions.delete(token);
      if (db) {
        db.delete(schema.userSessions).where(eq(schema.userSessions.token, token)).catch(() => {});
      }
      terminatedCount++;
    }
  }

  if (pool && (effectiveUserId || effectivePhone)) {
    try {
      await pool.query(
        'DELETE FROM user_sessions WHERE token != $1 AND (user_id = $2 OR phone = $3)',
        [currentToken, effectiveUserId || '', effectivePhone || '']
      );
    } catch (e) {
      console.warn('DB terminate others fallback:', e);
    }
  }

  saveSessionsToDisk();

  res.json({
    success: true,
    message: `تم تسجيل الخروج بنجاح من كافة الأجهزة الأخرى (${terminatedCount} جلسة).`,
    terminatedCount,
  });
});

// Requirement 2: Terminate All Sessions Endpoint
app.post('/api/auth/terminate-all-sessions', async (req, res) => {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
  const currentToken = bearerToken || req.body?.token;

  let currentSession = currentToken ? serverSessions.get(currentToken) : undefined;
  const targetUserId = req.body?.userId || (req.headers['x-user-id'] as string) || currentSession?.userId;
  const targetPhone = req.body?.phone || (req.headers['x-user-phone'] as string) || currentSession?.phone;

  const effectiveUserId = targetUserId || currentSession?.userId;
  const effectivePhone = targetPhone || currentSession?.phone;

  let terminatedCount = 0;

  // 1. Invalidate and remove all matching sessions from memory map
  for (const [tok, s] of Array.from(serverSessions.entries())) {
    const matchesUser =
      (effectiveUserId && s.userId === effectiveUserId) ||
      (effectivePhone && s.phone === effectivePhone) ||
      (currentToken && tok === currentToken);

    if (matchesUser) {
      serverSessions.delete(tok);
      if (db) {
        db.delete(schema.userSessions).where(eq(schema.userSessions.token, tok)).catch(() => {});
      }
      terminatedCount++;
    }
  }

  // 2. Invalidate in PostgreSQL database
  if (pool && (effectiveUserId || effectivePhone || currentToken)) {
    try {
      await pool.query(
        'DELETE FROM user_sessions WHERE user_id = $1 OR phone = $2 OR token = $3',
        [effectiveUserId || '', effectivePhone || '', currentToken || '']
      );
    } catch (e) {
      console.warn('DB terminate-all-sessions error:', e);
    }
  }

  saveSessionsToDisk();

  res.json({
    success: true,
    message: 'تم إنهاء كافة الجلسات بنجاح، يرجى تسجيل الدخول مجدداً',
    terminatedCount,
  });
});

// ==========================================
// 4.2 API: Update Profile (Avatar & Name) for All Roles (Requirement 1)
// ==========================================
app.post('/api/user/profile', async (req, res) => {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
  const token = bearerToken || req.body?.token;
  const phone = req.body?.phone;

  let sessionUser: ServerUser | undefined;

  if (token) {
    const session = serverSessions.get(token);
    if (session) {
      sessionUser = serverUsers.get(session.phone);
    }
  }

  if (!sessionUser && phone) {
    const val = validateIraqiPhone(phone);
    if (val.isValid) {
      sessionUser = serverUsers.get(val.normalizedE164);
    }
  }

  if (!sessionUser) {
    return res.status(401).json({ success: false, error: 'غير مصرح: يجب تسجيل الدخول لتحديث الملف الشخصي' });
  }

  const { avatarUrl, displayName, governorate } = req.body;

  if (avatarUrl !== undefined) {
    sessionUser.avatarUrl = avatarUrl || undefined;
  }
  if (displayName && typeof displayName === 'string' && displayName.trim()) {
    sessionUser.displayName = displayName.trim();
  }
  if (governorate && typeof governorate === 'string' && governorate.trim()) {
    sessionUser.governorate = governorate.trim();
  }

  await saveUserToDatabase(sessionUser);

  res.json({
    success: true,
    message: 'تم تحديث الملف الشخصي والصورة بنجاح.',
    user: sanitizeUser(sessionUser),
  });
});

// ==========================================
// 4.3 API: Permanent Account Deletion (Apple & Google Compliant)
// ==========================================
app.post(['/api/user/delete-account', '/api/user/delete'], async (req, res) => {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
  const token = bearerToken || req.body?.token;
  const targetPhone = req.body?.phone;
  const targetUserId = req.body?.userId;

  let phoneToDelete: string | null = null;
  let userIdToDelete: string | null = null;

  if (token) {
    const session = serverSessions.get(token);
    if (session) {
      phoneToDelete = session.phone;
      userIdToDelete = session.userId;
    }
  }

  if (!phoneToDelete && targetPhone) {
    const val = validateIraqiPhone(targetPhone);
    if (val.isValid) {
      phoneToDelete = val.normalizedE164;
    }
  }

  if (targetUserId && !userIdToDelete) {
    userIdToDelete = targetUserId;
  }

  if (!phoneToDelete && !userIdToDelete) {
    return res.status(400).json({ success: false, message: 'معلومات الحساب غير متوفرة لإتمام الحذف.' });
  }

  // 1. Invalidate and remove all active sessions immediately
  for (const [sToken, s] of serverSessions.entries()) {
    if ((phoneToDelete && s.phone === phoneToDelete) || (userIdToDelete && s.userId === userIdToDelete)) {
      serverSessions.delete(sToken);
      if (db) {
        db.delete(schema.userSessions).where(eq(schema.userSessions.token, sToken)).catch(() => {});
      }
    }
  }
  saveSessionsToDisk();

  // 2. Erase from serverUsers Map and add to deletedPhones blacklist
  if (phoneToDelete) {
    serverUsers.delete(phoneToDelete);
    deletedPhones.add(phoneToDelete);
  }
  if (userIdToDelete) {
    for (const [p, u] of serverUsers.entries()) {
      if (u.id === userIdToDelete) {
        serverUsers.delete(p);
        deletedPhones.add(p);
      }
    }
  }
  saveUsersToDisk();
  saveDeletedPhonesToDisk();

  // 3. Erase from PostgreSQL Neon DB if connected
  if (pool) {
    try {
      if (phoneToDelete) {
        await pool.query('DELETE FROM users WHERE phone = $1', [phoneToDelete]);
        await pool.query('DELETE FROM user_sessions WHERE phone = $1', [phoneToDelete]);
      }
      if (userIdToDelete) {
        await pool.query('DELETE FROM users WHERE id = $1', [userIdToDelete]);
        await pool.query('DELETE FROM user_sessions WHERE user_id = $1', [userIdToDelete]);
      }
    } catch (dbErr) {
      console.warn('[PostgreSQL] Error deleting user in database:', dbErr);
    }
  }

  res.json({
    success: true,
    message: 'تم مسح الحساب وكافة بياناتك الشخصية نهائياً بنجاح وفق سياسة حماية الخصوصية.',
  });
});

// ==========================================
// 5. API: Server-Side Admin Access Verification Guard
// Relies exclusively on Bearer Token and active server session.
// Client headers or request body phone numbers are never trusted.
// ==========================================
app.post('/api/admin/verify-access', (req, res) => {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;
  const token = bearerToken || (typeof req.body?.token === 'string' ? req.body.token.trim() : null);

  if (!token) {
    return res.status(401).json({
      authorized: false,
      error: 'رفض أمني من الخادم: رمز التفويض (Bearer Token) مفقود. يجب تسجيل الدخول بحساب المدير.',
    });
  }

  const session = serverSessions.get(token);
  if (!session || session.expiresAt <= Date.now()) {
    return res.status(401).json({
      authorized: false,
      error: 'رفض أمني من الخادم: جلسة المدير غير صالحة أو منتهية الصلاحية. يرجى تسجيل الدخول مجدداً.',
    });
  }

  if (session.role !== 'admin' && session.phone !== ADMIN_PHONE_E164) {
    return res.status(403).json({
      authorized: false,
      error: 'رفض أمني من الخادم: هذا الحساب لا يمتلك صلاحيات إدارة المنصة.',
    });
  }

  // Refresh active timestamp
  session.lastActiveAt = Date.now();
  saveSessionsToDisk();

  // Authorized
  res.json({
    authorized: true,
    role: 'admin',
    phone: session.phone,
    serverVerifiedAt: new Date().toISOString(),
  });
});

// Helper: Strictly verify admin authorization for admin endpoints
// Depends EXCLUSIVELY on an active, non-expired server session via Bearer Token.
// Never trusts any client-supplied phone numbers in headers or request body.
function verifyAdminRequest(req: express.Request): boolean {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;
  const token = bearerToken || (typeof req.body?.token === 'string' ? req.body.token.trim() : null) || (typeof req.query?.token === 'string' ? (req.query.token as string).trim() : null);

  if (!token) {
    return false;
  }

  const session = serverSessions.get(token);
  if (!session) {
    return false;
  }

  if (session.expiresAt <= Date.now()) {
    serverSessions.delete(token);
    saveSessionsToDisk();
    return false;
  }

  if (session.role === 'admin' || session.phone === ADMIN_PHONE_E164) {
    session.lastActiveAt = Date.now();
    return true;
  }

  return false;
}

// 6. API: Get all registered users (Customers & Merchants) for Admin Dashboard exclusively
app.get('/api/admin/users', async (req, res) => {
  if (!verifyAdminRequest(req)) {
    return res.status(403).json({ error: 'غير مصرح: هذا القسم محصور بمدير المنصة فقط' });
  }

  try {
    let usersList: any[] = [];
    if (db) {
      try {
        const rows = await db
          .select({
            id: schema.users.id,
            displayName: schema.users.displayName,
            phone: schema.users.phone,
            role: schema.users.role,
            governorate: schema.users.governorate,
            merchantStoreId: schema.users.merchantStoreId,
            status: schema.users.status,
            createdAt: schema.users.createdAt,
          })
          .from(schema.users)
          .orderBy(schema.users.createdAt);

        // Fetch merchant records to accurately sync status
        const merchantMap = new Map<string, string>();
        try {
          const mRows = await db
            .select({
              id: schema.merchants.id,
              userId: schema.merchants.userId,
              phone: schema.merchants.phone,
              status: schema.merchants.status,
            })
            .from(schema.merchants);
          for (const m of mRows) {
            if (m.userId) merchantMap.set(m.userId, m.status);
            if (m.id) merchantMap.set(m.id, m.status);
            if (m.phone) merchantMap.set(m.phone, m.status);
          }
        } catch {
          // Table may not have records yet
        }

        usersList = rows.map(r => {
          const memUser = serverUsers.get(r.phone);
          const merchStatus =
            memUser?.merchantStatus ||
            merchantMap.get(r.id) ||
            merchantMap.get(r.phone) ||
            (r.merchantStoreId ? merchantMap.get(r.merchantStoreId) : undefined) ||
            (r.role === 'merchant' ? (r.id === 'usr_merch_1' ? 'approved' : 'pending') : undefined);

          return {
            ...r,
            merchantStatus: merchStatus,
            createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
          };
        });
      } catch (dbErr: any) {
        console.warn('[AdminUsers] DB query fallback to memory:', dbErr?.message || dbErr);
      }
    }

    if (usersList.length === 0) {
      // Memory / disk fallback
      usersList = Array.from(serverUsers.values()).map(u => ({
        id: u.id,
        displayName: u.displayName,
        phone: u.phone,
        role: u.role,
        governorate: u.governorate,
        merchantStoreId: u.merchantStoreId,
        status: u.status,
        merchantStatus: u.merchantStatus || (u.role === 'merchant' ? (u.id === 'usr_merch_1' ? 'approved' : 'pending') : undefined),
        createdAt: u.createdAt || new Date().toISOString(),
      }));
    }

    res.json({
      success: true,
      users: usersList,
      totalCount: usersList.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل استرجاع قائمة المستخدمين: ' + (err?.message || err) });
  }
});

// 7. API: Toggle / Update Merchant Verification Status for Admin Dashboard exclusively
app.post(['/api/admin/toggle-merchant-status', '/api/admin/merchants/toggle-status'], async (req, res) => {
  if (!verifyAdminRequest(req)) {
    return res.status(403).json({ success: false, error: 'غير مصرح: هذا الإجراء محصور بمدير المنصة فقط وجلسة نشطة صالحة' });
  }

  // Extract parameters as plain strings without restrictive regex
  const rawUserId = req.body?.userId ?? req.query?.userId ?? '';
  const rawPhone = req.body?.merchantPhone ?? req.body?.targetPhone ?? req.body?.phone ?? req.query?.merchantPhone ?? req.query?.phone ?? '';
  const rawMerchantId = req.body?.merchantId ?? req.query?.merchantId ?? '';
  const rawStatus = req.body?.status ?? req.query?.status ?? '';

  const userId = String(rawUserId || '').trim();
  const phone = String(rawPhone || '').trim();
  const merchantId = String(rawMerchantId || '').trim();
  const statusStr = String(rawStatus || '').trim().toLowerCase();

  const finalStatus: 'approved' | 'pending' | 'rejected' | 'suspended' =
    statusStr === 'approved'
      ? 'approved'
      : statusStr === 'rejected'
      ? 'rejected'
      : statusStr === 'suspended'
      ? 'suspended'
      : 'pending';

  try {
    // 1. Locate and update in memory serverUsers
    let targetUser: ServerUser | undefined;
    if (phone) {
      targetUser = serverUsers.get(phone);
      if (!targetUser) {
        const cleanDigits = phone.replace(/\D/g, '');
        if (cleanDigits.length >= 7) {
          const suffix = cleanDigits.slice(-9);
          targetUser = Array.from(serverUsers.values()).find(u => u.phone.replace(/\D/g, '').endsWith(suffix));
        }
      }
    }
    if (!targetUser && userId) {
      targetUser = Array.from(serverUsers.values()).find(u => String(u.id) === userId);
    }
    if (!targetUser && merchantId) {
      targetUser = Array.from(serverUsers.values()).find(u => String(u.merchantStoreId) === merchantId);
    }

    if (targetUser) {
      targetUser.merchantStatus = finalStatus;
      saveUsersToDisk();
    }

    // 2. Persist to Neon PostgreSQL database if connected
    if (db) {
      try {
        if (merchantId) {
          await db
            .update(schema.merchants)
            .set({
              status: finalStatus,
              updatedAt: new Date(),
            })
            .where(eq(schema.merchants.id, merchantId));
        }

        const effectiveUserId = targetUser?.id || userId;
        if (effectiveUserId) {
          await db
            .update(schema.merchants)
            .set({
              status: finalStatus,
              updatedAt: new Date(),
            })
            .where(eq(schema.merchants.userId, effectiveUserId));
        }

        const effectivePhone = targetUser?.phone || phone;
        if (effectivePhone) {
          await db
            .update(schema.merchants)
            .set({
              status: finalStatus,
              updatedAt: new Date(),
            })
            .where(eq(schema.merchants.phone, effectivePhone));
        }
      } catch (dbErr: any) {
        console.warn('[AdminMerchantStatus] Database update notice:', dbErr?.message || dbErr);
      }
    }

    return res.status(200).json({
      success: true,
      message: finalStatus === 'approved' ? 'تم اعتماد التاجر بنجاح' : 'تم تغيير حالة التاجر إلى قيد المراجعة',
      status: finalStatus,
      userId: targetUser?.id || userId,
      phone: targetUser?.phone || phone,
      merchantId: merchantId || targetUser?.merchantStoreId || '',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'فشل تحديث حالة اعتماد التاجر: ' + (err?.message || err) });
  }
});

// ==========================================
// Mount Modular Full-Stack Features: Chat, Notifications, Stories, Promotions & Gemini AI
// ==========================================
import { setupFeatures } from './src/server/features';
setupFeatures(app, pool, serverSessions, serverUsers);

// ==========================================
// Vite Integration (Dev) / Static Serving (Prod)
// ==========================================
async function startServer() {
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : {
          server: httpServer,
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`Dukkana Full-Stack Platform server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
