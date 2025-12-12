const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);

/**
 * Strip ANSI color codes and control characters from string
 */
function stripAnsi(str) {
  if (!str || typeof str !== 'string') return '';
  
  return str
    .replace(/\x1B\[[0-9;]*[JKmsu]/g, '') // ANSI escape codes
    .replace(/\x1B\[[\?0-9;]*[hl]/g, '')  // CSI sequences
    .replace(/\r/g, '')                    // Carriage returns
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Control characters
    .trim();
}

/**
 * Execute a system command with proper error handling
 * @param {string} command - Command to execute
 * @param {object} options - Execution options
 * @returns {Promise<{success: boolean, stdout?: string, stderr?: string, error?: string}>}
 */
async function executeCommand(command, options = {}) {
  const defaultOptions = {
    maxBuffer: 1024 * 500, // 500KB buffer
    timeout: 30000, // 30 second timeout
    env: { ...process.env, LANG: 'C', LC_ALL: 'C' }, // Force English output
    ...options
  };

  logger.info(`Executing command: ${command}`);

  try {
    const { stdout, stderr } = await execPromise(command, defaultOptions);
    
    // Clean output
    const cleanStdout = stripAnsi(stdout);
    const cleanStderr = stripAnsi(stderr);

    // Check if sudo failed
    if (cleanStderr && cleanStderr.toLowerCase().includes('password')) {
      logger.error('Sudo authentication failed');
      return {
        success: false,
        error: 'System authentication failed. Check sudo configuration.'
      };
    }

    // Log warnings but don't fail
    if (cleanStderr) {
      logger.warn(`Command stderr: ${cleanStderr}`);
    }

    logger.info('Command executed successfully');
    
    return {
      success: true,
      stdout: cleanStdout,
      stderr: cleanStderr
    };

  } catch (error) {
    const cleanError = stripAnsi(error.message);
    const cleanStderr = error.stderr ? stripAnsi(error.stderr) : '';
    const cleanStdout = error.stdout ? stripAnsi(error.stdout) : '';

    // Check for sudo issues
    if (cleanStderr.toLowerCase().includes('password') || cleanError.toLowerCase().includes('password')) {
      logger.error('Sudo password required - check NOPASSWD configuration');
      return {
        success: false,
        error: 'System authentication failed. Sudo access not properly configured.'
      };
    }

    // Check for command not found
    if (cleanError.includes('command not found') || cleanStderr.includes('command not found')) {
      logger.error(`Command not found: ${command}`);
      return {
        success: false,
        error: 'Required command not found. Ensure PiVPN is installed.'
      };
    }

    logger.error(`Command failed: ${cleanError || cleanStderr || 'Unknown error'}`);
    
    return {
      success: false,
      error: cleanStderr || cleanError || 'Command execution failed',
      stdout: cleanStdout,
      stderr: cleanStderr
    };
  }
}

/**
 * Check if a command exists in the system
 */
async function commandExists(command) {
  try {
    const { success } = await executeCommand(`which ${command}`);
    return success;
  } catch (error) {
    return false;
  }
}

module.exports = {
  executeCommand,
  commandExists,
  stripAnsi
};
