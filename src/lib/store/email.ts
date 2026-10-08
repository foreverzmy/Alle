import { create } from 'zustand';

import type { Email, ExtractResultType, EmailFolder } from '@/types';

export type ReadStatusFilter = 'all' | 'read' | 'unread';

export interface EmailFilters {
  readStatus: ReadStatusFilter;
  emailTypes: ExtractResultType[];
  recipients: string[];
  q: string;
}

const createDefaultFilters = (): EmailFilters => ({
  readStatus: 'all',
  emailTypes: [],
  recipients: [],
  q: '',
});

const dedupeEmails = (emails: Email[]): Email[] => {
  const map = new Map<number, Email>();
  for (const email of emails) {
    map.set(email.id, email);
  }
  return Array.from(map.values()).sort((a, b) => {
    const dateA = a.deletedAt || a.archivedAt || a.sentAt;
    const dateB = b.deletedAt || b.archivedAt || b.sentAt;
    return (dateB ? new Date(dateB).getTime() : 0) - (dateA ? new Date(dateA).getTime() : 0) || b.id - a.id;
  });
};

interface EmailStoreState {
  folder: EmailFolder;
  setFolder: (folder: EmailFolder) => void;
  emails: Email[];
  total: number;
  hasMore: boolean;
  selectedEmailId: number | null;
  openedEmail: Email | null;
  settingsOpen: boolean;
  lastSyncedAt: string | null;
  visibleEmailId: number | null;
  filters: EmailFilters;
  setEmails: (emails: Email[], total: number, hasMore: boolean) => void;
  appendEmails: (emails: Email[], total: number, hasMore: boolean) => void;
  selectEmail: (emailId: number | null) => void;
  setSettingsOpen: (open: boolean) => void;
  setLastSyncedAt: (sentAt: string | null) => void;
  setVisibleEmailId: (emailId: number | null) => void;
  removeEmail: (emailId: number) => void;
  removeEmails: (emailIds: number[]) => void;
  markEmail: (emailId: number, isRead: boolean) => void;
  updateFilters: (partial: Partial<EmailFilters>) => void;
  resetFilters: () => void;
}

const useEmailStore = create<EmailStoreState>((set, get) => ({
  folder: 'inbox',
  setFolder: (folder) => set(state => folder === state.folder ? state : {
    folder, filters: createDefaultFilters(), emails: [], total: 0, selectedEmailId: null, openedEmail: null, visibleEmailId: null,
  }),
  emails: [],
  total: 0,
  hasMore: false,
  selectedEmailId: null,
  openedEmail: null,
  settingsOpen: false,
  lastSyncedAt: null,
  visibleEmailId: null,
  filters: createDefaultFilters(),
  setEmails: (emails, total, hasMore) => {
    set({
      emails: dedupeEmails(emails),
      total,
      hasMore,
      openedEmail: emails.find(email => email.id === get().selectedEmailId) ?? get().openedEmail,
      lastSyncedAt: emails.length ? emails[0].sentAt ?? null : get().lastSyncedAt,
    });
  },
  appendEmails: (emails, total, hasMore) => {
    const nextEmails = dedupeEmails([...get().emails, ...emails]);
    set({
      emails: nextEmails,
      total,
      hasMore,
      lastSyncedAt: nextEmails.length ? nextEmails[0].sentAt ?? null : get().lastSyncedAt,
    });
  },
  selectEmail: (emailId) => set({ selectedEmailId: emailId, openedEmail: get().emails.find(email => email.id === emailId) ?? null }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  setLastSyncedAt: (sentAt) => set({ lastSyncedAt: sentAt }),
  setVisibleEmailId: (emailId) => set({ visibleEmailId: emailId }),
  removeEmail: (emailId) => {
    const nextEmails = get().emails.filter((email) => email.id !== emailId);
    set({
      emails: nextEmails,
      total: Math.max(0, get().total - 1),
      selectedEmailId: get().selectedEmailId === emailId ? null : get().selectedEmailId,
      openedEmail: get().openedEmail?.id === emailId ? null : get().openedEmail,
    });
  },
  removeEmails: (emailIds) => {
    const idSet = new Set(emailIds);
    const nextEmails = get().emails.filter((email) => !idSet.has(email.id));
    const selectedId = get().selectedEmailId;
    set({
      emails: nextEmails,
      total: Math.max(0, get().total - emailIds.length),
      selectedEmailId: selectedId && idSet.has(selectedId) ? null : selectedId,
      openedEmail: get().openedEmail && idSet.has(get().openedEmail!.id) ? null : get().openedEmail,
    });
  },
  markEmail: (emailId, isRead) => {
    const readStatusValue = isRead ? 1 : 0;
    set((state) => ({
      openedEmail: state.openedEmail?.id === emailId ? { ...state.openedEmail, readStatus: readStatusValue } : state.openedEmail,
      emails: state.emails.map((email) =>
        email.id === emailId ? { ...email, readStatus: readStatusValue } : email,
      ),
    }));
  },
  updateFilters: (partial) => {
    set((state) => {
      const filters = { ...state.filters, ...partial };
      if (JSON.stringify(filters) === JSON.stringify(state.filters)) return state;
      return { filters, emails: [], total: 0, selectedEmailId: null, openedEmail: null, visibleEmailId: null };
    });
  },
  resetFilters: () => {
    get().updateFilters(createDefaultFilters());
  },
}));

export default useEmailStore;
