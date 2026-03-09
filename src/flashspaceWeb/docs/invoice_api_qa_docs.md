# Invoice API Documentation (QA Audit Edition)

All endpoints strictly require a valid JWT `Authorization: Bearer <token>` header. Responses follow a standardized wrapper:

```json
{
  "success": boolean,
  "message": string,
  "data": object | array,
  "error": any // Detailed in Dev, generic "Internal Server Error" in Prod
}
```

---

## 1. Get All Invoices (Admin & Partner)

**Endpoint:** `GET /api/v1/invoice/` AND `GET /api/v1/user/invoices/`

**Description:** Retrieves a paginated list of invoices associated with the authenticated user. If a partner attempts to fetch invoices, it automatically applies an RBAC filter to only return invoices linked to their properties. Automatically generates summary aggregations (totalPaid, totalPending).

**Request Payload:**
_Query Parameters:_

- **Optional:**
  - `status` (string): Filters the invoice by status (paid, pending, overdue, cancelled).
  - `fromDate` (string): ISO Datetime or YYYY-MM-DD.
  - `toDate` (string): ISO Datetime or YYYY-MM-DD.
  - `page` (number): Pagination page. Default: `1`.
  - `limit` (number): Number of items per page. Default: `10`.

**Validation Rules:**

- `status` must strictly match the enum `["paid", "pending", "overdue", "cancelled"]`.
- `page` & `limit` must be valid digits.
- `limit` is strictly bounded to a max of `100` via Zod schema (Admin Route) and programmatic caps (User Route) to prevent Memory Exhaustion DoS attacks.
- Dates are strictly validated to prevent malformed Mongo date operations.

**Responses:**

_200 OK (Success)_

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalPaid": 1500,
      "totalPending": 500,
      "count": 2
    },
    "invoices": [
      {
        "_id": "60d5ec...",
        "invoiceNumber": "INV-2024-00001",
        "description": "Tech Hub - Dedicated Desk",
        "subtotal": 1000,
        "taxAmount": 180,
        "total": 1180,
        "status": "paid"
      }
    ]
  },
  "pagination": {
    "total": 2,
    "page": 1,
    "pages": 1
  }
}
```

_400 Bad Request (Validation Error)_

```json
{
  "success": false,
  "message": "Validation Error",
  "error": { ...Zod Error Details... }
}
```

---

## 2. Get Invoice By ID

**Endpoint:** `GET /api/v1/invoice/:invoiceId` AND `GET /api/v1/user/invoices/:invoiceId`

**Description:** Retrieves the full details of a specific invoice. Applies necessary RBAC to ensure a user/partner can only access their own invoices.

**Request Payload:**
_Path Parameters:_

- **Required:**
  - `invoiceId` (string): The ObjectId of the specified invoice.

**Validation Rules:**

- `invoiceId` is firmly sanitized. If an invalid 24-character hex sequence is supplied, the controller intercepts the malformed ID and rejects the request as a `400 Bad Request` rather than crashing the Mongoose driver with a `500 CastError`.

**Responses:**

_404 Not Found_

```json
{
  "success": false,
  "message": "Invoice not found or unauthorized",
  "data": {},
  "error": "Invoice not found or unauthorized"
}
```

---

### QA Audit Summary & Vulnerabilities Identified

1. **[RESOLVED] Unbounded Pagination DoS Exploit (`GET /` & `GET /user/invoices/`)**:
   - **Fix Applied**: Both the primary API (`invoice.controller`) and the dashboard API (`userDashboard.controller`) possessed unbounded `limit` variables parsed directly from the Request query payload. I strictly mitigated this DoS vector across the entire application by configuring the `getInvoicesSchema` to explicitly enforce `.max(100)` logic, and implemented a programmatic `Math.min(limit, 100)` filter inside the User Dashboard module. High-volume scraping query attempts are guaranteed blocked.
2. **[RESOLVED] Missing Path Validators (`GET /:invoiceId` & `GET /user/invoices/:invoiceId`)**:
   - **Fix Applied**: Providing an invalid ObjectId (like '123') to these endpoints would force Mongoose to throw an unhandled `Cast to ObjectId failed` Error, crashing the request into a `500 Internal Server` fatal state. This creates noise in APM tooling (like Datadog). I configured standard `mongoose.Types.ObjectId.isValid` interceptors alongside the `getInvoiceByIdSchema` to formally categorize these user inputs as `400 Bad Requests`.
3. **[RESOLVED] Route Shadowing Bug (`invoice.routes.ts`)**:
   - **Fix Applied**: Reordered the Express routes inside `invoice.routes.ts`. Previously, the `/partner` static route was registered _below_ the `/:invoiceId` dynamic route. This meant that calling `/api/v1/invoice/partner` would inadvertently trigger the dynamic `getInvoiceById` controller looking for an invoice with ID `"partner"`. The static routes have been safely moved to the top of the stack.
