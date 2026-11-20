# ShopSmart AWS Deployment Runbook

Hosted release of ShopSmart on **one EC2 instance** for a short classroom demonstration.
Fictional customer data and simulated checkout only.

| Item | Value |
| --- | --- |
| AWS account plan | Free plan (new sign-up experience), US$100 credits, expires about 6 months after sign-up |
| Region | Asia Pacific (Sydney) `ap-southeast-2` |
| Instance | `shopsmart-demo`, t3.small, Ubuntu 24.04 LTS, 20 GB gp3, CPU credits: standard |
| Fixed address | Elastic IP `3.104.192.31` (`shopsmart-eip`) |
| Public URL | `https://3-104-192-31.sslip.io` (sslip.io maps the name to the Elastic IP; no DNS account needed) |
| Security group | `shopsmart-web-sg`: 22 from team IP only, 80 and 443 from anywhere |

See also: [Decision record](DECISION_RECORD.md) · [Verification plan](VERIFICATION_PLAN.md) · [Resource register](RESOURCE_REGISTER.md) · [Release note](RELEASE_NOTE.md) · **[Evidence (all checks PASS)](evidence/EVIDENCE.md)**

## 1. Before creating anything

1. In **Billing and Cost Management**, confirm the plan, credit balance and expiry date. Save a redacted screenshot.
2. Turn on MFA for the account login. Do not share the account login; invite teammates through the project's Team settings.
3. Create an AWS Budget (for example US$10/month) with an email alert.
4. Record every resource in [RESOURCE_REGISTER.md](RESOURCE_REGISTER.md) as soon as it is created.

## 2. AWS resources (console)

1. **EC2 → Launch instance**: Ubuntu Server 24.04 LTS, t3.small, key pair `shopsmart-key` (keep the `.pem` outside the repository), 20 GB gp3.
2. **Security group `shopsmart-web-sg` inbound rules**:

   | Port | Source | Why |
   | --- | --- | --- |
   | 22 (SSH) | Team IP `/32` only, plus the EC2 Instance Connect range for browser access | Administration |
   | 80 (HTTP) | 0.0.0.0/0 | Let's Encrypt validation and redirect to HTTPS |
   | 443 (HTTPS) | 0.0.0.0/0 | The website and API |
   | 3000, 5432 | **not opened** | Express and PostgreSQL are internal only |

3. **Elastic IP**: allocate in the same Region and associate it with `shopsmart-demo`.
4. **Instance settings → Change credit specification**: turn Unlimited off (standard) to avoid surplus CPU charges.

## 3. Server setup (one time)

Connect with SSH (`ssh -i shopsmart-key.pem ubuntu@3.104.192.31`) or EC2 Instance Connect, then:

```bash
git clone -b ASC_AI_ASSISTANT_SHOPSMART_SAMBILE https://github.com/teptepphhh/COGNIX--ShopSmart-Challenge.git ~/shopsmart
cd ~/shopsmart
sudo DOMAIN=3-104-192-31.sslip.io bash deploy/scripts/01-server-setup.sh
bash deploy/scripts/02-release.sh
bash deploy/scripts/04-seed-catalog-once.sh   # first deploy only; refuses if orders exist
sudo certbot --nginx -d 3-104-192-31.sslip.io --redirect --agree-tos -m YOUR_EMAIL --no-eff-email
```

`01-server-setup.sh` installs Nginx, PostgreSQL 16, Node.js 22 and Certbot; creates the database with a random password; writes `/etc/shopsmart/backend.env` (chmod 600) with a generated `SESSION_SECRET`; installs the Nginx site and the `shopsmart-api` systemd service.

## 4. Releasing a new version

```bash
cd ~/shopsmart && bash deploy/scripts/03-backup.sh && bash deploy/scripts/02-release.sh
```

`02-release.sh` runs `npm ci`, `prisma generate`, **`prisma migrate deploy`** (applies committed migrations only), builds the frontend with `VITE_API_URL=/api`, publishes it to `/var/www/shopsmart`, restarts the API and checks `/api/health`.

Never run `npm run db:seed` on a database with orders: the seed deletes orders and replaces products.

## 5. Operations

| Task | Command |
| --- | --- |
| API status | `systemctl status shopsmart-api` |
| API logs | `journalctl -u shopsmart-api -n 100 --no-pager` |
| Nginx logs | `sudo tail -n 50 /var/log/nginx/error.log` |
| Health | `curl -s https://3-104-192-31.sslip.io/api/health` |
| Migration history | `cd ~/shopsmart/backend && set -a && . /etc/shopsmart/backend.env && set +a && npx prisma migrate status` |
| Certificate renewal test | `sudo certbot renew --dry-run` |

## 6. Teardown after grading

1. `bash deploy/scripts/03-backup.sh` if the data must be kept, then download the file.
2. **EC2 → Instances**: terminate `shopsmart-demo` (the root volume is deleted with it; confirm under **Volumes**).
3. **Elastic IPs**: disassociate and **release** `shopsmart-eip`. An unattached Elastic IP still uses credits.
4. Delete leftover **snapshots**, the key pair and the security group if no longer needed.
5. Check every Region you used, then confirm in **Billing** that no resources are still accruing charges.
6. Update the removal dates in [RESOURCE_REGISTER.md](RESOURCE_REGISTER.md).
