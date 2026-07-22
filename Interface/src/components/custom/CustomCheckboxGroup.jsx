import React from 'react';
import { InputGroup } from 'react-bootstrap';

function CustomCheckboxGroup({
  label,
  labelTestId,
  checked,
  name,
  onChange,
  onClick,
  onContextMenu,
  disabled = false,
  groupClassName = 'mb-2',
  labelStyle = { minWidth: '198px' },
  labelClassName = '',
  groupStyle,
  checkboxTestId,
  size = 'md',
  leftLabel = false,
}) {
  const adjustedGroupStyle = { flexWrap: 'nowrap', width: 'fit-content', ...groupStyle };

  return (
    <InputGroup
      size={size}
      style={adjustedGroupStyle}
      className={groupClassName}
      onClick={onClick}
      onContextMenu={onContextMenu}
    >
      {leftLabel && label && <InputGroup.Text  data-testid={labelTestId} style={labelStyle}>{label}</InputGroup.Text>}
      <InputGroup.Checkbox
        {...{
          name, checked, onChange, disabled,
        }}
        onClick={(e) => e.stopPropagation()}
        style={{ padding: '0.25rem 0.5rem' }}
        data-testid={checkboxTestId}
      />
      {!leftLabel && label && (
      <InputGroup.Text data-testid={labelTestId} className={labelClassName} style={labelStyle}>
        {label}
      </InputGroup.Text>
      )}
    </InputGroup>
  );
}

export default CustomCheckboxGroup;
