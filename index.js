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
      {
        name: 'ssh_run_command',
        description: 'Execute a command on any SSH host',
        inputSchema: {
          type: 'object',
          properties: {
            command: {
              type: 'string',
              description: 'The command to execute',
            },
            host: {
              type: 'string',
              description: 'SSH host (optional, defaults to configured host)',
            },
            username: {
              type: 'string',
              description: 'SSH username (optional, defaults to configured username)',
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
async function executeSSHCommand(command, host = sshConfig.host, username = sshConfig.username) {
  return new Promise((resolve, reject) => {
    if (!host || !username) {
      reject(new Error('SSH credentials are not configured correctly.'));
      return;
    }

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
      host: host,
      port: 22,
      username: username,
      privateKey: privateKey,
    });
  });
}

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name } = request.params;
    const args = request.params.arguments || {};

    if (name === 'proxmox_run_host_command' || name === 'ssh_run_command') {
      const { command, host, username } = args;
      
      const result = await executeSSHCommand(
        command,
        host || sshConfig.host,
        username || sshConfig.username
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: result.success,
              command: command,
              host: host || sshConfig.host,
              exitCode: result.exitCode,
              stdout: result.stdout,
              stderr: result.stderr,
            }, null, 2),
          },
        ],
      };
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