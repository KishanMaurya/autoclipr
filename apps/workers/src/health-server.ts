import { createServer, type Server } from 'node:http';

let server: Server | null = null;

/** Minimal HTTP server so Railway healthchecks pass (workers have no Nest HTTP app). */
export function startHealthServer(): void {
  if (server) return;

  const port = Number(process.env.PORT ?? 8080);

  server = createServer((req, res) => {
    if (req.url === '/health' || req.url === '/health/') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'ok',
          service: 'autoclipr-workers',
          commit: process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
        }),
      );
      return;
    }

    res.writeHead(404);
    res.end();
  });

  server.listen(port, '0.0.0.0', () => {
    console.log(`Worker health server listening on 0.0.0.0:${port}`);
  });
}
