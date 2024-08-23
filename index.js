require('dotenv').config();
const cors = require('cors');
const express = require('express');
const app = express();
const authRoutes = require('./routes/authRoutes');

// Middleware
app.use(express.json());
app.use(cors());

// Routes
app.use('/api', authRoutes);

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
