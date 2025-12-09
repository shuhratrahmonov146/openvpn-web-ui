#!/usr/bin/env node

/**
 * Test Script for OpenVPN Web UI Parsers
 * Run this to verify ANSI code stripping and parsing works correctly
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// ANSI code stripper
function stripAnsiCodes(str) {
  if (!str) return '';
  return str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '').replace(/\x1B\[/g, '');
}

// Test pivpn -l parser
function testUserListParser(output) {
  console.log('=== Testing pivpn -l Parser ===\n');
  console.log('Raw output:');
  console.log(output);
  console.log('\n--- After stripping ANSI codes ---');
  
  const cleanOutput = stripAnsiCodes(output);
  console.log(cleanOutput);
  
  const users = [];
  const lines = cleanOutput.split('\n');
  let inDataSection = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Skip separator lines
    if (trimmed.match(/^[=:+\-|]{3,}$/)) continue;
    
    // Detect header
    const lowerLine = trimmed.toLowerCase();
    if ((lowerLine.includes('name') || lowerLine.includes('user')) && 
        (lowerLine.includes('remote') || lowerLine.includes('public') || lowerLine.includes('creation'))) {
      inDataSection = true;
      continue;
    }
    
    // Skip footer
    if (trimmed.includes('pivpn') || lowerLine.includes('total') || 
        lowerLine.includes('qrcode') || trimmed.startsWith('::')) {
      continue;
    }
    
    if (inDataSection) {
      const parts = trimmed.split(/\s+/).filter(p => p.length > 0);
      if (parts.length === 0) continue;
      
      let username = parts[0].replace(/[^a-zA-Z0-9-_]/g, '');
      
      if (username && username.length >= 2 && /^[a-zA-Z0-9-_]+$/.test(username)) {
        users.push({
          username,
          status: trimmed.toLowerCase().includes('revoked') ? 'revoked' : 'active',
          raw: trimmed
        });
      }
    }
  }
  
  console.log('\n--- Parsed users ---');
  console.log(JSON.stringify(users, null, 2));
  console.log(`\nTotal users found: ${users.length}`);
  
  return users;
}

// Test pivpn -c parser
function testConnectedClientsParser(output) {
  console.log('\n\n=== Testing pivpn -c Parser ===\n');
  console.log('Raw output:');
  console.log(output);
  console.log('\n--- After stripping ANSI codes ---');
  
  const cleanOutput = stripAnsiCodes(output);
  console.log(cleanOutput);
  
  const clients = [];
  const lines = cleanOutput.split('\n');
  let inDataSection = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    if (trimmed.match(/^[=:+\-|]{3,}$/)) continue;
    
    const lowerLine = trimmed.toLowerCase();
    if (lowerLine.includes('name') || lowerLine.includes('common')) {
      inDataSection = true;
      continue;
    }
    
    if (trimmed.includes('pivpn') || lowerLine.includes('total') || trimmed.startsWith('::')) {
      continue;
    }
    
    if (inDataSection) {
      const parts = trimmed.split(/\s+/).filter(p => p.length > 0);
      if (parts.length === 0) continue;
      
      let username = parts[0].replace(/[^a-zA-Z0-9-_]/g, '');
      
      if (username && username.length >= 2 && /^[a-zA-Z0-9-_]+$/.test(username)) {
        clients.push({
          username,
          realIp: parts[1] || 'N/A',
          virtualIp: parts[2] || 'N/A',
          raw: trimmed
        });
      }
    }
  }
  
  console.log('\n--- Parsed connected clients ---');
  console.log(JSON.stringify(clients, null, 2));
  console.log(`\nTotal connected: ${clients.length}`);
  
  return clients;
}

// Main test function
async function runTests() {
  console.log('===================================');
  console.log('OpenVPN Web UI Parser Test');
  console.log('===================================\n');
  
  try {
    // Test pivpn -l
    console.log('Running: sudo -n pivpn -l\n');
    const { stdout: userList } = await execPromise('sudo -n pivpn -l');
    const users = testUserListParser(userList);
    
    // Test pivpn -c
    console.log('\n\nRunning: sudo -n pivpn -c\n');
    const { stdout: connectedList } = await execPromise('sudo -n pivpn -c');
    const clients = testConnectedClientsParser(connectedList);
    
    // Summary
    console.log('\n\n===================================');
    console.log('SUMMARY');
    console.log('===================================');
    console.log(`Total Users: ${users.length}`);
    console.log(`Connected Clients: ${clients.length}`);
    
    if (users.length > 0) {
      console.log('\nUser List:');
      users.forEach(u => console.log(`  - ${u.username} (${u.status})`));
    }
    
    if (clients.length > 0) {
      console.log('\nConnected Clients:');
      clients.forEach(c => console.log(`  - ${c.username} from ${c.realIp}`));
    } else {
      console.log('\nNo clients currently connected');
    }
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Error running tests:');
    console.error(error.message);
    
    if (error.message.includes('password is required')) {
      console.error('\n⚠️  Sudo is not configured for passwordless access.');
      console.error('Please run: sudo visudo -f /etc/sudoers.d/openvpn-web-ui');
      console.error('And add: your_user ALL=(ALL) NOPASSWD: /usr/bin/pivpn');
    }
  }
}

// Run tests
runTests();
