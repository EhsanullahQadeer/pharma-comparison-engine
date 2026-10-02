"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/select";
import { PAGE_SIZE_OPTIONS } from "@/lib/pagination";

import { Button } from "./button";
import TooltipWrapper from "./TooltipWrapper";

const Pagination = ({
  page,
  setPage,
  pages,
  total,
  pageSize,
  onPageSizeChange,
}: {
  page: number;
  setPage: (page: number) => void;
  pages: number;
  total: number;
  pageSize?: number;
  onPageSizeChange?: (pageSize: number) => void;
}) => {
  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <div className="text-sm text-muted-foreground">
          Page {page} of {pages || 1} ({total} total)
        </div>
        {pageSize != null && onPageSizeChange ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rows per page</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => onPageSizeChange(Number(v ?? ""))}
            >
              <SelectTrigger className="h-8 w-18 px-2 py-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>
      <div>
        <TooltipWrapper label="Previous page">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </TooltipWrapper>
        <TooltipWrapper label="Next page">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={page >= pages}
            className="ml-2"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </TooltipWrapper>
      </div>
    </div>
  );
};

export default Pagination;
