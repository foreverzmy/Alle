"use client";

import { Mail, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import useTranslation from "@/lib/hooks/useTranslation";
import useEmailStore from "@/lib/store/email";

export default function EmailListEmpty({ onRefresh }: { onRefresh: () => void }) {
  const { t } = useTranslation();
  const folder = useEmailStore(state => state.folder);
  const q = useEmailStore(state => state.filters.q);

  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
        <Mail className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{t("noEmails")}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">{t(q ? 'noSearchResults' : folder === 'inbox' ? 'noEmailsDesc' : 'emptyFolderDesc')}</p>
      <Button
        onClick={() => {
          void onRefresh();
        }}
        className="rounded-xl"
      >
        <RefreshCw className="h-4 w-4 mr-2" />
        {t("refreshEmails")}
      </Button>
    </div>
  );
}
