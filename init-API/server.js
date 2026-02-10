import express from 'express';
import { createServer } from 'http';
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

import morgan from 'morgan';
import pool from './config/database.js';
import { errorHandler } from './utils/errors.js';
import { initializeSocket } from './socket/index.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

const io = initializeSocket(httpServer);

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uploadsPath = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsPath));

const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

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

app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Photo routes must come before user routes (more specific path first)
app.use('/api/users/photos', photoRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orga', orgaRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/events', whitelistRoutes); // Whitelist routes under /api/events/:id/whitelist
app.use('/api/events', reportRoutes); // Report routes under /api/events/:id/reports
app.use('/api/matching', matchRoutes);

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'ERROR', timestamp: new Date().toISOString() });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

app.use(errorHandler);

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 API Docs: http://localhost:${PORT}/api/docs`);
  console.log(`🔌 WebSocket ready`);
});

function shutdown(signal) {
  console.log(`\n${signal} received, shutting down...`);
  httpServer.close(() => {
    io.close(() => {
      pool.end(() => {
        console.log('Server stopped');
        process.exit(0);
      });
    });
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));