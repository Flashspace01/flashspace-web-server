# Frontend UI Generation Prompt

You are an expert React/TypeScript developer. I need you to generate a "Space Service Manager" component for my Space Partner Portal.

## Context
We have refactored our backend to support multiple service types (Virtual Office, Coworking Space) for a single physical space. 
- **Backend API**:
  - `PATCH /spaces/:id/services`: Payload `{ serviceId: string, action: 'add' | 'remove' }`
  - `GET /spaces/:id/occupancy`: Returns real-time occupancy data.

## Requirements

### 1. Service Manager Component (`ServiceManager.tsx`)
- **Props**: `spaceId: string`
- **State**: List of available services (mock this data for now) and linked services.
- **UI Layout**:
    - **Header**: "Manage Services"
    - **Service List**: A list/grid of available service configurations.
    - **Actions**:
        - **"Add" button**: Calls the PATCH API with `action: 'add'` to link a service to the space.
        - **"Remove" button**: Calls the PATCH API with `action: 'remove'` to unlink a service.
    - **Visual Feedback**:
        - Show a loading spinner during API calls.
        - Show success/error toasts.

### 2. Occupancy Tracker Component (`OccupancyTracker.tsx`)
- **Props**: `spaceId: string`
- **Functionality**:
    - Fetch occupancy data on mount using `GET /spaces/:id/occupancy`.
    - Auto-refresh data every 30 seconds.
- **UI Layout**:
    - Display a card for each Coworking Service.
    - **Progress Bar**: Visual representation of `(occupied / total) * 100`.
    - **Stats**: Show "X / Y Seats Available".
    - **Color Coding**:
        - Green: < 50% occupied
        - Yellow: 50-80% occupied
        - Red: > 80% occupied

## Tech Stack
- React (Functional Components)
- TypeScript
- Tailwind CSS (for styling)
- Lucide React (for icons)
- Axios (for API requests)

## Deliverables
Provide the complete code for `ServiceManager.tsx` and `OccupancyTracker.tsx`. Ensure the code is production-ready with proper error handling and strict types.
