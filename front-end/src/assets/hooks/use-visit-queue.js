import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "@/assets/hooks/use-auth";
import { fetchVisitQueue } from "@/redux/service/patients";
import { setProcesses, setProcessesCount } from "@/redux/features/patients";

const SEARCH_DEBOUNCE_MS = 400;

/**
 * One page of a visit queue, filtered and paged on the server.
 *
 * `filters` are the backend's: track, track__in, queue, search_value,
 * search_field. The page lands in the store (`patient.processes`), so the
 * reducers that patch a visit after a consultation or referral still reach
 * the row on screen. Any `refreshVisitQueues()` reloads it.
 *
 * Only one queue is open per screen; two would share the store.
 */
export const useVisitQueue = (filters, { pageSize: initialPageSize = 10 } = {}) => {
  const auth = useAuth();
  const dispatch = useDispatch();
  const { processes, processesCount, visitQueueVersion } = useSelector((store) => store.patient);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Until this queue's first page arrives the store may hold another screen's rows.
  const [hasLoaded, setHasLoaded] = useState(false);
  const latest = useRef(0);
  const lastSearch = useRef(filters.search_value);

  // Drop empty filters so "All" (track "") asks for no track at all.
  const cleaned = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
  const filterKey = JSON.stringify(cleaned);

  // New filters start from the first page.
  useEffect(() => {
    setPage(1);
  }, [filterKey]);

  useEffect(() => {
    if (!auth) return undefined;
    const searchChanged = lastSearch.current !== filters.search_value;
    lastSearch.current = filters.search_value;
    const requestId = ++latest.current;

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await fetchVisitQueue(auth, { ...cleaned, page, page_size: pageSize });
        if (requestId !== latest.current) return;
        dispatch(setProcesses(data.results));
        dispatch(setProcessesCount(data.count));
        setHasLoaded(true);
        setError(null);
        // A page past the end (the last row on it just left the queue).
        if (data.results.length === 0 && data.count > 0 && page > 1) {
          setPage(Math.ceil(data.count / pageSize));
        }
      } catch (err) {
        if (requestId !== latest.current) return;
        setError(err?.message || "Could not load the queue");
      } finally {
        if (requestId === latest.current) setLoading(false);
      }
    }, searchChanged ? SEARCH_DEBOUNCE_MS : 0);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth, filterKey, page, pageSize, visitQueueVersion]);

  const rows = hasLoaded ? processes : [];

  return {
    rows,
    total: hasLoaded ? processesCount : 0,
    page,
    pageSize,
    setPage,
    setPageSize: (size) => {
      setPageSize(size);
      setPage(1);
    },
    loading,
    error,
  };
};
