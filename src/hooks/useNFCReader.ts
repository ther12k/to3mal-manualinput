import { useState, useCallback, useEffect } from "react";

interface UseNFCReaderResult {
  isSupported: boolean;
  isReading: boolean;
  error: string | null;
  startReading: () => Promise<void>;
  stopReading: () => void;
  lastReadData: string | null;
}

/**
 * Custom hook for reading RFID/NFC tags using the Web NFC API.
 * Only supported in Chrome for Android and some Chromium-based browsers.
 *
 * @returns {UseNFCReaderResult} Object containing NFC reader state and controls
 */
export function useNFCReader(): UseNFCReaderResult {
  const [isSupported, setIsSupported] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastReadData, setLastReadData] = useState<string | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // Check if Web NFC is supported on mount
  useEffect(() => {
    if ("NDEFReader" in window) {
      setIsSupported(true);
    } else {
      setError("NFC not supported in this browser. Use Chrome for Android.");
    }
  }, []);

  const startReading = useCallback(async () => {
    if (!isSupported) {
      setError("NFC not supported in this browser");
      return;
    }

    if (isReading) {
      setError("Already reading NFC tags");
      return;
    }

    try {
      const ndef = new (window as any).NDEFReader();
      const controller = new AbortController();
      setAbortController(controller);

      setIsReading(true);
      setError(null);
      setLastReadData(null);

      await ndef.scan({
        signal: controller.signal,
      });

      console.log("NFC scan started");

      ndef.addEventListener("reading", (event: any) => {
        console.log("NFC tag detected:", event);
        const { serialNumber, message } = event;

        // Extract data from the NDEF message
        let extractedData = serialNumber; // Default to serial number

        if (message && message.records) {
          // Try to extract text from NDEF records
          for (const record of message.records) {
            if (record.recordType === "text") {
              const textDecoder = new TextDecoder(record.encoding || "utf-8");
              extractedData = textDecoder.decode(record.data);
              break;
            } else if (record.recordType === "url") {
              extractedData = record.data;
              break;
            }
          }
        }

        console.log("Extracted NFC data:", extractedData);
        setLastReadData(extractedData);
        setIsReading(false);
      });

      ndef.addEventListener("error", (event: any) => {
        console.error("NFC error:", event);
        setError(`NFC error: ${event.message || "Unknown error"}`);
        setIsReading(false);
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to start NFC reading";
      setError(errorMessage);
      setIsReading(false);
    }
  }, [isSupported, isReading]);

  const stopReading = useCallback(() => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    setIsReading(false);
  }, [abortController]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortController) {
        abortController.abort();
      }
    };
  }, [abortController]);

  return {
    isSupported,
    isReading,
    error,
    startReading,
    stopReading,
    lastReadData,
  };
}
