import React from 'react';
import {
  Container, Row, Col, Table, Card, Modal,
} from 'react-bootstrap';
import { useSelector } from 'react-redux';
import { isEmpty } from 'lodash';
import { selectFirmwareVersions, selectNodeData, selectPumpsTypes } from '../../../../services/reduxImportDispatcher';
import { DETECTOR_FULL_NAMES, EMPTY_OBJECT } from '../../../../constants/constants';

function FirmwareModal({ show, onClose }) {
  const selectedNodes = useSelector(selectNodeData);
  const firmwareVersions = useSelector(selectFirmwareVersions);
  const pumpTypes = useSelector(selectPumpsTypes);

  if (isEmpty(firmwareVersions)) {
    return null;
  }

  const {
    detectorType,
    chosenDetector,
    chosenPumps,
    chosenThermostat,
  } = selectedNodes;

  const getDetectorBlock = () => {
    if (firmwareVersions?.panorama) {
      const { date: dateMainController, version: versionMainController } = firmwareVersions.panorama?.mainController ?? EMPTY_OBJECT;
      const { date: dateMeasureNode, version: versionMeasureNode } = firmwareVersions.panorama?.measureNode ?? EMPTY_OBJECT;
      const { date: dateFilterNode, version: versionFilterNode } = firmwareVersions.panorama?.filterNode ?? EMPTY_OBJECT;
      const { date: dateUsbCanNode, version: versionUsbCanNode } = firmwareVersions.panorama?.usbCanNode ?? EMPTY_OBJECT;

      return {
        title: `${DETECTOR_FULL_NAMES[detectorType]} (${chosenDetector})`,
        nodes: [
          { name: 'Главный контроллер', version: versionMainController ?? '', date: dateMainController ?? '' },
          { name: 'Измеритель', version: versionMeasureNode ?? '', date: dateMeasureNode ?? '' },
          { name: 'Фильтры', version: versionFilterNode ?? '', date: dateFilterNode ?? '' },
          { name: 'Модуль связи', version: versionUsbCanNode ?? '', date: dateUsbCanNode ?? '' },
        ],
      };
    }

    if (firmwareVersions?.spectrophotometr) {
      const { date: dateMainController, version: versionMainController } = firmwareVersions.spectrophotometr?.mainController ?? EMPTY_OBJECT;
      const { date: dateLampNode, version: versionLampNode } = firmwareVersions.spectrophotometr?.lampNode ?? EMPTY_OBJECT;
      const { date: dateFilterNode, version: versionFilterNode } = firmwareVersions.spectrophotometr?.usbCanNode ?? EMPTY_OBJECT;

      return {
        title: `${DETECTOR_FULL_NAMES[detectorType]} (${chosenDetector})`,
        nodes: [
          { name: 'Главный контроллер', version: versionMainController ?? '', date: dateMainController ?? '' },
          { name: 'Лампы', version: versionLampNode ?? '', date: dateLampNode ?? '' },
          { name: 'Модуль связи', version: versionFilterNode ?? '', date: dateFilterNode ?? '' },
        ],
      };
    }

    return null;
  };

  const getPumpBlocksArr = () => {
    const pumpBlocks = Object.entries(chosenPumps).filter(([key, value]) => value)
      .map(([key, value]) => {
        const { date: dateMainController, version: versionMainController } = firmwareVersions[`pump${key}`]?.mainController ?? EMPTY_OBJECT;
        const { date: datePeripheral, version: versionPeripheral } = firmwareVersions[`pump${key}`]?.peripheral ?? EMPTY_OBJECT;

        return {
          title: `Насос ${key} ${pumpTypes[key] ?? 'Неизвестно'} (${value})`,
          nodes: [
            { name: 'Главный контроллер', version: versionMainController ?? '', date: dateMainController ?? '' },
            { name: 'Периферийный', version: versionPeripheral ?? '', date: datePeripheral ?? '' },
          ],
        };
      });

    return pumpBlocks;
  };

  const getThermostatBlock = () => {
    const { date: dateLinkModule, version: versionLinkModule } = firmwareVersions.thermostat?.mainController ?? EMPTY_OBJECT;
    const { date: datePeripheral, version: versionPeripheral } = firmwareVersions.thermostat?.peripheral ?? EMPTY_OBJECT;

    return {
      title: `Термостат (${chosenThermostat})`,
      nodes: [
        { name: 'Модуль связи', version: versionLinkModule ?? '', date: dateLinkModule ?? '' },
        { name: 'Периферийный', version: versionPeripheral ?? '', date: datePeripheral ?? '' },
      ],
    };
  };

  const deviceBlocks = [
    getDetectorBlock(),
    ...getPumpBlocksArr(),
    getThermostatBlock(),
    {
      title: 'Дегазатор ()',
      nodes: [
        { name: 'Главный контроллер', version: '', date: '' },
      ],
    },
  ].filter((block) => block !== null);

  return (
    <Modal show={show} onHide={onClose} backdrop="static" size="xl">
      <Modal.Header closeButton>
        <Modal.Title>Прошивки</Modal.Title>
      </Modal.Header>
      <Container fluid className="p-3">
        <Row>
          {deviceBlocks.map((block, index) => (
            <Col md={6} key={index}>
              <Card className="mb-3">
                <Card.Body>
                  <Card.Title>{block.title}</Card.Title>
                  <Table bordered size="sm">
                      <thead>
                          <tr>
                              <th>Узел</th>
                              <th>Версия</th>
                              <th>Дата</th>
                            </tr>
                        </thead>
                      <tbody>
                          {block.nodes.map((node, idx) => (
                              <tr key={idx}>
                                  <td>{node.name}</td>
                                  <td>{node.version}</td>
                                  <td>{node.date}</td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>

      </Container>
    </Modal>
  );
}

export default FirmwareModal;
