import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { getToken, setToken } from '@/services/api-client';

export function useRealTimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let abortController: AbortController | null = null;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let resolveRetry: (() => void) | null = null;
    let cancelled = false;

    const resolveRealtimeToken = async () => {
      let token = getToken();
      if (!token) {
        const { data } = await supabase.auth.getSession();
        token = data.session?.access_token || null;
        if (token) setToken(token);
      }

      return token;
    };

    const handleRealtimeEvent = (data: any) => {
      if (data.type === 'transaction_created') {
        toast.success('Nova transacao recebida via Telegram!', {
          description: 'Seu painel foi atualizado.',
          position: 'top-right',
        });

        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'telegram-feed'] });
      }

      if (data.type === 'member_joined') {
        const currentOrgId = localStorage.getItem('economyzee_org_id');
        if (data.orgId === currentOrgId) {
          const roleLabel = data.role === 'OWNER' ? 'Owner'
            : data.role === 'ADMIN' ? 'Admin'
            : data.role === 'VIEWER' ? 'Visualizador' : 'Membro';
          toast.success(`${data.memberName} entrou no workspace!`, {
            description: `Acabou de se juntar a "${data.orgName}" como ${roleLabel}.`,
            position: 'top-right',
            duration: 6000,
          });
        }

        queryClient.invalidateQueries({ queryKey: ['workspaces'] });
        queryClient.invalidateQueries({ queryKey: ['workspace-members'] });
      }
    };

    const processSseChunk = (buffer: string, onEvent: (data: any) => void) => {
      const events = buffer.split(/\r?\n\r?\n/);
      const remaining = events.pop() || '';

      for (const event of events) {
        const dataLines = event
          .split(/\r?\n/)
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).trimStart());

        if (dataLines.length === 0) continue;

        try {
          onEvent(JSON.parse(dataLines.join('\n')));
        } catch (e) {
          console.error('Erro ao processar evento SSE:', e);
        }
      }

      return remaining;
    };

    const connect = async () => {
      const API_URL = import.meta.env.VITE_API_URL || '/api';
      const decoder = new TextDecoder();

      while (!cancelled) {
        const token = await resolveRealtimeToken();
        const orgId = localStorage.getItem('economyzee_org_id');

        if (!token || cancelled) return;

        abortController = new AbortController();

        try {
          const response = await fetch(`${API_URL}/sync/events`, {
            method: 'GET',
            headers: {
              Accept: 'text/event-stream',
              Authorization: `Bearer ${token}`,
              ...(orgId ? { 'x-organization-id': orgId } : {}),
            },
            credentials: 'include',
            signal: abortController.signal,
          });

          if (!response.ok || !response.body) {
            throw new Error(`SSE Error ${response.status}`);
          }

          const reader = response.body.getReader();
          let buffer = '';

          while (!cancelled) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer = processSseChunk(buffer + decoder.decode(value, { stream: true }), handleRealtimeEvent);
          }
        } catch (err) {
          if (!cancelled) {
            console.error('SSE Error:', err);
          }
        } finally {
          abortController = null;
        }

        if (!cancelled) {
          await new Promise<void>((resolve) => {
            resolveRetry = resolve;
            retryTimeout = setTimeout(resolve, 5000);
          });
          retryTimeout = null;
          resolveRetry = null;
        }
      }
    };

    connect();

    return () => {
      cancelled = true;
      abortController?.abort();
      if (retryTimeout) clearTimeout(retryTimeout);
      resolveRetry?.();
    };
  }, [queryClient]);
}
