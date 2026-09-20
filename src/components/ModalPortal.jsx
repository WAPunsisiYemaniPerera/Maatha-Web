import { useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Universal Modal Portal
 * Mounts modal popups directly into document.body to break out of
 * layout containers, CSS transforms, or parent overflow bounds.
 * Guarantees 100% viewport centering and screen-wide backdrop coverage.
 */
const ModalPortal = ({ children }) => {
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  if (typeof document === 'undefined') return null;

  return createPortal(children, document.body);
};

export default ModalPortal;
