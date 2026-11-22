const config = require('./config/env'); // must be first: loads + validates environment
const path = require('path');
const express = require('express');
const session = require('express-session');
const passport = require('passport');
require('./config/passport');
const { applySecurity, uploadsHeaders } = require('./middleware/security');
const { apiLimiter } = require('./middleware/rateLimit');
const { notFound, errorHandler, sanitizeServerErrors } = require('./middleware/errorHandler');
const { UPLOAD_ROOT } = require('./middleware/upload');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const audioRoutes = require('./routes/audioRoutes');
const videoRoutes = require('./routes/videoRoutes');
const photoRoutes = require('./routes/photoRoutes');
const commentRoutes = require('./routes/commentRoutes');
const followRoutes = require('./routes/followRoutes');
const likeRoutes = require('./routes/likeRoutes');
const adminRoutes = require('./routes/adminRoutes');
const sequelize = require('./config/database');
require('./models/associations'); // Ensure associations are loaded

const app = express();

// Security headers, CORS allow-list, body size limits, request IDs
applySecurity(app);
app.use(sanitizeServerErrors);

// Session is only used for the Google OAuth handshake.
// NOTE: default MemoryStore is single-process only; replaced by stateless auth in Phase 2.
app.use(
  session({
    name: 'th.sid',
    secret: config.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000,
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/auth', authRoutes); // sign-up / sign-in (rate limited + validated in the router)
app.use('/users', apiLimiter, userRoutes);

// User-uploaded media: served with sandboxing headers, no directory listing, no dotfiles
app.use(
  '/uploads',
  uploadsHeaders,
  express.static(UPLOAD_ROOT, { index: false, dotfiles: 'deny', fallthrough: false, maxAge: '7d' })
);

app.use('/api', apiLimiter);
app.use('/api/audios', audioRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/follows', followRoutes);
app.use('/api/likes', likeRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFound);
app.use(errorHandler);

sequelize
  .authenticate()
  .then(() => console.log('Sequelize connected to the database.'))
  .catch((err) => console.error('Unable to connect to the database:', err.message || err.original?.code || err.name));

app.listen(config.PORT, () => {
  console.log(`Server running on port ${config.PORT} (${config.NODE_ENV})`);
});
