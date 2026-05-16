import { useState } from 'react';

export function useBreadcrumbs(initial = []) {
  const [paths, setPaths] = useState(initial);

  const updateBreadcrumbs = (newPaths) => {
    setPaths(newPaths);
  };

  return { paths, updateBreadcrumbs };
}
