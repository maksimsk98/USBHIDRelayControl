import { useEffect } from 'react';

/**
 * @param {React.RefObject} ref - A ref to the element to detect outside clicks from.
 * @param {Function} callback - Called when a click happens outside the ref element.
 */
const useOutsideClick = (ref, callback) => {
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        callback(event);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [ref, callback]);
};

export default useOutsideClick;
