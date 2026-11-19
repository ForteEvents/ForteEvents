# ForteEvents SMS Delivery Tracking — Safe Implementation Plan

## Production safety boundary

- All work in this branch is isolated from `main`.
- Do not deploy or merge this work until Beem confirms the delivery-report contract for the exact API currently used by ForteEvents: `https://apisms.beem.africa/v1/send`.
- Do not resend, cancel, edit, or otherwise touch SMS already submitted to Beem. Their delivery lifecycle is controlled by Beem and the mobile operators.
- Do not automatically retry messages with an unknown or pending status.

## Confirmed current implementation

- `server/server.js` sends one recipient per request to `https://apisms.beem.africa/v1/send`.
- It treats `successful === true`, `code === 100`, and `valid === 1` as provider acceptance.
- Accepted messages are stored in `sms_history` with status `sent`.
- The send response includes `request_id` in Beem's response shape, but current history persistence does not save it.
- Current `sms_history` read paths expose status and error message, but no provider request identifier or delivery timestamp.
- Therefore, current `sent` means accepted by Beem, not confirmed delivered to the handset.

## Required confirmation from Beem before implementation

Ask Beem to confirm in writing for the exact v1 API credentials/account:

1. The official delivery-report API base URL and endpoint, or official webhook configuration procedure.
2. Whether each send response's `request_id` can be used to query delivery status for an individual recipient.
3. Exact request parameters, authentication method, response schema, and all possible status values.
4. Whether callbacks are supported for this v1 endpoint; if yes, exact payload, authentication/signature mechanism, retry behavior, and source IP guidance.
5. How long a message can legitimately remain pending, and which statuses are terminal and safe to retry.
6. Whether the provider may still deliver a message after reporting an undelivered/failed status.

Do not copy endpoints or payload schemas from Beep Africa or third-party SDKs: they are not the same documented API contract as the Beem endpoint ForteEvents currently uses.

## Implementation sequence after confirmation

1. Add nullable provider tracking fields to `sms_history` through a reviewed, additive database migration (provider request ID, provider status, provider status timestamp, delivery error/code, retry count, and a link to the original row for retries).
2. Persist the exact Beem `request_id` from every accepted single-recipient send. Keep the existing send behavior unchanged during this first step.
3. Implement a private, authenticated/verified DLR receiver or provider-status poller according to Beem's confirmed contract. Make updates idempotent and correlate by provider request ID plus destination number.
4. Map provider statuses without overclaiming: provider-accepted = submitted; pending = pending; delivered = delivered; terminal undelivered = failed. Preserve raw provider response for diagnostics while excluding credentials and unnecessary personal data from logs.
5. Add a staff/customer history view that distinguishes Submitted, Pending, Delivered, and Failed, including last status update and safe error explanation.
6. Add a manual retry action first, restricted to terminal failures confirmed safe to retry. Use an idempotency key and create a new linked attempt row; never overwrite the original attempt.
7. Add automatic retry only after manual retry is proven safe. Use bounded attempts, backoff, duplicate protection, and an explicit provider rule that the prior attempt cannot later deliver.
8. Decide credit settlement only after Beem confirms billing semantics. Never refund merely because a message is pending; make credit adjustments idempotent and auditable.
9. Test with a dedicated test recipient/account and simulated provider callbacks/status responses. Verify duplicate callbacks, out-of-order callbacks, timeouts, partial batches, and deployment rollback.
10. Merge/deploy only after review, migration verification, and an explicit production-safety check.

## Current status

Planning and code inspection only. No production files, database rows, SMS records, customer credits, environment variables, Beem settings, or Render deployments have been changed by this plan.
