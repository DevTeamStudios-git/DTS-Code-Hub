import './config.js';

import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import sshKeysRoutes from './routes/sshKeys.js';
import gpgKeysRoutes from './routes/gpgKeys.js';
import patRoutes from './routes/pat.js';
import twoFactorRoutes from './routes/twoFactor.js';
import contributionsRoutes from './routes/contributions.js';
import achievementsRoutes from './routes/achievements.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.WEB_URL ?? 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'dts-code-hub-api', version: '1.0.0' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/ssh-keys', sshKeysRoutes);
app.use('/api/gpg-keys', gpgKeysRoutes);
app.use('/api/pat', patRoutes);
app.use('/api/2fa', twoFactorRoutes);
app.use('/api/contributions', contributionsRoutes);
app.use('/api/achievements', achievementsRoutes);

app.listen(PORT, () => {
  console.log(`DTS Code Hub API running on port ${PORT}`);
});
