// ============ SET ENVIRONMENT VARIABLES ============
// Add this at the VERY TOP, before any imports
process.env.JWT_ACCESS_SECRET =
  "flashspace-access-secret-key-2024-change-in-production";
process.env.JWT_REFRESH_SECRET =
  "flashspace-refresh-secret-key-2024-change-in-production";
process.env.JWT_ACCESS_EXPIRY = "15m";
process.env.JWT_REFRESH_EXPIRY = "7d";
process.env.NODE_ENV = "development";

// Add these if your application needs them
process.env.DB_URI = process.env.DB_URI || "mongodb://localhost:27017/myapp";
process.env.PORT = process.env.PORT || "5000";

console.log("Starting seed script...");
import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { CoworkingSpaceModel } from "../flashspaceWeb/coworkingSpaceModule/coworkingSpace.model";
import { VirtualOfficeModel } from "../flashspaceWeb/virtualOfficeModule/virtualOffice.model";
import { BookingModel } from "../flashspaceWeb/bookingModule/booking.model";
import {
  UserModel,
  UserRole,
} from "../flashspaceWeb/authModule/models/user.model";
import {
  PropertyModel,
  PropertyStatus,
  KYCStatus,
} from "../flashspaceWeb/propertyModule/property.model";

dotenv.config();

// ============ TEST USERS DATA ============
const testUsers = [
  {
    email: "test@example.com",
    fullName: "Test User",
    password: "Test@123",
    phoneNumber: "+91-9876543210",
    authProvider: "local",
    role: "user",
    isEmailVerified: true,
    kycVerified: false,
    emailVerificationOTP: "123456",
    emailVerificationOTPExpiry: new Date(
      Date.now() + 10 * 365 * 24 * 60 * 60 * 1000,
    ),
    emailVerificationOTPAttempts: 0,
    lastOTPRequestTime: new Date(),
    otpRequestCount: 1,
    isActive: true,
    credits: 0,
    isDeleted: false,
    refreshTokens: [],
    isTwoFactorEnabled: false,
  },
  {
    email: "admin@flashspace.co",
    fullName: "Admin User",
    password: "Admin@123",
    phoneNumber: "+91-9876543211",
    authProvider: "local",
    role: UserRole.ADMIN,
    isEmailVerified: true,
    kycVerified: true,
    emailVerificationOTP: "123456",
    emailVerificationOTPExpiry: new Date(
      Date.now() + 10 * 365 * 24 * 60 * 60 * 1000,
    ),
    emailVerificationOTPAttempts: 0,
    lastOTPRequestTime: new Date(),
    otpRequestCount: 1,
    isActive: true,
    credits: 100,
    isDeleted: false,
    refreshTokens: [],
    isTwoFactorEnabled: false,
  },
  {
    email: "partner@example.com",
    fullName: "Partner User",
    password: "Partner@123",
    phoneNumber: "+91-9876543212",
    authProvider: "local",
    role: UserRole.PARTNER,
    isEmailVerified: true,
    kycVerified: true,
    emailVerificationOTP: "123456",
    emailVerificationOTPExpiry: new Date(
      Date.now() + 10 * 365 * 24 * 60 * 60 * 1000,
    ),
    emailVerificationOTPAttempts: 0,
    lastOTPRequestTime: new Date(),
    otpRequestCount: 1,
    isActive: true,
    credits: 0,
    isDeleted: false,
    refreshTokens: [],
    isTwoFactorEnabled: false,
  },
];

