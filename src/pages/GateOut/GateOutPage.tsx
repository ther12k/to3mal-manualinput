import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

type FormState = "search" | "found" | "success" | "error";

export function GateOutPage() {
  const [formState, setFormState] = useState<FormState>("search");
  const [isLoading, setIsLoading] = useState(false);
  const [rfid, setRfid] = useState("");
  const [searchResult, setSearchResult] = useState<any>(null);
  const [operator, setOperator] = useState("");
  const [tareWeight, setTareWeight] = useState("");
  const [error, setError] = useState("");

  const handleSearch = async () => {
    if (!rfid.trim()) {
      setError("Please enter or scan RFID");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // TODO: Call new API to get transaction by RFID
      // For now, simulate the search
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mock found transaction
      const mockTransaction = {
        id: 123,
        rfid: rfid,
        containerNo: "TCLU1234567",
        truckID: "TRK001",
        nopol: "B 1234 XYZ",
        weight: 25000,
        laneId: 1,
        status: 1, // GateIn - ready for gate out
        gateInTime: new Date().toISOString(),
      };

      setSearchResult(mockTransaction);
      setFormState("found");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to search transaction");
      setFormState("error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGateOut = async () => {
    if (!operator.trim()) {
      setError("Please enter operator name");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // TODO: Call Gate OUT API
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setFormState("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process gate out");
      setFormState("error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setFormState("search");
    setRfid("");
    setSearchResult(null);
    setOperator("");
    setTareWeight("");
    setError("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">Gate Out</h1>
          <p className="text-slate-400 mt-1">Complete gate transaction and mark container as gate out</p>
        </div>

        {/* Search Form */}
        {(formState === "search" || formState === "error") && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Search Transaction</CardTitle>
              <CardDescription className="text-slate-400">
                Enter RFID or Transaction ID to search for existing transaction
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rfid" className="text-slate-200">
                  RFID / Transaction ID *
                </Label>
                <Input
                  id="rfid"
                  value={rfid}
                  onChange={(e) => setRfid(e.target.value)}
                  placeholder="Scan RFID or enter ID"
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                  onKeyPress={(e) => e.key === "Enter" && !isLoading && handleSearch()}
                  disabled={isLoading}
                  autoFocus
                />
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

        {/* Found Transaction - Show Details & Gate Out Form */}
        {formState === "found" && searchResult && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Gate Out Container</CardTitle>
              <CardDescription className="text-slate-400">
                Review transaction details and complete gate out
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-slate-400">Container</Label>
                  <p className="text-white font-medium">{searchResult.containerNo}</p>
                </div>
                <div>
                  <Label className="text-slate-400">Truck ID</Label>
                  <p className="text-white font-medium">{searchResult.truckID}</p>
                </div>
                <div>
                  <Label className="text-slate-400">License Plate</Label>
                  <p className="text-white font-medium">{searchResult.nopol}</p>
                </div>
                <div>
                  <Label className="text-slate-400">Weight</Label>
                  <p className="text-white font-medium">{searchResult.weight?.toLocaleString()} kg</p>
                </div>
                <div>
                  <Label className="text-slate-400">Gate In Time</Label>
                  <p className="text-white font-medium">
                    {new Date(searchResult.gateInTime).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="operator" className="text-slate-200">
                  Operator *
                </Label>
                <Input
                  id="operator"
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                  placeholder="Enter operator name"
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tareWeight" className="text-slate-200">
                  Tare Weight (optional)
                </Label>
                <Input
                  id="tareWeight"
                  type="number"
                  value={tareWeight}
                  onChange={(e) => setTareWeight(e.target.value)}
                  placeholder="Enter tare weight"
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                  disabled={isLoading}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="flex-1 border-slate-600 text-white hover:bg-slate-700"
                  disabled={isLoading}
                >
                  Back
                </Button>
                <Button
                  onClick={handleGateOut}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={isLoading}
                >
                  {isLoading ? "Processing..." : "GATE OUT"}
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
                <h2 className="text-2xl font-bold text-white mb-2">Gate Out Successful!</h2>
                <p className="text-slate-300">Transaction has been marked as gate out.</p>
                <div className="bg-slate-800 border border-slate-700 rounded-md p-4 mt-4">
                  <p className="text-slate-400 text-sm mb-1">RFID:</p>
                  <p className="text-white font-mono">{rfid}</p>
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
      </div>
    </div>
  );
}
