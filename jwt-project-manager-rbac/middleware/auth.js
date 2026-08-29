const jwt = require('jsonwebtoken');

function auth(req, res, next) {

  const header = req.headers.authorization || '';
  const [scheme, tokenFromHeader] = header.split(' ');

  const tokenFromCookie = req.cookies?.access_token;

  const token =
    scheme === 'Bearer' && tokenFromHeader
      ? tokenFromHeader
      : tokenFromCookie;

  if (!token) {
    return res.status(401).json({
      message: 'No token provided'
    });
  }

  try {

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.user = {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role,
      permissions: decoded.permissions || [],
      direction: decoded.direction,
      department: decoded.department
    };

    next();

  } catch (err) {

    const msg =
      err.name === 'TokenExpiredError'
        ? 'Access token expired'
        : 'Invalid token';

    return res.status(401).json({
      message: msg
    });
  }
}

module.exports = auth;