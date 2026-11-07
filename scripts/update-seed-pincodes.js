const fs = require('fs');
const path = require('path');

const seedPath = path.resolve('ai-genrated/src/db/seed.ts');
let seedContent = fs.readFileSync(seedPath, 'utf-8').replace(/\r\n/g, '\n');

// 1. Add serviceablePincodes to imports
if (!seedContent.includes('serviceablePincodes')) {
  seedContent = seedContent.replace(
    '  cmsPages,\n} from "@/db/schema";',
    '  cmsPages,\n  serviceablePincodes,\n} from "@/db/schema";'
  );
}

// 2. Add seeding block for serviceablePincodes
if (!seedContent.includes('// Ensure Serviceable Pincodes exist')) {
  const pincodeSeedBlock = `
  // Ensure Serviceable Pincodes exist for Vadodara, Kalol, Gandhinagar, and Gujarat Express
  try {
    const existingPins = await db.select({ id: serviceablePincodes.id }).from(serviceablePincodes).limit(1);
    if (existingPins.length === 0) {
      const allStores = await db.select().from(stores);
      const mandviStore = allStores.find(s => s.name.toLowerCase().includes("mandvi")) || allStores[0];
      const alkapuriStore = allStores.find(s => s.name.toLowerCase().includes("alkapuri")) || mandviStore;
      const kalolStore = allStores.find(s => s.name.toLowerCase().includes("kalol")) || mandviStore;
      const rupalStore = allStores.find(s => s.name.toLowerCase().includes("rupal")) || kalolStore;
      const ahmedabadStore = allStores.find(s => s.name.toLowerCase().includes("cg road") || s.name.toLowerCase().includes("ahmedabad")) || mandviStore;

      const defaultPincodeList = [
        // Vadodara Core Urban (Mandvi & Alkapuri) - Same Day Hot & Fresh
        { pincode: "390001", storeId: mandviStore?.id || 1, city: "Vadodara (Mandvi / City)", deliveryCharge: 49, estimatedDeliveryTime: "Today by 6:30 PM", isExpress: true },
        { pincode: "390002", storeId: mandviStore?.id || 1, city: "Vadodara (Fatehgunj)", deliveryCharge: 49, estimatedDeliveryTime: "Today by 6:30 PM", isExpress: true },
        { pincode: "390004", storeId: mandviStore?.id || 1, city: "Vadodara (Karelibaug)", deliveryCharge: 49, estimatedDeliveryTime: "Today by 6:30 PM", isExpress: true },
        { pincode: "390005", storeId: mandviStore?.id || 1, city: "Vadodara (Pratapnagar)", deliveryCharge: 49, estimatedDeliveryTime: "Today by 6:30 PM", isExpress: true },
        { pincode: "390006", storeId: alkapuriStore?.id || 2, city: "Vadodara (Sayajigunj)", deliveryCharge: 49, estimatedDeliveryTime: "Today by 6:30 PM", isExpress: true },
        { pincode: "390007", storeId: alkapuriStore?.id || 2, city: "Vadodara (Alkapuri / Akota)", deliveryCharge: 49, estimatedDeliveryTime: "Today by 6:30 PM", isExpress: true },
        { pincode: "390008", storeId: mandviStore?.id || 1, city: "Vadodara (Waghodia Road)", deliveryCharge: 49, estimatedDeliveryTime: "Today by 6:30 PM", isExpress: true },
        { pincode: "390011", storeId: mandviStore?.id || 1, city: "Vadodara (Makarpura)", deliveryCharge: 49, estimatedDeliveryTime: "Today by 6:30 PM", isExpress: true },
        { pincode: "390012", storeId: alkapuriStore?.id || 2, city: "Vadodara (Gotri)", deliveryCharge: 49, estimatedDeliveryTime: "Today by 6:30 PM", isExpress: true },
        { pincode: "390015", storeId: alkapuriStore?.id || 2, city: "Vadodara (Vasna)", deliveryCharge: 49, estimatedDeliveryTime: "Today by 6:30 PM", isExpress: true },
        { pincode: "390019", storeId: mandviStore?.id || 1, city: "Vadodara (Manjalpur)", deliveryCharge: 49, estimatedDeliveryTime: "Today by 6:30 PM", isExpress: true },
        { pincode: "390020", storeId: alkapuriStore?.id || 2, city: "Vadodara (Subhanpura)", deliveryCharge: 49, estimatedDeliveryTime: "Today by 6:30 PM", isExpress: true },
        { pincode: "390021", storeId: alkapuriStore?.id || 2, city: "Vadodara (Sevasi)", deliveryCharge: 49, estimatedDeliveryTime: "Today by 6:30 PM", isExpress: true },
        { pincode: "390022", storeId: mandviStore?.id || 1, city: "Vadodara (Harni)", deliveryCharge: 49, estimatedDeliveryTime: "Today by 6:30 PM", isExpress: true },
        { pincode: "390024", storeId: mandviStore?.id || 1, city: "Vadodara (Sama)", deliveryCharge: 49, estimatedDeliveryTime: "Today by 6:30 PM", isExpress: true },
        { pincode: "390025", storeId: alkapuriStore?.id || 2, city: "Vadodara (Tandalja)", deliveryCharge: 49, estimatedDeliveryTime: "Today by 6:30 PM", isExpress: true },
        
        // Kalol & Gandhinagar Region
        { pincode: "382721", storeId: kalolStore?.id || 1, city: "Kalol (Navjivan Center)", deliveryCharge: 49, estimatedDeliveryTime: "Today by 5:00 PM", isExpress: true },
        { pincode: "382630", storeId: rupalStore?.id || kalolStore?.id || 1, city: "Gandhinagar (Rupal)", deliveryCharge: 49, estimatedDeliveryTime: "Today by 5:00 PM", isExpress: true },
        { pincode: "382010", storeId: rupalStore?.id || kalolStore?.id || 1, city: "Gandhinagar (Sector 1-10)", deliveryCharge: 59, estimatedDeliveryTime: "Tomorrow Morning", isExpress: true },
        { pincode: "382016", storeId: rupalStore?.id || kalolStore?.id || 1, city: "Gandhinagar (Infocity / Kudasan)", deliveryCharge: 59, estimatedDeliveryTime: "Tomorrow Morning", isExpress: true },

        // Ahmedabad Region (CG Road)
        { pincode: "380001", storeId: ahmedabadStore?.id || 1, city: "Ahmedabad (Old City / Bhadra)", deliveryCharge: 59, estimatedDeliveryTime: "Within 24 Hours", isExpress: true },
        { pincode: "380006", storeId: ahmedabadStore?.id || 1, city: "Ahmedabad (Ellisbridge)", deliveryCharge: 59, estimatedDeliveryTime: "Within 24 Hours", isExpress: true },
        { pincode: "380009", storeId: ahmedabadStore?.id || 1, city: "Ahmedabad (CG Road / Navrangpura)", deliveryCharge: 59, estimatedDeliveryTime: "Today by 7:00 PM", isExpress: true },
        { pincode: "380015", storeId: ahmedabadStore?.id || 1, city: "Ahmedabad (Satellite / Bodakdev)", deliveryCharge: 59, estimatedDeliveryTime: "Within 24 Hours", isExpress: true },
        { pincode: "380054", storeId: ahmedabadStore?.id || 1, city: "Ahmedabad (Thaltej / SG Highway)", deliveryCharge: 59, estimatedDeliveryTime: "Within 24 Hours", isExpress: true },

        // Express Network (Surat & Anand)
        { pincode: "395001", storeId: mandviStore?.id || 1, city: "Surat (Ring Road)", deliveryCharge: 70, estimatedDeliveryTime: "Within 24-36 Hours", isExpress: false },
        { pincode: "395007", storeId: mandviStore?.id || 1, city: "Surat (Athwa Lines)", deliveryCharge: 70, estimatedDeliveryTime: "Within 24-36 Hours", isExpress: false },
        { pincode: "388001", storeId: mandviStore?.id || 1, city: "Anand (Vidyanagar Road)", deliveryCharge: 60, estimatedDeliveryTime: "Within 24-36 Hours", isExpress: false },
      ];

      for (const p of defaultPincodeList) {
        try {
          await db.insert(serviceablePincodes).values({
            pincode: p.pincode,
            storeId: p.storeId,
            city: p.city,
            state: "Gujarat",
            deliveryEnabled: true,
            deliveryCharge: p.deliveryCharge,
            minimumOrder: 0,
            estimatedDeliveryTime: p.estimatedDeliveryTime,
            isExpress: p.isExpress,
          });
        } catch {}
      }
    }
  } catch (pinErr) {
    console.warn("[Serviceable Pincodes Seed Notice]", pinErr);
  }
`;

  seedContent = seedContent.replace(
    '  // Ensure 9 Customers exist',
    `${pincodeSeedBlock}\n  // Ensure 9 Customers exist`
  );
}

fs.writeFileSync(seedPath, seedContent, 'utf-8');
console.log('Successfully updated seed.ts');
