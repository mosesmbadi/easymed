import React from "react";

const PAGE_SIZES = [5, 10, 20, 50];

/** 1 … 4 5 [6] 7 8 … 20 */
const pageWindow = (page, pages) => {
  const wanted = new Set([1, pages, page - 2, page - 1, page, page + 1, page + 2]);
  const list = [...wanted].filter((p) => p >= 1 && p <= pages).sort((a, b) => a - b);
  const out = [];
  list.forEach((p, i) => {
    if (i > 0 && p - list[i - 1] > 1) out.push(`gap-${p}`);
    out.push(p);
  });
  return out;
};

/**
 * Pager for a list paged on the server: the grid shows one page, this asks
 * for another. Pair it with useVisitQueue (or anything with the same shape).
 */
const ServerPager = ({ page, pageSize, total, onPageChange, onPageSizeChange, loading }) => {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const button = "min-w-[2rem] px-2 py-1 rounded text-sm disabled:opacity-40";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-3 shadow-xl text-sm">
      <div className="flex items-center gap-1">
        {PAGE_SIZES.map((size) => (
          <button
            key={size}
            type="button"
            onClick={() => onPageSizeChange(size)}
            className={`${button} ${size === pageSize ? "bg-primary text-white" : ""}`}
          >
            {size}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1">
        <span className="mr-2 text-gray-600">
          {loading ? "Loading..." : `Page ${Math.min(page, pages)} of ${pages} (${total} items)`}
        </span>
        <button
          type="button"
          className={button}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          &lsaquo;
        </button>
        {pageWindow(page, pages).map((p) =>
          typeof p === "string" ? (
            <span key={p} className="px-1">&hellip;</span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={`${button} ${p === page ? "bg-primary text-white" : ""}`}
            >
              {p}
            </button>
          )
        )}
        <button
          type="button"
          className={button}
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          &rsaquo;
        </button>
      </div>
    </div>
  );
};

export default ServerPager;
