import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

type FormState = "search" | "review" | "success" | "error";

export function CustomsPage() {
  const [formState, setFormState] = useState<FormState>("search");
  const [isLoading, setIsLoading] = useState(false);
  const [containerId, setContainerId] = useState("");
  const [error, setError] = useState("");

  const handleSearch = async () => {
    if (!containerId.trim()) {
      setError("Please enter a Container ID");
      return;
    }

    setIsLoading(true);
    setFormState("search");
    setError("");

    try {
      // TODO: Replace with actual API call
      // Simulating API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // For now, show review state (mock implementation)
      setFormState("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch container data");
      setFormState("error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    setError("");

    try {
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setFormState("success");

      // Reset after 3 seconds
      setTimeout(() => {
        setFormState("search");
        setContainerId("");
        setError("");
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to confirm customs");
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
          <h1 className="text-3xl font-bold text-white">Customs Manual Input</h1>
          <p className="text-slate-400 mt-1">Manual customs processing for containers</p>
        </div>

        {/* Search Form */}
        {(formState === "search" || formState === "error") && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Search Container</CardTitle>
              <CardDescription className="text-slate-400">
                Enter Container ID to retrieve customs data
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
                  onChange={(e) => setContainerId(e.target.value)}
                  placeholder="e.g., TCLU1234567"
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                  onKeyPress={(e) => e.key === "Enter" && !isLoading && handleSearch()}
                  disabled={isLoading}
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

        {/* Review Form */}
        {formState === "review" && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Confirm Customs</CardTitle>
              <CardDescription className="text-slate-400">
                Review container details before confirming
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-400">Container ID</Label>
                <div className="bg-slate-700 border border-slate-600 rounded-md px-3 py-2">
                  <p className="text-white font-medium">{containerId}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-400">Status</Label>
                <div className="bg-slate-700 border border-slate-600 rounded-md px-3 py-2">
                  <p className="text-yellow-400 font-medium">Pending Customs</p>
                </div>
              </div>

              <Alert>
                <AlertDescription className="text-slate-300">
                  This will mark the container as customs cleared. Make sure the container details are correct before confirming.
                </AlertDescription>
              </Alert>

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
                    setContainerId("");
                    setError("");
                  }}
                  className="flex-1 border-slate-600 text-white hover:bg-slate-700"
                  disabled={isLoading}
                >
                  Back
                </Button>
                <Button
                  onClick={handleConfirm}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={isLoading}
                >
                  {isLoading ? "Processing..." : "CONFIRM"}
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
                <h2 className="text-2xl font-bold text-white mb-2">Customs Confirmed!</h2>
                <p className="text-slate-300">Container has been marked as customs cleared.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
