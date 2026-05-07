import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "@/lib/api/client";
import { useNFCReader } from "@/hooks/useNFCReader";
import { useQRScanner } from "@/hooks/useQRScanner";
import { CmsPrintPreviewDialog } from "@/components/CmsPrintPreviewDialog";
import { buildCmsPrintDocument } from "@/lib/cmsPrint";
import { buildXpsUrlFromPrintPath } from "@/lib/cmsJsonPrint";
import { buildGatepassFromScannedValue } from "@/lib/scan";
import { toast } from "sonner";
import { QrReader } from "react-qr-reader";
import type {
  Lane,
  PostGateEticketItem,
  PostGateTransaction,
} from "@/types";

// Helper to create a synthetic eticket from transaction data
function createEticketFromTransaction(trx: PostGateTransaction): PostGateEticketItem {
  // Create a gatepass string from transaction data
  // Format: -1|TERMINAL|TRUCKID|CONTAINER|||||
  // Note: trx.truckid contains the actual container number (e.g., "05B575DE")
  // trx.container contains the noreq (e.g., "TOSNUS")
  const actualContainer = trx.truckid; // Truck ID is the actual container number
  const noreq = trx.container; // Container field has the noreq value

  const gatepass = `-1|${trx.terminal}|${noreq}|${actualContainer}|||||`;

  return {
    id: trx.id,
    datetime: trx.datetime,
    laneid: trx.entrylaneid,
    transactionid: trx.id,
    code: "I", // Default to "I" for IN
    data: gatepass,
    type: "IN",
    media: "picture1", // Default media
    reqno: noreq,
    container: actualContainer,
  };
}
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

type FormState = "search" | "review" | "list" | "success" | "error";
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

