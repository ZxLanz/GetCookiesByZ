const jwt = require('jsonwebtoken');

const generateToken = (userId, rememberMe = false) => {
  // Validasi JWT_SECRET harus ada
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET tidak ditemukan di environment variables!');
  }

  // Token expires in 1 day (default) or 30 days (if remember me)
  const expiresIn = rememberMe ? '30d' : '1d';
  
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn }
  );
};

module.exports = generateToken;