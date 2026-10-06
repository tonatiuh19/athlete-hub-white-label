import { useEffect, useRef } from "react";

/** Notify parent when a nested Formik (or similar) dirty flag changes. */
export function useFormikDirtyReport(
  dirty: boolean,
  onDirtyChange?: (dirty: boolean) => void,
) {
  const onDirtyChangeRef = useRef(onDirtyChange);
  onDirtyChangeRef.current = onDirtyChange;

  useEffect(() => {
    onDirtyChangeRef.current?.(dirty);
  }, [dirty]);

  useEffect(() => {
    return () => onDirtyChangeRef.current?.(false);
  }, []);
}
