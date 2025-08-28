const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();
const dhiraaguRoutes = require('./routes/dhiraaguRoutes');

const app = express();

// Enable CORS for all routes
app.use(cors());

//Middleware to parse JSON
app.use(express.json());

//Define a routes
app.use('/api', dhiraaguRoutes);

//Default route
app.get('/', (req, res) => {
  res.send('Hello World!');
});

module.exports = app;