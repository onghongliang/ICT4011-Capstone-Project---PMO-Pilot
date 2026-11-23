import { useCallback, useEffect, useRef, useState } from "react";

// Loads data with `load()` whenever `deps` change and exposes
// { data, error, reload }. Results from a superseded load are ignored, so a
// slow earlier request can't overwrite a newer one.
export function useResource(load, deps) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const latest = useRef(0);
  const loadRef = useRef(load);
  loadRef.current = load;

  const reload = useCallback(() => {
    const id = ++latest.current;
    return loadRef
      .current()
      .then((result) => {
        if (id !== latest.current) return;
        setData(result);
        setError(null);
      })
      .catch((err) => id === latest.current && setError(err.message));
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, error, reload };
}
