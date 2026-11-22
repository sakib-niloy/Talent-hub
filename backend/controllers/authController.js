const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const config = require('../config/env');

const JWT_ALGORITHM = 'HS256';
const signToken = (userId) =>
  jwt.sign({ id: userId }, config.JWT_SECRET, { algorithm: JWT_ALGORITHM, expiresIn: config.JWT_EXPIRES_IN });

// Used to keep sign-in timing constant when the email doesn't exist (prevents user enumeration).
const DUMMY_HASH = bcrypt.hashSync('timing-equaliser-not-a-real-password', 10);
const INVALID_CREDENTIALS = 'Invalid email or password';

// Signup Controller
exports.signup = async (req, res) => {
  const { email, password, name } = req.body;
  try {
    // Check if email already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = { email, password: hashedPassword, name };
    const createdUser = await User.create(newUser);
    // Generate JWT token
    const token = signToken(createdUser.id);
    console.log(`Signup success: user ${createdUser.id}`);
    res.status(201).json({ message: 'User registered successfully', token, user: { id: createdUser.id, email: createdUser.email, name: createdUser.name } });
  } catch (err) {
    console.error('Signup error:', err.message);
    res.status(500).json({ error: 'Error registering user' });
  }
};

// Signin Controller
exports.signin = async (req, res) => {
  const { email, password } = req.body;
  try {
    // Find user by email
    const user = await User.findByEmail(email);
    // Always run a bcrypt compare (against a dummy hash if needed) so response time
    // doesn't reveal whether the email exists or the account is Google-only.
    const isMatch = await bcrypt.compare(password, user?.password || DUMMY_HASH);
    if (!user || !user.password || !isMatch) {
      return res.status(401).json({ error: INVALID_CREDENTIALS });
    }
    // Generate JWT token
    const token = signToken(user.id);
    res.status(200).json({ message: 'Login successful', token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    console.error('Signin error:', err.message);
    res.status(500).json({ error: 'Error during login' });
  }
};

// Middleware to protect routes
exports.protect = (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return res.status(401).json({ error: 'Unauthorized' });

  jwt.verify(token, config.JWT_SECRET, { algorithms: [JWT_ALGORITHM] }, (err, decoded) => {
    if (err || !decoded?.id) return res.status(401).json({ error: 'Unauthorized' });
    req.user = decoded;
    next();
  });
};
