const express = require('express');
const router = express.Router();
const healthController = require('../controllers/healthController');

router.get('/health', (req, res) => healthController.getHealth(req, res));
router.get('/ready', (req, res) => healthController.getReadiness(req, res));

module.exports = router;
