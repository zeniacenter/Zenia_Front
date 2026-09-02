import { useEffect } from 'react';

export default function useEscClose(active, onClose) {
  useEffect(() => {
    if (!active) return undefined;
    const handler = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [active, onClose]);
}
