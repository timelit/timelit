const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const net = require('net');
const dns = require('dns').promises;
const tls = require('tls');
const passport = require('passport');
const helmet = require('helmet');
const mongoSanitize = require('mongoose-sanitize');
const logger = require('./utils/logger');

dotenv.config();

require('./passport-config');

const taskRoutes = require('./routes/tasks');
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const userRoutes = require('./routes/users');
const integrationRoutes = require('./routes/integrations');
const schedulingRoutes = require('./routes/scheduling');
const errorHandler = require('./middleware/errorHandler');

const app = express();

if (!process.env.JWT_SECRET) {
  logger.error('FATAL: JWT_SECRET environment variable is not set');
  process.exit(1);
}

const MONGODB_URI_ATLAS = process.env.MONGODB_URI_ATLAS || process.env.MONGODB_URI;
const MONGODB_URI_LOCAL = process.env.MONGODB_URI_LOCAL;
const ENABLE_INMEMORY_MONGO =
  String(process.env.ENABLE_INMEMORY_MONGO || '').toLowerCase() === 'true' ||
  process.env.NODE_ENV === 'development';

if (!MONGODB_URI_ATLAS && !MONGODB_URI_LOCAL && !ENABLE_INMEMORY_MONGO) {
  logger.error('FATAL: No MongoDB connection configured. Set MONGODB_URI_ATLAS (or MONGODB_URI) and/or MONGODB_URI_LOCAL, or enable ENABLE_INMEMORY_MONGO=true');
  process.exit(1);
}

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
// app.use(mongoSanitize()); // Temporarily disabled - causing mongoose plugin errors

app.use(passport.initialize());

function maskMongoUri(uri) {
  if (!uri) return uri;
  // Mask password (and anything between ':' and '@' after scheme)
  return uri.replace(/:\/\/([^:]+):([^@]+)@/i, '://$1:****@');
}

function extractMongoSrvHostname(uri) {
  // Supports mongodb+srv://user:pass@host/...
  const match = String(uri).match(/^mongodb\+srv:\/\/[^@]+@([^/]+)\//i);
  return match ? match[1] : null;
}

function tcpProbe(host, port, timeoutMs) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    let done = false;
    const finish = (result) => {
      if (done) return;
      done = true;
      try { socket.destroy(); } catch (_) {}
      resolve(result);
    };

    socket.setTimeout(timeoutMs);
    socket.on('connect', () => finish({ ok: true }));
    socket.on('timeout', () => finish({ ok: false, code: 'TIMEOUT' }));
    socket.on('error', (err) => finish({ ok: false, code: err.code || 'ERROR', message: err.message }));
  });
}

function tlsProbe(host, port, timeoutMs) {
  return new Promise((resolve) => {
    const socket = tls.connect({
      host,
      port,
      servername: host,
      // We only care whether the handshake completes; cert validation is performed by the MongoDB driver.
      rejectUnauthorized: false,
    });

    let done = false;
    const finish = (result) => {
      if (done) return;
      done = true;
      try { socket.destroy(); } catch (_) {}
      resolve(result);
    };

    socket.setTimeout(timeoutMs);
    socket.on('secureConnect', () => finish({ ok: true, authorized: socket.authorized, authorizationError: socket.authorizationError }));
    socket.on('timeout', () => finish({ ok: false, code: 'TIMEOUT' }));
    socket.on('error', (err) => finish({ ok: false, code: err.code || 'ERROR', message: err.message }));
  });
}

