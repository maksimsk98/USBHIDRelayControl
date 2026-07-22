import React from 'react';
import { InputGroup, Button, Form } from 'react-bootstrap';

/**
 * PumpControlGroup – compact toolbar built from **one** <InputGroup> that mimics
 * the exact Bootstrap pattern you showed (Checkbox ➜ Text label ➜ Control).
 * Nothing inside the InputGroup has its own flex-basis, so the bar never wraps
 * or blows up the surrounding layout.
 */
function PumpControlGroup({
  /* mode buttons */
  mode = 'fill', // 'fill' | 'drain'
  onModeChange,
  /* pumps */
  pumps = { pumpA: true, pumpB: true },
  onPumpsChange,
  /* volume */
  volume = '',
  onVolumeChange,
  useVolume = false,
  onUseVolumeChange,
  /* speed */
  rate = 'low',
  onRateChange,
  rateOptions = [
    { value: 'low', label: 'Низкая (5 мкл/мин)' },
    { value: 'medium', label: 'Средняя (10 мкл/мин)' },
    { value: 'high', label: 'Высокая (20 мкл/мин)' },
  ],
  /* misc */
  disabled = false,
  size = 'sm',
}) {
  /** helper to update a single pump checkbox */
  const togglePump = (pump) => (e) => onPumpsChange?.({ ...pumps, [pump]: e.target.checked });

  /** shared small label width */
  const lbl = { minWidth: '90px' };

  return (
    <InputGroup size={size} style={{ flexWrap: 'nowrap', overflowX: 'auto' }}>
      {/* ------------- Набор / Слив buttons --------------------------- */}
      <Button
        style={{ width: '110px', minWidth: '60px' }}
        active={mode === 'fill'}
        onClick={() => onModeChange?.('fill')}
        disabled={disabled || mode !== 'fill' && mode !== 'drain'}
      >
        Набор
      </Button>
      <Button
        style={{ width: '110px', minWidth: '60px' }}
        active={mode === 'drain'}
        onClick={() => onModeChange?.('drain')}
        disabled={disabled || mode !== 'fill' && mode !== 'drain'}
      >
        Слив
      </Button>

      {/* ------------- Pump A ----------------------------------------- */}
      <InputGroup.Checkbox
        checked={pumps.pumpA}
        onChange={togglePump('pumpA')}
        disabled={disabled}
      />
      <InputGroup.Text style={{ minWidth: '70px' }}>Насос A</InputGroup.Text>

      {/* ------------- Pump B ----------------------------------------- */}
      <InputGroup.Checkbox
        checked={pumps.pumpB}
        onChange={togglePump('pumpB')}
        disabled={disabled}
      />
      <InputGroup.Text style={{ minWidth: '70px' }}>Насос B</InputGroup.Text>

      {/* ------------- Volume checkbox + numeric ---------------------- */}
      <InputGroup.Checkbox
        checked={useVolume}
        onChange={(e) => onUseVolumeChange?.(e.target.checked)}
        disabled={disabled}
      />
      <InputGroup.Text style={{ minWidth: '65px' }}>Объем</InputGroup.Text>
      <Form.Control
        type="number"
        value={volume}
        onChange={(e) => onVolumeChange?.(e.target.value)}
        disabled={disabled || !useVolume}
        style={{ maxWidth: '80px', minWidth: '60px' }}
        readOnly={!useVolume}
        name="fillVolume"
      />
      <InputGroup.Text style={{ minWidth: '45px' }}>мкл</InputGroup.Text>

      {/* ------------- Rate selector ---------------------------------- */}
      <InputGroup.Text style={{ minWidth: '130px' }}>Скорость набора</InputGroup.Text>
      <Form.Select
        value={rate}
        onChange={(e) => onRateChange?.(e.target.value)}
        disabled={disabled}
        style={{ minWidth: '190px' }}
      >
        {rateOptions.map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Form.Select>
    </InputGroup>
  );
}

export default PumpControlGroup;
