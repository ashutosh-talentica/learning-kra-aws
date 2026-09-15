const express = require('express');
const cors = require('cors');
const requestIdMiddleware = require('./middleware/requestId');
const errorHandler = require('./middleware/errorHandler');
const taskRoutes = require('./routes/taskRoutes');
const healthRoutes = require('./routes/healthRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(requestIdMiddleware);

// Structured request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      JSON.stringify({
        level: 'info',
        timestamp: new Date().toISOString(),
        service: 'task-api',
        requestId: req.id,
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: duration,
      })
    );
  });
  next();
});

// Health checks
app.use('/', healthRoutes);

// API routes
app.use('/api/tasks', taskRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Path ${req.method} ${req.originalUrl} not found`,
      requestId: req.id,
    },
  });
});

// Global error handler
app.use(errorHandler);

module.exports = app;
