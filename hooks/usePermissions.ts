import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

export interface Permission {
  id: string;
  permissionType: string;
  permissionKey: string;
  userRole: string;
  isAllowed: boolean;
}

export function usePermissions(orgId: string) {
  return useQuery({
    queryKey: ['permissions', orgId],
    queryFn: async () => {
      const { data } = await api.get('/permissions');
      return data;
    },
    enabled: !!orgId,
  });
}

export function useUpdatePermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { type: string; key: string; role: string; allowed: boolean; orgId: string }) =>
      api.post('/permissions/override', {
        permissionType: p.type,
        permissionKey: p.key,
        userRole: p.role,
        isAllowed: p.allowed
      }),
    onSuccess: (_, variables) => qc.invalidateQueries({ queryKey: ['permissions', variables.orgId] }),
  });
}

export function useResetPermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orgId: string) => api.post('/permissions/reset', null),
    onSuccess: (_, orgId) => qc.invalidateQueries({ queryKey: ['permissions', orgId] }),
  });
}
