import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth/AuthProvider';
import { apiFetch } from './client';
import type {
  AccountListItem,
  CategoryListItem,
  FutureTimelineResponse,
  HomeResponse,
  MeResponse,
  SettingsResponse,
  SpendingSummaryResponse,
  TransactionDetailResponse,
  TransactionListFilters,
  TransactionListItem,
} from './types';

function transactionListQueryString(filters: TransactionListFilters): string {
  const params = new URLSearchParams();
  if (filters.month) params.set('month', filters.month);
  if (filters.type) params.set('type', filters.type);
  if (filters.q) params.set('q', filters.q);
  if (filters.accountIds?.length) params.set('accountIds', filters.accountIds.join(','));
  if (filters.categoryIds?.length) params.set('categoryIds', filters.categoryIds.join(','));
  if (filters.minCents !== undefined) params.set('minCents', String(filters.minCents));
  if (filters.maxCents !== undefined) params.set('maxCents', String(filters.maxCents));
  const query = params.toString();
  return query ? `?${query}` : '';
}

function useAccessToken() {
  return useAuth().session?.access_token;
}

export function useHomeQuery() {
  const accessToken = useAccessToken();
  return useQuery({
    queryKey: ['home'],
    queryFn: () => apiFetch<HomeResponse>('/home', { accessToken: accessToken! }),
    enabled: !!accessToken,
  });
}

export function useSpendingSummaryQuery() {
  const accessToken = useAccessToken();
  return useQuery({
    queryKey: ['spending-summary'],
    queryFn: () => apiFetch<SpendingSummaryResponse>('/spending/summary', { accessToken: accessToken! }),
    enabled: !!accessToken,
  });
}

export function useFutureTimelineQuery() {
  const accessToken = useAccessToken();
  return useQuery({
    queryKey: ['future-timeline'],
    queryFn: () => apiFetch<FutureTimelineResponse>('/future/timeline', { accessToken: accessToken! }),
    enabled: !!accessToken,
  });
}

export function useMeQuery() {
  const accessToken = useAccessToken();
  return useQuery({
    queryKey: ['me'],
    queryFn: () => apiFetch<MeResponse>('/me', { accessToken: accessToken! }),
    enabled: !!accessToken,
  });
}

export function useUpdateMeMutation() {
  const accessToken = useAccessToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: { name?: string; monthlyIncomeCents?: number; payday?: number }) =>
      apiFetch<MeResponse>('/me', { method: 'PATCH', accessToken: accessToken!, body: JSON.stringify(patch) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['me'] });
      void queryClient.invalidateQueries({ queryKey: ['home'] });
    },
  });
}

export function useSettingsQuery() {
  const accessToken = useAccessToken();
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => apiFetch<SettingsResponse>('/settings', { accessToken: accessToken! }),
    enabled: !!accessToken,
  });
}

export function useUpdateSettingsMutation() {
  const accessToken = useAccessToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: { hideValuesOnOpen?: boolean }) =>
      apiFetch<SettingsResponse>('/settings', { method: 'PATCH', accessToken: accessToken!, body: JSON.stringify(patch) }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['settings'], updated);
    },
  });
}

export function useAccountsQuery() {
  const accessToken = useAccessToken();
  return useQuery({
    queryKey: ['accounts'],
    queryFn: () => apiFetch<AccountListItem[]>('/accounts', { accessToken: accessToken! }),
    enabled: !!accessToken,
  });
}

export function useCategoriesQuery() {
  const accessToken = useAccessToken();
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => apiFetch<CategoryListItem[]>('/categories', { accessToken: accessToken! }),
    enabled: !!accessToken,
  });
}

export function useTransactionsQuery(filters: TransactionListFilters) {
  const accessToken = useAccessToken();
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: () =>
      apiFetch<TransactionListItem[]>(`/transactions${transactionListQueryString(filters)}`, { accessToken: accessToken! }),
    enabled: !!accessToken,
  });
}

export function useTransactionQuery(id: string) {
  const accessToken = useAccessToken();
  return useQuery({
    queryKey: ['transaction', id],
    queryFn: () => apiFetch<TransactionDetailResponse>(`/transactions/${id}`, { accessToken: accessToken! }),
    enabled: !!accessToken,
  });
}

export function useUpdateTransactionMutation(id: string) {
  const accessToken = useAccessToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: { categoryId?: string; expenseKind?: 'fixed' | 'variable'; isHidden?: boolean; note?: string | null }) =>
      apiFetch<TransactionDetailResponse>(`/transactions/${id}`, {
        method: 'PATCH',
        accessToken: accessToken!,
        body: JSON.stringify(patch),
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['transaction', id], updated);
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['spending-summary'] });
    },
  });
}

export function useCreateCategoryRuleMutation() {
  const accessToken = useAccessToken();
  return useMutation({
    mutationFn: (body: { matchType: 'merchant' | 'keyword'; pattern: string; categoryId: string; expenseKind?: 'fixed' | 'variable' }) =>
      apiFetch<{ id: string }>('/category-rules', { method: 'POST', accessToken: accessToken!, body: JSON.stringify(body) }),
  });
}
