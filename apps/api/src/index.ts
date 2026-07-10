import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'dts-code-hub-api' });
});

app.use('/api/auth', authRoutes);

app.listen(PORT, () => {
  console.log(`DTS Code Hub API running on port ${PORT}`);
});
