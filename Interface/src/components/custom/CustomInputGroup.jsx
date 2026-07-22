import React, { forwardRef } from 'react';
import { InputGroup, Form } from 'react-bootstrap';

const CustomInputGroup = forwardRef(({
  label,
  labelTestId,
  value,
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
  inputTestId,
  size = 'md',
  maxLength,
  siblings,
  type = 'text',
  min = null,
  max = null,
}, ref) => (
  <InputGroup size={size} style={groupStyle} className={groupClassName}>
    {/* Conditionally render label if it exists */}
    {label && <InputGroup.Text data-testid={labelTestId} style={labelStyle}>{label}</InputGroup.Text>}
    <Form.Control
      ref={ref}
      placeholder=""
      style={inputStyle}
      value={value}
      name={name}
      onChange={onChange}
      onBlur={onBlur}
      disabled={disabled}
      readOnly={readOnly}
      className={inputClassName}
      maxLength={maxLength}
      type={type}
      min={min}
      max={max}
      data-testid={inputTestId}
    />
    {/* Conditionally render unit if it exists */}
    {unit && <InputGroup.Text style={unitStyle}>{unit}</InputGroup.Text>}
    {siblings}
  </InputGroup>
));

export default CustomInputGroup;
