"use client";

import { useEffect } from 'react';
import { Mail, Archive, Check, Inbox, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSettingsStore } from '@/lib/store/settings';
import EmailContent from '@/components/email/EmailContent';
import EmailAvatar from '@/components/email/EmailAvatar';
import EmailEditResult from '@/components/email/EmailEditResult';
import { useMarkEmail, useEmailBody } from '@/lib/hooks/useEmailApi';
import useTranslation from '@/lib/hooks/useTranslation';
import { Button } from '@/components/ui/button';
import type { Email } from '@/types';

export default function EmailDetail({ email, onClose }: { email: Email | null; onClose?: () => void }) {
  const { editMode } = useSettingsStore();
  const { mutate: markEmail } = useMarkEmail();
  const { t, language } = useTranslation();
  const body = useEmailBody(email?.id);
  useEffect(() => {
    if (!email || email.readStatus === 1 || email.deletedAt || email.archivedAt) return;
    markEmail({ emailId: email.id, isRead: true });
  }, [email, markEmail]);

  if (!email) return <div className="flex h-full flex-col">
    <div className="flex h-[60px] shrink-0 items-center gap-2 border-b px-7 text-xs text-muted-foreground"><Mail className="size-3.5" strokeWidth={1.7} />{t('readingPane')}</div>
    <div className="flex flex-1 items-center justify-center bg-muted/20 px-8">
      <div className="mb-12 max-w-[320px] text-center">
        <div className="relative mx-auto mb-8 flex h-[108px] w-[132px] items-center justify-center">
          <div className="absolute inset-x-4 inset-y-3 rotate-[-8deg] rounded-2xl border bg-card" />
          <div className="relative flex h-[82px] w-[108px] items-center justify-center rounded-2xl border bg-card shadow-[0_4px_18px_-12px_rgba(38,52,47,0.25)]"><Mail className="size-8 text-primary/65" strokeWidth={1} /></div>
          <span className="absolute bottom-1 right-0 flex size-7 items-center justify-center rounded-full border-4 border-background bg-primary/12 text-primary"><Check className="size-3" /></span>
        </div>
        <h2 className="text-xl font-medium tracking-tight">{t('readerEmptyTitle')}</h2>
        <p className="mt-3 text-[13px] leading-7 text-muted-foreground">{t('readerEmptyDesc')}</p>
        <div className="mt-6 flex justify-center gap-6 border-t pt-6 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5"><Inbox className="size-3.5" />{t('inbox')}</span>
          <span className="flex items-center gap-1.5"><Archive className="size-3.5" />{t('archive')}</span>
        </div>
      </div>
    </div>
  </div>;

  const date = email.sentAt ? new Date(email.sentAt) : null;
  const time = date && !Number.isNaN(date.getTime()) ? date.toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
  return <div className="flex h-full min-w-0 flex-col bg-card">
    <div className="flex h-[60px] shrink-0 items-center justify-between gap-2 border-b px-6 text-xs text-muted-foreground lg:px-9">
      <span className="flex items-center gap-2"><Mail className="size-3.5" strokeWidth={1.7} />{t(email.deletedAt ? 'trash' : email.archivedAt ? 'archive' : 'inbox')}<span className="text-border">/</span>{t('readingPane')}</span>
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 text-[10px]"><span className="size-1 rounded-full bg-primary/60" />{t(email.readStatus === 1 ? 'readMail' : 'unreadMail')}</span>
        {onClose && <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label={t('close')}><X className="size-4" /></Button>}
      </div>
    </div>
    <ScrollArea className="min-h-0 flex-1">
      <div className="mx-auto max-w-[860px] px-6 py-6 lg:px-8 lg:py-8">
        <h2 className="break-words text-[23px] font-semibold leading-[1.45] tracking-[-0.7px] xl:text-[28px]">{email.title || t('noSubject')}</h2>
        <div className="mt-6 flex items-start gap-3 border-b pb-5">
          <EmailAvatar name={email.fromName || email.fromAddress || '?'} fromAddress={email.fromAddress} className="size-10" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p className="break-all text-[13px] font-medium">{email.fromName || email.fromAddress}</p><time className="text-[11px] tabular-nums text-muted-foreground">{time}</time>
            </div>
            <p className="mt-1 break-all text-[11px] text-muted-foreground">{email.fromAddress}</p>
            <p className="mt-1 break-all text-[11px] text-muted-foreground">{t('to')} · {email.toAddress}</p>
          </div>
        </div>
        {editMode && !email.deletedAt && <div className="border-b py-5"><EmailEditResult email={email} /></div>}
        <div className="pt-6">
          {body.isPending ? <p className="text-sm text-muted-foreground" role="status">{t('loading')}</p> : body.isError ? <div role="alert">
            <p className="mb-3 text-sm text-destructive">{t('emailBodyError')}</p>
            <Button variant="outline" disabled={body.isFetching} onClick={() => body.refetch()}>{t('retry')}</Button>
          </div> : <EmailContent key={email.id} bodyHtml={body.data.bodyHtml} bodyText={body.data.bodyText} />}
        </div>
      </div>
    </ScrollArea>
  </div>;
}
