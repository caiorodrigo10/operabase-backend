import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { LiviaConfiguration, InsertLiviaConfiguration, UpdateLiviaConfiguration } from '../../../shared/schema';

// Get Livia configuration for current clinic
export function useLiviaConfiguration() {
  return useQuery({
    queryKey: ['/api/livia/config'],
    queryFn: () => apiRequest('/api/livia/config').then(res => res.json()),
    staleTime: 0, // Force fresh data
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Create new Livia configuration
export function useCreateLiviaConfiguration() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Omit<InsertLiviaConfiguration, 'clinic_id'>) => 
      apiRequest('/api/livia/config', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/livia/config'] });
    },
  });
}

// Update Livia configuration
export function useUpdateLiviaConfiguration() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: UpdateLiviaConfiguration) => 
      apiRequest('/api/livia/config', 'PUT', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/livia/config'] });
    },
  });
}

// Delete Livia configuration
export function useDeleteLiviaConfiguration() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => 
      apiRequest('/api/livia/config', 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/livia/config'] });
    },
  });
}

// Get Livia configuration for N8N integration (enhanced data)
export function useLiviaConfigurationForN8N() {
  return useQuery({
    queryKey: ['/api/livia/config/n8n'],
    queryFn: () => apiRequest('/api/livia/config/n8n'),
  });
}

// Get WhatsApp numbers for current clinic
export function useWhatsAppNumbers() {
  return useQuery({
    queryKey: ['/api/whatsapp/numbers'],
    queryFn: () => apiRequest('/api/whatsapp/numbers').then(res => res.json()),
    staleTime: 0, // Force fresh data
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Get professionals for current clinic 
export function useProfessionals() {
  return useQuery({
    queryKey: ['/api/clinic/1/professionals'],
    queryFn: () => apiRequest('/api/clinic/1/professionals').then(res => res.json()),
    staleTime: 0, // Force fresh data
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Get knowledge bases for current clinic
export function useKnowledgeBases() {
  return useQuery({
    queryKey: ['/api/rag/knowledge-bases'],
    queryFn: () => apiRequest('/api/rag/knowledge-bases').then(res => res.json()),
    staleTime: 0, // Force fresh data
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}