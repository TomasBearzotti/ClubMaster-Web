"use client";

import React from "react";
import { useGlobalDarkReader } from "@/hooks/useGlobalDarkReader";

export function ClientDarkLayout({ children }: { children: React.ReactNode }) {
  useGlobalDarkReader();
  return <>{children}</>;
}
