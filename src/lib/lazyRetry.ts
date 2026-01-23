import { ComponentType, lazy } from 'react';

export const lazyRetry = (
  componentImport: () => Promise<{ default: ComponentType<any> }>,
  _name?: string // Optional name parameter for debugging
) => {
  return lazy(componentImport);
};