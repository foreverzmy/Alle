"use client";

import { Archive, Inbox, Mail, Settings2, Trash2, Circle } from 'lucide-react';
import useEmailStore from '@/lib/store/email';
import useTranslation from '@/lib/hooks/useTranslation';
import { Button } from '@/components/ui/button';
import type { EmailFolder } from '@/types';
import { cn } from '@/lib/utils/utils';

export default function EmailNavigation({ pending, onNavigate, onSettings }: {
  pending: boolean; onNavigate: () => void; onSettings: () => void;
}) {
  const { t } = useTranslation();
  const { folder, filters, setFolder, resetFilters, updateFilters, total, settingsOpen } = useEmailStore();
  const items = [
    { key: 'inbox', icon: Inbox, folder: 'inbox' as EmailFolder, unread: false },
    { key: 'unreadMail', icon: Circle, folder: 'inbox' as EmailFolder, unread: true },
    { key: 'archive', icon: Archive, folder: 'archive' as EmailFolder, unread: false },
    { key: 'trash', icon: Trash2, folder: 'trash' as EmailFolder, unread: false },
  ];

  return <aside className="hidden shrink-0 flex-col border-r bg-sidebar px-3 py-6 md:flex md:w-[76px] xl:w-[188px] xl:px-5">
    <div className="mb-7 flex items-center gap-3 px-1 xl:px-2">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Mail className="size-[18px]" strokeWidth={1.7} /></div>
      <span className="hidden text-[25px] font-semibold tracking-[-1px] xl:block">Alle<span className="text-primary">.</span></span>
    </div>
    <p className="mb-3 hidden px-3 text-[10px] font-medium tracking-[0.16em] text-muted-foreground xl:block">{t('workspace')}</p>
    <nav className="space-y-1" aria-label={t('mailFolders')}>
      {items.map(({ key, icon: Icon, folder: target, unread }) => {
        const active = !settingsOpen && folder === target && (target !== 'inbox' || (filters.readStatus === 'unread') === unread);
        return <Button key={key} title={t(key)} aria-label={t(key)} aria-current={active ? 'page' : undefined}
          variant="ghost" disabled={pending} className={cn('h-10 w-full justify-center rounded-lg px-3 text-muted-foreground xl:justify-start', active && 'bg-primary/8 text-primary hover:bg-primary/10 hover:text-primary')}
          onClick={() => { onNavigate(); useEmailStore.getState().setSettingsOpen(false); setFolder(target); resetFilters(); if (unread) updateFilters({ readStatus: 'unread' }); }}>
          <Icon className="size-[17px]" strokeWidth={1.7} />
          <span className="hidden xl:block">{t(key)}</span>
          {active && total > 0 && <span className="ml-auto hidden rounded-md bg-primary/8 px-1.5 text-[11px] tabular-nums xl:block">{total}</span>}
        </Button>;
      })}
    </nav>
    <div className="mt-auto pt-8">
      <Button variant="ghost" title={t('settings')} aria-label={t('settings')} disabled={pending}
        className={cn('h-10 w-full justify-center text-muted-foreground xl:justify-start', settingsOpen && 'bg-accent text-foreground')} onClick={onSettings}>
        <Settings2 className="size-[17px]" strokeWidth={1.7} /><span className="hidden xl:block">{t('settings')}</span>
      </Button>
      <div className="mt-4 hidden border-t px-3 pt-4 xl:block">
        <p className="text-xs font-medium text-foreground">{t('personalMailbox')}</p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{t('workspaceNote')}</p>
      </div>
    </div>
  </aside>;
}
