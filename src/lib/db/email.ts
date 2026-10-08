import { getDb, getDbFromEnv } from './common';
import { sql, inArray, desc, and, or, isNull, isNotNull, lt, eq, getTableColumns } from 'drizzle-orm';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

import type { Email, NewEmail, ListParams, ExtractResultType, EmailFolder } from '@/types';

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
  archivedAt: text('archived_at'),
});

function folderCondition(folder: EmailFolder) {
  if (folder === 'trash') return and(isNotNull(email.deletedAt), isNull(email.archivedAt))!;
  if (folder === 'archive') return and(isNull(email.deletedAt), isNotNull(email.archivedAt))!;
  return and(isNull(email.deletedAt), isNull(email.archivedAt))!;
}

function listCondition(params: ListParams) {
  const conditions = [folderCondition(params.folder ?? 'inbox')];
  if (params.readStatus === 0 || params.readStatus === 1) conditions.push(eq(email.readStatus, params.readStatus));
  for (const [value, column] of [[params.emailType, email.emailType], [params.recipient, email.toAddress]] as const) {
    const values = value?.split(',').map(t => t.trim()).filter(Boolean);
    if (values?.length) conditions.push(inArray(column, values));
  }
  if (params.q?.trim()) {
    // Search literal text, not SQL LIKE wildcards; never return bodies in the list.
    const pattern = '%' + params.q.trim().replace(/[\\%_]/g, c => '\\' + c) + '%';
    conditions.push(or(...[email.title, email.fromName, email.fromAddress, email.toAddress, email.bodyText]
      .map(column => sql`${column} LIKE ${pattern} ESCAPE ${'\\'}`))!);
  }
  return and(...conditions)!;
}

const emailDB = {
  async getBody(id: number): Promise<Pick<Email, 'bodyText' | 'bodyHtml'> | null> {
    const rows = await getDb().select({ bodyText: email.bodyText, bodyHtml: email.bodyHtml })
      .from(email).where(eq(email.id, id)).limit(1);
    return rows[0] ?? null;
  },

  async list(params: ListParams = {}): Promise<Email[]> {
    const { limit = 100, offset = 0, folder = 'inbox' } = params;
    const listColumns = {
      ...getTableColumns(email),
      bodyText: sql<null>`null`,
      bodyHtml: sql<null>`null`,
    };
    const date = folder === 'trash' ? email.deletedAt : folder === 'archive' ? email.archivedAt : email.sentAt;
    return await getDb().select(listColumns).from(email).where(listCondition(params))
      .orderBy(desc(date), desc(email.id)).limit(limit).offset(offset) as Email[];
  },

  async count(params: ListParams = {}): Promise<number> {
    const rows = await getDb().select({ count: sql<number>`count(*)` }).from(email).where(listCondition(params));
    return rows[0]?.count || 0;
  },

  async archive(items: number[]): Promise<void> {
    await getDb().update(email).set({ archivedAt: new Date().toISOString() })
      .where(and(inArray(email.id, items), folderCondition('inbox')));
  },

  async delete(items: number[] = []): Promise<void> {
    const db = getDb();
    await db.update(email).set({ deletedAt: new Date().toISOString(), archivedAt: sql`null` })
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
    await db.update(email).set({ deletedAt: sql`null`, archivedAt: sql`null` })
      .where(and(inArray(email.id, items), or(isNotNull(email.deletedAt), isNotNull(email.archivedAt))));
  },

  async trashExpiredByType(env: CloudflareEnv, types: string[], expiredDate: string, now: string): Promise<number> {
    if (types.length === 0) return 0;
    const db = getDbFromEnv(env);
    const result = await db.update(email).set({ deletedAt: now })
      .where(and(inArray(email.emailType, types), lt(email.sentAt, expiredDate), isNull(email.deletedAt), isNull(email.archivedAt)));
    return result.meta.changes;
  },

  async purgeExpiredTrash(env: CloudflareEnv, cutoff: string): Promise<number> {
    const db = getDbFromEnv(env);
    // A single conditional DELETE protects restored messages from concurrent purges.
    const result = await db.delete(email)
      .where(and(isNotNull(email.deletedAt), isNull(email.archivedAt), lt(email.deletedAt, cutoff)));
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

  async getAllRecipients(folder: EmailFolder = 'inbox'): Promise<string[]> {
    const db = getDb();

    const recipients = await db
      .select({ toAddress: email.toAddress })
      .from(email)
      .where(and(isNotNull(email.toAddress), folderCondition(folder)))
      .groupBy(email.toAddress)
      .orderBy(email.toAddress);

    return recipients.map(r => r.toAddress).filter(Boolean) as string[];
  },
};

export default emailDB;
