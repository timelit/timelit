const passport = require('passport');
const crypto = require('crypto');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('./models/User');
const logger = require('./utils/logger');

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    logger.error('Deserialization error:', error);
    done(error, null);
  }
});

// Google OAuth Strategy for regular login
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/google/callback`
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ googleId: profile.id });

    if (user) {
      return done(null, user);
    }

    user = await User.findOne({ email: profile.emails[0].value });

    if (user) {
      user.googleId = profile.id;
      user.avatar = profile.photos[0].value;
      await user.save();
      return done(null, user);
    }

    user = await User.create({
      name: profile.displayName,
      email: profile.emails[0].value,
      googleId: profile.id,
      avatar: profile.photos[0].value,
      password: crypto.randomBytes(32).toString('hex')
    });

    done(null, user);
  } catch (error) {
    logger.error('Google OAuth strategy error:', error);
    done(error, null);
  }
}));

// Google OAuth Strategy for Calendar integration
passport.use('google-calendar', new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/google/calendar/callback`
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const user = await User.findOne({ email: profile.emails[0].value });

    if (!user) {
      logger.warn(`User not found for Google Calendar OAuth: ${profile.emails[0].value}`);
      return done(new Error('User not found'), null);
    }

    done(null, user, {
      access_token: accessToken,
      refresh_token: refreshToken,
      expiry_date: Date.now() + (3600 * 1000)
    });
  } catch (error) {
    logger.error('Google Calendar OAuth strategy error:', error);
    done(error, null);
  }
}));

module.exports = passport;