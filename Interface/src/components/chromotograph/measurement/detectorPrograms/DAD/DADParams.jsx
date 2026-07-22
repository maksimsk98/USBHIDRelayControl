import { useCallback, useEffect, useState } from "react";
import {
  Form,
  Button,
  Modal,
  Table,
  Row,
  Col,
  InputGroup,
} from "react-bootstrap";

import CustomSelectGroup from "../../../../custom/CustomSelectGroup";
import CustomInputGroup from "../../../../custom/CustomInputGroup";
import { dadActions } from "../../../../../services/reduxImportDispatcher";
import { useDispatch, useSelector } from "react-redux";
import { selectDADProgramData } from "../../../../../services/selectors/DAD/DADBase";

import dadTableStyles from "./DADParams.module.css";
import CustomCheckboxGroup from "../../../../custom/CustomCheckboxGroup";
import { DAD_RANGES } from "../../../../../constants/stepFields";
import { clampingBlur, intSetter } from "../../../../../utils/setters";

export default function DADParams({ tabId }) {

  const dispatch = useDispatch();
  const dadState = useSelector(state => selectDADProgramData(state, tabId));
  const [showModal, setShowModal] = useState(false);

  const setUseReferenceChannel = (channel) => {
    dispatch(
      dadActions.setReferenceChannel({ tabId, channel })
    );
  }
 
  if (!dadState) return null;

  const params = dadState?.params || {}
  const channels = params?.channels || {};
  const {autoZero = false} = params

  const updateChannel = (channel, field, value) => {
    dispatch(
      dadActions.updateChannelField({
        tabId,
        channel,
        field,
        value,
      })
    );
  };

  const setAutoZero = (autoZero) => {
    dispatch(
      dadActions.setAutoZero({  tabId, autoZero })
    );
  }

  return (
    <>
      <div className="p-1 rounded" style={{ maxWidth: 800 }}>
        <CustomCheckboxGroup
          label="Автоустановка нуля"
          labelTestId="dad-params-auto-zero-label"
          checkboxTestId="dad-params-auto-zero-checkbox"
          labelStyle={{width: 'fit-content'}}
          onChange={(e) => setAutoZero(e.target.checked)}
          checked={autoZero}
          groupClassName="mb-2"
          size="sm"
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowModal(true)}
          data-testid="dad-params-open-button"
        >
          Параметры каналов
        </Button>
      </div>

      <ChannelParametersModal
        show={showModal}
        onHide={() => setShowModal(false)}
        channels={channels}
        updateChannel={updateChannel}
        setUseReferenceChannel={setUseReferenceChannel}
      />
    </>
  );
}

