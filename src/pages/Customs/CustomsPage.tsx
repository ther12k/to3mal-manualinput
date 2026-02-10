import { useState } from "react";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

type FormState = "search" | "success" | "error";
type AMSType = "INPUT" | "UPDATE_OUT";

export function CustomsPage() {
  const [amsType, setAmsType] = useState<AMSType>("INPUT");
  const [formState, setFormState] = useState<FormState>("search");
  const [isLoading, setIsLoading] = useState(false);
  const [transactionID, setTransactionID] = useState("");
  const [noReq, setNoReq] = useState("");
  const [container, setContainer] = useState("");
  const [containerCombo, setContainerCombo] = useState("");
  const [error, setError] = useState("");
  const [apiResponse, setApiResponse] = useState<any>(null);

  const handleSubmit = async () => {
    // Validation
    if (!transactionID.trim()) {
      setError("Please enter a Transaction ID");
      return;
    }
    if (!noReq.trim()) {
      setError("Please enter a No Request");
      return;
    }
    if (!container.trim()) {
      setError("Please enter a Container");
      return;
    }
    if (!containerCombo.trim()) {
      setError("Please enter a Container Combo");
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
        setError(response.message || "API request failed");
        setFormState("error");
      } else {
        setFormState("success");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process AMS request");
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
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-2xl mx-auto pt-8">
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
                Enter all required fields to process {amsType === "INPUT" ? "manual AMS input" : "manual OUT AMS update"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="noReq" className="text-slate-200">
                  No Request *
                </Label>
                <Input
                  id="noReq"
                  value={noReq}
                  onChange={(e) => setNoReq(e.target.value)}
                  placeholder="e.g., REQ123456"
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                  disabled={isLoading}
                />
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
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 uppercase"
                  disabled={isLoading}
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
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 uppercase"
                  disabled={isLoading}
                />
              </div>

              <div className="bg-slate-700/50 border border-slate-600 rounded-md px-3 py-2">
                <p className="text-slate-300 text-sm">
                  <span className="font-medium">API Endpoint:</span>{" "}
                  <code className="text-blue-400">
                    /Transaction/{amsType === "INPUT" ? "InputManualAMS" : "UpdateManualOUTAMS"}
                  </code>
                </p>
              </div>

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
      </div>
    </div>
  );
}
