require('dotenv').config();
const cors = require('cors');
const express = require('express');
const app = express();
const authRoutes = require('./routes/authRoutes');
const optionsData = require('./routes/optionsData');
const logger = require('./logger/logger');
const bodyParser = require('body-parser');

// Middleware
app.use(express.json());
app.use(cors());
app.use(bodyParser.json());
// Routes
app.use('/api', authRoutes);
app.use('/data', optionsData);

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`)
    //console.log(`Server is running on port ${PORT}`);
});
