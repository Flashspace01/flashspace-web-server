const mongoose = require('mongoose');
require('dotenv').config();

const popularCities = ['Ahmedabad', 'Bangalore', 'Chennai', 'Delhi', 'Gurgaon', 'Hyderabad', 'Mumbai', 'Noida', 'Pune'];
const otherCities = ['Agra', 'Aluva', 'Ambala', 'Amritsar', 'Bhopal', 'Chandigarh', 'Coimbatore', 'Faridabad', 'Ghaziabad', 'Indore', 'Jaipur', 'Kochi', 'Kolkata', 'Lucknow', 'Nagpur', 'Rajkot', 'Surat', 'Vadodara', 'Vijayawada', 'Visakhapatnam'];
const allCities = [...popularCities, ...otherCities];

async function checkCities() {
  await mongoose.connect(process.env.DB_URI);
  const Property = mongoose.model('Property', new mongoose.Schema({}, { strict: false }));
  
  const citiesWithoutSpaces = [];
  for (const city of allCities) {
    const count = await Property.countDocuments({ 
      'city': { $regex: new RegExp('^' + city + '$', 'i') }
    });
    if (count === 0) {
      citiesWithoutSpaces.push(city);
    }
  }
  console.log('Cities with NO spaces:', citiesWithoutSpaces);
  process.exit(0);
}
checkCities();
