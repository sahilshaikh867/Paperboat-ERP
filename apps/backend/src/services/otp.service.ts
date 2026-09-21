import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { EmailService } from './email.service';

const prisma = new PrismaClient();

export class OTPService {
  /**
   * Generates and dispatches a 6-digit verification code to student email
   */
  static async sendStudentVerificationOTP(email: string, userId?: string, isLogin: boolean = true) {
    const normEmail = email.trim().toLowerCase();

    // Check user exists
    let user = null;
    if (userId) {
      user = await prisma.user.findUnique({ where: { id: userId } });
    } else {
      user = await prisma.user.findUnique({ where: { email: normEmail } });
    }

    if (!user) {
      throw new Error('This email is not registered in ExamForge. Please contact your college administrator.');
    }

    if (!isLogin && user.isEmailVerified) {
      return {
        alreadyVerified: true,
        message: 'This email is already verified.',
      };
    }

    // Check recent active OTP to enforce 60-second resend cooldown
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
      throw new Error(`Please wait ${waitSeconds} seconds before requesting a new verification code.`);
    }

    // Generate secure 6-digit OTP
    const rawOtp = String(crypto.randomInt(100000, 999999));
    const otpHash = await bcrypt.hash(rawOtp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    const resendAfter = new Date(Date.now() + 60 * 1000); // 60s cooldown

    // Invalidate previous unused codes
    await prisma.studentOtpVerification.updateMany({
      where: { email: normEmail, isUsed: false },
      data: { isUsed: true },
    });

    // Store secure hashed verification record
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

    // Dispatch email via centralized service
    await EmailService.sendVerificationOTP(
      normEmail,
      rawOtp,
      user.fullName || 'Student',
      user.organizationId || undefined
    );

    return {
      success: true,
      message: `A 6-digit verification code has been dispatched to ${normEmail}.`,
      expiresAt,
      // For development convenience only
      devOtp: process.env.NODE_ENV !== 'production' ? rawOtp : undefined,
    };
  }

  /**
   * Verifies the 6-digit OTP code against bcrypt hash with attempt limits
   */
  static async verifyStudentOTP(email: string, otp: string) {
    const normEmail = email.trim().toLowerCase();
    const cleanOtp = String(otp).trim();

    if (!cleanOtp || cleanOtp.length !== 6) {
      throw new Error('Please enter a valid 6-digit verification code.');
    }

    const verificationRecord = await prisma.studentOtpVerification.findFirst({
      where: {
        email: normEmail,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!verificationRecord) {
      throw new Error('Verification code has expired or was not requested. Please request a new code.');
    }

    if (verificationRecord.attemptsCount >= verificationRecord.maxAttempts) {
      await prisma.studentOtpVerification.update({
        where: { id: verificationRecord.id },
        data: { isUsed: true },
      });
      throw new Error('Maximum verification attempts exceeded. Please request a new code.');
    }

    // Verify hash
    const isValid = await bcrypt.compare(cleanOtp, verificationRecord.otpHash);
    if (!isValid) {
      const nextAttempt = verificationRecord.attemptsCount + 1;
      await prisma.studentOtpVerification.update({
        where: { id: verificationRecord.id },
        data: { attemptsCount: nextAttempt },
      });
      const remaining = verificationRecord.maxAttempts - nextAttempt;
      throw new Error(`Invalid code. ${remaining} attempt(s) remaining.`);
    }

    // Invalidate record and mark student as verified
    await prisma.$transaction([
      prisma.studentOtpVerification.update({
        where: { id: verificationRecord.id },
        data: { isUsed: true },
      }),
      prisma.user.update({
        where: { email: normEmail },
        data: { isEmailVerified: true },
      }),
    ]);

    return {
      success: true,
      message: 'Email address successfully verified. Student dashboard unlocked.',
    };
  }
}
