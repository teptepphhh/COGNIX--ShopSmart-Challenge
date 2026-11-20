# AWS account record (no credentials, no account ID)

**Owner:** Stephanie Joy Revano (individual task)
**Date created:** 2026-11-20
**Approved by instructor:** students create their own AWS Free plan account

| Decision / fact | Value | Why it matters | Evidence |
|---|---|---|---|
| Sign-up path | Sign up for AWS (advanced) | Gives Region choice, full EC2 networking (security groups), IAM and Billing and Cost Management. The "new" sign-up uses preconfigured Regions and limited networking. | – |
| Account plan | **Free plan** | No charges during the demo. Limited to select services. The account closes when the free period ends or credits run out, unless upgraded. | `screenshots/12-aws-plan-credits.png` |
| Credits | At sign-up: US$100.00. After deployment (2026-11-20 17:24): **US$120.00** available (US$100 AWS Free Tier + US$20 earned for setting up AWS Budgets), US$0.00 used. AWS updates estimated usage about every 24 hours, so the EC2 hours of today will appear later. Credit expiry 2027-11-20. | Every running resource uses credits, even with no visitors. | `screenshots/12-aws-plan-credits.png`, `screenshots/25-credits-after-deploy.png` |
| Free plan end | **2027-05-20** (182 days) or when credits are used up, whichever comes first | The demo and cleanup must finish well before this date. | Console "Free plan status" panel |
| Root user MFA | Enabled (virtual authenticator app, `revano-phone`) | Protects the account owner sign-in. Root credentials are not shared. | `screenshots/11-aws-root-mfa.png` |
| Access keys | None created | No long-term keys that could leak into the repo or screenshots. | `screenshots/11-aws-root-mfa.png` |
| Daily AWS access | Root user with MFA (individual task, one person). No IAM users or access keys were created and root credentials are not shared. For a team or a longer project: create an IAM Identity Center user with only the EC2/Billing permissions needed and stop using root. | Least privilege; root should not be the everyday identity. | – |
| Organizations | Not joined | Joining AWS Organizations would automatically upgrade a Free plan account to Paid. | – |
| Cost alert | AWS Budgets **Zero spend budget** `shopsmart-zero-spend`, all services, email alert when spend exceeds US$0.01. Status OK / Healthy, US$0.00 used. | Early warning if any resource starts to cost money. | `screenshots/12b-aws-zero-spend-budget.png` |
| Region | Asia Pacific (Singapore) `ap-southeast-1` (to be used for all resources) | Closest to the Philippines. One Region keeps cleanup simple. | Resource register |

Screenshots are redacted: account ID, canonical user ID, MFA ARN and credit ID are covered.
