"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useState, type MouseEvent, type ReactNode } from "react";

interface DeleteDialogProps {
  trigger: ReactNode;
  title: string;
  description: string;
  onConfirm: (event?: MouseEvent) => void | Promise<unknown>;
  cancelText: string;
  confirmText: string;
  allowUnsafeHtml?: boolean;
  tone?: 'neutral' | 'destructive';
}

export default function DeleteDialog({
  trigger,
  title,
  description,
  onConfirm,
  cancelText,
  confirmText,
  allowUnsafeHtml = false,
  tone = 'destructive',
}: DeleteDialogProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <AlertDialog open={open} onOpenChange={(nextOpen) => {
      if (pending) return;
      setOpen(nextOpen);
      setError(null);
    }}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {allowUnsafeHtml ? (
            <AlertDialogDescription dangerouslySetInnerHTML={{ __html: description }} />
          ) : (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending} onClick={(e) => e.stopPropagation()}>{cancelText}</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={async (event) => {
              event.preventDefault();
              event.stopPropagation();
              setPending(true);
              setError(null);
              try {
                await onConfirm(event);
                setOpen(false);
              } catch (cause) {
                setError(cause instanceof Error ? cause.message : String(cause));
              } finally {
                setPending(false);
              }
            }}
            className={tone === 'destructive' ? 'bg-destructive text-white hover:bg-destructive/90' : undefined}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
