import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { UserModel, UserRole, AuthProvider } from "../flashspaceWeb/authModule/models/user.model";
import { PropertyModel } from "../flashspaceWeb/propertyModule/property.model";

dotenv.config();

const PARTNERS_DATA = [
  {
    "space_name": "Sweet Spot Spaces",
    "partner_name": "RASHMIKANT G. DAVE",
    "email": "sweetspotspaces@gmail.com",
    "mobile_number": "+91 9998615652",
    "address": "Office No 4-D fourth, Vardaan Complex, Tower, Lakhudi Rd, near SARDAR PATEL STADIUM, Vithalbhai Patel Colony, Nathalal Colony, Navrangpura, Ahmedabad, Gujarat 380009, India"
  },
  {
    "space_name": "RegisterKaro",
    "partner_name": "Rupesh",
    "email": "rupeshrai@registerkaro.com",
    "mobile_number": "92117 05920",
    "address": "Block-A, 606 Prahladnagar Trade Center, B/H Titanium City Center, Vejalpur, Ahmedabad, Gujarat, 380051"
  },
  {
    "space_name": "IndiraNagar - Aspire Coworks",
    "partner_name": "Amrutha",
    "email": "aspirecoworkings@gmail.com",
    "mobile_number": "+91 97410 06431",
    "address": "17, 7th Main Rd, Indira Nagar II Stage, Hoysala Nagar, Indiranagar, Bengaluru, Karnataka 560038, India"
  },
  {
    "space_name": "Koramangala - Aspire Coworks",
    "partner_name": "Amrutha",
    "email": "aspirecoworkings@gmail.com",
    "mobile_number": "+91 97410 06431",
    "address": "2nd & 3rd Floor, Balaji Arcade, 472/7, 20th L Cross Rd, 4th Block, Koramangala, Bengaluru, Karnataka 560095, India"
  },
  {
    "space_name": "EcoSpace - Hebbal, HMT Layout",
    "partner_name": "Deepshika Prajapati",
    "email": "ecospaceblr@gmail.com",
    "mobile_number": "+91 99022 03312",
    "address": "No,33, 4th Floor, 1st Main, CBI Main Rd, HMT Layout, Ganganagar, Bengaluru, Karnataka 560032, India"
  },
  {
    "space_name": "RegisterKaro",
    "partner_name": "Rupesh",
    "email": "rupeshrai@registerkaro.com",
    "mobile_number": "92117 05920",
    "address": "Unit 101, Oxford Towers, No. 139 Old Airport Road, Bengaluru-560008"
  },
  {
    "space_name": "WorkYard CWS",
    "partner_name": "Hemant Goyal",
    "email": "accounts@goyco.org",
    "mobile_number": "6283381098/6283381092",
    "address": "Plot No 337, Phase, 2, Industrial Area Phase II, Chandigarh, 160002, India"
  },
  {
    "space_name": "Senate Space",
    "partner_name": "Munwar Sharif",
    "email": "senatecmo@gmail.com",
    "mobile_number": "+91 99406 27628",
    "address": "W-126, 3rd Floor, 3rd Ave, Anna Nagar, Chennai, Tamil Nadu 600040, India"
  },
  {
    "space_name": "Qube Spaces",
    "partner_name": "Anuvrat Jain",
    "email": "cc_krb@rediffmail.com",
    "mobile_number": "7828175700, 9074990900",
    "address": "QUBE, Dhruv Banerjee Pathlab, 97, TP Nagar Rd, in front of New Delhi Sweets, Indira Commercial Complex, Korba, Transport Nagar, Chhattisgarh 495677, India"
  },
  {
    "space_name": "Vision Cowork",
    "partner_name": "Mohit",
    "email": "virtualxcelsolutions@gmail.com",
    "mobile_number": "+91 98710 01079",
    "address": "Lower Ground Floor, Saket Salcon, Rasvilas, next to Select Citywalk Mall, Saket District Centre, District Centre, Sector 6, Pushp Vihar, Mal, New Delhi, Delhi 110017, India"
  },
  {
    "space_name": "WBB Office",
    "partner_name": "Belsy",
    "email": "Info@wbboffice.com",
    "mobile_number": "+91 77360 78198",
    "address": "Office no. 102, 52A first floor, Vijay Block, Block E, Laxmi Nagar, Delhi, 110092, India"
  },
  {
    "space_name": "Budha Coworking Spaces",
    "partner_name": "Sandeep Dahiya",
    "email": "sam.602825@gmail.com",
    "mobile_number": "+91 95829 08218",
    "address": "3rd floor, H.no 33, Pocket 5, Sector-24, Rohini, Delhi, 110085, India"
  },
  {
    "space_name": "RegisterKaro",
    "partner_name": "Rupesh",
    "email": "rupeshrai@registerkaro.com",
    "mobile_number": "92117 05920",
    "address": "808B, DLF Prime Tower, Pocket F, Okhla Phase I, Okhla Industrial Estate, New Delhi, Delhi 110020"
  },
  {
    "space_name": "Infrapro - Sector 44",
    "partner_name": "Nitesh",
    "email": "nitish@infraprospaces.com",
    "mobile_number": "+91 97168 38138",
    "address": "Plot no 4, 2nd floor, Minarch Tower, Sector 44, Gurugram, Haryana 122003, India"
  },
  {
    "space_name": "The Work Lounge",
    "partner_name": "Manoj",
    "email": "theworkloungen@gmail.com",
    "mobile_number": "98181 01044",
    "address": "2nd floor, Welldone tech park, 213 14, Badshahpur Sohna Rd, Sector 48, Gurugram, Haryana 122018"
  },
  {
    "space_name": "Ghoomakkad",
    "partner_name": "mohinder sharma",
    "email": "info@ghoomakad.com",
    "mobile_number": "+91 98822 26638",
    "address": "V.P.o, Sidhbari, Rakkar, Himachal Pradesh 176057, India"
  },
  {
    "space_name": "CS Coworking - GachiBowli",
    "partner_name": "Gopaldas Agarwal, Nisha, Manasa",
    "email": "coworkingspaces.hyd@gmail.com",
    "mobile_number": "+91 9849019209,  9963005341, 8309665334",
    "address": "Door No. 1-60, A & B, 3rd Floor, KNR Square, opp. The Platina, Gachibowli, Hyderabad, Telangana 500032, India"
  },
  {
    "space_name": "Jeev Business Solutions",
    "partner_name": "Meena",
    "email": "jeevbusinesssolutions@gmail.com",
    "mobile_number": "+91 63782 15643",
    "address": "548 1, Tonk Rd, behind Jaipur Hospital, Mahaveer Nagar, Gopal Pura Mode, Jaipur, Rajasthan 302018, India"
  },
  {
    "space_name": "Qubicle Coworking",
    "partner_name": "Aditya",
    "email": "qubiclecoworking@gmail.com",
    "mobile_number": "+91 97973 34866",
    "address": "Plot 334, Lakkar Mandi Rd, opposite PNB Bank, Sector 1A, Trikuta Nagar, Jammu, Jammu and Kashmir 180012"
  },
  {
    "space_name": "Namdhari Spaces- Ranchi",
    "partner_name": "Prabhji Namdhari",
    "email": "prabhji@namdharigroup.co.in",
    "mobile_number": "8651140092",
    "address": "4001, 4th floor, Skyline Complex, Kadru, Ranchi, Jharkhand 834002, India"
  },
  {
    "space_name": "Apnayt Coworkers",
    "partner_name": "Ashish Gupta",
    "email": "apnayt.coworker@gmail.com",
    "mobile_number": "+91 77425 28001",
    "address": "Apnayt Coworker J1-371 RIICO Sangaria, Industrial Area Phase, IInd, Jodhpur, Rajasthan 342013, India"
  },
  {
    "space_name": "WBB Office",
    "partner_name": "Belsy",
    "email": "Info@wbboffice.com",
    "mobile_number": "+91 77360 78198",
    "address": "E 3rd Floor, JC Chamber, Building No v8 ,60/49, Panampilly Nagar, Kochi, Kerala 682036, India"
  },
  {
    "space_name": "Kommon Spaces",
    "partner_name": "Shahin Abdullah",
    "email": "kommonspace@gmail.com",
    "mobile_number": "NA",
    "address": "1st Floor, Sowbhagya building, Kollamkudimugal, Athani, Kochi, Kakkanad, Kerala 682030"
  },
  {
    "space_name": "Camac Street - WorkZone",
    "partner_name": "Faizan",
    "email": "Info@workzoneofficespaces.com",
    "mobile_number": "+91 96811 12394",
    "address": "11th floor, Industry House, 10, Camac St, Elgin, Kolkata, West Bengal 700017, India"
  },
  {
    "space_name": "Park Street - Workzone",
    "partner_name": "Faizan",
    "email": "Info@workzoneofficespaces.com",
    "mobile_number": "+91 96811 12394",
    "address": "7th floor, Om Tower, 32, JL nehru road, Park St, Kolkata, West Bengal 700071, India"
  },
  {
    "space_name": "Near Victoria Memorial - WorkZone",
    "partner_name": "Rupsa Chakraborty",
    "email": "Info@workzoneofficespaces.com",
    "mobile_number": "+91 98754 48425",
    "address": "Circus Ave, Kolkata, West Bengal, India"
  },
  {
    "space_name": "Salt Lake, Sec V - EasyDaftar",
    "partner_name": "Arbani Saha",
    "email": "virtual@easydaftar.in",
    "mobile_number": "+91 98744 48233",
    "address": "CK 233, CK Block, Sector 2, Salt lake, Kolkata, West Bengal 700091"
  },
  {
    "space_name": "Salt Lake, Sec V - Workzone",
    "partner_name": "Faizan",
    "email": "Info@workzoneofficespaces.com",
    "mobile_number": "+91 96811 12394",
    "address": "Block, D2, EP & GP, 2, GP Block, Sector V, Bidhannagar, Kolkata, West Bengal 700091, India"
  },
  {
    "space_name": "Park Street - EasyDaftar",
    "partner_name": "Arbani Saha",
    "email": "virtual@easydaftar.in",
    "mobile_number": "+91 98744 48233",
    "address": "3 rd Floor, 75C, Park St, Taltala, Kolkata, West Bengal 700016, India"
  },
  {
    "space_name": "Rashbehari - EasyDaftar",
    "partner_name": "Arbani Saha",
    "email": "virtual@easydaftar.in",
    "mobile_number": "+91 98744 48233",
    "address": "132A, Shyama Prasad Mukherjee Rd, Anami Sangha, Kalighat, Kolkata, West Bengal 700026, India"
  },
  {
    "space_name": "Louden Street - EasyDaftar",
    "partner_name": "Arbani Saha",
    "email": "virtual@easydaftar.in",
    "mobile_number": "+91 98744 48233",
    "address": "8/1/2 Loudon Street, 3rd Floor. Surabhi Building, 8/1, Sir UN Brahmachari Sarani, Elgin, Kolkata, West Bengal 700017"
  },
  {
    "space_name": "365Virtualcoworks",
    "partner_name": "Sanskar",
    "email": "365virtualcoworks@gmail.com",
    "mobile_number": "75810 73435",
    "address": "7th floor, Aaditya gateway, scheme B-704, MR 10 Rd, Sukhliya, Indore, Madhya Pradesh 452010"
  },
  {
    "space_name": "CynergX",
    "partner_name": "Basant",
    "email": "mohit.shrivastava@cynergx.com",
    "mobile_number": "755 352 4116",
    "address": "E4, 271, E-4, Arera Colony, Bhopal, Madhya Pradesh 462016"
  },
  {
    "space_name": "RegisterKaro",
    "partner_name": "Rupesh",
    "email": "rupeshrai@registerkaro.com",
    "mobile_number": "92117 05920",
    "address": "LODHA SIGNET 1 UNIT NO. 825 PREMIER COLONY GROUND KALYAN THANE Mangaon 421204"
  },
  {
    "space_name": "SS Spaces",
    "partner_name": "Arun Ranga",
    "email": "ssspacesindia@gmail.com",
    "mobile_number": "99168 49069",
    "address": "2 Maruthi complex, Maruthi temple circle, TK layout, Saraswathipuram, Mysuru, Karnataka 570009"
  },
  {
    "space_name": "Sector 63, Noida - Crystaa",
    "partner_name": "Ankit",
    "email": "crystatower@gmail.com",
    "mobile_number": "+91 92660 14881",
    "address": "63m, Ivent, C-030, C Block, Sector 63, Noida, Hazratpur Wajidpur, Uttar Pradesh 201309, India"
  },
  {
    "space_name": "Workshala- sector 3",
    "partner_name": "Vicky Shah/Surabhi",
    "email": "mohitbhargav28@gmail.com",
    "mobile_number": "+91 84593 80001",
    "address": "D-9, Vyapar Marg, Block D, Noida Sector 3, Noida, Uttar Pradesh 201301, India"
  },
  {
    "space_name": "Oplus Cowork",
    "partner_name": "Jiya Verma",
    "email": "connect@opluscowork.com",
    "mobile_number": "+91 70702 90470",
    "address": "J366+73C, 3rd floor, RK Niwas, Bailey Rd, Rupaspur, Ramjaipal Nagar, Danapur Nizamat, Patna, Bihar 801503, India"
  },
  {
    "space_name": "RegisterKaro",
    "partner_name": "Rupesh",
    "email": "rupeshrai@registerkaro.com",
    "mobile_number": "92117 05920",
    "address": "Office No. 715, Seventh Floor, Blok D&E, Chandigarh Citi center, VIP Road, Zirakpur, Punjab, India-140603"
  },
  {
    "space_name": "CoSpaces",
    "partner_name": "Abhishek Bhatt",
    "email": "alpineabhishek@gmail.com",
    "mobile_number": "+91 84301 21626",
    "address": "75/1, Shiv Nagar, Araghar, Dalanwala, Dehradun, Uttarakhand 248001, India"
  },
  {
    "space_name": "Stirring Minds",
    "partner_name": "Pratik Dey",
    "email": "Team@stirringminds.com",
    "mobile_number": "+91 60021 11457",
    "address": "Kundan Mansion, 2-A/3, Asaf Ali Rd, Turkman Gate, New Delhi, Delhi, 110002, India"
  },
  {
    "space_name": "Namdhari Spaces,zirakpur",
    "partner_name": "Prabhji Namdhari",
    "email": "prabhji@namdharigroup.co.in",
    "mobile_number": "8651140092",
    "address": "D9, CCC, VIP Rd, Zirakpur, Punjab 140603"
  }
];

