export const parsePathD = (pathElem) => {
  const d = pathElem.getAttribute('d');
  const regex = /([ML])([\d.]+),([\d.]+)/g;

  const commands = [];
  let match;
  while ((match = regex.exec(d)) !== null) {
    commands.push({
      command: match[1],
      x: parseFloat(match[2]),
      y: parseFloat(match[3]),
    });
  }
  return commands;
};

export const borderLocPairMap = {
  leftBorder: 'rightBorder',
  rightBorder: 'leftBorder',
  left: 'right',
  right: 'left',
};

export const getNewContourD = ({
  newContourYCoord, newSVGX, contourElem, borderLoc, convertersRef, reversed = false,
}) => {
  const contourCommands = parsePathD(contourElem);
  const newYContourPixel = convertersRef.current.yToPixel(newContourYCoord);
  const newYContourSVG = convertersRef.current.yPixelToSVG(newYContourPixel);

  let newD = null;
  const effectiveBorderLoc = reversed ? borderLocPairMap[borderLoc] : borderLoc;

  console.log('D', contourCommands, effectiveBorderLoc);
  if (!contourCommands) return newD;

  const isLeftValidCommands = contourCommands[1]?.x != null && contourCommands[1]?.y != null;
  const isRightVaildCommands = contourCommands[0]?.x != null && contourCommands[0]?.y != null;

  if (!isLeftValidCommands || !isRightVaildCommands) {
    console.error('Invalid D parsing of contour');
    return null; // TODO WATCHLIST let contours fail and disappear but save from crash for now
  }

  if (effectiveBorderLoc === 'leftBorder' && isLeftValidCommands) {
    newD = `M${newSVGX},${newYContourSVG}L${contourCommands[1].x},${contourCommands[1].y}`;
  } else if (effectiveBorderLoc === 'rightBorder' && isRightVaildCommands) {
    newD = `M${contourCommands[0].x},${contourCommands[0].y}L${newSVGX},${newYContourSVG}`;
  }
  return newD;
};