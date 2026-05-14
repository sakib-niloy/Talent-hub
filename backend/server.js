const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
require('./config/passport');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const audioRoutes = require('./routes/audioRoutes');
const videoRoutes = require('./routes/videoRoutes');
const photoRoutes = require('./routes/photoRoutes');
const commentRoutes = require('./routes/commentRoutes');
const followRoutes = require('./routes/followRoutes');
const likeRoutes = require('./routes/likeRoutes');
const path = require('path');
const sequelize = require('./config/database');
require('./models/associations'); // Ensure associations are loaded

dotenv.config();

const app = express();
app.use(express.json());

app.use(session({ secret: process.env.SESSION_SECRET || 'secret', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

// Routes
app.use('/auth', authRoutes);  // Routes for sign-up and sign-in
app.use('/users', userRoutes); // Routes for user profile

// Static file serving with proper CORS handling for both ports
app.use('/uploads', (req, res, next) => {
  const origin = req.headers.origin;
  if (['http://localhost:3000', 'http://localhost:3001'].includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    // Default to 3001 if no origin header (e.g. direct browser access) or other
    res.header('Access-Control-Allow-Origin', 'http://localhost:3001');
  }
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
}, express.static(path.join(__dirname, 'uploads')));

app.use('/api/audios', audioRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/comments', commentRoutes);
const adminRoutes = require('./routes/adminRoutes');
app.use('/api/follows', followRoutes);
app.use('/api/likes', likeRoutes);
app.use('/api/admin', adminRoutes);

sequelize.authenticate()
  .then(() => {
    console.log('Sequelize connected to the database.');
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
