const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const passport = require('passport');
const helmet = require('helmet');
const mongoSanitize = require('mongoose-sanitize');
const logger = require('./utils/logger');

dotenv.config();

require('./passport-config');

const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const taskRoutes = require('./routes/tasks');
const userRoutes = require('./routes/users');
const integrationRoutes = require('./routes/integrations');
const errorHandler = require('./middleware/errorHandler');

const app = express();

if (!process.env.JWT_SECRET) {
  logger.error('FATAL: JWT_SECRET environment variable is not set');
  process.exit(1);
}

if (!process.env.MONGODB_URI) {
  logger.error('FATAL: MONGODB_URI environment variable is not set');
  process.exit(1);
}

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(mongoSanitize());

app.use(passport.initialize());

mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
.then(() => logger.info('MongoDB connected successfully'))
.catch(err => {
  logger.error('MongoDB connection failed:', err);
  process.exit(1);
});

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/users', userRoutes);
app.use('/api/integrations', integrationRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, closing server...');
  server.close(() => {
    logger.info('Server closed');
    mongoose.connection.close(false, () => {
      logger.info('MongoDB connection closed');
      process.exit(0);
    });
  });
});

module.exports = app;
