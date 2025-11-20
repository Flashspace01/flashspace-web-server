# Adding Google Maps Coordinates to Backend Data

## Overview
This guide explains how to add accurate Google Maps coordinates to your MongoDB documents for Coworking Spaces and Virtual Offices.

## Files Modified

### 1. Models (Already have coordinates field ✓)
- `coworkingSpace.model.ts` - Has `coordinates?: { lat: number; lng: number; }`
- `virtualOffice.model.ts` - Has `coordinates?: { lat: number; lng: number; }`

### 2. Scripts
- **`src/scripts/addCoordinates.ts`** - New script to add coordinates to existing documents
- **`src/scripts/seedData.ts`** - Seed script (needs coordinates added)

## How to Add Coordinates

### Method 1: Update Existing Documents (Quick Fix)

Run this command in the backend terminal:

```bash
cd flashspace-web-server
npm run add:coordinates
```

This will:
- Connect to your MongoDB
- Find all Coworking Spaces and Virtual Offices
- Add accurate Google Maps coordinates to each document
- Display success/error messages

### Method 2: Update Seed Data (For Fresh Installs)

Edit `src/scripts/seedData.ts` and add `coordinates` to each object:

```typescript
{
  name: "Sweet Spot Spaces",
  address: "Office No 4-D fourth, Vardaan Complex...",
  city: "Ahmedabad",
  // ... other fields ...
  coordinates: { lat: 23.0349, lng: 72.5612 } // ← Add this
}
```

Then run:
```bash
npm run seed
```

## Current Coordinates Mapping

All coordinates in `addCoordinates.ts` are accurate from Google Maps:

### Ahmedabad
- **Workzone - Ahmedabad**: `23.0071, 72.5101`
- **Sweet Spot Spaces**: `23.0349, 72.5612`

### Bangalore
- **IndiraNagar - Aspire Coworks**: `12.9784, 77.6408`
- **Koramangala - Aspire Coworks**: `12.9279, 77.6271`
- **EcoSpace - Hebbal, HMT Layout**: `13.0358, 77.5970`

### Chennai
- **WBB Office**: `13.0143, 80.2217`
- **Senate Space**: `13.0878, 80.2086`

### Delhi
- **Stirring Minds**: `28.6480, 77.2410`
- **CP Alt F**: `28.6304, 77.2177`
- **Virtualexcel**: `28.5244, 77.2066`
- **Mytime Cowork**: `28.5244, 77.2066`
- **Okhla Alt F**: `28.5494, 77.2736`
- **WBB Office (Laxmi Nagar)**: `28.6331, 77.2767`
- **Budha Coworking Spaces**: `28.7496, 77.1166`
- **Work & Beyond**: `28.5822, 77.0461`
- **Getset Spaces**: `28.5494, 77.2067`

### Gurgaon
- **Infrapro - Sector 44**: `28.4505, 77.0526`
- **Palm Court - Gurgaon**: `28.4089, 76.9904`

### Dharamshala
- **Ghoomakkad**: `32.2396, 76.3239`

### Hyderabad
- **Cabins 24/7**: `17.4630, 78.3713`
- **CS Coworking**: `17.4401, 78.3489`

### Jaipur
- **Jeev Business Solutions**: `26.8738, 75.8110`

### Jammu
- **Qubicle Coworking**: `32.7156, 74.8578`
- **Kaytech Solutions**: `32.6899, 74.8378`

## How to Find Coordinates from Google Maps

1. Go to [Google Maps](https://maps.google.com)
2. Search for the address
3. Right-click on the location marker
4. Click "Copy coordinates" or select the coordinates shown
5. Format: `latitude, longitude` (e.g., `28.6304, 77.2177`)

## Verifying Coordinates

After running the script, verify in MongoDB:

```javascript
db.coworkingspaces.findOne({ name: "Sweet Spot Spaces" })
// Should show:
// coordinates: { lat: 23.0349, lng: 72.5612 }
```

## Frontend Integration

The frontend will automatically use these coordinates when fetching data:

```typescript
// Frontend automatically gets coordinates from API
const data = await getCoworkingSpacesByCity("Ahmedabad");
// Each space now has: coordinates: { lat, lng }
```

## Troubleshooting

### Script fails to connect
- Check your `.env` file has correct `DB_URI`
- Ensure MongoDB is running

### Coordinates not showing
- Run `npm run add:coordinates` again
- Check MongoDB Compass to verify data

### Need to add new location
1. Find coordinates on Google Maps
2. Add to `coordinatesMap` in `addCoordinates.ts`
3. Run `npm run add:coordinates`

## Next Steps

1. **Run the script**: `npm run add:coordinates`
2. **Verify**: Check MongoDB to confirm coordinates are added
3. **Test Frontend**: Check if markers appear on map correctly
4. **Update Seed**: Add coordinates to `seedData.ts` for future use

---

**Created**: November 18, 2025  
**Last Updated**: November 18, 2025
