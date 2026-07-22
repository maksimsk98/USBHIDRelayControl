import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

pdfMake.vfs = pdfFonts.pdfMake.vfs;

const generatePDFBlob = async (checkboxes, peakTableParams, passportData, stepsData, plotImagePromise, peaksData) => {
  const marginSize = 2; // Define the margin size here

  const content = [];

  // Adding a header
  content.push({ text: 'Отчет', style: 'header', alignment: 'center' });

  // Conditionally adding text for 'Проба'
  if (checkboxes.sample) {
    content.push({
      text: [
        { text: 'Проба: ', style: 'boldText' },
        { text: passportData.sampleName, style: 'normalText' },
        { text: passportData.extendedName, style: 'normalText' },
      ],
    });
    content.push({
      text: [
        { text: 'Объем: ', style: 'normalText' },
        { text: `${passportData.volume} мкл`, style: 'normalText' },
      ],
      margin: [0, marginSize, 0, 0],
    });
  }

  // Conditionally adding comments
  if (checkboxes.comment) {
    content.push({
      text: [
        { text: 'Комментарий: ', style: 'boldText' },
        { text: passportData.comment, style: 'normalText' },
      ],
      margin: [0, marginSize, 0, 0],
    });
  }

  // Conditionally adding column information
  if (checkboxes.column) {
    content.push({
      columns: [
        {
          text: [
            { text: 'Колонка: ', style: 'boldText' },
            { text: `№ ${passportData.columnNum}`, style: 'normalText' },
          ],
        },
        {
          text: [
            { text: 'Длина: ', style: 'normalText' },
            { text: `${passportData.length} мм`, style: 'normalText' },
          ],
        },
        {
          text: [
            { text: 'Диаметр: ', style: 'normalText' },
            { text: `${passportData.diameter} мм`, style: 'normalText' },
          ],
        },
      ],
      margin: [0, marginSize, 0, 0],
    });

    content.push({
      columns: [
        {
          text: [
            { text: 'Сорбент: ', style: 'normalText' },
            { text: passportData.sorbent, style: 'normalText' },
          ],
        },
        {
          text: [
            { text: 'Размер зерна: ', style: 'normalText' },
            { text: `${passportData.particleSize} мкм`, style: 'normalText' },
          ],
        },
        {
          // Placeholder to keep column structure
        },
      ],
      margin: [0, marginSize, 0, 0],
    });
  }

  // Adding eluent information
  if (checkboxes.eluent) {
    content.push({
      text: [
        { text: 'Элюент A: ', style: 'boldText' },
        { text: passportData.eluentA, style: 'normalText' },
      ],
      margin: [0, marginSize, 0, 0],
    });
    content.push({
      text: [
        { text: 'Элюент B: ', style: 'boldText' },
        { text: passportData.eluentB, style: 'normalText' },
      ],
      margin: [0, marginSize, 0, 0],
    });

    content.push({
      columns: [
        {
          text: [
            { text: 'Поток: ', style: 'normalText' },
            { text: `${passportData.flow} мкл/мин`, style: 'normalText' },
          ],
        },
        {
          text: [
            { text: 'Давление: ', style: 'normalText' },
            { text: `${passportData.pressure} MПa`, style: 'normalText' },
          ],
        },
        {
          text: [
            { text: 'Температура: ', style: 'normalText' },
            { text: `${passportData.temperature} °C`, style: 'normalText' },
          ],
        },
      ],
      margin: [0, marginSize, 0, 0],
    });
  }

  // Adding the chromatogram plot image if selected
  if (checkboxes.chromatogram) {
    const plotImage = await plotImagePromise;
    if (plotImage) {
      content.push({
        image: plotImage,
        width: 500,
        alignment: 'center',
        margin: [0, marginSize, 0, marginSize],
      });
    }
  }

  if (checkboxes.detectorProgram) {
    const tableBody = [];

    // Add table headers
    tableBody.push([
      { text: 'Этап', style: 'tableHeader' },
      { text: 'От', style: 'tableHeader' },
      { text: 'До', style: 'tableHeader' },
      { text: 'Компонент', style: 'tableHeader' },
      { text: 'λ', style: 'tableHeader' },
    ]);

    // Add table rows
    stepsData.forEach((step, index) => {
      tableBody.push([
        { text: (index + 1).toString(), style: 'normalText' },
        { text: step.from, style: 'normalText' },
        { text: step.to, style: 'normalText' },
        { text: step.component, style: 'normalText' },
        { text: step.lambda, style: 'normalText' },
      ]);
    });

    // Push the table to the content array
    content.push({
      text: 'Программа измерений',
      style: 'boldText',
      margin: [0, marginSize, 0, marginSize],
    });

    content.push({
      table: {
        headerRows: 1,
        widths: ['auto', 'auto', 'auto', 'auto', 'auto'],
        body: tableBody,
      },
      margin: [0, marginSize, 0, marginSize],
    });
  }

  if (checkboxes.peakTable) {
    const tableBody = [];

    // Add table headers conditionally based on peakTableParams
    const tableHeaders = [];
    if (peakTableParams.number) tableHeaders.push({ text: 'Пик', style: 'peakTableHeader' });
    if (peakTableParams.exitTime) tableHeaders.push({ text: 'Время', style: 'peakTableHeader' });
    if (peakTableParams.height) tableHeaders.push({ text: 'Высота', style: 'peakTableHeader' });
    if (peakTableParams.halfWidth) tableHeaders.push({ text: 'Полушир.', style: 'peakTableHeader' });
    if (peakTableParams.area) tableHeaders.push({ text: 'Площадь', style: 'peakTableHeader' });
    if (peakTableParams.componentName) tableHeaders.push({ text: 'Комп.', style: 'peakTableHeader' });
    if (peakTableParams.concentration) tableHeaders.push({ text: 'Конц.', style: 'peakTableHeader' });
    if (peakTableParams.asymmetry) tableHeaders.push({ text: 'Асим.', style: 'peakTableHeader' });
    if (peakTableParams.efficiency) tableHeaders.push({ text: 'Эффект.', style: 'peakTableHeader' });
    if (peakTableParams.resolution) tableHeaders.push({ text: 'Разреш.', style: 'peakTableHeader' });
    if (peakTableParams.relativeTime) tableHeaders.push({ text: 'Отн. время', style: 'peakTableHeader' });
    if (peakTableParams.peakValley) tableHeaders.push({ text: 'Пик-долина', style: 'peakTableHeader' });

    tableBody.push(tableHeaders);

    // Add table rows conditionally based on peakTableParams
    peaksData.forEach((peak) => {
      const row = [];
      if (peakTableParams.number) row.push({ text: peak.peakNumber, style: 'peakTableText' });
      if (peakTableParams.exitTime) row.push({ text: peak.time, style: 'peakTableText' });
      if (peakTableParams.height) row.push({ text: peak.height, style: 'peakTableText' });
      if (peakTableParams.halfWidth) row.push({ text: peak.halfwidth, style: 'peakTableText' });
      if (peakTableParams.area) row.push({ text: peak.area, style: 'peakTableText' });
      if (peakTableParams.componentName) row.push({ text: peak.component, style: 'peakTableText' });
      if (peakTableParams.concentration) row.push({ text: peak.concentration, style: 'peakTableText' });
      if (peakTableParams.asymmetry) row.push({ text: peak.asymmetry, style: 'peakTableText' });
      if (peakTableParams.efficiency) row.push({ text: peak.efficiency, style: 'peakTableText' });
      if (peakTableParams.resolution) row.push({ text: peak.resolution, style: 'peakTableText' });
      if (peakTableParams.relativeTime) row.push({ text: peak.relativeTime, style: 'peakTableText' });
      if (peakTableParams.peakValley) row.push({ text: peak.peakValley, style: 'peakTableText' });

      tableBody.push(row);
    });

    // Push the peak table to the content array
    content.push({
      text: 'Таблица пиков',
      style: 'boldText',
      margin: [0, marginSize, 0, marginSize],
    });

    content.push({
      table: {
        headerRows: 1,
        widths: Array(tableHeaders.length).fill('auto'), // Dynamically set widths based on number of columns
        body: tableBody,
      },
      margin: [0, 0, 0, 0],
    });
  }

  const docDefinition = {
    content,
    styles: {
      header: { fontSize: 12, bold: true },
      boldText: { fontSize: 10, bold: true },
      normalText: { fontSize: 10 },
      tableHeader: { fontSize: 10, bold: true },
      peakTableHeader: { fontSize: 8, bold: true }, // New style for peak table headers
      peakTableText: { fontSize: 8 }, // New style for peak table text
    },
  };

  // Generate the PDF blob and return it
  return new Promise((resolve, reject) => {
    pdfMake.createPdf(docDefinition).getBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to create PDF'));
      }
    });
  });
};

export default generatePDFBlob;
