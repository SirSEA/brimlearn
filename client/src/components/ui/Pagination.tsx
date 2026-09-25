import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
};

/** Simple client-side pager for long lists. Expects a 1-based `page`. */
export function Pagination({ page, pageSize, total, onPageChange, className }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);
  const buttonClass =
    "inline-flex items-center gap-1 rounded-full border border-[#E2CDB8] bg-[#FFFDF8] px-3 py-1.5 text-xs font-semibold text-[#765F4F] transition hover:border-[#A9BF87] hover:text-[#3B241A] disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className={cn("mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#F3E9DE] pt-4", className)}>
      <span className="text-xs text-[#A08A75]">
        {total === 0 ? "No results" : `Showing ${start}–${end} of ${total}`}
      </span>
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <button type="button" className={buttonClass} disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            <ChevronLeft size={13} /> Prev
          </button>
          <span className="text-xs font-semibold text-[#765F4F]">
            {page} / {totalPages}
          </span>
          <button type="button" className={buttonClass} disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
            Next <ChevronRight size={13} />
          </button>
        </div>
      )}
    </div>
  );
}