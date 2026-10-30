"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "onward.pagination.pageSize";
const ALLOWED_PAGE_SIZES = new Set([10, 25, 50, 100]);

export function usePageSize(defaultPageSize = 25) {
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = Number(window.localStorage.getItem(STORAGE_KEY));
    if (ALLOWED_PAGE_SIZES.has(stored)) setPageSize(stored);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) window.localStorage.setItem(STORAGE_KEY, String(pageSize));
  }, [loaded, pageSize]);

  return [pageSize, setPageSize] as const;
}
