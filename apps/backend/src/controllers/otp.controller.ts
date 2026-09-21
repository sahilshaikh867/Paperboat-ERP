import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient, InvitationStatus, Role } from '@prisma/client';
import { sendEmail } from '../services/email/email.service';

const router = Router();
const prisma = new PrismaClient();

function issueJwt(user: { id: string; role: Role }) {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET as string,
    { expiresIn: '7d' }
  );
}

// 1. Request OTP (Supports Student Portal Login via Email OR Exam Invitation via Token)
router.post('/request', async (req: Request, res: Response) => {
  try {
    const { token, email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Registered email is required' });
    }

    const normEmail = String(email).trim().toLowerCase();

    // ==========================================
    // CASE A: Student Portal Login (Email Only)
    // ==========================================
    if (!token) {
      // 1. Check if student is registered in PostgreSQL database
      const user = await prisma.user.findUnique({
        where: { email: normEmail },
        include: { organization: true },
      });

      if (!user) {
        return res.status(404).json({
          error: 'This email is not registered in ExamForge. Please contact your college administrator to create your account.',
        });
      }

      if (user.isActive === false) {
        return res.status(403).json({
          error: 'Your student account is currently deactivated. Please contact your administrator.',
        });
      }

      // 2. Cooldown check (60 seconds)
      const latestActive = await prisma.studentOtpVerification.findFirst({
        where: {
          email: normEmail,
          isUsed: false,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (latestActive && new Date() < latestActive.resendAfter) {
        const waitSeconds = Math.ceil((latestActive.resendAfter.getTime() - Date.now()) / 1000);
        return res.status(429).json({
          error: `Please wait ${waitSeconds} seconds before requesting a new OTP code.`,
        });
      }

      // 3. Generate 6-digit OTP
      const rawOtp = String(crypto.randomInt(100000, 999999));
      const otpHash = await bcrypt.hash(rawOtp, 10);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
      const resendAfter = new Date(Date.now() + 60 * 1000); // 60s cooldown

      // Invalidate previous unused codes
      await prisma.studentOtpVerification.updateMany({
        where: { email: normEmail, isUsed: false },
        data: { isUsed: true },
      });

      // Create new OTP record
      await prisma.studentOtpVerification.create({
        data: {
          email: normEmail,
          userId: user.id,
          otpHash,
          expiresAt,
          resendAfter,
          attemptsCount: 0,
          maxAttempts: 5,
          isUsed: false,
        },
      });

      // Check if student has an active exam invitation
      const latestInvitation = await prisma.testInvitation.findFirst({
        where: { candidateEmail: normEmail },
        include: { test: true },
        orderBy: { createdAt: 'desc' },
      });

      // 4. Send OTP strictly to the student's registered email using Student Resend Key
      await sendEmail({
        recipient: normEmail,
        template: 'candidate_otp',
        data: {
          otp: rawOtp,
          testTitle: latestInvitation?.test?.title || 'ExamForge Student Academic Portal',
          candidateName: user.fullName || 'Student',
          validMinutes: 10,
        },
        organizationId: user.organizationId,
        roleContext: 'CANDIDATE',
      });

      return res.json({
        success: true,
        message: `A 6-digit verification code has been dispatched to ${normEmail}.`,
        previewOtp: process.env.NODE_ENV !== 'production' ? rawOtp : undefined,
        examSecretCode: latestInvitation?.test?.accessCode || undefined,
        examTitle: latestInvitation?.test?.title || undefined,
      });
    }

    // ==========================================
    // CASE B: Exam Invitation Access (Token + Email)
    // ==========================================
    const cleanToken = String(token).trim();

    const invitation = await prisma.testInvitation.findUnique({
      where: { invitationToken: cleanToken },
      include: { test: true, candidate: true },
    });

    if (!invitation) {
      return res.status(404).json({ error: 'Invalid or expired invitation token' });
    }

    if (invitation.candidateEmail.toLowerCase() !== normEmail) {
      return res.status(403).json({ error: 'The email provided does not match the registered candidate for this invitation' });
    }

    if (invitation.status === InvitationStatus.COMPLETED) {
      return res.status(403).json({ error: 'You have already completed this exam' });
    }

    if (new Date() > invitation.expiresAt) {
      return res.status(410).json({ error: 'This exam invitation has expired' });
    }

    const recentOtps = await prisma.otpRequest.count({
      where: {
        invitationId: invitation.id,
        createdAt: { gte: new Date(Date.now() - 2 * 60 * 1000) },
      },
    });

    if (recentOtps >= 3) {
      return res.status(429).json({ error: 'Too many OTP requests. Please wait a minute before requesting another code.' });
    }

    const rawOtp = String(crypto.randomInt(100000, 999999));
    const otpHash = await bcrypt.hash(rawOtp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.otpRequest.create({
      data: {
        invitationId: invitation.id,
        candidateEmail: normEmail,
        otpHash,
        expiresAt,
      },
    });

    if (invitation.status === InvitationStatus.INVITED || invitation.status === InvitationStatus.EMAIL_SENT) {
      await prisma.testInvitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.OPENED, openedAt: new Date() },
      });
    }

    await sendEmail({
      recipient: normEmail,
      template: 'candidate_otp',
      data: {
        otp: rawOtp,
        testTitle: invitation.test.title,
        validMinutes: 10,
      },
      organizationId: invitation.test.organizationId,
      roleContext: 'CANDIDATE',
    });

    return res.json({
      success: true,
      message: `A 6-digit verification code has been sent to ${normEmail}.`,
      otp: process.env.NODE_ENV !== 'production' ? rawOtp : undefined,
      previewOtp: process.env.NODE_ENV !== 'production' ? rawOtp : undefined,
    });
  } catch (err: any) {
    console.error('[OTP REQUEST ERROR]', err);
    return res.status(500).json({ error: err.message });
  }
});

// 2. Verify OTP (Supports Student Portal Login OR Exam Invitation Access)
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { token, email, otp, otpCode } = req.body;
    const cleanOtp = String(otp || otpCode || '').trim();

    if (!email || !cleanOtp) {
      return res.status(400).json({ error: 'Registered email and 6-digit OTP are required' });
    }

    const normEmail = String(email).trim().toLowerCase();

    // ==========================================
    // CASE A: Student Portal Login Verification
    // ==========================================
    if (!token) {
      const user = await prisma.user.findUnique({
        where: { email: normEmail },
        include: { organization: true },
      });

      if (!user) {
        return res.status(404).json({ error: 'User account not found' });
      }

      const latestOtp = await prisma.studentOtpVerification.findFirst({
        where: {
          email: normEmail,
          isUsed: false,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!latestOtp) {
        return res.status(400).json({
          error: 'No active verification code found or code has expired. Please request a new code.',
        });
      }

      if (latestOtp.attemptsCount >= latestOtp.maxAttempts) {
        return res.status(429).json({
          error: 'Maximum verification attempts exceeded. Please request a new OTP code.',
        });
      }

      const isValid = await bcrypt.compare(cleanOtp, latestOtp.otpHash);
      if (!isValid) {
        await prisma.studentOtpVerification.update({
          where: { id: latestOtp.id },
          data: { attemptsCount: latestOtp.attemptsCount + 1 },
        });
        const remaining = latestOtp.maxAttempts - (latestOtp.attemptsCount + 1);
        return res.status(400).json({ error: `Invalid verification code. ${remaining} attempt(s) remaining.` });
      }

      // Mark OTP as used and student email as verified
      await prisma.$transaction([
        prisma.studentOtpVerification.update({
          where: { id: latestOtp.id },
          data: { isUsed: true },
        }),
        prisma.user.update({
          where: { id: user.id },
          data: { isEmailVerified: true },
        }),
      ]);

      const sessionToken = issueJwt(user);

      return res.json({
        success: true,
        message: 'Student identity verified successfully! Launching portal...',
        token: sessionToken,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          isEmailVerified: true,
          organization: user.organization,
        },
      });
    }

    // ==========================================
    // CASE B: Exam Invitation Verification (Token + OTP)
    // ==========================================
    const cleanToken = String(token).trim();

    const invitation = await prisma.testInvitation.findUnique({
      where: { invitationToken: cleanToken },
      include: { test: true },
    });

    if (!invitation) {
      return res.status(404).json({ error: 'Invalid invitation token' });
    }

    if (invitation.candidateEmail.toLowerCase() !== normEmail) {
      return res.status(403).json({ error: 'Email mismatch' });
    }

    const latestOtp = await prisma.otpRequest.findFirst({
      where: {
        invitationId: invitation.id,
        candidateEmail: normEmail,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestOtp) {
      return res.status(400).json({ error: 'No active verification code found or code has expired. Please request a new code.' });
    }

    if (latestOtp.attemptsCount >= latestOtp.maxAttempts) {
      return res.status(429).json({ error: 'Maximum verification attempts exceeded. Please request a new OTP code.' });
    }

    const isValid = await bcrypt.compare(cleanOtp, latestOtp.otpHash);
    if (!isValid) {
      await prisma.otpRequest.update({
        where: { id: latestOtp.id },
        data: { attemptsCount: latestOtp.attemptsCount + 1 },
      });
      const remaining = latestOtp.maxAttempts - (latestOtp.attemptsCount + 1);
      return res.status(400).json({ error: `Invalid verification code. ${remaining} attempts remaining.` });
    }

    await prisma.$transaction([
      prisma.otpRequest.update({
        where: { id: latestOtp.id },
        data: { isUsed: true },
      }),
      prisma.testInvitation.update({
        where: { id: invitation.id },
        data: {
          status: InvitationStatus.OTP_VERIFIED,
          otpVerifiedAt: new Date(),
        },
      }),
    ]);

    return res.json({
      success: true,
      message: 'Identity verified successfully! You may now review exam instructions and start.',
      test: {
        id: invitation.test.id,
        title: invitation.test.title,
        description: invitation.test.description,
        durationMins: invitation.test.durationMins,
        startDate: invitation.test.startDate,
        endDate: invitation.test.endDate,
        requiresAccessCode: !!invitation.test.accessCode,
      },
    });
  } catch (err: any) {
    console.error('[OTP VERIFY ERROR]', err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
