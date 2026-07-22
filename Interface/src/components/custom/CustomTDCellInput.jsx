import React, { forwardRef } from 'react';
import { Form } from 'react-bootstrap';
import { Typeahead } from 'react-bootstrap-typeahead';

const FullCellInputTD = forwardRef(({
  type = 'input', // 'input' or 'typeahead'
  value,
  onChange,
  onInputChange,
  options = [],
  placeholder = '',
  name,
  selected,
  rowIndex,
  onBlur,
  onFocus,
  disabled,
  cellStyle: additionalCellStyle = {},
}, ref) => {
  const cellStyle = {
    padding: 0,
    backgroundColor: 'inherit',
    ...additionalCellStyle,
  };

  const inputStyle = {
    width: '100%',
    height: '100%',
    padding: '0.375rem 0.5rem',
    border: 'none',
    boxShadow: 'none',
    fontSize: '0.875rem',
    backgroundColor: 'inherit',
  };

  if (type === 'typeahead') {
    return (
      <td style={cellStyle}>
        <Typeahead
          positionFixed
          ref={ref}
          id={`${name}-${rowIndex}`}
          options={options}
          selected={selected}
          onChange={onChange}
          onInputChange={onInputChange}
          placeholder={placeholder}
          onBlur={onBlur}
          onFocus={onFocus}
          size="sm"
          inputProps={{ style: inputStyle }}
          style={{ width: '100%', backgroundColor: 'inherit' }}
          emptyLabel="Совпадений не найдено"
          highlightOnlyResult
          disabled={disabled}
        />
      </td>
    );
  }

  return (
    <td style={cellStyle}>
      <Form.Control
        ref={ref}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        onFocus={onFocus}
        style={inputStyle}
        disabled={disabled}
      />
    </td>
  );
});

export default FullCellInputTD;
