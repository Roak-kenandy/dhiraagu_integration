// Middleware to check API Key + Bearer Token
const authenticateRequest = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const authHeader = req.headers['authorization'];

  // Extract token from "Bearer <token>"
  const bearerToken = authHeader && authHeader.split(' ')[1];

  if (!apiKey || apiKey !== process.env.DHIRAAGU_API_KEY) {
    return res.status(401).json({ message: 'Unauthorized: Invalid or missing API Key' });
  }

  if (!bearerToken || bearerToken !== process.env.BEARER_TOKEN) {
    return res.status(401).json({ message: 'Unauthorized: Invalid or missing Bearer Token' });
  }

  // Passed both checks ✅
  next();
};

module.exports = { authenticateRequest };
