import express from 'express';
import type { Request, Response } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';

import { swaggerSpec } from './config/swagger.config.js';

import userRoutes from './routes/user.routes.js';
import orgaRoutes from './routes/orga.routes.js';
import eventRoutes from './routes/event.routes.js';
import matchRoutes from './routes/match.routes.js';
import whitelistRoutes from './routes/whitelist.routes.js';
import photoRoutes from './routes/photo.routes.js';
import reportRoutes from './routes/report.routes.js';

import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import logger from './utils/logger.js';
import pool from './config/database.js';
import { errorHandler } from './utils/errors.js';
import { apiLimiter } from './middleware/rateLimit.middleware.js';
import { initializeSocket } from './socket/index.js';
import { runMigrations } from './migrate.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

const io = initializeSocket(httpServer);

app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production'
    ? { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } }
    : false,
}));
app.use(cookieParser());
app.use(pinoHttp({ logger }));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

const uploadsPath = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsPath));

const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);

if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) {
  throw new Error('CORS_ORIGINS must be set in production');
}

app.use(cors({
  origin: allowedOrigins.length > 0 ? allowedOrigins : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));

if (process.env.NODE_ENV !== 'production') {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      syntaxHighlight: {
        activate: true,
        theme: 'monokai'
      }
    }
  }));

  app.get('/api-docs.json', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}

app.use('/api', apiLimiter);

// Photo routes must come before user routes (more specific path first)
app.use('/api/users/photos', photoRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orga', orgaRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/events', whitelistRoutes); // Whitelist routes under /api/events/:id/whitelist
app.use('/api/events', reportRoutes); // Report routes under /api/events/:id/reports
app.use('/api/matching', matchRoutes);

app.get('/health', async (req: Request, res: Response) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'ERROR', timestamp: new Date().toISOString() });
  }
});

app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

app.use(errorHandler);

const PORT = process.env.PORT || 3000;

async function start(): Promise<void> {
  await runMigrations();
  httpServer.listen(PORT, () => {
    logger.info({ port: PORT }, 'Server running');
    logger.info({ url: `http://localhost:${PORT}/health` }, 'Health check available');
    logger.info({ url: `http://localhost:${PORT}/api/docs` }, 'API docs available');
    logger.info('WebSocket ready');
  });
}

start().catch(err => {
  logger.fatal({ err }, 'Failed to start server');
  process.exit(1);
});

function shutdown(signal: string): void {
  logger.info({ signal }, 'Shutting down...');
  httpServer.close(() => {
    io.close(() => {
      pool.end(() => {
        logger.info('Server stopped');
        process.exit(0);
      });
    });
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  if (reason && typeof reason === 'object' && 'isOperational' in reason && (reason as any).isOperational) {
    logger.error({ err: reason }, 'Unhandled operational rejection (non-fatal)');
    return;
  }
  logger.fatal({ err: reason }, 'Unhandled Rejection');
  shutdown('unhandledRejection');
});

process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'Uncaught Exception');
  shutdown('uncaughtException');
});
