"use client";

import { useEffect, useId, useRef, useState } from 'react';
import { Mail, Archive, Check, ChevronDown, Inbox, X } from 'lucide-react';
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
  const { t } = useTranslation();

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

  // Remount the reader when selecting another message: reset body scroll and details.
  return <EmailReader key={email.id} email={email} onClose={onClose} />;
}

function EmailReader({ email, onClose }: { email: Email; onClose?: () => void }) {
  const { editMode } = useSettingsStore();
  const { t, language } = useTranslation();
  const body = useEmailBody(email.id);
  const { mutate: markEmail, isError: markFailed, isPending: markingRead } = useMarkEmail();
  const attemptedRead = useRef(false);
  useEffect(() => {
    // Mark only a successfully loaded, opened message. Archiving alone preserves its status.
    // One automatic attempt per opening also avoids duplicate requests and silent retry loops.
    if (!body.isSuccess || email.readStatus === 1 || email.deletedAt || attemptedRead.current) return;
    attemptedRead.current = true;
    markEmail({ emailId: email.id, isRead: true });
  }, [body.isSuccess, email.id, email.readStatus, email.deletedAt, markEmail]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const detailsId = useId();
  const titleId = useId();
  const date = email.sentAt ? new Date(email.sentAt) : null;
  const validDate = date && !Number.isNaN(date.getTime()) ? date : null;
  const locale = language === 'zh' ? 'zh-CN' : 'en-US';
  const time = validDate ? validDate.toLocaleString(locale, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
  const compactTime = validDate ? validDate.toLocaleString(locale, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : '';
  return <section aria-labelledby={titleId} className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-card">
    <header className="shrink-0 border-b bg-card">
      <div className="mx-auto max-w-[860px] px-5 py-2.5 lg:px-8 lg:py-3">
        <div className="flex items-start gap-2">
          <h2 id={titleId} className="min-w-0 flex-1 line-clamp-2 break-words text-base font-semibold leading-snug tracking-tight [@media(max-height:520px)]:line-clamp-1 lg:text-lg">{email.title || t('noSubject')}</h2>
          <span className="mt-1 flex h-4 shrink-0 items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className="size-1 rounded-full bg-primary/60" /><span className="sr-only sm:not-sr-only">{t(email.readStatus === 1 ? 'readMail' : 'unreadMail')}</span>
          </span>
        </div>
        <div className="mt-1 flex min-w-0 items-center gap-2">
          <EmailAvatar name={email.fromName || email.fromAddress || '?'} fromAddress={email.fromAddress} className="size-6 shrink-0" />
          <p className="min-w-0 flex-1 truncate text-xs font-medium">{email.fromName || email.fromAddress || t('unknownSender')}</p>
          <time dateTime={validDate?.toISOString()} title={time} className="shrink-0 text-[10px] tabular-nums text-muted-foreground">{compactTime}</time>
          <Button variant="ghost" size="sm" className="h-8 gap-1 px-1.5 text-[11px] text-muted-foreground" aria-expanded={detailsOpen} aria-controls={detailsId} onClick={() => {
            setDetailsOpen(!detailsOpen);
            if (!detailsOpen) scrollAreaRef.current?.querySelector('[data-slot="scroll-area-viewport"]')?.scrollTo({ top: 0 });
          }}>
            {t(detailsOpen ? 'hideMessageDetails' : 'showMessageDetails')}
            <ChevronDown className={`size-3 transition-transform ${detailsOpen ? 'rotate-180' : ''}`} />
          </Button>
          {onClose && <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label={t('close')} className="text-muted-foreground"><X className="size-4" /></Button>}
        </div>
      </div>
    </header>
    <ScrollArea ref={scrollAreaRef} className="min-h-0 flex-1" role="region" aria-label={t('messageBody')}>
      <div className="mx-auto max-w-[860px] px-5 py-5 lg:px-8 lg:py-6">
        {markFailed && email.readStatus !== 1 && !email.deletedAt && <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-xs">
          <p className="text-muted-foreground">{t('markReadError')}</p>
          <Button variant="outline" size="sm" disabled={markingRead} aria-label={t('retryMarkRead')} onClick={() => markEmail({ emailId: email.id, isRead: true })}>{t('retry')}</Button>
        </div>}
        <div id={detailsId} hidden={!detailsOpen}>
          <dl className="mb-5 space-y-3 rounded-lg border bg-muted/30 p-4 text-xs">
            {[
              [t('subject'), email.title || t('noSubject')],
              [t('from'), `${email.fromName || ''}${email.fromName && email.fromAddress ? ' · ' : ''}${email.fromAddress || ''}` || t('unknownSender')],
              [t('to'), email.toAddress],
              [t('sentAt'), time],
            ].map(([label, value]) => <div key={label} className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3">
              <dt className="text-muted-foreground">{label}</dt><dd className="break-words [overflow-wrap:anywhere]">{value}</dd>
            </div>)}
          </dl>
        </div>
        {editMode && !email.deletedAt && <div className="border-b py-5"><EmailEditResult email={email} /></div>}
        <div className={editMode && !email.deletedAt ? 'pt-5' : undefined}>
          {body.isPending ? <p className="text-sm text-muted-foreground" role="status">{t('loading')}</p> : body.isError ? <div role="alert">
            <p className="mb-3 text-sm text-destructive">{t('emailBodyError')}</p>
            <Button variant="outline" disabled={body.isFetching} onClick={() => body.refetch()}>{t('retry')}</Button>
          </div> : <EmailContent key={email.id} bodyHtml={body.data.bodyHtml} bodyText={body.data.bodyText} />}
        </div>
      </div>
    </ScrollArea>
  </section>;
}
