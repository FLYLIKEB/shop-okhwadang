# AWS Security Group Hardening

This document describes the security group rules for the shop-okhwadang AWS infrastructure.

## EC2 Security Group Rules

### Inbound Rules

| Port | Protocol | Source | Description |
|------|----------|--------|-------------|
| 80 | TCP | BLOCKED (steady state) | HTTP - 기본 차단. 필요 시 일시적으로만 열어 301/308 redirect 또는 인증서 발급 검증에 사용 |
| 443 | TCP | Cloudflare IPv4/IPv6 ranges | HTTPS - `api.ockhwadang.com` origin. Cloudflare Proxied + Full (strict) 유지 |
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
                          Internet (browser)
                              |
                    -------------------------------
                    | Cloudflare (ockhwadang.com)  |
                    -------------------------------
                              |
                    -------------------------------
                    |  Vercel (Next.js SSR/Edge)   |
                    |  middleware: /api/* proxy    |
                    |  BACKEND_URL = https://api.ockhwadang.com |
                    -------------------------------
                              |
                    -----------------------------------------------
                    | Cloudflare (api.ockhwadang.com, Proxied)   |
                    | SSL/TLS mode = Full (strict)               |
                    -----------------------------------------------
                              |
                    -----------------------------------------------
                    | EC2 (Nginx :443 TLS → :3000)               |
                    | Port 80 blocked/redirect only              |
                    | Port 3000 blocked externally               |
                    -----------------------------------------------
                              |
                    -------------------------------
                    |       Lightsail MySQL        |
                    |   :3306 EC2 private IP only  |
                    -------------------------------
```

## Security Best Practices

1. **SSH Access**: Restrict to known admin IP addresses only
2. **Origin TLS**: Keep Cloudflare `api.ockhwadang.com` in `Full (strict)` and install an origin certificate on EC2 nginx 443
3. **HTTP Port 80**: Keep closed in steady state; open only temporarily for redirect/certificate validation if absolutely required
4. **Application Port**: Port 3000 must remain blocked - all traffic goes through Nginx
5. **Database**: Never expose MySQL to public internet
6. **Monitoring**: Enable VPC Flow Logs to track rejected traffic
