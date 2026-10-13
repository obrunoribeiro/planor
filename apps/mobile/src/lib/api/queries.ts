import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth/AuthProvider';
import { apiFetch, apiUpload } from './client';
import type {
  AccountListItem,
  CategoryDetailResponse,
  CategoryListItem,
  ConnectionListItem,
  FutureTimelineResponse,
  AiChatResponse,
  AiConversationListItem,
  AiConversationResponse,
  AiUsage,
  AlertsResponse,
  GoalDetail,
  GoalItem,
  CardStatementResponse,
  FixedBillsResponse,
  HomeResponse,
  InstallmentsResponse,
  LeftoverForecastResponse,
  ImportResultResponse,
  MeResponse,
  SettingsResponse,
  SpendingSummaryResponse,
  SubscriptionsResponse,
  SubscriptionUsage,
  TransactionDetailResponse,
  TransactionListFilters,
  TransactionListItem,
  WeeklyPlanResponse,
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
    queryFn: () =>
      apiFetch<SpendingSummaryResponse>('/spending/summary', { accessToken: accessToken! }),
    enabled: !!accessToken,
  });
}

export function useLeftoverForecastQuery() {
  const accessToken = useAccessToken();
  return useQuery({
    queryKey: ['leftover-forecast'],
    queryFn: () =>
      apiFetch<LeftoverForecastResponse>('/forecast/leftover', { accessToken: accessToken! }),
    enabled: !!accessToken,
  });
}

export function useInstallmentsQuery() {
  const accessToken = useAccessToken();
  return useQuery({
    queryKey: ['installments'],
    queryFn: () =>
      apiFetch<InstallmentsResponse>('/future/installments', { accessToken: accessToken! }),
    enabled: !!accessToken,
  });
}

export function useSubscriptionsQuery() {
  const accessToken = useAccessToken();
  return useQuery({
    queryKey: ['subscriptions'],
    queryFn: () =>
      apiFetch<SubscriptionsResponse>('/future/subscriptions', { accessToken: accessToken! }),
    enabled: !!accessToken,
  });
}

/** "Você usa esse serviço?" e "Já cancelei"/desfazer (§6.6). Cancelar muda o comprometido, o
 * "a vencer" e a Home — recalculados no job, então tudo que depende disso é relido. */
export function useUpdateSubscriptionMutation(id: string) {
  const accessToken = useAccessToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: { usage?: SubscriptionUsage; status?: 'active' | 'cancelled_by_user' }) =>
      apiFetch<{ id: string; usage: SubscriptionUsage; status: string }>(`/subscriptions/${id}`, {
        method: 'PATCH',
        accessToken: accessToken!,
        body: JSON.stringify(patch),
      }),
    onSuccess: () => {
      for (const key of [
        'subscriptions',
        'home',
        'future-timeline',
        'leftover-forecast',
        'weekly-plan',
      ]) {
        void queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
  });
}

export function useCardStatementQuery(accountId: string) {
  const accessToken = useAccessToken();
  return useQuery({
    queryKey: ['card-statement', accountId],
    queryFn: () =>
      apiFetch<CardStatementResponse>(`/future/statements/${accountId}`, {
        accessToken: accessToken!,
      }),
    enabled: !!accessToken && !!accountId,
  });
}

export function useFixedBillsQuery() {
  const accessToken = useAccessToken();
  return useQuery({
    queryKey: ['fixed-bills'],
    queryFn: () => apiFetch<FixedBillsResponse>('/future/bills', { accessToken: accessToken! }),
    enabled: !!accessToken,
  });
}

/** Conta fixa muda o comprometido e o "a vencer" (recalculados no job) — relê o que depende disso. */
function invalidateAfterBillChange(queryClient: ReturnType<typeof useQueryClient>) {
  for (const key of ['fixed-bills', 'home', 'future-timeline', 'leftover-forecast']) {
    void queryClient.invalidateQueries({ queryKey: [key] });
  }
}

/** A API recalcula comprometido e resumos num job logo depois de responder: invalida agora (nome,
 * quitado) e de novo em instantes (totais). */
