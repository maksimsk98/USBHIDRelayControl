import React, {
  useCallback, useEffect, useRef, useState,
} from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Button, Col, Container, Form, Row, Stack,
} from 'react-bootstrap';
import { Allotment } from 'allotment';

import CheckboxTable from './CheckboxTable.jsx';
import ReportDetails from './ReportDetails.jsx';

import {
  reportActions, selectActiveSubTabByTab, selectActiveTab, selectCalibrationByTabId, selectChromaPeaksCheckboxes, selectChromaReportCheckboxes, selectPassportData, selectPeakValleyAvailable, selectSelectedChromatographData,
} from '../../../services/reduxImportDispatcher.js';
import { useElectronExportDocx, useElectronExportElementPDF, useElectronPrintElementA4 } from '../../../hooks/useExportElement.js';
import { printCommandRegistry } from '../../../utils/classes/CommandRegistry.js';
import { makeNoiseEvalHandler } from './NoiseEvalWrapper.jsx';
import { selectNoiseEvalReportData } from '../../../services/selectors/report/reportDerived.js';
import { waitForFreezeDone } from '../../../services/thunks/report/reportDynamicCheck.js';
import { selectNameById } from '../../../services/selectors/selectNames.js';
import { selectCalibMeta, selectRepPeakAvailable } from '../../../services/selectors/calibConc/calibConcBase.js';


