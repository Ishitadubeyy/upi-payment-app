import { createApp } from './app.js';
import { connectDb } from './config/db.js';
import { env } from './config/env.js';

const app = createApp();

async function start() {
  await connectDb();
  app.listen(env.port, () => {
    console.log(`PayFlow UPI API listening on http://localhost:${env.port} (demo simulator)`);
  });
}

start().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
