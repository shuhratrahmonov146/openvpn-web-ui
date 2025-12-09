const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const session = require('express-session');
const bodyParser = require('body-parser');
const config = require('./config');
const vpnController = require('./controllers/vpnController');

const app = express();

// Middleware
app.use(cors());
app.use(morgan(config.LOG_LEVEL));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(
  session({
    secret: config.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
      secure: config.NODE_ENV === 'production' && config.USE_HTTPS === true
    }
  })
);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/views', express.static(path.join(__dirname, 'views')));

// Authentication middleware
function isAuthenticated(req, res, next) {
  if (req.session && req.session.loggedIn) {
    return next();
  }
  
  // For API requests, return JSON error
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }
  
  // For page requests, redirect to login
  return res.redirect('/login');
}

// Login page
app.get('/login', (req, res) => {
  if (req.session && req.session.loggedIn) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Login handler
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === config.ADMIN_USERNAME && password === config.ADMIN_PASSWORD) {
    req.session.loggedIn = true;
    req.session.username = username;
    
    // Return JSON for AJAX requests
    if (req.headers['content-type']?.includes('application/json')) {
      return res.json({ success: true, redirect: '/' });
    }
    
    return res.redirect('/');
  }
  
  // Return JSON error for AJAX requests
  if (req.headers['content-type']?.includes('application/json')) {
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
  }
  
  res.send('Invalid credentials. <a href="/login">Try again</a>');
});

// Logout handler
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destruction error:', err);
    }
    res.redirect('/login');
  });
});

// Health check endpoint (public)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Protect all routes below with authentication
app.use(isAuthenticated);

// API Routes
app.get('/api/status', vpnController.getStatus);
app.get('/api/server-info', vpnController.getServerInfo);
app.get('/api/users', vpnController.listUsers);
app.post('/api/users/add', vpnController.addUser);
app.post('/api/users/revoke', vpnController.revokeUser);
app.get('/api/users/download/:name', vpnController.downloadConfig);
app.get('/api/logs', vpnController.getLogs);
app.get('/api/service/restart', vpnController.restartService);
app.get('/api/clients', vpnController.getConnectedClients);

// Frontend routes - serve HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/users', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'users.html'));
});

app.get('/logs', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'logs.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: config.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

// Start server
app.listen(config.PORT, config.HOST, () => {
  console.log('========================================');
  console.log('  OpenVPN Management UI');
  console.log('========================================');
  console.log(`Server running at http://${config.HOST}:${config.PORT}`);
  console.log(`Environment: ${config.NODE_ENV}`);
  console.log(`Admin User: ${config.ADMIN_USERNAME}`);
  console.log('Session-based authentication: Enabled');
  console.log('========================================');
  console.log('Login at: http://localhost:' + config.PORT + '/login');
  console.log('========================================');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});
