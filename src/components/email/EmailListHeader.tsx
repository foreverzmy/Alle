"use client";

import { RefreshCw, Settings2, Square, CheckSquare, Trash2, RotateCcw, Archive, Search, X, Mail } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import DeleteDialog from '@/components/common/DeleteDialog';
import useTranslation from '@/lib/hooks/useTranslation';
import useEmailStore from '@/lib/store/email';
import type { EmailFolder } from '@/types';
import type { ReadStatusFilter } from '@/lib/store/email';
import { cn } from '@/lib/utils/utils';

interface Props {
  selectedEmails: Set<number>; loading: boolean; mutationPending: boolean;
  onRefresh: () => void; onToggleSelectAll: () => void;
  onBatchDelete: () => Promise<void> | void; onBatchArchive: () => Promise<void> | void;
  onClearSelection: () => void; onOpenSettings: () => void;
}

export default function EmailListHeader({ selectedEmails, loading, mutationPending, onRefresh, onToggleSelectAll,
  onBatchDelete, onBatchArchive, onClearSelection, onOpenSettings }: Props) {
  const { t } = useTranslation();
  const { folder, setFolder, filters, updateFilters, total, emails } = useEmailStore();
  const [search, setSearch] = useState(filters.q);
  useEffect(() => setSearch(filters.q), [filters.q, folder]);
  const isTrash = folder === 'trash';
  const isArchive = folder === 'archive';
  const count = selectedEmails.size;

  return <header className="shrink-0 border-b bg-card">
    <div className="flex items-center justify-between px-5 pb-2 pt-4 md:hidden">
      <span className="flex items-center gap-2 text-xl font-semibold tracking-tight"><Mail className="size-5 text-primary" />Alle<span className="-ml-2 text-primary">.</span></span>
      <Button variant="ghost" size="icon-sm" onClick={onOpenSettings} disabled={mutationPending} aria-label={t('settings')}><Settings2 /></Button>
    </div>
    <nav className="mx-5 flex gap-1 border-b pb-2 md:hidden" aria-label={t('mailFolders')}>
      {(['inbox', 'archive', 'trash'] as EmailFolder[]).map(item => <Button key={item} size="sm" variant="ghost"
        className={cn('flex-1', folder === item && 'bg-primary/8 text-primary')}
        aria-current={folder === item ? 'page' : undefined} disabled={mutationPending}
        onClick={() => { onClearSelection(); setFolder(item); }}>{t(item)}</Button>)}
    </nav>
    <div className="flex items-center justify-between px-5 pb-3 pt-4 md:pt-5">
      <div>
        <h1 className="text-[23px] font-semibold tracking-[-0.7px]">{t(folder === 'inbox' && filters.readStatus === 'unread' ? 'unreadMail' : folder)}</h1>
        <p className="mt-1 text-xs text-muted-foreground">{t('emailsCount', { count: total })}</p>
      </div>
      <Button variant="ghost" size="icon-sm" className="text-muted-foreground" onClick={onRefresh} disabled={loading} aria-label={t('refresh')} title={t('refresh')}>
        <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
      </Button>
    </div>
    <form className="relative mx-5 mb-3" onSubmit={event => {
      event.preventDefault(); if (!mutationPending) { onClearSelection(); updateFilters({ q: search.trim() }); }
    }}>
      <Input value={search} maxLength={200} disabled={mutationPending} aria-label={t('searchEmails')}
        placeholder={t('searchEmails')} className="h-10 border-transparent bg-muted/75 pl-10 pr-10 text-[13px] shadow-none focus-visible:border-primary/30 focus-visible:ring-primary/10"
        onChange={event => setSearch(event.target.value)} />
      <Button type="submit" variant="ghost" size="icon-sm" className="absolute left-1 top-1 text-muted-foreground" disabled={mutationPending} aria-label={t('search')}><Search className="size-4" /></Button>
      {search && <Button type="button" variant="ghost" size="icon-sm" className="absolute right-1 top-1 text-muted-foreground" disabled={mutationPending} aria-label={t('clearSearch')}
        onClick={() => { setSearch(''); onClearSelection(); updateFilters({ q: '' }); }}><X className="size-3.5" /></Button>}
    </form>
    <div className="flex min-h-11 items-center justify-between gap-2 px-5 pb-2">
      {count ? <>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" disabled={mutationPending} aria-label={t('selectAll')} onClick={onToggleSelectAll}>
            {count === emails.length ? <CheckSquare className="text-primary" /> : <Square />}
          </Button>
          <span className="text-xs text-primary">{t('selectedCount', { count })}</span>
        </div>
        <div className="flex items-center gap-1">
          {!isTrash && <DeleteDialog tone="neutral" trigger={<Button variant="ghost" size="icon-sm" disabled={mutationPending} aria-label={t(isArchive ? 'restore' : 'archive')} title={t(isArchive ? 'restore' : 'archive')}>
            {isArchive ? <RotateCcw /> : <Archive />}</Button>} title={t(isArchive ? 'restoreConfirm' : 'archiveConfirm')}
            description={t(isArchive ? 'batchRestoreDesc' : 'batchArchiveDesc', { count })} onConfirm={onBatchArchive} cancelText={t('cancel')} confirmText={t(isArchive ? 'restore' : 'archive')} />}
          <DeleteDialog tone={isTrash ? 'neutral' : 'destructive'} trigger={<Button variant="ghost" size="icon-sm" disabled={mutationPending} aria-label={t(isTrash ? 'restore' : 'delete')} title={t(isTrash ? 'restore' : 'delete')} className="hover:text-destructive">
            {isTrash ? <RotateCcw /> : <Trash2 />}</Button>} title={t(isTrash ? 'restoreConfirm' : 'batchDeleteConfirm')}
            description={t(isTrash ? 'batchRestoreDesc' : 'batchDeleteDesc', { count })} onConfirm={onBatchDelete} cancelText={t('cancel')} confirmText={t(isTrash ? 'restore' : 'delete')} />
          <Button variant="ghost" size="icon-sm" disabled={mutationPending} onClick={onClearSelection} aria-label={t('clearSelection')}><X /></Button>
        </div>
      </> : <>
        <div className="flex items-center gap-0.5" role="group" aria-label={t('readStatusFilter')}>
          {(['all', 'unread', 'read'] as ReadStatusFilter[]).map(status => <Button key={status} variant="ghost" size="sm" disabled={mutationPending}
            aria-pressed={filters.readStatus === status} className={cn('h-7 px-2.5 text-xs text-muted-foreground', filters.readStatus === status && 'bg-primary/8 text-primary')}
            onClick={() => { onClearSelection(); updateFilters({ readStatus: status }); }}>{t(status === 'all' ? 'allMail' : status === 'unread' ? 'unreadMail' : 'readMail')}</Button>)}
        </div>
        <Button variant="ghost" size="icon-sm" className="text-muted-foreground" disabled={mutationPending || !emails.length} onClick={onToggleSelectAll} aria-label={t('selectAll')} title={t('selectAll')}><Square /></Button>
      </>}
    </div>
  </header>;
}
