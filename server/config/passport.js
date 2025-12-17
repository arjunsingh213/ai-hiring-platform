const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

// Serialize user for session
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

// Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
        passReqToCallback: true
    }, async (req, accessToken, refreshToken, profile, done) => {
        try {
            // Get role from session state (passed as query param)
            const role = req.query.state || 'jobseeker';

            // Check if user already exists with this Google ID
            let user = await User.findOne({ 'oauth.googleId': profile.id });

            if (user) {
                // User exists, log them in
                return done(null, user);
            }

            // Check if user exists with this email
            const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
            if (email) {
                user = await User.findOne({ email: email });
                if (user) {
                    // Link Google account to existing user
                    user.oauth = user.oauth || {};
                    user.oauth.googleId = profile.id;
                    user.oauth.provider = 'google';
                    await user.save();
                    return done(null, user);
                }
            }

            // Create new user
            const newUser = new User({
                email: email,
                role: role,
                isVerified: true, // OAuth users are auto-verified
                oauth: {
                    googleId: profile.id,
                    provider: 'google'
                },
                profile: {
                    name: profile.displayName || '',
                    photo: profile.photos && profile.photos[0] ? profile.photos[0].value : ''
                }
            });

            await newUser.save();
            return done(null, newUser);
        } catch (err) {
            console.error('Google OAuth error:', err);
            return done(err, null);
        }
    }));
    console.log('✓ Google OAuth strategy configured');
} else {
    console.log('⚠ Google OAuth not configured - missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
}

module.exports = passport;
