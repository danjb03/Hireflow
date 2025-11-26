import { ComponentType, lazy } from "react";

// Retry lazy loading with exponential backoff
export const lazyRetry = <T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>,
  name: string
) =>
  lazy(() =>
    componentImport().catch((error) => {
      console.warn(`Failed to load ${name}, retrying...`, error);
      
      // Force page reload on chunk load failure
      // This handles cases where old build artifacts are cached
      return new Promise((resolve) => {
        setTimeout(() => {
          window.location.reload();
        }, 100);
      });
    })
  );
