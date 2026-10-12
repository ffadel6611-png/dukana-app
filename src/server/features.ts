import { Express, Request, Response } from 'express';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';
import { ADMIN_PHONE_E164 } from '../types/index';
import { INITIAL_MERCHANTS, INITIAL_USERS } from '../data/initialData';

export function setupFeatures(
  app: Express,
  pool: Pool | null,
  serverSessions: Map<string, any>,
  serverUsers?: Map<string, any>
) {
  // ----------------------------------------------------
  // 1. Initialize Tables in PostgreSQL if they do not exist
  // ----------------------------------------------------
  async function initExtendedTables() {
    if (!pool) return;
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS conversations (
          id VARCHAR(64) PRIMARY KEY,
          participant1_id VARCHAR(64) NOT NULL,
          participant2_id VARCHAR(64) NOT NULL,
          participant1_name VARCHAR(150),
          participant2_name VARCHAR(150),
          participant1_avatar TEXT,
          participant2_avatar TEXT,
          participant1_role VARCHAR(20) NOT NULL DEFAULT 'customer',
          participant2_role VARCHAR(20) NOT NULL DEFAULT 'merchant',
          entity_type VARCHAR(30) DEFAULT 'general',
          entity_id VARCHAR(64),
          last_message_text TEXT,
          last_message_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          unread_count_p1 INTEGER NOT NULL DEFAULT 0,
          unread_count_p2 INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'participant1_name') THEN
            ALTER TABLE conversations ADD COLUMN participant1_name VARCHAR(150);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'participant2_name') THEN
            ALTER TABLE conversations ADD COLUMN participant2_name VARCHAR(150);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'participant1_avatar') THEN
            ALTER TABLE conversations ADD COLUMN participant1_avatar TEXT;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'participant2_avatar') THEN
            ALTER TABLE conversations ADD COLUMN participant2_avatar TEXT;
          END IF;
        END $$;

        CREATE TABLE IF NOT EXISTS chat_messages (
          id VARCHAR(64) PRIMARY KEY,
          conversation_id VARCHAR(64) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
          sender_id VARCHAR(64) NOT NULL,
          sender_name VARCHAR(150),
          sender_avatar TEXT,
          sender_role VARCHAR(20) NOT NULL,
          text TEXT,
          media_url TEXT,
          media_type VARCHAR(20),
          product_id VARCHAR(64),
          order_id VARCHAR(64),
          status VARCHAR(20) NOT NULL DEFAULT 'delivered',
          is_read BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'sender_name') THEN
            ALTER TABLE chat_messages ADD COLUMN sender_name VARCHAR(150);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'sender_avatar') THEN
            ALTER TABLE chat_messages ADD COLUMN sender_avatar TEXT;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'status') THEN
            ALTER TABLE chat_messages ADD COLUMN status VARCHAR(20) DEFAULT 'delivered';
          END IF;
        END $$;

        CREATE TABLE IF NOT EXISTS chat_reports (
          id VARCHAR(64) PRIMARY KEY,
          conversation_id VARCHAR(64) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
          reporter_id VARCHAR(64) NOT NULL,
          reason TEXT NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'pending',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS blocked_users (
          id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(64) NOT NULL,
          blocked_user_id VARCHAR(64) NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS notifications (
          id VARCHAR(64) PRIMARY KEY,
          recipient_id VARCHAR(64) NOT NULL,
          recipient_role VARCHAR(20),
          title VARCHAR(200) NOT NULL,
          message TEXT NOT NULL,
          type VARCHAR(40) NOT NULL DEFAULT 'system',
          entity_id VARCHAR(64),
          is_read BOOLEAN NOT NULL DEFAULT FALSE,
          is_broadcast BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS admin_stories (
          id VARCHAR(64) PRIMARY KEY,
          title VARCHAR(150) NOT NULL,
          media_url TEXT NOT NULL,
          media_type VARCHAR(20) NOT NULL DEFAULT 'image',
          cta_text VARCHAR(100) DEFAULT 'تسوّق الآن',
          cta_link TEXT,
          start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          end_date TIMESTAMPTZ NOT NULL,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          views_count INTEGER NOT NULL DEFAULT 0,
          clicks_count INTEGER NOT NULL DEFAULT 0,
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS promotion_requests (
          id VARCHAR(64) PRIMARY KEY,
          merchant_id VARCHAR(64) NOT NULL,
          merchant_store_id VARCHAR(64),
          product_id VARCHAR(64),
          promo_type VARCHAR(40) NOT NULL DEFAULT 'product',
          duration_days INTEGER NOT NULL DEFAULT 7,
          price_iqd INTEGER NOT NULL DEFAULT 15000,
          notes TEXT,
          status VARCHAR(20) NOT NULL DEFAULT 'pending',
          rejection_reason TEXT,
          start_date TIMESTAMPTZ,
          end_date TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS user_sessions (
          id VARCHAR(64) PRIMARY KEY,
          token VARCHAR(128) NOT NULL UNIQUE,
          user_id VARCHAR(64) NOT NULL,
          phone VARCHAR(32) NOT NULL,
          role VARCHAR(20) NOT NULL DEFAULT 'customer',
          device_name VARCHAR(150) NOT NULL,
          browser VARCHAR(80) NOT NULL,
          os VARCHAR(80) NOT NULL,
          device_type VARCHAR(30) NOT NULL DEFAULT 'desktop',
          ip_address VARCHAR(64),
          location VARCHAR(100),
          last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          expires_at TIMESTAMPTZ NOT NULL
        );

        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'avatar_url'
          ) THEN
            ALTER TABLE users ADD COLUMN avatar_url TEXT;
          END IF;
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'products' AND column_name = 'is_promoted'
          ) THEN
            ALTER TABLE products ADD COLUMN is_promoted BOOLEAN DEFAULT FALSE;
          END IF;
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'products' AND column_name = 'featured'
          ) THEN
            ALTER TABLE products ADD COLUMN featured BOOLEAN DEFAULT FALSE;
          END IF;
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'admin_stories' AND column_name = 'product_id'
          ) THEN
            ALTER TABLE admin_stories ADD COLUMN product_id VARCHAR(64);
          END IF;
        END $$;
      `);
      console.log('[PostgreSQL] Extended tables verified and ready.');
    } catch (err: any) {
      console.warn('[PostgreSQL] Extended tables initialization warning:', err?.message || err);
    }
  }
  initExtendedTables();

  // Helper: In-memory fallback stores if database pool is unavailable
  const memoryConversations = new Map<string, any>();
  const memoryMessages = new Map<string, any[]>();
  const memoryNotifications = new Map<string, any[]>();
  const memoryStories = new Map<string, any>();
  const memoryPromotions = new Map<string, any>();
  const memoryProductDrafts = new Map<string, any>();
  const memoryCampaignDrafts = new Map<string, any>();
  const memoryCommercialPromotions = new Map<string, any>();
  const memoryBlockedUsers = new Set<string>();

  const STORIES_FILE_PATH = path.join(process.cwd(), 'data', 'admin_stories.json');

  function saveStoriesToDisk() {
    try {
      const dataDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const arr = Array.from(memoryStories.values());
      fs.writeFileSync(STORIES_FILE_PATH, JSON.stringify(arr, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[Stories] Failed to save stories to disk:', err);
    }
  }

  function loadStoriesFromDisk(): any[] {
    try {
      if (fs.existsSync(STORIES_FILE_PATH)) {
        const raw = fs.readFileSync(STORIES_FILE_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (err) {
      console.warn('[Stories] Failed to load stories from disk:', err);
    }
    return [];
  }

  // Load real admin stories from disk without any default/dummy mock seeding
  const diskStories = loadStoriesFromDisk();
  diskStories.forEach(s => {
    // Purge any legacy dummy mock stories
    if (s && s.id && !['story_honey_1', 'story_dates_2', 'story_tea_3', 'story_kebab_4', 'story_wholesale_5'].includes(String(s.id))) {
      memoryStories.set(String(s.id), s);
    }
  });
  saveStoriesToDisk();

  // If DB is connected, purge any legacy dummy mock stories as well
  if (pool) {
    pool.query(
      `DELETE FROM admin_stories WHERE id LIKE 'story_honey%' OR id LIKE 'story_dates%' OR id LIKE 'story_tea%' OR id LIKE 'story_kebab%' OR id LIKE 'story_wholesale%'`
    ).catch(() => {});
  }

  // Helper: Resolve canonical user ID (mapping merchantStoreId to userId if known)
  function resolveCanonicalUserId(idOrPhone: string): string {
    if (!idOrPhone) return idOrPhone;
    const initM = INITIAL_MERCHANTS.find(m => m.id === idOrPhone || m.userId === idOrPhone);
    if (initM?.userId) return initM.userId;
    if (serverUsers) {
      for (const u of serverUsers.values()) {
        if (u.merchantStoreId === idOrPhone && u.id) return u.id;
        if (u.id === idOrPhone) return u.id;
      }
    }
    return idOrPhone;
  }

  // -------------------------------------------------------------------------
  // Helper: Real-time User Presence & Activity Tracker (ms timestamp)
  // Dynamic Real-Time Presence: strictly evaluates (< 2 minutes) for "متصل الآن"
  // -------------------------------------------------------------------------
  const userPresenceMap = new Map<string, number>();

  // Seed realistic differentiated timestamps for initial users & merchants
  // Prevents everyone from looking permanently online with a fake boolean
  const nowMs = Date.now();
  userPresenceMap.set('usr_admin', nowMs - 35 * 1000); // 35s ago (Online < 2 min)
  userPresenceMap.set(ADMIN_PHONE_E164, nowMs - 35 * 1000);
  userPresenceMap.set('07862214922', nowMs - 35 * 1000);
  userPresenceMap.set('usr_merch_1', nowMs - 7 * 60 * 1000); // 7 mins ago
  userPresenceMap.set('merch_dates_1', nowMs - 7 * 60 * 1000);
  userPresenceMap.set('usr_merch_2', nowMs - 38 * 60 * 1000); // 38 mins ago
  userPresenceMap.set('merch_perfume_2', nowMs - 38 * 60 * 1000);
  userPresenceMap.set('usr_merch_3', nowMs - 145 * 60 * 1000); // 2 hours 25 mins ago
  userPresenceMap.set('merch_electronics_3', nowMs - 145 * 60 * 1000);
  userPresenceMap.set('usr_customer_1', nowMs - 18 * 60 * 1000); // 18 mins ago
  userPresenceMap.set('usr_customer_2', nowMs - 55 * 1000); // 55s ago (Online)

  function recordUserPresence(userIdOrPhone?: string, ts = Date.now()): number {
    if (!userIdOrPhone) return ts;
    const canId = resolveCanonicalUserId(userIdOrPhone);
    userPresenceMap.set(userIdOrPhone, ts);
    if (canId) userPresenceMap.set(canId, ts);
    const initM = INITIAL_MERCHANTS.find(
      m => m.id === userIdOrPhone || m.userId === userIdOrPhone || m.id === canId || m.userId === canId
    );
    if (initM) {
      userPresenceMap.set(initM.id, ts);
      if (initM.userId) userPresenceMap.set(initM.userId, ts);
      if (initM.phone) userPresenceMap.set(initM.phone, ts);
    }
    return ts;
  }

  function getUserPresence(userIdOrPhone?: string): number {
    if (!userIdOrPhone) return 0;
    const canId = resolveCanonicalUserId(userIdOrPhone);
    let ts = userPresenceMap.get(userIdOrPhone) || (canId ? userPresenceMap.get(canId) : 0) || 0;
    if (!ts) {
      const initM = INITIAL_MERCHANTS.find(
        m => m.id === userIdOrPhone || m.userId === userIdOrPhone || m.phone === userIdOrPhone
      );
      if (initM) {
        ts = userPresenceMap.get(initM.id) || (initM.userId ? userPresenceMap.get(initM.userId) : 0) || 0;
      }
    }
    // Realistic fallback if never interacted yet: 2.5 hours ago
    if (!ts) {
      ts = Date.now() - 150 * 60 * 1000;
      userPresenceMap.set(userIdOrPhone, ts);
    }
    return ts;
  }

  // Helper: Resolve true identity (display name, avatar, role) for users and merchants
  async function getUserIdentity(userIdOrPhone: string): Promise<{ name: string; avatar?: string; role: string }> {
    if (!userIdOrPhone) return { name: 'زبون دكانة', role: 'customer' };

    // Master Admin check
    if (
      userIdOrPhone === 'usr_admin' ||
      userIdOrPhone === ADMIN_PHONE_E164 ||
      userIdOrPhone === '07862214922' ||
      userIdOrPhone.replace(/\D/g, '').endsWith('7862214922')
    ) {
      return {
        name: 'إدارة منصة دكانة',
        avatar: undefined,
        role: 'admin',
      };
    }

    // 1. Check INITIAL_MERCHANTS directory (by store id, user id, or phone)
    const initM = INITIAL_MERCHANTS.find(
      m => m.id === userIdOrPhone || m.userId === userIdOrPhone || m.phone === userIdOrPhone
    );
    if (initM) {
      return {
        name: initM.storeName,
        avatar: (initM as any).logoUrl || (initM as any).coverUrl,
        role: 'merchant',
      };
    }

    // 2. Check INITIAL_USERS directory
    const initU = INITIAL_USERS.find(
      u => u.id === userIdOrPhone || u.phone === userIdOrPhone
    );
    if (initU && initU.displayName && initU.displayName !== 'مستخدم دكانة') {
      return {
        name: initU.displayName,
        avatar: initU.avatarUrl,
        role: initU.role || 'customer',
      };
    }

    // 3. Check in-memory serverUsers map if provided
    if (serverUsers) {
      const fromMap =
        serverUsers.get(userIdOrPhone) ||
        Array.from(serverUsers.values()).find(
          u => u.id === userIdOrPhone || u.phone === userIdOrPhone || u.merchantStoreId === userIdOrPhone
        );
      if (fromMap) {
        if (fromMap.role === 'admin') {
          return { name: fromMap.displayName || 'إدارة منصة دكانة', avatar: fromMap.avatarUrl, role: 'admin' };
        }
        if (fromMap.role === 'merchant') {
          return {
            name: fromMap.storeName || fromMap.displayName || 'متجر معتمد في دكانة',
            avatar: fromMap.avatarUrl,
            role: 'merchant',
          };
        }
        return {
          name: (fromMap.displayName && fromMap.displayName !== 'مستخدم دكانة')
            ? fromMap.displayName
            : (fromMap.phone || 'زبون دكانة'),
          avatar: fromMap.avatarUrl,
          role: 'customer',
        };
      }
    }

    // 4. Query Neon PostgreSQL if pool is active
    if (pool) {
      try {
        const uRes = await pool.query(
          `SELECT u.id, u.display_name, u.avatar_url, u.role, u.phone, m.store_name
           FROM users u
           LEFT JOIN merchants m ON m.user_id = u.id OR m.phone = u.phone
           WHERE u.id = $1 OR u.phone = $1
           LIMIT 1`,
          [userIdOrPhone]
        );
        if (uRes.rows.length > 0) {
          const row = uRes.rows[0];
          if (row.role === 'admin') {
            return { name: 'إدارة منصة دكانة', avatar: row.avatar_url, role: 'admin' };
          }
          if (row.role === 'merchant') {
            return {
              name: row.store_name || row.display_name || 'متجر معتمد في دكانة',
              avatar: row.avatar_url,
              role: 'merchant',
            };
          }
          return {
            name: (row.display_name && row.display_name !== 'مستخدم دكانة')
              ? row.display_name
              : (row.phone || 'زبون دكانة'),
            avatar: row.avatar_url,
            role: row.role || 'customer',
          };
        }

        // Direct check on merchants table
        const mRes = await pool.query(
          `SELECT id, store_name, phone FROM merchants WHERE id = $1 OR user_id = $1 LIMIT 1`,
          [userIdOrPhone]
        );
        if (mRes.rows.length > 0) {
          return {
            name: mRes.rows[0].store_name || 'متجر معتمد في دكانة',
            role: 'merchant',
          };
        }
      } catch (err: any) {
        console.warn('Identity query notice:', err?.message || err);
      }
    }

    if (userIdOrPhone.startsWith('merch_')) {
      return { name: 'متجر معتمد في دكانة', role: 'merchant' };
    }

    return {
      name: (userIdOrPhone.startsWith('07') || userIdOrPhone.startsWith('+964')) ? userIdOrPhone : 'زبون دكانة',
      role: 'customer',
    };
  }

  async function enrichConversation(c: any): Promise<any> {
    if (!c) return c;
    const p1 = await getUserIdentity(c.participant1_id);
    const p2 = await getUserIdentity(c.participant2_id);

    const isGenericP1 = !c.participant1_name || c.participant1_name === 'مستخدم دكانة';
    const isGenericP2 = !c.participant2_name || c.participant2_name === 'مستخدم دكانة';

    const p1LastActive = getUserPresence(c.participant1_id);
    const p2LastActive = getUserPresence(c.participant2_id);

    return {
      ...c,
      participant1_name: (!isGenericP1 ? c.participant1_name : '') || p1.name,
      participant2_name: (!isGenericP2 ? c.participant2_name : '') || p2.name,
      participant1_avatar: c.participant1_avatar || p1.avatar,
      participant2_avatar: c.participant2_avatar || p2.avatar,
      participant1_role: c.participant1_role || p1.role,
      participant2_role: c.participant2_role || p2.role,
      participant1_last_active: p1LastActive,
      participant2_last_active: p2LastActive,
      counterpart_last_active: p2LastActive,
    };
  }

  async function enrichMessage(m: any): Promise<any> {
    if (!m) return m;
    let senderName = m.sender_name;
    let senderAvatar = m.sender_avatar;
    let senderRole = m.sender_role;

    if (!senderName || senderName === 'مستخدم دكانة' || !senderAvatar) {
      const iden = await getUserIdentity(m.sender_id);
      if (!senderName || senderName === 'مستخدم دكانة') senderName = iden.name;
      senderAvatar = senderAvatar || iden.avatar;
      senderRole = senderRole || iden.role;
    }

    const isRead = Boolean(m.is_read || m.isRead);
    const status = isRead ? 'read' : (m.status || 'delivered');

    return {
      ...m,
      sender_name: senderName,
      sender_avatar: senderAvatar,
      sender_role: senderRole,
      is_read: isRead,
      status,
    };
  }

  // Helper: Strictly verify admin authorization via active server session
  function isCallerAdmin(req: Request): boolean {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;
    const token = bearerToken || (typeof req.body?.token === 'string' ? req.body.token.trim() : null) || (typeof req.query?.token === 'string' ? (req.query.token as string).trim() : null);

    if (!token) return false;
    const session = serverSessions.get(token);
    if (!session || session.expiresAt <= Date.now()) return false;
    return session.role === 'admin' || session.phone === ADMIN_PHONE_E164;
  }

  // ==========================================
  // 2. Chat Endpoints
  // ==========================================
  app.get('/api/chat/conversations', async (req: Request, res: Response) => {
    const rawUserId = req.query.userId as string;
    if (!rawUserId) {
      return res.status(400).json({ error: 'userId parameter is required' });
    }

    const canUserId = resolveCanonicalUserId(rawUserId);
    recordUserPresence(rawUserId);
    const aliases = new Set<string>([rawUserId, canUserId]);
    const initM = INITIAL_MERCHANTS.find(
      m => m.id === rawUserId || m.userId === rawUserId || m.id === canUserId || m.userId === canUserId
    );
    if (initM) {
      aliases.add(initM.id);
      aliases.add(initM.userId);
    }
    if (serverUsers) {
      for (const u of serverUsers.values()) {
        if (
          u.id === rawUserId ||
          u.id === canUserId ||
          u.merchantStoreId === rawUserId ||
          u.merchantStoreId === canUserId ||
          u.phone === rawUserId
        ) {
          if (u.id) aliases.add(u.id);
          if (u.merchantStoreId) aliases.add(u.merchantStoreId);
          if (u.phone) aliases.add(u.phone);
        }
      }
    }
    const aliasArr = Array.from(aliases);

    let rows: any[] = [];
    if (pool) {
      try {
        const queryRes = await pool.query(
          `SELECT * FROM conversations
           WHERE participant1_id = ANY($1::varchar[]) OR participant2_id = ANY($1::varchar[])
           ORDER BY last_message_time DESC`,
          [aliasArr]
        );
        rows = queryRes.rows;
      } catch (err: any) {
        console.warn('Error querying conversations:', err.message);
      }
    }

    if (rows.length === 0) {
      rows = Array.from(memoryConversations.values()).filter(
        c => aliases.has(c.participant1_id) || aliases.has(c.participant2_id)
      );
    }

    // Enrich all conversations with true sender names, avatars and real-time presence
    const enriched = await Promise.all(rows.map(enrichConversation));
    const finalConversations = enriched.map(c => {
      const isViewerP1 = aliases.has(c.participant1_id);
      const counterpartId = isViewerP1 ? c.participant2_id : c.participant1_id;
      const counterpartLastActive = getUserPresence(counterpartId);
      return {
        ...c,
        counterpart_last_active: counterpartLastActive,
        counterpartLastActive,
      };
    });
    res.json({ conversations: finalConversations });
  });

  app.post('/api/chat/conversations', async (req: Request, res: Response) => {
    const {
      participant1Id,
      participant2Id,
      participant1Role = 'customer',
      participant2Role = 'merchant',
      participant1Name,
      participant2Name,
      participant1Avatar,
      participant2Avatar,
      entityType = 'general',
      entityId,
      initialMessage,
    } = req.body;

    if (!participant1Id || !participant2Id) {
      return res.status(400).json({ error: 'Participants are required' });
    }

    // Resolve canonical user IDs so that User A <-> User B always map to exactly ONE persistent room!
    const canP1 = resolveCanonicalUserId(participant1Id);
    const canP2 = resolveCanonicalUserId(participant2Id);
    const sorted = [canP1, canP2].sort();
    const convId = `conv_${sorted[0]}_${sorted[1]}`;

    // Look up identities, prioritizing client-supplied names when valid
    const p1Resolved = await getUserIdentity(canP1);
    const p2Resolved = await getUserIdentity(canP2);

    const p1Name = (participant1Name && participant1Name !== 'مستخدم دكانة') ? participant1Name : p1Resolved.name;
    const p2Name = (participant2Name && participant2Name !== 'مستخدم دكانة') ? participant2Name : p2Resolved.name;
    const p1Avatar = participant1Avatar || p1Resolved.avatar || null;
    const p2Avatar = participant2Avatar || p2Resolved.avatar || null;

    let conversation: any = null;
    if (pool) {
      try {
        const existing = await pool.query('SELECT * FROM conversations WHERE id = $1', [convId]);
        if (existing.rows.length > 0) {
          conversation = existing.rows[0];
          // If previous names were empty or generic, update them with the real discovered identities
          const updateP1 = (!conversation.participant1_name || conversation.participant1_name === 'مستخدم دكانة') && p1Name;
          const updateP2 = (!conversation.participant2_name || conversation.participant2_name === 'مستخدم دكانة') && p2Name;
          if (updateP1 || updateP2) {
            await pool.query(
              `UPDATE conversations
               SET participant1_name = COALESCE($1, participant1_name),
                   participant2_name = COALESCE($2, participant2_name),
                   participant1_avatar = COALESCE($3, participant1_avatar),
                   participant2_avatar = COALESCE($4, participant2_avatar),
                   updated_at = NOW()
               WHERE id = $5`,
              [p1Name, p2Name, p1Avatar, p2Avatar, convId]
            );
            conversation.participant1_name = p1Name;
            conversation.participant2_name = p2Name;
          }
        } else {
          const insertRes = await pool.query(
            `INSERT INTO conversations
             (id, participant1_id, participant2_id, participant1_name, participant2_name, participant1_avatar, participant2_avatar, participant1_role, participant2_role, entity_type, entity_id, last_message_text, last_message_time, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
             RETURNING *`,
            [
              convId,
              canP1,
              canP2,
              p1Name,
              p2Name,
              p1Avatar,
              p2Avatar,
              p1Resolved.role || participant1Role,
              p2Resolved.role || participant2Role,
              entityType,
              entityId || null,
              initialMessage || 'بدأت المحادثة',
            ]
          );
          conversation = insertRes.rows[0];
        }
      } catch (err: any) {
        console.warn('DB conversation insert fallback:', err.message);
      }
    }

    if (!conversation) {
      conversation = memoryConversations.get(convId) || {
        id: convId,
        participant1_id: canP1,
        participant2_id: canP2,
        participant1_name: p1Name,
        participant2_name: p2Name,
        participant1_avatar: p1Avatar,
        participant2_avatar: p2Avatar,
        participant1_role: p1Resolved.role || participant1Role,
        participant2_role: p2Resolved.role || participant2Role,
        entity_type: entityType,
        entity_id: entityId,
        last_message_text: initialMessage || 'بدأت المحادثة',
        last_message_time: new Date().toISOString(),
      };
      if (p1Name && (!conversation.participant1_name || conversation.participant1_name === 'مستخدم دكانة')) {
        conversation.participant1_name = p1Name;
      }
      if (p2Name && (!conversation.participant2_name || conversation.participant2_name === 'مستخدم دكانة')) {
        conversation.participant2_name = p2Name;
      }
      memoryConversations.set(convId, conversation);
    }

    const fullyEnriched = await enrichConversation(conversation);
    res.json({ conversation: fullyEnriched });
  });

  app.get('/api/chat/messages/:conversationId', async (req: Request, res: Response) => {
    const { conversationId } = req.params;
    const userId = req.query.userId as string;

    let rawMessages: any[] = [];
    let dbConv: any = null;

    if (pool) {
      try {
        const convRes = await pool.query('SELECT * FROM conversations WHERE id = $1', [conversationId]);
        if (convRes.rows.length === 0) {
          return res.status(404).json({ error: 'Conversation not found' });
        }
        dbConv = convRes.rows[0];
        const canViewerId = userId ? resolveCanonicalUserId(userId) : '';
        const isViewerParticipant = !userId || (
          dbConv.participant1_id === userId ||
          dbConv.participant2_id === userId ||
          dbConv.participant1_id === canViewerId ||
          dbConv.participant2_id === canViewerId
        );
        if (!isViewerParticipant) {
          return res.status(403).json({ error: 'غير مصرح بالاطلاع على هذه المحادثة' });
        }

        // Requirement 5: Read Receipts - when recipient is viewing messages, mark incoming messages as READ
        if (userId) {
          await pool.query(
            `UPDATE chat_messages 
             SET is_read = TRUE, status = 'read' 
             WHERE conversation_id = $1 AND sender_id != $2`,
            [conversationId, userId]
          );

          // Reset unread counts on conversation for this viewer
          if (dbConv.participant1_id === userId) {
            await pool.query('UPDATE conversations SET unread_count_p1 = 0 WHERE id = $1', [conversationId]);
          } else {
            await pool.query('UPDATE conversations SET unread_count_p2 = 0 WHERE id = $1', [conversationId]);
          }
        }

        const messagesRes = await pool.query(
          'SELECT * FROM chat_messages WHERE conversation_id = $1 ORDER BY created_at ASC',
          [conversationId]
        );
        rawMessages = messagesRes.rows;
      } catch (err: any) {
        console.warn('Error fetching messages from DB:', err.message);
      }
    }

    if (rawMessages.length === 0) {
      const memList = memoryMessages.get(conversationId) || [];
      if (userId) {
        memList.forEach(m => {
          if (m.sender_id !== userId) {
            m.is_read = true;
            m.status = 'read';
          }
        });
      }
      rawMessages = memList;
    }

    if (userId) {
      recordUserPresence(userId);
    }

    let counterpartId = '';
    if (dbConv) {
      counterpartId = dbConv.participant1_id === userId ? dbConv.participant2_id : dbConv.participant1_id;
    } else {
      const memConv = memoryConversations.get(conversationId);
      if (memConv) {
        counterpartId = memConv.participant1_id === userId ? memConv.participant2_id : memConv.participant1_id;
      }
    }
    const counterpartLastActive = counterpartId ? getUserPresence(counterpartId) : 0;
    const isCounterpartOnline = counterpartLastActive ? (Date.now() - counterpartLastActive) < 120000 : false;

    const enriched = await Promise.all(rawMessages.map(enrichMessage));
    res.json({
      messages: enriched,
      counterpartId,
      counterpartLastActive,
      isCounterpartOnline,
    });
  });

  app.post('/api/chat/messages', async (req: Request, res: Response) => {
    const {
      conversationId,
      senderId,
      senderRole = 'customer',
      text,
      mediaUrl,
      mediaType,
      productId,
      orderId,
    } = req.body;

    if (!conversationId || !senderId || (!text && !mediaUrl && !productId)) {
      return res.status(400).json({ error: 'بيانات الرسالة غير مكتملة' });
    }

    recordUserPresence(senderId);

    const messageId = `msg_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const msgText = (text || '').trim();

    // Resolve sender identity for true name and avatar
    const senderIdentity = await getUserIdentity(senderId);

    let createdMessage: any = null;

    if (pool) {
      try {
        const convRes = await pool.query('SELECT * FROM conversations WHERE id = $1', [conversationId]);
        if (convRes.rows.length === 0) {
          return res.status(404).json({ error: 'المحادثة غير موجودة' });
        }
        const conv = convRes.rows[0];
        const canSenderId = resolveCanonicalUserId(senderId);
        const isSenderParticipant = (
          conv.participant1_id === senderId ||
          conv.participant2_id === senderId ||
          conv.participant1_id === canSenderId ||
          conv.participant2_id === canSenderId
        );
        if (!isSenderParticipant) {
          return res.status(403).json({ error: 'غير مصرح بإرسال رسائل في هذه المحادثة' });
        }

        const recipientId = conv.participant1_id === senderId ? conv.participant2_id : conv.participant1_id;
        const blockKey1 = `${recipientId}:${senderId}`;
        const blockKey2 = `${senderId}:${recipientId}`;
        if (memoryBlockedUsers.has(blockKey1) || memoryBlockedUsers.has(blockKey2)) {
          return res.status(403).json({ error: 'لا يمكن إرسال الرسالة نظراً لوجود حظر بين الطرفين.' });
        }

        // Insert message with 'delivered' status initially
        const insertMsg = await pool.query(
          `INSERT INTO chat_messages
           (id, conversation_id, sender_id, sender_name, sender_avatar, sender_role, text, media_url, media_type, product_id, order_id, status, is_read, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'delivered', FALSE, NOW())
           RETURNING *`,
          [
            messageId,
            conversationId,
            senderId,
            senderIdentity.name,
            senderIdentity.avatar || null,
            senderIdentity.role || senderRole,
            msgText,
            mediaUrl || null,
            mediaType || null,
            productId || null,
            orderId || null,
          ]
        );
        createdMessage = insertMsg.rows[0];

        // Update conversation last message & unread count
        const summaryText = msgText || (productId ? 'تمت مشاركة منتج' : mediaUrl ? 'ملف مرفق' : 'رسالة جديدة');
        const isP1 = conv.participant1_id === senderId;
        const unreadCol = isP1 ? 'unread_count_p2' : 'unread_count_p1';

        await pool.query(
          `UPDATE conversations
           SET last_message_text = $1, 
               last_message_time = NOW(), 
               updated_at = NOW(),
               ${unreadCol} = COALESCE(${unreadCol}, 0) + 1
           WHERE id = $2`,
          [summaryText, conversationId]
        );

        // Notify recipient with actual sender's name and conversationId as entity_id for deep linking
        const notifId = `notif_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const notifTitle = `رسالة جديدة من ${senderIdentity.name}`;

        await pool.query(
          `INSERT INTO notifications
           (id, recipient_id, recipient_role, title, message, type, entity_id, is_read, created_at)
           VALUES ($1, $2, $3, $4, $5, 'chat', $6, FALSE, NOW())`,
          [notifId, recipientId, senderIdentity.role === 'customer' ? 'merchant' : 'customer', notifTitle, summaryText, conversationId]
        );
      } catch (err: any) {
        console.warn('Error saving chat message to DB:', err.message);
      }
    }

    if (!createdMessage) {
      const conv = memoryConversations.get(conversationId);
      if (conv) {
        const recipientId = conv.participant1_id === senderId ? conv.participant2_id : conv.participant1_id;
        const b1 = `${recipientId}:${senderId}`;
        const b2 = `${senderId}:${recipientId}`;
        if (memoryBlockedUsers.has(b1) || memoryBlockedUsers.has(b2)) {
          return res.status(403).json({ error: 'لا يمكن إرسال الرسالة نظراً لوجود حظر بين الطرفين.' });
        }
      }

      createdMessage = {
        id: messageId,
        conversation_id: conversationId,
        sender_id: senderId,
        sender_name: senderIdentity.name,
        sender_avatar: senderIdentity.avatar,
        sender_role: senderIdentity.role || senderRole,
        text: msgText,
        media_url: mediaUrl,
        media_type: mediaType,
        product_id: productId,
        order_id: orderId,
        status: 'delivered',
        is_read: false,
        created_at: new Date().toISOString(),
      };
      const existing = memoryMessages.get(conversationId) || [];
      existing.push(createdMessage);
      memoryMessages.set(conversationId, existing);

      // Memory notification for recipient
      if (conv) {
        const recipientId = conv.participant1_id === senderId ? conv.participant2_id : conv.participant1_id;
        const notifItem = {
          id: `notif_${Date.now()}`,
          recipient_id: recipientId,
          recipient_role: senderIdentity.role === 'customer' ? 'merchant' : 'customer',
          title: `رسالة جديدة من ${senderIdentity.name}`,
          message: msgText || 'رسالة جديدة',
          type: 'chat',
          entity_id: conversationId,
          is_read: false,
          created_at: new Date().toISOString(),
        };
        const uNotifs = memoryNotifications.get(recipientId) || [];
        uNotifs.unshift(notifItem);
        memoryNotifications.set(recipientId, uNotifs);
      }
    }

    const fullyEnrichedMsg = await enrichMessage(createdMessage);
    res.json({ success: true, message: fullyEnrichedMsg });
  });

  app.post('/api/chat/report', async (req: Request, res: Response) => {
    const { conversationId, reporterId, reason } = req.body;
    if (!conversationId || !reporterId || !reason) {
      return res.status(400).json({ error: 'بيانات الإبلاغ غير مكتملة' });
    }

    const reportId = `rep_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    if (pool) {
      try {
        await pool.query(
          `INSERT INTO chat_reports (id, conversation_id, reporter_id, reason, status, created_at)
           VALUES ($1, $2, $3, $4, 'pending', NOW())`,
          [reportId, conversationId, reporterId, reason]
        );
      } catch (err: any) {
        console.warn('DB report insert fallback:', err.message);
      }
    }

    res.json({ success: true, message: 'تم إرسال البلاغ بنجاح إلى إدارة دكانة وسيتم مراجعته.' });
  });

  // UGC Compliance: Block / Unblock User
  app.post('/api/chat/block', async (req: Request, res: Response) => {
    const { userId, blockedUserId, action } = req.body;
    if (!userId || !blockedUserId) {
      return res.status(400).json({ error: 'بيانات الحظر غير مكتملة' });
    }

    const key = `${userId}:${blockedUserId}`;
    let shouldBlock = action === 'block' ? true : action === 'unblock' ? false : !memoryBlockedUsers.has(key);

    if (shouldBlock) {
      memoryBlockedUsers.add(key);
      if (pool) {
        try {
          const check = await pool.query(
            'SELECT id FROM blocked_users WHERE user_id = $1 AND blocked_user_id = $2',
            [userId, blockedUserId]
          );
          if (check.rows.length === 0) {
            const blockId = `blk_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
            await pool.query(
              'INSERT INTO blocked_users (id, user_id, blocked_user_id, created_at) VALUES ($1, $2, $3, NOW())',
              [blockId, userId, blockedUserId]
            );
          }
        } catch (err: any) {
          console.warn('DB block user fallback:', err.message);
        }
      }
    } else {
      memoryBlockedUsers.delete(key);
      if (pool) {
        try {
          await pool.query(
            'DELETE FROM blocked_users WHERE user_id = $1 AND blocked_user_id = $2',
            [userId, blockedUserId]
          );
        } catch (err: any) {
          console.warn('DB unblock user fallback:', err.message);
        }
      }
    }

    res.json({
      success: true,
      isBlocked: shouldBlock,
      message: shouldBlock
        ? 'تم حظر المستخدم بنجاح. لن تتمكن من استلام أي رسائل منه ولن يتمكن من مراسلتك.'
        : 'تم إلغاء حظر هذا المستخدم بنجاح.',
    });
  });

  // UGC Compliance: Get Blocked Users List
  app.get('/api/chat/blocked-users', async (req: Request, res: Response) => {
    const userId = req.query.userId as string;
    if (!userId) {
      return res.json({ blockedUserIds: [] });
    }

    let blockedIds: string[] = [];
    if (pool) {
      try {
        const resList = await pool.query(
          'SELECT blocked_user_id FROM blocked_users WHERE user_id = $1',
          [userId]
        );
        blockedIds = resList.rows.map(r => r.blocked_user_id);
      } catch (err: any) {
        console.warn('DB blocked-users query fallback:', err.message);
      }
    }

    if (blockedIds.length === 0) {
      Array.from(memoryBlockedUsers).forEach(k => {
        const [uId, bId] = k.split(':');
        if (uId === userId && bId) blockedIds.push(bId);
      });
    }

    res.json({ blockedUserIds: blockedIds });
  });

  // ==========================================
  // Real-Time Dynamic User Presence Endpoints
  // Threshold: < 2 minutes (120,000 ms) is strictly required for "متصل الآن"
  // ==========================================
  app.post('/api/user/presence', (req: Request, res: Response) => {
    const { userId, phone, timestamp } = req.body || {};
    const ts = typeof timestamp === 'number' ? timestamp : Date.now();
    if (userId) recordUserPresence(userId, ts);
    if (phone) recordUserPresence(phone, ts);
    res.json({ success: true, timestamp: ts, isOnline: true });
  });

  // Requirement 2: Terminate All Sessions Endpoint
  app.post('/api/auth/terminate-all-sessions', async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const currentToken = bearerToken || req.body?.token;
    const userId = req.body?.userId || (req.headers['x-user-id'] as string);
    const phone = req.body?.phone || (req.headers['x-user-phone'] as string);

    if (pool && (userId || phone || currentToken)) {
      try {
        await pool.query(
          'DELETE FROM user_sessions WHERE user_id = $1 OR phone = $2 OR token = $3',
          [userId || '', phone || '', currentToken || '']
        ).catch(() => {});
      } catch (err) {
        console.warn('DB session cleanup error in features:', err);
      }
    }

    res.json({
      success: true,
      message: 'تم إنهاء كافة الجلسات بنجاح، يرجى تسجيل الدخول مجدداً',
    });
  });

  app.get('/api/user/presence', (req: Request, res: Response) => {
    const rawIds = (req.query.userIds as string) || (req.query.userId as string) || '';
    const idList = rawIds.split(',').map(s => s.trim()).filter(Boolean);
    const now = Date.now();
    const presenceMap: Record<string, any> = {};

    for (const uid of idList) {
      const lastActive = getUserPresence(uid);
      const diffMs = Math.max(0, now - lastActive);
      const isOnline = diffMs < 2 * 60 * 1000; // Strictly < 2 minutes
      presenceMap[uid] = {
        lastActiveTimestamp: lastActive,
        diffMs,
        diffMinutes: Math.floor(diffMs / 60000),
        isOnline,
      };
    }

    res.json({ success: true, presence: presenceMap });
  });

  // Helper to gather all alias IDs for a user/merchant (multi-tenant mapping)
  function getUserAliases(rawId: string): string[] {
    const keys = new Set<string>([rawId]);
    const canId = resolveCanonicalUserId(rawId);
    if (canId) keys.add(canId);
    const m = INITIAL_MERCHANTS.find(
      mer => mer.id === rawId || mer.userId === rawId || mer.id === canId || mer.userId === canId
    );
    if (m) {
      if (m.id) keys.add(m.id);
      if (m.userId) keys.add(m.userId);
    }
    if (serverUsers) {
      for (const u of serverUsers.values()) {
        if (u.id === rawId || u.merchantStoreId === rawId || u.phone === rawId) {
          if (u.id) keys.add(u.id);
          if (u.merchantStoreId) keys.add(u.merchantStoreId);
        }
      }
    }
    return Array.from(keys);
  }

  // ==========================================
  // 3. Notifications & Broadcast Endpoints
  // ==========================================
  app.get('/api/notifications', async (req: Request, res: Response) => {
    const rawUserId = req.query.userId as string;
    if (!rawUserId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const aliases = getUserAliases(rawUserId);

    if (pool) {
      try {
        const notifs = await pool.query(
          `SELECT * FROM notifications
           WHERE recipient_id = ANY($1::text[])
              OR (is_broadcast = TRUE AND (recipient_id = '__broadcast__' OR recipient_id = 'all' OR recipient_id IS NULL))
           ORDER BY created_at DESC LIMIT 100`,
          [aliases]
        );

        // Deduplicate: If an admin broadcast was sent, guarantee only ONE notification per broadcast group/title
        const cleanNotifs: any[] = [];
        const seenKeys = new Set<string>();
        for (const n of notifs.rows) {
          const key = n.type === 'broadcast' || n.is_broadcast
            ? (n.entity_id ? `bcast_${n.entity_id}` : `bcast_${n.title}_${n.message}`)
            : n.id;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            cleanNotifs.push(n);
          }
        }
        return res.json({ notifications: cleanNotifs });
      } catch (err: any) {
        console.warn('Error querying notifications from DB:', err.message);
      }
    }

    // From memory: gather from all aliases, deduplicate
    const combined: any[] = [];
    const seenKeys = new Set<string>();
    for (const key of aliases) {
      const list = memoryNotifications.get(key) || [];
      for (const item of list) {
        const dedupKey = item.type === 'broadcast' || item.is_broadcast
          ? (item.entity_id ? `bcast_${item.entity_id}` : `bcast_${item.title}_${item.message}`)
          : item.id;
        if (!seenKeys.has(dedupKey)) {
          seenKeys.add(dedupKey);
          combined.push(item);
        }
      }
    }

    // Also include broadcast notifications
    const bcastList = memoryNotifications.get('__broadcast__') || [];
    for (const item of bcastList) {
      const dedupKey = item.entity_id ? `bcast_${item.entity_id}` : `bcast_${item.title}_${item.message}`;
      if (!seenKeys.has(dedupKey)) {
        seenKeys.add(dedupKey);
        combined.push(item);
      }
    }

    combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    res.json({ notifications: combined });
  });

  // API: Create / Dispatch Notification (Supports order alerts for merchant & customer)
  app.post('/api/notifications', async (req: Request, res: Response) => {
    const { recipientId, recipientRole, title, message, type = 'system', entityId } = req.body;
    if (!recipientId || !title || !message) {
      return res.status(400).json({ error: 'recipientId, title and message are required' });
    }

    const notifId = `notif_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const newNotif = {
      id: notifId,
      recipient_id: recipientId,
      recipient_role: recipientRole || 'customer',
      title,
      message,
      type,
      entity_id: entityId || null,
      is_read: false,
      is_broadcast: false,
      created_at: new Date().toISOString(),
    };

    if (pool) {
      try {
        await pool.query(
          `INSERT INTO notifications (id, recipient_id, recipient_role, title, message, type, entity_id, is_read, is_broadcast, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE, FALSE, NOW())`,
          [notifId, recipientId, newNotif.recipient_role, title, message, type, entityId || null]
        );
      } catch (err: any) {
        console.warn('Error inserting notification to DB:', err.message);
      }
    }

    const aliases = getUserAliases(recipientId);
    for (const key of aliases) {
      const existing = memoryNotifications.get(key) || [];
      memoryNotifications.set(key, [newNotif, ...existing]);
    }

    res.json({ success: true, notification: newNotif });
  });

  // Requirement 3: Read Status Logic - Mark single notification as read
  app.put('/api/notifications/:id/read', async (req: Request, res: Response) => {
    const { id } = req.params;
    if (pool) {
      try {
        await pool.query('UPDATE notifications SET is_read = TRUE WHERE id = $1', [id]);
      } catch (err: any) {
        console.warn('Error marking notification read in DB:', err.message);
      }
    }

    for (const list of memoryNotifications.values()) {
      const item = list.find((n: any) => n.id === id);
      if (item) item.is_read = true;
    }

    res.json({ success: true, id });
  });

  // Requirement 3: Mark ALL notifications as read for user
  app.put(['/api/notifications/read-all', '/api/notifications/mark-all-read'], async (req: Request, res: Response) => {
    const userId = req.body?.userId || req.query?.userId;
    if (userId) {
      const aliases = getUserAliases(String(userId));
      if (pool) {
        try {
          await pool.query(
            'UPDATE notifications SET is_read = TRUE WHERE recipient_id = ANY($1::text[])',
            [aliases]
          );
        } catch (err: any) {
          console.warn('Error marking all notifications read in DB:', err.message);
        }
      }
      for (const a of aliases) {
        const list = memoryNotifications.get(a);
        if (list) {
          list.forEach((n: any) => (n.is_read = true));
        }
      }
    }
    res.json({ success: true });
  });

  // Generic read endpoint supporting both single ID or all
  app.put('/api/notifications/read', async (req: Request, res: Response) => {
    const { userId, notificationId } = req.body;
    if (!userId && !notificationId) {
      return res.status(400).json({ error: 'Missing parameters' });
    }

    if (pool) {
      try {
        if (notificationId) {
          await pool.query('UPDATE notifications SET is_read = TRUE WHERE id = $1', [notificationId]);
        } else if (userId) {
          const aliases = getUserAliases(String(userId));
          await pool.query('UPDATE notifications SET is_read = TRUE WHERE recipient_id = ANY($1::text[])', [aliases]);
        }
      } catch (err: any) {
        console.warn('Error updating notification read status:', err.message);
      }
    }

    if (notificationId) {
      for (const list of memoryNotifications.values()) {
        const item = list.find((n: any) => n.id === notificationId);
        if (item) item.is_read = true;
      }
    } else if (userId) {
      const aliases = getUserAliases(String(userId));
      for (const a of aliases) {
        const list = memoryNotifications.get(a);
        if (list) {
          list.forEach((n: any) => (n.is_read = true));
        }
      }
    }

    res.json({ success: true });
  });

  // Delete notification
  app.delete('/api/notifications/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    if (pool) {
      try {
        await pool.query('DELETE FROM notifications WHERE id = $1', [id]);
      } catch (err: any) {
        console.warn('Error deleting notification from DB:', err.message);
      }
    }

    for (const [key, list] of memoryNotifications.entries()) {
      memoryNotifications.set(key, list.filter((n: any) => n.id !== id));
    }

    res.json({ success: true });
  });

  // Admin Broadcast Notification
  app.post('/api/admin/broadcast-notification', async (req: Request, res: Response) => {
    if (!isCallerAdmin(req)) {
      return res.status(403).json({ error: 'غير مصرح: هذه العملية محصورة بمدير دكانة العام' });
    }

    const { title, message, targetAudience = 'all' } = req.body;
    if (!title || !message) {
      return res.status(400).json({ error: 'العنوان ومحتوى الإشعار مطلوبان' });
    }

    const cleanTitle = title.trim();
    const cleanMessage = message.trim();
    const broadcastGroupId = `bcast_${Date.now()}`;
    const nowIso = new Date().toISOString();

    const targetUsers: { id: string; role: string }[] = [];
    const seenUserIds = new Set<string>();

    if (pool) {
      try {
        // Query target users from DB
        let userQuery = 'SELECT id, role FROM users WHERE status = $1';
        const params: any[] = ['active'];
        if (targetAudience === 'customers') {
          userQuery += ' AND role = $2';
          params.push('customer');
        } else if (targetAudience === 'merchants') {
          userQuery += ' AND role = $2';
          params.push('merchant');
        }

        const usersRes = await pool.query(userQuery, params);
        for (const u of usersRes.rows) {
          if (!seenUserIds.has(u.id)) {
            seenUserIds.add(u.id);
            targetUsers.push({ id: u.id, role: u.role || 'customer' });
          }
        }
      } catch (err: any) {
        console.warn('Error querying users for broadcast from DB:', err.message);
      }
    }

    // Also include users from in-memory serverUsers map
    if (serverUsers) {
      for (const u of serverUsers.values()) {
        if (u.status === 'deleted') continue;
        if (targetAudience === 'customers' && u.role !== 'customer') continue;
        if (targetAudience === 'merchants' && u.role !== 'merchant') continue;
        if (!seenUserIds.has(u.id)) {
          seenUserIds.add(u.id);
          targetUsers.push({ id: u.id, role: u.role || 'customer' });
        }
      }
    }

    // Guarantee admin receives the broadcast if audience is 'all'
    if (targetAudience === 'all' && !seenUserIds.has('admin')) {
      targetUsers.push({ id: 'admin', role: 'admin' });
      seenUserIds.add('admin');
    }

    const recipientCount = targetUsers.length || 1;

    // Insert exactly one clean notification per recipient
    for (const u of targetUsers) {
      const nid = `notif_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const notifItem = {
        id: nid,
        recipient_id: u.id,
        recipient_role: u.role,
        title: cleanTitle,
        message: cleanMessage,
        type: 'broadcast',
        entity_id: broadcastGroupId,
        is_read: false,
        is_broadcast: true,
        created_at: nowIso,
      };

      if (pool) {
        try {
          await pool.query(
            `INSERT INTO notifications
             (id, recipient_id, recipient_role, title, message, type, entity_id, is_read, is_broadcast, created_at)
             VALUES ($1, $2, $3, $4, $5, 'broadcast', $6, FALSE, TRUE, NOW())`,
            [nid, u.id, u.role, cleanTitle, cleanMessage, broadcastGroupId]
          );
        } catch (err: any) {
          console.warn('Error inserting broadcast notification row for user:', u.id, err.message);
        }
      }

      // In-memory per-user update
      const existing = memoryNotifications.get(u.id) || [];
      memoryNotifications.set(u.id, [notifItem, ...existing]);
    }

    res.json({
      success: true,
      message: `تم إرسال الإشعار الجماعي بنجاح إلى ${recipientCount} مستخدم.`,
      recipientCount,
      targetAudience,
    });
  });

  // Helper: Normalize story row to standard AdminStory
  function formatStoryRow(r: any) {
    if (!r) return null;
    const cLink = r.cta_link || r.ctaLink || '';
    let pId = r.product_id || r.productId;
    if (!pId && cLink) {
      if (cLink.startsWith('product:')) {
        pId = cLink.replace('product:', '').trim();
      } else if (!cLink.startsWith('http') && !cLink.startsWith('store:')) {
        pId = cLink.trim();
      }
    }
    return {
      id: String(r.id),
      title: r.title,
      mediaUrl: r.media_url || r.mediaUrl,
      mediaType: r.media_type || r.mediaType || 'image',
      ctaText: r.cta_text || r.ctaText || 'تسوّق الآن',
      ctaLink: cLink,
      productId: pId || undefined,
      startDate: r.start_date || r.startDate || new Date().toISOString(),
      endDate: r.end_date || r.endDate,
      isActive: r.is_active !== undefined ? r.is_active : (r.isActive !== undefined ? r.isActive : true),
      viewsCount: Number(r.views_count ?? r.viewsCount ?? 0),
      clicksCount: Number(r.clicks_count ?? r.clicksCount ?? 0),
      sortOrder: Number(r.sort_order ?? r.sortOrder ?? 0),
      createdAt: r.created_at || r.createdAt || new Date().toISOString(),
    };
  }

  // ==========================================
  // 4. Admin Stories Endpoints
  // ==========================================
  app.get('/api/stories', async (req: Request, res: Response) => {
    if (pool) {
      try {
        const stories = await pool.query(
          `SELECT * FROM admin_stories
           WHERE is_active = TRUE AND end_date > NOW()
           ORDER BY sort_order ASC, created_at DESC
           LIMIT 10`
        );
        return res.json({ stories: stories.rows.map(formatStoryRow).filter(Boolean) });
      } catch (err: any) {
        console.warn('Error fetching stories from DB:', err.message);
      }
    }

    const now = Date.now();
    const active = Array.from(memoryStories.values())
      .filter(s => (s.is_active !== false && s.isActive !== false) && new Date(s.end_date || s.endDate).getTime() > now)
      .slice(0, 10)
      .map(formatStoryRow)
      .filter(Boolean);
    res.json({ stories: active });
  });

  // Admin stories management (List all including expired)
  app.get('/api/admin/stories', async (req: Request, res: Response) => {
    if (pool) {
      try {
        const stories = await pool.query(
          `SELECT * FROM admin_stories ORDER BY sort_order ASC, created_at DESC`
        );
        return res.json({ stories: stories.rows.map(formatStoryRow).filter(Boolean) });
      } catch (err: any) {
        console.warn('Error fetching all stories from DB:', err.message);
      }
    }

    res.json({ stories: Array.from(memoryStories.values()).map(formatStoryRow).filter(Boolean) });
  });

  app.post('/api/admin/stories', async (req: Request, res: Response) => {
    const {
      title,
      imageUrl,
      mediaUrl,
      mediaType = 'image',
      ctaText = 'تسوّق الآن',
      ctaLink = '',
      productId,
      durationDays = 14,
      expiresAt,
      endDate,
      startDate = new Date().toISOString(),
      sortOrder = 0,
    } = req.body;

    const effectiveTitle = (title || '').trim();
    const effectiveMediaUrl = (imageUrl || mediaUrl || '').trim();
    const effectiveDuration = Number(durationDays) || 14;
    const effectiveEndDate = expiresAt || endDate || new Date(Date.now() + effectiveDuration * 86400000).toISOString();

    if (!effectiveTitle || !effectiveMediaUrl) {
      return res.status(400).json({ error: 'عنوان الستوري ورابط أو ملف الصورة مطلوبان' });
    }

    // Resolve effective product ID
    let resolvedProductId = (productId || '').trim();
    if (!resolvedProductId && ctaLink?.startsWith('product:')) {
      resolvedProductId = ctaLink.replace('product:', '').trim();
    }
    const effectiveCtaLink = ctaLink || (resolvedProductId ? `product:${resolvedProductId}` : '');

    const storyId = `story_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    let story: any = null;

    if (pool) {
      try {
        const insertRes = await pool.query(
          `INSERT INTO admin_stories
           (id, title, media_url, media_type, cta_text, cta_link, product_id, start_date, end_date, is_active, views_count, clicks_count, sort_order, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, 0, 0, $10, NOW())
           RETURNING *`,
          [storyId, effectiveTitle, effectiveMediaUrl, mediaType, ctaText, effectiveCtaLink, resolvedProductId || null, startDate, effectiveEndDate, Number(sortOrder) || 0]
        );
        story = formatStoryRow(insertRes.rows[0]);
      } catch (err: any) {
        console.warn('Error inserting story in DB with product_id, falling back to legacy query:', err.message);
        try {
          const insertRes = await pool.query(
            `INSERT INTO admin_stories
             (id, title, media_url, media_type, cta_text, cta_link, start_date, end_date, is_active, views_count, clicks_count, sort_order, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, 0, 0, $9, NOW())
             RETURNING *`,
            [storyId, effectiveTitle, effectiveMediaUrl, mediaType, ctaText, effectiveCtaLink, startDate, effectiveEndDate, Number(sortOrder) || 0]
          );
          story = formatStoryRow(insertRes.rows[0]);
        } catch (err2: any) {
          console.warn('Error inserting story fallback:', err2.message);
        }
      }
    }

    if (!story) {
      story = formatStoryRow({
        id: storyId,
        title: effectiveTitle,
        media_url: effectiveMediaUrl,
        media_type: mediaType,
        cta_text: ctaText,
        cta_link: effectiveCtaLink,
        product_id: resolvedProductId || null,
        start_date: startDate,
        end_date: effectiveEndDate,
        is_active: true,
        views_count: 0,
        clicks_count: 0,
        sort_order: Number(sortOrder) || 0,
        created_at: new Date().toISOString(),
      });
    }

    memoryStories.set(storyId, story);
    saveStoriesToDisk();

    res.json({ success: true, story });
  });

  app.put('/api/admin/stories/:id/toggle', async (req: Request, res: Response) => {
    const { id } = req.params;

    if (pool) {
      try {
        const current = await pool.query('SELECT is_active FROM admin_stories WHERE id = $1', [id]);
        if (current.rows.length > 0) {
          const newActive = !current.rows[0].is_active;
          await pool.query('UPDATE admin_stories SET is_active = $1 WHERE id = $2', [newActive, id]);
        }
      } catch (err: any) {
        console.warn('Error toggling story in DB:', err.message);
      }
    }
    const s = memoryStories.get(id);
    if (s) {
      s.is_active = !s.is_active;
      s.isActive = s.is_active;
      saveStoriesToDisk();
    }

    res.json({ success: true, message: 'تم تحديث حالة الستوري بنجاح' });
  });

  app.delete('/api/admin/stories/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'معرف الستوري مطلوب' });
    }

    if (pool) {
      try {
        await pool.query('DELETE FROM admin_stories WHERE id = $1', [id]);
      } catch (err: any) {
        console.warn('Error deleting story from DB:', err.message);
      }
    }
    memoryStories.delete(id);
    saveStoriesToDisk();

    res.json({ success: true, message: 'تم حذف الستوري بنجاح من الواجهة وسيرفر التخزين', id });
  });

  app.post('/api/stories/:id/view', async (req: Request, res: Response) => {
    const { id } = req.params;
    if (pool) {
      try {
        await pool.query('UPDATE admin_stories SET views_count = views_count + 1 WHERE id = $1', [id]);
      } catch {}
    }
    const s = memoryStories.get(id);
    if (s) s.views_count = (s.views_count || 0) + 1;
    res.json({ success: true });
  });

  app.post('/api/stories/:id/click', async (req: Request, res: Response) => {
    const { id } = req.params;
    if (pool) {
      try {
        await pool.query('UPDATE admin_stories SET clicks_count = clicks_count + 1 WHERE id = $1', [id]);
      } catch {}
    }
    const s = memoryStories.get(id);
    if (s) s.clicks_count = (s.clicks_count || 0) + 1;
    res.json({ success: true });
  });

  // ==========================================
  // Product Drafts & Campaign Drafts Endpoints
  // ==========================================
  app.get('/api/drafts/products', async (req: Request, res: Response) => {
    const merchantId = req.query.merchantId as string;
    let list = Array.from(memoryProductDrafts.values());
    if (merchantId) {
      list = list.filter(d => d.merchantId === merchantId);
    }
    res.json({ drafts: list });
  });

  app.post('/api/drafts/products', async (req: Request, res: Response) => {
    const draftData = req.body;
    if (!draftData.name || !draftData.merchantId) {
      return res.status(400).json({ error: 'اسم المنتج ومعرف التاجر مطلوبان لحفظ المسودة' });
    }
    const draftId = draftData.id || `draft_prod_${Date.now()}`;
    const draft = {
      ...draftData,
      id: draftId,
      createdAt: draftData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    memoryProductDrafts.set(draftId, draft);
    res.json({ success: true, draft, message: 'تم حفظ مسودة المنتج بنجاح' });
  });

  app.delete('/api/drafts/products/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    memoryProductDrafts.delete(id);
    res.json({ success: true, message: 'تم حذف مسودة المنتج' });
  });

  app.get('/api/drafts/campaigns', async (req: Request, res: Response) => {
    const merchantId = req.query.merchantId as string;
    let list = Array.from(memoryCampaignDrafts.values());
    if (merchantId) {
      list = list.filter(d => d.merchantId === merchantId);
    }
    res.json({ drafts: list });
  });

  app.post('/api/drafts/campaigns', async (req: Request, res: Response) => {
    const draftData = req.body;
    if (!draftData.productId || !draftData.merchantId) {
      return res.status(400).json({ error: 'معرف المنتج ومعرف التاجر مطلوبان' });
    }
    const draftId = draftData.id || `draft_camp_${Date.now()}`;
    const draft = {
      ...draftData,
      id: draftId,
      createdAt: new Date().toISOString(),
    };
    memoryCampaignDrafts.set(draftId, draft);
    res.json({ success: true, draft, message: 'تم حفظ إعدادات الحملة كمسودة بنجاح' });
  });

  app.delete('/api/drafts/campaigns/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    memoryCampaignDrafts.delete(id);
    res.json({ success: true, message: 'تم حذف مسودة الحملة' });
  });

  // ==========================================
  // Commercial Promotion (Instant Activation & Discount Calculation)
  // Daily rate: 5,000 IQD/day
  // 1-6 days: 0% discount
  // 7-13 days: 15% discount
  // 14+ days: 25% discount
  // ==========================================
  app.get('/api/promotions/commercial', async (req: Request, res: Response) => {
    const merchantId = req.query.merchantId as string;
    let list = Array.from(memoryCommercialPromotions.values());
    if (merchantId) {
      list = list.filter(p => p.merchantId === merchantId);
    }
    if (pool) {
      try {
        const queryText = merchantId
          ? `SELECT pr.*, p.name as db_prod_name, p.image as db_prod_image, m.store_name as db_store_name
             FROM promotion_requests pr
             LEFT JOIN products p ON pr.product_id = p.id
             LEFT JOIN merchants m ON pr.merchant_id = m.id
             WHERE pr.merchant_id = $1
             ORDER BY pr.created_at DESC`
          : `SELECT pr.*, p.name as db_prod_name, p.image as db_prod_image, m.store_name as db_store_name
             FROM promotion_requests pr
             LEFT JOIN products p ON pr.product_id = p.id
             LEFT JOIN merchants m ON pr.merchant_id = m.id
             ORDER BY pr.created_at DESC`;
        const dbRes = await pool.query(queryText, merchantId ? [merchantId] : []);
        for (const r of dbRes.rows) {
          if (!list.some(p => p.id === r.id)) {
            list.push({
              id: r.id,
              merchantId: r.merchant_id,
              storeName: r.db_store_name || r.store_name || 'متجر معتمد',
              productId: r.product_id,
              productName: r.db_prod_name || r.product_name || 'منتج مروّج',
              productImage: r.db_prod_image || r.product_image,
              durationDays: r.duration_days,
              dailyRate: 5000,
              subtotal: r.duration_days * 5000,
              discountPercent: r.duration_days >= 14 ? 25 : r.duration_days >= 7 ? 15 : 0,
              discountAmount: Math.round(((r.duration_days * 5000) * (r.duration_days >= 14 ? 25 : r.duration_days >= 7 ? 15 : 0)) / 100),
              finalTotal: r.price_iqd || (r.duration_days * 5000),
              status: r.status === 'pending' ? 'pending_approval' : r.status,
              notes: r.notes,
              rejectionReason: r.rejection_reason,
              startDate: r.start_date,
              endDate: r.end_date,
              createdAt: r.created_at,
            } as any);
          }
        }
      } catch (err: any) {
        console.warn('Error reading promotion_requests for merchant in commercial GET:', err?.message || err);
      }
    }
    // Sort newest first
    list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    res.json({ promotions: list });
  });

  app.post('/api/promotions/commercial', async (req: Request, res: Response) => {
    const {
      merchantId,
      storeName,
      productId,
      productName,
      productImage,
      durationDays = 7,
      notes,
    } = req.body;

    if (!merchantId || !productId) {
      return res.status(400).json({ error: 'معرف التاجر والمنتج مطلوبان' });
    }

    const dailyRate = 5000;
    const days = Math.max(1, Number(durationDays) || 1);
    const subtotal = days * dailyRate;

    let discountPercent = 0;
    if (days >= 14) {
      discountPercent = 25;
    } else if (days >= 7) {
      discountPercent = 15;
    }

    const discountAmount = Math.round((subtotal * discountPercent) / 100);
    const finalTotal = subtotal - discountAmount;

    const promoId = `cp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const promo = {
      id: promoId,
      merchantId,
      storeName: storeName || 'متجر معتمد',
      productId,
      productName: productName || 'منتج مروّج',
      productImage,
      durationDays: days,
      dailyRate,
      subtotal,
      discountPercent,
      discountAmount,
      finalTotal,
      status: 'pending_approval' as const, // Admin approval workflow
      notes: notes || undefined,
      startDate: null,
      endDate: null,
      createdAt: new Date().toISOString(),
    };

    memoryCommercialPromotions.set(promoId, promo);

    // Also persist in promotion_requests in PostgreSQL if pool exists
    if (pool) {
      try {
        await pool.query(
          `INSERT INTO promotion_requests
           (id, merchant_id, product_id, promo_type, duration_days, price_iqd, notes, status, created_at, updated_at)
           VALUES ($1, $2, $3, 'product', $4, $5, $6, 'pending_approval', NOW(), NOW())`,
          [promoId, merchantId, productId, days, finalTotal, notes || `طلب ترويج تجاري: ${productName || ''}`]
        ).catch(() => {});

        // Send alert notification to Admin
        const notifId = `notif_${Date.now()}`;
        await pool.query(
          `INSERT INTO notifications (id, recipient_id, recipient_role, title, message, type, entity_id, created_at)
           VALUES ($1, 'usr_admin', 'admin', 'طلب ترويج جديد قيد المراجعة', $2, 'promo', $3, NOW())`,
          [
            notifId,
            `قام التاجر "${storeName || 'معتمد'}" بطلب ترويج للمنتج "${productName || 'مروّج'}" لمدة ${days} أيام بقيمة ${finalTotal.toLocaleString()} د.ع. الطلب بانتظار موافقتك.`,
            promoId,
          ]
        ).catch(() => {});
      } catch (err: any) {
        console.warn('DB notification error on promo submit:', err?.message || err);
      }
    }

    res.json({
      success: true,
      promotion: promo,
      message: `تم إرسال طلب الترويج بنجاح وحالته الآن قيد مراجعة الإدارة (بانتظار موافقة المدير) ⏳`,
    });
  });

  // Stop / Pause Promotion (Merchant & Admin)
  const handleStopPromo = async (identifier: string, req: Request, res: Response) => {
    let targetPromo = memoryCommercialPromotions.get(identifier);
    let targetProductId = targetPromo?.productId;

    if (!targetPromo) {
      for (const [_, p] of memoryCommercialPromotions.entries()) {
        if (p.productId === identifier || p.id === identifier) {
          targetPromo = p;
          targetProductId = p.productId;
          break;
        }
      }
    }

    if (targetPromo) {
      targetPromo.status = 'stopped';
      (targetPromo as any).stoppedAt = new Date().toISOString();
      memoryCommercialPromotions.set(targetPromo.id, targetPromo);
    }

    const productId = targetProductId || req.body?.productId || identifier;

    if (pool) {
      try {
        await pool.query(
          `UPDATE promotion_requests SET status = 'stopped', updated_at = NOW() WHERE id = $1 OR product_id = $1`,
          [identifier]
        ).catch(() => {});

        if (productId) {
          try {
            await pool.query('UPDATE products SET is_promoted = FALSE WHERE id = $1', [productId]);
          } catch (pErr: any) {
            if (pErr?.message && pErr.message.includes('is_promoted')) {
              try {
                await pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS is_promoted BOOLEAN DEFAULT FALSE');
                await pool.query('UPDATE products SET is_promoted = FALSE WHERE id = $1', [productId]);
              } catch {}
            }
          }
        }
      } catch (err: any) {
        console.warn('Error stopping promo in DB:', err.message);
      }
    }

    const merchantId = targetPromo?.merchantId;
    if (merchantId) {
      const notifItem = {
        id: `notif_${Date.now()}`,
        type: 'promo',
        title: 'تم إيقاف ترويج المنتج ⏸️',
        message: 'تم إيقاف الحملة الترويجية للمنتج وإلغاء ظهوره في صدارة العروض المميزة بنجاح.',
        created_at: new Date().toISOString(),
        is_read: false,
      };
      const uNotifs = memoryNotifications.get(merchantId) || [];
      uNotifs.unshift(notifItem);
      memoryNotifications.set(merchantId, uNotifs);
    }

    res.json({
      success: true,
      promotion: targetPromo,
      productId,
      message: 'تم إيقاف ترويج المنتج بنجاح وتحديث حالته إلى متوقف وإلغاء تمييزه من صدارة المتجر.',
    });
  };

  app.post('/api/promotions/commercial/:id/stop', (req: Request, res: Response) => handleStopPromo(req.params.id, req, res));
  app.put('/api/promotions/commercial/:id/stop', (req: Request, res: Response) => handleStopPromo(req.params.id, req, res));
  app.post('/api/products/:id/unpromote', (req: Request, res: Response) => handleStopPromo(req.params.id, req, res));
  app.post('/api/promotions/:id/stop', (req: Request, res: Response) => handleStopPromo(req.params.id, req, res));

  // ==========================================
  // 5. Admin Promotions & Requests Endpoints
  // ==========================================
  app.get('/api/admin/promotions', async (req: Request, res: Response) => {
    const commercialList = Array.from(memoryCommercialPromotions.values());
    let dbPromotions: any[] = [];

    if (pool) {
      try {
        const dbRes = await pool.query(`
          SELECT pr.*, p.name as db_prod_name, p.image as db_prod_image, m.store_name as db_store_name
          FROM promotion_requests pr
          LEFT JOIN products p ON pr.product_id = p.id
          LEFT JOIN merchants m ON pr.merchant_id = m.id
          ORDER BY pr.created_at DESC
        `);
        dbPromotions = dbRes.rows.map(r => ({
          id: r.id,
          merchantId: r.merchant_id,
          storeName: r.db_store_name || r.store_name || 'متجر معتمد',
          productId: r.product_id,
          productName: r.db_prod_name || r.product_name || 'منتج مروّج',
          productImage: r.db_prod_image || r.product_image,
          durationDays: r.duration_days,
          dailyRate: 5000,
          subtotal: r.duration_days * 5000,
          discountPercent: r.duration_days >= 14 ? 25 : r.duration_days >= 7 ? 15 : 0,
          discountAmount: Math.round(((r.duration_days * 5000) * (r.duration_days >= 14 ? 25 : r.duration_days >= 7 ? 15 : 0)) / 100),
          finalTotal: r.price_iqd || (r.duration_days * 5000) - Math.round(((r.duration_days * 5000) * (r.duration_days >= 14 ? 25 : r.duration_days >= 7 ? 15 : 0)) / 100),
          status: r.status === 'pending' ? 'pending_approval' : r.status,
          notes: r.notes,
          rejectionReason: r.rejection_reason,
          startDate: r.start_date,
          endDate: r.end_date,
          createdAt: r.created_at,
        }));
      } catch (err: any) {
        console.warn('Error reading promotion_requests for admin:', err.message);
      }
    }

    const mergedMap = new Map<string, any>();
    for (const p of dbPromotions) mergedMap.set(p.id, p);
    for (const p of commercialList) mergedMap.set(p.id, p);

    const all = Array.from(mergedMap.values()).sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );

    res.json({ promotions: all });
  });

  // Admin Approve Promotion
  app.put('/api/admin/promotions/:id/approve', async (req: Request, res: Response) => {
    const { id } = req.params;
    let promo = memoryCommercialPromotions.get(id);

    if (promo) {
      promo.status = 'active';
      promo.startDate = new Date().toISOString();
      promo.endDate = new Date(Date.now() + (promo.durationDays || 7) * 86400000).toISOString();
      memoryCommercialPromotions.set(id, promo);
    }

    let productId = promo?.productId;
    const days = promo?.durationDays || 7;
    let productName = promo?.productName || 'المنتج';

    if (pool) {
      try {
        await pool.query(
          `UPDATE promotion_requests
           SET status = 'active', start_date = NOW(), end_date = NOW() + ($1 || ' days')::INTERVAL, updated_at = NOW()
           WHERE id = $2`,
          [days, id]
        );

        if (!productId) {
          const rowRes = await pool.query('SELECT product_id, merchant_id FROM promotion_requests WHERE id = $1', [id]);
          if (rowRes.rows.length > 0) {
            productId = rowRes.rows[0].product_id;
          }
        }

        if (productId) {
          try {
            await pool.query('UPDATE products SET is_promoted = TRUE WHERE id = $1', [productId]);
          } catch (pErr: any) {
            if (pErr?.message && pErr.message.includes('is_promoted')) {
              try {
                await pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS is_promoted BOOLEAN DEFAULT FALSE');
                await pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT FALSE');
                await pool.query('UPDATE products SET is_promoted = TRUE WHERE id = $1', [productId]);
              } catch {}
            }
          }
        }

        const merchantId = promo?.merchantId || (await pool.query('SELECT merchant_id FROM promotion_requests WHERE id = $1', [id])).rows[0]?.merchant_id;
        if (merchantId) {
          const notifId = `notif_${Date.now()}`;
          await pool.query(
            `INSERT INTO notifications (id, recipient_id, recipient_role, title, message, type, entity_id, created_at)
             VALUES ($1, $2, 'merchant', 'تم قبول وتفعيل حملتك الترويجية! 🚀', $3, 'promo', $4, NOW())`,
            [
              notifId,
              merchantId,
              `تمت موافقة إدارة دكانة على ترويج المنتج "${productName}". بدأ الترويج رسمياً لمدة ${days} يوماً وسيظهر في صدارة المتجر وقسم العروض المميزة.`,
              id,
            ]
          ).catch(() => {});
        }
      } catch (err: any) {
        console.warn('Error approving promotion in DB:', err.message);
      }
    }

    res.json({
      success: true,
      promotion: promo,
      productId,
      message: 'تم قبول وتفعيل الحملة الترويجية بنجاح! أصبح المنتج مروجاً وبدأ احتساب الأيام.',
    });
  });

  // Admin Reject Promotion
  app.put('/api/admin/promotions/:id/reject', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    const reason = rejectionReason?.trim() || 'لم يستوفِ شروط الترويج المعتمدة لدى المنصة';

    let promo = memoryCommercialPromotions.get(id);
    if (promo) {
      promo.status = 'rejected';
      promo.rejectionReason = reason;
      memoryCommercialPromotions.set(id, promo);
    }

    let productId = promo?.productId;
    let productName = promo?.productName || 'المنتج';

    if (pool) {
      try {
        await pool.query(
          `UPDATE promotion_requests
           SET status = 'rejected', rejection_reason = $1, updated_at = NOW()
           WHERE id = $2`,
          [reason, id]
        );

        if (!productId) {
          const rowRes = await pool.query('SELECT product_id, merchant_id FROM promotion_requests WHERE id = $1', [id]);
          if (rowRes.rows.length > 0) {
            productId = rowRes.rows[0].product_id;
          }
        }

        if (productId) {
          await pool.query('UPDATE products SET is_promoted = FALSE WHERE id = $1', [productId]).catch(() => {});
        }

        const merchantId = promo?.merchantId || (await pool.query('SELECT merchant_id FROM promotion_requests WHERE id = $1', [id])).rows[0]?.merchant_id;
        if (merchantId) {
          const notifId = `notif_${Date.now()}`;
          await pool.query(
            `INSERT INTO notifications (id, recipient_id, recipient_role, title, message, type, entity_id, created_at)
             VALUES ($1, $2, 'merchant', 'تحديث بخصوص طلب الترويج ❌', $3, 'promo', $4, NOW())`,
            [
              notifId,
              merchantId,
              `نأسف لإبلاغك بأنه تم رفض طلب الترويج للمنتج "${productName}". سبب الرفض: ${reason}`,
              id,
            ]
          ).catch(() => {});
        }
      } catch (err: any) {
        console.warn('Error rejecting promotion in DB:', err.message);
      }
    }

    res.json({
      success: true,
      promotion: promo,
      productId,
      message: 'تم رفض طلب الترويج بنجاح وتحديث حالته.',
    });
  });

  // Legacy compatibility for status update
  app.put('/api/admin/promotions/:id/status', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    if (status === 'approved' || status === 'active') {
      req.params.id = id;
      return (app as any)._router.handle({ ...req, method: 'PUT', url: `/api/admin/promotions/${id}/approve` }, res);
    } else if (status === 'rejected') {
      req.body.rejectionReason = rejectionReason;
      return (app as any)._router.handle({ ...req, method: 'PUT', url: `/api/admin/promotions/${id}/reject` }, res);
    } else if (status === 'stopped') {
      return handleStopPromo(id, req, res);
    }
    res.json({ success: true, message: 'تم تحديث الحالة بنجاح.' });
  });

  app.get('/api/promotions', async (req: Request, res: Response) => {
    const merchantId = req.query.merchantId as string;
    let list = Array.from(memoryCommercialPromotions.values());
    if (merchantId) {
      list = list.filter(p => p.merchantId === merchantId);
    }
    res.json({ promotions: list });
  });

  app.post('/api/promotions', async (req: Request, res: Response) => {
    // Route to commercial promotion endpoint
    return (app as any)._router.handle({ ...req, method: 'POST', url: '/api/promotions/commercial' }, res);
  });

  // ==========================================
  // 6. AI Features (2 Features Only: Smart Search + Product Description Assistant)
  // ==========================================

  // Iraqi Dialect Dictionary & Synonyms Map for Zero-Cost Smart Expansion
  const IRAQI_DIALECT_MAP: Record<string, string[]> = {
    'سبلت': ['مكيف', 'تبريد', 'كارير', 'سامسونج', 'ال جي'],
    'مكيف': ['سبلت', 'تبريد', 'مكيفات'],
    'بنكة': ['مروحة', 'مروحة سقفية', 'تهوية'],
    'مروحة': ['بنكة', 'تهوية'],
    'قاط': ['بدلة', 'ملابس رسمية', 'جاكيت'],
    'دشداشة': ['ثوب', 'مخور', 'عباءة', 'زي عربي'],
    'ثوب': ['دشداشة', 'ملابس'],
    'مبايل': ['هاتف', 'موبايل', 'جوال', 'ايفون', 'سامسونج'],
    'موبايل': ['مبايل', 'هاتف', 'جوال'],
    'هاتف': ['مبايل', 'موبايل', 'جوال'],
    'طباخ': ['فرن', 'غاز', 'موقد'],
    'ثلاجة': ['براد', 'مجميدة', 'فريزر'],
    'براد': ['ثلاجة', 'مبرد'],
    'مجميد': ['فريزر', 'ثلاجة'],
    'لابتوب': ['حاسوب', 'كمبيوتر', 'نوت بوك'],
    'حاسوب': ['لابتوب', 'كمبيوتر'],
    'قندر': ['حذاء', 'بوط', 'نعال'],
    'حذاء': ['قندرة', 'بوط', 'سنيكرز'],
    'شحاطة': ['نعال', 'سليبر'],
    'بوشية': ['حجاب', 'شيلة', 'طرحة'],
    'كليجة': ['حلويات', 'معمول', 'كعك'],
    'دهين': ['حلويات', 'دهين نجفي'],
    'تمور': ['تمر', 'خستاوي', 'برحي', 'بربن'],
    'شاحن': ['كيبل', 'واير', 'شاحنة'],
    'ساعة': ['سمارت ووتش', 'أكسسوارات'],
    'دراجة': ['ماطور', 'بطاحة', 'سكوتر'],
    'ماطور': ['دراجة', 'بطاحة', 'موتور'],
  };

  // Standard Search Terms Endpoint (Direct text matching, no Gemini AI)
  app.post('/api/ai/smart-search', async (req: Request, res: Response) => {
    const { query = '' } = req.body;
    const cleanQuery = query.trim().toLowerCase();
    res.json({
      originalQuery: cleanQuery,
      enhancedTerms: cleanQuery ? [cleanQuery] : [],
    });
  });

  // AI Feature 2: Product Description Writing Assistant
  app.post('/api/ai/generate-description', async (req: Request, res: Response) => {
    const {
      productName,
      categoryName,
      keywords,
      keyFeatures,
      governorate = 'كافة المحافظات',
      price,
    } = req.body;

    if (!productName) {
      return res.status(400).json({ error: 'اسم المنتج مطلوب لإنشاء الوصف' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    let generatedDescription = '';

    if (apiKey && apiKey.trim()) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `أنت مساعد خبير في كتابة أوصاف المنتجات التجارية لسوق "دكانة" العراقي.
معلومات المنتج:
- اسم المنتج: ${productName}
- القسم: ${categoryName || 'عام'}
- المميزات والمواصفات: ${keyFeatures || keywords || 'جودة ممتازة، ضمان حقيقي'}
- السعر: ${price ? `${price} د.ع` : 'منافس'}
- نطاق التوصيل: ${governorate} الدفع نقداً عند الاستلام

اكتب وصفاً جذاباً وصادقاً باللغة العربية بأسلوب تسويقي راقٍ يناسب الزبون العراقي، بدون اختلاق مواصفات وهمية أو أسعار غير مذكورة.
قسّم الوصف إلى:
1. مقدمة موجزة وجذابة.
2. أبرز المواصفات (نقاط سريعة).
3. خدمة التوصيل والدفع عند الاستلام مع دكانة.
أجب فقط بنص الوصف المقترح المباشر بدون مقدمات دردشة.`;

        const aiResponse = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
        });

        generatedDescription = (aiResponse.text || '').trim();
      } catch (err: any) {
        console.warn('[Gemini AI] Generation fallback:', err.message);
      }
    }

    // High quality Iraqi Arabic contextual template fallback if API key is not present or call fails
    if (!generatedDescription) {
      generatedDescription = `✨ ${productName} — جودة عالية وأصالة مضمونة

المميزات والمواصفات الأساسية:
• خامة ممتازة ومطابقة للمواصفات العراقية المعتمدة.
• ${keyFeatures ? keyFeatures : 'تصميم متين وأداء عالي يلبي احتياجاتكم اليومية بأفضل صورة.'}
• فحص وتأكد من سلامة المنتج قبل التوصيل للزبون.

🚚 الشحن والدفع:
• متوفر التوصيل السريع لكافة المحافظات الـ 19 (${governorate}).
• الدفع نقداً عند الاستلام بعد معاينة وفحص الطلب بضمان سوق دكانة.`;
    }

    res.json({
      success: true,
      description: generatedDescription,
    });
  });

  // AI Feature: Merchant Product Details Generation (Title, Category, Iraqi Description, Auto Tags)
  // Route: /api/ai/generate-product-details (and alias /api/ai/analyze-product-image)
  const handleGenerateProductDetails = async (req: Request, res: Response) => {
    const { imageBase64, mimeType = 'image/jpeg', productName = '', availableCategories = [] } = req.body;

    if (!imageBase64 && (!productName || !productName.trim())) {
      return res.status(400).json({
        success: false,
        error: 'يرجى رفع صورة المنتج أو كتابة اسمه الأساسي للتحليل والتوليد بالذكاء الاصطناعي',
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    let resultData: {
      suggestedName?: string;
      categoryId?: string;
      categoryName?: string;
      description?: string;
      tags?: string[];
    } = {};

    const catsDescription = (availableCategories as Array<{ id: string; name: string }>)
      .map(c => `(معرف: ${c.id}، الاسم: ${c.name})`)
      .join(', ');

    // Process image: extract clean base64 and detect mime type safely
    let cleanBase64: string | null = null;
    let detectedMime = mimeType || 'image/jpeg';

    if (imageBase64 && typeof imageBase64 === 'string') {
      if (imageBase64.startsWith('data:image/')) {
        const mimeMatch = imageBase64.match(/^data:(image\/[a-zA-Z0-9\+\-\.]+);base64,/);
        if (mimeMatch) {
          detectedMime = mimeMatch[1];
        }
        cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9\+\-\.]+;base64,/, '').trim();
      } else if (imageBase64.startsWith('/src/assets/images/') || imageBase64.startsWith('src/assets/images/')) {
        try {
          const rel = imageBase64.startsWith('/') ? imageBase64.slice(1) : imageBase64;
          const fullPath = path.resolve(process.cwd(), rel);
          if (fs.existsSync(fullPath)) {
            const buf = fs.readFileSync(fullPath);
            cleanBase64 = buf.toString('base64');
            if (fullPath.endsWith('.png')) detectedMime = 'image/png';
            else if (fullPath.endsWith('.webp')) detectedMime = 'image/webp';
            else detectedMime = 'image/jpeg';
          }
        } catch (e) {
          console.warn('[AI Details] Could not read local asset file:', e);
        }
      } else if (imageBase64.length > 100 && /^[A-Za-z0-9+/=]+$/.test(imageBase64.replace(/\s+/g, ''))) {
        cleanBase64 = imageBase64.trim();
      }
    }

    // Call Gemini with gemini-2.5-flash if apiKey is present
    if (apiKey && apiKey.trim()) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `أنت خبير تسويق تجاري ومحلل منتجات معتمد في سوق "دكانة" العراقي.
${cleanBase64 ? 'افحص صورة هذا المنتج المعروض بدقة واستخرج بياناته التجارية والتسويقية.' : 'بناءً على اسم المنتج الأساسي المدخل من التاجر: "' + productName + '"'}
${productName && cleanBase64 ? `(اسم مبدئي مقترح من التاجر: "${productName}")` : ''}

الأقسام المتاحة حالياً في المتجر: [${catsDescription || 'ملابس، منتجات غذائية، منتجات منزلية، عطور، أجهزة'}]

المطلوب بدقة بتنسيق JSON حصراً:
1. "suggestedName": اسم تجاري تسويقي واضح وجذاب للمنتج بالعربية (مثال: "قندرة رجالية جلد طبيعي مبطنة طبياً" أو "تراكسود قطني تركي أنيق" أو "طقم استكانات شاي بغدادية فاخرة").
2. "categoryId": المعرف الدقيق للقسم الأنسب من القائمة أعلاه (مثل cat_clothing أو cat_home أو cat_food أو cat_perfume أو cat_electronics).
3. "categoryName": اسم القسم الأنسب بالعربية.
4. "description": وصف تسويقي احترافي بلهجة عراقية لطيفة وراقية ومناسبة للسوق العراقي، يوضح مواصفات المنتج ومميزاته على شكل نقاط واضحة مع تأكيد المعاينة قبل الدفع والتوصيل السريع لكافة المحافظات.
5. "tags": مصفوفة وسوم وكلمات مفتاحية محلية عراقية دارجة ومطابقة (Auto Tags) تفيد الزبائن عند البحث (مثل: ["قندرة", "حذاء_طبي", "جلد_طبيعي", "رجالي"]).

أجب بصيغة JSON نظيفة فقط:
{
  "suggestedName": "...",
  "categoryId": "...",
  "categoryName": "...",
  "description": "...",
  "tags": ["...", "..."]
}`;

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('AI generation request timed out')), 15000)
        );

        let contents: any;
        if (cleanBase64) {
          contents = {
            parts: [
              {
                inlineData: {
                  mimeType: detectedMime,
                  data: cleanBase64,
                },
              },
              { text: prompt },
            ],
          };
        } else {
          contents = prompt;
        }

        let aiResponse: any = null;
        try {
          aiResponse = await Promise.race([
            ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents,
            }),
            timeoutPromise,
          ]);
        } catch (mErr: any) {
          console.warn('[Gemini 2.5 Flash error, attempting gemini-flash-latest]:', mErr?.message);
          aiResponse = await Promise.race([
            ai.models.generateContent({
              model: 'gemini-flash-latest',
              contents,
            }),
            timeoutPromise,
          ]);
        }

        const rawText = aiResponse?.text || '';
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          resultData = JSON.parse(jsonMatch[0]);
        }
      } catch (err: any) {
        console.error('[Gemini AI Details Error]:', err?.message || err);
      }
    }

    // High quality intelligent fallback if API is unreachable, times out, or key not configured
    if (!resultData.suggestedName) {
      const catsList = availableCategories as Array<{ id: string; name: string }>;
      const textToScan = `${productName} ${String(imageBase64 || '')}`.toLowerCase();

      if (textToScan.includes('dates') || textToScan.includes('تمر') || textToScan.includes('برحي') || textToScan.includes('طعام') || textToScan.includes('اكل')) {
        const cat = catsList.find(c => c.id === 'cat_food') || catsList[0];
        resultData = {
          suggestedName: productName ? `${productName} عراقي قطاف الموسم الفاخر` : 'تمور برحي عراقية فاخرة قطاف الموسم',
          categoryId: cat?.id || 'cat_food',
          categoryName: cat?.name || 'الأغذية والمأكولات',
          description: `✨ تمور برحي ومحاصيل عراقية فاخرة ومفحوصة، مختارة بعناية من أجود بساتين العراق.

المواصفات والمميزات:
• حبة ممتلئة وطعم عسلي أصيل معبأة في بيئة صحية معقمة.
• خالية من المواد الحافظة وغنية بالطاقة والفيتامينات الطبيعية.
• ملائمة للضيافة الراقية وهدايا الأهل والمناسبات والأعياد.

🚚 الشحن والضمان مع دكانة:
• توصيل سريع لكافة المحافظات العراقية الـ 18.
• الدفع نقداً عند الاستلام بعد معاينة وفحص الطلب بضمان كامل.`,
          tags: ['تمور', 'برحي', 'تمور_عراقية', 'طازج', 'فاخر', 'بساتين_العراق'],
        };
      } else if (textToScan.includes('قندرة') || textToScan.includes('حذاء') || textToScan.includes('شحاطة') || textToScan.includes('جوتي')) {
        const cat = catsList.find(c => c.id === 'cat_clothing') || catsList[0];
        resultData = {
          suggestedName: productName ? `${productName} جلد طبيعي مريح وطبي` : 'قندرة رجالية جلد طبيعي مبطنة طبياً',
          categoryId: cat?.id || 'cat_clothing',
          categoryName: cat?.name || 'الملابس والأزياء',
          description: `✨ حذاء (قندرة) فاخر من الجلد الطبيعي الأصلي مصمم خصيصاً للراحة التامة والأناقة اليومية.

المواصفات والمميزات:
• بطانة داخلية طبية تمتص الصدمات وتريح القدم أثناء المشي الطويل والدوام.
• جلد طبيعي متين مقاوم للتشقق والخدوش مع خياطة يدوية دقيقة.
• نعل مطاطي مانع للانزلاق يوفر ثباتاً ممتازاً على كافة الأرضيات.

🚚 الشحن والدفع:
• فحص وقياس عند الاستلام قبل تسليم المبلغ للمندوب.
• توصيل مباشر وسريع لباب بيتك بكافة المحافظات.`,
          tags: ['قندرة', 'حذاء_طبي', 'جلد_طبيعي', 'شحاطة', 'رجالي', 'دكانة_العراق'],
        };
      } else if (textToScan.includes('تراكسود') || textToScan.includes('ملابس') || textToScan.includes('قاط') || textToScan.includes('دشداشة') || textToScan.includes('قميص')) {
        const cat = catsList.find(c => c.id === 'cat_clothing') || catsList[0];
        resultData = {
          suggestedName: productName ? `${productName} خامة تركية قطنية مريحة` : 'تراكسود رجالي قطني تركي أنيق للمناسبات والرياضة',
          categoryId: cat?.id || 'cat_clothing',
          categoryName: cat?.name || 'الملابس والأزياء',
          description: `✨ تصميم عصري وخامة قطنية ممتازة تناسب الأجواء اليومية وتمنحك أقصى درجات الراحة.

المواصفات والمميزات:
• قطن تركي عالي الجودة بارد ومريح لا يتأثر بالغسيل المتكرر.
• قَصّة مريحة وألوان ثابتة ومتقنة بالكامل.
• متوفر بكافة القياسات المطلوبة لتناسب الجميع تماماً.

🚚 الشحن والضمان:
• يحق لك المعاينة والتأكد من القياس والخامة قبل دفع المبلغ للمندوب.
• خدمة توصيل سريعة ومضمونة لجميع محافظات العراق الـ 18.`,
          tags: ['تراكسود', 'ملابس_رياضية', 'تركي', 'أصلي', 'توصيل_سريع', 'كشخة'],
        };
      } else if (textToScan.includes('عطر') || textToScan.includes('بخور') || textToScan.includes('عود')) {
        const cat = catsList.find(c => c.id === 'cat_perfume') || catsList[0];
        resultData = {
          suggestedName: productName ? `${productName} ثبات وفوحان أصلي ممتاز` : 'عطر عراقي فاخر بثباتية عالية وفوحان مميز',
          categoryId: cat?.id || 'cat_perfume',
          categoryName: cat?.name || 'العطور والبخور',
          description: `✨ تركيبة عطرية ساحرة تمزج بين الفخامة الشرقية والانتعاش العصري بثبات يدوم لساعات طويلة.

المواصفات والمميزات:
• فوحان ملحوظ ونوتات عطرية غنية تجذب الأنظار في كل مكان.
• مناسب للاستخدام اليومي والمناسبات الخاصة والأمسيات الراقية.
• عبوة فخمة ومحكمة تغلف بأناقة تناسب الإهداء أيضاً.

🚚 الشحن والضمان:
• توصيل لكافة المحافظات مع ضمان أصالة العطر وجودة الزيوت.
• الدفع نقداً عند الاستلام.`,
          tags: ['عطر', 'بخور', 'ثبات_عالي', 'فوحان', 'عطور_فاخرة'],
        };
      } else {
        const defaultCat = catsList[0] || {
          id: 'cat_clothing',
          name: 'الملابس والأزياء',
        };
        resultData = {
          suggestedName: productName ? `${productName} — جودة ممتازة وضمان سوق دكانة` : 'منتج تجاري أصلي عالي الجودة متوفر حصرياً',
          categoryId: defaultCat.id,
          categoryName: defaultCat.name,
          description: `✨ منتج تجاري أصلي عالي الجودة متوفر حصرياً عبر متجرنا المعتمد في منصة دكانة.

المواصفات والمميزات:
• خامة ممتازة ومصنعة وفقاً لأعلى معايير الجودة والمتانة.
• تصميم عملي وأنيق يلائم متطلبات الحياة اليومية بأفضل صورة.
• تم فحص المنتج والتأكد من سلامته التامة قبل تجهيزه للشحن.

🚚 الشحن والضمان:
• توصيل سريع وموثوق لكافة المحافظات العراقية الـ 18.
• الدفع نقداً عند الاستلام مع إمكانية المعاينة والفحص المباشر عند باب بيتك.`,
          tags: ['تسوق_العراق', 'منتج_أصلي', 'توصيل_سريع', 'دكانة', 'كاش_عند_الاستلام'],
        };
      }
    }

    res.json({
      success: true,
      ...resultData,
    });
  };

  app.post('/api/ai/generate-product-details', handleGenerateProductDetails);
  app.post('/api/ai/analyze-product-image', handleGenerateProductDetails);

  // AI Feature 4: Merchant Copywriting & Marketing Ad Assistant (Instagram & TikTok)
  app.post('/api/ai/generate-marketing-ad', async (req: Request, res: Response) => {
    const {
      productName,
      categoryName = '',
      description = '',
      price,
      storeName = 'متجرنا في دكانة',
      governorate = 'كافة المحافظات',
    } = req.body;

    if (!productName || !productName.trim()) {
      return res.status(400).json({ success: false, error: 'اسم المنتج مطلوب لتوليد المنشور الإعلاني' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    let adCopy = '';

    if (apiKey && apiKey.trim()) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `أنت خبير تسويق رقمي وصانع إعلانات إلكترونية (Copywriter) محترف للترويج على إنستغرام وتيك توك وفيسبوك في العراق.
اكتب منشوراً إعلانياً جذاباً وتفاعلياً (Ad Caption) مخصصاً لترويج هذا المنتج التجاري للزبائن العراقيين:

معلومات المنتج:
- اسم المنتج: ${productName}
- القسم: ${categoryName || 'عام'}
- السعر: ${price ? `${price} دينار عراقي` : 'سعر خاص ومميز'}
- المتجر: ${storeName}
- مواصفات ومميزات المنتج: ${description || 'جودة عالية وضمان حقيقي وتوصيل سريع'}
- المحافظات: ${governorate} مع توصيل لكافة محافظات العراق الـ 19 والدفع نقداً عند الاستلام بعد المعاينة.

المعايير الصارمة للمنشور:
1. هوك افتتاحي تسويقي يجذب الانتباه باللهجة العراقية الودودة والمحبوبة (مثال: "يا هلا بالحبايب، شوفوا الفخامة الشايلها هذا المنتج! ✨" أو "لعشاق التميز، جبنالكم الشي اللي يبرد القلب 🔥").
2. نقاط سريعة توضح ليش المنتج يسوى الشراء وتبرز الراحة والجودة.
3. تفاصيل السعر وطريقة الشحن: "التوصيل واصل لباب بيتك بكافة المحافظات، والدفع كاش عند الاستلام بعد ما تفتح الطلب وتعاين بعينك! 🚚📦".
4. دعوة واضحة لاتخاذ إجراء (Call to Action): "لحك واطلب قبل نفاذ الكمية! دز رسالة عالخاص أو اطلب فوراً عبر منصة دكانة 📲".
5. حزمة هاشتاقات عراقية تريند وفعالة للوصول في إنستغرام وتيك توك:
#دكانة #تسوق_العراق #العراق #بغداد #البصرة #اربيل #كشخة #عروض_العراق #توصيل_سريع

أجب فقط بنص المنشور التسويقي المباشر بدون أي مقدمات أو توضيحات.`;

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('AI marketing copywriting request timed out')), 4000)
        );

        const aiResponse: any = await Promise.race([
          ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: prompt,
          }),
          timeoutPromise,
        ]);

        adCopy = (aiResponse.text || '').trim();
      } catch (err: any) {
        console.error('[Gemini Ad Copywriting Error]:', err?.message || err);
      }
    }

    // High quality Iraqi social media copywriting fallback
    if (!adCopy) {
      const priceFormatted = price ? `${Number(price).toLocaleString()} د.ع` : 'سعر خاص وتنافسي';
      adCopy = `✨ يا هلا بالغوالي! جبنالكم اليوم الزين اللي يرفع الراس 🔥

🌟 ${productName} 🌟
خامة ممتازة وتصميم راقي يجمع بين الأناقة والعملية اليومية، موفرينلكم الجودة الأصلية بأفضل سعر في السوق!

💫 ليش تختار هذا المنتج؟
• خامة أصلية متينة ومضمونة ومفحوصة بالكامل.
• مثالي للاستخدام اليومي وللمهتمين بالكشخة والجودة العالية.
• ضمان مطابقة المواصفات 100%.

💰 السعر: فقط ${priceFormatted}
🚚 التوصيل: متوفر لكافة محافظات العراق الـ 19 (بما فيها حلبجة) لباب بيتك!
🛡️ والأهم: الدفع كاش عند الاستلام، تفتح الطلب وتفحصه يلا تسلّم الفلوس للمندوب ✅

📲 للطلب والاستفسار:
دزولنا رسالة على الخاص أو اطلبوا مباشرة عبر متجرنا في "دكانة" والكمية محدودة!

#دكانة #تسوق_العراق #بغداد #البصرة #اربيل #النجف #كربلاء #الموصل #حلبجة #عروض_العراق #توصيل_سريع #كشخة_عراقية`;
    }

    res.json({
      success: true,
      adCopy,
    });
  });

  // ==========================================
  // Platform Coupons & Discounts Endpoints (Admin Controlled)
  // ==========================================
  app.get('/api/coupons', (req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'Active platform coupons are managed securely by Dukkana Master Admin',
    });
  });

  console.log('[Dukkana Features] Chat, Notifications, Stories, Promotions, and Gemini AI endpoints mounted successfully.');
}
