Below is a PR-ready checklist based on the current account implementation. No files were changed.

## Account flow TODO

### 1. Product and legal decisions

- [ ] Decide where the service will initially be available and have counsel confirm the applicable privacy and children’s-safety requirements.
- [ ] Choose the minimum account age and document how underage users will be handled.
- [ ] Decide whether to:
  - Reject users below the minimum age, or
  - Support minors through verified parental consent.
- [ ] Add a neutral age gate before collecting email addresses or Chess.com usernames.
- [ ] Avoid collecting full dates of birth unless legally necessary; prefer the least precise age information that satisfies the chosen policy.
- [ ] Define retention periods for accounts, puzzles, authentication records, email events, application logs, and deleted-account backups.
- [ ] Identify the legal entity/operator, contact email, mailing address, governing jurisdiction, and privacy contact.

A simple “I am 13” checkbox may not be sufficient. COPPA applies to covered collection from children under 13, including email addresses and persistent identifiers, while EU consent ages can range from 13 to 16. Services likely to be accessed by UK children may also need age-appropriate design protections for users under 18. See the [FTC COPPA guidance](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions), [GDPR Article 8](https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=CONSIL%3APE_17_2016_INIT), and [UK Children’s Code](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/introduction-to-the-childrens-code/).

### 2. Terms and privacy documents

- [ ] Draft and obtain legal review of the Terms of Service.
- [ ] Include eligibility and minimum-age rules.
- [ ] Include acceptable-use and account-termination rules.
- [ ] Explain account deletion and suspension.
- [ ] Cover intellectual property and user-provided information.
- [ ] Include appropriate warranty, service-availability, and liability provisions.
- [ ] Explain the use of Chess.com public data and clarify that Chesstutis is not affiliated with or endorsed by Chess.com.
- [ ] Add governing-law and dispute provisions appropriate to the operator’s location.
- [ ] Draft and obtain legal review of the Privacy Policy.
- [ ] Describe all collected data: email, password hash, age result, Chess.com username and public games, puzzles, authentication records, IP/log information, and local-storage data.
- [ ] List purposes and legal bases for processing.
- [ ] Identify processors and recipients, including Resend, database/hosting providers, observability providers, and Chess.com interactions.
- [ ] Explain retention, deletion, backups, international transfers, and security practices.
- [ ] Explain access, correction, deletion, portability, objection, and complaint rights where applicable.
- [ ] Include a process and contact address for privacy requests.
- [ ] Add effective dates and policy version numbers.
- [ ] Add a cookie/storage notice describing the authentication data currently placed in browser storage.
- [ ] Add a cookie-consent mechanism before introducing non-essential analytics or advertising cookies.
- [ ] Put Terms and Privacy links in the footer, signup form, and anywhere personal data is collected.
- [ ] Use an unchecked required signup checkbox for Terms acceptance.
- [ ] Keep optional marketing consent separate, unchecked, and unnecessary for signup.
- [ ] Store the accepted Terms version and timestamp.
- [ ] Treat the Privacy Policy primarily as a notice, not as blanket consent for every processing activity.

