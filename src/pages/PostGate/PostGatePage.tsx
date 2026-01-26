import { useState } from "react";
import { api } from "@/lib/api/client";
import type {
  PostGateTransaction,
  PostGateInspectionResponse,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

const GATE_OPTIONS = [
  { value: "GATE-IN-01", label: "GATE-IN-01" },
  { value: "GATE-IN-02", label: "GATE-IN-02" },
  { value: "GATE-IN-03", label: "GATE-IN-03" },
];

type FormState = "search" | "review" | "success" | "error";

export function PostGatePage() {
  const [formState, setFormState] = useState<FormState>("search");
  const [isLoading, setIsLoading] = useState(false);
  const [trxId, setTrxId] = useState("");
  const [selectedGate, setSelectedGate] = useState("GATE-IN-01");
  const [transaction, setTransaction] = useState<PostGateTransaction | null>(null);
  const [inspection, setInspection] = useState<PostGateInspectionResponse | null>(null);
  const [weight, setWeight] = useState<number>(0);
  const [error, setError] = useState<string>("");
  const [laneId, setLaneId] = useState<number>(1);

  const handleSearch = async () => {
    if (!trxId.trim()) {
      setError("Please enter a Transaction ID");
      return;
    }

    setIsLoading(true);
    setFormState("search");
    setError("");

    try {
      // Step 1: Get Transaction
      const trxResponse = await api.getPostGateTransaction(trxId.trim());

      if (trxResponse.state !== 0 || !trxResponse.item) {
        setError("Transaction not found");
        setFormState("error");
        return;
      }

      const trx = trxResponse.item;
      setTransaction(trx);
      setWeight(trx.entryweight);

      // Extract lane ID from lane name (e.g., "GATE-IN-01" -> 1)
      const laneNum = parseInt(trx.entrylanename.split("-")[2] || "1");
      setLaneId(laneNum);

      // Step 2: Check Inspection
      const inspectionResponse = await api.checkPostGateInspection({
        transactionID: trx.id,
        laneID: laneNum,
        gatepass: trx.gatepass,
      });

      if (inspectionResponse.state !== 0) {
        setError("Inspection check failed");
        setFormState("error");
        return;
      }

      setInspection(inspectionResponse);
      setFormState("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch transaction");
      setFormState("error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmGateIn = async () => {
    if (!transaction || !inspection) return;

    setIsLoading(true);
    setError("");

    try {
      // Step 3: TruckIN (Finalize)
      const response = await api.postGateTruckIN({
        transactionID: transaction.id,
        laneID: laneId,
        truckID: inspection.truckId,
        nopol: inspection.nopol,
        gatepassList: [transaction.gatepass],
        postgate: true,
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
        setTransaction(null);
        setInspection(null);
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
          <h1 className="text-3xl font-bold text-white">POSTGATE GATE-IN</h1>
        </div>

        {/* Search Form */}
        {(formState === "search" || formState === "error") && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Search Transaction</CardTitle>
              <CardDescription className="text-slate-400">
                Enter Transaction ID to retrieve gate-in details
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
                  placeholder="Enter gatepass or transaction ID"
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                  onKeyPress={(e) => e.key === "Enter" && !isLoading && handleSearch()}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gate" className="text-slate-200">
                  Gate (Optional)
                </Label>
                <select
                  id="gate"
                  value={selectedGate}
                  onChange={(e) => setSelectedGate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white"
                  disabled={isLoading}
                >
                  {GATE_OPTIONS.map((gate) => (
                    <option key={gate.value} value={gate.value}>
                      {gate.label}
                    </option>
                  ))}
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
        {formState === "review" && transaction && inspection && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Confirm Gate-In</CardTitle>
              <CardDescription className="text-slate-400">
                Review transaction details before confirming
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-slate-400">Container</Label>
                  <p className="text-white font-medium">{transaction.container}</p>
                </div>
                <div>
                  <Label className="text-slate-400">Truck ID</Label>
                  <p className="text-white font-medium">{transaction.truckid}</p>
                </div>
                <div>
                  <Label className="text-slate-400">License</Label>
                  <p className="text-white font-medium">{transaction.nopol}</p>
                </div>
                <div>
                  <Label className="text-slate-400">Lane</Label>
                  <p className="text-white font-medium">{transaction.entrylanename}</p>
                </div>
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
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-200">Containers</Label>
                <div className="bg-slate-700 rounded-md p-3 space-y-2">
                  {inspection.containers.map((container, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-sm text-white p-2 bg-slate-600 rounded"
                    >
                      <span className="font-medium">{container.containerId}</span>
                      <span>| {container.idTrx} |</span>
                      <span>{container.sealNumber}</span>
                      <span className="text-slate-300">{container.weight} kg</span>
                    </div>
                  ))}
                </div>
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
