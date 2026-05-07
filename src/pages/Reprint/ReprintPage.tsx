import { useEffect, useRef, useState } from "react";
import { Printer } from "lucide-react";
import { QrReader } from "react-qr-reader";
import { toast } from "sonner";
import { CmsPrintPreviewDialog } from "@/components/CmsPrintPreviewDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNFCReader } from "@/hooks/useNFCReader";
import { useQRScanner } from "@/hooks/useQRScanner";
import { api } from "@/lib/api/client";
import { buildCmsPrintDocument } from "@/lib/cmsPrint";
import { buildGatepassFromScannedValue } from "@/lib/scan";
import type { PostGateTransaction } from "@/types";

export function ReprintPage() {
  const [inputMode, setInputMode] = useState<"manual" | "rfid" | "qr">("manual");
  const [transactionId, setTransactionId] = useState("");
  const [manualRfidInput, setManualRfidInput] = useState("");
  const [transaction, setTransaction] = useState<PostGateTransaction | null>(null);
  const [cmsPreviewHtml, setCmsPreviewHtml] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [detectedScanData, setDetectedScanData] = useState("");
  const [qrSessionKey, setQrSessionKey] = useState(0);
  const qrSectionRef = useRef<HTMLDivElement | null>(null);
  const qrProcessingRef = useRef(false);

  const {
    isSupported: nfcSupported,
    isReading: nfcReading,
    error: nfcError,
    startReading: startNfcReading,
    stopReading: stopNfcReading,
    lastReadData: nfcData,
  } = useNFCReader();

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

  const reprintFromTransaction = async (transactionData: PostGateTransaction) => {
    setTransaction(transactionData);

    const reprintResponse = await api.reprintCMS({
      transactionID: transactionData.id,
      laneID: transactionData.entrylaneid,
    });

    if (reprintResponse.state !== 0 || !reprintResponse.cms) {
      const errorMsg = reprintResponse.message || "CMS reprint data not found";
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    setCmsPreviewHtml(
      buildCmsPrintDocument(reprintResponse.cms, transactionData.entrylanename)
    );
    toast.success("CMS preview ready. Tap Print to continue.");
  };

  const handleManualReprint = async () => {
    const trxId = transactionId.trim();
    if (!trxId) {
      const errorMsg = "Please enter a Transaction ID";
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    await handleReprintByTransactionId(trxId);
  };

  const handleReprintByTransactionId = async (trxId: string) => {
    setIsLoading(true);
    setError("");
    setTransaction(null);
    setDetectedScanData("");

    try {
      const transactionResponse = await api.getTransactionByID(trxId);
      if (transactionResponse.state !== 0 || !transactionResponse.item) {
        const errorMsg = transactionResponse.message || "Transaction not found";
        setError(errorMsg);
        toast.error(errorMsg);
        return;
      }

      await reprintFromTransaction(transactionResponse.item);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to load CMS reprint data";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScannedReprint = async (scanData: string) => {
    setIsLoading(true);
    setError("");
    setTransaction(null);
    setManualRfidInput("");
    setDetectedScanData(scanData);

    try {
      const gatepass = buildGatepassFromScannedValue(scanData);
      if (!gatepass) {
        throw new Error("Scanned code is empty.");
      }

      const transactionResponse = await api.getTransactionByGatepass(gatepass);
      if (transactionResponse.state !== 0 || !transactionResponse.item) {
        const errorMsg = transactionResponse.message || "Transaction not found for this RFID/QR tag";
        setError(errorMsg);
        toast.error(errorMsg);
        return;
      }

      await reprintFromTransaction(transactionResponse.item);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to load CMS reprint data";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (nfcData && inputMode === "rfid") {
      handleScannedReprint(nfcData);
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
      if (typeof qrSectionRef.current?.scrollIntoView === "function") {
        qrSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }, [inputMode, qrSupported, startQrScanning, stopQrScanning]);

  useEffect(() => {
    return () => {
      stopNfcReading();
      stopQrScanning();
    };
  }, [stopNfcReading, stopQrScanning]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-3 sm:p-4">
      <div className="max-w-2xl mx-auto pt-4 sm:pt-8">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-3xl font-bold text-white">Reprint CMS</h1>
          <p className="text-slate-400 mt-1">Print CMS from an existing gate-in transaction.</p>
        </div>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Find CMS</CardTitle>
            <CardDescription className="text-slate-400">
              Enter transaction ID, RFID, or QR data to retrieve and preview CMS print data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              <Button
                type="button"
                variant={inputMode === "manual" ? "default" : "outline"}
                onClick={() => setInputMode("manual")}
                className={`${inputMode === "manual" ? "bg-blue-600 hover:bg-blue-700" : "border-slate-600 text-white hover:bg-slate-700"}`}
                disabled={isLoading || nfcReading || qrScanning}
              >
                Manual
              </Button>
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
            </div>

            {inputMode === "manual" && (
              <div className="space-y-2">
                <Label htmlFor="reprintTransactionId" className="text-slate-200">
                  Transaction ID *
                </Label>
                <Input
                  id="reprintTransactionId"
                  value={transactionId}
                  onChange={(event) => setTransactionId(event.target.value)}
                  placeholder="Enter Transaction ID"
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !isLoading) {
                      handleManualReprint();
                    }
                  }}
                  disabled={isLoading}
                  inputMode="numeric"
                />
              </div>
            )}

            {inputMode === "rfid" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reprintRfidInput" className="text-slate-200">
                    Container / RFID Number
                  </Label>
                  <Input
                    id="reprintRfidInput"
                    value={manualRfidInput}
                    onChange={(event) => setManualRfidInput(event.target.value)}
                    placeholder="Enter RFID or container code"
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !isLoading && manualRfidInput.trim()) {
                        handleScannedReprint(manualRfidInput.trim());
                      }
                    }}
                    disabled={isLoading || nfcReading}
                  />
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-600" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-slate-800 px-2 text-slate-400">Or scan with NFC</span>
                  </div>
                </div>

                {!nfcSupported && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      NFC not supported in this browser. Use Chrome for Android or manual RFID input.
                    </AlertDescription>
                  </Alert>
                )}

                {nfcSupported && !nfcReading && !nfcData && (
                  <Button
                    type="button"
                    onClick={startNfcReading}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={isLoading}
                  >
                    Start NFC Scan
                  </Button>
                )}

                {nfcReading && (
                  <div className="text-center py-4">
                    <p className="text-slate-300 text-sm mb-3">
                      Scanning for RFID tag... Hold tag near device.
                    </p>
                    <Button
                      type="button"
                      onClick={stopNfcReading}
                      variant="outline"
                      className="border-slate-600 text-white hover:bg-slate-700"
                    >
                      Cancel Scan
                    </Button>
                  </div>
                )}

                {nfcError && (
                  <Alert variant="destructive">
                    <AlertDescription>{nfcError}</AlertDescription>
                  </Alert>
                )}

                {manualRfidInput.trim() && (
                  <Button
                    type="button"
                    onClick={() => handleScannedReprint(manualRfidInput.trim())}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={isLoading || nfcReading}
                  >
                    {isLoading ? "Loading CMS..." : "Print CMS"}
                  </Button>
                )}
              </div>
            )}

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
                  <div className="space-y-3">
                    <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3">
                      <p className="text-center text-sm text-slate-300">
                        {qrScanning ? "Point camera at QR code..." : "Opening camera..."}
                      </p>
                    </div>

                    <div className="rounded-lg border-2 border-blue-500 overflow-hidden">
                      <QrReader
                        key={`reprint-qr-${qrSessionKey}`}
                        className="w-full"
                        videoId={`reprint-qr-video-${qrSessionKey}`}
                        scanDelay={500}
                        onResult={async (result, scanError) => {
                          if (result) {
                            const scannedText = result.getText();
                            if (isLoading || qrProcessingRef.current) {
                              return;
                            }

                            qrProcessingRef.current = true;
                            handleQrScanResult(scannedText);
                            await handleScannedReprint(scannedText);
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
                      type="button"
                      onClick={() => setInputMode("manual")}
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
                      <div className="font-bold mb-1">QR Code Detected</div>
                      <div className="text-xs text-slate-300">Data: {qrData}</div>
                    </AlertDescription>
                  </Alert>
                )}

                {qrError && (
                  <Alert variant="destructive">
                    <AlertDescription className="space-y-3">
                      <div>{qrError}</div>
                      <Button
                        type="button"
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

            {detectedScanData && (
              <Alert className="bg-blue-900/30 border-blue-700">
                <AlertDescription className="text-blue-300">
                  <div className="font-bold mb-1">
                    {isLoading ? "Processing scan..." : "Scanned value"}
                  </div>
                  <div className="text-xs text-slate-300">
                    Data: <code className="bg-slate-800 px-2 py-1 rounded">{detectedScanData}</code>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {transaction && (
              <div className="grid grid-cols-2 gap-4 text-sm rounded-md border border-slate-700 bg-slate-900/50 p-3">
                <div>
                  <Label className="text-slate-400">Container</Label>
                  <p className="text-white font-medium">{transaction.truckid || "-"}</p>
                </div>
                <div>
                  <Label className="text-slate-400">Request No</Label>
                  <p className="text-white font-medium">{transaction.container || "-"}</p>
                </div>
                <div>
                  <Label className="text-slate-400">Lane</Label>
                  <p className="text-white font-medium">{transaction.entrylanename || transaction.entrylaneid}</p>
                </div>
                <div>
                  <Label className="text-slate-400">Weight</Label>
                  <p className="text-white font-medium">
                    {transaction.entryweight > 0 ? `${transaction.entryweight.toLocaleString()} kg` : "-"}
                  </p>
                </div>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {inputMode === "manual" && (
              <Button
                type="button"
                onClick={handleManualReprint}
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={isLoading}
              >
                <Printer className="w-4 h-4 mr-2" />
                {isLoading ? "Loading CMS..." : "Print CMS"}
              </Button>
            )}
          </CardContent>
        </Card>

        <CmsPrintPreviewDialog
          html={cmsPreviewHtml}
          onOpenChange={(open) => {
            if (!open) {
              setCmsPreviewHtml(null);
            }
          }}
        />
      </div>
    </div>
  );
}
