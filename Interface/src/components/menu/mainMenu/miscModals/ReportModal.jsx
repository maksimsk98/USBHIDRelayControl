import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import {
  Document, Packer, Paragraph, ImageRun,
} from 'docx';
import { saveAs } from 'file-saver';
import { useSelector } from 'react-redux';

import capturePlotImage from '../../../../utils/capturePlotImage';
import generateReportText from '../../../../utils/generateReportText';
import generatePDFBlob from '../../../../utils/generatePDF';

import { EMPTY_ARRAY } from '../../../../constants/constants';

import { selectPassportData, selectPeaksById, selectLumexStepsData } from '../../../../services/reduxImportDispatcher';

const renderNoDataModal = (show, onClose) => (
  <Modal show={show} onHide={onClose}>
    <Modal.Header closeButton>
      <Modal.Title>Сгенерировать отчет</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      <p>Нет данных для генерации отчета. Пожалуйста, выберите правильную вкладку с измерениями.</p>
    </Modal.Body>
    <Modal.Footer>
      <Button variant="secondary" onClick={onClose}>
        Закрыть
      </Button>
    </Modal.Footer>
  </Modal>
);

const generateDOCXBlob = async (passportData, checkboxes, reportText, plotImagePromise) => {
  const plotImage = await plotImagePromise; // Await the plot image promise

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph(reportText),
          plotImage && new Paragraph({
            children: [
              new ImageRun({
                data: Uint8Array.from(atob(plotImage.split(',')[1]), (c) => c.charCodeAt(0)).buffer,
                transformation: { width: 600, height: 400 }, // Adjust sizing as needed
              }),
            ],
          }),
        ].filter(Boolean),
      },
    ],
  });

  const docxBlob = await Packer.toBlob(doc);
  return docxBlob;
};

function ReportModal({ show, onClose }) {
  const [format, setFormat] = useState('PDF');
  const [reportGenerated, setReportGenerated] = useState(false);
  const [reportData, setReportData] = useState(null);
  const activeTab = useSelector((state) => state.tabReducer.activeTab);
  const passportData = useSelector((state) => selectPassportData(state, activeTab));
  const reportState = useSelector((state) => state.reportReducer[activeTab]);
  const stepsData = useSelector((state) => selectLumexStepsData(state, activeTab));
  const peaksData = useSelector((state) => selectPeaksById(state, activeTab)) ?? EMPTY_ARRAY;

  // Check if the necessary data is available
  if (!passportData || !reportState) {
    return renderNoDataModal(show, onClose);
  }

  const { checkboxes, peakTableParams, plot } = reportState;

  const handleGenerateReport = async () => {
    const plotImagePromise = checkboxes.chromatogram ? capturePlotImage(plot) : Promise.resolve(null);
    const reportTextLines = generateReportText(passportData, checkboxes);

    let reportBlob;
    if (format === 'PDF') {
      reportBlob = await generatePDFBlob(checkboxes, peakTableParams, passportData, stepsData, plotImagePromise, peaksData);
    }
    if (format === 'DOCX') {
      reportBlob = await generateDOCXBlob(reportTextLines, plotImagePromise);
    }
    setReportData(reportBlob);
    setReportGenerated(true);
  };

  const handleDownloadReport = () => {
    if (reportData) {
      if (reportData instanceof Blob) {
        const fileExtension = format.toLowerCase();
        saveAs(reportData, `отчет.${fileExtension}`);
      } else {
        console.error('Report data is not a valid Blob:', reportData);
      }
    } else {
      console.error('No report data available to download.');
    }
    setReportGenerated(false);
  };

  return (
    <Modal show={show} onHide={onClose}>
      <Modal.Header closeButton>
        <Modal.Title>Сгенерировать отчет</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group>
            <Form.Label>Выберите формат отчета</Form.Label>
            <div>
              <Form.Check
                inline
                type="radio"
                label="PDF"
                name="format"
                value="PDF"
                checked={format === 'PDF'}
                onChange={(e) => setFormat(e.target.value)}
              />
              {/* <Form.Check
                            inline
                            type="radio"
                            label="DOCX"
                            name="format"
                            value="DOCX"
                            checked={format === 'DOCX'}
                            onChange={(e) => setFormat(e.target.value)}
                        /> */}
            </div>
          </Form.Group>
          <Button variant="primary" onClick={handleGenerateReport}>
            Сгенерировать отчет
          </Button>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Закрыть
        </Button>
        <Button
          variant="success"
          onClick={handleDownloadReport}
          disabled={!reportGenerated}
        >
          Скачать отчет
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default ReportModal;
