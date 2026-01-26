import express from 'express';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';

import { swaggerSpec } from './config/swagger.config.js';

import userRoutes from './routes/user.routes.js';
import orgaRoutes from './routes/orga.routes.js';
import eventRoutes from './routes/event.routes.js';
import matchRoutes from './routes/match.routes.js';
import whitelistRoutes from './routes/whitelist.routes.js';

import { errorHandler } from './utils/errors.js';

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Swagger Documentation
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

// Routes
app.use('/api/users', userRoutes);
app.use('/api/orga', orgaRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/events', whitelistRoutes); // Whitelist routes under /api/events/:id/whitelist
app.use('/api/matching', matchRoutes);

// Health route
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 API Docs: http://localhost:${PORT}/api/docs`);
});