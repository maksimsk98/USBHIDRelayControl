import React, { useCallback } from 'react';
import {
  InputGroup, Form, OverlayTrigger, Tooltip,
} from 'react-bootstrap';

function CustomIncrementInput({
  value,
  step = 1,
  min = 0,
  max,
  label = 'placeholder',
  labelTooltip,
  unit,
  name,
  onChange,
  onBlur,
  disabled,
  readOnly = false,
  inputStyle = { maxWidth: '80px', minWidth: '60px' },
  labelStyle = { minWidth: '100px' },
  unitStyle = { width: '90px' },
  groupClassName = 'mb-2',
  groupStyle = { flexWrap: 'nowrap', width: 'fit-content' },
  inputClassName,
  size = 'md',
  maxLength,
  siblings,
  siblingPosition = 'after', // 'before' | 'after'
  integer = false,
}) {
  const labelContent = labelTooltip ? (
    <OverlayTrigger
      placement="top"
      overlay={<Tooltip>{labelTooltip}</Tooltip>}
    >
      <InputGroup.Text style={labelStyle}>{label}</InputGroup.Text>
    </OverlayTrigger>
  ) : (
    <InputGroup.Text style={labelStyle}>{label}</InputGroup.Text>
  );

  // ---------------------- INTEGER SAFETY HANDLERS ----------------------

  const handleKeyDown = useCallback((e) => {
    if (e.key === ',' || e.key === '.' || e.key === 'e' || e.key === 'E' || e.key === '+') {
      e.preventDefault();
    }
  }, []);

  const handleBeforeInput = useCallback((e) => {
    if (e.data && /\D/.test(e.data)) {
      e.preventDefault();
    }
  }, []);

  const handlePaste = useCallback((e) => {
    const text = e.clipboardData.getData('text');
    if (!/^\d+$/.test(text)) {
      e.preventDefault();
    }
  }, []);

  // ---------------------------------------------------------------------

  return (
    <InputGroup size={size} style={groupStyle} className={groupClassName}>
      {label && labelContent}
      {siblingPosition === 'before' && siblings}
      <Form.Control
        type="number"
        placeholder=""
        style={inputStyle}
        value={value}
        name={name}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        readOnly={readOnly}
        className={inputClassName}
        min={min}
        max={max}
        step={step}
        maxLength={maxLength}

        onKeyDown={integer ? handleKeyDown : undefined}
        onBeforeInput={integer ? handleBeforeInput : undefined}
        onPaste={integer ? handlePaste : undefined}
      />
      {unit && <InputGroup.Text style={unitStyle}>{unit}</InputGroup.Text>}
      {siblingPosition === 'after' && siblings}
    </InputGroup>
  );
}

export default CustomIncrementInput;
