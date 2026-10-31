import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/assets/hooks/use-auth";

const SEARCH_DEBOUNCE_MS = 400;

/**
 * One page of any list the server pages (OptInPageNumberPagination), kept in
 * the component. `fetchPage(auth, params)` must resolve to
 * {count, results}; `filters` are passed through, with `search` (or
 * `search_value`) debounced. `reloadOn` reloads the page whenever it
 * changes, e.g. a store counter bumped after an edit elsewhere.
 *
 * Visit queues use useVisitQueue instead, which keeps its page in the store.
 */
export const useServerList = (fetchPage, filters = {}, { pageSize: initialPageSize = 10, reloadOn = 0 } = {}) => {
  const auth = useAuth();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [version, setVersion] = useState(0);
  const latest = useRef(0);
  const searchTerm = filters.search ?? filters.search_value;
  const lastSearch = useRef(searchTerm);

  const cleaned = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
  const filterKey = JSON.stringify(cleaned);

  useEffect(() => {
    setPage(1);
  }, [filterKey]);

  useEffect(() => {
    if (!auth) return undefined;
    const searchChanged = lastSearch.current !== searchTerm;
    lastSearch.current = searchTerm;
    const requestId = ++latest.current;

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await fetchPage(auth, { ...cleaned, page, page_size: pageSize });
        if (requestId !== latest.current) return;
        setRows(data.results);
        setTotal(data.count);
        setError(null);
        if (data.results.length === 0 && data.count > 0 && page > 1) {
          setPage(Math.ceil(data.count / pageSize));
        }
      } catch (err) {
        if (requestId !== latest.current) return;
        setError(err?.message || "Could not load the list");
      } finally {
        if (requestId === latest.current) setLoading(false);
      }
    }, searchChanged ? SEARCH_DEBOUNCE_MS : 0);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth, filterKey, page, pageSize, version, reloadOn]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  return {
    rows,
    total,
    page,
    pageSize,
    setPage,
    setPageSize: (size) => {
      setPageSize(size);
      setPage(1);
    },
    loading,
    error,
    refresh,
  };
};
