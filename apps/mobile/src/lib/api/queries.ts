import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth/AuthProvider';
import { apiFetch } from './client';
import type { FutureTimelineResponse, HomeResponse, MeResponse, SpendingSummaryResponse } from './types';

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
