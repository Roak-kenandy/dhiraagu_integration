const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
dotenv.config();

const dhiraaguRoutes = require('./routes/dhiraaguRoutes');
const { authenticateRequest } = require('./middleware/authMiddleware');

const app = express();

// Enable CORS
app.use(cors());

// Parse JSON
app.use(express.json());

// Create logs directory
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

// Middleware to log API hits
app.use('/api', (req, res, next) => {
  const logFile = path.join(logDir, 'api_hits.log');
  const logLine = `${new Date().toISOString()} | ${req.method} | ${req.originalUrl} | ${req.ip}\n`;
  fs.appendFile(logFile, logLine, (err) => {
    if (err) console.error('Failed to write API log', err);
  });
  next();
});

// Public test route
app.get('/', (req, res) => {
  res.send('Hello World! API is running 🚀');
});

// Protected routes
app.use('/api', authenticateRequest, dhiraaguRoutes);

// Utility to summarize logs with optional date range
function summarizeLogs(groupBy = 'day', startDate, endDate) {
  const logFile = path.join(logDir, 'api_hits.log');
  if (!fs.existsSync(logFile)) return {};

  const data = fs.readFileSync(logFile, 'utf8').split('\n').filter(Boolean);
  const summary = {};

  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  data.forEach(line => {
    const parts = line.split('|').map(s => s.trim());
    const timestamp = parts[0];
    const httpMethod = parts[1]; // renamed to avoid conflicts
    const url = parts[2];

    const date = new Date(timestamp);

    // Skip logs outside date range
    if ((start && date < start) || (end && date > end)) return;

    let key;
    switch (groupBy) {
      case 'year':
        key = `${date.getFullYear()}`;
        break;
      case 'month':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      case 'day':
      default:
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    const apiKey = `${httpMethod} ${url}`;

    if (!summary[key]) summary[key] = {};
    if (!summary[key][apiKey]) summary[key][apiKey] = 0;
    summary[key][apiKey]++;
  });

  return summary;
}

// Endpoint to view API logs with grouping & date range
// Example: /api/logs?groupBy=day&startDate=2025-08-01&endDate=2025-08-31
app.get('/api/logs', (req, res) => {
  const groupBy = req.query.groupBy || 'day';
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;

  const result = summarizeLogs(groupBy, startDate, endDate);
  res.json({ groupBy, startDate, endDate, summary: result });
});

module.exports = app;
