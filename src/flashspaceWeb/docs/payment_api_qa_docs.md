# Payment API Documentation (QA Audit Edition)

All endpoints utilize Razorpay integration and strictly enforce Type/Schema validation mappings prior to accessing the underlying MongoDB architecture.

---

## 1. Create Checkout Order (Public)

**Endpoint:** `POST /api/v1/payment/create-order`

**Description:** Initializes a standard Razorpay `ord_` token payload containing booking telemetry. Safely traps undefined payloads or malformed numeric injection attempts immediately.

**Validation Rules:**

- `userId` and `spaceId` require strict 24-character ObjectId schemas.
- `paymentType` is bounded specifically to the `PaymentType` enum block (Virtual Office, Meeting Room, Coworking, Seat).
- `tenure`, `yearlyPrice`, and `totalAmount` structurally restrict floating-point overflows or negatives via `.nonnegative()` and `.positive()`.

---

## 2. Verify Payment Payload (Razorpay Webhook/Callback)

**Endpoint:** `POST /api/v1/payment/verify`

**Description:** Triggers the synchronous Booking + Invoice generator post-transaction.

**Validation Highlights:**

- **Race Condition Immunity:** Secured the `CreditsLedger` mathematical boundaries using try/catch Manual Compensation rollbacks. If MongoDB fails to generate the audit trail (`amount`, `balanceAfter`), the User's actual `.credits` integer mathematically reverts to its previous isolated state.

---

## 3. Retrieve User Payment Logs (Protected)

**Endpoint:** `GET /api/v1/payment/user/:userId`

**Description:** Fetches an array of historic transactions bound to a specific user.

**Validation Rules:**

- **DoS Cap:** Pagination limits (`limit` parameter) apply an aggressive `Math.min(limit, 100)` logic ceiling, formally rejecting malicious scrapers requesting millions of lines at once via 400 Bad Request.
- **CastError Prevention:** Rejects arbitrary URL injections (`/user/hacker`) via regex-mapped `ObjectId` schema blocks.
