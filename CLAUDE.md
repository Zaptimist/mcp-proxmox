# Claude AI - Proxmox SSH MCP Server

## ⚠️ SECURITY FIRST
**This server has STRICT SECURITY RESTRICTIONS. All destructive commands are BLOCKED.**
**Delete/removal operations are NEVER allowed via LLM - only via Proxmox web interface.**

## Overview
This MCP server provides **secure** SSH access to Proxmox hosts for executing read-only monitoring and basic VM/container management tasks.

## 🚀 Available Tools

### proxmox_run_host_command
**Usage**: Execute Proxmox CLI commands via SSH
```
Question: "Start VM 500"
Tool: proxmox_run_host_command
Parameters: command="qm start 500"
Response: Command output with success status
```

## 📋 Proxmox Command Examples

### VM Management
```
# List VMs
"Show all VMs" → command="qm list"

# Start VM
"Start VM 500" → command="qm start 500"

# Stop VM (graceful)
"Stop VM 500" → command="qm shutdown 500"

# Force stop VM
"Force stop VM 500" → command="qm stop 500"

# VM status
"Status of VM 100" → command="qm status 100"

# VM configuration
"Configuration of VM 100" → command="qm config 100"
```

### Container Management
```
# List containers
"Show all containers" → command="pct list"

# Start container
"Start container 101" → command="pct start 101"

# Stop container
"Stop container 101" → command="pct shutdown 101"

# Container status
"Status of container 101" → command="pct status 101"
```

### System Monitoring
```
# Node status
"Proxmox node status" → command="pvesh get /nodes/pve/status"

# Storage overview
"Storage status" → command="pvesh get /nodes/pve/storage"

# System load
"System load" → command="uptime"

# Disk usage
"Disk usage" → command="df -h"

# Memory usage
"Memory usage" → command="free -h"
```

## 🔒 Security & Restrictions

### 🚫 BLOCKED COMMANDS (Security Protection)
The following destructive commands are **PERMANENTLY BLOCKED**:

- VM/Container Deletion: `qm destroy`, `pct destroy`
- File System: `rm`, `rmdir`, `dd`, `mkfs`
- System: `shutdown`, `reboot`, `halt`, `poweroff`
- Package Management: `apt remove`, `apt purge`
- Service Management: `systemctl stop`, `systemctl disable`
- Storage: `zfs destroy`, `lvremove`

### ✅ ALLOWED OPERATIONS
- Read-only commands: `qm list`, `pct list`, `pvesh get`, `df`, `free`, `uptime`
- VM/Container control: `qm start/stop/shutdown`, `pct start/stop/shutdown`
- Monitoring: `systemctl status`, `journalctl`, `ps`, `top`
- Configuration viewing: `qm config`, `pct config`

**"Destructive actions must ALWAYS be performed manually via Proxmox web interface"**
