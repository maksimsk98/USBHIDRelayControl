import Plotly from 'plotly.js-cartesian-dist'; // Use smaller bundle
import createPlotlyComponent from 'react-plotly.js/factory';
import ru from 'plotly.js-locales/ru';

Plotly.register(ru);

const Plot = createPlotlyComponent(Plotly);

export { Plotly, Plot };
