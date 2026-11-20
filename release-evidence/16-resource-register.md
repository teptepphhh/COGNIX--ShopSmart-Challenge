# AWS resource register – ShopSmart demo

**Account owner:** Stephanie Joy Revano (individual) · **Plan:** Free plan (ends 2027-05-20) · **Region for all resources:** Asia Pacific (Singapore) `ap-southeast-1`
No credentials, passwords or account ID are recorded here.

| # | Service | Resource | Region / AZ | Owner | Purpose | Created | Planned removal | Status |
|---|---|---|---|---|---|---|---|---|
| 1 | EC2 instance | `shopsmart-demo` (`i-0833bb2383c00f026`), t3.micro, Ubuntu Server 24.04 LTS | ap-southeast-1 / ap-southeast-1c | Revano | Runs Nginx (HTTPS, React build), Express API (127.0.0.1:3000) and PostgreSQL (127.0.0.1:5432) | 2026-11-20 | 2026-11-27 | Running |
| 2 | EBS volume | Root volume of `shopsmart-demo`, 20 GiB gp3 (tagged Project/Owner/RemoveBy) | ap-southeast-1c | Revano | Operating system, code, PostgreSQL data | 2026-11-20 | 2026-11-27 (deleted with the instance; check Volumes list) | In use |
| 3 | Public IPv4 address | 18.140.130.174 (auto-assigned, not an Elastic IP) | ap-southeast-1 | Revano | Public address; hostname `18-140-130-174.sslip.io` | 2026-11-20 | Released when the instance is terminated | In use |
| 4 | Security group | `shopsmart-web-sg` | ap-southeast-1 (default VPC) | Revano | Inbound: 443 and 80 from anywhere, 22 from my IP only. 3000 and 5432 are not open. | 2026-11-20 | 2026-11-27 (after the instance) | In use |
| 5 | Key pair | `shopsmart-key` (ED25519). Private key kept only on my laptop in `%USERPROFILE%\.ssh`, never in the repo | ap-southeast-1 | Revano | SSH administration | 2026-11-20 | 2026-11-27 | Active |
| 6 | AWS Budgets | `shopsmart-zero-spend` (zero spend template, email alert above US$0.01) | Global | Revano | Cost alert | 2026-11-20 | Keep until the account closes (no cost) | Active |

Tags on the instance and volume: `Name=shopsmart-demo`, `Project=ShopSmart`, `Owner=Revano`, `RemoveBy=2026-11-27`.

## Demo dates

- Deployed: 2026-11-20 16:31 · Demonstrated and submitted: 2026-11-20 (deadline 23:59) · Kept running for grading until **2026-11-27**, then removed.

## Cost notes

- The instance, its public IPv4 address and the 20 GiB volume use credits every hour while they exist, even when nobody visits the site.
- Stopping the instance would change the public IP and therefore the sslip.io hostname and certificate. The instance is left running until the demo is graded, then terminated.

## Removal plan (after grading, by 2026-11-27)

1. Take a final `pg_dump` from the server and download it if the data is needed (fictional data only).
2. EC2 → Instances → `shopsmart-demo` → Instance state → **Terminate**.
3. EC2 → Volumes: confirm no `Project=ShopSmart` volume remains. EC2 → Snapshots: delete any ShopSmart snapshot.
4. EC2 → Security groups: delete `shopsmart-web-sg`. EC2 → Key pairs: delete `shopsmart-key`, and delete the local `.pem`.
5. EC2 → Elastic IPs: confirm none are allocated.
6. Billing → Credits and Bills: confirm credits stopped decreasing. Record the date in this table.
