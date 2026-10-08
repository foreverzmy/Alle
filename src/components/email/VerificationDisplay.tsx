"use client";

import type { MouseEvent } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEmailListInteractions } from "@/components/email/EmailListInteractionsContext";
import CopyButton from "@/components/common/CopyButton";
import useTranslation from "@/lib/hooks/useTranslation";
import getEmailTypeStyle from "@/lib/constants/emailTypes";
import { useMarkEmail } from "@/lib/hooks/useEmailApi";
import type { Email } from "@/types";

export default function VerificationDisplay({ email }: { email: Email }) {
  const { t } = useTranslation();
  const { copiedId, onCopy } = useEmailListInteractions();
  const { mutate: markEmail } = useMarkEmail();

  if (!email.emailResult || email.emailType === "none") {
    return null;
  }

  const config = getEmailTypeStyle(email.emailType);
  const copyId = `list-result-${email.id}`;
  const isCopied = copiedId === copyId;

  const markAsRead = () => {
    if (email.readStatus === 1) {
      return;
    }
    markEmail({ emailId: email.id, isRead: true });
  };

  const handleCopy = () => {
    markAsRead();
    onCopy(copyId);
  };

  const handleOpenLink = (event: MouseEvent<HTMLAnchorElement>) => {
    event.stopPropagation();
    markAsRead();
  };

  return (
    <div className="mt-2 flex items-center gap-2 rounded-lg border border-primary/10 bg-primary/4 px-2.5 py-1">
      <span className={`min-w-0 flex-1 truncate text-primary ${email.emailType === "auth_code" ? "font-mono text-[13px] font-medium tracking-wider" : "text-[11px]"}`}>
        {email.emailResult}
      </span>
      <div className="flex items-center gap-1">
        {config.hasLinkButton && (
          <Button variant="ghost" size="icon-sm" className="size-6" asChild>
            <a
              aria-label={t("openLink")}
              href={email.emailResult}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleOpenLink}
            >
              <ExternalLink />
            </a>
          </Button>
        )}
        <CopyButton
          className="size-6 rounded-md"
          text={email.emailResult}
          isCopied={isCopied}
          onCopy={handleCopy}
        />
      </div>
    </div>
  );
}
