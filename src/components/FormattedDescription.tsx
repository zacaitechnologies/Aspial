"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";

const TRUNCATE_LINE_COUNT = 2;

interface FormattedDescriptionProps {
  text?: string | null;
  className?: string;
  /** When true, truncates to 2 lines using line-clamp. */
  truncate?: boolean;
  /** When true, shows "Show more" / "Show less" to expand/collapse. Only applies when truncate is true. */
  expandable?: boolean;
}

export function FormattedDescription({
  text: rawText,
  className,
  truncate = false,
  expandable = false,
}: FormattedDescriptionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const text = rawText ?? "";

  if (!text) return null;

  const lineCount = (text.match(/\n/g) ?? []).length + 1;
  const needsTruncation = truncate && lineCount > TRUNCATE_LINE_COUNT;
  const isTruncated = truncate && (expandable ? !isExpanded && needsTruncation : true);

  return (
    <div className={cn("space-y-1", className)}>
      <span
        className={cn(
          "whitespace-pre-line break-words",
          isTruncated && "line-clamp-2"
        )}
      >
        {text}
      </span>
      {expandable && needsTruncation && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-auto py-0.5 px-0 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setIsExpanded((p) => !p)}
        >
          {isExpanded ? (
            <>
              <ChevronUp className="size-3.5 mr-0.5" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="size-3.5 mr-0.5" />
              Show more
            </>
          )}
        </Button>
      )}
    </div>
  );
}
