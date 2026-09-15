const app = require('./app');
const config = require('./config');
const db = require('./db');

let server;

async function startServer() {
  try {
    console.log('[API] Initializing database...');
    await db.initDb();

    server = app.listen(config.port, () => {
      console.log(
        JSON.stringify({
          level: 'info',
          timestamp: new Date().toISOString(),
          service: 'task-api',
          message: `Task API Server running on port ${config.port}`,
          environment: config.env,
        })
      );
    });
  } catch (err) {
    console.error('[API] Failed to start server:', err);
    process.exit(1);
  }
}

// Graceful shutdown handling
function handleShutdown(signal) {
  console.log(`[API] Received ${signal}. Starting graceful shutdown...`);
  if (server) {
    server.close(async () => {
      console.log('[API] HTTP server closed.');
      try {
        await db.pool.end();
        console.log('[API] PostgreSQL connection pool closed.');
        process.exit(0);
      } catch (err) {
        console.error('[API] Error during database shutdown:', err);
        process.exit(1);
      }
    });
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

startServer();
