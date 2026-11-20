# Deployment log – what happened, problems found and how they were fixed

All times are Philippine time (UTC+8), 2026-11-20. Failed cases are kept on purpose.

| Time | Step | Result |
|---|---|---|
| 11:35 | Local baseline at `f4a0e54`: `npm run check`, health, products | Pass (`10-pre-deploy-baseline.md`) |
| 12:30 | New branch for this task (renamed to `aws-deployment-revano` at 15:48) | – |
| 15:20 | Local DB backup, `prisma migrate deploy` (users/sessions/owner) | Pass |
| 15:30 | `npm run check` backend 69/69, frontend 15/15 | Pass |
| 15:35–15:40 | Local manual tests: owner 200, guest 401, other customer 404 | Pass (`15-auth-ownership-test.md`) |
| 15:44 | Commit `49177c9` pushed | – |
| 15:50–16:08 | AWS account (advanced sign-up, Free plan), root MFA, zero-spend budget | Pass |
| 16:20 | **Problem:** AMI defaulted to Amazon Linux, then "Ubuntu Pro 26.04" was selected | Fixed: changed to **Ubuntu Server 24.04 LTS** (no Pro surcharge, version the script expects) |
| 16:24 | **Problem:** security group had HTTPS twice (duplicate-rule error), no HTTP rule; storage 8 GiB | Fixed: rule 3 changed to HTTP 80; storage set to 20 GiB gp3 |
| 16:27 | **Problem caught before launch:** deploy files staged but not committed; raw GitHub URL of the setup script returned **404** | Fixed: committed and pushed `0b1e671`, re-checked the URL returned 200 and LF line endings, then launched |
| 16:31 | Launch `i-0833bb2383c00f026`, user-data setup | Running, 3/3 checks |
| 16:39 | Site up at https://18-140-130-174.sslip.io (certificate issued) | Pass |
| 16:40 | Expected results written for the 8 hosted checks | – |
| 16:41–17:05 | Hosted checks 1–6 | Pass (`18-hosted-verification.md`) |
| 17:01 | Improvement 2 BEFORE: same Idempotency-Key twice → orders #2 and #3 (duplicate) | Fail recorded (`19-imp2-BEFORE-duplicate-orders.png`) |
| 17:04 | Improvement 1 BEFORE: no catalog-only label | Recorded (`18-6a`) |
| 17:07 | **Problem:** SSH `Permission denied (publickey)`; key file was still in Downloads; later commands ran in PowerShell instead of the server | Fixed: moved key to `%USERPROFILE%\.ssh`, `icacls` to owner-read only, reconnected |
| 17:10 | Check 7: restart, ports, logs, secrets scan | Pass |
| 17:11–17:14 | Full instance reboot; health ok with no manual step | Pass |
| 17:12 | Improvements tested locally: backend 76/76, frontend 15/15 | Pass |
| 17:15 | Commit `446488d` pushed | – |
| 17:16 | `deploy/update.sh`: backup, pull, migrate deploy, build, restart | Pass |
| 17:19–17:21 | Retests: catalog-only badge shown; same key → 201 then 200 same order #4; stock −1 only | Pass (`24-improvements-and-retests.md`) |
| 17:24 | Credits US$120.00, US$0.00 used | Pass |
| 17:26 | Evidence commit `e09a1e9` pushed | – |

## Lessons

- Push before launch: the server can only install what is on GitHub.
- Check the Summary panel before launching (AMI, storage, rules). "Free tier eligible" on the instance type did not stop a paid "Pro" image from being selected.
- Keep the private key outside the project folder and restrict it, or SSH refuses it.
- Write the expected result first; it made the duplicate-order bug obvious as a failed case.
