const fs = require("fs");
const path = require("path");

// Load .env.local if present
try {
  const envPath = path.resolve(__dirname, "../.env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
} catch {}

let MongoClient;
try {
  MongoClient = require("mongodb").MongoClient;
} catch {
  MongoClient = require(path.resolve(__dirname, "../ai-genrated/node_modules/mongodb")).MongoClient;
}

// Parse CLI flags: --uri=..., --db=..., --out=...
const args = process.argv.slice(2);
function getArg(flag, fallback) {
  for (const arg of args) {
    if (arg.startsWith(`--${flag}=`)) {
      let val = arg.split(`--${flag}=`)[1].trim();
      // Clean accidental < > brackets from copy-paste
      val = val.replace(/^<|>$/g, "").replace(/^["']|["']$/g, "");
      return val;
    }
  }
  return fallback;
}

const defaultUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/vardayini_sweets";
const uri = getArg("uri", defaultUri);

const rawDbFromUri = uri.split("/").pop()?.split("?")[0]?.trim();
const defaultDb = process.env.MONGODB_DB || (rawDbFromUri && rawDbFromUri.length > 0 ? rawDbFromUri : "vardayini-sweets");
const dbName = getArg("db", defaultDb);

const outDir = path.resolve(process.cwd(), getArg("out", "./mongo-backup"), dbName);

async function runDump() {
  console.log("\x1b[36m%s\x1b[0m", "=======================================================");
  console.log("\x1b[36m%s\x1b[0m", "            MongoDB Database Backup (Dump)            ");
  console.log("\x1b[36m%s\x1b[0m", "=======================================================");
  console.log("• Source URI:  ", uri.replace(/:([^:@]+)@/, ":****@"));
  console.log("• Database:    ", dbName);
  console.log("• Output Path: ", outDir);
  console.log("");

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 8000,
  });

  try {
    await client.connect();
    const db = client.db(dbName);
    const collections = await db.listCollections().toArray();

    if (collections.length === 0) {
      console.warn("\x1b[33m%s\x1b[0m", `[Notice] No collections found in database '${dbName}'.`);
      await client.close();
      return;
    }

    console.log(`Found ${collections.length} collections. Exporting documents...\n`);

    let totalDocs = 0;
    for (const colInfo of collections) {
      const colName = colInfo.name;
      const col = db.collection(colName);
      const docs = await col.find({}).toArray();
      const filePath = path.join(outDir, `${colName}.json`);

      fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), "utf8");
      totalDocs += docs.length;
      console.log(`  ✓ ${colName.padEnd(20)} -> ${docs.length} documents saved (${filePath})`);
    }

    // Write a summary metadata file
    const meta = {
      database: dbName,
      timestamp: new Date().toISOString(),
      collectionsCount: collections.length,
      totalDocuments: totalDocs,
      collections: collections.map((c) => c.name),
    };
    fs.writeFileSync(path.join(outDir, "_backup_meta.json"), JSON.stringify(meta, null, 2), "utf8");

    console.log("\n\x1b[32m%s\x1b[0m", "=======================================================");
    console.log("\x1b[32m%s\x1b[0m", `  BACKUP COMPLETED SUCCESSFULLY! (${totalDocs} documents)`);
    console.log("\x1b[32m%s\x1b[0m", `  Saved to: ${outDir}`);
    console.log("\x1b[32m%s\x1b[0m", "=======================================================");
  } catch (err) {
    console.error("\x1b[31m%s\x1b[0m", `\nBackup failed: ${err.message}`);
    process.exit(1);
  } finally {
    await client.close().catch(() => {});
  }
}

runDump();

