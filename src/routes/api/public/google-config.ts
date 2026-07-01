import { createFileRoute } from '@tanstack/react-router';

// Expõe apenas o Client ID público do Google OAuth para o app legado
// (public/pintor/index.html). Client IDs OAuth de Web App são projetados
// para serem públicos — o segredo real é o Client Secret (não usado aqui,
// pois o fluxo é implicit/GIS no navegador).
export const Route = createFileRoute('/api/public/google-config')({
  server: {
    handlers: {
      GET: async () => {
        const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID || '';
        return new Response(
          JSON.stringify({ clientId }),
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
