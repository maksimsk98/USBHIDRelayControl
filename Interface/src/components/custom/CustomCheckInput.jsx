import React from 'react';
import { Form, InputGroup } from 'react-bootstrap';

function CustomCheckboxInput({
  checked,
  disabled,
  onCheckboxChange,
  checkboxLabel,
  checkboxName,
  checkboxStyle = { width: '100px' },

  value,
  onInputChange,
  inputName,
  inputDisabled,
  inputReadOnly,
  inputStyle = { maxWidth: '80px', minWidth: '60px' },
  inputLabel,
  inputLabelStyle = { width: '90px' },
  groupClassName = 'mb-2',
}) {
  return (
    <InputGroup className={groupClassName} style={{ flexWrap: 'nowrap' }}>
      <InputGroup.Checkbox
        name={checkboxName}
        checked={checked}
        disabled={disabled}
        onChange={onCheckboxChange}
      />
      <InputGroup.Text style={checkboxStyle}>{checkboxLabel}</InputGroup.Text>
      <Form.Control
        name={inputName}
        value={value}
        onChange={onInputChange}
        placeholder=""
        style={inputStyle}
        disabled={inputDisabled}
        readOnly={inputReadOnly}
      />
      <InputGroup.Text style={inputLabelStyle}>{inputLabel}</InputGroup.Text>
    </InputGroup>
  );
}

export default CustomCheckboxInput;
