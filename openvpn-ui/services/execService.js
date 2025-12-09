const { exec } = require('child_process');

/**
 * Execute a shell command and return a promise
 * @param {string} cmd - Command to execute
 * @param {object} options - Execution options
 * @returns {Promise<string>} - Command output
 */
function run(cmd, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`[execService] Executing: ${cmd}`);
    
    exec(cmd, { maxBuffer: 1024 * 500, ...options }, (error, stdout, stderr) => {
      if (error) {
        console.error(`[execService] Error executing command: ${cmd}`);
        console.error(`[execService] Error details: ${stderr || error.message}`);
        return reject({
          message: stderr || error.message,
          code: error.code,
          cmd: cmd
        });
      }
      
      console.log(`[execService] Command executed successfully: ${cmd}`);
      resolve(stdout.trim());
    });
  });
}

/**
 * Check if a command exists on the system
 * @param {string} command - Command name to check
 * @returns {Promise<boolean>}
 */
async function commandExists(command) {
  try {
    await run(`which ${command}`);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Run command with sudo
 * @param {string} cmd - Command to execute with sudo
 * @returns {Promise<string>}
 */
function runSudo(cmd) {
  return run(`sudo ${cmd}`);
}

module.exports = {
  run,
  runSudo,
  commandExists
};
