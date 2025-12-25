const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { logActivity } = require('./activityController'); // ✅ ADD THIS

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Semua field harus diisi' });
    }

    // Check if user exists
    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
      return res.status(400).json({ 
        message: userExists.email === email ? 'Email sudah terdaftar' : 'Username sudah digunakan'
      });
    }

    // Create user
    const user = await User.create({
      username,
      email,
      password
    });

    if (user) {
      // ✅ LOG ACTIVITY - REGISTRATION SUCCESS
      await logActivity(
        user._id,
        'Account created',
        'success',
        null,
        null,
        `New user "${username}" registered`
      );

      res.status(201).json({
        _id: user._id,
        username: user.username,
        email: user.email,
        token: generateToken(user._id),
        message: 'Registrasi berhasil!'
      });
    }
  } catch (error) {
    console.error('Register Error:', error);
    res.status(500).json({ 
      message: 'Terjadi kesalahan saat registrasi',
      error: error.message 
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Email dan password harus diisi' });
    }

    // Find user by email
    const user = await User.findOne({ email });

    // Check user and password
    if (user && (await user.comparePassword(password))) {
      // ✅ LOG ACTIVITY - LOGIN SUCCESS
      await logActivity(
        user._id,
        'User logged in',
        'info',
        null,
        null,
        `Login successful from browser`
      );

      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        token: generateToken(user._id, rememberMe),
        message: 'Login berhasil!'
      });
    } else {
      // ✅ LOG ACTIVITY - LOGIN FAILED (only if user exists)
      if (user) {
        await logActivity(
          user._id,
          'Login failed',
          'warning',
          null,
          null,
          'Invalid password attempt'
        );
      }

      res.status(401).json({ message: 'Email atau password salah' });
    }
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ 
      message: 'Terjadi kesalahan saat login',
      error: error.message 
    });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    console.error('GetMe Error:', error);
    res.status(500).json({ message: 'Gagal mengambil data user' });
  }
};

module.exports = { register, login, getMe };