function ReportTab(props) {
  const parentId = props.params.chromaTabId;
  const { api } = props;
  const dispatch = useDispatch();
  const passportData = useSelector((state) => selectPassportData(state, parentId));
  const checkboxes = useSelector((state) => selectChromaReportCheckboxes(state, parentId));
  const peakTableParams = useSelector((state) => selectChromaPeaksCheckboxes(state, parentId));
  const chromatographData = useSelector(selectSelectedChromatographData);

  const printRef = useRef(null);
  const tabName = useSelector((state) => selectNameById(state, parentId));

  const tabCalib = useSelector((state) => selectCalibrationByTabId(state, parentId)); // HACK WATCHLIST

  const calibMetaData = useSelector((state) => selectCalibMeta(state, tabCalib));

  const canShowRRT = useSelector((s) => selectRepPeakAvailable(s, tabCalib));
  const canShowPeakValley = useSelector((s) => selectPeakValleyAvailable(s, parentId));

  useEffect(() => {
    if (!canShowRRT && peakTableParams.relativeTime) {
      dispatch(reportActions.updatePeakTableParam({
        parentId,
        name: 'relativeTime',
        checked: false,
      }));
    }

    if (!canShowPeakValley && peakTableParams.peakValley) {
      dispatch(reportActions.updatePeakTableParam({
        parentId,
        name: 'peakValley',
        checked: false,
      }));
    }
  }, [
    canShowRRT,
    canShowPeakValley,
    peakTableParams.relativeTime,
    peakTableParams.peakValley,
    parentId,
  ]);


    const handleCheckboxChange = (e) => {
    dispatch(reportActions.updateReportChecks({
      parentId,
      name: e.target.name,
      checked: e.target.checked,
    }));
  };

  const handlePeakTableCheckboxChange = (e) => {
    const { checked } = e.target;
    const fieldName = e.target.name;

    const checkedParams = Object.keys(peakTableParams).filter((key) => peakTableParams[key] === true);
    const toggledOffLastParam = checkboxes.peakTable && checkedParams.length === 1 && checkedParams[0] === fieldName;
    const shouldDisplayTable = !checkboxes.peakTable && checked === true;

    if (toggledOffLastParam) {
      dispatch(reportActions.updateReportChecks({
        parentId,
        name: 'peakTable',
        checked: false,
      }));
    }

    if (shouldDisplayTable) {
      dispatch(reportActions.updateReportChecks({
        parentId,
        name: 'peakTable',
        checked: true,
      }));
    }
    dispatch(reportActions.updatePeakTableParam({
      parentId,
      name: fieldName,
      checked,
    }));
  };

  
  const noiseEvalHandler = makeNoiseEvalHandler({
    handleCheckboxChange,
    parentId,
    dispatch,
  });

  const noiseData = useSelector((state) => selectNoiseEvalReportData(state, parentId));


  // preview modes
  const [pdfPreview, setPdfPreview] = useState(false);
  const [docxMode, setDocxMode] = useState(false);
  const [savePdfWithoutPreview, setSavePdfWithoutPreview] = useState(false);


  // single state for export/print in progress
  // null = nothing in progress, 'pdf' = PDF export, 'docx' = DOCX export, 'print' = direct print
  const [exporting, setExporting] = useState(null);

  const runExportSafe = useCallback(
    async (kind, exportFn) => {
      if (exporting) return; // block repeat calls globally
  
      try {
        setExporting(kind);
        await exportFn();
      } finally {
        setExporting(null);
      }
    },
    [exporting],
  );

  // A4 is derived state
  const a4Mode = pdfPreview || docxMode;

  const printReport = useElectronExportElementPDF();
  const exportDocx = useElectronExportDocx(tabName);

  const printDirect = useElectronPrintElementA4();

  const runWithAutoPrepare = useCallback(
    async (runner, requestedPreview) => {
      if (!api?.isActive && api) {
        api.setActive();
        await new Promise(requestAnimationFrame);
      }

      const prevMode = pdfPreview
        ? 'pdf'
        : docxMode
          ? 'docx'
          : 'none';

      // включаем нужный preview, если он задан
      if (requestedPreview === 'pdf') { // new
        setPdfPreview(true); // new
        setDocxMode(false); // new
      }

      if (requestedPreview === 'docx') { // new
        setDocxMode(true); // new
        setPdfPreview(false); // new
      }

      // если вообще не было A4 — даём DOM стабилизироваться
      if (!a4Mode && requestedPreview) { // new
        await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame);
      }

      await dispatch(waitForFreezeDone(parentId));

      await runner(printRef.current);

      // ВОССТАНАВЛИВАЕМ ИСХОДНЫЙ РЕЖИМ
      if (prevMode === 'none') {
        setPdfPreview(false);
        setDocxMode(false);
      } else if (prevMode === 'pdf') {
        setPdfPreview(true);
        setDocxMode(false);
      } else if (prevMode === 'docx') {
        setPdfPreview(false);
        setDocxMode(true);
      }
    },
    [a4Mode, api, dispatch, parentId, pdfPreview, docxMode],
  );

  const runExportDocxWithAutoPrepare = useCallback(
    async () => runWithAutoPrepare(exportDocx, 'docx'), // new
    [runWithAutoPrepare, exportDocx],
  );

  const runPrintDirectWithAutoPrepare = useCallback(
    async () => {
      await runWithAutoPrepare(printDirect, 'pdf');
    },
    [runWithAutoPrepare, printDirect],
  );

  const runExportPdfSafe = useCallback(
    () => runExportSafe('pdf', async () => {
      await runWithAutoPrepare(
        (el) => printReport(el, { mode: savePdfWithoutPreview ? 'save' : 'preview' }),
        'pdf'
      );
    }),
    [runExportSafe, runWithAutoPrepare, printReport, savePdfWithoutPreview]
  );

  const runExportDocxSafe = useCallback(
    () => runExportSafe('docx', runExportDocxWithAutoPrepare),
    [runExportSafe, runExportDocxWithAutoPrepare]
  );

  const runPrintSafe = useCallback(
    () => runExportSafe('print', runPrintDirectWithAutoPrepare),
    [runExportSafe, runPrintDirectWithAutoPrepare]
  );

  const runSmartExportSafe = useCallback(() => {
    if (pdfPreview) return runExportPdfSafe();
    if (docxMode) return runExportDocxSafe();
  }, [pdfPreview, docxMode, runExportPdfSafe, runExportDocxSafe]);

  useEffect(() => {
    const commandId = `report.export.pdf.${parentId}`;

    // регистрируем команду
    const unregister = printCommandRegistry.register(
      commandId,
      runExportPdfSafe,
    );

    return unregister; // React вызовет при размонтировании
  }, [runExportPdfSafe, parentId]);

  useEffect(() => {
    const commandId = `report.export.docx.${parentId}`;

    const unregister = printCommandRegistry.register(
      commandId,
      runExportDocxSafe,
    );

    return unregister;
  }, [runExportDocxSafe, parentId]);

  useEffect(() => {
    const commandId = `report.print.direct.${parentId}`;

    const unregister = printCommandRegistry.register(
      commandId,
      runPrintSafe,
    );

    return unregister;
  }, [runPrintSafe, parentId]);


  useEffect(() => {
    const shouldFreeze = a4Mode;

    dispatch(reportActions.setFreezePlots({
      parentId,
      freeze: shouldFreeze,
    }));

    /* console.log(
      shouldFreeze ? "preview freeze ON" : "preview freeze OFF",
      { a4Mode, docxMode }
    ); */
  }, [a4Mode, docxMode, parentId, dispatch]);

  return (
    <Container fluid style={{ height: '100%' }}>
      <Allotment vertical>
        <Allotment.Pane minSize={25} preferredSize={200}>
          <Row>
            <Col xs={8}>
              <CheckboxTable
                parentId={parentId}
                checkboxes={checkboxes}
                peakTableParams={peakTableParams}
                handleCheckboxChange={handleCheckboxChange}
                handlePeakTableCheckboxChange={handlePeakTableCheckboxChange}
                noiseEvalHandler={noiseEvalHandler}

                canShowRRT={canShowRRT}
                canShowPeakValley={canShowPeakValley}
              />
            </Col>
            <Col>
              <Stack gap={2}>
                {/* Toggle prepare/cancel */}
                <Button
                  size="sm"
                  variant={pdfPreview ? 'primary' : 'outline-primary'}
                  onClick={() => {
                    setDocxMode(false);
                    setPdfPreview((v) => !v);
                  }}
                >
                  {pdfPreview ? 'Скрыть PDF предпросмотр' : 'Сформировать данные для PDF экспорта'}
                </Button>

                <Button
                  size="sm"
                  variant={docxMode ? 'primary' : 'outline-primary'}
                  onClick={() => {
                    setDocxMode((v) => !v);
                    setPdfPreview(false);
                  }}
                >
                  {docxMode ? 'Скрыть DOCX предпросмотр' : 'Сформировать данные для DOCX экспорта'}
                </Button>

                <Button
                  size="sm"
                  variant={pdfPreview || docxMode ? 'primary' : 'outline-primary'}
                  onClick={runSmartExportSafe}
                  disabled={( !pdfPreview && !docxMode) || !!exporting}
                >
                  {exporting === 'pdf' 
                    ? 'Экспортируется PDF…' 
                    : exporting === 'docx' 
                      ? 'Экспортируется DOCX…' 
                      : 'Экспортировать'}
                </Button>

                {pdfPreview && (
                  <Form.Check
                    type="checkbox"
                    label="Сохранять без просмотра PDF"
                    checked={savePdfWithoutPreview}
                    onChange={(e) => setSavePdfWithoutPreview(e.target.checked)}
                  />
                )}

                <Button
                  size="sm"
                  variant="outline-primary"
                  onClick={runPrintSafe}
                  disabled={!!exporting}
                >
                  {exporting === 'print' ? 'Печать…' : 'Печать'}
                </Button>

              </Stack>
            </Col>
          </Row>
        </Allotment.Pane>
        <Allotment.Pane minSize={50}>
          <div
            ref={printRef}
            /* className={a4Mode ? `${stylesA4.a4Preview}` : ""}  */
            style={{
              ...(a4Mode && {
                width: '794px',
                /* minHeight: "1123px", */
                margin: '0 auto',
                background: 'white',
                boxSizing: 'border-box',
              }),
              height: '100%',
              overflowY: 'auto',
            }}
          >
            <ReportDetails
              checkboxes={checkboxes}
              peakTableParams={peakTableParams}
              passportData={passportData}
              parentId={parentId}
              chromatographData={chromatographData}
              noiseData={noiseData}
              docxMode={docxMode}
              calibMetaData={calibMetaData}
            />
          </div>
        </Allotment.Pane>
      </Allotment>

    </Container>
  );
}

export default ReportTab;
