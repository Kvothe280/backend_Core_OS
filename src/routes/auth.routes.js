const express = require('express');
const { limiterAuth } = require('../middlewares/rateLimiters');
const { login } = require('../controllers/auth.controller');

const router = express.Router();

router.post('/login', limiterAuth, login);

module.exports = router;
