import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "@/lib/api/client";
import type {
  Lane,
  PostGateEticketItem,
  PostGateTransaction,
} from "@/types";

// Helper to create a synthetic eticket from transaction data
function createEticketFromTransaction(trx: PostGateTransaction): PostGateEticketItem {
  // Create a gatepass string from transaction data
  // Format: -1|TERMINAL|TRUCKID|CONTAINER|||||
  const gatepass = `-1|${trx.TERMINAL}|${trx.TRUCKID}|${trx.CONTAINER}|||||`;

  return {
    id: trx.ID,
    datetime: trx.DATETIME,
    laneid: trx.ENTRYLANEID,
    transactionid: trx.ID,
    code: "I", // Default to "I" for IN
    data: gatepass,
    type: "IN",
    media: "picture1", // Default media
    reqno: trx.TRUCKID,
    container: trx.CONTAINER,
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

  // Check URL for trid and gateId parameters on mount
  useEffect(() => {
    const tridParam = searchParams.get("trid");
    const gateIdParam = searchParams.get("gateId");
    if (tridParam) {
      setTrxId(tridParam);
      if (gateIdParam) {
        setSelectedGate(parseInt(gateIdParam));
        // Auto-search if trid and gateId are in URL
        setTimeout(() => handleSearch(tridParam), 100);
      }
    }
  }, [searchParams]);

  // Update URL when searching
  const updateUrl = (trid: string, gateId: number) => {
    if (trid) {
      setSearchParams({ trid, gateId: gateId.toString() });
    } else {
      setSearchParams({});
    }
  };

  // Clear URL when resetting
  const clearUrl = () => {
    setSearchParams({});
  };

  const handleSearch = async (searchTrxId?: string) => {
    const tridToSearch = searchTrxId || trxId;
    if (!tridToSearch.trim()) {
      setError("Please enter a Transaction ID");
      return;
    }

    if (selectedGate === 0) {
      setError("Please select a gate");
      return;
    }

    setIsLoading(true);
    setFormState("search");
    setError("");

    // Update URL with transaction ID and gate ID
    updateUrl(tridToSearch.trim(), selectedGate);

    try {
      // Single API call: Get Transaction by ID (replaces GetEticketByTransaction + GetTransaction)
      const trxResponse = await api.getTransactionByID(tridToSearch.trim());

      if (trxResponse.state !== 0 || !trxResponse.item) {
        setError(trxResponse.message || "Transaction not found");
        setFormState("error");
        return;
      }

      // Transaction found - set transaction data
      const transactionData = trxResponse.item;
      setTransaction(transactionData);
      setWeight(transactionData.ENTRYWEIGHT || 0);

      // Create a synthetic eticket from transaction data for TruckIN call
      const syntheticEticket = createEticketFromTransaction(transactionData);
      setEtickets([syntheticEticket]);
      setSelectedEticketIndex(0);

      // Show review state with confirm button
      setFormState("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch transaction");
      setFormState("error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmGateIn = async () => {
    const currentEticket = etickets[selectedEticketIndex];
    if (!currentEticket) return;

    setIsLoading(true);
    setError("");

    try {
      // Single API call: TruckIN (matches original PostGate app behavior)
      const truckId = currentEticket.reqno || currentEticket.container || "TOSNUS";
      const nopol = currentEticket.container || currentEticket.code;
      const mediaScan = `${currentEticket.media}^${currentEticket.code}`;

      const response = await api.postGateTruckIN({
        transactionID: currentEticket.transactionid,
        laneID: selectedGate,
        truckID: truckId,
        nopol: nopol,
        postgate: true,
        mediaScan: mediaScan,
        gatepassList: [currentEticket.data],
      });

      if (response.state !== 0) {
        setError(response.message || "Failed to confirm gate-in");
        setFormState("error");
        return;
      }

      setFormState("success");

      // Reset after 3 seconds
      setTimeout(() => {
        setFormState("search");
        setTrxId("");
        setEtickets([]);
        setSelectedEticketIndex(0);
        setTransaction(null);
        setError("");
        clearUrl();
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to confirm gate-in");
      setFormState("error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
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
                Enter Transaction ID to retrieve transaction details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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

              <div className="space-y-2">
                <Label htmlFor="gate" className="text-slate-200">
                  Gate
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

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={() => handleSearch()}
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={isLoading}
              >
                {isLoading ? "Searching..." : "Search"}
              </Button>
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
                    clearUrl();
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
                      <p className="text-white font-medium">{transaction.TERMINAL}</p>
                    </div>
                    <div>
                      <Label className="text-slate-400">Truck ID</Label>
                      <p className="text-white font-medium">{transaction.TRUCKID}</p>
                    </div>
                    <div>
                      <Label className="text-slate-400">License Plate</Label>
                      <p className="text-white font-medium">{transaction.NOPOL}</p>
                    </div>
                    <div>
                      <Label className="text-slate-400">Lane</Label>
                      <p className="text-white font-medium">{transaction.ENTRYLANENAME}</p>
                    </div>
                    <div>
                      <Label className="text-slate-400">Entry Start Time</Label>
                      <p className="text-white font-medium text-xs">
                        {new Date(transaction.ENTRYSTARTTIME).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <Label className="text-slate-400">Entry Finish Time</Label>
                      <p className="text-white font-medium text-xs">
                        {new Date(transaction.ENTRYFINISHTIME).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <Label className="text-slate-400">Entry Weight</Label>
                      <p className="text-white font-medium">{transaction.ENTRYWEIGHT.toLocaleString()} kg</p>
                    </div>
                    <div>
                      <Label className="text-slate-400">Elapsed Time</Label>
                      <p className="text-white font-medium">{transaction.ENTRYELAPSEDTIME.toFixed(2)}s</p>
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
                    clearUrl();
                  }}
                  className="flex-1 border-slate-600 text-white hover:bg-slate-700"
                  disabled={isLoading}
                >
                  Back
                </Button>
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
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
