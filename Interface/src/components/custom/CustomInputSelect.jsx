import React from 'react';
import {
  InputGroup, FormControl, Dropdown, DropdownButton,
} from 'react-bootstrap';

function CustomInputSelect(props) {
  const {
    value, onChange, onBlur, onSelect, dropdownOptions, className,
  } = props;

  return (
    <InputGroup size="sm" style={{ height: '34px' }}>
      <FormControl
        className={className}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder="Enter or select a value"
      />
      {dropdownOptions && (
      <DropdownButton
        variant="outline-secondary"
        id="segmented-input-dropdown"
      >
        {dropdownOptions.map((option, index) => (
          <Dropdown.Item
            key={index}
            onClick={() => onSelect(option)}
          >
            {option}
          </Dropdown.Item>
        ))}
      </DropdownButton>
      )}
    </InputGroup>
  );
}

export default CustomInputSelect;
