import React from 'react';
import classNames from 'classnames';
import { Accordion, Button, Form, InputGroup } from 'react-bootstrap';
import { BUTTON_VARIANT_PER_STATE, NODE_STATUSES } from '../../../constants/constants';

const statusClassMap = {
  [NODE_STATUSES.NOT_CONNECTED]: 'bg-warning text-dark',
  [NODE_STATUSES.CONNECTED]: '',
  [NODE_STATUSES.BUSY]: 'bg-info text-dark',
  [NODE_STATUSES.IS_WORKING]: 'bg-success text-white',
  [NODE_STATUSES.NOT_RESPONSIVE]: 'bg-danger text-white',
};

function StatusAccordionFormGroup({
  eventKey,
  headerText,
  inputStructure,
  onChange = null,

  // accordion header overrides
  headerClassName = '',
  headerStyle = { outline: 'none', boxShadow: 'none' },

  // accordion body overrides
  bodyClassName = '',
  bodyStyle = { padding: '2px 2px' },

  children = null,
}) {

  const handleToggle = () => {
    if (onChange) onChange(eventKey);
  };

  return (
    <Accordion.Item eventKey={eventKey}>
      <Accordion.Header
        onClick={handleToggle}
        className={headerClassName}
        style={headerStyle}
      >
        {headerText}
      </Accordion.Header>

      <Accordion.Body
        className={bodyClassName}
        style={bodyStyle}
      >
        {inputStructure.map((input, idx) => {
          const {
            labelText,
            value,
            status,
            controlType,
            onClick,
            // per-input overrides
            inputGroupClassName = '',
            inputGroupStyle = { flexWrap: 'nowrap' },
            labelClassName = '',
            labelStyle = { minWidth: '160px' },
            controlClassName = '',
            controlStyle = { minWidth: '60px' },
          } = input;

          if (controlType === 'button') {
            return (
              <InputGroup
                key={idx}
                className={inputGroupClassName}
                style={inputGroupStyle}
              >
                <InputGroup.Text
                  className={classNames(labelClassName)}
                  style={labelStyle}
                >
                  {labelText}
                </InputGroup.Text>
                <Button
                  variant={BUTTON_VARIANT_PER_STATE[value]}
                  size="sm"
                  onClick={onClick}
                  disabled={status !== 'connected'}
                  style={{ minWidth: '100px' }}
                >
                  {value === 'active' ? 'Вкл' : 'Выкл'}
                </Button>
              </InputGroup>
            );
          }

          return (
            <InputGroup
              key={idx}
              className={inputGroupClassName}
              style={inputGroupStyle}
            >
              <InputGroup.Text
                className={classNames(labelClassName)}
                style={labelStyle}
              >
                {labelText}
              </InputGroup.Text>
              <Form.Control
                name={labelText}
                value={value ?? ''}
                className={classNames(
                  statusClassMap[status] ?? 'bg-danger text-dark',
                  controlClassName,
                )}
                style={controlStyle}
                placeholder=""
                disabled
                readOnly
              />
            </InputGroup>
          );
        })}

        {children}
      </Accordion.Body>
    </Accordion.Item>
  );
}

export default StatusAccordionFormGroup;
