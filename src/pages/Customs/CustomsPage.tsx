import { useState } from "react";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

type FormState = "search" | "review" | "success" | "error";
type AMSType = "INPUT" | "UPDATE_OUT";

export function CustomsPage() {
  const [amsType, setAmsType] = useState<AMSType>("INPUT");
  const [formState, setFormState] = useState<FormState>("search");
  const [isLoading, setIsLoading] = useState(false);
  const [containerId, setContainerId] = useState("");
  const [error, setError] = useState("");
  const [apiResponse, setApiResponse] = useState<any>(null);

  const handleSearch = async () => {
    if (!containerId.trim()) {
      setError("Please enter a Container ID");
      return;
    }

    setIsLoading(true);
    setFormState("search");
    setError("");
    setApiResponse(null);

    try {
      let response;
      if (amsType === "INPUT") {
        response = await api.inputManualAMS(containerId.trim());
      } else {
        response = await api.updateManualOUTAMS(containerId.trim());
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
                  setFormState("search");
                  setContainerId("");
                  setError("");
                  setApiResponse(null);
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
                  setFormState("search");
                  setContainerId("");
                  setError("");
                  setApiResponse(null);
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

        {/* Search Form */}
        {formState === "search" && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">
                {amsType === "INPUT" ? "Input Manual AMS" : "Update Manual OUT AMS"}
              </CardTitle>
              <CardDescription className="text-slate-400">
                Enter Container ID to process {amsType === "INPUT" ? "manual AMS input" : "manual OUT AMS update"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="containerId" className="text-slate-200">
                  Container ID *
                </Label>
                <Input
                  id="containerId"
                  value={containerId}
                  onChange={(e) => setContainerId(e.target.value.toUpperCase())}
                  placeholder="e.g., TCLU1234567"
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 uppercase"
                  onKeyPress={(e) => e.key === "Enter" && !isLoading && handleSearch()}
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
                onClick={handleSearch}
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
                  {apiResponse?.message || "Container has been processed successfully."}
                </p>
                <div className="bg-slate-800 border border-slate-700 rounded-md p-4 text-left">
                  <p className="text-slate-400 text-sm mb-1">Container ID:</p>
                  <p className="text-white font-mono text-lg">{containerId}</p>
                </div>
                <Button
                  onClick={() => {
                    setFormState("search");
                    setContainerId("");
                    setError("");
                    setApiResponse(null);
                  }}
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