GDPR notices should identify the controller, purposes, legal bases, retention, recipients, transfers, and user rights in clear language. See the [European Commission’s privacy guidance](https://commission.europa.eu/law/law-topic/data-protection/information-individuals_en).

### 3. Database and account state

- [ ] Add `email_verified_at` or an equivalent explicit verification state.
- [ ] Add account states such as `pending_verification`, `active`, `suspended`, and `pending_deletion` if needed.
- [ ] Add age-policy fields sufficient to record the result, policy version, and timestamp without retaining unnecessary birth information.
- [ ] Add Terms acceptance version and timestamp.
- [ ] Create a token table supporting email verification and password reset.
- [ ] Store only hashes of verification/reset tokens.
- [ ] Record token purpose, user, creation time, expiration time, and consumption time.
- [ ] Ensure tokens are single-use and invalidate superseded tokens.
- [ ] Add queries and regenerate sqlc output.
- [ ] Decide how abandoned, unverified accounts are automatically deleted.

### 4. Resend email verification

- [ ] Create separate Resend development and production configuration.
- [ ] Verify the sending domain and configure SPF and DKIM.
- [ ] Add DMARC with an appropriate rollout policy.
- [ ] Use a dedicated transactional sender such as `accounts@chesstutis.org`.
- [ ] Add environment configuration for the Resend API key, sender, public application URL, and webhook secret.
- [ ] Keep the Resend API key server-side and out of logs and API responses.
- [ ] Introduce an email-sender abstraction so handlers can be tested without calling Resend.
- [ ] Generate cryptographically random verification tokens.
- [ ] Give verification links a limited lifetime, such as 24 hours.
- [ ] Use Resend idempotency keys so retries cannot send duplicate messages.
- [ ] Create accessible plain-text and HTML verification templates.
- [ ] Include expiration information and a notice for recipients who did not create the account.
- [ ] Add a pending-verification page after signup.
- [ ] Add an endpoint to request another verification email.
- [ ] Add cooldowns and per-IP, per-account, and per-address rate limits.
- [ ] Return generic responses from the resend endpoint to prevent account enumeration.
- [ ] Add an endpoint that verifies and consumes the token atomically.
- [ ] Avoid consuming verification tokens on a plain `GET`; email security scanners may open links automatically. Let the link open the frontend, then confirm through a state-changing request.
- [ ] Handle valid, expired, invalid, already-used, and already-verified links.
- [ ] Let users correct a mistyped email address while still unverified.
- [ ] Decide whether signup creates no session or creates a tightly restricted unverified session.
- [ ] Do not provide full application access until verification succeeds.
- [ ] Consider signed Resend webhooks for delivery failures, bounces, and complaints.
- [ ] Test delivery using the production domain before release.

Resend provides an official [Go integration](https://resend.com/go) and supports [idempotency keys](https://resend.com/changelog/idempotency-keys).

### 5. Password recovery and email changes

- [ ] Add “Forgot password?” to login.
- [ ] Add a generic password-reset request endpoint that does not reveal whether an account exists.
- [ ] Send single-use, short-lived reset links through Resend.
- [ ] Add reset-password confirmation and expired-link pages.
- [ ] Revoke all existing sessions after a successful password reset.
- [ ] Revoke other sessions after a password change, or explicitly let the user choose.
- [ ] Add an authenticated email-change flow.
- [ ] Require the current password or recent reauthentication before changing email.
- [ ] Verify the new address before replacing the old one.
- [ ] Notify the old address after an email change.

### 6. Existing authentication issues to finish

- [x] Reconcile the frontend `/api/auth/logout` request with the backend `/api/auth/revoke` route.
- [x] Send the refresh token—not the access token—when revoking a session.
- [x] Add `refresh_token` to the frontend response/session model explicitly.
- [x] Prevent the current response spread from accidentally storing `refresh_token` inside the user object.
- [x] Implement frontend access-token refresh before expiration.
- [x] Rotate refresh tokens on use and detect attempted reuse.
- [ ] Prefer an `HttpOnly`, `Secure`, `SameSite` cookie for refresh tokens instead of JavaScript-accessible local storage.
- [ ] If cookies are adopted, add CSRF protection to state-changing requests.
- [x] Standardize access-token duration; signup currently issues a longer-lived token than login.
- [x] Revoke all refresh tokens when an account is deleted.
- [x] Revoke or rotate sessions after security-sensitive account changes.
- [x] Normalize login email the same way signup email is normalized.
- [x] Validate email format and maximum length on the server.
- [x] Add reasonable password maximum length in addition to the current minimum.
- [x] Use consistent generic login errors to reduce email enumeration.
- [ ] Add rate limiting for signup, login, verification, refresh, password reset, and account changes.
- [x] Add frontend route guards for dashboard, solve, and account pages.
- [x] Add redirects that prevent authenticated users from returning to login/signup.
- [x] Add `PATCH` to the CORS allowed methods for the existing profile endpoint.
- [x] Decide whether the private-beta Basic Auth gate is being retained, removed, or applied consistently before release.
- [x] Validate Chess.com usernames on both the frontend and backend.
- [x] Define behavior when Chess.com is unavailable instead of making signup permanently depend on a successful third-party request.

Implementation notes: access and refresh tokens intentionally remain in local storage for now, so the cookie and CSRF items remain open. Existing signup, login, refresh/revoke, and account-change endpoints are rate-limited; the combined rate-limit item remains open until verification and password-reset endpoints exist and can also be covered. Chess.com verification fails closed with a retryable `503 Service Unavailable` response when the upstream service cannot be reached.

### 7. Account management

- [ ] Require recent reauthentication before account deletion.
- [ ] Clearly explain what deletion removes and what may remain temporarily in backups or legally required records.
- [ ] Return a consistent deletion response and clear the local session.
- [ ] Confirm cascade deletion of refresh tokens and user puzzles.
- [ ] Add an account-data export if required by the launch jurisdictions.
- [ ] Provide a privacy-request workflow for access, correction, deletion, and portability.
- [ ] Consider a “sign out all devices” action and session-management view.

### 8. Tests and release checks

- [ ] Unit-test verification token generation, hashing, expiration, invalidation, and single-use behavior.
- [ ] Test concurrent verification attempts.
- [ ] Test signup rollback/recovery when Resend is unavailable.
- [ ] Test duplicate signup and enumeration-resistant responses.
- [ ] Test verification resend cooldowns and rate limits.
- [ ] Test expired and scanner-opened verification links.
- [ ] Test password-reset success, expiration, reuse, and session revocation.
- [ ] Test refresh rotation, reuse detection, logout, and account deletion.
- [ ] Test age-gate branches and recorded policy versions.
- [ ] Test that Terms acceptance is required and not preselected.
- [ ] Test keyboard and screen-reader behavior for every account screen.
- [ ] Run `go test ./...`.
- [ ] Run frontend lint and production build.
- [ ] Manually exercise the full production-like flow: signup → verification → login → refresh → password reset → profile change → logout → deletion.
- [ ] Confirm secrets are absent from logs, browser storage, error reports, and metrics.
- [ ] Add monitoring for email failures, verification conversion, login failures, reset abuse, refresh-token reuse, and deletion failures.

The legal items should be reviewed by qualified counsel before public launch, especially because a chess-learning service is reasonably likely to attract minors.
