# Reviews API Documentation (QA Audit Edition)

The Reviews module handles user sentiment regarding property spaces (`CoworkingSpace`, `VirtualOffice`, `MeetingRoom`). It utilizes strict Zod boundary protections to prevent malicious insertions or rapid data scraping.

---

## 1. Post a Review (Protected)

**Endpoint:** `POST /api/v1/reviews/add`

**Description:** Allows an authenticated user to attach a single 1-5 rating accompanied by a text comment.

**Validation Rules:**

- `spaceId` utilizes strict regex binding: `/^[0-9a-fA-F]{24}$/`. This blocks malformed CastErrors that can crash instances.
- `spaceModel` operates against a strict array enum blocking dynamic string reflections.
- `rating` natively limits Float abuse by strictly anchoring bounds: `.min(1).max(5)`.

**Database Consistency Check:**

- Backed intrinsically via MongoDB Compound Unique Indexes (`{ user: 1, space: 1 }`). MongoDB aggressively drops duplicate review spam directly at the `save()` context level, throwing a `11000` duplicate error code.

---

## 2. Retrieve Reviews for Space (Public) - New API!

**Endpoint:** `GET /api/v1/reviews/space/:spaceId?limit=10&page=1`

**Description:** Exposes a paginated array of related reviews for frontend processing.

**Validation Rules (Sealed DoS Vulnerability):**

- **DoS Cap:** Pagination limits (`limit` parameter) automatically map numerical entries through a formal `.transform(Number)` layer and then constrain against aggressive ceiling limits via `Math.min(limit, 100)`. This mechanism instantly returns a clean 400 Bad Request to rapid-scraping operations asking for thousands of payload rows.
- **CastError Prevention:** The `:spaceId` URL parameter enforces an identical regex match to the insertion layer, denying bad URI injection.
