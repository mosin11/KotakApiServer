const express = require('express');
const router = express.Router();
const { optionchain, expirydatesData } = require('../controllers/optionsDataController');
const { processCsvFile } = require('../controllers/csvDataParse');
const logger = require('../logger/logger');

// Route to handle option chain data
router.post('/optionchain', (req, res) => {
    logger.info('Received request for /optionchain');
    optionchain(req, res);
});
// Route to handle expiry dates data
router.post('/expirydates', (req, res) => {
    logger.info('Received request for /expirydates');
    expirydatesData(req, res);
});
// Route to process CSV files
router.post('/process-csv', (req, res) => {
    logger.info('Received request for /process-csv');
    processCsvFile(req, res);
});
module.exports = router;

