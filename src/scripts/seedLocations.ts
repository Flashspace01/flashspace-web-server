/**
 * seedLocations.ts
 * ───────────────────────────────────────────────────────────────
 * SAFE additive seed: does NOT drop the database.
 * Inserts real FlashSpace coworking spaces + virtual offices with
 * accurate lat/lng coordinates (used by the map panel in the chat).
 *
 * Run:
 *   npx ts-node -r tsconfig-paths/register src/scripts/seedLocations.ts
 * ───────────────────────────────────────────────────────────────
 */

import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import mongoose from "mongoose";
import { dbConnection } from "../config/db.config";

import { UserModel } from "../flashspaceWeb/authModule/models/user.model";
import { PropertyModel } from "../flashspaceWeb/propertyModule/property.model";
import { CoworkingSpaceModel } from "../flashspaceWeb/coworkingSpaceModule/coworkingSpace.model";
import { VirtualOfficeModel } from "../flashspaceWeb/virtualOfficeModule/virtualOffice.model";

// ─── COWORKING SPACES ────────────────────────────────────────────
const coworkingSpaces = [
    {
        name: "Workzone - Ahmedabad",
        address: "World Trade Tower, Makarba, Ahmedabad, Gujarat 380051, India",
        city: "Ahmedabad",
        area: "Makarba",
        price: 1083,
        rating: 4.8,
        reviews: 245,
        type: "Hot Desk",
        features: ["High-Speed WiFi", "Meeting Rooms", "Coffee Bar", "24/7 Access"],
        availability: "Available Now",
        popular: true,
        image: "https://shorturl.at/Fyr6o",
        coordinates: { lat: 23.0109, lng: 72.5061 },
    },
    {
        name: "Sweet Spot Spaces",
        address: "Office No 4-D, Vardaan Complex, Navrangpura, Ahmedabad, Gujarat 380009, India",
        city: "Ahmedabad",
        area: "Navrangpura",
        price: 1167,
        rating: 4.7,
        reviews: 189,
        type: "Dedicated Desk",
        features: ["Premium Location", "Parking", "Event Space", "Cafeteria"],
        availability: "Available Now",
        popular: false,
        image: "https://shorturl.at/LdEgA",
        coordinates: { lat: 23.0421, lng: 72.5617 },
    },
    {
        name: "IndiraNagar - Aspire Coworks",
        address: "17, 7th Main Rd, Indiranagar, Bengaluru, Karnataka 560038, India",
        city: "Bangalore",
        area: "Indiranagar",
        price: 833,
        rating: 4.8,
        reviews: 267,
        type: "Hot Desk",
        features: ["Tech Hub", "Innovation Labs", "Startup Ecosystem", "Outdoor Terrace"],
        availability: "Available Now",
        popular: true,
        image: "https://shorturl.at/LdEgA",
        coordinates: { lat: 12.9784, lng: 77.6408 },
    },
    {
        name: "Koramangala - Aspire Coworks",
        address: "2nd & 3rd Floor, Balaji Arcade, 4th Block, Koramangala, Bengaluru, Karnataka 560095, India",
        city: "Bangalore",
        area: "Koramangala",
        price: 1000,
        rating: 4.6,
        reviews: 189,
        type: "Dedicated Desk",
        features: ["IT Corridor", "Shuttle Service", "Gaming Area", "Wellness Programs"],
        availability: "Available Now",
        popular: false,
        image: "https://shorturl.at/Fyr6o",
        coordinates: { lat: 12.9352, lng: 77.6245 },
    },
    {
        name: "EcoSpace - Hebbal, HMT Layout",
        address: "No 33, 4th Floor, 1st Main, HMT Layout, Ganganagar, Bengaluru, Karnataka 560032, India",
        city: "Bangalore",
        area: "HMT Layout",
        price: 833,
        rating: 4.5,
        reviews: 134,
        type: "Hot Desk",
        features: ["Residential Area", "Quiet Environment", "Flexible Hours", "Community Kitchen"],
        availability: "Available Now",
        popular: false,
        image: "https://shorturl.at/S4XWY",
        coordinates: { lat: 13.0358, lng: 77.5897 },
    },
    {
        name: "WBB Office",
        address: "35, Anna Salai, near Little Mount, Nandanam, Chennai, Tamil Nadu 600015, India",
        city: "Chennai",
        area: "Nandanam",
        price: 4800,
        rating: 4.7,
        reviews: 198,
        type: "Hot Desk",
        features: ["Metro Connectivity", "Modern Facilities", "Parking", "Food Court"],
        availability: "Available Now",
        popular: true,
        image: "https://shorturl.at/NUpzM",
        coordinates: { lat: 13.0279, lng: 80.2286 },
    },
    {
        name: "Senate Space",
        address: "W-126, 3rd Floor, 3rd Ave, Anna Nagar, Chennai, Tamil Nadu 600040, India",
        city: "Chennai",
        area: "Anna Nagar",
        price: 917,
        rating: 4.4,
        reviews: 112,
        type: "Dedicated Desk",
        features: ["Residential Area", "Peaceful Environment", "Basic Amenities", "WiFi"],
        availability: "Available Now",
        popular: false,
        image: "https://shorturl.at/LdEgA",
        coordinates: { lat: 13.0850, lng: 80.2101 },
    },
    {
        name: "Stirring Minds",
        address: "Kundan Mansion, 2-A/3, Asaf Ali Rd, Chandni Chowk, New Delhi, Delhi 110002, India",
        city: "Delhi",
        area: "Chandni Chowk",
        price: 800,
        rating: 4.8,
        reviews: 245,
        type: "Hot Desk",
        features: ["High-Speed WiFi", "Meeting Rooms", "Coffee Bar", "24/7 Access"],
        availability: "Available Now",
        popular: true,
        image: "https://res.cloudinary.com/drd4942mc/image/upload/v1767696478/chrome_y4ymlwh9SR_apwgug.png",
        coordinates: { lat: 28.6434, lng: 77.2313 },
    },
    {
        name: "CP Alt F",
        address: "Connaught Lane, Barakhamba, New Delhi, Delhi 110001, India",
        city: "Delhi",
        area: "Connaught Place",
        price: 2667,
        rating: 4.7,
        reviews: 189,
        type: "Dedicated Desk",
        features: ["Private Cabin Option", "Parking", "Event Space", "Cafeteria"],
        availability: "Available Now",
        popular: false,
        image: "https://res.cloudinary.com/drd4942mc/image/upload/v1767696830/chrome_tF4p9FCNvN_e0w4dd.png",
        coordinates: { lat: 28.6328, lng: 77.2197 },
    },
    {
        name: "Virtualexcel",
        address: "Saket Salcon Rasvilas, next to Select Citywalk Mall, Saket, New Delhi, Delhi 110017, India",
        city: "Delhi",
        area: "Saket",
        price: 1000,
        rating: 4.6,
        reviews: 156,
        type: "Hot Desk",
        features: ["Shopping Mall Access", "Premium Location", "Networking Events", "Printer Access"],
        availability: "Available Now",
        popular: false,
        image: "https://res.cloudinary.com/drd4942mc/image/upload/v1767696936/chrome_y6UfCoipUj_wkpxel.png",
        coordinates: { lat: 28.5245, lng: 77.2066 },
    },
    {
        name: "Mytime Cowork",
        address: "55 Lane-2, Westend Marg, Saket, New Delhi, Delhi 110030, India",
        city: "Delhi",
        area: "Saket",
        price: 6500,
        rating: 4.9,
        reviews: 198,
        type: "Private Office",
        features: ["Premium Location", "Executive Lounge", "Concierge", "Valet Parking"],
        availability: "Available Now",
        popular: true,
        image: "https://res.cloudinary.com/drd4942mc/image/upload/v1767696150/chrome_F5QP1MGRA2_whrsth.png",
        coordinates: { lat: 28.5270, lng: 77.1945 },
    },
    {
        name: "Okhla Alt F",
        address: "101, NH-19, CRRI, Ishwar Nagar, Okhla, New Delhi, Delhi 110044, India",
        city: "Delhi",
        area: "Okhla",
        price: 2500,
        rating: 4.5,
        reviews: 134,
        type: "Hot Desk",
        features: ["Industrial Area", "Flexible Hours", "Gaming Zone", "Wellness Room"],
        availability: "Available Now",
        popular: false,
        image: "https://res.cloudinary.com/drd4942mc/image/upload/v1767697088/chrome_nweqds48I9_i7xwhi.png",
        coordinates: { lat: 28.5609, lng: 77.2730 },
    },
    {
        name: "WBB Office - Laxmi Nagar",
        address: "Office no. 102, 52A first floor, Vijay Block, Laxmi Nagar, Delhi 110092, India",
        city: "Delhi",
        area: "Laxmi Nagar",
        price: 4800,
        rating: 4.3,
        reviews: 89,
        type: "Shared Desk",
        features: ["Budget Friendly", "Basic Amenities", "WiFi", "Print Access"],
        availability: "Available Now",
        popular: false,
        image: "https://res.cloudinary.com/drd4942mc/image/upload/v1767697269/chrome_e1S9bRUX5L_t3ltud.png",
        coordinates: { lat: 28.6325, lng: 77.2773 },
    },
    {
        name: "Budha Coworking Spaces",
        address: "3rd floor, H.no 33, Pocket 5, Sector-24, Rohini, Delhi 110085, India",
        city: "Delhi",
        area: "Rohini",
        price: 4200,
        rating: 4.4,
        reviews: 112,
        type: "Hot Desk",
        features: ["Suburban Location", "Parking Available", "Community Events", "Cafeteria"],
        availability: "Available Now",
        popular: false,
        image: "https://images.unsplash.com/photo-1604328698692-f76ea9498e76?q=80&w=1170&auto=format&fit=crop",
        coordinates: { lat: 28.7210, lng: 77.1099 },
    },
    {
        name: "Work & Beyond",
        address: "Kocchar Plaza near Ramphal Chowk Dwarka Sector 7, Block E, Palam, Delhi 110077, India",
        city: "Delhi",
        area: "Dwarka",
        price: 5500,
        rating: 4.5,
        reviews: 145,
        type: "Dedicated Desk",
        features: ["Airport Proximity", "Modern Amenities", "Meeting Rooms", "Parking"],
        availability: "Available Now",
        popular: false,
        image: "https://res.cloudinary.com/drd4942mc/image/upload/v1767697175/chrome_4eVI3pxb5I_qpev0q.png",
        coordinates: { lat: 28.5918, lng: 77.0453 },
    },
    {
        name: "Getset Spaces",
        address: "3rd Floor, LMR House, S-16, Block C, Green Park Extension, New Delhi, Delhi 110016, India",
        city: "Delhi",
        area: "Green Park",
        price: 5000,
        rating: 4.6,
        reviews: 167,
        type: "Private Office",
        features: ["South Delhi", "Premium Facilities", "Networking", "Cafeteria"],
        availability: "Available Now",
        popular: true,
        image: "https://res.cloudinary.com/drd4942mc/image/upload/v1767696619/chrome_Usn5xZsDny_b59bwf.png",
        coordinates: { lat: 28.5596, lng: 77.2067 },
    },
    {
        name: "Infrapro - Sector 44",
        address: "Plot no 4, 2nd floor, Minarch Tower, Sector 44, Gurugram, Haryana 122003, India",
        city: "Gurgaon",
        area: "Sector 44",
        price: 1000,
        rating: 4.7,
        reviews: 178,
        type: "Dedicated Desk",
        features: ["Corporate Hub", "Modern Facilities", "Ample Parking", "Food Court"],
        availability: "Available Now",
        popular: true,
        image: "https://shorturl.at/Fyr6o",
        coordinates: { lat: 28.4421, lng: 77.0534 },
    },
    {
        name: "Palm Court - Gurgaon",
        address: "Mehrauli Rd, Gurugram, Haryana 122022, India",
        city: "Gurgaon",
        area: "Mehrauli Road",
        price: 1000,
        rating: 4.4,
        reviews: 134,
        type: "Hot Desk",
        features: ["Premium Location", "Creative Spaces", "Event Hosting", "Bike Parking"],
        availability: "Available Now",
        popular: false,
        image: "https://shorturl.at/Fyr6o",
        coordinates: { lat: 28.4727, lng: 77.0327 },
    },
    {
        name: "Ghoomakkad",
        address: "V.P.o, Sidhbari, Rakkar, Himachal Pradesh 176057, India",
        city: "Dharamshala",
        area: "Sidhbari",
        price: 667,
        rating: 4.6,
        reviews: 156,
        type: "Dedicated Desk",
        features: ["Mountain View", "Peaceful Environment", "Nature Workspace", "Wellness Programs"],
        availability: "Available Now",
        popular: false,
        image: "https://shorturl.at/LdEgA",
        coordinates: { lat: 32.2220, lng: 76.3380 },
    },
    {
        name: "Cabins 24/7",
        address: "5/86, Golden Tulip Estate, JV Hills, HITEC City, Kondapur, Telangana 500081, India",
        city: "Hyderabad",
        area: "Kondapur",
        price: 1000,
        rating: 4.3,
        reviews: 98,
        type: "Hot Desk",
        features: ["IT Hub", "Flexible Plans", "Community Events", "Gaming Area"],
        availability: "Available Now",
        popular: false,
        image: "https://shorturl.at/S4XWY",
        coordinates: { lat: 17.4600, lng: 78.3615 },
    },
    {
        name: "CS Coworking",
        address: "3rd Floor, KNR Square, opp. The Platina, Gachibowli, Hyderabad, Telangana 500032, India",
        city: "Hyderabad",
        area: "Gachibowli",
        price: 917,
        rating: 4.5,
        reviews: 123,
        type: "Dedicated Desk",
        features: ["Tech Park", "Modern Infrastructure", "Parking", "Cafeteria"],
        availability: "Available Now",
        popular: true,
        image: "https://shorturl.at/NUpzM",
        coordinates: { lat: 17.4400, lng: 78.3489 },
    },
    {
        name: "Jeev Business Solutions",
        address: "548 1, Tonk Rd, behind Jaipur Hospital, Gopal Pura Mode, Jaipur, Rajasthan 302018, India",
        city: "Jaipur",
        area: "Tonk Road",
        price: 833,
        rating: 4.4,
        reviews: 145,
        type: "Hot Desk",
        features: ["Central Location", "Budget Friendly", "WiFi", "Meeting Rooms"],
        availability: "Available Now",
        popular: false,
        image: "https://shorturl.at/Fyr6o",
        coordinates: { lat: 26.8467, lng: 75.8000 },
    },
    {
        name: "Qubicle Coworking",
        address: "Trikuta Nagar Ext 1/A, Jammu",
        city: "Jammu",
        area: "Trikuta Nagar",
        price: 1000,
        rating: 4.5,
        reviews: 89,
        type: "Hot Desk",
        features: ["Residential Area", "Quiet Environment", "Basic Amenities", "WiFi"],
        availability: "Available Now",
        popular: false,
        image: "https://shorturl.at/S4XWY",
        coordinates: { lat: 32.7266, lng: 74.8570 },
    },
    {
        name: "Kaytech Solutions",
        address: "Civil Airport, Satwari, Raipur Satwari, Jammu, Jammu and Kashmir 180003",
        city: "Jammu",
        area: "Satwari",
        price: 1500,
        rating: 4.6,
        reviews: 112,
        type: "Private Office",
        features: ["Airport Proximity", "Premium Amenities", "Parking", "Meeting Rooms"],
        availability: "Available Now",
        popular: true,
        image: "https://shorturl.at/NUpzM",
        coordinates: { lat: 32.6897, lng: 74.8373 },
    },
    // ── NEW: Assam (for testing dynamic city detection) ──
    {
        name: "NorthEast Cowork - Guwahati",
        address: "GS Road, Bhangagarh, Guwahati, Assam 781005, India",
        city: "Assam",
        area: "Bhangagarh",
        price: 750,
        rating: 4.5,
        reviews: 78,
        type: "Hot Desk",
        features: ["High-Speed WiFi", "24/7 Access", "Meeting Rooms", "Tea & Coffee"],
        availability: "Available Now",
        popular: true,
        image: "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1169&auto=format&fit=crop",
        coordinates: { lat: 26.1445, lng: 91.7362 },
    },
];

