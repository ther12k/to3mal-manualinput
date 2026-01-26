import { useState, useEffect } from "react";
import { api } from "@/lib/api/client";
import type {
  Lane,
  PostGateEticketItem,
  PostGateTransaction,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

type FormState = "search" | "review" | "success" | "error";

export function PostGatePage() {
  const [formState, setFormState] = useState<FormState>("search");
  const [isLoading, setIsLoading] = useState(false);
  const [trxId, setTrxId] = useState("");
  const [selectedGate, setSelectedGate] = useState<number>(0);
  const [gates, setGates] = useState<Lane[]>([]);
  const [isLoadingGates, setIsLoadingGates] = useState(true);
  const [eticket, setEticket] = useState<PostGateEticketItem | null>(null);
  const [transaction, setTransaction] = useState<PostGateTransaction | null>(null);
  const [weight, setWeight] = useState<number>(0);
  const [error, setError] = useState<string>("");

  // Fetch gates on mount
  useEffect(() => {
    const fetchGates = async () => {
      console.log("Fetching gates...");
      try {
        const allLanes = await api.getAllLanes();
        console.log("All lanes response:", allLanes);
        // Filter for IN transaction type only
        const inGates = allLanes.filter((lane) => lane.transactiontype === "IN");
        console.log("Filtered IN gates:", inGates);
        setGates(inGates);
        if (inGates.length > 0) {
          setSelectedGate(inGates[0].id);
        }
      } catch (err) {
        console.error("Failed to fetch gates:", err);
      } finally {
        setIsLoadingGates(false);
      }
    };
    fetchGates();
  }, []);

  const handleSearch = async () => {
    if (!trxId.trim()) {
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

    try {
      // Step 1: Get Etickets with selected gate/lane ID
      const trxResponse = await api.getPostGateTransaction(trxId.trim(), selectedGate);

      if (trxResponse.state !== 0 || !trxResponse.item || trxResponse.item.length === 0) {
        setError("No etickets found for this transaction");
        setFormState("error");
        return;
      }

      // Get the first eticket from the array
      const firstEticket = trxResponse.item[0];
      setEticket(firstEticket);

      // Step 2: Try to get Transaction details by Gatepass (optional - may not exist for new transactions)
      try {
        const trxDetailedResponse = await api.getTransactionByGatepass(firstEticket.data);

        if (trxDetailedResponse.state === 0 && trxDetailedResponse.item) {
          setTransaction(trxDetailedResponse.item);
          // Set weight from transaction entry weight
          setWeight(trxDetailedResponse.item.entryweight || 0);
        } else {
          // Transaction not found yet (new transaction), set weight to 0
          setWeight(0);
        }
      } catch (err) {
        // GetTransaction failed, proceed with eticket data only
        console.log("Transaction details not available, using eticket data");
        setWeight(0);
      }

      // Go to review form
      setFormState("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch transaction");
      setFormState("error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmGateIn = async () => {
    if (!eticket) return;

    setIsLoading(true);
    setError("");

    try {
      // Step 2: Update Entry Transaction Weight (only if weight > 0)
      if (weight > 0) {
        const weightResponse = await api.updateEntryTransactionWeight(eticket.transactionid, weight);

        if (weightResponse.state !== 0) {
          setError("Failed to update weight: " + weightResponse.message);
          setFormState("error");
          return;
        }
      }

      // Step 3: TruckIN (Finalize)
      // Use eticket data for truckID and nopol, and construct mediaScan
      const truckId = eticket.reqno || eticket.container || "TOSNUS";
      const nopol = eticket.container || eticket.code;
      const mediaScan = `${eticket.media}^${eticket.code}`;

      const response = await api.postGateTruckIN({
        transactionID: eticket.transactionid,
        laneID: selectedGate, // Use the selected gate
        truckID: truckId,
        nopol: nopol,
        postgate: true,
        mediaScan: mediaScan,
        gatepassList: [eticket.data], // Use the eticket data string
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
        setEticket(null);
        setTransaction(null);
        setError("");
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
                onClick={handleSearch}
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={isLoading}
              >
                {isLoading ? "Searching..." : "Search"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Review Form */}
        {formState === "review" && eticket && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Confirm Gate-In</CardTitle>
              <CardDescription className="text-slate-400">
                Review eticket details and enter weight before confirming
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-slate-400">Container</Label>
                  <p className="text-white font-medium">{eticket.container}</p>
                </div>
                <div>
                  <Label className="text-slate-400">Request No</Label>
                  <p className="text-white font-medium">{eticket.reqno}</p>
                </div>
                <div>
                  <Label className="text-slate-400">Transaction ID</Label>
                  <p className="text-white font-medium">{eticket.transactionid}</p>
                </div>
                <div>
                  <Label className="text-slate-400">Lane</Label>
                  <p className="text-white font-medium">
                    {transaction?.entrylanename || `Lane ${eticket.laneid}`}
                  </p>
                </div>
                {transaction?.entrystatus && (
                  <>
                    <div className="col-span-2">
                      <Label className="text-slate-400">Status</Label>
                      <p className={`text-white font-medium text-xs ${transaction.entrystatus.includes('FAIL') ? 'text-red-400' : 'text-green-400'}`}>
                        {transaction.entrystatus}
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="weight" className="text-slate-200">
                  Weight (kg) *
                </Label>
                <Input
                  id="weight"
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(parseInt(e.target.value) || 0)}
                  className="bg-slate-700 border-slate-600 text-white"
                  disabled={isLoading}
                  placeholder="Enter weight or leave as 0 to skip"
                />
                {weight === 0 && (
                  <p className="text-xs text-amber-400">
                    ⚠️ Weight is 0 - weight update will be skipped
                  </p>
                )}
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setFormState("search")}
                  className="flex-1 border-slate-600 text-white hover:bg-slate-700"
                  disabled={isLoading}
                >
                  Back
                </Button>
                <Button
                  onClick={handleConfirmGateIn}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={isLoading}
                >
                  {isLoading ? "Processing..." : "CONFIRM GATE-IN"}
                </Button>
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
