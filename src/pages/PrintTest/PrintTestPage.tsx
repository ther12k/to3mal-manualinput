import { useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, FileJson, Printer, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { CmsPrintPreviewDialog } from "@/components/CmsPrintPreviewDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { buildCmsPrintDocument } from "@/lib/cmsPrint";
import { parseCmsJsonPrintInput, SAMPLE_GATE_IN_JSON } from "@/lib/cmsJsonPrint";

export function PrintTestPage() {
  const [jsonInput, setJsonInput] = useState(SAMPLE_GATE_IN_JSON);
  const [cmsPreviewHtml, setCmsPreviewHtml] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState("");
  const [xpsUrl, setXpsUrl] = useState("");

  const handlePreview = () => {
    setError("");
    setSummary("");
    setXpsUrl("");

    try {
      const payload = parseCmsJsonPrintInput(jsonInput);
      setCmsPreviewHtml(buildCmsPrintDocument(payload.cms, payload.laneName));
      setXpsUrl(payload.xpsUrl || "");
      setSummary(
        `Loaded ${payload.sourceType} JSON with ${Object.keys(payload.cms).length} printable fields.`
      );
      toast.success("CMS preview generated from JSON.");
    } catch (previewError) {
      const message = previewError instanceof Error ? previewError.message : "Unable to parse JSON.";
      setError(message);
      toast.error(message);
    }
  };

  const handleFormatJson = () => {
    try {
      setJsonInput(JSON.stringify(JSON.parse(jsonInput), null, 2));
      setError("");
    } catch (formatError) {
      const message = formatError instanceof Error ? formatError.message : "Invalid JSON";
      setError(`Invalid JSON: ${message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-3 sm:p-4">
      <div className="max-w-2xl mx-auto pt-4 sm:pt-8">
        <div className="mb-4 sm:mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-white">JSON Print Test</h1>
            <p className="text-slate-400 mt-1">
              Paste Gate In or CMS JSON, preview the CMS receipt, then print from the dialog.
            </p>
          </div>
          <Button asChild variant="outline" className="border-slate-600 text-white hover:bg-slate-700">
            <Link to="/reprint">Back</Link>
          </Button>
        </div>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <FileJson className="w-5 h-5" />
              CMS JSON Input
            </CardTitle>
            <CardDescription className="text-slate-400">
              Supports raw transaction JSON, API responses with item, or ReprintCMS responses with cms.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cmsJsonInput" className="text-slate-200">
                JSON Payload
              </Label>
              <textarea
                id="cmsJsonInput"
                value={jsonInput}
                onChange={(event) => setJsonInput(event.target.value)}
                spellCheck={false}
                className="min-h-[360px] w-full rounded-md border border-slate-600 bg-slate-950 p-3 font-mono text-xs text-slate-100 outline-none placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                placeholder="Paste transaction or CMS JSON here..."
              />
            </div>

            {summary && (
              <Alert className="bg-green-900/30 border-green-700">
                <AlertDescription className="text-green-300">{summary}</AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setJsonInput(SAMPLE_GATE_IN_JSON);
                  setError("");
                  setSummary("");
                  setXpsUrl("");
                }}
                className="border-slate-600 text-white hover:bg-slate-700"
              >
                <RotateCcw className="w-4 h-4" />
                Load Sample
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleFormatJson}
                className="border-slate-600 text-white hover:bg-slate-700"
              >
                Format JSON
              </Button>
              <Button
                type="button"
                onClick={handlePreview}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Printer className="w-4 h-4" />
                Preview CMS
              </Button>
            </div>

            {xpsUrl && (
              <Button
                asChild
                type="button"
                variant="outline"
                className="w-full border-amber-600 text-amber-200 hover:bg-amber-950/40"
              >
                <a href={xpsUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="w-4 h-4" />
                  Open Original XPS
                </a>
              </Button>
            )}
          </CardContent>
        </Card>

        <CmsPrintPreviewDialog
          html={cmsPreviewHtml}
          xpsUrl={xpsUrl}
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
