declare global {
  interface Window {
    AndroidPrinter?: {
      printCms: (payload: string) => void;
    };
  }
}

export function hasAndroidPrinterBridge(): boolean {
  return typeof window !== "undefined" && typeof window.AndroidPrinter?.printCms === "function";
}

export function tryAndroidPrintCms(payload: Record<string, unknown>): boolean {
  if (!hasAndroidPrinterBridge()) {
    return false;
  }

  try {
    window.AndroidPrinter!.printCms(JSON.stringify(payload));
    return true;
  } catch (error) {
    console.error("Android printer bridge failed:", error);
    return false;
  }
}
