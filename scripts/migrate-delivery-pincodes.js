const fs = require('fs');
const path = require('path');

// 1. Update schema.ts
const schemaPath = path.resolve('ai-genrated/src/db/schema.ts');
let schemaContent = fs.readFileSync(schemaPath, 'utf-8').replace(/\r\n/g, '\n');

// Add fields to addresses
if (!schemaContent.includes('latitude: decimal("latitude"')) {
  schemaContent = schemaContent.replace(
    '  gstin: varchar("gstin", { length: 20 }),\n});',
    '  gstin: varchar("gstin", { length: 20 }),\n  latitude: decimal("latitude", { precision: 10, scale: 6 }),\n  longitude: decimal("longitude", { precision: 10, scale: 6 }),\n  addressType: varchar("address_type", { length: 20 }).notNull().default("home"),\n});'
  );
}

// Add fields to orders
if (!schemaContent.includes('distanceKm: decimal("distance_km"')) {
  schemaContent = schemaContent.replace(
    '  refundAmount: int("refund_amount").notNull().default(0),',
    '  refundAmount: int("refund_amount").notNull().default(0),\n  distanceKm: decimal("distance_km", { precision: 6, scale: 2 }),\n  assignedStoreId: int("assigned_store_id"),'
  );
}

// Add fields to stores
if (!schemaContent.includes('pickupRadiusKm: decimal("pickup_radius_km"')) {
  schemaContent = schemaContent.replace(
    '  prepTimeMinutes: int("prep_time_minutes").notNull().default(45),',
    '  prepTimeMinutes: int("prep_time_minutes").notNull().default(45),\n  pickupRadiusKm: decimal("pickup_radius_km", { precision: 5, scale: 2 }).notNull().default("10.00"),\n  deliveryEnabled: boolean("delivery_enabled").notNull().default(true),\n  weeklyOff: varchar("weekly_off", { length: 30 }).default(""),\n  deliveryCharge: int("delivery_charge").notNull().default(49),\n  minOrderAmount: int("min_order_amount").notNull().default(0),\n  freeDeliveryThreshold: int("free_delivery_threshold").notNull().default(799),'
  );
}

// Add serviceablePincodes and unserviceablePincodeLogs tables
if (!schemaContent.includes('export const serviceablePincodes')) {
  const newTables = `
export const serviceablePincodes = mysqlTable(
  "serviceable_pincodes",
  {
    id: int("id").autoincrement().primaryKey(),
    pincode: varchar("pincode", { length: 12 }).notNull(),
    storeId: int("store_id").references(() => stores.id),
    city: varchar("city", { length: 80 }).notNull().default("Vadodara"),
    state: varchar("state", { length: 80 }).notNull().default("Gujarat"),
    deliveryEnabled: boolean("delivery_enabled").notNull().default(true),
    deliveryCharge: int("delivery_charge").notNull().default(49),
    minimumOrder: int("minimum_order").notNull().default(0),
    estimatedDeliveryTime: varchar("estimated_delivery_time", { length: 100 }).notNull().default("Today by 6:30 PM"),
    isExpress: boolean("is_express").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("idx_serv_pincode").on(table.pincode), index("idx_serv_store_id").on(table.storeId)]
);

export const unserviceablePincodeLogs = mysqlTable("unserviceable_pincode_logs", {
  id: int("id").autoincrement().primaryKey(),
  pincode: varchar("pincode", { length: 12 }).notNull(),
  ipAddress: varchar("ip_address", { length: 64 }),
  source: varchar("source", { length: 40 }).default("checkout"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
`;
  schemaContent = schemaContent + newTables;
}

fs.writeFileSync(schemaPath, schemaContent, 'utf-8');
console.log('Successfully updated schema.ts');

