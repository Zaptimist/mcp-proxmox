const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { ListToolsRequestSchema, CallToolRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');
const os = require('os');

// SSH Configuration - Use SSH key-based authentication
const sshConfig = {
  host: '192.168.1.9',
  username: 'root',
  port: 22,
  privateKeyPath: path.join(os.homedir(), '.ssh', 'id_ed25519')
};

// Check SSH key setup and return helpful instructions if missing
function checkSSHKeySetup() {
  const keyPath = sshConfig.privateKeyPath;
  const pubKeyPath = keyPath + '.pub';
  
  if (!fs.existsSync(keyPath)) {
    return {
      ready: false,
      error: 'SSH private key not found',
      instructions: `
🔑 SSH Key Setup Required

Your SSH private key was not found at: ${keyPath}

Step 1: Generate an SSH key pair
  ssh-keygen -t ed25519

Step 2: Copy your public key to the Proxmox server
  Windows (PowerShell):
    type $env:USERPROFILE\\.ssh\\id_ed25519.pub | ssh ${sshConfig.username}@${sshConfig.host} "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
  
  Linux/Mac:
    ssh-copy-id ${sshConfig.username}@${sshConfig.host}

Step 3: Test the connection
  ssh ${sshConfig.username}@${sshConfig.host} "echo 'SSH key auth works!'"

After completing these steps, restart the MCP server.
`.trim()
    };
  }
  
  return { ready: true };
}

// Test SSH connection
async function testSSHConnection() {
  try {
    const result = await executeSSHCommand('echo "connected"');
    return { success: true };
  } catch (err) {
    // Check if it's an auth error (key not on server)
    if (err.message.includes('All configured authentication methods failed')) {
      const pubKeyPath = sshConfig.privateKeyPath + '.pub';
      let pubKey = '';
      try {
        pubKey = fs.readFileSync(pubKeyPath, 'utf8').trim();
      } catch (e) {
        pubKey = '<could not read public key>';
      }
      
      return {
        success: false,
        error: 'SSH key not authorized on server',
        instructions: `
🔐 SSH Key Not Authorized

Your SSH key exists but is not authorized on the Proxmox server.

Your public key:
${pubKey}

Add it to the Proxmox server by running:
  ssh ${sshConfig.username}@${sshConfig.host}  # (enter password when prompted)
  
Then on the server:
  mkdir -p ~/.ssh && chmod 700 ~/.ssh
  echo '${pubKey}' >> ~/.ssh/authorized_keys
  chmod 600 ~/.ssh/authorized_keys
  exit

Or from your local machine (one command):
  Windows (PowerShell):
    type $env:USERPROFILE\\.ssh\\id_ed25519.pub | ssh ${sshConfig.username}@${sshConfig.host} "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
  
  Linux/Mac:
    ssh-copy-id ${sshConfig.username}@${sshConfig.host}
`.trim()
      };
    }
    
    return {
      success: false,
      error: err.message
    };
  }
}

// Create the MCP server
const server = new Server(
  {
    name: 'proxmox-ssh-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'proxmox_run_host_command',
        description: 'Execute a command on the Proxmox host via SSH',
        inputSchema: {
          type: 'object',
          properties: {
            command: {
              type: 'string',
              description: 'The command to execute on the Proxmox host',
            },
          },
          required: ['command'],
        },
      },
    ],
  };
});

// Security: Blacklist of dangerous commands that should never be executed
const DANGEROUS_COMMANDS = [
  // VM/Container deletion
  'qm destroy', 'qm delete', 'pct destroy', 'pct delete',
  // Storage operations
  'rm ', 'rmdir', 'rm -', 'del ', 'delete ',
  // System operations  
  'shutdown', 'reboot', 'halt', 'poweroff', 'init 0', 'init 6',
  // File system operations
  'mkfs', 'fdisk', 'parted', 'dd if=', 'dd of=',
  // Package management
  'apt remove', 'apt purge', 'apt autoremove', 'dpkg -r', 'dpkg --remove',
  // Service management
  'systemctl stop', 'systemctl disable', 'service stop',
  // Network operations
  'iptables -D', 'iptables -F', 'ip route del',
  // User management
  'userdel', 'deluser', 'passwd -d',
  // Backup deletion
  'vzdump --remove', 'pvesm remove',
  // Storage deletion
  'pvesm delete', 'zfs destroy', 'lvremove',
  // Cluster operations
  'pvecm delnode', 'pvecm delete'
];

// Check if command contains dangerous operations
function isDangerousCommand(command) {
  const lowerCommand = command.toLowerCase();
  return DANGEROUS_COMMANDS.some(dangerous => lowerCommand.includes(dangerous.toLowerCase()));
}

// Execute SSH command
async function executeSSHCommand(command) {
  return new Promise((resolve, reject) => {

    // Security check: Block dangerous commands
    if (isDangerousCommand(command)) {
      reject(new Error(`🚫 SECURITY BLOCK: Command "${command}" contains potentially destructive operations and is not allowed. Destructive actions must be performed manually via Proxmox web interface.`));
      return;
    }

    // Read private key
    let privateKey;
    try {
      privateKey = fs.readFileSync(sshConfig.privateKeyPath);
    } catch (err) {
      reject(new Error(`Failed to read SSH private key from ${sshConfig.privateKeyPath}: ${err.message}`));
      return;
    }

    const conn = new Client();
    
    conn.on('ready', () => {
      conn.exec(command, (err, stream) => {
        if (err) {
          conn.end();
          reject(err);
          return;
        }

        let stdout = '';
        let stderr = '';

        stream.on('close', (code, signal) => {
          conn.end();
          resolve({
            success: code === 0,
            exitCode: code,
            signal: signal,
            stdout: stdout.trim(),
            stderr: stderr.trim(),
          });
        });

        stream.on('data', (data) => {
          stdout += data.toString();
        });

        stream.stderr.on('data', (data) => {
          stderr += data.toString();
        });
      });
    });

    conn.on('error', (err) => {
      reject(err);
    });

    conn.connect({
      host: sshConfig.host,
      port: sshConfig.port,
      username: sshConfig.username,
      privateKey: privateKey,
    });
  });
}

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name } = request.params;
    const args = request.params.arguments || {};

    if (name === 'proxmox_run_host_command') {
      // Check if SSH key exists
      const keyCheck = checkSSHKeySetup();
      if (!keyCheck.ready) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: keyCheck.error,
                setup_instructions: keyCheck.instructions,
              }, null, 2),
            },
          ],
          isError: true,
        };
      }

      const { command } = args;
      
      try {
        const result = await executeSSHCommand(command);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: result.success,
                command: command,
                host: sshConfig.host,
                exitCode: result.exitCode,
                stdout: result.stdout,
                stderr: result.stderr,
              }, null, 2),
            },
          ],
        };
      } catch (sshError) {
        // Check if it's an auth error
        if (sshError.message.includes('All configured authentication methods failed')) {
          const connTest = await testSSHConnection();
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  error: connTest.error,
                  setup_instructions: connTest.instructions,
                }, null, 2),
              },
            ],
            isError: true,
          };
        }
        throw sshError;
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ success: false, error: 'Unknown tool' }),
        },
      ],
    };
  } catch (error) {
    console.error(`Error executing ${request.params?.name || 'unknown'}:`, error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ 
            success: false, 
            error: error.message,
          }),
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Proxmox SSH MCP server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});