// ============ COWORKING SPACES DATA ============
const coworkingSpaces = [
  {
    name: "Workzone - Ahmedabad",
    address: "World Trade Tower, Makarba, Ahmedabad, Gujarat 380051, India",
    city: "Ahmedabad",
    price: "₹1,083/month",
    originalPrice: "₹1,333",
    rating: 4.8,
    reviews: 245,
    type: "Hot Desk",
    features: ["High-Speed WiFi", "Meeting Rooms", "Coffee Bar", "24/7 Access"],
    area: "Makarba",
    availability: "Available Now",
    popular: true,
    image: "https://shorturl.at/Fyr6o",
  },
  {
    name: "Sweet Spot Spaces",
    address:
      "Office No 4-D fourth, Vardaan Complex, Tower, Lakhudi Rd, near SARDAR PATEL STADIUM, Vithalbhai Patel Colony, Nathalal Colony, Navrangpura, Ahmedabad, Gujarat 380009, India",
    city: "Ahmedabad",
    price: "₹1,167/month",
    originalPrice: "₹1,417",
    rating: 4.7,
    reviews: 189,
    type: "Dedicated Desk",
    features: ["Premium Location", "Parking", "Event Space", "Cafeteria"],
    area: "Navrangpura",
    availability: "Available Now",
    popular: false,
    image: "https://shorturl.at/LdEgA",
  },
  {
    name: "IndiraNagar - Aspire Coworks",
    address:
      "17, 7th Main Rd, Indira Nagar II Stage, Hoysala Nagar, Indiranagar, Bengaluru, Karnataka 560038, India",
    city: "Bangalore",
    price: "₹833/month",
    originalPrice: "₹1,083",
    rating: 4.8,
    reviews: 267,
    type: "Hot Desk",
    features: [
      "Tech Hub",
      "Innovation Labs",
      "Startup Ecosystem",
      "Outdoor Terrace",
    ],
    area: "Indiranagar",
    availability: "Available Now",
    popular: true,
    image: "https://shorturl.at/LdEgA",
  },
  {
    name: "Koramangala - Aspire Coworks",
    address:
      "2nd & 3rd Floor, Balaji Arcade, 472/7, 20th L Cross Rd, 4th Block, Koramangala, Bengaluru, Karnataka 560095, India",
    city: "Bangalore",
    price: "₹1,000/month",
    originalPrice: "₹1,250",
    rating: 4.6,
    reviews: 189,
    type: "Dedicated Desk",
    features: [
      "IT Corridor",
      "Shuttle Service",
      "Gaming Area",
      "Wellness Programs",
    ],
    area: "Koramangala",
    availability: "Available Now",
    popular: false,
    image: "https://shorturl.at/Fyr6o",
  },
  {
    name: "EcoSpace - Hebbal, HMT Layout",
    address:
      "No,33, 4th Floor, 1st Main, CBI Main Rd, HMT Layout, Ganganagar, Bengaluru, Karnataka 560032, India",
    city: "Bangalore",
    price: "₹833/month",
    originalPrice: "₹1,083",
    rating: 4.5,
    reviews: 134,
    type: "Hot Desk",
    features: [
      "Residential Area",
      "Quiet Environment",
      "Flexible Hours",
      "Community Kitchen",
    ],
    area: "HMT Layout",
    availability: "Available Now",
    popular: false,
    image: "https://shorturl.at/S4XWY",
  },
  {
    name: "WBB Office",
    address:
      "Room no 1 No. 19, Metro Station, 35, Anna Salai, near Little Mount, Little Mount, Nandanam, Chennai, Tamil Nadu 600015, India",
    city: "Chennai",
    price: "₹4,800/month",
    originalPrice: "₹6,000",
    rating: 4.7,
    reviews: 198,
    type: "Hot Desk",
    features: [
      "Metro Connectivity",
      "Modern Facilities",
      "Parking",
      "Food Court",
    ],
    area: "Nandanam",
    availability: "Available Now",
    popular: true,
    image: "https://shorturl.at/NUpzM",
  },
  {
    name: "Senate Space",
    address:
      "W-126, 3rd Floor, 3rd Ave, Anna Nagar, Chennai, Tamil Nadu 600040, India",
    city: "Chennai",
    price: "₹917/month",
    originalPrice: "₹1,167",
    rating: 4.4,
    reviews: 112,
    type: "Dedicated Desk",
    features: [
      "Residential Area",
      "Peaceful Environment",
      "Basic Amenities",
      "WiFi",
    ],
    area: "Anna Nagar",
    availability: "Available Now",
    popular: false,
    image: "https://shorturl.at/LdEgA",
  },
  {
    name: "Stirring Minds",
    address:
      "Kundan Mansion, 2-A/3, Asaf Ali Rd, Turkman Gate, Chandni Chowk, New Delhi, Delhi, 110002, India",
    city: "Delhi",
    price: "₹800/month",
    originalPrice: "₹1,000",
    rating: 4.8,
    reviews: 245,
    type: "Hot Desk",
    features: ["High-Speed WiFi", "Meeting Rooms", "Coffee Bar", "24/7 Access"],
    area: "Chandni Chowk",
    availability: "Available Now",
    popular: true,
    image:
      "https://res.cloudinary.com/drd4942mc/image/upload/v1767696478/chrome_y4ymlwh9SR_apwgug.png",
    lat: 28.6506,
    lng: 77.2300,
  },
  {
    name: "CP Alt F",
    address:
      "J6JF+53C, Connaught Lane, Barakhamba, New Delhi, Delhi 110001, India",
    city: "Delhi",
    price: "₹2,667/month",
    originalPrice: "₹3,333",
    rating: 4.7,
    reviews: 189,
    type: "Dedicated Desk",
    features: ["Private Cabin Option", "Parking", "Event Space", "Cafeteria"],
    area: "Connaught Place",
    availability: "Available Now",
    popular: false,
    image:
      "https://res.cloudinary.com/drd4942mc/image/upload/v1767696830/chrome_tF4p9FCNvN_e0w4dd.png",
  },
  {
    name: "Virtualexcel",
    address:
      "Lower Ground Floor, Saket Salcon, Rasvilas, next to Select Citywalk Mall, Saket District Centre, District Centre, Sector 6, Pushp Vihar, Mal, New Delhi, Delhi 110017, India",
    city: "Delhi",
    price: "₹1,000/month",
    originalPrice: "₹1,250",
    rating: 4.6,
    reviews: 156,
    type: "Hot Desk",
    features: [
      "Shopping Mall Access",
      "Premium Location",
      "Networking Events",
      "Printer Access",
    ],
    area: "Saket",
    availability: "Available Now",
    popular: false,
    image:
      "https://res.cloudinary.com/drd4942mc/image/upload/v1767696936/chrome_y6UfCoipUj_wkpxel.png",
    lat: 28.5244,
    lng: 77.2100,
  },
  {
    name: "Mytime Cowork",
    address:
      "55 Lane-2, Westend Marg, Saiyad Ul Ajaib Village, Saket, New Delhi, Delhi 110030, India",
    city: "Delhi",
    price: "₹6,500/month",
    originalPrice: "₹8,000",
    rating: 4.9,
    reviews: 198,
    type: "Private Office",
    features: [
      "Premium Location",
      "Executive Lounge",
      "Concierge",
      "Valet Parking",
    ],
    area: "Saket",
    availability: "Available Now",
    popular: true,
    image:
      "https://res.cloudinary.com/drd4942mc/image/upload/v1767696150/chrome_F5QP1MGRA2_whrsth.png",
    lat: 28.5200,
    lng: 77.2000,
  },
  {
    name: "Okhla Alt F",
    address:
      "101, NH-19, CRRI, Ishwar Nagar, Okhla, New Delhi, Delhi 110044, India",
    city: "Delhi",
    price: "₹2,500/month",
    originalPrice: "₹3,167",
    rating: 4.5,
    reviews: 134,
    type: "Hot Desk",
    features: [
      "Industrial Area",
      "Flexible Hours",
      "Gaming Zone",
      "Wellness Room",
    ],
    area: "Okhla",
    availability: "Available Now",
    popular: false,
    image:
      "https://res.cloudinary.com/drd4942mc/image/upload/v1767697088/chrome_nweqds48I9_i7xwhi.png",
  },
  {
    name: "WBB Office",
    address:
      "Office no. 102, 52A first floor, Vijay Block, Block E, Laxmi Nagar, Delhi, 110092, India",
    city: "Delhi",
    price: "₹4,800/month",
    originalPrice: "₹6,000",
    rating: 4.3,
    reviews: 89,
    type: "Shared Desk",
    features: ["Budget Friendly", "Basic Amenities", "WiFi", "Print Access"],
    area: "Laxmi Nagar",
    availability: "Available Now",
    popular: false,
    image:
      "https://res.cloudinary.com/drd4942mc/image/upload/v1767697269/chrome_e1S9bRUX5L_t3ltud.png",
    lat: 28.6305,
    lng: 77.2778,
  },
  {
    name: "Budha Coworking Spaces",
    address:
      "3rd floor, H.no 33, Pocket 5, Sector-24, Rohini, Delhi, 110085, India",
    city: "Delhi",
    price: "₹4,200/month",
    originalPrice: "₹5,500",
    rating: 4.4,
    reviews: 112,
    type: "Hot Desk",
    features: [
      "Suburban Location",
      "Parking Available",
      "Community Events",
      "Cafeteria",
    ],
    area: "Rohini",
    availability: "Available Now",
    popular: false,
    image:
      "https://images.unsplash.com/photo-1604328698692-f76ea9498e76?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    name: "Work & Beyond",
    address:
      "E-518 first floor Kocchar plaza near Ramphal Chowk dwark sector 7, Block E, Palam Extension, Palam, Delhi, 110077, India",
    city: "Delhi",
    price: "₹5,500/month",
    originalPrice: "₹7,000",
    rating: 4.5,
    reviews: 145,
    type: "Dedicated Desk",
    features: [
      "Airport Proximity",
      "Modern Amenities",
      "Meeting Rooms",
      "Parking",
    ],
    area: "Dwarka",
    availability: "Available Now",
    popular: false,
    image:
      "https://res.cloudinary.com/drd4942mc/image/upload/v1767697175/chrome_4eVI3pxb5I_qpev0q.png",
    lat: 28.5823,
    lng: 77.0500,
  },
  {
    name: "Getset Spaces",
    address:
      "3rd Floor, LMR House, S-16, Block C, Green Park Extension, Green Park, New Delhi, Delhi 110016, India",
    city: "Delhi",
    price: "₹5,000/month",
    originalPrice: "₹6,500",
    rating: 4.6,
    reviews: 167,
    type: "Private Office",
    features: ["South Delhi", "Premium Facilities", "Networking", "Cafeteria"],
    area: "Green Park",
    availability: "Available Now",
    popular: true,
    image:
      "https://res.cloudinary.com/drd4942mc/image/upload/v1767696619/chrome_Usn5xZsDny_b59bwf.png",
    lat: 28.5588,
    lng: 77.2028,
  },
  {
    name: "Infrapro - Sector 44",
    address:
      "Plot no 4, 2nd floor, Minarch Tower, Sector 44, Gurugram, Haryana 122003, India",
    city: "Gurgaon",
    price: "₹1,000/month",
    originalPrice: "₹1,250",
    rating: 4.7,
    reviews: 178,
    type: "Dedicated Desk",
    features: [
      "Corporate Hub",
      "Modern Facilities",
      "Ample Parking",
      "Food Court",
    ],
    area: "Sector 44",
    availability: "Available Now",
    popular: true,
    image: "https://shorturl.at/Fyr6o",
  },
  {
    name: "Palm Court - Gurgaon",
    address: "Mehrauli Rd, Gurugram, Haryana 122022, India",
    city: "Gurgaon",
    price: "₹1,000/month",
    originalPrice: "₹1,250",
    rating: 4.4,
    reviews: 134,
    type: "Hot Desk",
    features: [
      "Premium Location",
      "Creative Spaces",
      "Event Hosting",
      "Bike Parking",
    ],
    area: "Mehrauli Road",
    availability: "Available Now",
    popular: false,
    image: "https://shorturl.at/Fyr6o",
  },
  {
    name: "Ghoomakkad",
    address: "V.P.o, Sidhbari, Rakkar, Himachal Pradesh 176057, India",
    city: "Dharamshala",
    price: "₹667/month",
    originalPrice: "₹833",
    rating: 4.6,
    reviews: 156,
    type: "Dedicated Desk",
    features: [
      "Mountain View",
      "Peaceful Environment",
      "Nature Workspace",
      "Wellness Programs",
    ],
    area: "Sidhbari",
    availability: "Available Now",
    popular: false,
    image: "https://shorturl.at/LdEgA",
  },
  {
    name: "Cabins 24/7",
    address:
      "h, 5/86, Golden Tulip Estate, JV Hills, HITEC City, Kondapur, Telangana 500081, India",
    city: "Hyderabad",
    price: "₹1,000/month",
    originalPrice: "₹1,083",
    rating: 4.3,
    reviews: 98,
    type: "Hot Desk",
    features: ["IT Hub", "Flexible Plans", "Community Events", "Gaming Area"],
    area: "Kondapur",
    availability: "Available Now",
    popular: false,
    image: "https://shorturl.at/S4XWY",
  },
  {
    name: "CS Coworking",
    address:
      "Door No. 1-60, A & B, 3rd Floor, KNR Square, opp. The Platina, Gachibowli, Hyderabad, Telangana 500032, India",
    city: "Hyderabad",
    price: "₹917/month",
    originalPrice: "₹1,167",
    rating: 4.5,
    reviews: 123,
    type: "Dedicated Desk",
    features: ["Tech Park", "Modern Infrastructure", "Parking", "Cafeteria"],
    area: "Gachibowli",
    availability: "Available Now",
    popular: true,
    image: "https://shorturl.at/NUpzM",
  },
  {
    name: "Jeev Business Solutions",
    address:
      "548 1, Tonk Rd, behind Jaipur Hospital, Mahaveer Nagar, Gopal Pura Mode, Jaipur, Rajasthan 302018, India",
    city: "Jaipur",
    price: "₹833/month",
    originalPrice: "₹1,000",
    rating: 4.4,
    reviews: 145,
    type: "Hot Desk",
    features: ["Central Location", "Budget Friendly", "WiFi", "Meeting Rooms"],
    area: "Tonk Road",
    availability: "Available Now",
    popular: false,
    image: "https://shorturl.at/Fyr6o",
  },
  {
    name: "Qubicle Coworking",
    address: "Trikuta Nagar Ext 1/A",
    city: "Jammu",
    price: "₹1,000/month",
    originalPrice: "₹1,250",
    rating: 4.5,
    reviews: 89,
    type: "Hot Desk",
    features: [
      "Residential Area",
      "Quiet Environment",
      "Basic Amenities",
      "WiFi",
    ],
    area: "Trikuta Nagar",
    availability: "Available Now",
    popular: false,
    image: "https://shorturl.at/S4XWY",
  },
  {
    name: "Kaytech Solutions",
    address:
      "Civil Airport, Satwari, Raipur Satwari, Jammu, Jammu and Kashmir 180003",
    city: "Jammu",
    price: "₹1,500/month",
    originalPrice: "₹1,833",
    rating: 4.6,
    reviews: 112,
    type: "Private Office",
    features: [
      "Airport Proximity",
      "Premium Amenities",
      "Parking",
      "Meeting Rooms",
    ],
    area: "Satwari",
    availability: "Available Now",
    popular: true,
    image: "https://shorturl.at/NUpzM",
  },
];

