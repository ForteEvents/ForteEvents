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
- Current `sms_history` read paths expose status and error message, but no provider request identifier or delivery timestamp.
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

- Existing `sms_history` rows do not currently persist Beem `request_id`.
- The Delivery Reports endpoint requires both `request_id` and `dest_addr`; therefore ForteEvents cannot safely query old rows through this endpoint unless the original request IDs can be recovered.
- Do not fabricate request IDs, match by phone number alone, or resend old messages to test them.
- For historical messages, use Beem's dashboard/API reports export and ask Beem Support whether they can retrieve historical request IDs/statuses for a specified date range/account. Reconcile those records against ForteEvents history and billing before making any customer-credit adjustment.

## Implementation sequence

1. Add nullable provider tracking fields to `sms_history` through a reviewed, additive database migration (request ID, provider status, provider status timestamp, unique ForteEvents message ID, and retry-attempt relationship).
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

## Current status

- Beem's official DLR endpoint, parameters, authentication alternatives, statuses, polling interval, no-webhook behavior, and retry guidance are confirmed.
- The feature branch remains isolated from `main`.
- Planning and code inspection only. No production files, database rows, SMS records, customer credits, environment variables, Beem settings, or Render deployments have been changed by this plan.
