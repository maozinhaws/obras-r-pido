import { createFileRoute } from '@tanstack/react-router';

// Expõe URL + chave publishable do backend Lovable Cloud para o app legado
// (public/pintor/). A publishable key foi projetada para ser pública — o RLS
// (Row Level Security) e as policies protegem os dados.
export const Route = createFileRoute('/api/public/supabase-config')({
  server: {
    handlers: {
      GET: async () => {
        const url = process.env.SUPABASE_URL || '';
        const key = process.env.SUPABASE_PUBLISHABLE_KEY || '';
        return new Response(
          JSON.stringify({ url, key }),
          {
            status: 200,
            headers: {
              'content-type': 'application/json',
              'cache-control': 'public, max-age=300',
            },
          },
        );
      },
    },
  },
});
