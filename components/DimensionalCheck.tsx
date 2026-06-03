"use client";

import React from "react";

type Props = {
  status: "success" | "error" | "empty";
  error?: string;
  className?: string;
};

export default function DimensionalCheck({ status, error, className = "" }: Props) {
  if (status === "empty") return null;

  if (status === "success") {
    return (
      <span
        className={`h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0 inline-block align-middle ${className}`}
        title="Dimensionally consistent"
        style={{ cursor: "help" }}
      />
    );
  }

  return (
    <span
      className={`h-2.5 w-2.5 rounded-full bg-error shrink-0 inline-block align-middle animate-pulse ${className}`}
      title={error || "Dimensional mismatch"}
      style={{ cursor: "help" }}
    />
  );
}
