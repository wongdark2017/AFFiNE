import { useMemo } from 'react';

/**
 * Official AFFiNE marketing nav links are hard-disabled for this build.
 */
export const useNavConfig = () => {
  return useMemo(() => [] as { title: string; path: string }[], []);
};
