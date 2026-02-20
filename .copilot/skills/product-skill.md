---
name: product-skills
description: Guide for business and product context.
---

# 🏢 Business & Product Context — App Distribution Platform

> This document defines the business domain, product goals, and high-level specifications for an **App Distribution Platform**. It is technology and framework agnostic. Use this as ground truth when making product decisions, writing features, or reasoning about user needs.

---

## 🎯 Product Mission

Enable developers to **distribute iOS and Android test builds instantly** — without app store review, without approval gates, without requiring testers to have any account. The platform sits between a developer finishing a build and a tester installing it, making that gap as small as possible.

**The core value proposition:** Upload a file → Get a shareable link → Anyone installs in one tap.

---

## 👥 User Types & Core Differences

### Guest (No Account)

- Zero-friction entry: no sign-up required
- Can upload any valid build file
- Receives a shareable installation link
- Build expires **2 days** after upload
- No dashboard, no history, no analytics
- No expiration warnings, no email support

### Registered Developer

- Email + password account
- Same upload capabilities as guest
- Build expires **8 days** after upload (default)
- Full dashboard with build history
- Can delete builds manually
- Can send installation links to testers via email
- Can view installation analytics per build
- Can extend build expiration (paid feature)
- Receives email warning 3 days before expiration

> **Key business insight:** The difference between guest and registered is the hook that drives account creation. Registered users get 4× longer retention and meaningful tools.

---

## 📦 Core Product Objects

### Build

The central entity. Represents one uploaded app file.

| Property          | Description                                             |
| ----------------- | ------------------------------------------------------- |
| **Token**         | Unique 12-character random identifier, used in all URLs |
| **Platform**      | iOS or Android (determined at upload by file type)      |
| **File**          | Stored at `builds/{token}/{original_filename}`          |
| **Expiry Date**   | When the build becomes inaccessible and gets deleted    |
| **Owner**         | Either a registered user account or null (guest)        |
| **Password Hash** | Optional; protects the installation page                |
| **Install Count** | Running total of tracked installations                  |

### Installation Event

Logged each time a tester accesses the install flow.

| Property        | Description                                         |
| --------------- | --------------------------------------------------- |
| **Build ID**    | Which build was accessed                            |
| **Timestamp**   | When it occurred                                    |
| **Device Type** | Parsed from request headers (e.g., "iPhone 14 Pro") |
| **OS Version**  | Parsed from request headers (e.g., "iOS 17.2")      |
| **IP Address**  | For geographic insight (GDPR-sensitive)             |

### Payment

Logged when a developer purchases an expiration extension.

| Property               | Description                               |
| ---------------------- | ----------------------------------------- |
| **Build ID**           | Which build was extended                  |
| **User ID**            | Who paid                                  |
| **Period**             | 1 month / 6 months / 1 year               |
| **Amount**             | USD amount paid                           |
| **Provider Reference** | External payment processor transaction ID |

---

## 🔑 Business Rules (Non-Negotiable)

### File Rules

- **Accepted types:** `.ipa`, `.app` (zipped) for iOS; `.apk` for Android
- **Max file size:** 1 GB per upload
- Validation must reject: wrong extension, oversized files, corrupted/malicious files
- Every file gets a unique token before storage — no user-controlled naming in storage paths

### Expiration Rules

- Guest builds expire **2 days** from upload
- Registered builds expire **8 days** from upload
- Expired builds are **inaccessible immediately** — no grace period
- Expired builds are **permanently deleted** by an automated daily process
- Extensions **stack on top of the current expiry date**, not from purchase date
- Cannot extend an already-expired build (must re-upload)
- Expiration warnings sent **once**, exactly **3 days before expiry**, to registered users only

### Link & Access Rules

- Anyone with the link can access the installation page — no login required for testers
- Links are non-guessable (random token, not sequential IDs)
- Links must not appear in search engine indexes
- Password-protected builds require the correct password before showing any install options
- Passwords are one-way hashed; no recovery mechanism exists (by design)
- File downloads always use time-limited signed URLs (expire after ~1 hour)

### Ownership Rules

- Registered users can only manage (delete, view analytics, extend) their own builds
- Guest builds cannot be "claimed" retroactively by a registered account
- Authentication checks must be enforced on any build-management action

---

## 💳 Monetization Model

The **only** revenue source at MVP is expiration extensions. This is intentional — the core product is free to use.

| Extension | Price |
| --------- | ----- |
| 1 month   | $1.00 |
| 6 months  | $4.99 |
| 1 year    | $9.99 |

**Business logic:** Pricing is designed to be impulse-purchase friendly. The $1 entry point removes friction. Longer periods offer mild discounts to encourage commitment. Storage costs are controlled by automatic expiration, keeping margins healthy even at low prices.

Revenue is captured at the moment of checkout. If payment fails or is cancelled, the build expiry date is not changed.

---

## 🔄 Core User Journeys (Summarized)

### 1. Guest Quick Share

Developer uploads build → receives installation link → shares link → tester installs → build auto-deletes after 2 days.  
**Goal:** Zero friction, immediate value, no commitment required.

### 2. Registered Developer Workflow

Developer logs in → uploads build → manages from dashboard → sends link to testers via email → views install analytics → optionally pays to extend before expiration.  
**Goal:** Organized, repeatable, team-friendly distribution.

### 3. Tester Installs iOS Build

