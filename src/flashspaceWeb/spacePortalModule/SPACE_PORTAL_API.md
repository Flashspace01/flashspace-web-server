# Space Portal API (Summary)

Base: `/api/spaceportal`  
Auth: access token via cookie or `Authorization: Bearer <token>`.

## Spaces
- `POST /spaces`  
Body: `{ name, city, location, totalSeats, availableSeats, meetingRooms, cabins, status }`
- `GET /spaces`  
Query: `search? status? city? page? limit? includeDeleted?`
- `GET /spaces/:spaceId`
- `PATCH /spaces/:spaceId`  
Body: any subset of create fields
- `DELETE /spaces/:spaceId`  
Query: `restore=true` to restore

## Clients
- `POST /clients`  
Body: `{ companyName, contactName, email, phone, plan, space, startDate, endDate, status, kycStatus }`
- `GET /clients`  
Query: `search? status? plan? kycStatus? page? limit? includeDeleted?`
- `GET /clients/:clientId`
- `GET /clients/:clientId/details`
- `PATCH /clients/:clientId`  
Body: any subset of create fields
- `DELETE /clients/:clientId`  
Query: `restore=true`

## Enquiries
- `POST /enquiries`  
Body: `{ clientName, companyName, phone, email, requestedPlan, requestedSpace, status? }`
- `GET /enquiries`  
Query: `search? status? page? limit? includeDeleted?`
- `GET /enquiries/:enquiryId`
- `PATCH /enquiries/:enquiryId`  
Body: any subset + `status`
- `PATCH /enquiries/:enquiryId/status`  
Body: `{ status }`
- `DELETE /enquiries/:enquiryId`  
Query: `restore=true`

## Tickets (reuses SupportTicketModel)
- `GET /tickets`  
Query: `search? status? priority? page? limit? includeDeleted?`
- `GET /tickets/:ticketId`  
Note: `ticketId` is the Mongo `_id`, not the ticket number.
- `PATCH /tickets/:ticketId`  
Body: `{ status?, priority?, assignedTo? }`

## Bookings
- `POST /bookings`  
Body: `{ clientName, space, startTime, endTime, status, planName?, amount? }`
- `GET /bookings`  
Query: `spaceId? fromDate? toDate? page? limit?`
- `GET /bookings/requests`  
Query: `status? page? limit?`
- `POST /bookings/requests`  
Body: `{ clientName, space, requestedDate, requestedTime }`
- `PATCH /bookings/requests/:requestId`  
Body: `{ status }`

## Invoices (reuses InvoiceModel)
- `GET /invoices`  
Query: `status? fromDate? toDate? page? limit?`
- `GET /invoices/:invoiceId`
- `POST /invoices`  
Body: `{ invoiceNumber, bookingNumber?, description, subtotal, taxRate?, taxAmount?, total, dueDate? }`

## Notifications
- `GET /notifications`  
Query: `page? limit? unreadOnly?`
- `PATCH /notifications/:notificationId/read`  
Body: `{ read }`
- `DELETE /notifications/:notificationId`
- `POST /notifications/:notificationId/restore`
- `POST /notifications/clear`

## Settings (Notification Preferences)
- `GET /settings`
- `PATCH /settings`  
Body: `{ emailUpdates?, bookingAlerts?, smsAlerts? }`

## Profile (Organization Details)
- `GET /profile`
- `PATCH /profile`  
Body: `{ company?, location? }`

## Analytics
- `GET /analytics/booking`
