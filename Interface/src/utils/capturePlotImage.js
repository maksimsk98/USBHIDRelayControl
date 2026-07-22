import { Plotly } from './setupPlotly';

const capturePlotImage = async (plot) => {
  if (plot) {
    try {
      const plotElement = plot.el;
      // Get the current width and height of the plot element
      const rect = plotElement.getBoundingClientRect();
      const currentWidth = rect.width;
      const currentHeight = rect.height;

      // Capture the image with the current dimensions
      const imageData = await Plotly.toImage(plotElement, {
        format: 'png',
        scale: 5,
        width: currentWidth,
        height: currentHeight,
      });

      return imageData; // Base64 encoded image data
    } catch (error) {
      console.error('Error capturing plot image:', error);
      return null;
    }
  } else {
    console.error('Plot reference is not valid');
    return null;
  }
};

export default capturePlotImage;
