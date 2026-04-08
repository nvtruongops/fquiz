# FQuiz Security Operations & Runbooks

This document outlines the operational procedures for maintaining the security posture of FQuiz, aligned with OWASP Top 10 (2021).

## 1. Secret Rotation Runbook (JWT & API Keys)

### Periodic Rotation (Every 90 Days)

1. **JWT Secret**:
    - **Step 1**: Generate a new 32-byte random string.
    - **Step 2**: Move current `JWT_SECRET` to `JWT_SECRET_PREV` in environment variables.
    - **Step 3**: Set the new string to `JWT_SECRET`.
    - **Step 4**: Deploy. The system will now sign with the new key but still verify with the old one (multikey support).
    - **Step 5**: After 24-48 hours (after all tokens expire), remove `JWT_SECRET_PREV`.
2. **Cloudinary/External API Keys**:
    - Rotate via provider dashboard.
    - Update environment variables immediately.

### Emergency Rotation (Leak Detected)

- Rotate **immediately**.
- Use the `v` (version) field in JWT to invalidate all existing sessions if a widespread leak is suspected (increment `token_version` in DB for affected users).

## 2. CI/CD Security Gates

The following checks MUST pass in the CI pipeline (GitHub Actions / GitLab CI):

1. **Dependency Scan (`npm audit`)**:
    - Command: `npm audit --audit-level=high`
    - Failure Criteria: Any **High** or **Critical** vulnerability found.
    - SLA: High <= 7 days, Critical <= 24 hours.
2. **Static Application Security Testing (SAST)**:
    - Recommended: CodeQL or Snyk.
    - Failure Criteria: Any vulnerability tagged "Security" with high/critical impact.
3. **Secret Scanning**:
    - Use GitHub's native secret scanning or `trufflehog`.
    - Failure Criteria: Any plaintext secret found in the commit history.

## 3. Incident Playbooks

### Credential Stuffing / Brute Force

- **Symptom**: Burst of 401/403/429 logs in `pino`.
- **Action**: Check rate-limit logs. Block offending IPs at the WAF/CloudFlare level if they bypass application-level limits.

### Token Abuse / Account Takeover

- **Symptom**: Unusual `request_id` patterns or IP drift for a single `user_id`.
- **Action**: Increment `token_version` for the affected user in MongoDB to invalidate all their active sessions immediately.

### CSP Breakage

- **Symptom**: High volume of `csp_violation` events at `/api/security/csp-report`.
- **Action**: Temporarily revert `Content-Security-Policy` to `Report-Only` mode until the white-list is updated.

## 4. PII Redaction Policy

- All logs through `lib/logger.ts` are automatically redacted.
- **Fields Redacted**: `password`, `token`, `reset_token`, `cookie`, `email` (masked), `IP` (partially masked).
