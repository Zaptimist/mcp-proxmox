# Proxmox SSH MCP Server

A Model Context Protocol (MCP) server that enables AI assistants to execute commands on a Proxmox host via SSH.

## Features

- SSH key-based authentication (no passwords in code)
- Built-in security: dangerous commands are blocked
- Single tool: `proxmox_run_host_command`

## Prerequisites

- Node.js 18+
- SSH key pair (`~/.ssh/id_ed25519`)
- Public key added to Proxmox server's `~/.ssh/authorized_keys`

## Installation

```bash
git clone https://github.com/Zaptimist/mcp-proxmox.git
cd mcp-proxmox
npm install
```

## Configuration

Edit `index.js` to set your Proxmox host:

```javascript
const sshConfig = {
  host: '192.168.1.9',      // Your Proxmox IP
  username: 'root',
  port: 22,
  privateKeyPath: path.join(os.homedir(), '.ssh', 'id_ed25519')
};
```

### SSH Key Setup

The MCP server will automatically detect if SSH keys are missing or not configured and provide setup instructions. But here's the manual process:

1. Generate a key (if you don't have one):
   ```bash
   ssh-keygen -t ed25519
   ```

2. Copy public key to Proxmox:

   **Windows (PowerShell):**
   ```powershell
   type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh root@192.168.1.9 "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
   ```

   **Linux/Mac:**
   ```bash
   ssh-copy-id root@192.168.1.9
   ```

3. Test the connection:
   ```bash
   ssh root@192.168.1.9 "echo 'SSH key auth works!'"
   ```

If you haven't set up SSH keys yet, the MCP server will return helpful instructions when you try to use it.

## MCP Client Configuration

Add to your MCP client config (e.g., `~/.kiro/settings/mcp.json`):

```json
{
  "mcpServers": {
    "proxmox": {
      "command": "node",
      "args": ["C:/path/to/mcp-proxmox/index.js"],
      "disabled": false,
      "autoApprove": ["proxmox_run_host_command"]
    }
  }
}
```

## Usage

The server exposes one tool:

### `proxmox_run_host_command`

Execute a command on the Proxmox host.

**Input:**
- `command` (string, required): The command to execute

**Example:**
```json
{
  "command": "qm list"
}
```

**Response:**
```json
{
  "success": true,
  "command": "qm list",
  "host": "192.168.1.9",
  "exitCode": 0,
  "stdout": "VMID NAME STATUS MEM(MB) ...",
  "stderr": ""
}
```

## Security

The following commands are blocked for safety:

- VM/Container deletion (`qm destroy`, `pct destroy`)
- File operations (`rm`, `rmdir`, `dd`)
- System operations (`shutdown`, `reboot`, `halt`)
- Package removal (`apt remove`, `apt purge`)
- Service management (`systemctl stop`)
- Storage deletion (`zfs destroy`, `lvremove`)

Destructive actions must be performed manually via the Proxmox web interface.

## License

MIT
