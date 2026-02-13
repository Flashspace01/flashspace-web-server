console.log("Starting seed script...");
import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import { CoworkingSpaceModel } from "../flashspaceWeb/coworkingSpaceModule/coworkingSpace.model";
import { VirtualOfficeModel } from "../flashspaceWeb/virtualOfficeModule/virtualOffice.model";

dotenv.config();

// Mock data for coworking spaces
const coworkingSpaces = [
  // Ahmedabad
  { name: "Workzone - Ahmedabad", address: "World Trade Tower, Makarba, Ahmedabad, Gujarat 380051, India", city: "Ahmedabad", price: "₹1,083/month", originalPrice: "₹1,333", rating: 4.8, reviews: 245, type: "Hot Desk", features: ["High-Speed WiFi", "Meeting Rooms", "Coffee Bar", "24/7 Access"], area: "Makarba", availability: "Available Now", popular: true, image: "https://shorturl.at/Fyr6o" },
  { name: "Sweet Spot Spaces", address: "Office No 4-D fourth, Vardaan Complex, Tower, Lakhudi Rd, near SARDAR PATEL STADIUM, Vithalbhai Patel Colony, Nathalal Colony, Navrangpura, Ahmedabad, Gujarat 380009, India", city: "Ahmedabad", price: "₹1,167/month", originalPrice: "₹1,417", rating: 4.7, reviews: 189, type: "Dedicated Desk", features: ["Premium Location", "Parking", "Event Space", "Cafeteria"], area: "Navrangpura", availability: "Available Now", popular: false, image: "https://shorturl.at/LdEgA" },

  // Bangalore 
  { name: "IndiraNagar - Aspire Coworks", address: "17, 7th Main Rd, Indira Nagar II Stage, Hoysala Nagar, Indiranagar, Bengaluru, Karnataka 560038, India", city: "Bangalore", price: "₹833/month", originalPrice: "₹1,083", rating: 4.8, reviews: 267, type: "Hot Desk", features: ["Tech Hub", "Innovation Labs", "Startup Ecosystem", "Outdoor Terrace"], area: "Indiranagar", availability: "Available Now", popular: true, image: "https://shorturl.at/LdEgA" },
  { name: "Koramangala - Aspire Coworks", address: "2nd & 3rd Floor, Balaji Arcade, 472/7, 20th L Cross Rd, 4th Block, Koramangala, Bengaluru, Karnataka 560095, India", city: "Bangalore", price: "₹1,000/month", originalPrice: "₹1,250", rating: 4.6, reviews: 189, type: "Dedicated Desk", features: ["IT Corridor", "Shuttle Service", "Gaming Area", "Wellness Programs"], area: "Koramangala", availability: "Available Now", popular: false, image: "https://shorturl.at/Fyr6o" },
  { name: "EcoSpace - Hebbal, HMT Layout", address: "No,33, 4th Floor, 1st Main, CBI Main Rd, HMT Layout, Ganganagar, Bengaluru, Karnataka 560032, India", city: "Bangalore", price: "₹833/month", originalPrice: "₹1,083", rating: 4.5, reviews: 134, type: "Hot Desk", features: ["Residential Area", "Quiet Environment", "Flexible Hours", "Community Kitchen"], area: "HMT Layout", availability: "Available Now", popular: false, image: "https://shorturl.at/S4XWY" },

  // Chennai
  { name: "WBB Office", address: "Room no 1 No. 19, Metro Station, 35, Anna Salai, near Little Mount, Little Mount, Nandanam, Chennai, Tamil Nadu 600015, India", city: "Chennai", price: "₹4,800/month", originalPrice: "₹6,000", rating: 4.7, reviews: 198, type: "Hot Desk", features: ["Metro Connectivity", "Modern Facilities", "Parking", "Food Court"], area: "Nandanam", availability: "Available Now", popular: true, image: "https://shorturl.at/NUpzM" },
  { name: "Senate Space", address: "W-126, 3rd Floor, 3rd Ave, Anna Nagar, Chennai, Tamil Nadu 600040, India", city: "Chennai", price: "₹917/month", originalPrice: "₹1,167", rating: 4.4, reviews: 112, type: "Dedicated Desk", features: ["Residential Area", "Peaceful Environment", "Basic Amenities", "WiFi"], area: "Anna Nagar", availability: "Available Now", popular: false, image: "https://shorturl.at/LdEgA" },

  // Delhi
  { name: "Stirring Minds", address: "Kundan Mansion, 2-A/3, Asaf Ali Rd, Turkman Gate, Chandni Chowk, New Delhi, Delhi, 110002, India", city: "Delhi", price: "₹800/month", originalPrice: "₹1,000", rating: 4.8, reviews: 245, type: "Hot Desk", features: ["High-Speed WiFi", "Meeting Rooms", "Coffee Bar", "24/7 Access"], area: "Chandni Chowk", availability: "Available Now", popular: true, image: "https://res.cloudinary.com/drd4942mc/image/upload/v1767696478/chrome_y4ymlwh9SR_apwgug.png" },
  { name: "CP Alt F", address: "J6JF+53C, Connaught Lane, Barakhamba, New Delhi, Delhi 110001, India", city: "Delhi", price: "₹2,667/month", originalPrice: "₹3,333", rating: 4.7, reviews: 189, type: "Dedicated Desk", features: ["Private Cabin Option", "Parking", "Event Space", "Cafeteria"], area: "Connaught Place", availability: "Available Now", popular: false, image: "https://res.cloudinary.com/drd4942mc/image/upload/v1767696830/chrome_tF4p9FCNvN_e0w4dd.png" },
  { name: "Virtualexcel", address: "Lower Ground Floor, Saket Salcon, Rasvilas, next to Select Citywalk Mall, Saket District Centre, District Centre, Sector 6, Pushp Vihar, Mal, New Delhi, Delhi 110017, India", city: "Delhi", price: "₹1,000/month", originalPrice: "₹1,250", rating: 4.6, reviews: 156, type: "Hot Desk", features: ["Shopping Mall Access", "Premium Location", "Networking Events", "Printer Access"], area: "Saket", availability: "Available Now", popular: false, image: "https://res.cloudinary.com/drd4942mc/image/upload/v1767696936/chrome_y6UfCoipUj_wkpxel.png" },
  { name: "Mytime Cowork", address: "55 Lane-2, Westend Marg, Saiyad Ul Ajaib Village, Saket, New Delhi, Delhi 110030, India", city: "Delhi", price: "₹6,500/month", originalPrice: "₹8,000", rating: 4.9, reviews: 198, type: "Private Office", features: ["Premium Location", "Executive Lounge", "Concierge", "Valet Parking"], area: "Saket", availability: "Available Now", popular: true, image: "https://res.cloudinary.com/drd4942mc/image/upload/v1767696150/chrome_F5QP1MGRA2_whrsth.png" },
  { name: "Okhla Alt F", address: "101, NH-19, CRRI, Ishwar Nagar, Okhla, New Delhi, Delhi 110044, India", city: "Delhi", price: "₹2,500/month", originalPrice: "₹3,167", rating: 4.5, reviews: 134, type: "Hot Desk", features: ["Industrial Area", "Flexible Hours", "Gaming Zone", "Wellness Room"], area: "Okhla", availability: "Available Now", popular: false, image: "https://res.cloudinary.com/drd4942mc/image/upload/v1767697088/chrome_nweqds48I9_i7xwhi.png" },
  { name: "WBB Office", address: "Office no. 102, 52A first floor, Vijay Block, Block E, Laxmi Nagar, Delhi, 110092, India", city: "Delhi", price: "₹4,800/month", originalPrice: "₹6,000", rating: 4.3, reviews: 89, type: "Shared Desk", features: ["Budget Friendly", "Basic Amenities", "WiFi", "Print Access"], area: "Laxmi Nagar", availability: "Available Now", popular: false, image: "https://res.cloudinary.com/drd4942mc/image/upload/v1767697269/chrome_e1S9bRUX5L_t3ltud.png" },
  { name: "Budha Coworking Spaces", address: "3rd floor, H.no 33, Pocket 5, Sector-24, Rohini, Delhi, 110085, India", city: "Delhi", price: "₹4,200/month", originalPrice: "₹5,500", rating: 4.4, reviews: 112, type: "Hot Desk", features: ["Suburban Location", "Parking Available", "Community Events", "Cafeteria"], area: "Rohini", availability: "Available Now", popular: false, image: "https://images.unsplash.com/photo-1604328698692-f76ea9498e76?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
  { name: "Work & Beyond", address: "E-518 first floor Kocchar plaza near Ramphal Chowk dwark sector 7, Block E, Palam Extension, Palam, Delhi, 110077, India", city: "Delhi", price: "₹5,500/month", originalPrice: "₹7,000", rating: 4.5, reviews: 145, type: "Dedicated Desk", features: ["Airport Proximity", "Modern Amenities", "Meeting Rooms", "Parking"], area: "Dwarka", availability: "Available Now", popular: false, image: "https://res.cloudinary.com/drd4942mc/image/upload/v1767697175/chrome_4eVI3pxb5I_qpev0q.png" },
  { name: "Getset Spaces", address: "3rd Floor, LMR House, S-16, Block C, Green Park Extension, Green Park, New Delhi, Delhi 110016, India", city: "Delhi", price: "₹5,000/month", originalPrice: "₹6,500", rating: 4.6, reviews: 167, type: "Private Office", features: ["South Delhi", "Premium Facilities", "Networking", "Cafeteria"], area: "Green Park", availability: "Available Now", popular: true, image: "https://res.cloudinary.com/drd4942mc/image/upload/v1767696619/chrome_Usn5xZsDny_b59bwf.png" },

  // Gurgaon
  { name: "Infrapro - Sector 44", address: "Plot no 4, 2nd floor, Minarch Tower, Sector 44, Gurugram, Haryana 122003, India", city: "Gurgaon", price: "₹1,000/month", originalPrice: "₹1,250", rating: 4.7, reviews: 178, type: "Dedicated Desk", features: ["Corporate Hub", "Modern Facilities", "Ample Parking", "Food Court"], area: "Sector 44", availability: "Available Now", popular: true, image: "https://shorturl.at/Fyr6o" },
  { name: "Palm Court - Gurgaon", address: "Mehrauli Rd, Gurugram, Haryana 122022, India", city: "Gurgaon", price: "₹1,000/month", originalPrice: "₹1,250", rating: 4.4, reviews: 134, type: "Hot Desk", features: ["Premium Location", "Creative Spaces", "Event Hosting", "Bike Parking"], area: "Mehrauli Road", availability: "Available Now", popular: false, image: "https://shorturl.at/Fyr6o" },

  // Himachal Pradesh
  { name: "Ghoomakkad", address: "V.P.o, Sidhbari, Rakkar, Himachal Pradesh 176057, India", city: "Dharamshala", price: "₹667/month", originalPrice: "₹833", rating: 4.6, reviews: 156, type: "Dedicated Desk", features: ["Mountain View", "Peaceful Environment", "Nature Workspace", "Wellness Programs"], area: "Sidhbari", availability: "Available Now", popular: false, image: "https://shorturl.at/LdEgA" },

  // Hyderabad
  { name: "Cabins 24/7", address: "h, 5/86, Golden Tulip Estate, JV Hills, HITEC City, Kondapur, Telangana 500081, India", city: "Hyderabad", price: "₹1,000/month", originalPrice: "₹1,083", rating: 4.3, reviews: 98, type: "Hot Desk", features: ["IT Hub", "Flexible Plans", "Community Events", "Gaming Area"], area: "Kondapur", availability: "Available Now", popular: false, image: "https://shorturl.at/S4XWY" },
  { name: "CS Coworking", address: "Door No. 1-60, A & B, 3rd Floor, KNR Square, opp. The Platina, Gachibowli, Hyderabad, Telangana 500032, India", city: "Hyderabad", price: "₹917/month", originalPrice: "₹1,167", rating: 4.5, reviews: 123, type: "Dedicated Desk", features: ["Tech Park", "Modern Infrastructure", "Parking", "Cafeteria"], area: "Gachibowli", availability: "Available Now", popular: true, image: "https://shorturl.at/NUpzM" },

  // Jaipur
  { name: "Jeev Business Solutions", address: "548 1, Tonk Rd, behind Jaipur Hospital, Mahaveer Nagar, Gopal Pura Mode, Jaipur, Rajasthan 302018, India", city: "Jaipur", price: "₹833/month", originalPrice: "₹1,000", rating: 4.4, reviews: 145, type: "Hot Desk", features: ["Central Location", "Budget Friendly", "WiFi", "Meeting Rooms"], area: "Tonk Road", availability: "Available Now", popular: false, image: "https://shorturl.at/Fyr6o" },

  // Jammu
  { name: "Qubicle Coworking", address: "Trikuta Nagar Ext 1/A", city: "Jammu", price: "₹1,000/month", originalPrice: "₹1,250", rating: 4.5, reviews: 89, type: "Hot Desk", features: ["Residential Area", "Quiet Environment", "Basic Amenities", "WiFi"], area: "Trikuta Nagar", availability: "Available Now", popular: false, image: "https://shorturl.at/S4XWY" },
  { name: "Kaytech Solutions", address: "Civil Airport, Satwari, Raipur Satwari, Jammu, Jammu and Kashmir 180003", city: "Jammu", price: "₹1,500/month", originalPrice: "₹1,833", rating: 4.6, reviews: 112, type: "Private Office", features: ["Airport Proximity", "Premium Amenities", "Parking", "Meeting Rooms"], area: "Satwari", availability: "Available Now", popular: true, image: "https://shorturl.at/NUpzM" },
];

// Mock data for virtual offices
const virtualOffices = [
  // Ahmedabad
  { name: "Workzone - Ahmedabad", address: "World Trade Tower, Makarba, Ahmedabad, Gujarat 380051, India", city: "Ahmedabad", price: "₹1,083/month", originalPrice: "₹1,333", gstPlanPrice: "₹1,083/month", mailingPlanPrice: "₹667/month", brPlanPrice: "₹1,275/month", rating: 4.8, reviews: 245, type: "Hot Desk", features: ["High-Speed WiFi", "Meeting Rooms", "Coffee Bar", "24/7 Access"], area: "Makarba", availability: "Available Now", popular: true, image: "https://shorturl.at/Fyr6o" },
  { name: "Sweet Spot Spaces", address: "Office No 4-D fourth, Vardaan Complex, Tower, Lakhudi Rd, near SARDAR PATEL STADIUM, Vithalbhai Patel Colony, Nathalal Colony, Navrangpura, Ahmedabad, Gujarat 380009, India", city: "Ahmedabad", price: "₹1,167/month", originalPrice: "₹1,417", gstPlanPrice: "₹1,167/month", mailingPlanPrice: "₹833/month", brPlanPrice: "₹1,375/month", rating: 4.7, reviews: 189, type: "Dedicated Desk", features: ["Premium Location", "Parking", "Event Space", "Cafeteria"], area: "Navrangpura", availability: "Available Now", popular: false, image: "https://shorturl.at/LdEgA" },

  // Bangalore
  { name: "IndiraNagar - Aspire Coworks", address: "17, 7th Main Rd, Indira Nagar II Stage, Hoysala Nagar, Indiranagar, Bengaluru, Karnataka 560038, India", city: "Bangalore", price: "₹833/month", originalPrice: "₹1,083", gstPlanPrice: "₹833/month", mailingPlanPrice: "₹667/month", brPlanPrice: "₹1,000/month", rating: 4.8, reviews: 267, type: "Hot Desk", features: ["Tech Hub", "Innovation Labs", "Startup Ecosystem", "Outdoor Terrace"], area: "Indiranagar", availability: "Available Now", popular: true, image: "https://shorturl.at/LdEgA" },
  { name: "Koramangala - Aspire Coworks", address: "2nd & 3rd Floor, Balaji Arcade, 472/7, 20th L Cross Rd, 4th Block, Koramangala, Bengaluru, Karnataka 560095, India", city: "Bangalore", price: "₹1,000/month", originalPrice: "₹1,250", gstPlanPrice: "₹1,000/month", mailingPlanPrice: "₹667/month", brPlanPrice: "₹1,175/month", rating: 4.6, reviews: 189, type: "Dedicated Desk", features: ["IT Corridor", "Shuttle Service", "Gaming Area", "Wellness Programs"], area: "Koramangala", availability: "Available Now", popular: false, image: "https://shorturl.at/Fyr6o" },
  { name: "EcoSpace - Hebbal, HMT Layout", address: "No,33, 4th Floor, 1st Main, CBI Main Rd, HMT Layout, Ganganagar, Bengaluru, Karnataka 560032, India", city: "Bangalore", price: "₹833/month", originalPrice: "₹1,083", gstPlanPrice: "₹833/month", mailingPlanPrice: "₹667/month", brPlanPrice: "₹1,000/month", rating: 4.5, reviews: 134, type: "Hot Desk", features: ["Residential Area", "Quiet Environment", "Flexible Hours", "Community Kitchen"], area: "HMT Layout", availability: "Available Now", popular: false, image: "https://shorturl.at/S4XWY" },

  // Chennai
  { name: "WBB Office", address: "Room no 1 No. 19, Metro Station, 35, Anna Salai, near Little Mount, Little Mount, Nandanam, Chennai, Tamil Nadu 600015, India", city: "Chennai", price: "₹1,000/month", originalPrice: "₹1,250", gstPlanPrice: "₹1,000/month", mailingPlanPrice: "₹667/month", brPlanPrice: "₹1,175/month", rating: 4.7, reviews: 198, type: "Hot Desk", features: ["Metro Connectivity", "Modern Facilities", "Parking", "Food Court"], area: "Nandanam", availability: "Available Now", popular: true, image: "https://shorturl.at/NUpzM" },
  { name: "Senate Space", address: "W-126, 3rd Floor, 3rd Ave, Anna Nagar, Chennai, Tamil Nadu 600040, India", city: "Chennai", price: "₹917/month", originalPrice: "₹1,167", gstPlanPrice: "₹917/month", mailingPlanPrice: "₹733/month", brPlanPrice: "₹1,083/month", rating: 4.4, reviews: 112, type: "Dedicated Desk", features: ["Residential Area", "Peaceful Environment", "Basic Amenities", "WiFi"], area: "Anna Nagar", availability: "Available Now", popular: false, image: "https://shorturl.at/LdEgA" },

  // Delhi
  { name: "Stirring Minds", address: "Kundan Mansion, 2-A/3, Asaf Ali Rd, Turkman Gate, Chandni Chowk, New Delhi, Delhi, 110002, India", city: "Delhi", price: "₹800/month", originalPrice: "₹1,000", gstPlanPrice: "₹800/month", mailingPlanPrice: "₹640/month", brPlanPrice: "₹942/month", rating: 4.8, reviews: 245, type: "Hot Desk", features: ["High-Speed WiFi", "Meeting Rooms", "Coffee Bar", "24/7 Access"], area: "Chandni Chowk", availability: "Available Now", popular: true, image: "https://res.cloudinary.com/drd4942mc/image/upload/v1767849333/chrome_Z3AywYVrjz_wb1idq.png" },
  { name: "CP Alt F", address: "J6JF+53C, Connaught Lane, Barakhamba, New Delhi, Delhi 110001, India", city: "Delhi", price: "₹2,667/month", originalPrice: "₹3,333", gstPlanPrice: "₹2,667/month", mailingPlanPrice: "₹1,500/month", brPlanPrice: "₹3,133/month", rating: 4.7, reviews: 189, type: "Dedicated Desk", features: ["Private Cabin Option", "Parking", "Event Space", "Cafeteria"], area: "Connaught Place", availability: "Available Now", popular: false, image: "https://res.cloudinary.com/drd4942mc/image/upload/v1767696830/chrome_tF4p9FCNvN_e0w4dd.png" },
  { name: "Virtualexcel", address: "Lower Ground Floor, Saket Salcon, Rasvilas, next to Select Citywalk Mall, Saket District Centre, District Centre, Sector 6, Pushp Vihar, Mal, New Delhi, Delhi 110017, India", city: "Delhi", price: "₹1,000/month", originalPrice: "₹1,250", gstPlanPrice: "₹1,000/month", mailingPlanPrice: "₹833/month", brPlanPrice: "₹1,175/month", rating: 4.6, reviews: 156, type: "Hot Desk", features: ["Shopping Mall Access", "Premium Location", "Networking Events", "Printer Access"], area: "Saket", availability: "Available Now", popular: false, image: "https://res.cloudinary.com/drd4942mc/image/upload/v1767849535/chrome_v2poSAMRhE_iwknqu.png" },
  { name: "Mytime Cowork", address: "55 Lane-2, Westend Marg, Saiyad Ul Ajaib Village, Saket, New Delhi, Delhi 110030, India", city: "Delhi", price: "₹1,000/month", originalPrice: "₹1,250", gstPlanPrice: "₹1,000/month", mailingPlanPrice: "₹833/month", brPlanPrice: "₹1,175/month", rating: 4.9, reviews: 198, type: "Private Office", features: ["Premium Location", "Executive Lounge", "Concierge", "Valet Parking"], area: "Saket", availability: "Available Now", popular: true, image: "https://res.cloudinary.com/drd4942mc/image/upload/v1767848454/chrome_mw5gzNjq6G_vqyjti.png" },
  { name: "Okhla Alt F", address: "101, NH-19, CRRI, Ishwar Nagar, Okhla, New Delhi, Delhi 110044, India", city: "Delhi", price: "₹2,500/month", originalPrice: "₹3,167", gstPlanPrice: "₹2,500/month", mailingPlanPrice: "₹1,250/month", brPlanPrice: "₹2,942/month", rating: 4.5, reviews: 134, type: "Hot Desk", features: ["Industrial Area", "Flexible Hours", "Gaming Zone", "Wellness Room"], area: "Okhla", availability: "Available Now", popular: false, image: "https://res.cloudinary.com/drd4942mc/image/upload/v1767697088/chrome_nweqds48I9_i7xwhi.png" },
  { name: "WBB Office", address: "Office no. 102, 52A first floor, Vijay Block, Block E, Laxmi Nagar, Delhi, 110092, India", city: "Delhi", price: "₹1,167/month", originalPrice: "₹1,417", gstPlanPrice: "₹1,167/month", mailingPlanPrice: "₹750/month", brPlanPrice: "₹1,375/month", rating: 4.3, reviews: 89, type: "Shared Desk", features: ["Budget Friendly", "Basic Amenities", "WiFi", "Print Access"], area: "Laxmi Nagar", availability: "Available Now", popular: false, image: "https://res.cloudinary.com/drd4942mc/image/upload/v1767697269/chrome_e1S9bRUX5L_t3ltud.png " },
  { name: "Budha Coworking Spaces", address: "3rd floor, H.no 33, Pocket 5, Sector-24, Rohini, Delhi, 110085, India", city: "Delhi", price: "₹917/month", originalPrice: "₹1,167", gstPlanPrice: "₹917/month", mailingPlanPrice: "₹733/month", brPlanPrice: "₹1,083/month", rating: 4.4, reviews: 112, type: "Hot Desk", features: ["Suburban Location", "Parking Available", "Community Events", "Cafeteria"], area: "Rohini", availability: "Not Available", popular: false, image: "https://images.unsplash.com/photo-1604328698692-f76ea9498e76?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
  { name: "Work & Beyond", address: "E-518 first floor Kocchar plaza near Ramphal Chowk dwark sector 7, Block E, Palam Extension, Palam, Delhi, 110077, India", city: "Delhi", price: "₹1,000/month", originalPrice: "₹1,250", gstPlanPrice: "₹1,000/month", mailingPlanPrice: "₹800/month", brPlanPrice: "₹1,175/month", rating: 4.5, reviews: 145, type: "Dedicated Desk", features: ["Airport Proximity", "Modern Amenities", "Meeting Rooms", "Parking"], area: "Dwarka", availability: "Available Now", popular: false, image: "https://res.cloudinary.com/drd4942mc/image/upload/v1767849615/chrome_8vkBaQth6g_idknvj.png" },
  { name: "Getset Spaces", address: "3rd Floor, LMR House, S-16, Block C, Green Park Extension, Green Park, New Delhi, Delhi 110016, India", city: "Delhi", price: "₹1,083/month", originalPrice: "₹1,333", gstPlanPrice: "₹1,083/month", mailingPlanPrice: "₹867/month", brPlanPrice: "₹1,275/month", rating: 4.6, reviews: 167, type: "Private Office", features: ["South Delhi", "Premium Facilities", "Networking", "Cafeteria"], area: "Green Park", availability: "Available Now", popular: true, image: "https://res.cloudinary.com/drd4942mc/image/upload/v1767849459/chrome_Bn0q3U4F3v_wx4jpa.png" },

  // Gurgaon
  { name: "Infrapro - Sector 44", address: "Plot no 4, 2nd floor, Minarch Tower, Sector 44, Gurugram, Haryana 122003, India", city: "Gurgaon", price: "₹1,000/month", originalPrice: "₹1,250", gstPlanPrice: "₹1,000/month", mailingPlanPrice: "₹667/month", brPlanPrice: "₹1,175/month", rating: 4.7, reviews: 178, type: "Dedicated Desk", features: ["Corporate Hub", "Modern Facilities", "Ample Parking", "Food Court"], area: "Sector 44", availability: "Available Now", popular: true, image: "https://shorturl.at/Fyr6o" },
  { name: "Palm Court - Gurgaon", address: "Mehrauli Rd, Gurugram, Haryana 122022, India", city: "Gurgaon", price: "₹1,000/month", originalPrice: "₹1,250", gstPlanPrice: "₹1,000/month", mailingPlanPrice: "₹750/month", brPlanPrice: "₹1,175/month", rating: 4.4, reviews: 134, type: "Hot Desk", features: ["Premium Location", "Creative Spaces", "Event Hosting", "Bike Parking"], area: "Mehrauli Road", availability: "Available Now", popular: false, image: "https://shorturl.at/Fyr6o" },

  // Himachal Pradesh
  { name: "Ghoomakkad", address: "V.P.o, Sidhbari, Rakkar, Himachal Pradesh 176057, India", city: "Dharamshala", price: "₹667/month", originalPrice: "₹833", gstPlanPrice: "₹667/month", mailingPlanPrice: "₹533/month", brPlanPrice: "₹783/month", rating: 4.6, reviews: 156, type: "Dedicated Desk", features: ["Mountain View", "Peaceful Environment", "Nature Workspace", "Wellness Programs"], area: "Sidhbari", availability: "Available Now", popular: false, image: "https://shorturl.at/LdEgA" },

  // Hyderabad
  { name: "Cabins 24/7", address: "h, 5/86, Golden Tulip Estate, JV Hills, HITEC City, Kondapur, Telangana 500081, India", city: "Hyderabad", price: "₹1,000/month", originalPrice: "₹1,083", gstPlanPrice: "₹1,000/month", mailingPlanPrice: "₹667/month", brPlanPrice: "₹1,175/month", rating: 4.3, reviews: 98, type: "Hot Desk", features: ["IT Hub", "Flexible Plans", "Community Events", "Gaming Area"], area: "Kondapur", availability: "Available Now", popular: false, image: "https://shorturl.at/S4XWY" },
  { name: "CS Coworking", address: "Door No. 1-60, A & B, 3rd Floor, KNR Square, opp. The Platina, Gachibowli, Hyderabad, Telangana 500032, India", city: "Hyderabad", price: "₹917/month", originalPrice: "₹1,167", gstPlanPrice: "₹917/month", mailingPlanPrice: "₹733/month", brPlanPrice: "₹1,083/month", rating: 4.5, reviews: 123, type: "Dedicated Desk", features: ["Tech Park", "Modern Infrastructure", "Parking", "Cafeteria"], area: "Gachibowli", availability: "Available Now", popular: true, image: "https://shorturl.at/NUpzM" },

  // Jaipur
  { name: "Jeev Business Solutions", address: "548 1, Tonk Rd, behind Jaipur Hospital, Mahaveer Nagar, Gopal Pura Mode, Jaipur, Rajasthan 302018, India", city: "Jaipur", price: "₹833/month", originalPrice: "₹1,000", gstPlanPrice: "₹833/month", mailingPlanPrice: "₹667/month", brPlanPrice: "₹1,000/month", rating: 4.4, reviews: 145, type: "Hot Desk", features: ["Central Location", "Budget Friendly", "WiFi", "Meeting Rooms"], area: "Tonk Road", availability: "Available Now", popular: false, image: "https://shorturl.at/Fyr6o" },

  // Jammu
  { name: "Qubicle Coworking", address: "Trikuta Nagar Ext 1/A", city: "Jammu", price: "₹1,000/month", originalPrice: "₹1,250", gstPlanPrice: "₹1,000/month", mailingPlanPrice: "₹667/month", brPlanPrice: "₹1,175/month", rating: 4.5, reviews: 89, type: "Hot Desk", features: ["Residential Area", "Quiet Environment", "Basic Amenities", "WiFi"], area: "Trikuta Nagar", availability: "Available Now", popular: false, image: "https://shorturl.at/S4XWY" },
  { name: "Kaytech Solutions", address: "Civil Airport, Satwari, Raipur Satwari, Jammu, Jammu and Kashmir 180003", city: "Jammu", price: "₹1,500/month", originalPrice: "₹1,833", gstPlanPrice: "₹1,500/month", mailingPlanPrice: "₹667/month", brPlanPrice: "₹1,767/month", rating: 4.6, reviews: 112, type: "Private Office", features: ["Airport Proximity", "Premium Amenities", "Parking", "Meeting Rooms"], area: "Satwari", availability: "Available Now", popular: true, image: "https://shorturl.at/NUpzM" },
];

async function seedDatabase() {
  try {
    console.log("Connecting to database...");
    await mongoose.connect(process.env.DB_URI as string);
    console.log("Connected to database successfully!");

    console.log("\nClearing existing data...");
    await CoworkingSpaceModel.deleteMany({});
    await VirtualOfficeModel.deleteMany({});
    console.log("Existing data cleared!");

    console.log("\nSeeding coworking spaces...");
    const insertedCoworkingSpaces = await CoworkingSpaceModel.insertMany(coworkingSpaces);
    console.log(`${insertedCoworkingSpaces.length} coworking spaces inserted!`);

    console.log("\nSeeding virtual offices...");
    const insertedVirtualOffices = await VirtualOfficeModel.insertMany(virtualOffices);
    console.log(`${insertedVirtualOffices.length} virtual offices inserted!`);

    console.log("\n✅ Database seeded successfully!");

    console.log("\nSummary:");
    console.log(`- Coworking Spaces: ${insertedCoworkingSpaces.length}`);
    console.log(`- Virtual Offices: ${insertedVirtualOffices.length}`);

    process.exit(0);
  } catch (error) {
    console.error("Error seeding database:", error);
    fs.writeFileSync("seed-error.log", `Error seeding database: ${error}\n${error instanceof Error ? error.stack : ''}`);
    process.exit(1);
  }
}

seedDatabase();
