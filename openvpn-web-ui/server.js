const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const winston = require('winston');
const fs = require('fs');
const config = require('./config');

// Import routes
const authRoutes = require('./routes/auth');
const clientRoutes = require('./routes/clients');

// Initialize Express app
const app = express();

// Ensure logs directory exists
if (!fs.existsSync(config.LOG_DIR)) {
  fs.mkdirSync(config.LOG_DIR, { recursive: true });
}

// Configure Winston logger
const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(info => `${info.timestamp} [${info.level.toUpperCase()}]: ${info.message}`)
  ),
  transports: [
    new winston.transports.File({ 
      filename: path.join(config.LOG_DIR, config.LOG_FILE),
      maxsize: 10485760, // 10MB
      maxFiles: 5
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Make logger globally available
global.logger = logger;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session middleware
app.use(session({
  secret: config.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: config.SESSION_MAX_AGE,
    httpOnly: true,
    secure: false // Set to true if using HTTPS
  }
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (req.session && req.session.isAuthenticated) {
    return next();
  }
  
  // For API requests, return JSON error
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  
  // For page requests, redirect to login
  return res.redirect('/login.html');
};

// Routes
app.use('/api', authRoutes);
app.use('/api/clients', requireAuth, clientRoutes);

// Protected HTML pages - redirect to login if not authenticated
app.get('/', requireAuth, (req, res) => {
  res.redirect('/dashboard.html');
});

app.get('/dashboard.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/clients.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'clients.html'));
});

app.get('/logs.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'logs.html'));
});

// Login page (public)
app.get('/login.html', (req, res) => {
  if (req.session && req.session.isAuthenticated) {
    return res.redirect('/dashboard.html');
  }
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// API endpoint to get logs
app.get('/api/logs', requireAuth, (req, res) => {
  const logFile = path.join(config.LOG_DIR, config.LOG_FILE);
  
  fs.readFile(logFile, 'utf8', (err, data) => {
    if (err) {
      logger.error('Failed to read log file: ' + err.message);
      return res.status(500).json({ success: false, error: 'Failed to read logs' });
    }
    
    // Get last 200 lines
    const lines = data.split('\n').filter(line => line.trim());
    const lastLines = lines.slice(-200);
    
    res.json({ success: true, logs: lastLines.join('\n') });
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

// Start server
app.listen(config.PORT, config.HOST, () => {
  logger.info(`========================================`);
  logger.info(`OpenVPN Web UI Server Started`);
  logger.info(`========================================`);
  logger.info(`Server running at http://${config.HOST}:${config.PORT}`);
  logger.info(`System User: ${config.SYSTEM_USER}`);
  logger.info(`OpenVPN Config: ${config.OPENVPN_CONFIG_DIR}`);
  logger.info(`========================================`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  process.exit(0);
});
