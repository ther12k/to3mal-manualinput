import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api/client";
import { buildGatepassFromScannedValue } from "@/lib/scan";
import { useNFCReader } from "@/hooks/useNFCReader";
import { useQRScanner } from "@/hooks/useQRScanner";
import { toast } from "sonner";
import { QrReader } from "react-qr-reader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type FormState = "search" | "success" | "error";
type AMSType = "INPUT" | "UPDATE_OUT";
type TransactionLookupResultState = {
  api: string;
  source: string;
  value: string;
  request: {
    url: string;
    method: string;
    params?: Record<string, string>;
  };
  response: unknown;
};

export function CustomsPage() {
  const [amsType, setAmsType] = useState<AMSType>("INPUT");
  const [formState, setFormState] = useState<FormState>("search");
  const [isLoading, setIsLoading] = useState(false);
  const [inputMode, setInputMode] = useState<"manual" | "rfid" | "qr">("rfid");
  const [transactionID, setTransactionID] = useState("");
  const [noReq, setNoReq] = useState("");
  const [container, setContainer] = useState("");
  const [containerCombo, setContainerCombo] = useState("");
  const [error, setError] = useState("");
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [manualRfidInput, setManualRfidInput] = useState("");
  const [isPrefilled, setIsPrefilled] = useState(false); // Track if data was prefilled from scan
  const [transactionLookupResult, setTransactionLookupResult] = useState<TransactionLookupResultState | null>(null);
  const [debugPopupTab, setDebugPopupTab] = useState<"request" | "response">("request");
  const qrSectionRef = useRef<HTMLDivElement | null>(null);

  // NFC reader hook
  const {
    isSupported: nfcSupported,
    isReading: nfcReading,
    error: nfcError,
    startReading: startNfcReading,
    stopReading: stopNfcReading,
    lastReadData: nfcData,
  } = useNFCReader();

  // QR scanner hook
  const {
    isSupported: qrSupported,
    isScanning: qrScanning,
    error: qrError,
    startScanning: startQrScanning,
    stopScanning: stopQrScanning,
    handleScanResult: handleQrScanResult,
    handleScanError: handleQrScanError,
    lastScannedData: qrData,
  } = useQRScanner();

  const handleSubmit = async () => {
    // Validation
    if (!transactionID.trim()) {
      setError("Please enter a Transaction ID");
      toast.error("Please enter a Transaction ID");
      return;
    }
    if (!noReq.trim()) {
      setError("Please enter a No Request");
      toast.error("Please enter a No Request");
      return;
    }
    if (!container.trim()) {
      setError("Please enter a Container");
      toast.error("Please enter a Container");
      return;
    }
    if (!containerCombo.trim()) {
      setError("Please enter a Container Combo");
      toast.error("Please enter a Container Combo");
      return;
    }

    setIsLoading(true);
    setFormState("search");
    setError("");
    setApiResponse(null);

    try {
      const requestData = {
        transactionID: parseInt(transactionID.trim()),
        noReq: noReq.trim(),
        container: container.trim().toUpperCase(),
        containerCombo: containerCombo.trim().toUpperCase(),
      };

      let response;
      if (amsType === "INPUT") {
        response = await api.inputManualAMS(requestData);
      } else {
        response = await api.updateManualOUTAMS(requestData);
      }

      setApiResponse(response);

      if (response.state !== 0) {
        const errorMsg = response.message || "API request failed";
        setError(errorMsg);
        toast.error(errorMsg);
        setFormState("error");
      } else {
        toast.success("AMS request processed successfully!");
        setFormState("success");
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to process AMS request";
      setError(errorMsg);
      toast.error(errorMsg);
      setFormState("error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setFormState("search");
    setTransactionID("");
    setNoReq("");
    setContainer("");
    setContainerCombo("");
    setError("");
    setApiResponse(null);
    setInputMode("rfid"); // Keep in RFID mode
    setManualRfidInput("");
    setIsPrefilled(false); // Reset prefilled flag
    setTransactionLookupResult(null);
    stopNfcReading();
    stopQrScanning();
  };

  // Handle RFID validation for Customs
  const handleRfidValidation = async (rfidData: string) => {
    setIsLoading(true);
    setError("");
    setManualRfidInput("");

    try {
      const gatepass = buildGatepassFromScannedValue(rfidData);
      console.log("Customs - Step 1: Resolved scanned value to gatepass:", {
        original: rfidData,
        gatepass,
      });

      if (!gatepass) {
        throw new Error("Scanned code is empty.");
      }

      // Step 2: Call GetTransaction endpoint with gatepass
      const transactionResponse = await api.getTransactionByGatepass(gatepass);

      if (transactionResponse.state !== 0 || !transactionResponse.item) {
        const errorMsg = transactionResponse.message || "Transaction not found for this RFID tag";
        setTransactionLookupResult({
          api: "GetTransaction",
          source: inputMode === "qr" ? "QR Code" : "RFID",
          value: rfidData,
          request: {
            url: `/api/Transaction/GetTransaction`,
            method: "POST",
            params: {
              Apikey: "***",
              gatepass: gatepass,
            },
          },
          response: transactionResponse,
        });
        setError(errorMsg);
        toast.error(errorMsg);
        setIsLoading(false);
        return;
      }

      const transactionData = transactionResponse.item;
      setTransactionLookupResult(null);
      console.log("Customs - Step 3: Got transaction:", transactionData.id, "Lane:", transactionData.entrylaneid);

      // Step 4: Call GetEticketByTransaction with transactionId and laneId
      const eticketResponse = await api.getPostGateTransaction(
        transactionData.id.toString(),
        transactionData.entrylaneid
      );

      if (eticketResponse.state !== 0 || !eticketResponse.item) {
        const errorMsg = eticketResponse.message || "Eticket not found for this transaction";
        setTransactionLookupResult({
          api: "GetEticketByTransaction",
          source: inputMode === "qr" ? "QR Code" : "RFID",
          value: rfidData,
          request: {
            url: `/api/Transaction/GetEticketByTransaction`,
            method: "POST",
            params: {
              Apikey: "***",
              transactionId: transactionData.id.toString(),
              laneId: transactionData.entrylaneid.toString(),
            },
          },
          response: eticketResponse,
        });
        setError(errorMsg);
        toast.error(errorMsg);
        setIsLoading(false);
        return;
      }

      const eticketsData = eticketResponse.item;
      console.log("Customs - Step 4: Got etickets:", eticketsData.length, "etickets");

      // Step 5: Prefill form with eticket data
      const firstEticket = eticketsData[0];
      setTransactionID(transactionData.id.toString());
      setNoReq(firstEticket.reqno || "");
      setContainer(firstEticket.container || "");
      setContainerCombo(firstEticket.container || ""); // Default to same container
      setIsPrefilled(true); // Mark as prefilled from scan

      // Check if noreq = "TOSNUS" and show warning if needed
      if (firstEticket.reqno === "TOSNUS") {
        const warnMsg = "Warning: Request No is 'TOSNUS' (default value). Click Edit to update before submitting.";
        setError(warnMsg);
        toast.warning(warnMsg);
      } else {
        setError(""); // Clear any previous errors
      }

      setInputMode("manual"); // Switch to manual only after successful processing
      console.log("Customs - Step 4: Form prefilled with eticket data (read-only), ready for review");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "RFID validation failed";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle NFC data when read
  useEffect(() => {
    if (nfcData && inputMode === "rfid") {
      console.log("Customs - NFC data received:", nfcData);
      handleRfidValidation(nfcData);
    }
  }, [nfcData]);

  // Handle QR data when scanned
  useEffect(() => {
    if (qrData && inputMode === "qr") {
      console.log("Customs - QR data received:", qrData);
      handleRfidValidation(qrData); // Use same validation as RFID
    }
  }, [qrData]);

  useEffect(() => {
    if (inputMode !== "qr") {
      stopQrScanning();
      return;
    }

    if (!qrSupported) {
      return;
    }

    startQrScanning();
    requestAnimationFrame(() => {
      qrSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [inputMode, qrSupported, startQrScanning, stopQrScanning]);

  // Cleanup scanners on unmount
  useEffect(() => {
    return () => {
      stopNfcReading();
      stopQrScanning();
    };
  }, [stopNfcReading, stopQrScanning]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-3 sm:p-4">
      <div className="max-w-2xl mx-auto pt-4 sm:pt-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">Customs Manual Input (AMS)</h1>
          <p className="text-slate-400 mt-1">Automated Manifest System manual processing</p>
        </div>

        {/* AMS Type Tabs */}
        <Card className="bg-slate-800 border-slate-700 mb-4">
          <CardContent className="pt-4">
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setAmsType("INPUT");
                  handleReset();
                }}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                  amsType === "INPUT"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
              >
                Input Manual AMS
              </button>
              <button
                onClick={() => {
                  setAmsType("UPDATE_OUT");
                  handleReset();
                }}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                  amsType === "UPDATE_OUT"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
              >
                Update Manual OUT AMS
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Input Form */}
        {formState === "search" && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">
                {amsType === "INPUT" ? "Input Manual AMS" : "Update Manual OUT AMS"}
              </CardTitle>
              <CardDescription className="text-slate-400">
                {amsType === "INPUT" ? "Enter all required fields to process manual AMS input" : "Enter all required fields to process manual OUT AMS update"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              {/* Input Mode Toggle */}
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                <Button
                  type="button"
                  variant={inputMode === "rfid" ? "default" : "outline"}
                  onClick={() => setInputMode("rfid")}
                  className={`${inputMode === "rfid" ? "bg-blue-600 hover:bg-blue-700" : "border-slate-600 text-white hover:bg-slate-700"}`}
                  disabled={isLoading || nfcReading || qrScanning}
                >
                  RFID
                </Button>
                <Button
                  type="button"
                  variant={inputMode === "qr" ? "default" : "outline"}
                  onClick={() => setInputMode("qr")}
                  className={`${inputMode === "qr" ? "bg-blue-600 hover:bg-blue-700" : "border-slate-600 text-white hover:bg-slate-700"}`}
                  disabled={isLoading || nfcReading || qrScanning}
                >
                  QR Scan
                </Button>
                <Button
                  type="button"
                  variant={inputMode === "manual" ? "default" : "outline"}
                  onClick={() => setInputMode("manual")}
                  className={`${inputMode === "manual" ? "bg-blue-600 hover:bg-blue-700" : "border-slate-600 text-white hover:bg-slate-700"}`}
                  disabled={isLoading || nfcReading || qrScanning}
                >
                  Manual
                </Button>
              </div>

              {/* RFID Scanner */}
              {inputMode === "rfid" && (
                <div className="space-y-4">
                  {/* Manual RFID Input */}
                  <div className="space-y-2">
                    <Label htmlFor="rfidInput" className="text-slate-200">
                      Container / RFID Number
                    </Label>
                    <Input
                      id="rfidInput"
                      value={manualRfidInput}
                      onChange={(e) => setManualRfidInput(e.target.value)}
                      placeholder="Enter container number (e.g., AF49F017)"
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                      onKeyPress={(e) => e.key === "Enter" && !isLoading && manualRfidInput.trim() && handleRfidValidation(manualRfidInput.trim())}
                      disabled={isLoading || nfcReading}
                    />
                  </div>

                  {/* Or Divider */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-slate-600" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-slate-800 px-2 text-slate-400">Or scan with NFC</span>
                    </div>
                  </div>

                  {/* NFC Scanner Section */}
                  <div className="space-y-3">
                    {!nfcSupported && (
                      <Alert variant="destructive">
                        <AlertDescription>
                          NFC not supported in this browser. Use Chrome for Android or a device with NFC capabilities.
                        </AlertDescription>
                      </Alert>
                    )}

                    {nfcSupported && !nfcReading && !nfcData && (
                      <Button
                        onClick={startNfcReading}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        disabled={isLoading}
                      >
                        📡 Start NFC Scan
                      </Button>
                    )}

                    {nfcReading && (
                      <div className="text-center py-4">
                        <div className="animate-pulse mb-3">
                          <div className="text-4xl">📡</div>
                        </div>
                        <p className="text-slate-300 text-sm mb-3">
                          Scanning for RFID tag... Hold tag near device.
                        </p>
                        <Button
                          onClick={stopNfcReading}
                          variant="outline"
                          className="border-slate-600 text-white hover:bg-slate-700"
                        >
                          Cancel Scan
                        </Button>
                      </div>
                    )}

                    {nfcData && (
                      <Alert className="bg-green-900/30 border-green-700">
                        <AlertDescription className="text-green-300">
                          <div className="font-bold mb-1">✓ RFID Tag Detected!</div>
                          <div className="text-xs text-slate-300">Data: {nfcData}</div>
                        </AlertDescription>
                      </Alert>
                    )}

                    {nfcError && (
                      <Alert variant="destructive">
                        <AlertDescription>{nfcError}</AlertDescription>
                      </Alert>
                    )}
                  </div>

                  {/* Submit Manual RFID Input */}
                  {manualRfidInput.trim() && (
                    <Button
                      onClick={() => handleRfidValidation(manualRfidInput.trim())}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      disabled={isLoading || nfcReading}
                    >
                      {isLoading ? "Processing..." : "Process"}
                    </Button>
                  )}
                </div>
              )}

              {/* QR Scanner */}
                {inputMode === "qr" && (
                  <div ref={qrSectionRef} className="space-y-3">
                    {!qrSupported && (
                      <Alert variant="destructive">
                        <AlertDescription>
                          QR code scanning not supported in this browser. Use Chrome, Edge, or Safari.
                        </AlertDescription>
                      </Alert>
                    )}

                    {qrSupported && (
                      <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3">
                        <p className="text-center text-sm text-slate-300">
                          Camera opens automatically. Point it at the QR code.
                        </p>
                      </div>
                    )}

                    {qrSupported && (
                      <div className="space-y-3">
                        <div className="text-center py-1 sm:py-2">
                          <div className="animate-pulse mb-3">
                            <div className="text-4xl">📷</div>
                          </div>
                          <p className="text-slate-300 text-sm mb-3">
                            {qrScanning ? "Point camera at QR code..." : "Opening camera..."}
                          </p>
                        </div>

                        {/* QR Reader component */}
                        <div className="rounded-lg border-2 border-blue-500 overflow-hidden">
                          <QrReader
                            className="w-full"
                            scanDelay={500}
                            onResult={(result, scanError) => {
                              if (result) {
                                handleQrScanResult(result.getText());
                              } else if (
                                scanError &&
                                scanError.name !== "NotFoundException" &&
                                scanError.name !== "ChecksumException" &&
                                scanError.name !== "FormatException"
                              ) {
                                handleQrScanError(scanError);
                              }
                            }}
                            constraints={{ facingMode: "environment" }}
                            containerStyle={{ width: "100%" }}
                            videoContainerStyle={{ borderRadius: "0.5rem" }}
                            videoStyle={{ objectFit: "cover" }}
                          />
                        </div>

                        <Button
                          onClick={() => {
                            stopQrScanning();
                            setInputMode("rfid");
                          }}
                          variant="outline"
                          className="w-full border-slate-600 text-white hover:bg-slate-700"
                        >
                          Cancel Scan
                        </Button>
                      </div>
                    )}

                    {qrData && (
                      <Alert className="bg-green-900/30 border-green-700">
                        <AlertDescription className="text-green-300">
                          <div className="font-bold mb-1">✓ QR Code Detected!</div>
                          <div className="text-xs text-slate-300">Data: {qrData}</div>
                        </AlertDescription>
                      </Alert>
                    )}

                    {qrError && (
                      <Alert variant="destructive">
                        <AlertDescription className="space-y-3">
                          <div>{qrError}</div>
                          <Button
                            onClick={startQrScanning}
                            className="w-full bg-blue-600 hover:bg-blue-700"
                            disabled={isLoading}
                          >
                            Retry QR Scan
                          </Button>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}

              {/* Divider */}
              {(inputMode === "rfid" || inputMode === "qr") && (
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-600" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-slate-800 px-2 text-slate-400">
                      {isPrefilled ? "Data prefilled from scan (read-only)" : "Or enter manually below"}
                    </span>
                  </div>
                </div>
              )}

              {/* Form Fields - Only show for manual mode or after successful RFID/QR scan */}
              {(inputMode === "manual" || isPrefilled) && (
                <>
                  {isPrefilled && (
                    <div className="flex justify-end mb-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsPrefilled(false)}
                        className="border-blue-600 text-blue-400 hover:bg-blue-600/20"
                        disabled={isLoading}
                      >
                        ✏️ Enable Editing
                      </Button>
                    </div>
                  )}
                  <div className="space-y-2">
                <Label htmlFor="transactionID" className="text-slate-200">
                  Transaction ID *
                </Label>
                <Input
                  id="transactionID"
                  type="number"
                  value={transactionID}
                  onChange={(e) => setTransactionID(e.target.value)}
                  placeholder="e.g., 123456"
                  className={`bg-slate-700 border text-white placeholder:text-slate-400 ${isPrefilled ? "border-blue-600 bg-blue-900/20" : "border-slate-600"}`}
                  disabled={isLoading || isPrefilled}
                />
                {isPrefilled && (
                  <p className="text-blue-400 text-xs">🔒 Prefilled from scan - click "Enable Editing" to modify</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="noReq" className="text-slate-200">
                  No Request *
                </Label>
                <Input
                  id="noReq"
                  value={noReq}
                  onChange={(e) => setNoReq(e.target.value.toUpperCase())}
                  placeholder="e.g., REQ123456"
                  className={`bg-slate-700 border text-white placeholder:text-slate-400 uppercase ${isPrefilled ? "border-blue-600 bg-blue-900/20" : (noReq === "TOSNUS" ? "border-yellow-600" : "border-slate-600")}`}
                  disabled={isLoading || isPrefilled}
                />
                {noReq === "TOSNUS" && !isPrefilled && (
                  <p className="text-yellow-400 text-xs">⚠️ Default value detected. Please update with correct Request No.</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="container" className="text-slate-200">
                  Container *
                </Label>
                <Input
                  id="container"
                  value={container}
                  onChange={(e) => setContainer(e.target.value.toUpperCase())}
                  placeholder="e.g., TCLU1234567"
                  className={`bg-slate-700 border text-white placeholder:text-slate-400 uppercase ${isPrefilled ? "border-blue-600 bg-blue-900/20" : "border-slate-600"}`}
                  disabled={isLoading || isPrefilled}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="containerCombo" className="text-slate-200">
                  Container Combo *
                </Label>
                <Input
                  id="containerCombo"
                  value={containerCombo}
                  onChange={(e) => setContainerCombo(e.target.value.toUpperCase())}
                  placeholder="e.g., TCLU7654321"
                  className={`bg-slate-700 border text-white placeholder:text-slate-400 uppercase ${isPrefilled ? "border-green-600 bg-green-900/20" : "border-slate-600"}`}
                  disabled={isLoading}
                />
                {isPrefilled && (
                  <p className="text-green-400 text-xs">✏️ Prefilled from container - please verify/update with correct Container Combo</p>
                )}
              </div>

              <div className="bg-slate-700/50 border border-slate-600 rounded-md px-3 py-2">
                <p className="text-slate-300 text-sm">
                  <span className="font-medium">API Endpoint:</span>{" "}
                  <code className="text-blue-400">
                    /Transaction/{amsType === "INPUT" ? "InputManualAMS" : "UpdateManualOUTAMS"}
                  </code>
                </p>
              </div>
                </>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleSubmit}
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={isLoading}
              >
                {isLoading ? "Processing..." : "Submit"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Success State */}
        {formState === "success" && (
          <Card className="bg-green-900/30 border-green-700">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-6xl mb-4">✓</div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  {amsType === "INPUT" ? "AMS Input Successful!" : "AMS Update Successful!"}
                </h2>
                <p className="text-slate-300 mb-4">
                  {apiResponse?.message || "Request has been processed successfully."}
                </p>
                <div className="bg-slate-800 border border-slate-700 rounded-md p-4 text-left space-y-2">
                  <div>
                    <p className="text-slate-400 text-sm">Transaction ID:</p>
                    <p className="text-white font-mono">{transactionID}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">No Request:</p>
                    <p className="text-white font-mono">{noReq}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">Container:</p>
                    <p className="text-white font-mono">{container}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">Container Combo:</p>
                    <p className="text-white font-mono">{containerCombo}</p>
                  </div>
                </div>
                <Button
                  onClick={handleReset}
                  className="mt-4 bg-slate-700 hover:bg-slate-600"
                >
                  Process Another
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {formState === "error" && (
          <Card className="bg-red-900/30 border-red-700">
            <CardHeader>
              <CardTitle className="text-white">Processing Failed</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              {apiResponse && (
                <div className="bg-slate-800 border border-slate-700 rounded-md p-4">
                  <p className="text-slate-400 text-sm mb-1">API Response:</p>
                  <pre className="text-white text-xs overflow-auto">
                    {JSON.stringify(apiResponse, null, 2)}
                  </pre>
                </div>
              )}
              <Button
                onClick={() => {
                  setFormState("search");
                  setError("");
                }}
                className="w-full bg-slate-700 hover:bg-slate-600"
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        <Dialog open={!!transactionLookupResult} onOpenChange={(open) => !open && setTransactionLookupResult(null)}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle>Transaction Lookup Result</DialogTitle>
              <DialogDescription className="text-slate-400">
                API call details for the {transactionLookupResult?.source.toLowerCase()} flow.
              </DialogDescription>
            </DialogHeader>

            {/* Scanned Value */}
            <div className="rounded-md bg-slate-900 p-3 text-sm text-slate-200">
              <span className="text-slate-400">Scanned Value:</span> {transactionLookupResult?.value}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-700">
              <button
                onClick={() => setDebugPopupTab("request")}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  debugPopupTab === "request"
                    ? "border-b-2 border-blue-500 text-blue-400"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Request
              </button>
              <button
                onClick={() => setDebugPopupTab("response")}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  debugPopupTab === "response"
                    ? "border-b-2 border-blue-500 text-blue-400"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Response
              </button>
            </div>

            {/* Tab Content */}
            <div className="max-h-[40vh] overflow-auto">
              {debugPopupTab === "request" && transactionLookupResult?.request && (
                <div className="space-y-3">
                  <div className="rounded-md bg-slate-900 p-3 text-sm">
                    <div className="text-slate-400 mb-1">Method:</div>
                    <div className="text-white font-mono">{transactionLookupResult.request.method}</div>
                  </div>
                  <div className="rounded-md bg-slate-900 p-3 text-sm">
                    <div className="text-slate-400 mb-1">URL:</div>
                    <div className="text-white font-mono text-xs break-all">{transactionLookupResult.request.url}</div>
                  </div>
                  {transactionLookupResult.request.params && (
                    <div className="rounded-md bg-slate-900 p-3 text-sm">
                      <div className="text-slate-400 mb-1">Parameters:</div>
                      <pre className="text-xs text-slate-200 overflow-auto">
                        {JSON.stringify(transactionLookupResult.request.params, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {debugPopupTab === "response" && (
                <pre className="rounded-md bg-slate-950 p-4 text-xs text-slate-200 overflow-auto">
                  {JSON.stringify(transactionLookupResult?.response, null, 2)}
                </pre>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
