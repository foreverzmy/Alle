"use client";

import { Trash2, RotateCcw, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEmailListInteractions } from '@/components/email/EmailListInteractionsContext';
import DeleteDialog from '@/components/common/DeleteDialog';
import useEmailStore from '@/lib/store/email';
import useTranslation from '@/lib/hooks/useTranslation';

export default function EmailActions({ emailId, emailName, isSelectionMode }: {
  emailId: number; emailName: string; isSelectionMode: boolean;
}) {
  const folder = useEmailStore(state => state.folder);
  const isTrash = folder === 'trash';
  const isArchive = folder === 'archive';
  const { t } = useTranslation();
  const { onEmailDelete, onEmailArchive, mutationPending } = useEmailListInteractions();
  if (isSelectionMode || !onEmailDelete) return <div className="h-8 md:h-6" />;
  return <div className="flex shrink-0 items-center gap-0.5 text-muted-foreground md:opacity-0 md:transition-opacity md:group-hover:opacity-100 md:group-focus-within:opacity-100">
    {!isTrash && onEmailArchive && <DeleteDialog tone="neutral"
      trigger={<Button variant="ghost" size="icon-sm" className="size-8 rounded-md md:size-6" disabled={mutationPending}
        aria-label={t(isArchive ? 'restore' : 'archive')} title={t(isArchive ? 'restore' : 'archive')}
        onClick={event => event.stopPropagation()}>{isArchive ? <RotateCcw className="size-3.5" /> : <Archive className="size-3.5" />}</Button>}
      title={t(isArchive ? 'restoreConfirm' : 'archiveConfirm')}
      description={t(isArchive ? 'restoreDescWithName' : 'archiveDescWithName', { name: emailName })}
      onConfirm={event => { event?.stopPropagation(); return onEmailArchive(emailId); }} cancelText={t('cancel')} confirmText={t(isArchive ? 'restore' : 'archive')} />}
    <DeleteDialog tone={isTrash ? 'neutral' : 'destructive'}
      trigger={<Button variant="ghost" size="icon-sm" className="size-8 rounded-md hover:bg-destructive/8 hover:text-destructive md:size-6" disabled={mutationPending}
        aria-label={t(isTrash ? 'restore' : 'delete')} title={t(isTrash ? 'restore' : 'delete')} onClick={event => event.stopPropagation()}>
        {isTrash ? <RotateCcw className="size-3.5" /> : <Trash2 className="size-3.5" />}</Button>}
      title={t(isTrash ? 'restoreConfirm' : 'deleteConfirm')} description={t(isTrash ? 'restoreDescWithName' : 'deleteDescWithName', { name: emailName })}
      onConfirm={event => { event?.stopPropagation(); return onEmailDelete(emailId); }} cancelText={t('cancel')} confirmText={t(isTrash ? 'restore' : 'delete')} />
  </div>;
}
