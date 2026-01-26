import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useLoginForm } from "../hooks/useLoginForm";

export function LoginForm() {
  const {
    apikey,
    setApikey,
    error,
    isLoading,
    handleSubmit,
  } = useLoginForm();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <Card className="w-full max-w-sm shadow-xl bg-slate-800 border-slate-700">
        <CardHeader className="space-y-1 text-center pb-8 pt-8">
          <div className="mx-auto w-16 h-16 bg-transparent rounded-2xl flex items-center justify-center mb-4 overflow-hidden">
            <img src="/app-icon.svg" alt="App Icon" className="w-full h-full object-cover" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-white">
            TO3 Postgate
          </CardTitle>
          <CardDescription className="text-slate-400">
            Sign in to access the Gate system
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-8 px-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  {error}
                </AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="apikey" className="text-slate-200">API Key</Label>
              <Input
                id="apikey"
                type="text"
                placeholder="Enter your API key"
                value={apikey}
                onChange={(e) => setApikey(e.target.value)}
                required
                autoFocus
                className="h-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
              />
            </div>
            <Button type="submit" className="w-full h-10 font-medium bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
          <div className="mt-6 text-center text-xs text-slate-400">
            <p>TO3 Postgate System</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
