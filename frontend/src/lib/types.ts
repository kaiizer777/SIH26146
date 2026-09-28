import type { EntityExplainResponse } from "./api";

declare module "./api" {
  interface EntityExplainResponse {
    shap_available?: boolean;
  }
}

declare module "@/lib/api" {
  interface EntityExplainResponse {
    shap_available?: boolean;
  }
}

export type { EntityExplainResponse };
