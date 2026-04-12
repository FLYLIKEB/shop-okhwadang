# AWS Security Group Hardening

This document describes the security group rules for the shop-okhwadang AWS infrastructure.

## EC2 Security Group Rules

### Inbound Rules

| Port | Protocol | Source | Description |
|------|----------|--------|-------------|
| 80 | TCP | 0.0.0.0/0 | HTTP - Public web traffic |
| 443 | TCP | 0.0.0.0/0 | HTTPS - Secure web traffic |
| 22 | TCP | <admin-ip>/32 | SSH - Admin access only (restrict to known IPs) |
| 3000 | TCP | BLOCKED | Application port - Nginx proxy only |

### Outbound Rules

| Port | Protocol | Destination | Description |
|------|----------|-------------|-------------|
| ALL | ALL | 0.0.0.0/0 | All outbound traffic allowed (default) |

## Lightsail MySQL Access

```
EC2 (Private IP) ---:3306---> Lightsail MySQL
```

- MySQL port 3306 is **only accessible from EC2 private IP**
- No public internet access to database
- SSH tunnel via EC2 for direct database administration

## ElastiCache (Redis) Access

```
EC2 ---:6379---> ElastiCache Redis
```

| Port | Protocol | Source | Description |
|------|----------|--------|-------------|
| 6379 | TCP | EC2 Security Group | Redis access - EC2 only |

## Architecture Diagram

```
                          Internet
                              |
                    -----------------
                    |   Load Balancer  |
                    -----------------
                              |
                    -----------------
                    |   EC2 (Nginx)    |
                    |  Port 3000 BLOCKED |
                    -----------------
                         /    |    \
                        /     |     \
                       v      v      v
               ------------  ---------  ------------
               | Lightsail  | ElastiCache |  External  |
               |   MySQL   |   (Redis)   |  Services  |
               |  :3306    |    :6379    |   (SMTP)   |
               | EC2 only  |  EC2 only  |            |
               ------------  ---------  ------------
```

## Security Best Practices

1. **SSH Access**: Restrict to known admin IP addresses only
2. **Application Port**: Port 3000 must remain blocked - all traffic goes through Nginx
3. **Database**: Never expose MySQL to public internet
4. **Redis**: ElastiCache should only be accessible from EC2
5. **Monitoring**: Enable VPC Flow Logs to track rejected traffic
