import { createFileRoute } from '@tanstack/react-router';

// LGPD — direito à eliminação (art. 18, VI).
// Recebe o token da sessão do usuário, confirma a identidade e apaga
// definitivamente o backup na nuvem, o perfil e a própria conta de acesso.
export const Route = createFileRoute('/api/public/excluir-conta')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const json = (body: unknown, status: number) =>
          new Response(JSON.stringify(body), {
            status,
            headers: { 'content-type': 'application/json' },
          });

        const auth = request.headers.get('authorization') || '';
        const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
        if (!token) return json({ error: 'Sessão não encontrada. Entre novamente.' }, 401);

        const { supabaseAdmin } = await import('@/integrations/supabase/client.server');

        const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
        const user = userData?.user;
        if (userErr || !user) return json({ error: 'Sessão inválida ou expirada.' }, 401);

        const email = (user.email || '').trim().toLowerCase();

        if (email) {
          const { error } = await supabaseAdmin.from('backups').delete().eq('email', email);
          if (error) return json({ error: 'Falha ao apagar o backup: ' + error.message }, 500);
        }

        const { error: profErr } = await supabaseAdmin.from('profiles').delete().eq('id', user.id);
        if (profErr) return json({ error: 'Falha ao apagar o perfil: ' + profErr.message }, 500);

        const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(user.id);
        if (delErr) return json({ error: 'Falha ao apagar a conta: ' + delErr.message }, 500);

        return json({ ok: true }, 200);
      },
    },
  },
});
