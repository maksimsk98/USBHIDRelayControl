import React from 'react';
import { Form } from 'react-bootstrap';
import CustomInputGroup from '../../custom/CustomInputGroup';
import CustomSelectGroup from '../../custom/CustomSelectGroup';

function CalibDepenedencySubTab(props) {
  const labelStyle = { minWidth: '170px' };
  const inputStyle = { minWidth: '150px', maxWidth: '250px' };
  const selectStyle = { minWidth: '150px', maxWidth: '250px' };

  return (
    <div>
      <Form style={{ padding: '5px' }}>
        <CustomSelectGroup
          label="Тип кривой:"
          options={(
            <>
              <option value="k1">A = k1*С</option>
              <option value="other">Other Option</option>
            </>
          )}
          name="curveType"
          value="test"
          onChange={handleOnChange}
          className="mb-2"
          selectStyle={selectStyle}
          labelStyle={labelStyle}
          size="sm"
        />

        {/* Select Group for Stat Weight */}
        <CustomSelectGroup
          label="Стат. вес:"
          options={(
            <>
              <option value="1/x^2">1/x^2</option>
              <option value="other">Other Option</option>
            </>
          )}
          name="statWeight"
          value="test"
          onChange={handleOnChange}
          className="mb-2"
          selectStyle={selectStyle}
          labelStyle={labelStyle}
          size="sm"
        />

        {/* Input Group for Equation */}
        <CustomInputGroup
          label="Уравнение:"
          value="test"
          name="equation"
          onChange={handleOnChange}
          inputStyle={inputStyle}
          labelStyle={labelStyle}
          groupClassName="mb-2"
          size="sm"
        />

        {/* Input Group for Absolute Error */}
        <CustomInputGroup
          label="Абсолютное СКО:"
          value="test"
          name="absError"
          unit=""
          readOnly
          inputStyle={inputStyle}
          labelStyle={labelStyle}
          groupClassName="mb-2"
          size="sm"
        />

        {/* Input Group for Relative Error */}
        <CustomInputGroup
          label="Относительное СКО:"
          value="test"
          name="relError"
          unit="%"
          readOnly
          inputStyle={inputStyle}
          labelStyle={labelStyle}
          unitStyle={{ width: '50px' }}
          groupClassName="mb-2"
          size="sm"
        />

        {/* Input Group for Correlation Coefficient */}
        <CustomInputGroup
          label="Коэффициент корр.:"
          value="test"
          name="corrCoef"
          unit=""
          readOnly
          inputStyle={inputStyle}
          labelStyle={labelStyle}
          groupClassName="mb-2"
          size="sm"
        />
      </Form>
    </div>
  );
}

export default CalibDepenedencySubTab;