async function preflightMongoConnectivity(uri) {
  if (!String(process.env.MONGO_PREFLIGHT || '').toLowerCase() === 'true') {
    return;
  }

  if (!String(uri || '').startsWith('mongodb+srv://')) {
    logger.info('Mongo preflight: skipping (not a mongodb+srv URI)', { service: 'timelit-server' });
    return;
  }

  const hostname = extractMongoSrvHostname(uri);
  logger.info(`Mongo preflight: node=${process.versions.node} mongoose=${mongoose.version} env=${process.env.NODE_ENV}`, { service: 'timelit-server' });
  logger.info(`Mongo preflight: uri=${maskMongoUri(uri)}`, { service: 'timelit-server' });

  if (!hostname) {
    logger.error('Mongo preflight: could not extract SRV hostname from MONGODB_URI (expected mongodb+srv://...@<host>/...)', { service: 'timelit-server' });
    return;
  }

  try {
    const srvName = `_mongodb._tcp.${hostname}`;
    const srvRecords = await dns.resolveSrv(srvName);
    logger.info(`Mongo preflight: SRV ${srvName} => ${srvRecords.length} record(s)`, { service: 'timelit-server' });

    // Probe up to 3 records (Atlas usually returns 3)
    for (const rec of srvRecords.slice(0, 3)) {
      const target = rec.name.endsWith('.') ? rec.name.slice(0, -1) : rec.name;
      const port = rec.port || 27017;
      const probe = await tcpProbe(target, port, 2500);
      if (probe.ok) {
        logger.info(`Mongo preflight: TCP OK ${target}:${port}`, { service: 'timelit-server' });

        // If TCP connects but Mongo still cannot handshake, it's commonly because the connection is being
        // immediately closed/reset during TLS or by Atlas network access rules. This narrows it down.
        const tlsResult = await tlsProbe(target, port, 2500);
        if (tlsResult.ok) {
          logger.info(
            `Mongo preflight: TLS OK ${target}:${port} authorized=${tlsResult.authorized}${tlsResult.authorizationError ? ` authErr=${tlsResult.authorizationError}` : ''}`,
            { service: 'timelit-server' }
          );
        } else {
          logger.error(
            `Mongo preflight: TLS FAIL ${target}:${port} code=${tlsResult.code}${tlsResult.message ? ` msg=${tlsResult.message}` : ''}`,
            { service: 'timelit-server' }
          );
        }
      } else {
        logger.error(`Mongo preflight: TCP FAIL ${target}:${port} code=${probe.code}${probe.message ? ` msg=${probe.message}` : ''}`, { service: 'timelit-server' });
      }
    }
  } catch (err) {
    logger.error(`Mongo preflight: SRV resolve/probe failed: ${err.message}`, { service: 'timelit-server', code: err.code, stack: err.stack });
  }
}

mongoose.connection.on('connected', () => logger.info('MongoDB event: connected', { service: 'timelit-server' }));
mongoose.connection.on('disconnected', () => logger.error('MongoDB event: disconnected', { service: 'timelit-server' }));
mongoose.connection.on('error', (err) => logger.error(`MongoDB event: error: ${err.message}`, { service: 'timelit-server', stack: err.stack }));

async function connectToMongoUri(uri, label) {
  console.log(`Attempting to connect to MongoDB (${label})...`);
  console.log('MONGODB_URI:', maskMongoUri(uri));

  await preflightMongoConnectivity(uri);

  await mongoose.connect(uri, {
    // Keep the server startup reasonably responsive even when Atlas is blocked.
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });
  logger.info(`MongoDB connected successfully (${label})`);
}

async function connectMongoWithFallback() {
  const attempts = [];
  if (MONGODB_URI_ATLAS) attempts.push({ label: 'atlas', uri: MONGODB_URI_ATLAS });
  if (MONGODB_URI_LOCAL) attempts.push({ label: 'local', uri: MONGODB_URI_LOCAL });

  for (const attempt of attempts) {
    try {
      await connectToMongoUri(attempt.uri, attempt.label);
      return;
    } catch (err) {
      logger.error(`MongoDB connection failed (${attempt.label}): ${err.message}`, { service: 'timelit-server' });
    }
  }

  if (ENABLE_INMEMORY_MONGO) {
    try {
      // Lazy-require so production installs don't need this dependency.
      // (It will be installed as a devDependency.)
      // eslint-disable-next-line global-require
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create({
        instance: {
          dbName: 'timelit',
        },
      });
      const uri = mongod.getUri();
      await connectToMongoUri(uri, 'inmemory');
      logger.error('MongoDB fallback: using in-memory MongoDB (data will reset on restart)', { service: 'timelit-server' });
      return;
    } catch (err) {
      logger.error(`MongoDB in-memory fallback failed: ${err.message}`, { service: 'timelit-server', stack: err.stack });
    }
  }

  logger.error('FATAL: All MongoDB connection attempts failed (atlas/local/inmemory).', { service: 'timelit-server' });
  process.exit(1);
}



app.use('/api/tasks', taskRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/users', userRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/scheduling', schedulingRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

app.use(errorHandler);

let server;

async function bootstrap() {
  await connectMongoWithFallback();

  const PORT = process.env.PORT || 5002;
  server = app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });

  server.on('error', (err) => {
    logger.error(`Server listen failed: ${err.message}`, { service: 'timelit-server', code: err.code, stack: err.stack });
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  logger.error(`FATAL: Server bootstrap failed: ${err.message}`, { service: 'timelit-server', stack: err.stack });
  process.exit(1);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, closing server...');
  if (!server) {
    mongoose.connection.close(false, () => process.exit(0));
    return;
  }

  server.close(() => {
    logger.info('Server closed');
    mongoose.connection.close(false, () => {
      logger.info('MongoDB connection closed');
      process.exit(0);
    });
  });
});

module.exports = app;
