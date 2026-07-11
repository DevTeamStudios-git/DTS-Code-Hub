import { Router } from 'express';
import { TOTP, generateURI } from 'otplib';
import { randomBytes } from 'crypto';
import QRCode from 'qrcode';
import { authMiddleware } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';

const router = Router();
const totp = new TOTP();

function generateBackupCodes(count = 8): string[] {
  return Array.from({ length: count }, () =>
    randomBytes(4).toString('hex').toUpperCase().match(/.{4}/g)!.join('-')
  );
}

// POST /api/2fa/setup — generate secret + QR code
router.post('/setup', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { email: true },
    });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }

    await prisma.twoFactorSecret.deleteMany({
      where: { userId: req.user!.userId, verified: false },
    });

    const secret = totp.generateSecret();
    const otpauth = generateURI({ secret, label: user.email, issuer: 'DTS Code Hub', algorithm: 'sha1', digits: 6, period: 30 });
    const qrCodeUrl = await QRCode.toDataURL(otpauth);

    await prisma.twoFactorSecret.create({
      data: { userId: req.user!.userId, secret, verified: false, backupCodes: [] },
    });

    res.json({ secret, qrCodeUrl });
  } catch (err) {
    console.error('2FA setup error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/2fa/verify — verify TOTP and activate 2FA
router.post('/verify', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { code } = req.body as { code: string };
    if (!code) { res.status(400).json({ error: 'Verification code is required' }); return; }

    const twoFactor = await prisma.twoFactorSecret.findUnique({ where: { userId: req.user!.userId } });
    if (!twoFactor) { res.status(400).json({ error: '2FA setup not initiated' }); return; }

    const isValid = totp.verify(code, twoFactor.secret);
    if (!isValid) { res.status(400).json({ error: 'Invalid verification code' }); return; }

    const backupCodes = generateBackupCodes();
    await prisma.twoFactorSecret.update({
      where: { userId: req.user!.userId },
      data: { verified: true, backupCodes },
    });

    res.json({ message: '2FA enabled successfully', backupCodes });
  } catch (err) {
    console.error('2FA verify error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/2fa/verify-session — verify TOTP during login
router.post('/verify-session', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { code } = req.body as { code: string };
    if (!code) { res.status(400).json({ error: 'Verification code is required' }); return; }

    const twoFactor = await prisma.twoFactorSecret.findUnique({ where: { userId: req.user!.userId } });
    if (!twoFactor?.verified) { res.status(400).json({ error: '2FA not enabled' }); return; }

    const isValidTOTP = totp.verify(code, twoFactor.secret);
    const isBackupCode = !isValidTOTP && twoFactor.backupCodes.includes(code);

    if (!isValidTOTP && !isBackupCode) { res.status(400).json({ error: 'Invalid code' }); return; }

    if (isBackupCode) {
      await prisma.twoFactorSecret.update({
        where: { userId: req.user!.userId },
        data: { backupCodes: twoFactor.backupCodes.filter((c: string) => c !== code) },
      });
    }

    res.json({ verified: true });
  } catch (err) {
    console.error('2FA session verify error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/2fa/disable
router.post('/disable', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { code } = req.body as { code: string };
    if (!code) { res.status(400).json({ error: 'Current 2FA code is required to disable' }); return; }

    const twoFactor = await prisma.twoFactorSecret.findUnique({ where: { userId: req.user!.userId } });
    if (!twoFactor?.verified) { res.status(400).json({ error: '2FA is not enabled' }); return; }

    const isValid = totp.verify(code, twoFactor.secret);
    if (!isValid) { res.status(400).json({ error: 'Invalid code' }); return; }

    await prisma.twoFactorSecret.delete({ where: { userId: req.user!.userId } });
    res.json({ message: '2FA disabled' });
  } catch (err) {
    console.error('2FA disable error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/2fa/status
router.get('/status', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const twoFactor = await prisma.twoFactorSecret.findUnique({
      where: { userId: req.user!.userId },
      select: { verified: true, backupCodes: true },
    });
    res.json({
      enabled: !!twoFactor?.verified,
      backupCodesRemaining: twoFactor?.backupCodes.length ?? 0,
    });
  } catch (err) {
    console.error('2FA status error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
