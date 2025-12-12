# Claude AI - Proxmox SSH MCP Server

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

# Storage overzicht
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
De volgende destructieve commands zijn **PERMANENT GEBLOKKEERD**:

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
