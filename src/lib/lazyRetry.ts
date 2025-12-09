import { ComponentType, lazy } from 'react';

type ComponentImportFn = () => Promise<{ default: ComponentType<any> }>;

const lazyRetry = (
  componentImport: ComponentImportFn,
  retries = 3,
  interval = 1000
): React.LazyExoticComponent<ComponentType<any>> => {
  return lazy(async () => {
    let lastError: Error | undefined;
    
    for (let i = 0; i < retries; i++) {
      try {
        return await componentImport();
      } catch (error) {
        lastError = error as Error;
        // Wait before retrying (exponential backoff)
        if (i < retries - 1) {
          await new Promise((resolve) => setTimeout(resolve, interval * (i + 1)));
        }
      }
    }
    
    // All retries failed - reload the page to get fresh chunks
    // Or you can throw the error instead: throw lastError;
    window.location.reload();
    
    // This return is needed for TypeScript, but won't be reached after reload
    throw lastError;
  });
};

export { lazyRetry };