async function seedPartners() {
  try {
    console.log("Connecting to database...");
    const dbUri = process.env.DB_URI || "mongodb://127.0.0.1:27017/flash";
    await mongoose.connect(dbUri);
    console.log("Connected successfully to DB!");

    for (const item of PARTNERS_DATA) {
      const { email, partner_name, address, space_name, mobile_number } = item;
      
      console.log(`\nProcessing: ${partner_name} (${email}) for space: ${space_name}`);

      // 1. Create or Find User
      let user = await UserModel.findOne({ email: email.toLowerCase() });
      
      const hashedPassword = await bcrypt.hash(email, 12);

      if (!user) {
        console.log(`- Creating new user account with phone: ${mobile_number}...`);
        user = await UserModel.create({
          fullName: partner_name,
          email: email.toLowerCase(),
          password: hashedPassword,
          phoneNumber: mobile_number,
          role: UserRole.PARTNER,
          isEmailVerified: true,
          kycVerified: true,
          isActive: true,
          authProvider: AuthProvider.LOCAL
        });
      } else {
        console.log(`- User already exists, updating role, flags and phone: ${mobile_number}...`);
        user.role = UserRole.PARTNER;
        user.isEmailVerified = true;
        user.kycVerified = true;
        user.isActive = true;
        user.fullName = partner_name;
        user.phoneNumber = mobile_number;
        user.password = hashedPassword;
        await user.save();
      }

      // 2. Find Property by Address and Update Partner
      const property = await PropertyModel.findOne({ 
        address: { $regex: new RegExp(address.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') } 
      });

      if (property) {
        console.log(`- Found property at address. Updating partner field...`);
        property.partner = user._id as any;
        await property.save();
        console.log(`- SUCCESS: Property "${property.name}" linked to partner "${partner_name}"`);
      } else {
        const propertyByName = await PropertyModel.findOne({ 
          name: { $regex: new RegExp(space_name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') } 
        });
        
        if (propertyByName) {
          console.log(`- Address match failed, but found property by name "${space_name}". Updating partner...`);
          propertyByName.partner = user._id as any;
          await propertyByName.save();
          console.log(`- SUCCESS: Property "${propertyByName.name}" linked to partner "${partner_name}"`);
        } else {
          console.warn(`- WARNING: Could not find property with address: "${address}" or name: "${space_name}"`);
        }
      }
    }

    console.log("\nAll partner seed operations with mobile numbers completed.");
    process.exit(0);
  } catch (error) {
    console.error("Error during seeding:", error);
    process.exit(1);
  }
}

seedPartners();
