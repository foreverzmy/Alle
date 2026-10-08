"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { apiFetch } from "@/lib/api/client";
import { useTheme } from "next-themes";
import { cn } from '@/lib/utils/utils';

interface EmailAvatarProps {
  name: string;
  fromAddress?: string | null;
  className?: string;
}

function getDomainFromEmail(email: string | null | undefined): string | null {
  if (!email) return null;

  const atIndex = email.indexOf('@');
  if (atIndex === -1) return null;

  const domain = email.substring(atIndex + 1).toLowerCase();
  const parts = domain.split('.');
  if (parts.length >= 2) {
    return parts.slice(-2).join('.');
  }
  return domain;
}

export default function EmailAvatar({ name, fromAddress, className }: EmailAvatarProps) {
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const { theme, resolvedTheme } = useTheme();

  useEffect(() => {
    let isMounted = true;
    let objectUrl: string | null = null;

    async function fetchLogo() {
      const domain = getDomainFromEmail(fromAddress);
      if (domain) {
        try {
          const actualTheme = resolvedTheme || theme;
          const url = `/api/logo/${encodeURIComponent(domain)}${actualTheme ? `?theme=${actualTheme}` : ''}`;
          const response = await apiFetch(url);

          if (response.ok && isMounted) {
            const blob = await response.blob();
            objectUrl = URL.createObjectURL(blob);
            setLogoSrc(objectUrl);
          }
        } catch (error) {
          console.error('Failed to fetch favicon:', error);
        }
      }
    }

    fetchLogo();

    return () => {
      isMounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [fromAddress, theme, resolvedTheme]);

  const colors = [
    { background: '#edf4ef', color: '#507463' },
    { background: '#eef2f7', color: '#61748e' },
    { background: '#f4efe8', color: '#927957' },
    { background: '#f3eef4', color: '#88728c' },
  ];
  const color = colors[(name?.codePointAt(0) || 0) % colors.length];
  return <Avatar className={cn('size-9 rounded-xl', className)}>
    {logoSrc && <AvatarImage src={logoSrc} alt={name} className="object-contain p-1.5" />}
    <AvatarFallback style={color} className="rounded-xl text-sm font-medium">{name?.[0]?.toUpperCase() || '?'}</AvatarFallback>
  </Avatar>;
}
