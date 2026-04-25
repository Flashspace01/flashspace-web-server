import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcryptjs';

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

async function seed() {
    try {
        await mongoose.connect(process.env.DB_URI || 'mongodb://127.0.0.1:27017/flash');
        console.log('Connected to DB...');
        
        const defaultPasswordHash = await bcrypt.hash('Flash@2026', 12);

        for (const p of partners) {
            console.log(`\nProcessing: ${p.space_name} (${p.email})`);
            
            // 1. Find or Create User
            let user = await mongoose.connection.db!.collection('users').findOne({ email: p.email.toLowerCase() });
            
            if (!user) {
                const newUser = {
                    email: p.email.toLowerCase(),
                    password: defaultPasswordHash,
                    fullName: p.partner_name === 'NA' ? p.space_name : p.partner_name,
                    phoneNumber: p.mobile_number === 'NA' ? '' : p.mobile_number.split('/')[0].trim(),
                    role: 'partner',
                    isEmailVerified: true,
                    kycVerified: true,
                    authProvider: 'local',
                    isDeleted: false,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                const res = await mongoose.connection.db!.collection('users').insertOne(newUser);
                user = { ...newUser, _id: res.insertedId };
                console.log(`- Created User: ${user._id}`);
            } else {
                console.log(`- User already exists: ${user._id}`);
            }

            // 2. Find Property and Link
            const property = await mongoose.connection.db!.collection('properties').findOne({ 
                $or: [
                    { name: p.space_name },
                    { name: new RegExp(p.space_name.split(' - ')[0], 'i') },
                    { address: new RegExp(p.address.slice(0, 20), 'i') }
                ]
            });

            if (property) {
                await mongoose.connection.db!.collection('properties').updateOne(
                    { _id: property._id },
                    { $set: { partner: user._id } }
                );
                console.log(`- Linked to Property: ${property.name} (${property._id})`);
                
                // 3. Link Spaces belonging to this property
                const coworkingRes = await mongoose.connection.db!.collection('coworkingspaces').updateMany(
                    { property: property._id },
                    { $set: { partnerId: user._id } }
                );
                console.log(`- Updated ${coworkingRes.modifiedCount} CoworkingSpaces`);

                const virtualRes = await mongoose.connection.db!.collection('virtualoffices').updateMany(
                    { property: property._id },
                    { $set: { partnerId: user._id } }
                );
                console.log(`- Updated ${virtualRes.modifiedCount} VirtualOffices`);
                
                const meetingRes = await mongoose.connection.db!.collection('meetingrooms').updateMany(
                    { property: property._id },
                    { $set: { partnerId: user._id } }
                );
                console.log(`- Updated ${meetingRes.modifiedCount} MeetingRooms`);

            } else {
                console.warn(`- !!! NO PROPERTY FOUND for ${p.space_name}`);
            }
        }

        console.log('\nSeed completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Seed failed:', err);
        process.exit(1);
    }
}

seed();
