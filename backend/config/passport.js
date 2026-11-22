const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/user');
const config = require('./env');

// Google OAuth is only enabled when real credentials are configured (no dummy fallbacks).
if (config.googleOAuthEnabled) {
  passport.use(new GoogleStrategy({
      clientID: config.GOOGLE_CLIENT_ID,
      clientSecret: config.GOOGLE_CLIENT_SECRET,
      callbackURL: config.GOOGLE_CALLBACK_URL
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        // Only trust Google-verified emails; otherwise an attacker could link a Google
        // account to someone else's existing password account (account takeover).
        const emailVerified = profile.emails?.[0]?.verified === true || profile._json?.email_verified === true;
        if (!email || !emailVerified) {
          return done(null, false, { message: 'Google account email is not verified' });
        }

        let user = await User.findByEmail(email);
        if (!user) {
          // Register if new
          user = await User.create({
            google_id: profile.id,
            email,
            name: profile.displayName
          });
        } else if (!user.google_id) {
          // Link account if it exists by email but lacks google_id
          await User.update({ google_id: profile.id }, { where: { id: user.id } });
        }
        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  ));
} else {
  console.warn('Google OAuth disabled: GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set.');
}

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});
