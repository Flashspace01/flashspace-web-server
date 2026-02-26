# FlashSpace API Documentation Part 2: Frontend Testing Guide

This document maps all available backend APIs to their corresponding frontend routes in `FlashSpace-web-client-2`. This allows you to test backend functionalities directly through the UI.

---

## 1. Authentication Module (`/api/auth`)

| Backend Endpoint | Method | Description | Frontend Testing Route | Frontend Component/Action |
| :--- | :--- | :--- | :--- | :--- |
| `/signup` | POST | Register new user | `/signup` or `/` | Signup Modal / Page |
| `/login` | POST | Authenticate user | `/login` or `/` | Login Modal / Page |
| `/google` | POST | Google OAuth login | `/login` or `/signup` | "Continue with Google" button |
| `/verify-otp` | POST | Verify email via OTP | `/verify-otp` | OTP Input Screen |
| `/resend-otp` | POST | Request new OTP | `/verify-otp` | "Resend OTP" link |
| `/forgot-password` | POST | Request password reset | `/forgot-password` | Forgot Password Page |
| `/reset-password` | POST | Reset using token | (via Email Link) | Reset Password Page |
| `/change-password` | POST | Update password (auth) | `/settings` | Settings > Change Password |
| `/profile` | GET | Fetch user profile | Automatically called | Appears in Header/Sidebar profile |
| `/logout` | POST | Logout current session | All protected routes | "Logout" button in profile menu |
| `/logout-all` | POST | Logout all devices | `/settings` | Settings > Security |

---

## 2. User Dashboard Module (`/api/user`)

| Backend Endpoint | Method | Description | Frontend Testing Route | Frontend Component/Action |
| :--- | :--- | :--- | :--- | :--- |
| `/dashboard` | GET | Get user statistics | `/dashboard` | Client Dashboard Overview |
| `/bookings` | GET | List user bookings | `/dashboard/bookings` | Bookings History Table |
| `/bookings/:id` | GET | Booking details | `/dashboard/bookings` | View Booking Details |
| `/bookings/:id/auto-renew` | PATCH| Toggle auto-renewal | `/dashboard/bookings` | Auto-Renew Switch |
| `/kyc` | GET | Get KYC status | `/dashboard/kyc` (assuming inside settings) | KYC Verification Tab |
| `/kyc/business-info` | PUT | Update business data | `/dashboard/kyc` | Business Info Form |
| `/kyc/upload` | POST | Upload KYC Docs | `/dashboard/kyc` | Document Upload Dropzone |
| `/kyc/submit` | POST | Submit KYC | `/dashboard/kyc` | "Submit for Verification" Button |
| `/invoices` | GET | List user invoices | `/dashboard/invoices` (assuming inside settings)| Invoices List |
| `/credits` | GET | View wallet/credits | `/dashboard/credits` (assuming inside settings)| Credits Section |
| `/credits/redeem` | POST | Redeem rewards | `/dashboard/credits` | Redeem Button |

---

## 3. Spaces (Virtual Office & Coworking)

**Virtual Office (`/api/virtualOffice`) & Coworking Space (`/api/coworkingSpace`)**

| Backend Endpoint | Method | Description | Frontend Testing Route | Frontend Component/Action |
| :--- | :--- | :--- | :--- | :--- |
| `/getAll` | GET | List all spaces | `/services/virtual-office`, `/services/coworking-space`, `/city-listing` | Space Grids, City Listings |
| `/getById/:id` | GET | Space details | `/space/:id`, `/coworking-space/:id`, `/meeting-room/:id` | Specific Space Detail Page |
| `/create` | POST | Add new space | `/admin/spaces`, `/spaceportal/space-management/add` | Admin/Partner Add Space Form |
| `/update/:id` | PUT | Edit space | `/admin/spaces`, `/spaceportal/space-management` | Admin/Partner Edit Space Modal |
| `/delete/:id` | DELETE | Remove space | `/admin/spaces`, `/spaceportal/space-management` | Delete Space Button |

*Note: Booking flow utilizes `/booking/:id` and `/booking/:id/complete` on the frontend before interacting with payment endpoints.*

---

## 4. Admin Dashboard Module (`/api/admin`)

**Access:** All testing requires logging in as an Admin and navigating to `/admin` routes.

| Backend Endpoint | Method | Description | Frontend Testing Route | Frontend Component/Action |
| :--- | :--- | :--- | :--- | :--- |
| `/dashboard` | GET | Overall stats | `/admin` | Admin Dashboard Overview |
| `/users` | GET | List platform users | `/admin/users` | User Management Table |
| `/users` | POST | Create user manually | `/admin/users` | Add User Form |
| `/users/:id` | PUT/DEL| Edit/Delete user | `/admin/users` | User Actions |
| `/kyc-requests` | GET | All KYC submissions | `/admin/kyc-requests` | KYC Queue |
| `/kyc/:id/review` | PUT | Approve/Reject KYC | `/admin/kyc-requests/:id` | KYC Detail Review Page |
| `/bookings` | GET | Platform bookings | `/admin/booking-analysis` | Sales Analytics & Bookings |
| `/clients` | GET | CRM: List clients | `/admin/clients` | Clients Table |
| `/clients/:id` | GET | CRM: Client details | `/admin/clients/:id` | Client 360 View |
| `/clients/:id/notes` | POST | Add CRM note | `/admin/clients/:id` | Notes Section |

