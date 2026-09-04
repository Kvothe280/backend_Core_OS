const express = require('express');
const { getMood, postMood } = require('../controllers/mood.controller');

const router = express.Router();

router.get('/', getMood);
router.post('/', postMood);

module.exports = router;
