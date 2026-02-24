# Virtual Office API Documentation (QA Audit Edition)

The Virtual Office module manages long-term commercial property leasing arrays linked structurally to the `PropertyModel`. It restricts unauthorized scraping payloads by enforcing rigid pagination thresholds and Typecast checking methodologies.

---

## 1. Retrieve Virtual Offices (Public/Partner)

**Endpoints:**

- `GET /api/v1/virtual-office/getAll?limit=10&page=1`
- `GET /api/v1/virtual-office/getByCity/:city`
- `GET /api/v1/virtual-office/partner/spaces`

**Description:** Generates formatted virtual office objects dynamically querying the database depending on access payloads (General, City String Index, or Authenticated Partner Context).

**Validation Rules (Sealed DoS Vulnerability):**

- **DoS Cap:** Paginates limits cleanly truncating malicious enumeration through a `.transform(Number)` layer mapping tightly behind explicit boundary parameters (`Math.min(limit, 100)`). The native `Model.find()` is now protected with `.limit(_limit).skip((_page - 1) * _limit)`, guaranteeing memory spikes are impossible regardless of the sheer density of stored properties.
- **Param Integrity:** Extracts valid String checks ensuring `city` maps successfully using regex anchors across valid database structures without allowing complex dictionary NoSQL querying.

---

## 2. Retrieve Virtual Office By ID (Public)

**Endpoint:** `GET /api/v1/virtual-office/getById/:virtualOfficeId`

**Validation Rules:**

- Validates the `virtualOfficeId` using aggressively bounded RegExp constraints deflecting MongoDB CastErrors (`/^[0-9a-fA-F]{24}$/`) completely insulating the Mongoose Query Driver.

---

## 3. Create & Modify Virtual Offices (Protected)

**Endpoints:**

- `POST /api/v1/virtual-office/create`
- `PUT /api/v1/virtual-office/update/:virtualOfficeId`

**Description:** Allows registered space partners (and platform Admins) to inject fully populated Virtual Offices.

**Validation Rules:**

- Integrates `createVirtualOfficeSchema`. Validates numeric boundary floors cleanly filtering against `0` limits using native `.nonnegative()` parsing checks across financial attributes (`gstPlanPricePerYear`).
- Validates `.min(3)` string restrictions limiting dirty data storage across array names strings.
- Automatically maps location nodes via a hard `LocationSchema` blocking array structure injection against GeoSpatial Indexes.
