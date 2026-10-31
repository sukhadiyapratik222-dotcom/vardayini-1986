const { spawn } = require("child_process");
const path = require("path");
const net = require("net");
const os = require("os");
const fs = require("fs");

function checkPort(port = 27017, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("error", () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

async function main() {
  console.log("Checking MongoDB on 127.0.0.1:27017...");
  const alreadyRunning = await checkPort(27017);
  if (alreadyRunning) {
    console.log("MongoDB is already running and listening on port 27017!");
    return;
  }

  const candidates = [
    path.join(os.homedir(), "Downloads", "mongodb-windows-x86_64-9.0.2", "mongodb-win32-x86_64-windows-9.0.2", "bin", "mongod.exe"),
    "C:\\Program Files\\MongoDB\\Server\\9.0\\bin\\mongod.exe",
    "C:\\Program Files\\MongoDB\\Server\\8.0\\bin\\mongod.exe",
    "C:\\Program Files\\MongoDB\\Server\\7.0\\bin\\mongod.exe",
  ];

  const mongodBin = candidates.find((p) => fs.existsSync(p));
  if (!mongodBin) {
    console.error("Could not find mongod.exe. Please verify your MongoDB installation.");
    process.exit(1);
  }

  const dataDir = path.join(os.homedir(), "mongodb-data");
  const logPath = path.join(dataDir, "mongod.log");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  console.log(`Starting MongoDB server from: ${mongodBin}`);
  console.log(`Data directory: ${dataDir}`);
  console.log(`Log file: ${logPath}`);

  const child = spawn(
    mongodBin,
    [
      "--dbpath", dataDir,
      "--bind_ip", "127.0.0.1,::1",
      "--port", "27017",
      "--logpath", logPath,
      "--logappend",
    ],
    {
      detached: true,
      stdio: "ignore",
    }
  );

  child.unref();

  console.log("Waiting for MongoDB to initialize...");
  let ready = false;
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 500));
    if (await checkPort(27017)) {
      ready = true;
      break;
    }
  }

  if (ready) {
    console.log("\x1b[32m%s\x1b[0m", "MongoDB started successfully! Listening on port 27017 (localhost:27017 & 127.0.0.1:27017).");
  } else {
    console.error("MongoDB failed to respond within 10 seconds. Check logs at:", logPath);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Error starting MongoDB:", err);
  process.exit(1);
});

