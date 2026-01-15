// Simple colored console logger for cleaner output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
};

// Status code color
const getStatusColor = (status) => {
  if (status >= 500) return colors.red;
  if (status >= 400) return colors.yellow;
  if (status >= 300) return colors.cyan;
  if (status >= 200) return colors.green;
  return colors.reset;
};

// Method color
const getMethodColor = (method) => {
  switch (method) {
    case "GET":
      return colors.blue;
    case "POST":
      return colors.green;
    case "PUT":
      return colors.yellow;
    case "PATCH":
      return colors.magenta;
    case "DELETE":
      return colors.red;
    default:
      return colors.reset;
  }
};

// Format time
const formatTime = () => {
  const now = new Date();
  return now.toLocaleTimeString("en-US", { hour12: false });
};

// Request logger middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  const { method, url } = req;

  res.on("finish", () => {
    // Skip logging for static files and health checks
    if (url.startsWith("/static") || url === "/api/health") {
      return;
    }

    const duration = Date.now() - start;
    const { statusCode } = res;

    if (process.env.NODE_ENV !== "test") {
      const methodColor = getMethodColor(method);
      const statusColor = getStatusColor(statusCode);

      // Clean URL (remove query params for cleaner display)
      const cleanUrl = url.split("?")[0];

      console.log(
        `${colors.dim}${formatTime()}${colors.reset} ` +
          `${methodColor}${method.padEnd(6)}${colors.reset} ` +
          `${cleanUrl.padEnd(30)} ` +
          `${statusColor}${statusCode}${colors.reset} ` +
          `${colors.dim}${duration}ms${colors.reset}`
      );
    }
  });

  next();
};

// Startup logger helper
const logStartup = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  server: (port) => {
    console.log("");
    console.log(
      `${colors.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`
    );
    console.log(`${colors.bright}  🎱 SNOKEHEAD Server${colors.reset}`);
    console.log(
      `${colors.dim}  Running on port ${colors.cyan}${port}${colors.reset}`
    );
    console.log(
      `${colors.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`
    );
    console.log("");
  },
};

export { requestLogger, logStartup, colors };
