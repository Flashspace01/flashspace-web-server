# Test Mode Documentation

## How to Run Test Scripts

Follow these steps to run the test scripts for the project:

### Step 1: Seed the Database
```bash
npm run seed
```

### Step 2: Start the Development Server
```bash
npm run dev
```

### Step 3: Run API Tests
```bash
npm run test:api
```

---

## APIs Being Tested

### AUTHENTICATION (4 APIs)
1. `GET /auth/verify-email` - Verify email via token
2. `POST /auth/forgot-password` - Request password reset
3. `POST /auth/reset-password` - Reset password with token
4. `POST /auth/google` - Google OAuth login

### CONTACT FORM (5 APIs)
1. `POST /contactForm/createContactForm` - Create contact form
2. `GET /contactForm/getAllContactForm` - Get all contact forms
3. `GET /contactForm/getContactFormById/:id` - Get contact form by ID
4. `PUT /contactForm/updateContactForm/:id` - Update contact form
5. `DELETE /contactForm/deleteContactForm/:id` - Delete contact form

### VIRTUAL OFFICE (6 APIs)
1. `POST /virtualOffice/create` - Create virtual office
2. `GET /virtualOffice/getAll` - Get all virtual offices
3. `GET /virtualOffice/getByCity/:city` - Get virtual offices by city
4. `GET /virtualOffice/getById/:id` - Get virtual office by ID
5. `PUT /virtualOffice/update/:id` - Update virtual office
6. `DELETE /virtualOffice/delete/:id` - Delete virtual office

### COWORKING SPACE (6 APIs)
1. `POST /coworkingSpace/create` - Create coworking space
2. `GET /coworkingSpace/getAll` - Get all coworking spaces
3. `GET /coworkingSpace/getByCity/:city` - Get coworking spaces by city
4. `GET /coworkingSpace/getById/:id` - Get coworking space by ID
5. `PUT /coworkingSpace/update/:id` - Update coworking space
6. `DELETE /coworkingSpace/delete/:id` - Delete coworking space

### PARTNER INQUIRY (3 APIs)
1. `POST /partnerInquiry/submit` - Submit partner inquiry
2. `GET /partnerInquiry/all` - Get all partner inquiries
3. `PUT /partnerInquiry/:id/status` - Update inquiry status

### USER DASHBOARD (13 APIs)
1. `GET /user/dashboard` - Get dashboard overview (protected)
2. `GET /user/bookings` - Get all bookings (protected)
3. `GET /user/bookings/:id` - Get booking by ID (protected)
4. `PATCH /user/bookings/:id/auto-renew` - Toggle auto-renew (protected)
5. `GET /user/kyc` - Get KYC status (protected)
6. `PUT /user/kyc/business-info` - Update business info (protected)
7. `POST /user/kyc/upload` - Upload KYC document (protected)
8. `GET /user/invoices` - Get all invoices (protected)
9. `GET /user/invoices/:id` - Get invoice by ID (protected)
10. `GET /user/support/tickets` - Get all support tickets (protected)
11. `POST /user/support/tickets` - Create support ticket (protected)
12. `GET /user/support/tickets/:id` - Get ticket by ID (protected)
13. `POST /user/support/tickets/:id/reply` - Reply to ticket (protected)

---

**Total APIs: 37**