// ─── VIRTUAL OFFICES ─────────────────────────────────────────────
const virtualOffices = [
    {
        name: "Workzone - Ahmedabad",
        address: "World Trade Tower, Makarba, Ahmedabad, Gujarat 380051, India",
        city: "Ahmedabad", area: "Makarba",
        gstPrice: 1083, mailingPrice: 667, brPrice: 1275,
        rating: 4.8, reviews: 245, popular: true,
        image: "https://shorturl.at/Fyr6o",
        coordinates: { lat: 23.0109, lng: 72.5061 },
    },
    {
        name: "Sweet Spot Spaces",
        address: "Office No 4-D, Vardaan Complex, Navrangpura, Ahmedabad, Gujarat 380009, India",
        city: "Ahmedabad", area: "Navrangpura",
        gstPrice: 1167, mailingPrice: 833, brPrice: 1375,
        rating: 4.7, reviews: 189, popular: false,
        image: "https://shorturl.at/LdEgA",
        coordinates: { lat: 23.0421, lng: 72.5617 },
    },
    {
        name: "IndiraNagar - Aspire Coworks",
        address: "17, 7th Main Rd, Indiranagar, Bengaluru, Karnataka 560038, India",
        city: "Bangalore", area: "Indiranagar",
        gstPrice: 833, mailingPrice: 667, brPrice: 1000,
        rating: 4.8, reviews: 267, popular: true,
        image: "https://shorturl.at/LdEgA",
        coordinates: { lat: 12.9784, lng: 77.6408 },
    },
    {
        name: "Koramangala - Aspire Coworks",
        address: "2nd & 3rd Floor, Balaji Arcade, Koramangala, Bengaluru, Karnataka 560095, India",
        city: "Bangalore", area: "Koramangala",
        gstPrice: 1000, mailingPrice: 667, brPrice: 1175,
        rating: 4.6, reviews: 189, popular: false,
        image: "https://shorturl.at/Fyr6o",
        coordinates: { lat: 12.9352, lng: 77.6245 },
    },
    {
        name: "EcoSpace - Hebbal, HMT Layout",
        address: "No 33, 4th Floor, 1st Main, HMT Layout, Bengaluru, Karnataka 560032, India",
        city: "Bangalore", area: "HMT Layout",
        gstPrice: 833, mailingPrice: 667, brPrice: 1000,
        rating: 4.5, reviews: 134, popular: false,
        image: "https://shorturl.at/S4XWY",
        coordinates: { lat: 13.0358, lng: 77.5897 },
    },
    {
        name: "WBB Office",
        address: "35, Anna Salai, near Little Mount, Nandanam, Chennai, Tamil Nadu 600015, India",
        city: "Chennai", area: "Nandanam",
        gstPrice: 1000, mailingPrice: 667, brPrice: 1175,
        rating: 4.7, reviews: 198, popular: true,
        image: "https://shorturl.at/NUpzM",
        coordinates: { lat: 13.0279, lng: 80.2286 },
    },
    {
        name: "Senate Space",
        address: "W-126, 3rd Floor, 3rd Ave, Anna Nagar, Chennai, Tamil Nadu 600040, India",
        city: "Chennai", area: "Anna Nagar",
        gstPrice: 917, mailingPrice: 733, brPrice: 1083,
        rating: 4.4, reviews: 112, popular: false,
        image: "https://shorturl.at/LdEgA",
        coordinates: { lat: 13.0850, lng: 80.2101 },
    },
    {
        name: "Stirring Minds",
        address: "Kundan Mansion, 2-A/3, Asaf Ali Rd, Chandni Chowk, New Delhi, Delhi 110002, India",
        city: "Delhi", area: "Chandni Chowk",
        gstPrice: 800, mailingPrice: 640, brPrice: 942,
        rating: 4.8, reviews: 245, popular: true,
        image: "https://res.cloudinary.com/drd4942mc/image/upload/v1767849333/chrome_Z3AywYVrjz_wb1idq.png",
        coordinates: { lat: 28.6434, lng: 77.2313 },
    },
    {
        name: "CP Alt F",
        address: "Connaught Lane, Barakhamba, New Delhi, Delhi 110001, India",
        city: "Delhi", area: "Connaught Place",
        gstPrice: 2667, mailingPrice: 1500, brPrice: 3133,
        rating: 4.7, reviews: 189, popular: false,
        image: "https://res.cloudinary.com/drd4942mc/image/upload/v1767696830/chrome_tF4p9FCNvN_e0w4dd.png",
        coordinates: { lat: 28.6328, lng: 77.2197 },
    },
    {
        name: "Virtualexcel",
        address: "Saket Salcon Rasvilas, next to Select Citywalk Mall, Saket, New Delhi, Delhi 110017, India",
        city: "Delhi", area: "Saket",
        gstPrice: 1000, mailingPrice: 833, brPrice: 1175,
        rating: 4.6, reviews: 156, popular: false,
        image: "https://res.cloudinary.com/drd4942mc/image/upload/v1767849535/chrome_v2poSAMRhE_iwknqu.png",
        coordinates: { lat: 28.5245, lng: 77.2066 },
    },
    {
        name: "Mytime Cowork",
        address: "55 Lane-2, Westend Marg, Saket, New Delhi, Delhi 110030, India",
        city: "Delhi", area: "Saket",
        gstPrice: 1000, mailingPrice: 833, brPrice: 1175,
        rating: 4.9, reviews: 198, popular: true,
        image: "https://res.cloudinary.com/drd4942mc/image/upload/v1767848454/chrome_mw5gzNjq6G_vqyjti.png",
        coordinates: { lat: 28.5270, lng: 77.1945 },
    },
    {
        name: "Okhla Alt F",
        address: "101, NH-19, CRRI, Ishwar Nagar, Okhla, New Delhi, Delhi 110044, India",
        city: "Delhi", area: "Okhla",
        gstPrice: 2500, mailingPrice: 1250, brPrice: 2942,
        rating: 4.5, reviews: 134, popular: false,
        image: "https://res.cloudinary.com/drd4942mc/image/upload/v1767697088/chrome_nweqds48I9_i7xwhi.png",
        coordinates: { lat: 28.5609, lng: 77.2730 },
    },
    {
        name: "WBB Office - Laxmi Nagar",
        address: "Office no. 102, 52A first floor, Vijay Block, Laxmi Nagar, Delhi 110092, India",
        city: "Delhi", area: "Laxmi Nagar",
        gstPrice: 1167, mailingPrice: 750, brPrice: 1375,
        rating: 4.3, reviews: 89, popular: false,
        image: "https://res.cloudinary.com/drd4942mc/image/upload/v1767697269/chrome_e1S9bRUX5L_t3ltud.png",
        coordinates: { lat: 28.6325, lng: 77.2773 },
    },
    {
        name: "Budha Coworking Spaces",
        address: "3rd floor, H.no 33, Pocket 5, Sector-24, Rohini, Delhi 110085, India",
        city: "Delhi", area: "Rohini",
        gstPrice: 917, mailingPrice: 733, brPrice: 1083,
        rating: 4.4, reviews: 112, popular: false,
        image: "https://images.unsplash.com/photo-1604328698692-f76ea9498e76?q=80&w=1170&auto=format&fit=crop",
        coordinates: { lat: 28.7210, lng: 77.1099 },
    },
    {
        name: "Work & Beyond",
        address: "Kocchar Plaza near Ramphal Chowk Dwarka Sector 7, Block E, Palam, Delhi 110077, India",
        city: "Delhi", area: "Dwarka",
        gstPrice: 1000, mailingPrice: 800, brPrice: 1175,
        rating: 4.5, reviews: 145, popular: false,
        image: "https://res.cloudinary.com/drd4942mc/image/upload/v1767849615/chrome_8vkBaQth6g_idknvj.png",
        coordinates: { lat: 28.5918, lng: 77.0453 },
    },
    {
        name: "Getset Spaces",
        address: "3rd Floor, LMR House, S-16, Block C, Green Park Extension, New Delhi, Delhi 110016, India",
        city: "Delhi", area: "Green Park",
        gstPrice: 1083, mailingPrice: 867, brPrice: 1275,
        rating: 4.6, reviews: 167, popular: true,
        image: "https://res.cloudinary.com/drd4942mc/image/upload/v1767849459/chrome_Bn0q3U4F3v_wx4jpa.png",
        coordinates: { lat: 28.5596, lng: 77.2067 },
    },
    {
        name: "Infrapro - Sector 44",
        address: "Plot no 4, 2nd floor, Minarch Tower, Sector 44, Gurugram, Haryana 122003, India",
        city: "Gurgaon", area: "Sector 44",
        gstPrice: 1000, mailingPrice: 667, brPrice: 1175,
        rating: 4.7, reviews: 178, popular: true,
        image: "https://shorturl.at/Fyr6o",
        coordinates: { lat: 28.4421, lng: 77.0534 },
    },
    {
        name: "Palm Court - Gurgaon",
        address: "Mehrauli Rd, Gurugram, Haryana 122022, India",
        city: "Gurgaon", area: "Mehrauli Road",
        gstPrice: 1000, mailingPrice: 750, brPrice: 1175,
        rating: 4.4, reviews: 134, popular: false,
        image: "https://shorturl.at/Fyr6o",
        coordinates: { lat: 28.4727, lng: 77.0327 },
    },
    {
        name: "Ghoomakkad",
        address: "V.P.o, Sidhbari, Rakkar, Himachal Pradesh 176057, India",
        city: "Dharamshala", area: "Sidhbari",
        gstPrice: 667, mailingPrice: 533, brPrice: 783,
        rating: 4.6, reviews: 156, popular: false,
        image: "https://shorturl.at/LdEgA",
        coordinates: { lat: 32.2220, lng: 76.3380 },
    },
    {
        name: "Cabins 24/7",
        address: "5/86, Golden Tulip Estate, JV Hills, HITEC City, Kondapur, Telangana 500081, India",
        city: "Hyderabad", area: "Kondapur",
        gstPrice: 1000, mailingPrice: 667, brPrice: 1175,
        rating: 4.3, reviews: 98, popular: false,
        image: "https://shorturl.at/S4XWY",
        coordinates: { lat: 17.4600, lng: 78.3615 },
    },
    {
        name: "CS Coworking",
        address: "3rd Floor, KNR Square, opp. The Platina, Gachibowli, Hyderabad, Telangana 500032, India",
        city: "Hyderabad", area: "Gachibowli",
        gstPrice: 917, mailingPrice: 733, brPrice: 1083,
        rating: 4.5, reviews: 123, popular: true,
        image: "https://shorturl.at/NUpzM",
        coordinates: { lat: 17.4400, lng: 78.3489 },
    },
    {
        name: "Jeev Business Solutions",
        address: "548 1, Tonk Rd, behind Jaipur Hospital, Gopal Pura Mode, Jaipur, Rajasthan 302018, India",
        city: "Jaipur", area: "Tonk Road",
        gstPrice: 833, mailingPrice: 667, brPrice: 1000,
        rating: 4.4, reviews: 145, popular: false,
        image: "https://shorturl.at/Fyr6o",
        coordinates: { lat: 26.8467, lng: 75.8000 },
    },
    {
        name: "Qubicle Coworking",
        address: "Trikuta Nagar Ext 1/A, Jammu",
        city: "Jammu", area: "Trikuta Nagar",
        gstPrice: 1000, mailingPrice: 667, brPrice: 1175,
        rating: 4.5, reviews: 89, popular: false,
        image: "https://shorturl.at/S4XWY",
        coordinates: { lat: 32.7266, lng: 74.8570 },
    },
    {
        name: "Kaytech Solutions",
        address: "Civil Airport, Satwari, Jammu, Jammu and Kashmir 180003",
        city: "Jammu", area: "Satwari",
        gstPrice: 1500, mailingPrice: 667, brPrice: 1767,
        rating: 4.6, reviews: 112, popular: true,
        image: "https://shorturl.at/NUpzM",
        coordinates: { lat: 32.6897, lng: 74.8373 },
    },
];

