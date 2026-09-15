const db = require('../db');

class HealthController {
  async getHealth(req, res) {
    res.status(200).json({
      status: 'UP',
      service: 'task-api',
      timestamp: new Date().toISOString(),
    });
  }

  async getReadiness(req, res) {
    try {
      // Check database connectivity
      await db.query('SELECT 1');
      res.status(200).json({
        status: 'UP',
        service: 'task-api',
        checks: {
          database: 'CONNECTED',
        },
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      res.status(503).json({
        status: 'DOWN',
        service: 'task-api',
        checks: {
          database: 'DISCONNECTED',
        },
        error: 'Database connection failed',
        timestamp: new Date().toISOString(),
      });
    }
  }
}

module.exports = new HealthController();
