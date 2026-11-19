# ForteEvents SMS Delivery Tracking — Safe Implementation Plan

## Production safety boundary

- All work in this branch is isolated from `main`.
- Beem has now confirmed the delivery-report contract in writing for the exact current integration and account.
- Do not deploy or merge this work until implementation, database migration, tests, and production-safety review are complete.
- Do not resend, cancel, edit, or otherwise touch SMS already submitted to Beem.
- Never automatically retry messages with an unknown or pending status.
- Do not refund credits merely because a message is pending.

## Confirmed current implementation

- `server/server.js` sends one recipient per request to `https://apisms.beem.africa/v1/send`.
- It treats `successful === true`, `code === 100`, and `valid === 1` as provider acceptance.
- Accepted messages are stored in `sms_history` with status `sent`.
- The send response includes `request_id`, but current history persistence does not save it.
- The live `sms_history` schema also contains a nullable legacy `beem_message_id` column, but a read-only production check found 0 of 264 rows populated; the current send code does not write it. We are not assuming it is interchangeable with Beem's `request_id`.
- Therefore, current `sent` means accepted by Beem, not confirmed delivered to the handset.

## Beem-confirmed Delivery Reports contract

Beem Support confirmed this applies to the existing `https://apisms.beem.africa/v1/send` integration, account, and credentials.

- Method: `GET`
- Endpoint: `https://dlrapi.beem.africa/public/v1/delivery-reports`
- Query parameters: `dest_addr` (international format, same as sent) and `request_id` (from that send response).
- One lookup per recipient/message.
- Authentication: HTTP Basic Auth (API Key as username, Secret as password), OR an access token in Authorization without the `Bearer` prefix. Use one method per request.
- Confirmed statuses: `PENDING`, `DELIVERED`, `UNDELIVERED`.
- Beem recommends checking at least 5 minutes after sending.
- No delivery-report webhook/callback is supported for this SMS API; ForteEvents must poll.
- Retry only `UNDELIVERED`; never retry `PENDING`.
- Beem says a pending message may still be delivered, and the Send SMS API has no provider-side duplicate-protection key.
- Keep a unique ForteEvents ID for each logical message and store every attempt's `request_id`.
- Example responses contain `dest_addr`, `status`, and `request_id`. Beem says 404 means invalid/unmatched request ID or destination; 401 means invalid credentials; 400 means missing authorization or invalid request. The report response does not include a failure reason.

Official documentation:
- https://docs.beem.africa/guides/sms/delivery-reports
- https://docs.beem.africa/api-reference/get-delivery-reports

## Important limitation for historical SMS

- The live table has 264 history rows; 0 have a value in the existing `beem_message_id` column. The current application code does not populate that column. A separate additive `beem_request_id` field is being introduced to store the exact documented request ID.
- The Delivery Reports endpoint requires both `request_id` and `dest_addr`; therefore ForteEvents cannot safely query old rows through this endpoint unless the original request IDs can be recovered.
- Do not fabricate request IDs, match by phone number alone, or resend old messages to test them.
- For historical messages, use Beem's dashboard/API reports export and ask Beem Support whether they can retrieve historical request IDs/statuses for a specified date range/account. Reconcile those records against ForteEvents history and billing before making any customer-credit adjustment.

## Implementation sequence

1. Add nullable provider tracking fields to `sms_history` through a reviewed, additive database migration (`beem_request_id`, provider status, status-check timestamp, and unique ForteEvents attempt ID). No existing row is rewritten.
2. Persist the exact Beem `request_id` from every accepted single-recipient send. Keep the existing sending behavior, recipient loop, and credit reservation/refund rules unchanged in this first step.
3. Implement an authenticated admin-triggered poller first, using the confirmed GET endpoint and Basic Auth. Query each eligible row individually, no sooner than 5 minutes after submission; use bounded batches and rate limits. Do not poll rows without both request ID and destination.
4. Make status updates idempotent. Map only the confirmed statuses; preserve the last checked time and safe provider response metadata. Do not downgrade a terminal delivered result because of a stale response.
5. Add a staff/customer history view that distinguishes Submitted, Pending, Delivered, and Undelivered, with last check time. Explain that Submitted means Beem accepted the request, not handset delivery.
6. Add a manual retry action only for confirmed `UNDELIVERED` attempts, with a new attempt row and unique ForteEvents ID. Do not overwrite the original attempt. No automatic retry in the first release.
7. Add automatic retry only after real-world manual retry testing and explicit duplicate-risk review. Beem's no-idempotency-key warning must be respected.
8. Reconcile credits only after Beem confirms billing semantics. Credit adjustments must be auditable and idempotent; pending alone is never a refund trigger.
9. For historical rows, obtain Beem exports/support lookup first. Do not mutate old rows or customer credits based on guesses.
10. Test using a dedicated test recipient and simulated provider responses: delivered, pending, undelivered, 400/401/404, timeouts, duplicate polls, out-of-order/stale responses, partial batches, and rollback.
11. Merge/deploy only after review, migration verification, and an explicit production-safety check.

## Implementation progress on the isolated branch

- Added `server/beem-delivery-reports.js` with an admin-only, manually triggered batch poller. It uses Basic Auth, the confirmed GET endpoint, exact request ID + destination matching, a five-minute minimum age, and a bounded batch (25 default, 100 max).
- Polling only considers new rows with a stored request ID and `sent` status. It maps only the three confirmed Beem statuses. `PENDING` remains eligible for a later check; `DELIVERED` and `UNDELIVERED` become terminal application statuses.
- Polling never sends SMS, never retries, never changes customer credits, and never changes legacy rows without request IDs. It avoids overwriting terminal rows through conditional updates.
- Updated the send-history insert to save Beem's exact `request_id` and a unique ForteEvents attempt UUID for new attempts. The current sending request, recipient loop, and credit logic remain unchanged.
- Added an additive SQL migration at `supabase/migrations/20261119000100_beem_sms_delivery_tracking.sql`. It has not been applied to production.
- Added parser unit tests and a branch CI workflow to run tests, JavaScript syntax checks, and the frontend build.
- The live database was inspected read-only: 264 SMS history rows; 0 populated `beem_message_id` values; 256 rows with a `sent` or `pending` status. No rows were modified.
- The branch remains isolated from `main`. No production migration, Render deploy, SMS send/retry, credit adjustment, or Beem configuration change has occurred.
- Remaining before merge: run CI, review poller query behavior and status transitions, apply the additive migration only after review, verify with a controlled test recipient, and then add the admin/customer UI.
