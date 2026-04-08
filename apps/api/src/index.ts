import 'dotenv/config';
import { createApp } from './app.js';

const port = parseInt(process.env.PORT ?? '4000', 10);

const app = await createApp();

await app.listen({ port, host: '0.0.0.0' });
