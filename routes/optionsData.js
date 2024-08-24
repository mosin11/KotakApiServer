const express = require('express');
const router = express.Router();


const { optionchain, expirydatesData } = require('../controllers/optionsDataController');
router.post('/optionchain', optionchain);
router.post('/expirydates', expirydatesData);
module.exports = router;
