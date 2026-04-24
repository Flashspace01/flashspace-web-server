import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const partners = [
  {
    "space_name": "Workzone - Ahmedabad",
    "partner_name": "Aditya",
    "email": "info@workzoneofficespaces.com",
    "mobile_number": "96623 23623",
    "address": "World Trade Tower, Makarba, Ahmedabad, Gujarat 380051, India"
  },
  {
    "space_name": "Laksh Space - Hebbal, HMT layout",
    "partner_name": "SUNIL",
    "email": "Lakshspaceblr@gmail.com",
    "mobile_number": "9036395566/7204910856",
    "address": "No,33, 1st Floor, 1st Main, CBI Main Rd, HMT Layout, Ganganagar, Bengaluru, Karnataka 560032, India"
  },
  {
    "space_name": "WBB Office (Chennai)",
    "partner_name": "Belsy",
    "email": "info@wbboffice.com",
    "mobile_number": "8589880002",
    "address": "Room no 1 No. 19, Metro Station, 35, Anna Salai, near Little Mount, Little Mount, Nandanam, Chennai, Tamil Nadu 600015, India"
  },
  {
    "space_name": "CP Alt F",
    "partner_name": "Karan",
    "email": "connect@altfspaces.com",
    "mobile_number": "98215 40062",
    "address": "J6JF+53C, Connaught Lane, Barakhamba, New Delhi, Delhi 110001, India"
  },
  {
    "space_name": "Mytime Cowork",
    "partner_name": "NA",
    "email": "sales@mytimeco.work",
    "mobile_number": "NA",
    "address": "55 Lane-2, Westend Marg, Saiyad Ul Ajaib Village, Saket, New Delhi, Delhi 110030, India"
  },
  {
    "space_name": "Okhla Alt F",
    "partner_name": "Divya",
    "email": "connect@altfspaces.com",
    "mobile_number": "98215 73002",
    "address": "101, NH-19, CRRI, Ishwar Nagar, Okhla, New Delhi, Delhi 110044, India"
  },
  {
    "space_name": "TEAM COWORK- Palm Court - Gurgaon",
    "partner_name": "Iffath",
    "email": "virtualoffice@teamco.work",
    "mobile_number": "88002 09527",
    "address": "Mehrauli Rd, Gurugram, Haryana 122022, India"
  },
  {
    "space_name": "CS Coworking - Whitefield Kondapur",
    "partner_name": "NA",
    "email": "info@cscoworkingspaces.com",
    "mobile_number": "98490 19209",
    "address": "Doc Bhavan, Hitech City Rd, Kondapur, Whitefields, Gachibowli, Hyderabad, Telangana 500084"
  },
  {
    "space_name": "Spacehive",
    "partner_name": "NA",
    "email": "info@spazehive.com",
    "mobile_number": "NA",
    "address": "4263, Anjikathu Rd, CSEZ, Chittethukara, Kakkanad, Kochi, Kerala 682037, India"
  },
  {
    "space_name": "Kommon Spaces",
    "partner_name": "Shahin Abdullah",
    "email": "kommonspace@gmail.com",
    "mobile_number": "96336 11224",
    "address": "1st Floor, Sowbhagya building, Kollamkudimugal, Athani, Kochi, Kakkanad, Kerala 682030"
  },
  {
    "space_name": "Divine Coworking",
    "partner_name": "Sanjana",
    "email": "info@divinecoworking.com",
    "mobile_number": "9067675558",
    "address": "Cosmos gardens, Plot no. 26, next to Foundree Preschool Road, near Cafe Peter, Baner, Pune, Maharashtra 411069, India"
  }
];

async function checkNames() {
    try {
        await mongoose.connect(process.env.DB_URI || 'mongodb://127.0.0.1:27017/flash');
        console.log('Connected to DB...');
        
        for (const p of partners) {
            const property = await mongoose.connection.db!.collection('properties').findOne({ 
                $or: [
                    { name: p.space_name },
                    { name: new RegExp(p.space_name.split(' - ')[0], 'i') }
                ]
            });
            console.log(`Searching for "${p.space_name}": ${property ? 'FOUND (' + property.name + ')' : 'NOT FOUND'}`);
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkNames();
