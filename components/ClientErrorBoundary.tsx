"use client";

import { ErrorBoundary } from "./ErrorBoundary";
import { ReactNode } from "react";

export function ClientErrorBoundary({ children }: { children: ReactNode }) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}
