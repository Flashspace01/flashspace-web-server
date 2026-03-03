# Property Module Documentation (QA Audit Edition)

Unlike modules such as `MeetingRoom`, `VirtualOffice`, and `Invoice`, the `Property Module` functions strictly as an **Internal Data Layer** within the FlashSpace Mongoose architecture.

It does **not** expose any HTTP Express REST endpoints (`.routes.ts` and `.controller.ts` do not exist).

---

## 1. Architectural Role

The `PropertyModel` serves as a relational foundation mapped physically via the `@prop` decorator inside distinct Space Models.

A `Property` handles:

- Geographical coordinates (`location: 2dsphere`)
- Universal physical metadata (`name`, `city`, `area`, `images`)
- Onboarding status parameters (`kycStatus`, `isActive`)

These are consumed via `.populate("property")` calls internally.

---

## 2. Validation & Security Boundaries

Because the Property Module has no exposed APIs, there are no immediate HTTP DoS vulnerability planes. Instead, its security posture is inherited mathematically layer-in from the Space Modules that consume it.

1. **Zod Validation Shielding**: When a user accesses `POST /api/v1/spaces/meeting-rooms/create`, the `createMeetingRoomSchema` handles the Zod boundaries (e.g., verifying City string lengths and GeoJSON Arrays). The raw `MeetingRoomService` then delegates building the property to `PropertyService.createProperty()`.
2. **Database Integrity**: The `.service.ts` actively uses `{ runValidators: true }` during `$set` updates to strictly enforce Mongoose Schema constraints (such as `enum: KYCStatus`) directly at the database layer.

---

## 3. QA Audit Summary

1. **[VERIFIED] Secure Internal Encapsulation**:
   - Ensure the module remains decoupled from Express routes. If you ever implement `GET /api/v1/properties`, you **must** implement a `property.validation.ts` schema mapped with `.limit()` arrays securely.
2. **[VERIFIED] Inherited Protection**:
   - DoS Memory bugs and `ObjectId` `CastError` bugs are currently fully mitigated by the Zod wrappers running actively on the frontend-facing MeetingRoom, CoworkingSpace, and VirtualOffice modules.
