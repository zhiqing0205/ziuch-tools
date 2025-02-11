import { Loader2 } from "lucide-react";

interface LoadingProps {
  text?: string;
}

export function Loading({ text = "处理中..." }: LoadingProps) {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50">
      <div className="fixed left-[50%] top-[50%] -translate-x-1/2 -translate-y-1/2">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">{text}</p>
        </div>
      </div>
    </div>
  );
}
