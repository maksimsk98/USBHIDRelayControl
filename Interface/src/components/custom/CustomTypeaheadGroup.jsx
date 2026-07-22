import { InputGroup } from 'react-bootstrap';
import { Menu, MenuItem, Typeahead } from 'react-bootstrap-typeahead';

import { forwardRef } from 'react';
import styles from './CustomTypeaheadGroup.module.css';

const CustomTypeaheadGroup = forwardRef(({
  label,
  options = [],
  name,
  selected,
  onChange,
  onInputChange,
  onBlur,
  onFocus,
  disabled = false,
  groupClassName = 'mb-2',
  labelStyle = { minWidth: '198px' },
  groupStyle = { flexWrap: 'nowrap' },
  typeaheadClassName,
  inputStyle,
  size = 'md',
  placeholder = '',
  allowNew = false,
  filterBy,
}, ref) => {
  const menuClassName = size === 'sm' ? styles.menuSm : styles.menuMd;

  const typeaheadSize = size === 'lg' ? 'lg' : 'sm';

  const bootstrapInputClass = size === 'sm'
    ? 'form-control form-control-sm'
    : size === 'lg'
      ? 'form-control form-control-lg'
      : 'form-control';

  const defaultBlurOnEnter = (e) => {
    if (e.key === 'Enter') {
      ref.current.blur();
    }
  };

  return (
    <InputGroup size={size} style={groupStyle} className={groupClassName}>
      {label && <InputGroup.Text style={labelStyle}>{label}</InputGroup.Text>}
      <Typeahead
        ref={ref}
        id={name || 'custom-typeahead'}
        onKeyDown={defaultBlurOnEnter}
        options={options}
        filterBy={filterBy}
        selected={selected}
        onChange={onChange}
        onFocus={onFocus}
        onInputChange={onInputChange}
        onBlur={onBlur}
        disabled={disabled}
        allowNew={allowNew}
        highlightOnlyResult={!allowNew}
        emptyLabel="Совпадений не найдено"
        placeholder={placeholder}
        inputProps={{
          style: inputStyle,
          className: bootstrapInputClass,
        }}
        renderMenu={(results, menuProps) => (
          <Menu {...menuProps} className={`${menuClassName} ${styles.parentWide}`}>
            {results.map((option, position) => (
              <MenuItem key={position} option={option} position={position}>
                {typeof option === 'string' ? option : option.label}
              </MenuItem>
            ))}
          </Menu>
        )}
        className={typeaheadClassName}
      />
    </InputGroup>
  );
});

export default CustomTypeaheadGroup;
