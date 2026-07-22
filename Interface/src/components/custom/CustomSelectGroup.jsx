import React from 'react';
import { InputGroup, Form } from 'react-bootstrap';
import { isArray, isObject } from 'lodash';
import { EMPTY_ARRAY } from '../../constants/constants';

const renderOptions = (optionArr) => {
  if (!isArray(optionArr)) return EMPTY_ARRAY;

  return optionArr.map((option, index) => {
    if (isObject(option)) {
      const { label, value } = option;
      return (
        <option key={index} value={value}>
          {label}
        </option>
      );
    }
    return (
      <option key={index} value={option}>
        {option}
      </option>
    );
  });
};

function CustomSelectGroup({
  label,
  labelTestId,
  options = null,
  rawOptions = EMPTY_ARRAY,
  name,
  onChange,
  value,
  disabled = false,
  groupClassName = 'mb-2',
  labelStyle = { minWidth: '198px' },
  groupStyle = { flexWrap: 'nowrap' },
  selectStyle,
  selectTestId,
  size = 'md',
  siblings = EMPTY_ARRAY, // array of { node, side }
}) {
  const renderedOptions = renderOptions(rawOptions) ?? EMPTY_ARRAY;

  const effectiveOptions = options ?? renderedOptions;

  const leftSiblings = siblings.filter((s) => s.side === 'left');
  const rightSiblings = siblings.filter((s) => s.side === 'right');

  return (
    <InputGroup size={size} style={groupStyle} className={groupClassName}>
      {leftSiblings.map((s, idx) => (s.node))}
      {label && <InputGroup.Text data-testid={labelTestId} style={labelStyle}>{label}</InputGroup.Text>}
      <Form.Select
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        style={selectStyle}
        data-testid={selectTestId}
      >
        {effectiveOptions}
      </Form.Select>
      {rightSiblings.map((s, idx) => (s.node))}
    </InputGroup>
  );
}

export default CustomSelectGroup;
