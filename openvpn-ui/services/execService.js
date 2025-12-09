const { exec } = require('child_process');

/**
 * Logger for exec commands
 */
const logger = {
  info: (msg) => {
    if (process.env.DEBUG_EXEC === 'true') {
      console.log(`[execService] ${msg}`);
    }
  },
  error: (msg) => {
    console.error(`[execService] ${msg}`);
  }
};

/**
 * Execute a shell command and return a promise
 * @param {string} cmd - Command to execute
 * @param {object} options - Execution options
 * @returns {Promise<string>} - Command output
 */
function runCommand(cmd, options = {}) {
  return new Promise((resolve, reject) => {
    logger.info(`Executing: ${cmd}`);
    
    const execOptions = {
      maxBuffer: 1024 * 1024, // 1MB buffer
      timeout: 30000, // 30 second timeout
      ...options
    };
    
    exec(cmd, execOptions, (error, stdout, stderr) => {
      if (error) {
        logger.error(`Command failed: ${cmd}`);
        logger.error(`Error: ${stderr || error.message}`);
        
        // Create structured error
        const err = new Error(stderr || error.message || 'Command execution failed');
        err.code = error.code;
        err.cmd = cmd;
        err.stderr = stderr;
        
        return reject(err);
      }
      
      logger.info(`Command succeeded: ${cmd}`);
      resolve(stdout.trim());
    });
  });
}

/**
 * Legacy function for backward compatibility
 */
function run(cmd, options = {}) {
  return runCommand(cmd, options);
}

/**
 * Run command with sudo (non-interactive)
 * @param {string} cmd - Command to execute with sudo
 * @returns {Promise<string>}
 */
function runSudo(cmd) {
  return runCommand(`sudo -n ${cmd}`);
}

/**
 * Check if a command exists on the system
 * @param {string} command - Command name to check
 * @returns {Promise<boolean>}
 */
async function commandExists(command) {
  try {
    await runCommand(`which ${command}`);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Check if sudo is configured for passwordless access
 * @param {string} command - Command to test
 * @returns {Promise<boolean>}
 */
async function checkSudoAccess(command = 'pivpn') {
  try {
    await runCommand(`sudo -n -l ${command}`);
    return true;
  } catch (error) {
    return false;
  }
}

module.exports = {
  runCommand,
  run,
  runSudo,
  commandExists,
  checkSudoAccess
};
