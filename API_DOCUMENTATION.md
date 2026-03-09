# FlashSpace API Documentation

This document provides details for the API endpoints in the `spacePartner`, `coworkingSpace`, `meetingRoom`, and `virtualOffice` modules.

## Base URL

`http://localhost:5000/api` (Development)

## Authentication

Most routes require authentication via a JWT token.

- **Header**: `Authorization: Bearer <token>`
- **Cookie**: `token=<token>`

---

## 1. Space Partner Module (`/spacePartner`)

Manages partner-specific spaces and financials.

### Space Management

- **POST `/spaces`**: Create a new space.
  - **Auth**: Partner required.
  - **Body**: `name`, `address`, `city`, `area`, `capacity`, `inventory`, `operatingHours`, `amenities`, `location`, `images`, `videos`, `mediaIds`.
- **GET `/spaces`**: Get all spaces for the authenticated partner.
- **GET `/spaces/:id`**: Get space details by ID.
- **PUT `/spaces/:id`**: Update space details.
- **DELETE `/spaces/:id`**: Delete a space.

### Partner Financials

- **POST `/invoices`**: Create a partner invoice.
  - **Body**: `client`, `description`, `amount`, `dueDate`, `space`, `invoiceId` (optional).
- **GET `/invoices`**: Get all invoices for the partner.
- **POST `/payments`**: Record a payment.
  - **Body**: `client`, `amount`, `method`, `purpose`, `space`, `paymentId` (optional), `invoiceId` (optional), `commission`.
- **GET `/payments`**: Get all payments for the partner.

---

## 2. Coworking Space Module (`/coworkingSpace`)

Public and partner-specific coworking space management.

- **POST `/create`**: Create a coworking space.
  - **Auth**: Partner or Admin.
  - **Body**: `name`, `address`, `city`, `area`, `capacity`, `inventory`, `operatingHours`, `amenities`, `location`, `images`, `popular`.
- **GET `/getAll`**: Get all coworking spaces.
  - **Query**: `deleted=true` (optional).
- **GET `/getByCity/:city`**: Get coworking spaces in a specific city.
- **GET `/getById/:coworkingSpaceId`**: Get details of a specific coworking space.
- **PUT `/update/:coworkingSpaceId`**: Update a coworking space.
- **DELETE `/delete/:coworkingSpaceId`**: Delete a coworking space.
- **GET `/partner/spaces`**: Get all spaces owned by the authenticated partner.

---

## 3. Meeting Room Module (`/meetingRoom`)

_Note: These routes are currently defined but not mounted in `mainRoutes.ts`._

- **GET `/getAll`**: Get all meeting rooms.
  - **Query**: `type`, `minPrice`, `maxPrice`.
- **GET `/getById/:meetingRoomId`**: Get meeting room by ID.
- **GET `/getByCity/:city`**: Get meeting rooms by city.
- **POST `/create`**: Create a meeting room.
  - **Auth**: Partner or Admin.
- **PUT `/update/:meetingRoomId`**: Update meeting room.
- **DELETE `/delete/:meetingRoomId`**: Delete meeting room.
- **GET `/partner/my-rooms`**: Get partner-specific meeting rooms.

---

## 4. Virtual Office Module (`/virtualOffice`)

Virtual office service management.

- **GET `/getAll`**: Get all virtual offices.
- **GET `/getByCity/:city`**: Get virtual offices by city.
- **GET `/getById/:virtualOfficeId`**: Get virtual office details.
- **POST `/create`**: Create a virtual office.
  - **Auth**: Partner or Admin.
- **PUT `/update/:virtualOfficeId`**: Update a virtual office.
- **DELETE `/delete/:virtualOfficeId`**: Delete/Restore a virtual office.
  - **Query**: `restore=true` (optional).
- **GET `/partner/spaces`**: Get partner-specific virtual offices.
