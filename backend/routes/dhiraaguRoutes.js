const express = require('express');
const dhiraaguController = require('../controllers/dhiraaguController');
const router = express.Router();

router.get('/customer', dhiraaguController.getContactDetails);

router.post('/subscribe', dhiraaguController.handleSubscribe);

module.exports = router;