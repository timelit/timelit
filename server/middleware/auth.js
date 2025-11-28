const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      // Allow anonymous access - create a default user object
      req.user = {
        _id: 'anonymous',
        email: 'anonymous@local',
        name: 'Anonymous User'
      };
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        // Fallback to anonymous if user not found
        req.user = {
          _id: 'anonymous',
          email: 'anonymous@local',
          name: 'Anonymous User'
        };
        return next();
      }

      next();
    } catch (error) {
      logger.warn('Token verification failed, allowing anonymous access:', error.message);
      // Allow anonymous access even with invalid token
      req.user = {
        _id: 'anonymous',
        email: 'anonymous@local',
        name: 'Anonymous User'
      };
      next();
    }
  } catch (error) {
    logger.error('Auth middleware error:', error);
    // Allow anonymous access on error
    req.user = {
      _id: 'anonymous',
      email: 'anonymous@local',
      name: 'Anonymous User'
    };
    next();
  }
};

// Grant access to specific roles (if needed in future)
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    next();
  };
};

module.exports = {
  protect,
  authorize
};