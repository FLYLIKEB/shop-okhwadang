# AWS Security Group Hardening

This document describes the security group rules for the shop-okhwadang AWS infrastructure.

## EC2 Security Group Rules

### Inbound Rules

| Port | Protocol | Source | Description |
|------|----------|--------|-------------|
| 80 | TCP | 0.0.0.0/0 | HTTP - Vercel 서버측에서 `/api/*` 프록시 (HTTPS는 Vercel/Cloudflare 종료) |
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

## 캐시

백엔드 프로세스 내 `CacheService`(in-memory, TTL)만 사용. 별도 캐시 서버(ElastiCache 등) 및 관련 Security Group 규칙 없음.

## Architecture Diagram

```
                          Internet
                              |
                    -----------------
                    |  Cloudflare + Vercel  |
                    -----------------
                              |  (/api/* proxy, HTTP)
                    -----------------
                    |   EC2 (Nginx 80)  |
                    |  Port 3000 BLOCKED |
                    -----------------
                              |
                    -----------------
                    | Lightsail MySQL |
                    |  :3306 EC2 only |
                    -----------------
```

## Security Best Practices

1. **SSH Access**: Restrict to known admin IP addresses only
2. **Application Port**: Port 3000 must remain blocked - all traffic goes through Nginx
3. **Database**: Never expose MySQL to public internet
4. **Monitoring**: Enable VPC Flow Logs to track rejected traffic
