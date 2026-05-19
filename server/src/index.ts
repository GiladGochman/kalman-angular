import express from 'express';
import cors from 'cors';
import { config } from './config';
import pdfRoutes from './routes/pdf.routes';

const app = express();

const allowedOrigins = process.env['CORS_ORIGIN']
  ? process.env['CORS_ORIGIN'].split(',')
  : ['http://localhost:4200'];
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.use('/api', pdfRoutes);

app.listen(config.port, () => {
  console.log(`Kalman PDF server running on http://localhost:${config.port}`);
  console.log(`Serving PDF: ${config.pdfPath}`);
});
