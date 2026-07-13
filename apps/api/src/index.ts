import './config.js';

import express from 'express';
import cors from 'cors';
import authRoutes         from './routes/auth.js';
import usersRoutes        from './routes/users.js';
import sshKeysRoutes      from './routes/sshKeys.js';
import gpgKeysRoutes      from './routes/gpgKeys.js';
import patRoutes          from './routes/pat.js';
import twoFactorRoutes    from './routes/twoFactor.js';
import contributionsRoutes from './routes/contributions.js';
import achievementsRoutes from './routes/achievements.js';
import reposRoutes        from './routes/repos.js';
import gitRoutes          from './routes/git.js';
import branchesRoutes     from './routes/branches.js';
import commitsRoutes      from './routes/commits.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.WEB_URL ?? 'http://localhost:5173',
  credentials: true,
}));

// Larger body limit for zip uploads
app.use(express.json({ limit: '55mb' }));

// Raw body passthrough for git Smart HTTP (must come before json middleware for these routes)
app.use((req, res, next) => {
  const isGitRoute = req.path.includes('.git/');
  if (isGitRoute && ['POST', 'PUT'].includes(req.method)) {
    express.raw({ type: '*/*', limit: '500mb' })(req, res, next);
  } else {
    next();
  }
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'dts-code-hub-api', version: '3.0.0' });
});

// API routes
app.use('/api/auth',          authRoutes);
app.use('/api/users',         usersRoutes);
app.use('/api/ssh-keys',      sshKeysRoutes);
app.use('/api/gpg-keys',      gpgKeysRoutes);
app.use('/api/pat',           patRoutes);
app.use('/api/2fa',           twoFactorRoutes);
app.use('/api/contributions', contributionsRoutes);
app.use('/api/achievements',  achievementsRoutes);
app.use('/api/repos',         reposRoutes);

// Repo-scoped sub-routes
app.use('/api/repos/:username/:repo/branches', branchesRoutes);
app.use('/api/repos/:username/:repo/commits',  commitsRoutes);

// Git Smart HTTP — served at root so real git clients hit /:username/:repo.git/...
app.use('/', gitRoutes);

app.listen(PORT, () => {
  console.log(`DTS Code Hub API running on port ${PORT}`);
});
