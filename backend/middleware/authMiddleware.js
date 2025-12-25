const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  // Validasi JWT_SECRET harus ada
  if (!process.env.JWT_SECRET) {
    console.error('❌ JWT_SECRET tidak ditemukan di environment variables!');
    return res.status(500).json({ message: 'Server configuration error' });
  }

  // Check for token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token (exclude password)
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ message: 'User tidak ditemukan' });
      }

      next(); // ✅ CALL NEXT HERE!
    } catch (error) {
      console.error('Auth Middleware Error:', error.message);
      
      // Specific error messages
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expired, silakan login kembali' });
      } else if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Token tidak valid' });
      }
      
      return res.status(401).json({ message: 'Token tidak valid atau expired' });
    }
  } else {
 
    return res.status(401).json({ message: 'Akses ditolak, token tidak ditemukan' });
  }
};

module.exports = { protect };