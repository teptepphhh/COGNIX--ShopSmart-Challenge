# AWS Resource Register

No credentials in this file. Region for all resources: **Asia Pacific (Sydney) `ap-southeast-2`**.

| Service | Resource | Region | Owner | Purpose | Created | Planned removal | Removed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| EC2 instance | `shopsmart-demo` (t3.small, Ubuntu 24.04) | ap-southeast-2b | John Kerby Sambile | Runs Nginx, Express API, PostgreSQL | 2026-11-20 | After grading | |
| EBS volume | Root volume, 20 GB gp3 | ap-southeast-2b | John Kerby Sambile | Instance disk and database data | 2026-11-20 | Deleted with instance | |
| Elastic IP | `shopsmart-eip` `3.104.192.31` | ap-southeast-2 | John Kerby Sambile | Fixed public address for the site | 2026-11-20 | Release after grading | |
| Security group | `shopsmart-web-sg` | ap-southeast-2 | John Kerby Sambile | Allows 22 (team IP / Instance Connect), 80, 443 | 2026-11-20 | After grading | |
| Key pair | `shopsmart-key` | ap-southeast-2 | John Kerby Sambile | SSH administration | 2026-11-20 | After grading | |
| AWS Budget | Monthly alert | Global | John Kerby Sambile | Cost warning | | Keep or delete | |

Expected duration: demonstration period only. An always-running instance, volume and Elastic IP consume credits even with no visitors.