function invalidateAfterInstallmentChange(queryClient: ReturnType<typeof useQueryClient>) {
  const keys = [
    'installments',
    'home',
    'future-timeline',
    'leftover-forecast',
    'card-statement',
    'spending-summary',
    'transactions',
  ];
  const run = () => keys.forEach((key) => void queryClient.invalidateQueries({ queryKey: [key] }));
  run();
  setTimeout(run, 4000);
}

export function useUpdateInstallmentMutation(id: string) {
  const accessToken = useAccessToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: {
      name?: string | null;
      categoryId?: string | null;
      settledEarly?: boolean;
    }) =>
      apiFetch<void>(`/future/installments/${id}`, {
        method: 'PATCH',
        accessToken: accessToken!,
        body: JSON.stringify(patch),
      }),
    onSuccess: () => invalidateAfterInstallmentChange(queryClient),
  });
}

export function useCreateFixedBillMutation() {
  const accessToken = useAccessToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bill: {
      name: string;
      amountCents: number;
      day: number;
      paidWith: string | null;
    }) =>
      apiFetch<{ id: string }>('/future/bills', {
        method: 'POST',
        accessToken: accessToken!,
        body: JSON.stringify(bill),
      }),
    onSuccess: () => invalidateAfterBillChange(queryClient),
  });
}

