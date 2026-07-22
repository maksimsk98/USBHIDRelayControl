const generateReportText = (passportData, checkboxes) => {
  const lines = [];

  if (checkboxes.sample) {
    lines.push(`Проба: ${passportData.sampleName}`);
    lines.push(`Объем: ${passportData.volume} мкл`);
    lines.push(''); // Adds an empty line for spacing
  }
  if (checkboxes.comment) {
    lines.push(`Комментарий: ${passportData.comment}`);
    lines.push(''); // Adds an empty line for spacing
  }
  if (checkboxes.column) {
    lines.push(`Колонка: № ${passportData.columnNumber}`);
    lines.push(`Длина: ${passportData.length} мм`);
    lines.push(`Диаметр: ${passportData.diameter} мм`);
    lines.push(`Сорбент: ${passportData.sorbent}`);
    lines.push(`Размер зерна: ${passportData.particleSize} мкм`);
    lines.push(''); // Adds an empty line for spacing
  }
  if (checkboxes.eluent) {
    lines.push(`Элюент A: ${passportData.eluentA}`);
    lines.push(`Элюент B: ${passportData.eluentB}`);
    lines.push(`Поток: ${passportData.flowRate} мкл/мин`);
    lines.push(`Давление: ${passportData.pressure} МПа`);
    lines.push(`Температура: ${passportData.temperature} °C`);
    lines.push(''); // Adds an empty line for spacing
  }

  return lines;
};

export default generateReportText;
