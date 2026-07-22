import React from 'react';
import { useSelector } from 'react-redux';

import { Form } from 'react-bootstrap';
import CustomInputGroup from '../../custom/CustomInputGroup';
import CustomSelectGroup from '../../custom/CustomSelectGroup';

import { selectCalibDepFormData } from '../../../services/reduxImportDispatcher';
import { READONLY_INPUT_STYLE } from '../../../constants/colors';

function CalibrationDepForm({ parentId }) {
  const handleOnChange = (e) => {
    console.log(e.target.name);
  };

  const labelStyle = { minWidth: '170px' };
  const inputStyle = { minWidth: '150px', maxWidth: '250px', ...READONLY_INPUT_STYLE };
  const selectStyle = { minWidth: '150px', maxWidth: '250px' };

  const dependencyData = useSelector((state) => selectCalibDepFormData(state, parentId));

  const renderOptions = (optionArr) => optionArr.map((option, index) => <option key={index} value={option}>{option}</option>);

  return (
    <Form className="mb-3 mt-2">
      <CustomSelectGroup
        label="Тип кривой:"
        options={renderOptions(dependencyData.curveTypes)}
        name="curveType"
        value={dependencyData.curveTypes[0]}
        onChange={handleOnChange}
        className="mb-2"
        selectStyle={selectStyle}
        labelStyle={labelStyle}
        size="sm"
      />

      {/* Select Group for Stat Weight */}
      <CustomSelectGroup
        label="Стат. вес:"
        options={renderOptions(dependencyData.statWeights)}
        name="statWeight"
        value={dependencyData.statWeights[0]}
        onChange={handleOnChange}
        className="mb-2"
        selectStyle={selectStyle}
        labelStyle={labelStyle}
        size="sm"
      />

      {/* Input Group for Equation */}
      <CustomInputGroup
        label="Уравнение:"
        value={dependencyData.equation}
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
        value={dependencyData.absError}
        name="absError"
        onChange={handleOnChange}
        readOnly
        inputStyle={inputStyle}
        labelStyle={labelStyle}
        groupClassName="mb-2"
        size="sm"
        maxLength={7}
      />

      {/* Input Group for Relative Error */}
      <CustomInputGroup
        label="Относительное СКО:"
        value={dependencyData.relError}
        name="relError"
        onChange={handleOnChange}
        unit="%"
        readOnly
        inputStyle={inputStyle}
        labelStyle={labelStyle}
        unitStyle={{ width: '50px' }}
        groupClassName="mb-2"
        size="sm"
        maxLength={7}
      />

      {/* Input Group for Correlation Coefficient */}
      <CustomInputGroup
        label="Коэффициент корр.:"
        value={dependencyData.corrCoef}
        name="corrCoef"
        onChange={handleOnChange}
        readOnly
        inputStyle={inputStyle}
        labelStyle={labelStyle}
        groupClassName="mb-2"
        size="sm"
        maxLength={7}
      />
    </Form>
  );
}

export default CalibrationDepForm;
