const express = require('express');
const router = express.Router();
const config = require('../config');

/**
 * POST /api/login
 * Authenticate user and create session
 */
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  logger.info(`Login attempt for username: ${username}`);
  
  if (!username || !password) {
    return res.status(400).json({ 
      success: false, 
      error: 'Username and password are required' 
    });
  }
  
  // Validate credentials
  if (username === config.ADMIN_USERNAME && password === config.ADMIN_PASSWORD) {
    req.session.isAuthenticated = true;
    req.session.username = username;
    
    logger.info(`User ${username} logged in successfully`);
    
    return res.json({ 
      success: true, 
      message: 'Login successful',
      redirect: '/dashboard.html'
    });
  }
  
  logger.warn(`Failed login attempt for username: ${username}`);
  
  return res.status(401).json({ 
    success: false, 
    error: 'Invalid username or password' 
  });
});

/**
 * POST /api/logout
 * Destroy session and logout user
 */
router.post('/logout', (req, res) => {
  const username = req.session.username || 'unknown';
  
  req.session.destroy((err) => {
    if (err) {
      logger.error(`Logout error for ${username}: ${err.message}`);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to logout' 
      });
    }
    
    logger.info(`User ${username} logged out`);
    
    res.json({ 
      success: true, 
      message: 'Logged out successfully',
      redirect: '/login.html'
    });
  });
});

/**
 * GET /api/session
 * Check if user is authenticated
 */
router.get('/session', (req, res) => {
  if (req.session && req.session.isAuthenticated) {
    return res.json({ 
      success: true, 
      authenticated: true,
      username: req.session.username
    });
  }
  
  res.json({ 
    success: true, 
    authenticated: false 
  });
});

module.exports = router;
