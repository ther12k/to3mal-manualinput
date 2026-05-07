import { useState, useCallback, useEffect } from "react";

interface UseQRScannerReturn {
  isSupported: boolean;
  isScanning: boolean;
  error: string | null;
  startScanning: () => Promise<void>;
  stopScanning: () => void;
  handleScanResult: (data: string) => void;
  handleScanError: (error: unknown) => void;
  lastScannedData: string | null;
}

export function useQRScanner(): UseQRScannerReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScannedData, setLastScannedData] = useState<string | null>(null);

  useEffect(() => {
    if (
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === "function"
    ) {
      setIsSupported(true);
    } else {
      setError("Camera access is not supported in this browser.");
    }
  }, []);

  const stopScanning = useCallback(() => {
    console.log("Stopping QR scan...");
    setIsScanning(false);
  }, []);

  const handleScanResult = useCallback((data: string) => {
    console.log("QR scan completed:", data);
    setError(null);
    setLastScannedData(data);
    setIsScanning(false);
  }, []);

  const handleScanError = useCallback((scanError: unknown) => {
    const message = scanError instanceof Error ? scanError.message : "QR scan failed";
    console.error("QR scan error:", scanError);
    setError(message);
  }, []);

  const startScanning = useCallback(async () => {
    console.log("Starting QR scan...");
    if (!isSupported) {
      setError("Camera access is not supported in this browser.");
      return;
    }

    setError(null);
    setLastScannedData(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      stream.getTracks().forEach((track) => track.stop());
      setIsScanning(true);
    } catch (scanError) {
      const message =
        scanError instanceof Error ? scanError.message : "Unable to access camera for QR scan.";
      console.error("QR camera access error:", scanError);
      setError(message);
      setIsScanning(false);
    }
  }, [isSupported]);

  return {
    isSupported,
    isScanning,
    error,
    startScanning,
    stopScanning,
    handleScanResult,
    handleScanError,
    lastScannedData,
  };
}