// ============ VIRTUAL OFFICES DATA ============
const virtualOffices = [
  {
    name: "Workzone - Ahmedabad",
    address: "World Trade Tower, Makarba, Ahmedabad, Gujarat 380051, India",
    city: "Ahmedabad",
    price: "₹1,083/month",
    originalPrice: "₹1,333",
    gstPlanPrice: "₹1,083/month",
    mailingPlanPrice: "₹667/month",
    brPlanPrice: "₹1,275/month",
    rating: 4.8,
    reviews: 245,
    type: "Hot Desk",
    features: ["High-Speed WiFi", "Meeting Rooms", "Coffee Bar", "24/7 Access"],
    area: "Makarba",
    availability: "Available Now",
    popular: true,
    image: "https://shorturl.at/Fyr6o",
  },
  {
    name: "Sweet Spot Spaces",
    address:
      "Office No 4-D fourth, Vardaan Complex, Tower, Lakhudi Rd, near SARDAR PATEL STADIUM, Vithalbhai Patel Colony, Nathalal Colony, Navrangpura, Ahmedabad, Gujarat 380009, India",
    city: "Ahmedabad",
    price: "₹1,167/month",
    originalPrice: "₹1,417",
    gstPlanPrice: "₹1,167/month",
    mailingPlanPrice: "₹833/month",
    brPlanPrice: "₹1,375/month",
    rating: 4.7,
    reviews: 189,
    type: "Dedicated Desk",
    features: ["Premium Location", "Parking", "Event Space", "Cafeteria"],
    area: "Navrangpura",
    availability: "Available Now",
    popular: false,
    image: "https://shorturl.at/LdEgA",
  },
  {
    name: "IndiraNagar - Aspire Coworks",
    address:
      "17, 7th Main Rd, Indira Nagar II Stage, Hoysala Nagar, Indiranagar, Bengaluru, Karnataka 560038, India",
    city: "Bangalore",
    price: "₹833/month",
    originalPrice: "₹1,083",
    gstPlanPrice: "₹833/month",
    mailingPlanPrice: "₹667/month",
    brPlanPrice: "₹1,000/month",
    rating: 4.8,
    reviews: 267,
    type: "Hot Desk",
    features: [
      "Tech Hub",
      "Innovation Labs",
      "Startup Ecosystem",
      "Outdoor Terrace",
    ],
    area: "Indiranagar",
    availability: "Available Now",
    popular: true,
    image: "https://shorturl.at/LdEgA",
  },
  {
    name: "Koramangala - Aspire Coworks",
    address:
      "2nd & 3rd Floor, Balaji Arcade, 472/7, 20th L Cross Rd, 4th Block, Koramangala, Bengaluru, Karnataka 560095, India",
    city: "Bangalore",
    price: "₹1,000/month",
    originalPrice: "₹1,250",
    gstPlanPrice: "₹1,000/month",
    mailingPlanPrice: "₹667/month",
    brPlanPrice: "₹1,175/month",
    rating: 4.6,
    reviews: 189,
    type: "Dedicated Desk",
    features: [
      "IT Corridor",
      "Shuttle Service",
      "Gaming Area",
      "Wellness Programs",
    ],
    area: "Koramangala",
    availability: "Available Now",  
    popular: false,
    image: "https://shorturl.at/Fyr6o",
  },
  {
    name: "EcoSpace - Hebbal, HMT Layout",
    address:
      "No,33, 4th Floor, 1st Main, CBI Main Rd, HMT Layout, Ganganagar, Bengaluru, Karnataka 560032, India",
    city: "Bangalore",
    price: "₹833/month",
    originalPrice: "₹1,083",
    gstPlanPrice: "₹833/month",
    mailingPlanPrice: "₹667/month",
    brPlanPrice: "₹1,000/month",
    rating: 4.5,
    reviews: 134,
    type: "Hot Desk",
    features: [
      "Residential Area",
      "Quiet Environment",
      "Flexible Hours",
      "Community Kitchen",
    ],
    area: "HMT Layout",
    availability: "Available Now",
    popular: false,
    image: "https://shorturl.at/S4XWY",
  },
  {
    name: "WBB Office",
    address:
      "Room no 1 No. 19, Metro Station, 35, Anna Salai, near Little Mount, Little Mount, Nandanam, Chennai, Tamil Nadu 600015, India",
    city: "Chennai",
    price: "₹1,000/month",
    originalPrice: "₹1,250",
    gstPlanPrice: "₹1,000/month",
    mailingPlanPrice: "₹667/month",
    brPlanPrice: "₹1,175/month",
    rating: 4.7,
    reviews: 198,
    type: "Hot Desk",
    features: [
      "Metro Connectivity",
      "Modern Facilities",
      "Parking",
      "Food Court",
    ],
    area: "Nandanam",
    availability: "Available Now",
    popular: true,
    image: "https://shorturl.at/NUpzM",
  },
  {
    name: "Senate Space",
    address:
      "W-126, 3rd Floor, 3rd Ave, Anna Nagar, Chennai, Tamil Nadu 600040, India",
    city: "Chennai",
    price: "₹917/month",
    originalPrice: "₹1,167",
    gstPlanPrice: "₹917/month",
    mailingPlanPrice: "₹733/month",
    brPlanPrice: "₹1,083/month",
    rating: 4.4,
    reviews: 112,
    type: "Dedicated Desk",
    features: [
      "Residential Area",
      "Peaceful Environment",
      "Basic Amenities",
      "WiFi",
    ],
    area: "Anna Nagar",
    availability: "Available Now",
    popular: false,
    image: "https://shorturl.at/LdEgA",
  },
  {
    name: "Stirring Minds",
    address:
      "Kundan Mansion, 2-A/3, Asaf Ali Rd, Turkman Gate, Chandni Chowk, New Delhi, Delhi, 110002, India",
    city: "Delhi",
    price: "₹800/month",
    originalPrice: "₹1,000",
    gstPlanPrice: "₹800/month",
    mailingPlanPrice: "₹640/month",
    brPlanPrice: "₹942/month",
    rating: 4.8,
    reviews: 245,
    type: "Hot Desk",
    features: ["High-Speed WiFi", "Meeting Rooms", "Coffee Bar", "24/7 Access"],
    area: "Chandni Chowk",
    availability: "Available Now",
    popular: true,
    image:
      "https://res.cloudinary.com/drd4942mc/image/upload/v1767849333/chrome_Z3AywYVrjz_wb1idq.png",
  },
  {
    name: "CP Alt F",
    address:
      "J6JF+53C, Connaught Lane, Barakhamba, New Delhi, Delhi 110001, India",
    city: "Delhi",
    price: "₹2,667/month",
    originalPrice: "₹3,333",
    gstPlanPrice: "₹2,667/month",
    mailingPlanPrice: "₹1,500/month",
    brPlanPrice: "₹3,133/month",
    rating: 4.7,
    reviews: 189,
    type: "Dedicated Desk",
    features: ["Private Cabin Option", "Parking", "Event Space", "Cafeteria"],
    area: "Connaught Place",
    availability: "Available Now",
    popular: false,
    image:
      "https://res.cloudinary.com/drd4942mc/image/upload/v1767696830/chrome_tF4p9FCNvN_e0w4dd.png",
  },
  {
    name: "Virtualexcel",
    address:
      "Lower Ground Floor, Saket Salcon, Rasvilas, next to Select Citywalk Mall, Saket District Centre, District Centre, Sector 6, Pushp Vihar, Mal, New Delhi, Delhi 110017, India",
    city: "Delhi",
    price: "₹1,000/month",
    originalPrice: "₹1,250",
    gstPlanPrice: "₹1,000/month",
    mailingPlanPrice: "₹833/month",
    brPlanPrice: "₹1,175/month",
    rating: 4.6,
    reviews: 156,
    type: "Hot Desk",
    features: [
      "Shopping Mall Access",
      "Premium Location",
      "Networking Events",
      "Printer Access",
    ],
    area: "Saket",
    availability: "Available Now",
    popular: false,
    image:
      "https://res.cloudinary.com/drd4942mc/image/upload/v1767849535/chrome_v2poSAMRhE_iwknqu.png",
  },
  {
    name: "Mytime Cowork",
    address:
      "55 Lane-2, Westend Marg, Saiyad Ul Ajaib Village, Saket, New Delhi, Delhi 110030, India",
    city: "Delhi",
    price: "₹1,000/month",
    originalPrice: "₹1,250",
    gstPlanPrice: "₹1,000/month",
    mailingPlanPrice: "₹833/month",
    brPlanPrice: "₹1,175/month",
    rating: 4.9,
    reviews: 198,
    type: "Private Office",
    features: [
      "Premium Location",
      "Executive Lounge",
      "Concierge",
      "Valet Parking",
    ],
    area: "Saket",
    availability: "Available Now",
    popular: true,
    image:
      "https://res.cloudinary.com/drd4942mc/image/upload/v1767848454/chrome_mw5gzNjq6G_vqyjti.png",
  },
  {
    name: "Okhla Alt F",
    address:
      "101, NH-19, CRRI, Ishwar Nagar, Okhla, New Delhi, Delhi 110044, India",
    city: "Delhi",
    price: "₹2,500/month",
    originalPrice: "₹3,167",
    gstPlanPrice: "₹2,500/month",
    mailingPlanPrice: "₹1,250/month",
    brPlanPrice: "₹2,942/month",
    rating: 4.5,
    reviews: 134,
    type: "Hot Desk",
    features: [
      "Industrial Area",
      "Flexible Hours",
      "Gaming Zone",
      "Wellness Room",
    ],
    area: "Okhla",
    availability: "Available Now",
    popular: false,
    image:
      "https://res.cloudinary.com/drd4942mc/image/upload/v1767697088/chrome_nweqds48I9_i7xwhi.png",
  },
  {
    name: "WBB Office",
    address:
      "Office no. 102, 52A first floor, Vijay Block, Block E, Laxmi Nagar, Delhi, 110092, India",
    city: "Delhi",
    price: "₹1,167/month",
    originalPrice: "₹1,417",
    gstPlanPrice: "₹1,167/month",
    mailingPlanPrice: "₹750/month",
    brPlanPrice: "₹1,375/month",
    rating: 4.3,
    reviews: 89,
    type: "Shared Desk",
    features: ["Budget Friendly", "Basic Amenities", "WiFi", "Print Access"],
    area: "Laxmi Nagar",
    availability: "Available Now",
    popular: false,
    image:
      "https://res.cloudinary.com/drd4942mc/image/upload/v1767697269/chrome_e1S9bRUX5L_t3ltud.png ",
  },
  {
    name: "Budha Coworking Spaces",
    address:
      "3rd floor, H.no 33, Pocket 5, Sector-24, Rohini, Delhi, 110085, India",
    city: "Delhi",
    price: "₹917/month",
    originalPrice: "₹1,167",
    gstPlanPrice: "₹917/month",
    mailingPlanPrice: "₹733/month",
    brPlanPrice: "₹1,083/month",
    rating: 4.4,
    reviews: 112,
    type: "Hot Desk",
    features: [
      "Suburban Location",
      "Parking Available",
      "Community Events",
      "Cafeteria",
    ],
    area: "Rohini",
    availability: "Not Available",
    popular: false,
    image:
      "https://images.unsplash.com/photo-1604328698692-f76ea9498e76?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    name: "Work & Beyond",
    address:
      "E-518 first floor Kocchar plaza near Ramphal Chowk dwark sector 7, Block E, Palam Extension, Palam, Delhi, 110077, India",
    city: "Delhi",
    price: "₹1,000/month",
    originalPrice: "₹1,250",
    gstPlanPrice: "₹1,000/month",
    mailingPlanPrice: "₹800/month",
    brPlanPrice: "₹1,175/month",
    rating: 4.5,
    reviews: 145,
    type: "Dedicated Desk",
    features: [
      "Airport Proximity",
      "Modern Amenities",
      "Meeting Rooms",
      "Parking",
    ],
    area: "Dwarka",
    availability: "Available Now",
    popular: false,
    image:
      "https://res.cloudinary.com/drd4942mc/image/upload/v1767849615/chrome_8vkBaQth6g_idknvj.png",
  },
  {
    name: "Getset Spaces",
    address:
      "3rd Floor, LMR House, S-16, Block C, Green Park Extension, Green Park, New Delhi, Delhi 110016, India",
    city: "Delhi",
    price: "₹1,083/month",
    originalPrice: "₹1,333",
    gstPlanPrice: "₹1,083/month",
    mailingPlanPrice: "₹867/month",
    brPlanPrice: "₹1,275/month",
    rating: 4.6,
    reviews: 167,
    type: "Private Office",
    features: ["South Delhi", "Premium Facilities", "Networking", "Cafeteria"],
    area: "Green Park",
    availability: "Available Now",
    popular: true,
    image:
      "https://res.cloudinary.com/drd4942mc/image/upload/v1767849459/chrome_Bn0q3U4F3v_wx4jpa.png",
  },
  {
    name: "Infrapro - Sector 44",
    address:
      "Plot no 4, 2nd floor, Minarch Tower, Sector 44, Gurugram, Haryana 122003, India",
    city: "Gurgaon",
    price: "₹1,000/month",
    originalPrice: "₹1,250",
    gstPlanPrice: "₹1,000/month",
    mailingPlanPrice: "₹667/month",
    brPlanPrice: "₹1,175/month",
    rating: 4.7,
    reviews: 178,
    type: "Dedicated Desk",
    features: [
      "Corporate Hub",
      "Modern Facilities",
      "Ample Parking",
      "Food Court",
    ],
    area: "Sector 44",
    availability: "Available Now",
    popular: true,
    image: "https://shorturl.at/Fyr6o",
  },
  {
    name: "Palm Court - Gurgaon",
    address: "Mehrauli Rd, Gurugram, Haryana 122022, India",
    city: "Gurgaon",
    price: "₹1,000/month",
    originalPrice: "₹1,250",
    gstPlanPrice: "₹1,000/month",
    mailingPlanPrice: "₹750/month",
    brPlanPrice: "₹1,175/month",
    rating: 4.4,
    reviews: 134,
    type: "Hot Desk",
    features: [
      "Premium Location",
      "Creative Spaces",
      "Event Hosting",
      "Bike Parking",
    ],
    area: "Mehrauli Road",
    availability: "Available Now",
    popular: false,
    image: "https://shorturl.at/Fyr6o",
  },
  {
    name: "Ghoomakkad",
    address: "V.P.o, Sidhbari, Rakkar, Himachal Pradesh 176057, India",
    city: "Dharamshala",
    price: "₹667/month",
    originalPrice: "₹833",
    gstPlanPrice: "₹667/month",
    mailingPlanPrice: "₹533/month",
    brPlanPrice: "₹783/month",
    rating: 4.6,
    reviews: 156,
    type: "Dedicated Desk",
    features: [
      "Mountain View",
      "Peaceful Environment",
      "Nature Workspace",
      "Wellness Programs",
    ],
    area: "Sidhbari",
    availability: "Available Now",
    popular: false,
    image: "https://shorturl.at/LdEgA",
  },
  {
    name: "Cabins 24/7",
    address:
      "h, 5/86, Golden Tulip Estate, JV Hills, HITEC City, Kondapur, Telangana 500081, India",
    city: "Hyderabad",
    price: "₹1,000/month",
    originalPrice: "₹1,083",
    gstPlanPrice: "₹1,000/month",
    mailingPlanPrice: "₹667/month",
    brPlanPrice: "₹1,175/month",
    rating: 4.3,
    reviews: 98,
    type: "Hot Desk",
    features: ["IT Hub", "Flexible Plans", "Community Events", "Gaming Area"],
    area: "Kondapur",
    availability: "Available Now",
    popular: false,
    image: "https://shorturl.at/S4XWY",
  },
  {
    name: "CS Coworking",
    address:
      "Door No. 1-60, A & B, 3rd Floor, KNR Square, opp. The Platina, Gachibowli, Hyderabad, Telangana 500032, India",
    city: "Hyderabad",
    price: "₹917/month",
    originalPrice: "₹1,167",
    gstPlanPrice: "₹917/month",
    mailingPlanPrice: "₹733/month",
    brPlanPrice: "₹1,083/month",
    rating: 4.5,
    reviews: 123,
    type: "Dedicated Desk",
    features: ["Tech Park", "Modern Infrastructure", "Parking", "Cafeteria"],
    area: "Gachibowli",
    availability: "Available Now",
    popular: true,
    image: "https://shorturl.at/NUpzM",
  },
  {
    name: "Jeev Business Solutions",
    address:
      "548 1, Tonk Rd, behind Jaipur Hospital, Mahaveer Nagar, Gopal Pura Mode, Jaipur, Rajasthan 302018, India",
    city: "Jaipur",
    price: "₹833/month",
    originalPrice: "₹1,000",
    gstPlanPrice: "₹833/month",
    mailingPlanPrice: "₹667/month",
    brPlanPrice: "₹1,000/month",
    rating: 4.4,
    reviews: 145,
    type: "Hot Desk",
    features: ["Central Location", "Budget Friendly", "WiFi", "Meeting Rooms"],
    area: "Tonk Road",
    availability: "Available Now",
    popular: false,
    image: "https://shorturl.at/Fyr6o",
  },
  {
    name: "Qubicle Coworking",
    address: "Trikuta Nagar Ext 1/A",
    city: "Jammu",
    price: "₹1,000/month",
    originalPrice: "₹1,250",
    gstPlanPrice: "₹1,000/month",
    mailingPlanPrice: "₹667/month",
    brPlanPrice: "₹1,175/month",
    rating: 4.5,
    reviews: 89,
    type: "Hot Desk",
    features: [
      "Residential Area",
      "Quiet Environment",
      "Basic Amenities",
      "WiFi",
    ],
    area: "Trikuta Nagar",
    availability: "Available Now",
    popular: false,
    image: "https://shorturl.at/S4XWY",
  },
  {
    name: "Kaytech Solutions",
    address:
      "Civil Airport, Satwari, Raipur Satwari, Jammu, Jammu and Kashmir 180003",
    city: "Jammu",
    price: "₹1,500/month",
    originalPrice: "₹1,833",
    gstPlanPrice: "₹1,500/month",
    mailingPlanPrice: "₹667/month",
    brPlanPrice: "₹1,767/month",
    rating: 4.6,
    reviews: 112,
    type: "Private Office",
    features: [
      "Airport Proximity",
      "Premium Amenities",
      "Parking",
      "Meeting Rooms",
    ],
    area: "Satwari",
    availability: "Available Now",
    popular: true,
    image: "https://shorturl.at/NUpzM",
  },
];