function ChannelParametersModal({
  show,
  onHide,
  channels: initialChannels,
  updateChannel,
  setUseReferenceChannel
}) {
  // Local state for edited values
  const [localChannels, setLocalChannels] = useState(initialChannels);
  
  // Reset local state when modal opens with fresh Redux data
  useEffect(() => {
    if (show) {
      setLocalChannels(initialChannels);
    }
  }, [show, initialChannels]);

  const rangesMap = DAD_RANGES
  
  // Update local state, not Redux directly
  const updateLocalChannel = (channel, field, value) => {
    setLocalChannels(prev => ({
      ...prev,
      [channel]: {
        ...prev[channel],
        [field]: value
      }
    }));
  };
  
  const handleChannelChange = (channel, field) => (e) => {
    const { value } = e.target;
    
    intSetter({
      name: field,
      value,
      rangesMap: {
        sample_wl: [3, undefined, undefined],
        sample_bw: [2, undefined, undefined],
        reference_wl: [3, undefined, undefined],
        reference_bw: [2, undefined, undefined],
      },
      setterDispatch: {
        [field]: (val) => updateLocalChannel(channel, field, val)
      },
      config: {
        isSetAsNum: true,
      },
    });
  };

  const handleChannelBlur = (channel, field) => (e) => {
    const { value } = e.target;
    
    clampingBlur({
      name: field,
      value,
      rangesMap,
      setterDispatch: {
        [field]: (val) => updateLocalChannel(channel, field, val)
      },
      returnAs: 'num',
    });
  };
  
  // Apply all changes to Redux
  const handleApply = () => {
    // Dispatch all channel changes
    Object.entries(localChannels).forEach(([channel, values]) => {
      Object.entries(values).forEach(([field, value]) => {
        if (field !== 'reference_use') {
          updateChannel(channel, field, value);
        }
      });
      // Handle reference_use separately
      if (values.reference_use !== initialChannels[channel]?.reference_use) {
        setUseReferenceChannel(channel);
      }
    });
    onHide();
  };
  
  // Cancel - just close without saving
  const handleCancel = () => {
    onHide();
  };

  // Handle reference use checkbox change (update local only)
  const handleReferenceUseChange = (channel) => (e) => {
    const isChecked = e.target.checked;
    setLocalChannels(prev => ({
      ...prev,
      [channel]: {
        ...prev[channel],
        reference_use: isChecked
      }
    }));
  };

  return (
    <Modal show={show} onHide={handleCancel} size="lg" data-testid="dad-params-modal">
      <Modal.Header closeButton data-testid="dad-params-modal-header">
        <Modal.Title data-testid="dad-params-modal-title">Параметры каналов</Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-1" data-testid="dad-params-modal-body">
        <Table bordered size="sm" className={`align-middle ${dadTableStyles.dadTable}`} data-testid="dad-params-table">
          <thead>
            <tr>
              <th style={{ width: 30 }} data-testid="dad-params-table-header-channel">Канал</th>
              <th className="text-center" data-testid="dad-params-table-header-sample-wl">Проба WL [нм]</th>
              <th className="text-center" data-testid="dad-params-table-header-sample-bw">Проба BW [нм]</th>
              <th className="text-center" data-testid="dad-params-table-header-reference-wl">Опорный WL [нм]</th>
              <th className="text-center" data-testid="dad-params-table-header-reference-bw">Опорный BW [нм]</th>
              <th className="text-center" data-testid="dad-params-table-header-reference-use">Использовать опорный канал</th>
            </tr>
          </thead>

          <tbody>
            {Object.entries(localChannels).map(([channel, values]) => (
              <tr key={channel} data-testid={`dad-params-channel-${channel}-row`}>
                <td className="text-center fw-bold" data-testid={`dad-params-channel-${channel}-label`}>{channel}</td>

                <td>
                  <Form.Control
                    size="sm"
                    type="number"
                    value={values.sample_wl ?? ''}
                    onChange={handleChannelChange(channel, 'sample_wl')}
                    onBlur={handleChannelBlur(channel, 'sample_wl')}
                    data-testid={`dad-params-channel-${channel}-sample-wl-input`}
                  />
                </td>

                <td>
                  <Form.Control
                    size="sm"
                    type="number"
                    value={values.sample_bw ?? ''}
                    onChange={handleChannelChange(channel, 'sample_bw')}
                    onBlur={handleChannelBlur(channel, 'sample_bw')}
                    data-testid={`dad-params-channel-${channel}-sample-bw-input`}
                  />
                </td>

                <td>
                  <Form.Control
                    size="sm"
                    type="number"
                    value={values.reference_wl ?? ''}
                    onChange={handleChannelChange(channel, 'reference_wl')}
                    onBlur={handleChannelBlur(channel, 'reference_wl')}
                    data-testid={`dad-params-channel-${channel}-reference-wl-input`}
                  />
                </td>

                <td>
                  <Form.Control
                    size="sm"
                    type="number"
                    value={values.reference_bw ?? ''}
                    onChange={handleChannelChange(channel, 'reference_bw')}
                    onBlur={handleChannelBlur(channel, 'reference_bw')}
                    data-testid={`dad-params-channel-${channel}-reference-bw-input`}
                  />
                </td>

                <td className="text-center">
                  <Form.Check
                    type="checkbox"
                    checked={values.reference_use ?? false}
                    onChange={handleReferenceUseChange(channel)}
                    data-testid={`dad-params-channel-${channel}-reference-use-checkbox`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Modal.Body>

      <Modal.Footer data-testid="dad-params-modal-footer">
        <Button 
          style={{width: '110px'}} 
          variant="primary" 
          onClick={handleApply}
          data-testid="dad-params-apply-button"
        >
          Применить
        </Button>
        <Button 
          style={{width: '110px'}} 
          variant="secondary" 
          onClick={handleCancel}
          data-testid="dad-params-cancel-button"
        >
          Отменить
        </Button>
      </Modal.Footer>
    </Modal>
  );
}