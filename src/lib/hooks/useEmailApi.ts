import { useMemo } from 'react';
import { useSettingsStore } from '@/lib/store/settings';
import { useMutation, useQueryClient, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';
import useEmailStore from '@/lib/store/email';
import * as emailApi from '@/lib/api/email';
import type { Email, ExtractResultType } from '@/types';

type EmailListPage = {
  emails: Email[];
  total: number;
  nextOffset: number;
};

type EmailListInfiniteData = InfiniteData<EmailListPage, number>;

export const useEmailBody = (emailId: number | undefined) => useQuery({
  queryKey: ['email-body', emailId],
  queryFn: ({ signal }) => emailApi.fetchEmailBody(emailId!, signal),
  enabled: emailId !== undefined,
  staleTime: Infinity,
  retry: 1,
});

export const useEmailListInfinite = () => {
  const { autoRefreshInterval } = useSettingsStore();
  const folder = useEmailStore((state) => state.folder);
  const filters = useEmailStore((state) => state.filters);

  const normalizedEmailTypes = useMemo(() => {
    return [...filters.emailTypes].sort();
  }, [filters.emailTypes]);

  const normalizedRecipients = useMemo(() => {
    return [...filters.recipients].sort();
  }, [filters.recipients]);

  const readStatusParam = filters.readStatus === 'read' ? 1 : filters.readStatus === 'unread' ? 0 : undefined;

  return useInfiniteQuery({
    queryKey: ['emails', { folder, readStatus: filters.readStatus, emailTypes: normalizedEmailTypes, recipients: normalizedRecipients }],
    queryFn: async ({ pageParam = 0 }) => {
      const result = await emailApi.fetchEmails({
        folder,
        limit: 50,
        offset: pageParam,
        readStatus: readStatusParam,
        emailTypes: normalizedEmailTypes,
        recipients: normalizedRecipients,
      });

      return {
        emails: result.emails,
        total: result.total,
        nextOffset: pageParam + result.emails.length,
      };
    },
    getNextPageParam: (lastPage, allPages) => {
      const loadedCount = allPages.reduce((acc, page) => acc + page.emails.length, 0);
      return loadedCount < lastPage.total ? lastPage.nextOffset : undefined;
    },
    initialPageParam: 0,
    refetchInterval: autoRefreshInterval > 0 ? autoRefreshInterval : false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 5000,
  });
};

export const useDeleteEmail = () => {
  const queryClient = useQueryClient();
  const { removeEmail } = useEmailStore();

  return useMutation({
    mutationFn: emailApi.deleteEmail,
    onSuccess: (emailId) => {
      removeEmail(emailId);
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      queryClient.invalidateQueries({ queryKey: ['recipients'] });
    },
  });
};

export const useBatchDeleteEmails = () => {
  const queryClient = useQueryClient();
  const { removeEmails } = useEmailStore();

  return useMutation({
    mutationFn: emailApi.batchDeleteEmails,
    onError: () => { queryClient.invalidateQueries({ queryKey: ['emails'] }); },
    onSuccess: (emailIds) => {
      removeEmails(emailIds);
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      queryClient.invalidateQueries({ queryKey: ['recipients'] });
    },
  });
};

export const useMarkEmail = () => {
  const queryClient = useQueryClient();
  const { markEmail } = useEmailStore();

  return useMutation({
    mutationFn: ({ emailId, isRead }: { emailId: number; isRead: boolean }) => emailApi.mark(emailId, isRead),
    onSuccess: ({ emailId, isRead }) => {
      const readStatusValue = isRead ? 1 : 0;
      markEmail(emailId, isRead);

      queryClient.setQueriesData<EmailListInfiniteData>({ queryKey: ['emails'] }, (data) => {
        if (!data) {
          return data;
        }

        return {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            emails: page.emails.map((email) =>
              email.id === emailId ? { ...email, readStatus: readStatusValue } : email,
            ),
          })),
        };
      });
    },
  });
};

export const useRecipients = () => {
  return useQuery({
    queryKey: ['recipients'],
    queryFn: emailApi.fetchRecipients,
    staleTime: 5 * 60 * 1000,
  });
};

export const useUpdateEmail = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ emailId, emailResult, emailType }: {
      emailId: number;
      emailResult: string | null;
      emailType: ExtractResultType;
    }) => emailApi.updateEmail(emailId, emailResult, emailType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      queryClient.invalidateQueries({ queryKey: ['recipients'] });
    },
  });
};

export const useRestoreEmails = () => {
  const queryClient = useQueryClient();
  const { removeEmails } = useEmailStore();
  return useMutation({
    mutationFn: emailApi.restoreEmails,
    onError: () => { queryClient.invalidateQueries({ queryKey: ['emails'] }); },
    onSuccess: (ids) => {
      removeEmails(ids);
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      queryClient.invalidateQueries({ queryKey: ['recipients'] });
    },
  });
};
