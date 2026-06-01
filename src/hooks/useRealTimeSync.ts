import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { getToken, setToken } from '@/services/api-client';

export function useRealTimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let cleanup: (() => void) | undefined;
    let cancelled = false;

    const setupRealtime = async () => {
      let token = getToken();
      if (!token) {
        const { data } = await supabase.auth.getSession();
        token = data.session?.access_token || null;
        if (token) setToken(token);
      }

      if (!token || cancelled) return;

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';
      const isNgrokBackend = API_URL.includes('ngrok-free.dev') || API_URL.includes('ngrok.app');

      if (isNgrokBackend) {
        console.info('[SSE] Usando polling para backend via ngrok; EventSource nao permite headers customizados.');
        const polling = window.setInterval(() => {
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          queryClient.invalidateQueries({ queryKey: ['transactions'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard', 'telegram-feed'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard', 'smart-alerts'] });
          queryClient.invalidateQueries({ queryKey: ['workspaces'] });
          queryClient.invalidateQueries({ queryKey: ['workspace-members'] });
        }, 30_000);

        cleanup = () => window.clearInterval(polling);
        return;
      }

      eventSource = new EventSource(`${API_URL}/api/sync/events?token=${token}`);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

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
            // Notifica apenas se o usuário está vendo o workspace afetado
            const currentOrgId = localStorage.getItem('economyzee_org_id');
            if (data.orgId === currentOrgId) {
              const roleLabel = data.role === 'OWNER' ? 'Owner'
                : data.role === 'ADMIN' ? 'Admin'
                : data.role === 'VIEWER' ? 'Visualizador' : 'Membro';
              toast.success(`🎉 ${data.memberName} entrou no workspace!`, {
                description: `Acabou de se juntar a "${data.orgName}" como ${roleLabel}.`,
                position: 'top-right',
                duration: 6000,
              });
            }
            // Atualiza lista de workspaces/membros em todas as abas que recebem o evento
            queryClient.invalidateQueries({ queryKey: ['workspaces'] });
            queryClient.invalidateQueries({ queryKey: ['workspace-members'] });
          }
        } catch (e) {
          console.error('Erro ao processar evento SSE:', e);
        }
      };

      eventSource.onerror = (err) => {
        console.error('SSE Error:', err);
      };

      cleanup = () => {
        eventSource?.close();
        eventSource = null;
      };
    };

    setupRealtime();

    return () => {
      cancelled = true;
      cleanup?.();
      eventSource?.close();
    };
  }, [queryClient]);
}
