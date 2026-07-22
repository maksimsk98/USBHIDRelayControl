import { useEffect } from 'react';
import { Overlay, Tooltip } from 'react-bootstrap';

function OverlayTooltip(props) {
  const {
    message, targetRef, onTimeout, timeout,
  } = props;
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onTimeout) onTimeout();
    }, timeout);

    return () => clearTimeout(timer); // Clean up the timer on unmount
  }, []);

  return (
    (
      <Overlay target={targetRef} show placement="top">
        <Tooltip>{message}</Tooltip>
      </Overlay>
    )
  );
}

export default OverlayTooltip;
