"use client";

export default function EmailListSkeleton() {
  return (
    <div className="divide-y divide-border">
      {[1, 2, 3].map((item) => (
        <div key={item} className="px-5 py-3 animate-pulse">
          <div className="flex items-start gap-3">
            <div className="size-9 shrink-0 rounded-xl bg-muted" />
            <div className="flex-1 min-w-0 space-y-3">
              <div className="h-3 bg-muted rounded w-1/2" />
              <div className="h-3 bg-muted rounded w-5/6" />
              <div className="h-2 bg-muted rounded w-1/3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
