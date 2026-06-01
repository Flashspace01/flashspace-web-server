const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const publicDir = path.join(__dirname, '../../../FlashSpace-web-client/public');
const imagesToUpload = [
  'home2.jpg', 'home3.jpg', 'home4.jpg', 'home5.png', 'home6.png', 'home7.png', 'home9.png', 'home10.jpg',
  'card-koramangala.jpg', 'card-lower-parel.jpg', 'card-connaught-place.jpg', 'card-andheri.avif',
  'card-bkc.jpg', 'card-nehru-place.jpg', 'feature-business-setup.jpg', 'feature-virtual-offices.jpg',
  'feature-global-access.jpg', 'feature-coworking.jpg', 'card-gurgaon.jpg', 'card-hinjewadi.jpg',
  'heroimage.png', 'business1.png', 'business2.png', 'business3.png', 'business4.png', 'business5.png'
];

async function uploadImages() {
  const mapping = {};
  for (const img of imagesToUpload) {
    const imgPath = path.join(publicDir, img);
    if (fs.existsSync(imgPath)) {
      console.log(`Uploading ${img}...`);
      try {
        const result = await cloudinary.uploader.upload(imgPath, {
          folder: 'flashspace_homepage'
        });
        mapping['/' + img] = result.secure_url;
      } catch (err) {
        console.error(`Failed to upload ${img}:`, err);
      }
    } else {
        console.log(`File not found: ${img}`);
    }
  }
  
  // Save mapping to a file
  const outPath = path.join(__dirname, 'upload_mapping.json');
  fs.writeFileSync(outPath, JSON.stringify(mapping, null, 2));
  console.log(`Mapping saved to ${outPath}`);
}

uploadImages();
