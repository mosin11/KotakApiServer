require('dotenv').config();
const cors = require('cors');
const express = require('express');
const app = express();
const authRoutes = require('./routes/authRoutes');
const optionsData = require('./routes/optionsData');
const logger = require('./logger/logger');
const bodyParser = require('body-parser');
const path = require('path');

// Middleware
app.use(express.json());
app.use(cors());
app.use(bodyParser.json());
// Middleware
logger.info('Middleware setup complete');
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files if needed
logger.info('Static files served from public directory');
// Routes
app.use('/api', authRoutes);
logger.info('Auth routes mounted on /api');
app.use('/data', optionsData);
logger.info('Options data routes mounted on /data');

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`)
    //console.log(`Server is running on port ${PORT}`);
});
