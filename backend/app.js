const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const dhiraaguRoutes = require('./routes/dhiraaguRoutes');
const { authenticateRequest } = require('./middleware/authMiddleware');

const app = express();

// Enable CORS for all routes
app.use(cors());

// Middleware to parse JSON
app.use(express.json());

// Public test route
app.get('/', (req, res) => {
  res.send('Hello World! API is running 🚀');
});

// Protected routes with API Key + Bearer Token check
app.use('/api', authenticateRequest, dhiraaguRoutes);

module.exports = app;
