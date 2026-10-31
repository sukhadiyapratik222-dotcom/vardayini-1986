const { spawn } = require("child_process");
const path = require("path");
const net = require("net");
const os = require("os");
const fs = require("fs");

const isWin = process.platform === "win32";
const npmCmd = isWin ? "npm.cmd" : "npm";

console.log("\x1b[36m%s\x1b[0m", "=======================================================");
console.log("\x1b[36m%s\x1b[0m", "   Starting Vardayini Sweets Fullstack Environment   ");
console.log("\x1b[36m%s\x1b[0m", "   • Storefront:       http://localhost:9449          ");
console.log("\x1b[36m%s\x1b[0m", "   • Admin Dashboard:  http://localhost:3001          ");
console.log("\x1b[36m%s\x1b[0m", "   • Database:         MongoDB (mongodb://127.0.0.1:27017) ");
console.log("\x1b[36m%s\x1b[0m", "=======================================================\n");

function checkPort(port = 27017, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(800);
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

function killPortProcess(port) {
  try {
    if (isWin) {
      const { execSync } = require("child_process");
      const output = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
      const lines = output.trim().split(/\r?\n/);
      for (const line of lines) {
        if (!line.includes("LISTENING")) continue;
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && !isNaN(Number(pid)) && Number(pid) !== process.pid && Number(pid) > 4) {
          try {
            execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
            console.log("\x1b[33m%s\x1b[0m", `[Port Clean] Released port ${port} by terminating lingering PID ${pid}`);
          } catch {}
        }
      }
    }
  } catch {}
}

let mongoProc = null;

async function ensureMongoStarted() {
  const isRunning = await checkPort(27017);
  if (isRunning) {
    console.log("\x1b[32m%s\x1b[0m", "[MongoDB:27017] MongoDB server is active and listening on port 27017.");
    return;
  }

  // Candidate locations for mongod.exe
  const candidates = [
    path.join(os.homedir(), "Downloads", "mongodb-windows-x86_64-9.0.2", "mongodb-win32-x86_64-windows-9.0.2", "bin", "mongod.exe"),
    "C:\\Program Files\\MongoDB\\Server\\9.0\\bin\\mongod.exe",
    "C:\\Program Files\\MongoDB\\Server\\8.0\\bin\\mongod.exe",
    "C:\\Program Files\\MongoDB\\Server\\7.0\\bin\\mongod.exe",
  ];

  let mongodBin = candidates.find((p) => fs.existsSync(p));
  if (mongodBin) {
    const dataDir = path.join(os.homedir(), "mongodb-data");
    const logPath = path.join(dataDir, "mongod.log");
    if (!fs.existsSync(dataDir)) {
      try { fs.mkdirSync(dataDir, { recursive: true }); } catch {}
    }

    console.log("\x1b[33m%s\x1b[0m", `[MongoDB:27017] Starting MongoDB server at ${dataDir}...`);
    mongoProc = spawn(
      mongodBin,
      [
        "--dbpath", dataDir,
        "--bind_ip", "127.0.0.1,::1",
        "--port", "27017",
        "--logpath", logPath,
        "--logappend"
      ],
      {
        stdio: "ignore",
        detached: false,
      }
    );

    mongoProc.on("error", (err) => {
      console.warn("\x1b[33m%s\x1b[0m", `[MongoDB Notice] ${err.message}`);
    });

    // Wait until MongoDB is actively accepting connections (up to 15 seconds)
    const startTime = Date.now();
    let ready = false;
    while (Date.now() - startTime < 15000) {
      if (await checkPort(27017)) {
        ready = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 500));
    }

    if (ready) {
      console.log("\x1b[32m%s\x1b[0m", "[MongoDB:27017] MongoDB server is ready and accepting connections.");
    } else {
      console.warn("\x1b[33m%s\x1b[0m", "[MongoDB:27017] Started process, waiting for initialization...");
    }
  } else {
    console.log("\x1b[33m%s\x1b[0m", "[MongoDB] Note: MongoDB server not found. The app will use the zero-crash embedded database.");
  }
}

function startProcess(name, dir, colorCode) {
  const proc = spawn(npmCmd, ["run", "dev"], {
    cwd: path.resolve(__dirname, "..", dir),
    stdio: "pipe",
    shell: isWin,
    env: {
      ...process.env,
      FORCE_COLOR: "1",
      MONGODB_URI: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/vardayini_sweets",
    },
  });

  const prefix = `\x1b[${colorCode}m[${name}]\x1b[0m `;

  proc.stdout.on("data", (data) => {
    const lines = data.toString().split(/\r?\n/);
    lines.forEach((line) => {
      if (line.trim()) {
        console.log(`${prefix}${line}`);
      }
    });
  });

  proc.stderr.on("data", (data) => {
    const lines = data.toString().split(/\r?\n/);
    lines.forEach((line) => {
      if (line.trim()) {
        console.error(`${prefix}\x1b[31m${line}\x1b[0m`);
      }
    });
  });

  proc.on("close", (code) => {
    console.log(`${prefix}Process exited with code ${code}`);
  });

  return proc;
}

let store = null;
let admin = null;

async function bootstrap() {
  killPortProcess(9449);
  killPortProcess(3001);
  await ensureMongoStarted();
  store = startProcess("STORE:9449", "ai-genrated", "32"); // green
  admin = startProcess("ADMIN:3001", "admin-dashboard", "35"); // magenta
}

function cleanup() {
  console.log("\nShutting down dev servers...");
  if (isWin) {
    if (store && store.pid) {
      try { spawn("taskkill", ["/pid", store.pid.toString(), "/T", "/F"]); } catch {}
    }
    if (admin && admin.pid) {
      try { spawn("taskkill", ["/pid", admin.pid.toString(), "/T", "/F"]); } catch {}
    }
    if (mongoProc && mongoProc.pid) {
      try { spawn("taskkill", ["/pid", mongoProc.pid.toString(), "/T", "/F"]); } catch {}
    }
  } else {
    if (store) store.kill();
    if (admin) admin.kill();
    if (mongoProc) mongoProc.kill();
  }
  process.exit(0);
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

bootstrap();
