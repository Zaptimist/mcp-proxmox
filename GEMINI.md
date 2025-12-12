# Gemini AI - Proxmox SSH MCP Server

## ⚠️ SECURITY FIRST
**Deze server heeft STRIKTE SECURITY BEPERKINGEN. Alle destructieve commands zijn GEBLOKKEERD.**
**Verwijder/delete operaties zijn NOOIT toegestaan via LLM - alleen via Proxmox web interface.**

## Overzicht
Deze MCP server biedt **veilige** SSH toegang tot Proxmox hosts voor het uitvoeren van read-only monitoring en basis VM/container management taken.

## 🚀 Beschikbare Tools

### proxmox_run_host_command
**Gebruik**: Voer Proxmox CLI commands uit via SSH
```
Vraag: "Start VM 500 op"
Tool: proxmox_run_host_command
Parameters: command="qm start 500"
Antwoord: Command output met success status
```

### ssh_run_command
**Gebruik**: Voer algemene SSH commands uit
```
Vraag: "Controleer de uptime van de Proxmox server"
Tool: ssh_run_command
Parameters: command="uptime"
Antwoord: System uptime informatie
```

## 📋 Proxmox Command Voorbeelden

### VM Management
```
# VM's tonen
"Laat alle VMs zien" → command="qm list"

# VM starten
"Start VM 500" → command="qm start 500"

# VM stoppen (netjes)
"Stop VM 500" → command="qm shutdown 500"

# VM forceren stoppen
"Forceer stop VM 500" → command="qm stop 500"

# VM status
"Status van VM 100" → command="qm status 100"

# VM configuratie
"Configuratie van VM 100" → command="qm config 100"
```

### Container Management
```
# Containers tonen
"Laat alle containers zien" → command="pct list"

# Container starten
"Start container 101" → command="pct start 101"

# Container stoppen
"Stop container 101" → command="pct shutdown 101"

# Container status
"Status van container 101" → command="pct status 101"
```

### System Monitoring
```
# Node status
"Proxmox node status" → command="pvesh get /nodes/pve/status"

# Resource usage
"CPU en memory gebruik" → command="pvesh get /nodes/pve/status"

# Storage overzicht
"Storage status" → command="pvesh get /nodes/pve/storage"

# Network interfaces
"Network interfaces" → command="ip addr show"

# System load
"System load" → command="uptime"

# Disk usage
"Disk usage" → command="df -h"

# Memory usage
"Memory usage" → command="free -h"
```

### Cluster Management
```
# Cluster status
"Cluster status" → command="pvecm status"

# Cluster nodes
"Cluster nodes" → command="pvecm nodes"

# Cluster resources
"Cluster resources" → command="pvesh get /cluster/resources"
```

## 🛠️ Response Format

### Successful Command
```json
{
  "success": true,
  "command": "qm list",
  "host": "192.168.1.9",
  "exitCode": 0,
  "stdout": "VMID NAME STATUS...",
  "stderr": ""
}
```

### Failed Command
```json
{
  "success": false,
  "command": "invalid_command",
  "host": "192.168.1.9",
  "exitCode": 1,
  "stdout": "",
  "stderr": "command not found"
}
```

## 🚨 Error Handling

### SSH Connection Issues
```
Error: SSH credentials are not configured correctly
→ Check SSH host, username, password in server config
```

### Command Failures
```
exitCode: 1, stderr: "VM 999 does not exist"
→ Check VMID exists with "qm list"
```

### Permission Issues
```
stderr: "Permission denied"
→ Ensure SSH user has proper Proxmox permissions
```

## 💡 Praktische Use Cases

### Daily Operations
```
User: "Laat alle draaiende VMs zien"
AI: proxmox_run_host_command("qm list | grep running")

User: "Herstart de docker-host VM"
AI: proxmox_run_host_command("qm shutdown 100 && qm start 100")

User: "Hoeveel geheugen gebruikt de server?"
AI: ssh_run_command("free -h")
```

