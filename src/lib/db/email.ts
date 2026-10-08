import { getDb, getDbFromEnv } from './common';
import { sql, inArray, desc, and, isNull, isNotNull, lt } from 'drizzle-orm';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

import type { Email, NewEmail, ListParams, ExtractResultType } from '@/types';

const email = sqliteTable('email', {
  id: integer('id').primaryKey(),
  messageId: text('message_id').unique(),
  fromAddress: text('from_address'),
  fromName: text('from_name'),
  toAddress: text('to_address'),
  recipient: text('recipient'),
  title: text('title'),
  bodyText: text('body_text'),
  bodyHtml: text('body_html'),
  sentAt: text('sent_at'),
  receivedAt: text('received_at'),
  emailType: text('email_type'),
  emailResult: text('email_result'),
  emailResultText: text('email_result_text'),
  emailError: text('email_error'),
  readStatus: integer('read_status').default(0),
  deletedAt: text('deleted_at'),
});

const emailDB = {
  async list(params: ListParams = {}): Promise<Email[]> {
    const db = getDb();
    const { limit = 100, offset = 0, readStatus, emailType, recipient, folder = 'inbox' } = params;

    const conditions = [folder === 'trash' ? isNotNull(email.deletedAt) : isNull(email.deletedAt)];

    if (readStatus === 1) {
      conditions.push(sql`${email.readStatus} = 1`);
    } else if (readStatus === 0) {
      conditions.push(sql`${email.readStatus} = 0`);
    }

    if (emailType) {
      const types = emailType.split(',').map(t => t.trim()).filter(Boolean);
      if (types.length > 1) {
        conditions.push(inArray(email.emailType, types));
      } else if (types.length === 1) {
        conditions.push(sql`${email.emailType} = ${types[0]}`);
      }
    }

    if (recipient) {
      const recipients = recipient.split(',').map(r => r.trim()).filter(Boolean);
      if (recipients.length > 1) {
        conditions.push(inArray(email.toAddress, recipients));
      } else if (recipients.length === 1) {
        conditions.push(sql`${email.toAddress} = ${recipients[0]}`);
      }
    }

    let query;
    if (conditions.length > 0) {
      const whereClause = conditions.length === 1
        ? conditions[0]
        : conditions.reduce((acc, condition) => sql`${acc} AND ${condition}`);
      query = db.select().from(email).where(whereClause);
    } else {
      query = db.select().from(email);
    }

    const rows = await query
      .orderBy(desc(folder === 'trash' ? email.deletedAt : email.sentAt), desc(email.id))
      .limit(limit)
      .offset(offset);
    return rows as Email[];
  },

  async count(params: ListParams = {}): Promise<number> {
    const db = getDb();
    const { readStatus, emailType, recipient, folder = 'inbox' } = params;

    const conditions = [folder === 'trash' ? isNotNull(email.deletedAt) : isNull(email.deletedAt)];

    if (readStatus === 1) {
      conditions.push(sql`${email.readStatus} = 1`);
    } else if (readStatus === 0) {
      conditions.push(sql`${email.readStatus} = 0`);
    }

    if (emailType) {
      const types = emailType.split(',').map(t => t.trim()).filter(Boolean);
      if (types.length > 1) {
        conditions.push(inArray(email.emailType, types));
      } else if (types.length === 1) {
        conditions.push(sql`${email.emailType} = ${types[0]}`);
      }
    }

    if (recipient) {
      const recipients = recipient.split(',').map(r => r.trim()).filter(Boolean);
      if (recipients.length > 1) {
        conditions.push(inArray(email.toAddress, recipients));
      } else if (recipients.length === 1) {
        conditions.push(sql`${email.toAddress} = ${recipients[0]}`);
      }
    }

    let query;
    if (conditions.length > 0) {
      const whereClause = conditions.length === 1
        ? conditions[0]
        : conditions.reduce((acc, condition) => sql`${acc} AND ${condition}`);
      query = db.select({ count: sql<number>`count(*)` }).from(email).where(whereClause);
    } else {
      query = db.select({ count: sql<number>`count(*)` }).from(email);
    }

    const result = await query;
    return result[0]?.count || 0;
  },
  async delete(items: number[] = []): Promise<void> {
    const db = getDb();
    await db.update(email).set({ deletedAt: new Date().toISOString() })
      .where(and(inArray(email.id, items), isNull(email.deletedAt)));
  },

  async update(params: {
    id: number;
    emailResult: string | null;
    emailType: ExtractResultType;
  }): Promise<void> {
    const db = getDb();
    const { id, emailType, emailResult } = params;

    await db.update(email)
      .set({ emailType, emailResult })
      .where(sql`${email.id} = ${id}`);
  },

  async markAsRead(id: number): Promise<void> {
    const db = getDb();
    await db.update(email)
      .set({ readStatus: 1 })
      .where(sql`${email.id} = ${id}`);
  },

  async markAsUnread(id: number): Promise<void> {
    const db = getDb();
    await db.update(email)
      .set({ readStatus: 0 })
      .where(sql`${email.id} = ${id}`);
  },

  async markMultipleAsRead(ids: number[]): Promise<void> {
    const db = getDb();
    await db.update(email)
      .set({ readStatus: 1 })
      .where(inArray(email.id, ids));
  },

  async markMultipleAsUnread(ids: number[]): Promise<void> {
    const db = getDb();
    await db.update(email)
      .set({ readStatus: 0 })
      .where(inArray(email.id, ids));
  },


  async restore(items: number[]): Promise<void> {
    const db = getDb();
    await db.update(email).set({ deletedAt: null })
      .where(and(inArray(email.id, items), isNotNull(email.deletedAt)));
  },

  async trashExpiredByType(env: CloudflareEnv, types: string[], expiredDate: string, now: string): Promise<number> {
    if (types.length === 0) return 0;
    const db = getDbFromEnv(env);
    const result = await db.update(email).set({ deletedAt: now })
      .where(and(inArray(email.emailType, types), lt(email.sentAt, expiredDate), isNull(email.deletedAt)));
    return result.meta.changes;
  },

  async purgeExpiredTrash(env: CloudflareEnv, cutoff: string): Promise<number> {
    const db = getDbFromEnv(env);
    // A single conditional DELETE protects restored messages from concurrent purges.
    const result = await db.delete(email)
      .where(and(isNotNull(email.deletedAt), lt(email.deletedAt, cutoff)));
    return result.meta.changes;
  },

  async create(env: CloudflareEnv, data: NewEmail): Promise<Email> {
    const db = getDbFromEnv(env);

    // 确保 emailType 不为 null
    if (!data.emailType) {
      throw new Error('emailType is required and cannot be null');
    }

    const row = await db.insert(email).values(data).returning().get();
    return row as Email;
  },

  async getAllRecipients(): Promise<string[]> {
    const db = getDb();

    const recipients = await db
      .select({ toAddress: email.toAddress })
      .from(email)
      .where(and(isNotNull(email.toAddress), isNull(email.deletedAt)))
      .groupBy(email.toAddress)
      .orderBy(email.toAddress);

    return recipients.map(r => r.toAddress).filter(Boolean) as string[];
  },
};

export default emailDB;