---

## 5. Affiliate Portal Module (`/api/affiliate` & `/api/coupons`)

**Access:** Requires Affiliate login, accessible via `/affiliate-portal`.

| Backend Endpoint | Method | Description | Frontend Testing Route | Frontend Component/Action |
| :--- | :--- | :--- | :--- | :--- |
| `/dashboard/stats` | GET | Affiliate earnings | `/affiliate-portal/affiliate-dashboard`| Main Stats Cards |
| `/dashboard/insights`| GET | Earnings chart data | `/affiliate-portal/revenue-dashboard` | Revenue Graphs |
| `/leads` | GET | Track generated leads | `/affiliate-portal/lead-management` | Lead Tracking Table |
| `/quotations` | GET | Generated quotes | `/affiliate-portal/quotation-generator` | Quotations Manager |
| `/leaderboard` | GET | Top affiliates | `/affiliate-portal/leaderboard` | Leaderboard View |
| `/invoices` | GET | Affiliate payouts | `/affiliate-portal/affiliate-invoices`, `/affiliate-portal/payouts`| Payout History |
| `/api/coupons/affiliate/generate`| POST | Create referral code | `/affiliate-portal/marketing-tools` | Marketing Tools Generator |

---

## 6. Support & Ticketing System (`/api/tickets`)

| Backend Endpoint | Method | Description | Frontend Testing Route | Frontend Component/Action |
| :--- | :--- | :--- | :--- | :--- |
| `/my-tickets` | GET | User's tickets | `/dashboard/support` (or equivalent) | Tickets List |
| `/` | POST | Create new ticket | `/dashboard/support` | "Open Ticket" Form |
| `/:id/reply` | POST | Reply to ticket | `/dashboard/support` (Ticket details)| Chat / Reply Box |
| `/admin/all` | GET | All open tickets | `/admin/tickets` | Admin Ticket System |
| `/admin/stats` | GET | Ticket analytics | `/admin/tickets` | Admin Tickets Overview |
| `/admin/:id/assign` | POST | Assign agent | `/admin/tickets` | Ticket Assignment Dropdown |
| `/admin/:id/resolve` | POST | Mark resolved | `/admin/tickets` | "Resolve" Action |
| `/admin/:id/reply` | POST | Admin reply | `/admin/tickets` | Admin Chat Interface |

---

## 7. Partner Portal Specifics

*Note: Space Partners use the same underlying Space, Ticket, and Booking APIs but viewed through the context of their owned properties.*

| Functionality | Related Backend | Frontend Testing Route | Frontend Component/Action |
| :--- | :--- | :--- | :--- |
| **Manage Spaces** | `/api/virtualOffice`, `/api/coworkingSpace`| `/spaceportal/space-management` | Edit/View Owned Spaces |
| **Client Enquiries**| `/api/contactForm` or Custom | `/spaceportal/client-enquiries` | Lead/Inquiry Inbox |
| **Tickets/Tasks** | `/api/tickets` | `/spaceportal/tasks`, `/spaceportal/tickets`| Partner Ticketing |
| **Invoices** | `/api/payment` or Custom | `/spaceportal/invoices-payments` | Partner Revenue / Payouts |

---

## 8. Public Contact & Inquiry Forms (`/api/contactForm`)

| Backend Endpoint | Method | Description | Frontend Testing Route | Frontend Component/Action |
| :--- | :--- | :--- | :--- | :--- |
| `/createContactForm` | POST | Submit general inquiry | `/services/*`, `/partner`, `/list-your-space` | Service Interest Forms, Partner Forms |

### How to use this guide:
1. Identify the backend API you wish to test (e.g., verifying a newly registered user).
2. Look up the **Frontend Testing Route** in this document (e.g., `/verify-otp`).
3. Open the `FlashSpace-web-client-2` application in your browser (usually `http://localhost:5173` or port from `npm run dev`).
4. Navigate to the corresponding route and perform the associated UI action.
5. You can check the Network tab in your browser's specifically looking at XHR/Fetch requests to see the actual API payload and response hitting the `flashspace-web-server`.

---

## 📊 Summary Statistics

| Category | Count |
| :--- | :--- |
| **Total Backend APIs Mapped** | 57 |
| **Total Frontend Testing Routes** | 42 |
| **Documented Modules** | 8 |

*Counts are based on unique functional mappings documented above.*
