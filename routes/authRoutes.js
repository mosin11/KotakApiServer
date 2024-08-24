const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { optionchain, expirydatesData } = require('../controllers/optionsDataController');

// Define routes and associate them with controller functions
router.post('/authenticate', authController.authenticate);
router.post('/submitotp', authController.submitOTP);

module.exports = router;