### Troubleshooting
```
User: "VM 106 reageert niet, wat is de status?"
AI: proxmox_run_host_command("qm status 106")

User: "Controleer of alle services draaien"
AI: ssh_run_command("systemctl status pveproxy pvedaemon pvestatd")

User: "Toon de laatste logs"
AI: ssh_run_command("journalctl -n 50")
```

### Maintenance
```
User: "Backup VM 100"
AI: proxmox_run_host_command("vzdump 100")

User: "Migreer VM 100 naar andere storage"
AI: proxmox_run_host_command("qm move_disk 100 virtio0 new-storage")

User: "Update Proxmox packages"
AI: ssh_run_command("apt update && apt list --upgradable")
```

## 🔧 Configuration

### SSH Settings
```javascript
const sshConfig = {
  host: '192.168.1.9',
  username: 'root',
  password: 'your-password',
  port: 22
};
```

### MCP Configuration
```json
{
  "mcpServers": {
    "proxmox-mcp-server": {
      "command": "node",
      "args": ["mcp/proxmox-ssh-mcp-server/index.js"],
      "disabled": false,
      "autoApprove": ["proxmox_run_host_command"]
    }
  }
}
```

## 🔒 Security & Restrictions

### 🚫 BLOCKED COMMANDS (Security Protection)
De volgende destructieve commands zijn **PERMANENT GEBLOKKEERD** en kunnen NOOIT uitgevoerd worden:

**VM/Container Deletion:**
- `qm destroy`, `qm delete`, `pct destroy`, `pct delete`

**File System Operations:**
- `rm`, `rmdir`, `del`, `delete` (alle varianten)
- `mkfs`, `fdisk`, `parted`, `dd` (disk operations)

**System Operations:**
- `shutdown`, `reboot`, `halt`, `poweroff`, `init 0/6`

**Package Management:**
- `apt remove`, `apt purge`, `apt autoremove`, `dpkg -r`

**Service Management:**
- `systemctl stop`, `systemctl disable`, `service stop`

**Storage & Backup Deletion:**
- `vzdump --remove`, `pvesm remove/delete`, `zfs destroy`, `lvremove`

**Network & User Management:**
- `iptables -D/-F`, `ip route del`, `userdel`, `deluser`

**Cluster Operations:**
- `pvecm delnode`, `pvecm delete`

### ✅ ALLOWED OPERATIONS
- **Read-only commands**: `qm list`, `pct list`, `pvesh get`, `df`, `free`, `uptime`
- **VM/Container control**: `qm start/stop/shutdown`, `pct start/stop/shutdown`
- **Monitoring**: `systemctl status`, `journalctl`, `ps`, `top`
- **Configuration viewing**: `qm config`, `pct config`

### 🛡️ Security Philosophy
**"Destructive actions must ALWAYS be performed manually via Proxmox web interface"**

- LLM's kunnen NOOIT VMs/containers verwijderen
- LLM's kunnen NOOIT storage/backups verwijderen  
- LLM's kunnen NOOIT system services stoppen
- LLM's kunnen NOOIT users/permissions wijzigen

### Additional Security Notes
- SSH credentials zijn hardcoded in de server (tijdelijk)
- Voor productie: gebruik SSH keys in plaats van passwords
- Beperk SSH user permissions waar mogelijk
- Monitor command execution voor security
- Alle blocked commands worden gelogd

## 💻 Command Reference

### Essential Proxmox Commands
- `qm list` - List all VMs
- `pct list` - List all containers  
- `pvesh get /cluster/resources` - All cluster resources
- `pvecm status` - Cluster status
- `systemctl status pve*` - Proxmox service status
- `df -h` - Disk usage
- `free -h` - Memory usage
- `uptime` - System uptime and load

Deze server biedt directe CLI toegang tot Proxmox voor geavanceerde system administration en troubleshooting taken die niet mogelijk zijn via de web API.