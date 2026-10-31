# Agent Host Network Diagnostics

## Local OS Proxy Configuration (@vscode/os-proxy-resolver)

- Proxy environment: (none)
- Auto-detect: true
- DHCP WPAD: not-found
- DNS WPAD: not-found
- Configured PAC: unconfigured
- PAC: (none)
- Static rules: (none)
- Platform settings: Windows, proxy=(none), bypass=(none)

- Connections: 1 (1 local, 0 remote)

Connectivity probes run inside each agent host process (local or remote), so results reflect the environment the Copilot SDK actually connects from.

## Local agent host

- Agent host version: 1.135.0
- OS: win32 (x64)
- Account: sukhadiyapratik222-dotcom
- Proxy settings: (none)
- Proxy environment: (none)

### GitHub API

- URL: https://api.github.com
- DNS IPv4: 20.207.73.85 (10 ms)
- DNS IPv6: error (7 ms): getaddrinfo ENOTFOUND api.github.com
- Proxy: None
- Local OS proxy (@vscode/os-proxy-resolver): direct
- Reachability: ✓ 200 via direct (68 ms)

### Copilot API (CAPI)

- URL: https://api.individual.githubcopilot.com/_ping
- DNS IPv4: 140.82.112.22 (8 ms)
- DNS IPv6: error (16 ms): getaddrinfo ENOTFOUND api.individual.githubcopilot.com
- Proxy: None
- Local OS proxy (@vscode/os-proxy-resolver): direct
- Reachability: ✓ 200 via direct (630 ms)