Tester receives link → opens on iPhone/iPad → taps Install → iOS OTA mechanism handles download → tester trusts certificate in device settings.  
**Goal:** One-tap install with clear guidance for the certificate trust step.

### 4. Tester Installs Android Build

Tester receives link → opens on Android → taps Download APK → enables unknown sources if prompted → installs APK.  
**Goal:** Simple download flow with clear instructions for "unknown sources" requirement.

### 5. Developer Extends Expiration

Developer sees build nearing expiry in dashboard → selects extension period → completes payment → expiry date updates immediately.  
**Goal:** Frictionless upsell that preserves active testing without re-uploading.

### 6. System Auto-Cleanup (Background)

Daily automated job → deletes all expired builds (files + records) → sends expiration warning emails for builds expiring in 3 days.  
**Goal:** Storage cost control + revenue nudge (warnings drive extension purchases).

---

## 📱 Platform Detection Logic

The platform determines which installation flow a tester sees. Detection is based on the HTTP User-Agent of the tester's device.

| Detected Device        | Experience                                                    |
| ---------------------- | ------------------------------------------------------------- |
| iOS (iPhone/iPad/iPod) | iOS-optimized install page using OTA installation protocol    |
| Android                | Android-optimized page with direct APK download               |
| Desktop / Unknown      | QR code display with instruction to scan from a mobile device |

This detection is **purely presentational** — the underlying build file is the same regardless.

---

## 📊 Analytics Philosophy

Analytics exist to help developers answer one question: _"Have my testers installed the build?"_

Data collected is minimal and installation-scoped:

- **What** was installed (build ID)
- **When** (timestamp)
- **What kind of device** (device type + OS version, parsed from user-agent)
- **From where** (IP address — GDPR-sensitive, handle with care)

No account linking, no cookie tracking, no cross-build profiling. Data is deleted when the build is deleted. Analytics is a **registered-only feature** — it is a deliberate incentive to create an account.

---

## 🔐 Security Principles

- All file access goes through time-limited signed URLs (never direct public file URLs)
- Passwords are one-way hashed; the platform never stores or recovers plaintext passwords
- Payment processing is entirely delegated to an external provider — the platform stores only a transaction reference ID
- Payment webhook authenticity must always be verified cryptographically before acting on payment events
- Session cookies must be HTTP-only and SameSite-protected
- iOS OTA installation requires HTTPS — this is a hard platform constraint from Apple, not a choice

---

## 🧹 Operational Responsibilities

The platform has one critical automated responsibility: the **daily cleanup job**.

It must:

1. Delete all builds past their expiry date (files in storage + database records + associated installation logs)
2. Send one expiration warning email per build that is within 3 days of expiry (registered users only)
3. Log all activity for audit purposes
4. Handle partial failures gracefully — one failed deletion should not stop the rest of the job

This job is the backbone of cost control. Without it, storage costs grow unboundedly.

---

## 📬 Email Touchpoints

The platform sends exactly **4 types of emails**:

| Email                       | Trigger                              | Recipient                |
| --------------------------- | ------------------------------------ | ------------------------ |
| **Installation Invitation** | Developer sends build to testers     | Tester email addresses   |
| **Expiration Warning**      | Build expiring in 3 days (automated) | Registered build owner   |
| **Welcome**                 | New account created                  | New registered user      |
| **Payment Confirmation**    | Successful extension purchase        | Registered user who paid |

All emails are transactional (event-triggered), not marketing. Professional branded design. Mobile-responsive (testers are on mobile). Must include unsubscribe mechanism (legal requirement).

---

## 🚫 Out of Scope (MVP)

The following are explicitly deferred to post-MVP phases:

- Team/multi-user accounts
- API access or CI/CD webhooks
- Crash reporting or advanced analytics
- Release notes or version comparison
- White-label or custom domain support
- Two-factor authentication or SSO
- Native mobile apps for developers
- Staged rollouts or tester groups
- Any subscription or recurring billing model
- Storage quotas or upload limits beyond the 1 GB per-file rule

---

## ✅ MVP Definition of Done

The MVP is complete when the following work end-to-end:

1. Guest can upload a build and share a working installation link
2. iOS tester can install from that link on a real device
3. Android tester can install from that link on a real device
4. Registration and login work correctly
5. Registered user dashboard shows their builds with status and expiry dates
6. Registered user can delete a build
7. Registered user can send the installation link to tester emails
8. Installation events are tracked and visible in the dashboard
9. QR code is generated for each build
10. Password protection works on a build
11. Payment flow for expiration extension works with real payment processing
12. Expiry extension updates the build's expiry date immediately after payment
13. Daily automated job deletes expired builds and sends 3-day warning emails
14. Expired build shows a clear "expired" state rather than any install option

---

## 📈 Business Health Indicators

| Metric                                                    | What It Measures           |
| --------------------------------------------------------- | -------------------------- |
| Guest → Registered conversion rate                        | Product value perception   |
| % of builds with at least 1 installation                  | Distribution success       |
| % of registered builds that receive an extension purchase | Monetization effectiveness |
| Upload success rate                                       | Platform reliability       |
| Installation success rate                                 | End-to-end product quality |
| Daily active registered users                             | Engagement and stickiness  |

---

_This document is the source of truth for product intent. All implementation decisions should be traceable back to the business rules and user journeys described here._