export function useDeleteFixedBillMutation() {
  const accessToken = useAccessToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/future/bills/${id}`, { method: 'DELETE', accessToken: accessToken! }),
    onSuccess: () => invalidateAfterBillChange(queryClient),
  });
}

export function useFutureTimelineQuery() {
  const accessToken = useAccessToken();
  return useQuery({
    queryKey: ['future-timeline'],
    queryFn: () =>
      apiFetch<FutureTimelineResponse>('/future/timeline', { accessToken: accessToken! }),
    enabled: !!accessToken,
  });
}

export function useWeeklyPlanQuery() {
  const accessToken = useAccessToken();
  return useQuery({
    queryKey: ['weekly-plan'],
    queryFn: () => apiFetch<WeeklyPlanResponse>('/weekly-plan', { accessToken: accessToken! }),
    enabled: !!accessToken,
  });
}

/** Caixa de seleção do plano da semana (card da Home e tela do plano). */
export function useToggleWeeklyPlanItemMutation() {
  const accessToken = useAccessToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ index, completed }: { index: number; completed: boolean }) =>
      apiFetch<WeeklyPlanResponse>(`/weekly-plan/items/${index}`, {
        method: 'PATCH',
        accessToken: accessToken!,
        body: JSON.stringify({ completed }),
      }),
    onSuccess: (plan) => {
      queryClient.setQueryData(['weekly-plan'], plan);
      void queryClient.invalidateQueries({ queryKey: ['home'] });
    },
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
      apiFetch<MeResponse>('/me', {
        method: 'PATCH',
        accessToken: accessToken!,
        body: JSON.stringify(patch),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['me'] });
      void queryClient.invalidateQueries({ queryKey: ['home'] });
      void queryClient.invalidateQueries({ queryKey: ['leftover-forecast'] });
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
      apiFetch<SettingsResponse>('/settings', {
        method: 'PATCH',
        accessToken: accessToken!,
        body: JSON.stringify(patch),
      }),
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
      apiFetch<TransactionListItem[]>(`/transactions${transactionListQueryString(filters)}`, {
        accessToken: accessToken!,
      }),
    enabled: !!accessToken,
  });
}

export function useTransactionQuery(id: string) {
  const accessToken = useAccessToken();
  return useQuery({
    queryKey: ['transaction', id],
    queryFn: () =>
      apiFetch<TransactionDetailResponse>(`/transactions/${id}`, { accessToken: accessToken! }),
    enabled: !!accessToken,
  });
}

export function useUpdateTransactionMutation(id: string) {
  const accessToken = useAccessToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: {
      categoryId?: string;
      expenseKind?: 'fixed' | 'variable';
      isHidden?: boolean;
      note?: string | null;
    }) =>
      apiFetch<TransactionDetailResponse>(`/transactions/${id}`, {
        method: 'PATCH',
        accessToken: accessToken!,
        body: JSON.stringify(patch),
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['transaction', id], updated);
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['spending-summary'] });
      void queryClient.invalidateQueries({ queryKey: ['category-detail'] });
    },
  });
}

export function useCategoryDetailQuery(categoryId: string) {
  const accessToken = useAccessToken();
  return useQuery({
    queryKey: ['category-detail', categoryId],
    queryFn: () =>
      apiFetch<CategoryDetailResponse>(`/spending/category/${categoryId}`, {
        accessToken: accessToken!,
      }),
    enabled: !!accessToken && !!categoryId,
  });
}

export function useCreateCategoryRuleMutation() {
  const accessToken = useAccessToken();
  return useMutation({
    mutationFn: (body: {
      matchType: 'merchant' | 'keyword';
      pattern: string;
      categoryId: string;
      expenseKind?: 'fixed' | 'variable';
    }) =>
      apiFetch<{ id: string }>('/category-rules', {
        method: 'POST',
        accessToken: accessToken!,
        body: JSON.stringify(body),
      }),
  });
}

export function useImportOfxMutation() {
  const accessToken = useAccessToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      accountId,
      fileUri,
      fileName,
      mimeType,
    }: {
      accountId: string;
      fileUri: string;
      fileName: string;
      mimeType: string;
    }) => {
      const formData = new FormData();
      formData.append('accountId', accountId);
      // RN aceita esse shape de objeto no lugar de um Blob de verdade pra arquivo local (URI do
      // expo-document-picker) — é assim que o `fetch` do React Native sobe arquivo de disco.
      formData.append('file', { uri: fileUri, name: fileName, type: mimeType } as unknown as Blob);
      return apiUpload<ImportResultResponse>('/imports', { accessToken: accessToken!, formData });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

export function useConnectionsQuery() {
  const accessToken = useAccessToken();
  return useQuery({
    queryKey: ['connections'],
    queryFn: () => apiFetch<ConnectionListItem[]>('/connections', { accessToken: accessToken! }),
    enabled: !!accessToken,
  });
}

/** `connectionId` = renovar/reconectar uma conexão existente (widget em modo atualização, §6.2). */
export function useCreateConnectTokenMutation() {
  const accessToken = useAccessToken();
  return useMutation({
    mutationFn: (connectionId?: string) =>
      apiFetch<{ accessToken: string }>('/connections/token', {
        method: 'POST',
        accessToken: accessToken!,
        body: JSON.stringify(connectionId ? { connectionId } : {}),
      }),
  });
}

function invalidateConnectionData(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ['connections'] });
  void queryClient.invalidateQueries({ queryKey: ['accounts'] });
  void queryClient.invalidateQueries({ queryKey: ['transactions'] });
  void queryClient.invalidateQueries({ queryKey: ['home'] });
  void queryClient.invalidateQueries({ queryKey: ['spending-summary'] });
}

/** "Atualizar agora" / "Tentar agora" (§6.2). */
export function useRefreshConnectionMutation() {
  const accessToken = useAccessToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (connectionId: string) =>
      apiFetch<{ accountsSynced: number; transactionsImported: number; refreshRequested: boolean }>(
        `/connections/${connectionId}/sync`,
        { method: 'POST', accessToken: accessToken!, body: '{}' },
      ),
    onSettled: () => invalidateConnectionData(queryClient),
  });
}

/** "Desconectar" (§6.2): revoga no agregador; o histórico importado fica. */
export function useDisconnectConnectionMutation() {
  const accessToken = useAccessToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (connectionId: string) =>
      apiFetch<void>(`/connections/${connectionId}`, {
        method: 'DELETE',
        accessToken: accessToken!,
      }),
    onSuccess: () => invalidateConnectionData(queryClient),
  });
}

export function useSyncConnectionItemMutation() {
  const accessToken = useAccessToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) =>
      apiFetch<{ connectionId: string; accountsSynced: number; transactionsImported: number }>(
        '/connections/sync-item',
        {
          method: 'POST',
          accessToken: accessToken!,
          body: JSON.stringify({ itemId }),
        },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['connections'] });
      void queryClient.invalidateQueries({ queryKey: ['accounts'] });
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

export function useAlertsQuery() {
  const accessToken = useAccessToken();
  return useQuery({
    queryKey: ['alerts'],
    queryFn: () => apiFetch<AlertsResponse>('/alerts', { accessToken: accessToken! }),
    enabled: !!accessToken,
  });
}

/** Sem `ids`: "Marcar todos como lidos". */
export function useMarkAlertsReadMutation() {
  const accessToken = useAccessToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids?: string[]) =>
      apiFetch<void>('/alerts/read', {
        method: 'POST',
        accessToken: accessToken!,
        body: JSON.stringify(ids ? { ids } : {}),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['alerts'] });
      void queryClient.invalidateQueries({ queryKey: ['home'] });
    },
  });
}

export function useAiUsageQuery() {
  const accessToken = useAccessToken();
  return useQuery({
    queryKey: ['ai-usage'],
    queryFn: () => apiFetch<AiUsage>('/ai/usage', { accessToken: accessToken! }),
    enabled: !!accessToken,
  });
}

export function useAiConversationsQuery() {
  const accessToken = useAccessToken();
  return useQuery({
    queryKey: ['ai-conversations'],
    queryFn: () =>
      apiFetch<AiConversationListItem[]>('/ai/conversations', { accessToken: accessToken! }),
    enabled: !!accessToken,
  });
}

export function useAiConversationQuery(id: string | undefined) {
  const accessToken = useAccessToken();
  return useQuery({
    queryKey: ['ai-conversation', id],
    queryFn: () =>
      apiFetch<AiConversationResponse>(`/ai/conversations/${id}`, { accessToken: accessToken! }),
    enabled: !!accessToken && !!id,
  });
}

export function useAiChatMutation() {
  const accessToken = useAccessToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { conversationId?: string; message: string }) =>
      apiFetch<AiChatResponse>('/ai/chat', {
        method: 'POST',
        accessToken: accessToken!,
        body: JSON.stringify(input),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(['ai-usage'], data.usage);
      void queryClient.invalidateQueries({ queryKey: ['ai-conversations'] });
    },
  });
}

export function useGoalsQuery() {
  const accessToken = useAccessToken();
  return useQuery({
    queryKey: ['goals'],
    queryFn: () => apiFetch<{ items: GoalItem[] }>('/goals', { accessToken: accessToken! }),
    enabled: !!accessToken,
  });
}

export function useGoalQuery(id: string) {
  const accessToken = useAccessToken();
  return useQuery({
    queryKey: ['goal', id],
    queryFn: () => apiFetch<GoalDetail>(`/goals/${id}`, { accessToken: accessToken! }),
    enabled: !!accessToken && !!id,
  });
}

function invalidateGoals(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ['goals'] });
  void queryClient.invalidateQueries({ queryKey: ['goal'] });
}

export type CreateGoalInput =
  | { type: 'savings'; name: string; targetCents: number; deadline?: string | null }
  | {
      type: 'category_limit';
      categoryId: string;
      targetCents: number;
      alertAt80: boolean;
      startNextMonth: boolean;
    };

export function useCreateGoalMutation() {
  const accessToken = useAccessToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateGoalInput) =>
      apiFetch<{ id: string }>('/goals', {
        method: 'POST',
        accessToken: accessToken!,
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateGoals(queryClient),
  });
}

export function useUpdateGoalMutation(id: string) {
  const accessToken = useAccessToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: {
      name?: string;
      targetCents?: number;
      deadline?: string | null;
      alertAt80?: boolean;
    }) =>
      apiFetch<{ id: string }>(`/goals/${id}`, {
        method: 'PATCH',
        accessToken: accessToken!,
        body: JSON.stringify(patch),
      }),
    onSuccess: () => invalidateGoals(queryClient),
  });
}

export function useDeleteGoalMutation() {
  const accessToken = useAccessToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/goals/${id}`, { method: 'DELETE', accessToken: accessToken! }),
    onSuccess: () => invalidateGoals(queryClient),
  });
}

export function useAddContributionMutation(goalId: string) {
  const accessToken = useAccessToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { amountCents: number; where: string | null }) =>
      apiFetch<{ id: string }>(`/goals/${goalId}/contributions`, {
        method: 'POST',
        accessToken: accessToken!,
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateGoals(queryClient),
  });
}
