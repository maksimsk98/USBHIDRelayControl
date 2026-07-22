import { Button } from 'react-bootstrap';
import { forwardRef } from 'react';
import { pickRoot } from '../../../../utils/fsAccess';

const ChooseRootButton = forwardRef(({
  label = 'Выбрать папку',
  variant = 'primary',
  onRootHandle,
}, ref) => {
  const handleClick = async () => {
    try {
      const rootHandle = await pickRoot(); // user gesture
      onRootHandle?.(rootHandle);
    } catch (e) {
      if (e?.name !== 'AbortError') console.error('Pick failed:', e);
    }
  };

  return (
    <Button ref={ref} variant={variant} onClick={handleClick} className="text-nowrap">
      {label}
    </Button>
  );
});

export default ChooseRootButton;
