type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  properties?: Record<string, unknown>;
}

class Logger {
  constructor() {
    // Log initialization
    console.log('[LOGGER] Initialized, import.meta.env.PROD:', import.meta.env.PROD);
  }

  private isEnabled(): boolean {
    // Always log in production and development
    return true;
  }

  private shouldLogEndpoint(endpoint: string): boolean {
    // Log all API endpoints
    return endpoint.startsWith("/Transaction") || endpoint.startsWith("/Configuration");
  }

  async log(level: LogLevel, message: string, properties?: Record<string, unknown>) {
    if (!this.isEnabled()) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      properties,
    };

    // Console logging for development
    if (import.meta.env.DEV) {
      console.log(`[${level.toUpperCase()}]`, message, properties);
    }

    // Always log in production for debugging
    if (import.meta.env.PROD) {
      console.log(`[LOGGER ${level.toUpperCase()}]`, message);
    }

    // Send to backend logging endpoint in production
    if (import.meta.env.PROD) {
      try {
        const response = await fetch("/api/log", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(entry),
        });

        if (!response.ok) {
          console.error(`Log endpoint returned ${response.status}: ${response.statusText}`);
        }
      } catch (err) {
        // Log to console but don't break the app
        console.error("Failed to send log:", err);
      }
    }
  }

  info(message: string, properties?: Record<string, unknown>) {
    this.log("info", message, properties);
  }

  warn(message: string, properties?: Record<string, unknown>) {
    this.log("warn", message, properties);
  }

  error(message: string, properties?: Record<string, unknown>) {
    this.log("error", message, properties);
  }

  debug(message: string, properties?: Record<string, unknown>) {
    this.log("debug", message, properties);
  }

  // API-specific logging
  logApiRequest(endpoint: string, method: string, body?: unknown) {
    if (!this.shouldLogEndpoint(endpoint)) {
      return;
    }

    this.info("API Request", {
      endpoint,
      method,
      body: body ? JSON.stringify(body, null, 2) : undefined,
      timestamp: new Date().toISOString(),
    });
  }

  logApiResponse(endpoint: string, status: number, body?: unknown) {
    if (!this.shouldLogEndpoint(endpoint)) {
      return;
    }

    const level = status >= 400 ? "error" : status >= 300 ? "warn" : "info";

    this.log(level, "API Response", {
      endpoint,
      status,
      body: body ? JSON.stringify(body, null, 2) : undefined,
      timestamp: new Date().toISOString(),
    });
  }
}

export const logger = new Logger();
