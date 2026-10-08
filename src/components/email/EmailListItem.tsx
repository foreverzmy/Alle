"use client";

import { Check, Circle } from 'lucide-react';
import { useMemo } from 'react';
import { useEmailListInteractions } from '@/components/email/EmailListInteractionsContext';
import useTranslation from '@/lib/hooks/useTranslation';
import useFormatTime from '@/lib/hooks/useFormatTime';
import EmailAvatar from '@/components/email/EmailAvatar';
import EmailActions from '@/components/email/EmailActions';
import VerificationDisplay from '@/components/email/VerificationDisplay';
import { cn } from '@/lib/utils/utils';
import type { Email } from '@/types';

interface Props { email: Email; index: number; isSelected: boolean; isEmailSelected: boolean; }

export default function EmailListItem({ email, isSelected, isEmailSelected }: Props) {
  const { t } = useTranslation();
  const formatTime = useFormatTime();
  const { onEmailClick, onAvatarToggle, mutationPending } = useEmailListInteractions();
  const formattedTime = useMemo(() => formatTime(email.sentAt), [formatTime, email.sentAt]);
  const name = email.fromName || email.fromAddress || t('unknownSender');
  const unread = email.readStatus !== 1;

  return <div className={cn('group relative cursor-pointer border-b border-border/65 px-5 py-3 transition-colors hover:bg-muted/65',
    isSelected && 'bg-primary/6 hover:bg-primary/8', isEmailSelected && 'bg-primary/6')} onClick={event => { event.stopPropagation(); onEmailClick(email); }}>
    {isSelected && <span className="absolute inset-y-4 left-0 w-[3px] rounded-r bg-primary" />}
    <div className="flex gap-3">
      <button type="button" disabled={mutationPending} aria-label={t('selectEmail', { name })} aria-pressed={isEmailSelected}
        onClick={event => onAvatarToggle(email, event)} className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">
        {isEmailSelected ? <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Check className="size-4" /></span> : <EmailAvatar name={name} fromAddress={email.fromAddress} />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <button type="button" className={cn('flex min-w-0 items-center gap-1.5 rounded text-left text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring', unread ? 'font-semibold' : 'font-medium')}
            onClick={event => { event.stopPropagation(); onEmailClick(email); }}>
            <span className="truncate">{name}</span>{unread && <Circle className="size-[5px] shrink-0 fill-primary text-primary" />}
          </button>
          <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">{formattedTime}</span>
        </div>
        <button type="button" className="mt-1 block w-full truncate rounded text-left text-[13px] leading-relaxed text-foreground/80 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={event => { event.stopPropagation(); onEmailClick(email); }}>{email.title || t('noSubject')}</button>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="min-w-0 truncate text-[10px] text-muted-foreground">{email.deletedAt ? t('trashedAt', { time: formatTime(email.deletedAt) }) : email.archivedAt ? t('archivedAt', { time: formatTime(email.archivedAt) }) : email.toAddress}</span>
          <EmailActions emailId={email.id} emailName={name} isSelectionMode={isEmailSelected} />
        </div>
        <VerificationDisplay email={email} />
      </div>
    </div>
  </div>;
}
