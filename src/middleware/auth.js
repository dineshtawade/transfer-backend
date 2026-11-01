const crypto = require('crypto');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized: Missing or malformed Authorization header. Expected Bearer token.',
    });
  }

  const token = authHeader.substring(7).trim();
  const expectedToken = process.env.API_TOKEN;

  if (!expectedToken) {
    console.error('[Auth] API_TOKEN environment variable is not configured.');
    return res.status(500).json({ error: 'Server authentication misconfigured.' });
  }

  // Safe length and value comparison
  if (token.length !== expectedToken.length) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API token.' });
  }

  const tokenBuffer = Buffer.from(token, 'utf8');
  const expectedBuffer = Buffer.from(expectedToken, 'utf8');

  try {
    if (!crypto.timingSafeEqual(tokenBuffer, expectedBuffer)) {
      return res.status(401).json({ error: 'Unauthorized: Invalid API token.' });
    }
  } catch {
    return res.status(401).json({ error: 'Unauthorized: Invalid API token.' });
  }

  next();
}

module.exports = { authenticate };
