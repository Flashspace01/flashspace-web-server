const fs = require('fs');
const path = require('path');

const csvPath = 'c:\\Users\\Aayush\\OneDrive\\Desktop\\flashspace\\FlashSpace-web-client\\src\\excel\\93141be7-8c47-441e-b3d6-4e5a698151be.csv';
const content = fs.readFileSync(csvPath, 'utf8');

// Basic CSV parser that handles quotes and newlines
function parseCSV(content) {
    const rows = [];
    let currentCell = '';
    let inQuotes = false;
    let currentRow = [];
    
    for (let i = 0; i < content.length; i++) {
        const char = content[i];
        const nextChar = content[i + 1];
        
        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                currentCell += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            currentRow.push(currentCell.trim());
            currentCell = '';
        } else if (char === '\n' && !inQuotes) {
            currentRow.push(currentCell.trim());
            if (currentRow.some(c => c !== '')) rows.push(currentRow);
            currentRow = [];
            currentCell = '';
        } else if (char === '\r' && !inQuotes) {
            // skip
        } else {
            currentCell += char;
        }
    }
    if (currentCell !== '' || currentRow.length > 0) {
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
    }
    return rows;
}

const lines = parseCSV(content);
const header = lines[0];

const coworkingData = [];
const virtualOfficeData = [];

for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    if (!row || row.length < 2) continue;
    
    const obj = {};
    header.forEach((h, idx) => {
        obj[h] = row[idx];
    });

    const name = obj['Task Name'];
    const spaceId = obj['SPACE ID (short text)'];
    const address = obj['Address (short text)'];
    const location = obj['Location (labels)'] || '';
    const city = location.replace(/[\[\]]/g, '').trim();

    if (!name || city === '[]' || !city) continue;

    // CW Data
    const cwPriceRaw = obj['Coworking / Month (currency)'];
    const cwPrice = cwPriceRaw ? `₹${cwPriceRaw}/month` : '₹0/month';
    
    coworkingData.push({
        name,
        spaceId,
        address,
        city,
        price: cwPrice,
        originalPrice: cwPrice,
        rating: 4.5,
        reviews: 120,
        features: ["High-Speed WiFi", "Meeting Rooms", "Coffee Bar", "24/7 Access"],
        area: city, // Fallback
        image: "",
        popular: false,
        type: "Hot Desk"
    });

    // VO Data
    const gstPrice = obj['GST Plan - Pricing  (currency)'];
    const brPrice = obj['BR Plan - Pricing  (currency)'];
    const mailingPrice = obj['Mailing Plan - Pricing (currency)'];

    virtualOfficeData.push({
        name,
        gstPlanPrice: gstPrice ? `₹${gstPrice}/year` : '₹0/year',
        mailingPlanPrice: mailingPrice ? `₹${mailingPrice}/year` : '₹0/year',
        brPlanPrice: brPrice ? `₹${brPrice}/year` : '₹0/year'
    });
}

const output = `
const coworkingDataRaw = ${JSON.stringify(coworkingData, null, 2)};

const virtualOfficeDataRaw = ${JSON.stringify(virtualOfficeData, null, 2)};
`;

fs.writeFileSync(path.join(__dirname, 'parsed_data.json'), JSON.stringify({ coworkingData, virtualOfficeData }, null, 2));
console.log('Successfully parsed ' + lines.length + ' lines into parsed_data.json');
