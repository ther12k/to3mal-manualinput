import { useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CmsPrintPreviewDialogProps {
  html: string | null;
  xpsUrl?: string;
  onOpenChange: (open: boolean) => void;
}

export function CmsPrintPreviewDialog({
  html,
  xpsUrl,
  onOpenChange,
}: CmsPrintPreviewDialogProps) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);

  const handlePrint = () => {
    const frameWindow = frameRef.current?.contentWindow;
    if (!frameWindow) {
      toast.error("CMS preview is not ready yet.");
      return;
    }

    try {
      frameWindow.focus();
      frameWindow.print();
    } catch (printError) {
      console.error("CMS print invocation failed:", printError);
      toast.error("Unable to open the print dialog.");
    }
  };

  return (
    <Dialog open={!!html} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-3xl w-[calc(100vw-1.5rem)] sm:w-full">
        <DialogHeader>
          <DialogTitle>CMS Preview</DialogTitle>
          <DialogDescription className="text-slate-400">
            Review the CMS document, then tap Print.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-slate-700 bg-white overflow-hidden">
          <iframe
            ref={frameRef}
            title="CMS Preview"
            srcDoc={html || ""}
            className="w-full h-[60vh] min-h-[420px]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-slate-600 text-white hover:bg-slate-700"
          >
            Close
          </Button>
          {xpsUrl && (
            <Button
              asChild
              type="button"
              variant="outline"
              className="border-amber-600 text-amber-200 hover:bg-amber-950/40"
            >
              <a href={xpsUrl} target="_blank" rel="noreferrer">
                Open XPS
              </a>
            </Button>
          )}
          <Button
            type="button"
            onClick={handlePrint}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Print CMS
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