// ============ HELPER FUNCTIONS ============
const generateBookingNumber = () => {
  const year = new Date().getFullYear();
  const sequence = Math.floor(Math.random() * 99999)
    .toString()
    .padStart(5, "0");
  return `FS-${year}-${sequence}`;
};

const generateObjectId = () => {
  const chars = "0123456789abcdef";
  let result = "";
  for (let i = 0; i < 24; i++) {
    result += chars[Math.floor(Math.random() * 16)];
  }
  return result;
};

const getRandomFutureDate = (daysFromNow: number) => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date;
};

const getRandomPastDate = (daysAgo: number) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date;
};

// ============ BOOKINGS DATA ============
const bookings = [
  // Document 1: Virtual Office
  {
    bookingNumber: generateBookingNumber(),
    user: null,
    type: "VirtualOffice",
    spaceId: generateObjectId(),
    spaceSnapshot: {
      _id: null,
      name: "Getset Spaces",
      address:
        "3rd Floor, LMR House, S-16, Block C, Green Park Extension, Green Park, New Delhi, Delhi 110016, India",
      city: "Delhi",
      area: "Green Park",
      image:
        "https://res.cloudinary.com/drd4942mc/image/upload/v1767849459/chrome_Bn0q3U4F3v_wx4jpa.png",
      coordinates: { lat: 28.559, lng: 77.2067 },
    },
    plan: {
      _id: generateObjectId(),
      name: "Mailing Plan",
      price: 18727,
      originalPrice: 20808,
      discount: 2081,
      tenure: 24,
      tenureUnit: "months",
    },
    paymentId: generateObjectId(),
    razorpayOrderId: `order_${Math.random().toString(36).substr(2, 14).toUpperCase()}`,
    razorpayPaymentId: `pay_sim_${Date.now()}`,
    status: "active",
    partner: null, // To be assigned
    kycProfileId: generateObjectId(),
    kycStatus: "approved",
    timeline: [
      {
        _id: generateObjectId(),
        status: "payment_received",
        date: getRandomPastDate(20),
        note: "Payment of ₹18727 received",
        by: "System",
      },
    ],
    documents: [],
    startDate: getRandomPastDate(20),
    endDate: getRandomFutureDate(700),
    autoRenew: false,
    features: ["Business Address", "Mail Handling", "GST Registration Support"],
    isDeleted: false,
    createdAt: getRandomPastDate(20),
    updatedAt: getRandomPastDate(20),
  },

  // Document 2: Coworking Space
  {
    bookingNumber: generateBookingNumber(),
    user: null,
    type: "CoworkingSpace",
    spaceId: generateObjectId(),
    spaceSnapshot: {
      _id: null,
      name: "Workzone - Ahmedabad",
      address: "World Trade Tower, Makarba, Ahmedabad, Gujarat 380051, India",
      city: "Ahmedabad",
      area: "Makarba",
      image: "https://shorturl.at/Fyr6o",
      coordinates: { lat: 23.0225, lng: 72.5714 },
    },
    plan: {
      _id: generateObjectId(),
      name: "Hot Desk - Monthly",
      price: 1083,
      originalPrice: 1333,
      discount: 250,
      tenure: 1,
      tenureUnit: "months",
    },
    paymentId: generateObjectId(),
    razorpayOrderId: `order_${Math.random().toString(36).substr(2, 14).toUpperCase()}`,
    razorpayPaymentId: `pay_sim_${Date.now() + 1}`,
    status: "active",
    partner: null, // To be assigned
    kycProfileId: generateObjectId(),
    kycStatus: "approved",
    timeline: [
      {
        _id: generateObjectId(),
        status: "payment_received",
        date: getRandomPastDate(15),
        note: "Payment of ₹1083 received",
        by: "System",
      },
      {
        _id: generateObjectId(),
        status: "active",
        date: getRandomPastDate(14),
        note: "Booking activated",
        by: "admin@flashspace.co",
      },
    ],
    documents: [
      {
        _id: generateObjectId(),
        name: "Rental Agreement.pdf",
        type: "agreement",
        url: "https://example.com/documents/agreement_001.pdf",
        generatedAt: getRandomPastDate(14),
      },
    ],
    startDate: getRandomPastDate(14),
    endDate: getRandomFutureDate(16),
    autoRenew: true,
    features: ["High-Speed WiFi", "Meeting Rooms", "Coffee Bar", "24/7 Access"],
    isDeleted: false,
    createdAt: getRandomPastDate(15),
    updatedAt: getRandomPastDate(14),
  },

  // Document 3: Meeting Room (pending KYC)
  {
    bookingNumber: generateBookingNumber(),
    user: null,
    type: "MeetingRoom",
    spaceId: generateObjectId(),
    spaceSnapshot: {
      _id: null,
      name: "Mytime Cowork",
      address:
        "55 Lane-2, Westend Marg, Saiyad Ul Ajaib Village, Saket, New Delhi, Delhi 110030, India",
      city: "Delhi",
      area: "Saket",
      image:
        "https://res.cloudinary.com/drd4942mc/image/upload/v1767848454/chrome_mw5gzNjq6G_vqyjti.png",
      coordinates: { lat: 28.5245, lng: 77.1855 },
    },
    plan: {
      _id: generateObjectId(),
      name: "Meeting Room - Day Pass",
      price: 2500,
      originalPrice: 3000,
      discount: 500,
      tenure: 1,
      tenureUnit: "day",
    },
    paymentId: generateObjectId(),
    razorpayOrderId: `order_${Math.random().toString(36).substr(2, 14).toUpperCase()}`,
    razorpayPaymentId: `pay_sim_${Date.now() + 2}`,
    status: "pending_kyc",
    partner: null, // To be assigned
    kycProfileId: generateObjectId(),
    kycStatus: "pending",
    timeline: [
      {
        _id: generateObjectId(),
        status: "payment_received",
        date: getRandomPastDate(2),
        note: "Payment of ₹2500 received",
        by: "System",
      },
      {
        _id: generateObjectId(),
        status: "pending_kyc",
        date: getRandomPastDate(1),
        note: "KYC documents submitted",
        by: "test@example.com",
      },
    ],
    documents: [],
    startDate: getRandomFutureDate(7),
    endDate: getRandomFutureDate(7),
    autoRenew: false,
    features: [
      "Premium Location",
      "Executive Lounge",
      "Concierge",
      "Valet Parking",
    ],
    isDeleted: false,
    createdAt: getRandomPastDate(2),
    updatedAt: getRandomPastDate(1),
  },

  // Document 4: Virtual Office (pending payment)
  {
    bookingNumber: generateBookingNumber(),
    user: null,
    type: "VirtualOffice",
    spaceId: generateObjectId(),
    spaceSnapshot: {
      _id: null,
      name: "Stirring Minds",
      address:
        "Kundan Mansion, 2-A/3, Asaf Ali Rd, Turkman Gate, Chandni Chowk, New Delhi, Delhi, 110002, India",
      city: "Delhi",
      area: "Chandni Chowk",
      image:
        "https://res.cloudinary.com/drd4942mc/image/upload/v1767849333/chrome_Z3AywYVrjz_wb1idq.png",
      coordinates: { lat: 28.7041, lng: 77.1025 },
    },
    plan: {
      _id: generateObjectId(),
      name: "GST Plan",
      price: 800,
      originalPrice: 1000,
      discount: 200,
      tenure: 6,
      tenureUnit: "months",
    },
    status: "pending_payment",
    partner: null, // To be assigned
    kycStatus: "not_started",
    timeline: [
      {
        _id: generateObjectId(),
        status: "pending_payment",
        date: new Date(),
        note: "Booking created, waiting for payment",
        by: "System",
      },
    ],
    documents: [],
    startDate: null,
    endDate: null,
    autoRenew: false,
    features: ["High-Speed WiFi", "Meeting Rooms", "Coffee Bar", "24/7 Access"],
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // Document 5: Coworking Space (expired)
  {
    bookingNumber: generateBookingNumber(),
    user: null,
    type: "CoworkingSpace",
    spaceId: generateObjectId(),
    spaceSnapshot: {
      _id: null,
      name: "IndiraNagar - Aspire Coworks",
      address:
        "17, 7th Main Rd, Indira Nagar II Stage, Hoysala Nagar, Indiranagar, Bengaluru, Karnataka 560038, India",
      city: "Bangalore",
      area: "Indiranagar",
      image: "https://shorturl.at/LdEgA",
      coordinates: { lat: 12.9716, lng: 77.5946 },
    },
    plan: {
      _id: generateObjectId(),
      name: "Hot Desk - Quarterly",
      price: 2499,
      originalPrice: 3249,
      discount: 750,
      tenure: 3,
      tenureUnit: "months",
    },
    paymentId: generateObjectId(),
    razorpayOrderId: `order_${Math.random().toString(36).substr(2, 14).toUpperCase()}`,
    razorpayPaymentId: `pay_sim_${Date.now() + 3}`,
    status: "expired",
    partner: null, // To be assigned
    kycProfileId: generateObjectId(),
    kycStatus: "approved",
    timeline: [
      {
        _id: generateObjectId(),
        status: "payment_received",
        date: getRandomPastDate(120),
        note: "Payment of ₹2499 received",
        by: "System",
      },
      {
        _id: generateObjectId(),
        status: "active",
        date: getRandomPastDate(115),
        note: "Booking activated",
        by: "admin@flashspace.co",
      },
      {
        _id: generateObjectId(),
        status: "expired",
        date: getRandomPastDate(25),
        note: "Booking period ended",
        by: "System",
      },
    ],
    documents: [
      {
        _id: generateObjectId(),
        name: "Old Rental Agreement.pdf",
        type: "agreement",
        url: "https://example.com/documents/old_agreement_001.pdf",
        generatedAt: getRandomPastDate(114),
      },
    ],
    startDate: getRandomPastDate(115),
    endDate: getRandomPastDate(25),
    autoRenew: false,
    features: [
      "Tech Hub",
      "Innovation Labs",
      "Startup Ecosystem",
      "Outdoor Terrace",
    ],
    isDeleted: false,
    createdAt: getRandomPastDate(120),
    updatedAt: getRandomPastDate(25),
  },
];

// ============ USER MODEL ============
// const userSchema = new mongoose.Schema({
//   email: { type: String, required: true, unique: true },
//   fullName: { type: String, required: true },
//   phoneNumber: String,
//   password: { type: String, required: true },
//   authProvider: { type: String, default: 'local' },
//   role: { type: String, default: 'user' },
//   isEmailVerified: { type: Boolean, default: false },
//   kycVerified: { type: Boolean, default: false },
//   emailVerificationOTP: String,
//   emailVerificationOTPExpiry: Date,
//   emailVerificationOTPAttempts: { type: Number, default: 0 },
//   lastOTPRequestTime: Date,
//   otpRequestCount: { type: Number, default: 0 },
//   isActive: { type: Boolean, default: true },
//   credits: { type: Number, default: 0 },
//   isDeleted: { type: Boolean, default: false },
//   refreshTokens: { type: [String], default: [] },
//   isTwoFactorEnabled: { type: Boolean, default: false }
// }, {
//   timestamps: true
// });

// const UserModel = mongoose.model('User', userSchema);

async function seedDatabase() {
  try {
    console.log("📦 Connecting to database...");
    await mongoose.connect(process.env.DB_URI as string);
    console.log("✅ Connected to database successfully!");

    console.log("\n🧹 Clearing existing data...");
    await UserModel.deleteMany({});
    await PropertyModel.deleteMany({});
    await CoworkingSpaceModel.deleteMany({});
    await VirtualOfficeModel.deleteMany({});
    await BookingModel.deleteMany({});
    console.log("✅ Existing data cleared!");

    // ============ SEED USERS ============
    console.log("\n👤 Seeding test users...");
    const hashedUsers = await Promise.all(
      testUsers.map(async (user) => {
        const hashedPassword = await bcrypt.hash(user.password, 12);
        return {
          ...user,
          password: hashedPassword,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }),
    );

    const insertedUsers = await UserModel.insertMany(hashedUsers);
    console.log(`✅ ${insertedUsers.length} users inserted!`);

    console.log("\n🔑 TEST USER CREDENTIALS:");
    console.log("=".repeat(40));
    console.log("1. Regular User:");
    console.log("   Email: test@example.com");
    console.log("   Password: Test@123");
    console.log("   Verified: YES (no OTP needed)");
    console.log("\n2. Admin User:");
    console.log("   Email: admin@flashspace.co");
    console.log("   Password: Admin@123");
    console.log("   Verified: YES (no OTP needed)");

    // ============ SEED PROPERTIES & SPACES ============
    const partnerUser = insertedUsers.find((u) => u.role === UserRole.PARTNER);

    console.log("\n💼 Seeding coworking spaces and properties...");
    const coworkingSpaceDocs = await Promise.all(
      coworkingSpaces.map(async (space) => {
        const property = await PropertyModel.create({
          name: space.name,
          address: space.address,
          city: space.city,
          area: space.area,
          features: space.features,
          images: [space.image],
          partner: partnerUser?._id,
          status: PropertyStatus.ACTIVE,
          kycStatus: KYCStatus.APPROVED,
          isActive: true,
          location: (space as any).lat && (space as any).lng ? {
            type: "Point",
            coordinates: [(space as any).lng, (space as any).lat]
          } : undefined
        });

        return {
          ...space,
          property: property._id,
          partner: partnerUser?._id,
          partnerPricePerMonth: parseInt(space.price.replace(/[^\d]/g, "")),
          finalPricePerMonth: parseInt(space.price.replace(/[^\d]/g, "")),
          operatingHours: {
            monday: { isOpen: true, open: "09:00", close: "18:00" },
            tuesday: { isOpen: true, open: "09:00", close: "18:00" },
            wednesday: { isOpen: true, open: "09:00", close: "18:00" },
            thursday: { isOpen: true, open: "09:00", close: "18:00" },
            friday: { isOpen: true, open: "09:00", close: "18:00" },
            saturday: { isOpen: false, open: "00:00", close: "00:00" },
            sunday: { isOpen: false, open: "00:00", close: "00:00" },
          },
          isActive: true,
          capacity: 50,
        };
      }),
    );
    const insertedCoworkingSpaces =
      await CoworkingSpaceModel.insertMany(coworkingSpaceDocs);
    console.log(
      `✅ ${insertedCoworkingSpaces.length} coworking spaces inserted!`,
    );

    console.log("\n🏢 Seeding virtual offices and properties...");
    const virtualOfficeDocs = await Promise.all(
      virtualOffices.map(async (vo) => {
        const property = await PropertyModel.create({
          name: vo.name,
          address: vo.address,
          city: vo.city,
          area: vo.area,
          features: vo.features,
          images: [vo.image],
          partner: partnerUser?._id,
          status: PropertyStatus.ACTIVE,
          kycStatus: KYCStatus.APPROVED,
          isActive: true,
          location: (vo as any).lat && (vo as any).lng ? {
            type: "Point",
            coordinates: [(vo as any).lng, (vo as any).lat]
          } : undefined
        });

        return {
          ...vo,
          property: property._id,
          partner: partnerUser?._id,
          partnerGstPricePerYear: parseInt(
            vo.gstPlanPrice.replace(/[^\d]/g, ""),
          ),
          finalGstPricePerYear: parseInt(vo.gstPlanPrice.replace(/[^\d]/g, "")),
          partnerMailingPricePerYear: parseInt(
            vo.mailingPlanPrice.replace(/[^\d]/g, ""),
          ),
          finalMailingPricePerYear: parseInt(
            vo.mailingPlanPrice.replace(/[^\d]/g, ""),
          ),
          partnerBrPricePerYear: parseInt(vo.brPlanPrice.replace(/[^\d]/g, "")),
          finalBrPricePerYear: parseInt(vo.brPlanPrice.replace(/[^\d]/g, "")),
          isActive: true,
        };
      }),
    );
    const insertedVirtualOffices =
      await VirtualOfficeModel.insertMany(virtualOfficeDocs);
    console.log(
      `✅ ${insertedVirtualOffices.length} virtual offices inserted!`,
    );

    // ============ SEED BOOKINGS ============
    console.log("\n📋 Seeding bookings...");

    // Get user IDs after insertion
    const regularUser = insertedUsers.find(
      (u) => u.email === "test@example.com",
    );
    const adminUser = insertedUsers.find(
      (u) => u.email === "admin@flashspace.co",
    );

    // Assign user references to bookings and fix spaceSnapshot._id
    const bookingsWithUsers = bookings.map((booking, index) => {
      // Alternate between regular user and admin user
      const userRef = index % 2 === 0 ? regularUser?._id : adminUser?._id;
      const spaceId = booking.spaceId;

      return {
        ...booking,
        user: userRef,
        partner: partnerUser?._id,
        spaceSnapshot: {
          ...booking.spaceSnapshot,
          _id: spaceId,
        },
      };
    });

    const insertedBookings = await BookingModel.insertMany(bookingsWithUsers);
    console.log(`✅ ${insertedBookings.length} bookings inserted!`);

    // Show booking summary
    console.log("\n📊 BOOKING SUMMARY:");
    console.log("=".repeat(40));
    insertedBookings.forEach((booking, index) => {
      const userEmail =
        index % 2 === 0 ? "test@example.com" : "admin@flashspace.co";
      console.log(
        `${index + 1}. ${booking.bookingNumber}: ${booking.type} - ${booking.status} (${userEmail})`,
      );
    });

    // ============ FINAL SUMMARY ============
    console.log("\n" + "=".repeat(50));
    console.log("🎉 DATABASE SEEDING COMPLETE!");
    console.log("=".repeat(50));
    console.log(`👤 Users: ${insertedUsers.length} (ALL PRE-VERIFIED)`);
    console.log(`💼 Coworking Spaces: ${insertedCoworkingSpaces.length}`);
    console.log(`🏢 Virtual Offices: ${insertedVirtualOffices.length}`);
    console.log(`📋 Bookings: ${insertedBookings.length}`);

    // Booking status breakdown
    const statusCount: Record<string, number> = {};
    insertedBookings.forEach((booking) => {
      statusCount[booking.status] = (statusCount[booking.status] || 0) + 1;
    });

    console.log("\n📈 BOOKING STATUS BREAKDOWN:");
    console.log("-".repeat(30));
    Object.entries(statusCount).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });

    console.log("\n🚀 READY TO TEST:");
    console.log("-".repeat(30));
    console.log("1. Start backend: npm run dev");
    console.log("2. Run API tests: npm run test:api");
    console.log("\n✅ Users are PRE-VERIFIED - No OTP needed for login!");
    console.log("✅ Bookings created with realistic timeline data!");

    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from database.");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
}

seedDatabase();
