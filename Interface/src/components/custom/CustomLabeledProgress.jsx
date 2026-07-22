import React from 'react';
import { InputGroup, ProgressBar } from 'react-bootstrap';

function LabeledProgressBar({
  now, max = 100, variant = 'primary',
  striped = false, animated = false,
  size = 'md',
  label,
  labelFormatter,
  labelPosition = 'left', // "left" or "right"
  labelStyle = { minWidth: '3ch', textAlign: 'right' },
  groupStyle = { display: 'flex', alignItems: 'stretch' },
}) {
  const percent = Math.round((now / max) * 100);
  const renderedLabel = label != null
    ? label
    : typeof labelFormatter === 'function'
      ? labelFormatter(now, max)
      : `${percent}%`;

  return (
    <InputGroup size={size} style={groupStyle}>
      {labelPosition === 'left' && (
      <InputGroup.Text style={labelStyle}>
        {renderedLabel}
      </InputGroup.Text>
      )}
      <ProgressBar
        now={now}
        max={max}
        variant={variant}
        striped={striped}
        animated={animated}
        style={{ flex: '1 1 auto', height: 'auto' }}
        visuallyHidden
      />
      {labelPosition === 'right' && (
      <InputGroup.Text style={labelStyle}>
        {renderedLabel}
      </InputGroup.Text>
      )}
    </InputGroup>
  );
}

export default LabeledProgressBar;
