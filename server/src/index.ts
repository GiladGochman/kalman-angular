import express from 'express';
import cors from 'cors';
import { config } from './config';
import pdfRoutes from './routes/pdf.routes';

const app = express();

app.use(cors({ origin: 'http://localhost:4200' }));
app.use(express.json());

app.use('/api', pdfRoutes);

app.listen(config.port, () => {
  console.log(`Kalman PDF server running on http://localhost:${config.port}`);
  console.log(`Serving PDF: ${config.pdfPath}`);
});
