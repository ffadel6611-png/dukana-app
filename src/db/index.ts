import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

const { Pool } = pg;

export type DbHealthStatus = {
  configured: boolean;
  connected: boolean;
  latencyMs?: number;
  message: string;
  error?: string;
};

// Strictly retrieve DATABASE_URL from environment
const connectionString = process.env.DATABASE_URL;

let pool: pg.Pool | null = null;
let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

if (connectionString && connectionString.trim() !== '') {
  try {
    const isLocalhost = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
    pool = new Pool({
      connectionString,
      ssl: isLocalhost ? false : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on('error', (err) => {
      console.error('[PostgreSQL] Unexpected pool error on idle client:', err.message);
    });

    db = drizzle(pool, { schema });
  } catch (err: any) {
    console.error('[PostgreSQL] Pool initialization error:', err?.message || err);
  }
}

/**
 * Safe, isolated health check for PostgreSQL connection.
 * Does not throw, does not block the application, and never leaks credentials.
 */
export async function checkDatabaseHealth(): Promise<DbHealthStatus> {
  if (!connectionString || connectionString.trim() === '') {
    return {
      configured: false,
      connected: false,
      message: 'قاعدة البيانات غير مهيأة (متغير DATABASE_URL غير محدد في البيئة).',
    };
  }

  if (!pool) {
    return {
      configured: true,
      connected: false,
      message: 'تعذر تهيئة مجمع اتصالات قاعدة البيانات (Connection Pool not ready).',
    };
  }

  const startTime = Date.now();
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1 AS health_check;');
      const latencyMs = Date.now() - startTime;
      return {
        configured: true,
        connected: true,
        latencyMs,
        message: 'الاتصال بقاعدة بيانات PostgreSQL (Neon) نشط وسليم.',
      };
    } finally {
      client.release();
    }
  } catch (error: any) {
    return {
      configured: true,
      connected: false,
      latencyMs: Date.now() - startTime,
      message: 'تعذر الاتصال بقاعدة بيانات PostgreSQL.',
      error: error?.message || 'خطأ غير معروف في الاتصال.',
    };
  }
}

export { pool, db, schema };