// ─── SEED ─────────────────────────────────────────────────────────
async function seedLocations() {
    try {
        console.log("📦 Connecting to database...");
        await dbConnection();
        console.log("✅ Connected!\n");

        // Find or create a shared partner account for seeded locations
        let partner = await UserModel.findOne({ email: "locations@flashspace.co" });
        if (!partner) {
            const bcrypt = await import("bcryptjs");
            const hash = await bcrypt.hash("Locations@123", 10);
            partner = await UserModel.create({
                fullName: "FlashSpace Locations",
                email: "locations@flashspace.co",
                password: hash,
                role: "partner",
                isEmailVerified: true,
                provider: "local",
            });
            console.log("👤 Created partner account: locations@flashspace.co");
        } else {
            console.log("👤 Using existing partner account: locations@flashspace.co");
        }

        // ── Coworking Spaces ──────────────────────────────────────────
        console.log(`\n💼 Seeding ${coworkingSpaces.length} coworking spaces...`);
        let cwInserted = 0;

        for (const space of coworkingSpaces) {
            // Skip if already exists (idempotent)
            const exists = await PropertyModel.findOne({ name: space.name, city: space.city });
            if (exists) {
                console.log(`   ⏭  Skipping (already exists): ${space.name}`);
                continue;
            }

            const property = await PropertyModel.create({
                name: space.name,
                partner: partner._id,
                address: space.address,
                city: space.city,
                area: space.area,
                location: {
                    type: "Point",
                    coordinates: [space.coordinates.lng, space.coordinates.lat],
                },
                amenities: space.features,
                images: [space.image],
                status: "active",
                isActive: true, // [FIXED] Ensure properties appear in dynamic search
            });

            await CoworkingSpaceModel.create({
                partner: partner._id,
                property: property._id,
                capacity: 50,
                partnerPricePerMonth: space.price,
                adminMarkupPerMonth: 0,
                finalPricePerMonth: space.price,
                isActive: true,
                avgRating: space.rating,
                totalReviews: space.reviews,
                operatingHours: {
                    openTime: "09:00",
                    closeTime: "18:00",
                    daysOpen: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
                },
                // Store coordinates directly on the space for quick lookup
                coordinates: space.coordinates,
            });

            console.log(`   ✅ ${space.name} (${space.city})`);
            cwInserted++;
        }

        // ── Virtual Offices ───────────────────────────────────────────
        console.log(`\n🏢 Seeding ${virtualOffices.length} virtual offices...`);
        let voInserted = 0;

        for (const vo of virtualOffices) {
            // Check if a virtual office property by the same name already exists
            const exists = await PropertyModel.findOne({
                name: { $regex: new RegExp(`^${vo.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
                city: vo.city,
            });
            if (exists) {
                // Check if it already has a virtual office child
                const voExists = await VirtualOfficeModel.findOne({ property: exists._id });
                if (voExists) {
                    console.log(`   ⏭  Skipping (already exists): ${vo.name}`);
                    continue;
                }
            }

            const property = exists ?? await PropertyModel.create({
                name: vo.name,
                partner: partner._id,
                address: vo.address,
                city: vo.city,
                area: vo.area,
                location: {
                    type: "Point",
                    coordinates: [vo.coordinates.lng, vo.coordinates.lat],
                },
                amenities: ["Business Address", "Mail Handling", "GST Registration Support"],
                images: [vo.image],
                status: "active",
                isActive: true, // [FIXED] Ensure properties appear in dynamic search
            });

            await VirtualOfficeModel.create({
                partner: partner._id,
                property: property._id,
                isActive: true,
                partnerGstPricePerYear: vo.gstPrice,
                adminMarkupGstPerYear: 0,
                finalGstPricePerYear: vo.gstPrice,
                partnerMailingPricePerYear: vo.mailingPrice,
                adminMarkupMailingPerYear: 0,
                finalMailingPricePerYear: vo.mailingPrice,
                partnerBrPricePerYear: vo.brPrice,
                adminMarkupBrPerYear: 0,
                finalBrPricePerYear: vo.brPrice,
                avgRating: vo.rating,
                totalReviews: vo.reviews,
                // Store coordinates for quick lookup
                coordinates: vo.coordinates,
            });

            console.log(`   ✅ ${vo.name} (${vo.city})`);
            voInserted++;
        }

        console.log(`\n${"=".repeat(50)}`);
        console.log(`🎉 SEED COMPLETE`);
        console.log(`   Coworking spaces inserted : ${cwInserted}`);
        console.log(`   Virtual offices inserted  : ${voInserted}`);
        console.log(`${"=".repeat(50)}\n`);

        // [NEW] One-time update to fix any existing seeded data that missed the isActive flag
        await PropertyModel.updateMany(
            { status: "active", isActive: { $ne: true } },
            { $set: { isActive: true } }
        );
        console.log("✅ Verified all active properties are correctly flagged for search.");

        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error("❌ Seed failed:", err);
        process.exit(1);
    }
}

seedLocations();
