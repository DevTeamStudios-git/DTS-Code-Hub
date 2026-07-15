import './config.js';
import express from 'express';
import cors from 'cors';
import authRoutes          from './routes/auth.js';
import usersRoutes         from './routes/users.js';
import sshKeysRoutes       from './routes/sshKeys.js';
import gpgKeysRoutes       from './routes/gpgKeys.js';
import patRoutes           from './routes/pat.js';
import twoFactorRoutes     from './routes/twoFactor.js';
import contributionsRoutes from './routes/contributions.js';
import achievementsRoutes  from './routes/achievements.js';
import reposRoutes         from './routes/repos.js';
import gitRoutes           from './routes/git.js';
import branchesRoutes      from './routes/branches.js';
import commitsRoutes       from './routes/commits.js';
import filesRoutes         from './routes/files.js';
import compareRoutes       from './routes/compare.js';

const app  = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    const url = process.env.WEB_URL ?? 'http://localhost:5173';
    if (url.split(',').some(o => origin.startsWith(o.trim().replace(/\/$/, '')))) {
      cb(null, true);
    } else {
      cb(null, origin);
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '55mb' }));

// Raw body for git Smart HTTP
app.use((req, res, next) => {
  if (req.path.includes('.git/') && ['POST', 'PUT'].includes(req.method)) {
    express.raw({ type: '*/*', limit: '500mb' })(req, res, next);
  } else {
    next();
  }
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'dts-code-hub-api', version: '4.0.0' });
});

app.use('/api/auth',                              authRoutes);
app.use('/api/users',                             usersRoutes);
app.use('/api/ssh-keys',                          sshKeysRoutes);
app.use('/api/gpg-keys',                          gpgKeysRoutes);
app.use('/api/pat',                               patRoutes);
app.use('/api/2fa',                               twoFactorRoutes);
app.use('/api/contributions',                     contributionsRoutes);
app.use('/api/achievements',                      achievementsRoutes);
app.use('/api/repos',                             reposRoutes);

// Repo-scoped sub-routes (order matters — more specific first)
app.use('/api/repos/:username/:repo/branches',    branchesRoutes);
app.use('/api/repos/:username/:repo/commits',     commitsRoutes);
app.use('/api/repos/:username/:repo/compare',     compareRoutes);
app.use('/api/repos/:username/:repo',             filesRoutes);

// Git Smart HTTP at root
app.use('/', gitRoutes);

app.listen(PORT, () => console.log(`DTS Code Hub API running on port ${PORT}`));
