"use client";

import { useCallback, useState, useTransition, useEffect, type MouseEvent } from "react";
import { useDevice } from "@/provider/Device";
import useEmailStore from "@/lib/store/email";
import { useDeleteEmail, useBatchDeleteEmails, useEmailListInfinite, useRestoreEmails, useArchiveEmails } from "@/lib/hooks/useEmailApi";
import type { Email } from "@/types";
import EmailListHeader from "@/components/email/EmailListHeader";
import EmailListContent from "@/components/email/EmailListContent";
import { EmailListInteractionsProvider } from "@/components/email/EmailListInteractionsContext";
import MobileEmailDrawer from "@/components/email/MobileEmailDrawer";
import MobileSettingsDrawer from "@/components/email/MobileSettingsDrawer";
import EmailDetail from "@/components/email/EmailDetail";
import useTranslation from "@/lib/hooks/useTranslation";
import Settings from "@/components/Settings";

export default function EmailList() {
  const { t } = useTranslation();
  const { isMobile } = useDevice();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState<Set<number>>(new Set());
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);
  const [, startTransition] = useTransition();

  // 数据获取逻辑
  const { data, isLoading, isFetching, refetch, fetchNextPage, hasNextPage } = useEmailListInfinite();
  const emails = useEmailStore((state) => state.emails);
  const selectedEmailId = useEmailStore((state) => state.selectedEmailId);
  const openedEmail = useEmailStore(state => state.openedEmail);
  const selectEmail = useEmailStore((state) => state.selectEmail);
  const settingsOpen = useEmailStore((state) => state.settingsOpen);
  const setSettingsOpen = useEmailStore((state) => state.setSettingsOpen);

  const folder = useEmailStore((state) => state.folder);
  const restoreMutation = useRestoreEmails();
  const archiveMutation = useArchiveEmails();
  const filters = useEmailStore(state => state.filters);

  useEffect(() => {
    setSelectedEmails(new Set());
    setIsMobileDrawerOpen(false);
  }, [folder, filters]);

  const deleteEmailMutation = useDeleteEmail();
  const batchDeleteMutation = useBatchDeleteEmails();
  const mutationPending = deleteEmailMutation.isPending || batchDeleteMutation.isPending || restoreMutation.isPending || archiveMutation.isPending;

  useEffect(() => {
    if (data) {
      const allEmails = data.pages.flatMap((page) => page.emails);
      const total = data.pages[data.pages.length - 1]?.total || 0;
      const loadedCount = allEmails.length;
      const hasMore = loadedCount < total;
      useEmailStore.getState().setEmails(allEmails, total, hasMore);
    }
  }, [data]);

  const loading = isLoading || isFetching;
  const selectedEmail = emails.find((e) => e.id === selectedEmailId) || (openedEmail?.id === selectedEmailId ? openedEmail : null);

  const handleEmailClick = useCallback(
    (email: Email) => {
      startTransition(() => {
        selectEmail(email.id);
        setSettingsOpen(false);
      });
      if (isMobile) {
        setIsMobileDrawerOpen(true);
      }
    },
    [isMobile, selectEmail, setSettingsOpen],
  );

  const handleAvatarToggle = useCallback((email: Email, event: MouseEvent) => {
    event.stopPropagation();
    setSelectedEmails((prev) => {
      const next = new Set(prev);
      if (next.has(email.id)) {
        next.delete(email.id);
      } else {
        next.add(email.id);
      }
      return next;
    });
  }, []);

  const handleEmailDelete = useCallback(
    (emailId: number) => folder === 'trash'
      ? restoreMutation.mutateAsync([emailId])
      : deleteEmailMutation.mutateAsync(emailId),
    [deleteEmailMutation, restoreMutation, folder],
  );

  const handleCopy = useCallback((id: string) => {
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const handleEmailArchive = useCallback((emailId: number) => folder === 'archive'
    ? restoreMutation.mutateAsync([emailId]) : archiveMutation.mutateAsync([emailId]),
    [folder, restoreMutation, archiveMutation]);

  const handleBatchArchive = useCallback(async () => {
    if (!selectedEmails.size) return;
    if (folder === 'archive') await restoreMutation.mutateAsync(Array.from(selectedEmails));
    else await archiveMutation.mutateAsync(Array.from(selectedEmails));
    setSelectedEmails(new Set());
  }, [folder, selectedEmails, restoreMutation, archiveMutation]);

  const handleToggleSelectAll = useCallback(() => {
    setSelectedEmails((prev) => {
      if (prev.size === emails.length && emails.length > 0) {
        return new Set();
      }
      return new Set(emails.map((email) => email.id));
    });
  }, [emails]);

  const handleBatchDelete = useCallback(async () => {
    if (selectedEmails.size > 0) {
      if (folder === 'trash') {
        await restoreMutation.mutateAsync(Array.from(selectedEmails));
      } else {
        await batchDeleteMutation.mutateAsync(Array.from(selectedEmails));
      }
      setSelectedEmails(new Set());
    }
  }, [batchDeleteMutation, restoreMutation, selectedEmails, folder]);

  const handleOpenSettings = useCallback(() => {
    if (isMobile) {
      setMobileSettingsOpen(true);
    } else {
      startTransition(() => {
        setSettingsOpen(true);
        selectEmail(null);
      });
    }
  }, [isMobile, selectEmail, setSettingsOpen]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetching) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetching, fetchNextPage]);

  return (
    <div className="bg-background">
      <div className="flex h-dvh overflow-hidden">
        <aside className="flex w-full shrink-0 flex-col overflow-hidden border-r bg-card md:w-[350px] lg:w-[384px] 2xl:w-[400px]">
          <EmailListHeader
            selectedEmails={selectedEmails}
            mutationPending={mutationPending}
            loading={loading}
            onRefresh={() => {
              void refetch();
            }}
            onToggleSelectAll={handleToggleSelectAll}
            onBatchDelete={handleBatchDelete}
            onBatchArchive={handleBatchArchive}
            onClearSelection={() => setSelectedEmails(new Set())}
            onOpenSettings={handleOpenSettings}
          />

          {folder === 'trash' && <p className="border-b bg-muted/40 px-5 py-2.5 text-[11px] leading-relaxed text-muted-foreground">{t('trashRetention')}</p>}
          {folder === 'archive' && <p className="border-b bg-muted/40 px-5 py-2.5 text-[11px] leading-relaxed text-muted-foreground">{t('archiveRetention')}</p>}
          <div className="flex-1 overflow-hidden">
            <EmailListInteractionsProvider
              value={{
                copiedId,
                onCopy: handleCopy,
                onEmailClick: handleEmailClick,
                onEmailDelete: handleEmailDelete,
                onEmailArchive: handleEmailArchive,
                mutationPending,
                onAvatarToggle: handleAvatarToggle,
              }}
            >
              <EmailListContent
                emails={emails}
                loading={loading}
                hasMore={hasNextPage}
                onLoadMore={handleLoadMore}
                onRefresh={() => {
                  void refetch();
                }}
                selectedEmailId={selectedEmailId}
                selectedEmails={selectedEmails}
              />
            </EmailListInteractionsProvider>
          </div>
        </aside>

        <main className="hidden min-w-0 flex-1 overflow-hidden bg-background md:flex">
          <div className="mx-auto w-full min-w-0">{settingsOpen ? <Settings /> : <EmailDetail email={isMobile ? null : selectedEmail} />}</div>
        </main>
      </div>

      <MobileEmailDrawer open={isMobileDrawerOpen} email={selectedEmail} onClose={() => setIsMobileDrawerOpen(false)} />

      <MobileSettingsDrawer open={mobileSettingsOpen} onOpenChange={setMobileSettingsOpen} />
    </div>
  );
}
