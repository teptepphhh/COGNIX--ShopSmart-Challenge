# Decision record – ShopSmart AWS architecture

**Date:** 2026-11-20 · **Owner:** Stephanie Joy Revano (individual) · **Status:** accepted and deployed (`446488d`)
**Diagram:** `04b-deployment-diagram-aws.svg` / `.png`

## Context

- Individual classroom demonstration due 2026-11-20, fictional customers and simulated checkout only.
- New AWS account on the **Free plan** (US$100 credits, free access ends 2027-05-20). Sign-up path: *advanced*, for Region choice and full EC2 networking.
- The app needs: HTTPS, customer sign-in with a secure cookie, server-enforced order ownership, PostgreSQL that survives restarts, and an assistant that never claims to be live AI when it is not.

## Options considered

| Option | For | Against |
|---|---|---|
| **A. Single EC2 host** (Nginx + Express + PostgreSQL) | One resource to pay for and clean up. Frontend and API on **one HTTPS origin**, so no CORS, no mixed content, and the `Secure` `SameSite=Lax` session cookie works without cross-site settings. Free HTTPS with Let's Encrypt and an sslip.io hostname, no domain purchase. | Single point of failure. I maintain the OS, Node process, database, backups, HTTPS and cleanup. |
| B. Amplify + EC2 + RDS | Clear separation of static frontend, API and managed database. RDS has automated backups. | Three services and more credits. The API on EC2 still needs its own HTTPS endpoint, and Amplify on a different origin needs CORS with credentials and cross-site cookies. More to configure before a same-day deadline. |
| C. Tested local release only | No cost or account risk. | Allowed by the guide only when hosting is unavailable. An eligible account was available. |

## Decision

**Option A: one EC2 instance in ap-southeast-1 (Singapore).**

| Setting | Choice | Why |
|---|---|---|
| Instance | t3.micro, Ubuntu Server 24.04 LTS (not Ubuntu Pro), 20 GiB gp3, 2 GiB swap | Free-tier eligible size. Swap lets `npm ci` and the Vite build run in 1 GiB RAM. Pro would add a per-hour charge. |
| Public entry | Nginx on 443 (HTTPS) and 80 (redirect only) | Only Nginx is public. |
| API | Express on `127.0.0.1:3000`, systemd `Restart=always`, enabled at boot | Not reachable from the internet. Restarts on crash and after reboot. |
| Database | PostgreSQL 16 on `127.0.0.1:5432`, random password generated on the server | The browser never connects to the database. |
| Security group | 443 and 80 from anywhere, 22 from my IP only. 3000 and 5432 not opened | Least exposure. |
| Secrets | `/etc/shopsmart/backend.env`, root:shopsmart 640, not in git. `VITE_API_URL=/api` is the only browser setting | No secret in the repository, the browser bundle or screenshots. |
| Migrations | `prisma migrate deploy` only. `db:seed` ran once on the new empty database. `deploy/update.sh` takes a `pg_dump` before every update | Never reset or reseed a database with orders. |
| AI provider | Not configured (no paid key). The UI labels this as **catalog-only mode** | The guide does not require a paid provider. A fallback must not look like a live AI answer. |
| Customer identity | ShopSmart sessions (scrypt hashes, hashed session tokens), separate from AWS IAM | IAM controls AWS administration, not who may read an order. |

## Accepted risks and mitigations

| Risk | Mitigation |
|---|---|
| Single point of failure | systemd auto-restart; reboot tested (check 7); `pg_dump` before each update; option to take an EBS snapshot before the demo. |
| Public IP changes if the instance is stopped and started | Instance is left running until grading. The hostname is derived from the IP, so a stop/start would need a new certificate. An Elastic IP would fix this at extra cost. |
| Let's Encrypt certificate expires in 90 days | Longer than the demo period. Certbot installs a renewal timer. |
| Credits consumed while idle | Zero-spend budget alert, resource register with removal date 2026-11-27, removal plan. |

## What would change for a real production release

Move PostgreSQL to a private RDS instance with automated backups; put the frontend on Amplify or S3 + CloudFront; use an owned domain and an Elastic IP or load balancer; add a real AI provider key through a secrets manager; add monitoring alarms; replace SSH with Session Manager.
