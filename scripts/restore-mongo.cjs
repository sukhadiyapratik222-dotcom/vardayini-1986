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

const args = process.argv.slice(2);
function getArg(flag, fallback) {
  for (const arg of args) {
    if (arg.startsWith(`--${flag}=`)) {
      let val = arg.split(`--${flag}=`)[1].trim();
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

const inDir = path.resolve(process.cwd(), getArg("in", "./mongo-backup"), dbName);

async function runRestore() {
  console.log("\x1b[36m%s\x1b[0m", "=======================================================");
  console.log("\x1b[36m%s\x1b[0m", "            MongoDB Database Restore                  ");
  console.log("\x1b[36m%s\x1b[0m", "=======================================================");
  console.log("• Target URI:  ", uri.replace(/:([^:@]+)@/, ":****@"));
  console.log("• Database:    ", dbName);
  console.log("• Source Path: ", inDir);
  console.log("");

  if (!fs.existsSync(inDir)) {
    console.error(`\x1b[31m[Error] Backup folder not found: ${inDir}\x1b[0m`);
    process.exit(1);
  }

  const files = fs.readdirSync(inDir).filter((f) => f.endsWith(".json") && !f.startsWith("_"));
  if (files.length === 0) {
    console.warn(`[Notice] No JSON collection dump files found in ${inDir}`);
    return;
  }

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });

  try {
    await client.connect();
    const db = client.db(dbName);
    let totalRestored = 0;

    for (const file of files) {
      const colName = path.basename(file, ".json");
      const col = db.collection(colName);
      const content = fs.readFileSync(path.join(inDir, file), "utf8");
      const docs = JSON.parse(content);

      if (Array.isArray(docs) && docs.length > 0) {
        // Drop existing or clean insert
        for (const doc of docs) {
          if (doc._id) {
            await col.replaceOne({ _id: doc._id }, doc, { upsert: true });
          } else {
            await col.insertOne(doc);
          }
        }
        totalRestored += docs.length;
        console.log(`  ✓ Restored ${colName.padEnd(20)} (${docs.length} documents)`);
      }
    }

    console.log("\n\x1b[32m%s\x1b[0m", "=======================================================");
    console.log("\x1b[32m%s\x1b[0m", `  RESTORE COMPLETED SUCCESSFULLY! (${totalRestored} documents)`);
    console.log("\x1b[32m%s\x1b[0m", "=======================================================");
  } catch (err) {
    console.error(`\x1b[31mRestore failed: ${err.message}\x1b[0m`);
    process.exit(1);
  } finally {
    await client.close().catch(() => {});
  }
}

runRestore();

