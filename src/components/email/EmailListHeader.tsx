"use client";

import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Settings as SettingsIcon, CheckSquare, Square, Trash2, RotateCcw, Archive, Search } from "lucide-react";
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import type { EmailFolder } from '@/types';
import type { ReadStatusFilter } from '@/lib/store/email';
import { Button } from "@/components/ui/button";
import DeleteDialog from "@/components/common/DeleteDialog";
import useTranslation from "@/lib/hooks/useTranslation";
import useEmailStore from "@/lib/store/email";

interface EmailListHeaderProps {
  selectedEmails: Set<number>;
  loading: boolean;
  mutationPending: boolean;
  onRefresh: () => void;
  onToggleSelectAll: () => void;
  onBatchDelete: () => Promise<void> | void;
  onBatchArchive: () => Promise<void> | void;
  onClearSelection: () => void;
  onOpenSettings: () => void;
}

export default function EmailListHeader({
  selectedEmails,
  loading,
  mutationPending,
  onRefresh,
  onToggleSelectAll,
  onBatchDelete,
  onBatchArchive,
  onClearSelection,
  onOpenSettings,
}: EmailListHeaderProps) {
  const { t } = useTranslation();
  const folder = useEmailStore((state) => state.folder);
  const setFolder = useEmailStore((state) => state.setFolder);
  const isTrash = folder === 'trash';
  const isArchive = folder === 'archive';
  const filters = useEmailStore(state => state.filters);
  const updateFilters = useEmailStore(state => state.updateFilters);
  const [search, setSearch] = useState(filters.q);
  useEffect(() => setSearch(filters.q), [filters.q, folder]);
  const totalCount = useEmailStore((state) => state.total);
  const emailCount = useEmailStore((state) => state.emails.length);

  const selectionCount = selectedEmails.size;
  const hasSelection = selectionCount > 0;
  const isAllSelected = hasSelection && selectionCount === emailCount;

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-center justify-between flex-wrap gap-2 px-6 py-3 border-b"
    >
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t(folder)}</h1>
        <p className="text-sm text-muted-foreground">
          {hasSelection ? t("selectedCount", { count: selectionCount }) : t("emailsCount", { count: totalCount })}
        </p>
      </div>

      <nav className="flex gap-1" aria-label={t('mailFolders')}>
        {(['inbox', 'archive', 'trash'] as EmailFolder[]).map(item => <Button key={item} size="sm"
          variant={folder === item ? 'secondary' : 'ghost'} aria-current={folder === item ? 'page' : undefined}
          disabled={mutationPending} onClick={() => { onClearSelection(); setFolder(item); }}>{t(item)}</Button>)}
      </nav>

      <AnimatePresence mode="popLayout">
        {hasSelection ? (
          <motion.div
            key="selection-actions"
            layout
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.25, ease: [0.33, 1, 0.68, 1] }}
            className="flex items-center gap-2"
          >
            <Button
              variant="ghost"
              size="icon"
              disabled={mutationPending}
              aria-label={t('selectAll')}
              onClick={onToggleSelectAll}
            >
              {isAllSelected ? (
                <motion.div
                  key="all-selected"
                  layout
                  initial={{ rotate: -90, scale: 0.8, opacity: 0 }}
                  animate={{ rotate: 0, scale: 1, opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <CheckSquare />
                </motion.div>
              ) : (
                <motion.div
                  key="partial-selected"
                  layout
                  initial={{ rotate: 90, scale: 0.8, opacity: 0 }}
                  animate={{ rotate: 0, scale: 1, opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <Square />
                </motion.div>
              )}
            </Button>

            {!isTrash && <DeleteDialog
              trigger={<Button variant="ghost" size="icon" disabled={mutationPending}
                aria-label={t(isArchive ? 'restore' : 'archive')}>
                {isArchive ? <RotateCcw /> : <Archive />}
              </Button>}
              title={t(isArchive ? 'restoreConfirm' : 'archiveConfirm')}
              description={t(isArchive ? 'batchRestoreDesc' : 'batchArchiveDesc', { count: selectionCount })}
              onConfirm={() => onBatchArchive()} cancelText={t('cancel')}
              confirmText={t(isArchive ? 'restore' : 'archive')}
            />}
            <DeleteDialog
              trigger={
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={mutationPending}
                  aria-label={t(isTrash ? 'restore' : 'delete')}
                  className="hover:bg-destructive/10 hover:text-destructive"
                  onClick={(event) => event.stopPropagation()}
                >
                  <motion.div
                    whileHover={{ rotate: -12 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  >
                    {isTrash ? <RotateCcw /> : <Trash2 />}
                  </motion.div>
                </Button>
              }
              title={t(isTrash ? "restoreConfirm" : "batchDeleteConfirm")}
              description={t(isTrash ? "batchRestoreDesc" : "batchDeleteDesc", { count: selectionCount })}
              onConfirm={(event) => {
                event?.stopPropagation();
                return onBatchDelete();
              }}
              cancelText={t("cancel")}
              confirmText={t(isTrash ? "restore" : "delete")}
            />

            <Button variant="outline" disabled={mutationPending} onClick={onClearSelection}>{t("cancel")}</Button>
          </motion.div>
        ) : (
          <motion.div
            key="default-actions"
            layout
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.25, ease: [0.33, 1, 0.68, 1] }}
            className="flex items-center gap-2"
          >
            <Button variant="ghost" size="icon" onClick={onOpenSettings}>
              <motion.div
                layout
                whileHover={{ rotate: 20 }}
                whileTap={{ rotate: -20 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
              >
                <SettingsIcon />
              </motion.div>
            </Button>
            <Button size="icon" onClick={onRefresh} disabled={loading} className="shadow-sm hover:shadow-md transition-all duration-200">
              <motion.div animate={{ rotate: loading ? 360 : 0 }} transition={{ repeat: loading ? Infinity : 0, duration: 0.8, ease: "linear" }}>
                <RefreshCw />
              </motion.div>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
      <form className="flex w-full gap-2" onSubmit={event => {
        event.preventDefault();
        if (!mutationPending) { onClearSelection(); updateFilters({ q: search.trim() }); }
      }}>
        <Input value={search} maxLength={200} disabled={mutationPending} aria-label={t('searchEmails')}
          placeholder={t('searchEmails')} onChange={event => setSearch(event.target.value)} />
        <Button type="submit" size="icon" variant="outline" disabled={mutationPending} aria-label={t('search')}><Search /></Button>
        <select value={filters.readStatus} disabled={mutationPending} aria-label={t('readStatusFilter')}
          className="rounded-md border bg-background px-2 text-sm" onChange={event => {
            onClearSelection(); updateFilters({ readStatus: event.target.value as ReadStatusFilter });
          }}>
          <option value="all">{t('allMail')}</option>
          <option value="unread">{t('unreadMail')}</option>
          <option value="read">{t('readMail')}</option>
        </select>
      </form>
    </motion.header>
  );
}
