import { useState } from "react";
import { Printer } from "lucide-react";
import { toast } from "sonner";
import { CmsPrintPreviewDialog } from "@/components/CmsPrintPreviewDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api/client";
import { buildCmsPrintDocument } from "@/lib/cmsPrint";
import type { PostGateTransaction } from "@/types";

export function ReprintPage() {
  const [transactionId, setTransactionId] = useState("");
  const [transaction, setTransaction] = useState<PostGateTransaction | null>(null);
  const [cmsPreviewHtml, setCmsPreviewHtml] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleReprint = async () => {
    const trxId = transactionId.trim();
    if (!trxId) {
      const errorMsg = "Please enter a Transaction ID";
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    setIsLoading(true);
    setError("");
    setTransaction(null);

    try {
      const transactionResponse = await api.getTransactionByID(trxId);
      if (transactionResponse.state !== 0 || !transactionResponse.item) {
        const errorMsg = transactionResponse.message || "Transaction not found";
        setError(errorMsg);
        toast.error(errorMsg);
        return;
      }

      const transactionData = transactionResponse.item;
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
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to load CMS reprint data";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

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
              Enter a transaction ID to retrieve and preview CMS print data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
                    handleReprint();
                  }
                }}
                disabled={isLoading}
                inputMode="numeric"
              />
            </div>

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

            <Button
              type="button"
              onClick={handleReprint}
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={isLoading}
            >
              <Printer className="w-4 h-4 mr-2" />
              {isLoading ? "Loading CMS..." : "Print CMS"}
            </Button>
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