export function PostGatePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [formState, setFormState] = useState<FormState>("search");
  const [isLoading, setIsLoading] = useState(false);
  const [trxId, setTrxId] = useState("");
  const [selectedGate, setSelectedGate] = useState<number>(0);
  const [gates, setGates] = useState<Lane[]>([]);
  const [isLoadingGates, setIsLoadingGates] = useState(true);
  const [etickets, setEtickets] = useState<PostGateEticketItem[]>([]);
  const [selectedEticketIndex, setSelectedEticketIndex] = useState(0);
  const [transaction, setTransaction] = useState<PostGateTransaction | null>(null);
  const [weight, setWeight] = useState<number>(0);
  const [error, setError] = useState<string>("");
  const [selectedEticketForModal, setSelectedEticketForModal] = useState<PostGateEticketItem | null>(null);
  const [showServerWarning, setShowServerWarning] = useState(false);
  const [inputMode, setInputMode] = useState<"manual" | "rfid" | "qr">("rfid");
  const [isRfidTransaction, setIsRfidTransaction] = useState(false);
  const [manualRfidInput, setManualRfidInput] = useState("");
  const [showManualInputForm, setShowManualInputForm] = useState(false);
  const [transactionLookupResult, setTransactionLookupResult] = useState<TransactionLookupResultState | null>(null);
  const [manualNoreq, setManualNoreq] = useState("");
  const [manualContainer, setManualContainer] = useState("");
  const [manualContainerCombo, setManualContainerCombo] = useState("");
  const [detectedRfidData, setDetectedRfidData] = useState<string>("");
  const [debugPopupTab, setDebugPopupTab] = useState<"request" | "response">("request");
  const [cmsPreviewHtml, setCmsPreviewHtml] = useState<string | null>(null);
  const [cmsXpsUrl, setCmsXpsUrl] = useState("");
  const [qrSessionKey, setQrSessionKey] = useState(0);
  const qrSectionRef = useRef<HTMLDivElement | null>(null);
  const qrProcessingRef = useRef(false);

  const printCms = async (
    laneId: number,
    cms: Record<string, unknown> | undefined
  ) => {
    if (!cms) {
      console.warn("TruckIN response has no CMS payload to print.");
      return;
    }

    const lane = gates.find((item) => item.id === laneId);
    const printDocument = buildCmsPrintDocument(cms, lane?.name);
    setCmsPreviewHtml(printDocument);
    toast.success("CMS preview ready. Tap Print to continue.");
  };

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

  // Fetch gates and server status on mount
  useEffect(() => {
    const fetchGates = async () => {
      console.log("Fetching gates and server status...");
      try {
        const allLanes = await api.getAllLanes();
        console.log("All lanes response:", allLanes);

        // Check server status
        const statusResponse = await api.checkServerStatus();
        console.log("Server status response:", statusResponse);

        // Show warning if server is not in normal mode
        if (statusResponse.state === 0) {
          if (statusResponse.autogateMode || statusResponse.dbDown) {
            setShowServerWarning(true);
          } else {
            setShowServerWarning(false);
          }
        }

        // Filter for IN transaction type only
        const inGates = allLanes.filter((lane) => lane.transactiontype === "IN");
        console.log("Filtered IN gates:", inGates);
        setGates(inGates);
        if (inGates.length > 0) {
          setSelectedGate(inGates[0].id);
        }
      } catch (err) {
        console.error("Failed to fetch gates/status:", err);
      } finally {
        setIsLoadingGates(false);
      }
    };
    fetchGates();
  }, []);

  // Check URL for trid parameter on mount (manual mode only)
  useEffect(() => {
    const tridParam = searchParams.get("trid");
    if (tridParam) {
      setInputMode("manual"); // URL params imply manual mode
      setTrxId(tridParam);
      // Auto-search if trid is in URL (user must have selected gate manually)
      setTimeout(() => handleSearch(tridParam), 100);
    }
  }, [searchParams]);

  // Update URL when searching (manual mode only - no gateId in URL)
  const updateUrl = (trid: string) => {
    if (trid) {
      setSearchParams({ trid });
    } else {
      setSearchParams({});
    }
  };

  // Clear URL when resetting
  const clearUrl = () => {
    setSearchParams({});
  };

  // Handle RFID validation via GetTransaction endpoint
  const handleRfidValidation = async (rfidData: string) => {
    setIsLoading(true);
    setError("");
    setManualRfidInput(""); // Clear manual input after submission
    setDetectedRfidData(rfidData); // Store detected data to show to user

    try {
      const gatepass = buildGatepassFromScannedValue(rfidData);
      console.log("Step 1: Resolved scanned value to gatepass:", {
        original: rfidData,
        gatepass,
      });

      if (!gatepass) {
        throw new Error("Scanned code is empty.");
      }

      // Step 2: Call GetTransaction endpoint with gatepass
      const transactionResponse = await api.getTransactionByGatepass(gatepass);
      console.log("Step 2: GetTransaction Response:", transactionResponse);

      if (transactionResponse.state !== 0 || !transactionResponse.item) {
        const errorMsg = transactionResponse.message || "Transaction not found for this RFID/QR tag";
        console.error("Transaction not found. State:", transactionResponse.state, "Message:", errorMsg);
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
        setDetectedRfidData(""); // Clear detected data on error
        return;
      }

      const transactionData = transactionResponse.item;
      console.log("Step 3: Got transaction:", transactionData.id, "Lane:", transactionData.entrylaneid);

      // Step 4: Call GetEticketByTransaction with transactionId and laneId from transaction
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
      console.log("Step 4: Got etickets:", eticketsData.length, "etickets");

      const firstEticket = eticketsData[0];
      const needsReviewNotice = eticketsData.some(
        (et) => et.reqno === "TOSNUS" || et.code === et.container
      );

      console.log("Step 5: Showing returned transaction data for user review");
      setTransaction(transactionData);
      setWeight(transactionData.entryweight || 0);
      setEtickets(eticketsData);
      setSelectedEticketIndex(0);
      setIsRfidTransaction(true);
      setShowManualInputForm(false);
      setTransactionLookupResult(null);
      setManualNoreq(firstEticket.reqno || "");
      setManualContainer(firstEticket.container || "");
      setManualContainerCombo(firstEticket.container || "");
      setDetectedRfidData(""); // Clear detected data after successful load
      setFormState("review");
      setInputMode("manual"); // Switch to manual only after successful processing

      if (needsReviewNotice) {
        toast.warning("Please review the returned data before continuing.");
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "RFID validation failed";
      setError(errorMsg);
      toast.error(errorMsg);
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle NFC data when read
  useEffect(() => {
    if (nfcData && inputMode === "rfid") {
      console.log("NFC data received:", nfcData);
      handleRfidValidation(nfcData);
      // Don't switch mode here - let handleRfidValidation switch after completion
    }
  }, [nfcData]);

  useEffect(() => {
    if (inputMode !== "qr") {
      qrProcessingRef.current = false;
      stopQrScanning();
      return;
    }

    if (!qrSupported) {
      return;
    }

    setQrSessionKey((current) => current + 1);
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

  const handleSearch = async (searchTrxId?: string) => {
    const tridToSearch = searchTrxId || trxId;
    if (!tridToSearch.trim()) {
      setError("Please enter a Transaction ID");
      toast.error("Please enter a Transaction ID");
      return;
    }

    // Only validate gate selection for manual mode
    if (inputMode === "manual" && selectedGate === 0) {
      setError("Please select a gate");
      toast.error("Please select a gate");
      return;
    }

    setIsLoading(true);
    setFormState("search");
    setError("");
    setIsRfidTransaction(false); // Reset RFID flag for manual search

    // Update URL with transaction ID (manual mode only)
    updateUrl(tridToSearch.trim());

    try {
      // Single API call: Get Transaction by ID (replaces GetEticketByTransaction + GetTransaction)
      const trxResponse = await api.getTransactionByID(tridToSearch.trim());

      if (trxResponse.state !== 0 || !trxResponse.item) {
        const errorMsg = trxResponse.message || "Transaction not found";
        setError(errorMsg);
        toast.error(errorMsg);
        setFormState("error");
        return;
      }

      // Transaction found - set transaction data
      const transactionData = trxResponse.item;
      setTransaction(transactionData);
      setWeight(transactionData.entryweight || 0);

      // Create a synthetic eticket from transaction data for TruckIN call
      const syntheticEticket = createEticketFromTransaction(transactionData);
      setEtickets([syntheticEticket]);
      setSelectedEticketIndex(0);

      // Show review state with confirm button
      setFormState("review");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to fetch transaction";
      setError(errorMsg);
      toast.error(errorMsg);
      setFormState("error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmGateIn = async () => {
    const currentEticket = etickets[selectedEticketIndex];
    if (!currentEticket) return;

    // Check if manual input is required and not filled
    // If code == container, need all 3 fields: noreq, container, containerCombo
    const needsContainerInput = currentEticket.code === currentEticket.container;
    const requiredFields = [];

    if (!manualNoreq.trim()) requiredFields.push("Request No");
    if (needsContainerInput && !manualContainer.trim()) requiredFields.push("Container");
    if (!manualContainerCombo.trim()) requiredFields.push("Container Combo");

    if (showManualInputForm && requiredFields.length > 0) {
      const errorMsg = `Please fill in all required fields: ${requiredFields.join(", ")}`;
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      let truckId, nopol, mediaScan;

      // For RFID transactions, use specific format
      if (isRfidTransaction) {
        // Use manual input values if provided, otherwise use eticket values
        truckId = showManualInputForm ? manualNoreq.trim() : (currentEticket.reqno || "TOSNUS");
        nopol = needsContainerInput ? manualContainer.trim() : currentEticket.container;
        mediaScan = needsContainerInput ? `TID^${manualContainer.trim()}` : `TID^${currentEticket.container}`;
      } else {
        // For manual transactions, use original logic
        truckId = currentEticket.reqno || currentEticket.container || "TOSNUS";
        nopol = needsContainerInput ? manualContainer.trim() : (currentEticket.container || currentEticket.code);
        mediaScan = `${currentEticket.media}^${currentEticket.code}`;
      }

      // Update eticket data if manual input was provided
      let gatepassData = currentEticket.data;
      let gatepassList: string[] = [];

      if (showManualInputForm) {
        // Update gatepass with manual values: -1|T3I|{NOREQ}|{CONTAINER}|||||
        const gatepassParts = currentEticket.data.split("|");
        gatepassParts[2] = manualNoreq.trim(); // Update position 2 (TRUCKID/NOREQ)
        if (needsContainerInput) {
          gatepassParts[3] = manualContainer.trim(); // Update position 3 (CONTAINER)
        }
        gatepassData = gatepassParts.join("|");
        gatepassList = [gatepassData];

        // Add container combo as separate gatepass if provided
        if (manualContainerCombo.trim()) {
          const comboGatepass = `-1|T3I|${manualNoreq.trim()}|${manualContainerCombo.trim()}|||||`;
          gatepassList.push(comboGatepass);
        }
      } else {
        gatepassList = [gatepassData];
      }

      const response = await api.postGateTruckIN({
        transactionID: currentEticket.transactionid,
        laneID: currentEticket.laneid,
        truckID: truckId,
        nopol: nopol,
        postgate: true,
        mediaScan: mediaScan,
        gatepassList: gatepassList,
      });

      if (response.state !== 0) {
        const errorMsg = response.message || "Failed to confirm gate-in";
        setError(errorMsg);
        toast.error(errorMsg);
        setFormState("error");
        return;
      }

      try {
        const refreshedTransactionResponse = await api.getTransactionByID(
          currentEticket.transactionid.toString()
        );
        if (refreshedTransactionResponse.state === 0 && refreshedTransactionResponse.item) {
          setTransaction(refreshedTransactionResponse.item);
          setCmsXpsUrl(buildXpsUrlFromPrintPath(refreshedTransactionResponse.item.entryprint) || "");
        }
      } catch (refreshError) {
        console.warn("Unable to fetch generated XPS path after TruckIN:", refreshError);
      }

      await printCms(currentEticket.laneid, response.cms);
      toast.success("Gate-in confirmed successfully!");
      setFormState("success");

      // Reset after 3 seconds
      setTimeout(() => {
        setFormState("search");
        setTrxId("");
        setEtickets([]);
        setSelectedEticketIndex(0);
        setTransaction(null);
        setInputMode("manual");
        setIsRfidTransaction(false);
        setManualRfidInput("");
        setShowManualInputForm(false);
        setManualNoreq("");
        setManualContainer("");
        setManualContainerCombo("");
        setDetectedRfidData("");
        setCmsXpsUrl("");
        setError("");
        clearUrl();
        stopNfcReading();
        stopQrScanning();
      }, 3000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to confirm gate-in";
      setError(errorMsg);
      toast.error(errorMsg);
      setFormState("error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReprintCms = async () => {
    const currentEticket = etickets[selectedEticketIndex];
    if (!currentEticket) return;

    setIsLoading(true);
    setError("");

    try {
      const response = await api.reprintCMS({
        transactionID: currentEticket.transactionid,
        laneID: currentEticket.laneid,
      });

      if (response.state !== 0 || !response.cms) {
        const errorMsg =
          response.message ||
          "No saved CMS print data found for this transaction. Reprint only works after a successful Gate In/TruckIN print was saved.";
        setError(errorMsg);
        toast.error(errorMsg);
        return;
      }

      await printCms(currentEticket.laneid, response.cms);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to reprint CMS";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-3 sm:p-4">
      <div className="max-w-2xl mx-auto pt-4 sm:pt-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <h1 className="text-3xl font-bold text-white">TO3 Postgate</h1>
        </div>

        {/* Server Warning - Autogate Mode or DB Down */}
        {showServerWarning && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>
              <div className="font-bold mb-2">⚠️ SERVER WARNING</div>
              <div className="space-y-2">
                <p>Server is in <strong>Autogate Mode</strong> or <strong>Database Down</strong>.</p>
                <p className="text-sm text-slate-300">Gate-in operations may not process correctly. Please verify:</p>
                <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                  <li>Server is connected to TOS</li>
                  <li>Autogate system is running</li>
                  <li>Database is accessible</li>
                </ul>
                <p className="text-sm mt-2">Continue only if you can confirm these conditions are met.</p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Search Form */}
        {(formState === "search" || formState === "error") && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Search Transaction</CardTitle>
              <CardDescription className="text-slate-400">
                Enter Transaction ID or scan RFID tag to retrieve transaction details
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

              {/* Manual Input */}
              {inputMode === "manual" && (
                <div className="space-y-2">
                  <Label htmlFor="trxId" className="text-slate-200">
                    Transaction ID *
                  </Label>
                  <Input
                    id="trxId"
                    value={trxId}
                    onChange={(e) => setTrxId(e.target.value)}
                    placeholder="Enter Transaction ID"
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                    onKeyPress={(e) => e.key === "Enter" && !isLoading && handleSearch()}
                    disabled={isLoading}
                  />
                </div>
              )}

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
                            key={`postgate-qr-${qrSessionKey}`}
                            className="w-full"
                            videoId={`postgate-qr-video-${qrSessionKey}`}
                            scanDelay={500}
                            onResult={async (result, scanError) => {
                              if (result) {
                                const scannedText = result.getText();
                                if (isLoading || qrProcessingRef.current) {
                                  return;
                                }

                                qrProcessingRef.current = true;
                                handleQrScanResult(scannedText);
                                await handleRfidValidation(scannedText);
                                qrProcessingRef.current = false;
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
                            videoContainerStyle={{
                              borderRadius: "0.5rem",
                              paddingTop: "78%",
                              minHeight: "280px",
                              background: "#020617",
                            }}
                            videoStyle={{ objectFit: "cover", minHeight: "280px" }}
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

              {/* Show detected RFID/QR data and loading state */}
              {detectedRfidData && (
                <Alert className="bg-blue-900/30 border-blue-700">
                  <AlertDescription className="text-blue-300">
                    {isLoading ? (
                      <div className="flex items-center gap-3">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-300 border-t-transparent"></div>
                        <div>
                          <div className="font-bold">Processing {inputMode === "qr" ? "QR Code" : "RFID Tag"}...</div>
                          <div className="text-xs text-slate-300 mt-1">
                            Detected: <code className="bg-slate-800 px-2 py-1 rounded">{detectedRfidData}</code>
                          </div>
                          <div className="text-xs text-slate-400 mt-1">Fetching transaction details...</div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="font-bold mb-1">✓ {inputMode === "qr" ? "QR Code" : "RFID Tag"} Detected</div>
                        <div className="text-xs text-slate-300">
                          Data: <code className="bg-slate-800 px-2 py-1 rounded">{detectedRfidData}</code>
                        </div>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {inputMode === "manual" && (
                <div className="space-y-2">
                  <Label htmlFor="gate" className="text-slate-200">
                    Gate *
                  </Label>
                  <select
                    id="gate"
                    value={selectedGate}
                    onChange={(e) => setSelectedGate(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white"
                    disabled={isLoading || isLoadingGates}
                  >
                    {isLoadingGates ? (
                      <option>Loading gates...</option>
                    ) : gates.length === 0 ? (
                      <option>No gates available</option>
                    ) : (
                      gates.map((gate) => (
                        <option key={gate.id} value={gate.id}>
                          {gate.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {inputMode === "manual" && (
                <Button
                  onClick={() => handleSearch()}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={isLoading}
                >
                  {isLoading ? "Searching..." : "Search"}
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Eticket List (when transaction not found) */}
        {formState === "list" && etickets.length > 0 && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Select Container</CardTitle>
              <CardDescription className="text-slate-400">
                Transaction details not found. Select a container to view details.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3">
                {etickets.map((et) => (
                  <Card
                    key={et.id}
                    className="bg-slate-700 border-slate-600 hover:bg-slate-650 cursor-pointer transition-colors"
                    onClick={() => setSelectedEticketForModal(et)}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-white font-medium">{et.container}</h3>
                          <p className="text-slate-400 text-sm mt-1">
                            Request: {et.reqno}
                          </p>
                          <p className="text-slate-500 text-xs mt-1">
                            Code: {et.code}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          className="border-slate-500 text-white hover:bg-slate-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEticketForModal(et);
                          }}
                        >
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex gap-3 mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setFormState("search");
                    setEtickets([]);
                    setSelectedEticketIndex(0);
                    setTransaction(null);
                    setInputMode("manual");
                    setIsRfidTransaction(false);
                    setManualRfidInput("");
                    setShowManualInputForm(false);
                    setTransactionLookupResult(null);
                    setManualNoreq("");
                    setManualContainer("");
                    setManualContainerCombo("");
                    setDetectedRfidData("");
                    setCmsXpsUrl("");
                    clearUrl();
                    stopNfcReading();
                    stopQrScanning();
                  }}
                  className="flex-1 border-slate-600 text-white hover:bg-slate-700"
                >
                  Back
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Eticket Detail Modal */}
        <Dialog open={!!selectedEticketForModal} onOpenChange={(open) => !open && setSelectedEticketForModal(null)}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle>Eticket Details</DialogTitle>
              <DialogDescription className="text-slate-400">
                Detailed information for selected container
              </DialogDescription>
            </DialogHeader>
            {selectedEticketForModal && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-slate-400">Container</Label>
                    <p className="text-white font-medium">{selectedEticketForModal.container}</p>
                  </div>
                  <div>
                    <Label className="text-slate-400">Request No</Label>
                    <p className="text-white font-medium">{selectedEticketForModal.reqno}</p>
                  </div>
                  <div>
                    <Label className="text-slate-400">Transaction ID</Label>
                    <p className="text-white font-medium">{selectedEticketForModal.transactionid}</p>
                  </div>
                  <div>
                    <Label className="text-slate-400">Lane ID</Label>
                    <p className="text-white font-medium">{selectedEticketForModal.laneid}</p>
                  </div>
                  <div>
                    <Label className="text-slate-400">Code</Label>
                    <p className="text-white font-medium">{selectedEticketForModal.code}</p>
                  </div>
                  <div>
                    <Label className="text-slate-400">Type</Label>
                    <p className="text-white font-medium">{selectedEticketForModal.type}</p>
                  </div>
                  <div>
                    <Label className="text-slate-400">Media</Label>
                    <p className="text-white font-medium">{selectedEticketForModal.media}</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-slate-400">Eticket Data</Label>
                    <p className="text-white font-mono text-xs bg-slate-900 p-2 rounded">
                      {selectedEticketForModal.data}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={() => setSelectedEticketForModal(null)}
                    className="bg-slate-600 hover:bg-slate-700"
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

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

            <div className="flex gap-3 mt-4">
              <Button
                onClick={() => setTransactionLookupResult(null)}
                className="flex-1 bg-slate-600 hover:bg-slate-700"
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <CmsPrintPreviewDialog
          html={cmsPreviewHtml}
          xpsUrl={cmsXpsUrl}
          onOpenChange={(open) => {
            if (!open) {
              setCmsPreviewHtml(null);
            }
          }}
        />

        {/* Review Form */}
        {formState === "review" && etickets.length > 0 && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Confirm Gate-In</CardTitle>
              <CardDescription className="text-slate-400">
                Review eticket details before confirming gate-in
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Tabs for multiple etickets */}
              {etickets.length > 1 && (
                <div className="flex flex-wrap gap-2 border-b border-slate-700 pb-2">
                  {etickets.map((et, index) => (
                    <button
                      key={et.id}
                      onClick={() => setSelectedEticketIndex(index)}
                      className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
                        selectedEticketIndex === index
                          ? "bg-blue-600 text-white"
                          : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                      }`}
                    >
                      {et.container || `Ticket ${index + 1}`}
                    </button>
                  ))}
                </div>
              )}

              {/* Current eticket details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-slate-400">Container</Label>
                  <p className="text-white font-medium">{etickets[selectedEticketIndex].container}</p>
                </div>
                <div>
                  <Label className="text-slate-400">Request No</Label>
                  <p className="text-white font-medium">{etickets[selectedEticketIndex].reqno}</p>
                </div>
                <div>
                  <Label className="text-slate-400">Transaction ID</Label>
                  <p className="text-white font-medium">{etickets[selectedEticketIndex].transactionid}</p>
                </div>
                <div>
                  <Label className="text-slate-400">Lane ID</Label>
                  <p className="text-white font-medium">{etickets[selectedEticketIndex].laneid}</p>
                </div>
                <div>
                  <Label className="text-slate-400">Code</Label>
                  <p className="text-white font-medium">{etickets[selectedEticketIndex].code}</p>
                </div>
                <div>
                  <Label className="text-slate-400">Type</Label>
                  <p className="text-white font-medium">{etickets[selectedEticketIndex].type}</p>
                </div>
                {transaction && (
                  <>
                    <div>
                      <Label className="text-slate-400">Terminal</Label>
                      <p className="text-white font-medium">{transaction.terminal}</p>
                    </div>
                    <div>
                      <Label className="text-slate-400">Truck ID</Label>
                      <p className="text-white font-medium">{transaction.truckid}</p>
                    </div>
                    <div>
                      <Label className="text-slate-400">License Plate</Label>
                      <p className="text-white font-medium">{transaction.nopol}</p>
                    </div>
                    <div>
                      <Label className="text-slate-400">Lane</Label>
                      <p className="text-white font-medium">{transaction.entrylanename}</p>
                    </div>
                    <div>
                      <Label className="text-slate-400">Entry Start Time</Label>
                      <p className="text-white font-medium text-xs">
                        {new Date(transaction.entrystarttime).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <Label className="text-slate-400">Entry Finish Time</Label>
                      <p className="text-white font-medium text-xs">
                        {new Date(transaction.entryfinishtime).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <Label className="text-slate-400">Entry Weight</Label>
                      <p className="text-white font-medium">{transaction.entryweight.toLocaleString()} kg</p>
                    </div>
                    <div>
                      <Label className="text-slate-400">Elapsed Time</Label>
                      <p className="text-white font-medium">{transaction.entryelapsedtime.toFixed(2)}s</p>
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-slate-200">
                  Weight (kg)
                </Label>
                <div className="bg-slate-700 border border-slate-600 rounded-md px-3 py-2">
                  <p className="text-white font-medium">
                    {weight > 0 ? weight.toLocaleString() : "-"}
                  </p>
                </div>
              </div>

              {!transaction && (
                <Alert variant="destructive">
                  <AlertDescription>
                    Transaction details not found. Cannot confirm gate-in without transaction record.
                  </AlertDescription>
                </Alert>
              )}

              {/* Manual Input Form - shown when noreq = TOSNUS or code == container */}
              {showManualInputForm && (
                <Alert className="bg-yellow-900/30 border-yellow-700">
                  <AlertDescription className="text-yellow-300">
                    <div className="font-bold mb-3">⚠️ Additional Information Required</div>
                    <div className="space-y-3">
                      <div className="text-sm">
                        {etickets[selectedEticketIndex]?.code === etickets[selectedEticketIndex]?.container
                          ? "Code equals container. Please provide the complete container information."
                          : "Request No is 'TOSNUS' (default value). Please provide the correct information."}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="manualNoreq" className="text-yellow-200">
                          Request No (noreq) *
                        </Label>
                        <Input
                          id="manualNoreq"
                          value={manualNoreq}
                          onChange={(e) => setManualNoreq(e.target.value)}
                          placeholder="Enter Request No"
                          className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                          disabled={isLoading}
                        />
                      </div>
                      {etickets[selectedEticketIndex]?.code === etickets[selectedEticketIndex]?.container && (
                        <div className="space-y-2">
                          <Label htmlFor="manualContainer" className="text-yellow-200">
                            Container Number *
                          </Label>
                          <Input
                            id="manualContainer"
                            value={manualContainer}
                            onChange={(e) => setManualContainer(e.target.value)}
                            placeholder="Enter Container Number"
                            className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                            disabled={isLoading}
                          />
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label htmlFor="manualContainerCombo" className="text-yellow-200">
                          Container Combo *
                        </Label>
                        <Input
                          id="manualContainerCombo"
                          value={manualContainerCombo}
                          onChange={(e) => setManualContainerCombo(e.target.value)}
                          placeholder="Enter Container Combo"
                          className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setFormState("search");
                    setEtickets([]);
                    setSelectedEticketIndex(0);
                    setTransaction(null);
                    setInputMode("manual");
                    setIsRfidTransaction(false);
                    setManualRfidInput("");
                    setShowManualInputForm(false);
                    setTransactionLookupResult(null);
                    setManualNoreq("");
                    setManualContainer("");
                    setManualContainerCombo("");
                    setDetectedRfidData("");
                    setCmsXpsUrl("");
                    clearUrl();
                    stopNfcReading();
                    stopQrScanning();
                  }}
                  className="flex-1 border-slate-600 text-white hover:bg-slate-700"
                  disabled={isLoading}
                >
                  Back
                </Button>
                {transaction && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleReprintCms}
                    className="flex-1 border-blue-600 text-blue-300 hover:bg-blue-600/20"
                    disabled={isLoading}
                  >
                    {isLoading ? "Loading..." : "TEST PRINT CMS"}
                  </Button>
                )}
                {transaction && (
                  <Button
                    onClick={handleConfirmGateIn}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    disabled={isLoading}
                  >
                    {isLoading ? "Processing..." : "CONFIRM GATE-IN"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Success State */}
        {formState === "success" && (
          <Card className="bg-green-900/30 border-green-700">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-6xl mb-4">✓</div>
                <h2 className="text-2xl font-bold text-white mb-2">Gate-In Successful!</h2>
                <p className="text-slate-300">Transaction has been confirmed.</p>
                {cmsXpsUrl && (
                  <a
                    href={cmsXpsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex rounded-md border border-green-500 px-4 py-2 text-sm font-medium text-green-100 hover:bg-green-800/40"
                  >
                    Open Original XPS
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
