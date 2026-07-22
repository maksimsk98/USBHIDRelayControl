const { createProxyMiddleware } = require('http-proxy-middleware');
const winston = require('winston');
const { format, transports } = require('winston');

const logger = winston.createLogger({
  format: format.combine(format.splat(), format.simple()),
  transports: [new transports.Console()],
});

const proxy = createProxyMiddleware({
  target: 'http://localhost:5000/api',
  changeOrigin: true,
  /* logger, */
  on: {
    /*     proxyReq: (proxyReq, req, res) => {
      logger.info('Proxying request to: %s', proxyReq.path);  // Manually log the proxied request path
    }, */
    proxyRes: (proxyRes, req, res) => {
      if (proxyRes.headers.connection) {
        proxyRes.headers.connection = 'keep-alive';
      }
      /* logger.info('Received response from backend with status: %s', proxyRes.statusCode);  */
    },
    error: (err, req, res) => {
      logger.error('Error occurred while proxying request: %s', err);
    },
  },
});

module.exports = function (app) {
  app.use(
    '/api', // Proxy all requests to the backend
    proxy,
  );
};
