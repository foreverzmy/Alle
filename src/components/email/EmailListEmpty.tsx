"use client";

import { Inbox, Search, RefreshCw, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useTranslation from '@/lib/hooks/useTranslation';
import useEmailStore from '@/lib/store/email';

export default function EmailListEmpty({ onRefresh }: { onRefresh: () => void }) {
  const { t } = useTranslation();
  const { folder, filters } = useEmailStore();
  const Icon = filters.q ? Search : folder === 'archive' ? Archive : Inbox;
  return <div className="flex h-full flex-col items-center justify-center px-8 pb-16 text-center">
    <div className="mb-5 flex size-14 items-center justify-center rounded-2xl border bg-muted/40"><Icon className="size-5 text-primary/65" strokeWidth={1.4} /></div>
    <h3 className="text-sm font-medium">{t(filters.q ? 'noResultsTitle' : 'noEmails')}</h3>
    <p className="mb-5 mt-2 max-w-[220px] text-xs leading-6 text-muted-foreground">{t(filters.q ? 'noSearchResults' : folder === 'inbox' ? filters.readStatus === 'unread' ? 'unreadEmptyDesc' : 'inboxEmptyDesc' : 'emptyFolderDesc')}</p>
    <Button variant="outline" size="sm" onClick={onRefresh} className="text-xs shadow-none"><RefreshCw className="size-3" />{t('refreshEmails')}</Button>
  </div>;
}
