import { ComponentType, lazy } from 'react';

export const lazyRetry = (
  componentImport: () => Promise<{ default: ComponentType<any> }>
) => {
  return lazy(componentImport);
};