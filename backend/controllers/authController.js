const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');

// Signup Controller
exports.signup = async (req, res) => {
  console.log('Signup request:', req.body);
  const { email, password, name } = req.body;
  try {
    // Check if email already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      console.log('Signup error: Email already registered');
      return res.status(400).json({ error: 'Email already registered' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = { email, password: hashedPassword, name };
    const createdUser = await User.create(newUser);
    // Generate JWT token
    const token = jwt.sign({ id: createdUser.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    console.log('Signup success:', createdUser);
    res.status(201).json({ message: 'User registered successfully', token, user: { id: createdUser.id, email: createdUser.email, name: createdUser.name } });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Error registering user', details: err.message });
  }
};

// Signin Controller
exports.signin = async (req, res) => {
  console.log('Signin request:', req.body);
  const { email, password } = req.body;
  try {
    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      console.log('Signin error: Email not registered');
      return res.status(401).json({ error: 'Email not registered' });
    }
    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('Signin error: Incorrect password');
      return res.status(401).json({ error: 'Incorrect password' });
    }
    // Generate JWT token
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    console.log('Signin success:', user);
    res.status(200).json({ message: 'Login successful', token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    console.error('Signin error:', err);
    res.status(500).json({ error: 'Error during login', details: err.message });
  }
};

// Middleware to protect routes
exports.protect = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Unauthorized' });
    req.user = decoded;
    next();
  });
};
