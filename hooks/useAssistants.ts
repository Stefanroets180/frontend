import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

export interface UserAssistantDTO {
  id: string;
  ownerId: string;
  assistantId: string;
  assistantEmail?: string;
  assistantFirstName?: string;
  assistantLastName?: string;
  assistantRole: 'ASSISTANT_LOW' | 'ASSISTANT_HIGH';
  assignedDateRangeStart?: string;
  assignedDateRangeEnd?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AddAssistantRequest {
  assistantId: string;
  assistantRole: 'ASSISTANT_LOW' | 'ASSISTANT_HIGH';
  dateRangeStart?: string;
  dateRangeEnd?: string;
}

export interface UpdateAssistantRequest {
  assistantRole: 'ASSISTANT_LOW' | 'ASSISTANT_HIGH';
  dateRangeStart?: string;
  dateRangeEnd?: string;
}

export function useAssistants() {
  const queryClient = useQueryClient();

  const { data: assistants, isLoading } = useQuery({
    queryKey: ['assistants'],
    queryFn: async () => {
      const response = await api.get('/api/v1/assistants');
      return response.data as UserAssistantDTO[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (request: AddAssistantRequest) => {
      const response = await api.post('/api/v1/assistants', request);
      return response.data as UserAssistantDTO;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assistants'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ assistantId, request }: { assistantId: string; request: UpdateAssistantRequest }) => {
      const response = await api.put(`/api/v1/assistants/${assistantId}`, request);
      return response.data as UserAssistantDTO;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assistants'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (assistantId: string) => {
      await api.delete(`/api/v1/assistants/${assistantId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assistants'] });
    },
  });

  const lookupUser = async (email: string) => {
    const response = await api.get(`/api/v1/assistants/lookup?email=${encodeURIComponent(email)}`);
    return response.data as UserAssistantDTO;
  };

  return {
    assistants,
    isLoading,
    addAssistant: addMutation.mutate,
    updateAssistant: updateMutation.mutate,
    removeAssistant: removeMutation.mutate,
    lookupUser,
    isAdding: addMutation.isPending,
    isUpdating: updateMutation.isPending,
    isRemoving: removeMutation.isPending,
  };
}
