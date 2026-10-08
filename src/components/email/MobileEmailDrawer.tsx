"use client";

import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import EmailDetail from "@/components/email/EmailDetail";
import useTranslation from "@/lib/hooks/useTranslation";
import type { Email } from "@/types";

interface MobileEmailDrawerProps {
  open: boolean;
  email: Email | null;
  onClose: () => void;
  onOpenChange?: (open: boolean) => void;
}

export default function MobileEmailDrawer({ open, email, onClose, onOpenChange }: MobileEmailDrawerProps) {
  const { t } = useTranslation();

  return (
    <Drawer
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
        onOpenChange?.(nextOpen);
      }}
    >
      <DrawerContent className="data-[vaul-drawer-direction=bottom]:max-h-[92dvh] md:hidden">
        <DrawerHeader className="hidden">
          <DrawerTitle>{email?.title}</DrawerTitle>
          <DrawerDescription>
            {t("from")} {email?.fromName}
          </DrawerDescription>
        </DrawerHeader>
        <div className="h-[85dvh] min-h-0 overflow-hidden pb-[env(safe-area-inset-bottom)]">
          <EmailDetail email={email} onClose={onClose} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
