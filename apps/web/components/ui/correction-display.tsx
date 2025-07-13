import { CheckCircle } from "lucide-react";

interface CorrectionDisplayProps {
  content: string;
  type: "correction" | "translation";
}

export function CorrectionDisplay({
  content,
  type, // eslint-disable-line @typescript-eslint/no-unused-vars
}: CorrectionDisplayProps) {
  return (
    <div className="mt-2 rounded-lg p-3 bg-green-50 border border-green-200 text-green-800 text-sm max-w-full">
      <div className="flex items-start gap-2">
        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
        <div className="whitespace-pre-line flex-1">{content}</div>
      </div>
    </div>
  );
}