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
    mutationFn: (p: { type: string; key: string; role: string; allowed: boolean }) =>
      api.post('/permissions/override', {
        permissionType: p.type,
        permissionKey: p.key,
        userRole: p.role,
        isAllowed: p.allowed
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['permissions'] }),
  });
}

export function useResetPermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/permissions/reset'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['permissions'] }),
  });
}
