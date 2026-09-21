import { Router, Request, Response } from 'express';
import { PrismaClient, TestStatus, InvitationStatus, SessionStatus } from '@prisma/client';
import { sendEmail } from '../services/email/email.service';

const router = Router();
const prisma = new PrismaClient();

// 1. Get Public Invitation Details & Pre-flight Status
router.get('/invitation/:token', async (req: Request, res: Response) => {
  try {
    const token = String(req.params.token).trim();
    const invitation = await prisma.testInvitation.findUnique({
      where: { invitationToken: token },
      include: {
        test: {
          include: {
            organization: { select: { id: true, name: true, type: true, logoUrl: true } },
            _count: { select: { questions: true } },
          },
        },
        candidate: { select: { id: true, fullName: true, email: true } },
        session: true,
      },
    });

    if (!invitation) {
      return res.status(404).json({ error: 'Assessment invitation not found or token is invalid' });
    }

    // Email mask for privacy: e.g. "a***t@example.com"
    const [namePart, domainPart] = invitation.candidateEmail.split('@');
    const maskedEmail = `${namePart[0]}***${namePart.slice(-1)}@${domainPart}`;

    return res.json({
      invitationId: invitation.id,
      status: invitation.status,
      candidateName: invitation.candidate.fullName,
      maskedEmail,
      test: {
        id: invitation.test.id,
        title: invitation.test.title,
        description: invitation.test.description,
        durationMins: invitation.test.durationMins,
        startDate: invitation.test.startDate,
        endDate: invitation.test.endDate,
        totalQuestions: invitation.test._count.questions,
        requiresAccessCode: !!invitation.test.accessCode,
        organization: invitation.test.organization,
        status: invitation.test.status,
      },
      hasCompleted: invitation.status === InvitationStatus.COMPLETED,
      isOtpVerified: !!invitation.otpVerifiedAt,
      isExpired: new Date() > invitation.expiresAt,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 2. Start Exam Session (Strict Eligibility Checks)
router.post('/:testId/start', async (req: Request, res: Response) => {
  try {
    const { token, accessCode } = req.body;
    const testId = req.params.testId;

    if (!token) {
      return res.status(400).json({ error: 'Invitation token is required' });
    }

    const invitation = await prisma.testInvitation.findUnique({
      where: { invitationToken: String(token).trim() },
      include: { test: true, candidate: true, session: true },
    });

    if (!invitation || invitation.testId !== testId) {
      return res.status(404).json({ error: 'Invitation does not match this assessment' });
    }

    // Check 1: Test status must be PUBLISHED or ACTIVE
    if (invitation.test.status !== TestStatus.PUBLISHED && invitation.test.status !== TestStatus.ACTIVE) {
      return res.status(400).json({ error: 'This assessment is not currently active' });
    }

    // Check 2: Schedule window validation
    const now = new Date();
    if (invitation.test.startDate && now < invitation.test.startDate) {
      return res.status(400).json({
        error: `This assessment window has not started yet. It will open on ${invitation.test.startDate.toLocaleString()}.`,
      });
    }
    if (invitation.test.endDate && now > invitation.test.endDate) {
      return res.status(410).json({ error: 'The scheduled assessment window has ended.' });
    }
    if (now > invitation.expiresAt) {
      return res.status(410).json({ error: 'Your individual exam invitation has expired.' });
    }

    // Check 3: Candidate has not already completed
    if (invitation.status === InvitationStatus.COMPLETED) {
      return res.status(400).json({ error: 'You have already submitted and completed this exam.' });
    }

    // Check 4: OTP must have been verified
    if (!invitation.otpVerifiedAt) {
      return res.status(403).json({ error: 'Identity verification required. Please verify your OTP code before starting.' });
    }

    // Check 5: Access code verification if configured
    if (invitation.test.accessCode) {
      if (!accessCode || String(accessCode).trim().toUpperCase() !== invitation.test.accessCode.toUpperCase()) {
        return res.status(403).json({ error: 'Invalid assessment security access code.' });
      }
    }

    // Check 5b: Class-Restricted Academic Authorization
    if (invitation.test.classId) {
      const studentUser = await prisma.user.findUnique({
        where: { email: invitation.candidateEmail },
        select: { id: true },
      });
      if (studentUser) {
        const enrollment = await prisma.studentEnrollment.findFirst({
          where: {
            studentId: studentUser.id,
            classId: invitation.test.classId,
            status: 'ACTIVE',
          },
        });
        if (!enrollment) {
          return res.status(403).json({
            error: 'Class-Restricted Test: You are not enrolled in the class/division assigned to this assessment.',
          });
        }
      }
    }

    // Check 6: If session already exists and in progress, resume it
    if (invitation.session) {
      if (invitation.session.status === SessionStatus.SUBMITTED) {
        return res.status(400).json({ error: 'Exam has already been submitted.' });
      }
      return res.json({
        success: true,
        message: 'Resuming active exam session.',
        session: invitation.session,
      });
    }

    // Create fresh ExamSession
    const session = await prisma.examSession.create({
      data: {
        testId: invitation.test.id,
        candidateId: invitation.candidate.id,
        invitationId: invitation.id,
        timeRemainingSeconds: invitation.test.durationMins * 60,
        status: SessionStatus.IN_PROGRESS,
        startedAt: new Date(),
      },
    });

    // Update invitation status to STARTED
    await prisma.testInvitation.update({
      where: { id: invitation.id },
      data: {
        status: InvitationStatus.STARTED,
        startedAt: new Date(),
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Exam session initialized! Enter fullscreen mode.',
      session,
    });
  } catch (err: any) {
    console.error('[EXAM START ERROR]', err);
    return res.status(500).json({ error: err.message });
  }
});

// 3. Get Active Session Questions (Hides correct answers & explanations from candidate)
router.get('/:testId/session', async (req: Request, res: Response) => {
  try {
    const { token } = req.query;
    const testId = req.params.testId;

    if (!token) return res.status(400).json({ error: 'Invitation token is required' });

    const invitation = await prisma.testInvitation.findUnique({
      where: { invitationToken: String(token).trim() },
      include: {
        session: true,
        test: {
          include: {
            questions: {
              include: {
                question: {
                  select: {
                    id: true,
                    type: true,
                    questionText: true,
                    options: true,
                    marks: true,
                    negativeMarks: true,
                    // EXCLUDE correctAnswers and explanation for candidate security!
                  },
                },
              },
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (!invitation || invitation.testId !== testId || !invitation.session) {
      return res.status(404).json({ error: 'Active session not found' });
    }

    if (invitation.session.status !== SessionStatus.IN_PROGRESS) {
      return res.status(400).json({ error: 'Exam session is no longer active' });
    }

    // Calculate elapsed time
    const elapsedSeconds = Math.floor((Date.now() - new Date(invitation.session.startedAt).getTime()) / 1000);
    const totalDurationSeconds = invitation.test.durationMins * 60;
    const remainingSeconds = Math.max(0, totalDurationSeconds - elapsedSeconds);

    return res.json({
      sessionId: invitation.session.id,
      startedAt: invitation.session.startedAt,
      timeRemainingSeconds: remainingSeconds,
      testTitle: invitation.test.title,
      questions: invitation.test.questions.map((tq) => ({
        order: tq.order,
        marks: tq.marks,
        negativeMarks: tq.negativeMarks,
        question: tq.question,
      })),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 4. Submit Exam & Calculate Automated Score
router.post('/:testId/submit', async (req: Request, res: Response) => {
  try {
    const { token, answers } = req.body;
    const testId = req.params.testId;

    if (!token) return res.status(400).json({ error: 'Invitation token is required' });

    const invitation = await prisma.testInvitation.findUnique({
      where: { invitationToken: String(token).trim() },
      include: {
        candidate: true,
        session: true,
        test: {
          include: {
            questions: {
              include: { question: true },
            },
          },
        },
      },
    });

    if (!invitation || !invitation.session) {
      return res.status(404).json({ error: 'Exam session not found' });
    }

    if (invitation.status === InvitationStatus.COMPLETED) {
      return res.status(400).json({ error: 'This assessment has already been submitted.' });
    }

    // Answers format: [{ questionId: string, selectedAnswer: number | string }]
    const answerMap = new Map<string, any>();
    if (Array.isArray(answers)) {
      answers.forEach((a) => answerMap.set(a.questionId, a.selectedAnswer));
    }

    let totalScore = 0;
    let maxScore = 0;
    const evaluatedAnswers: any[] = [];

    for (const tq of invitation.test.questions) {
      const q = tq.question;
      const qMax = tq.marks;
      maxScore += qMax;

      const candAnswer = answerMap.get(q.id);
      let awardedMarks = 0;
      let isCorrect = false;

      // Automated Multiple Choice Evaluation
      if (q.type === 'MULTIPLE_CHOICE' && Array.isArray(q.correctAnswers)) {
        const expectedIndices = q.correctAnswers as number[];
        if (candAnswer !== undefined && expectedIndices.includes(Number(candAnswer))) {
          awardedMarks = qMax;
          isCorrect = true;
        } else if (candAnswer !== undefined && candAnswer !== null) {
          // Deduct negative marks if answered incorrectly
          awardedMarks = -Math.abs(tq.negativeMarks);
        }
      }

      totalScore += awardedMarks;
      evaluatedAnswers.push({
        questionId: q.id,
        order: tq.order,
        candidateAnswer: candAnswer !== undefined ? candAnswer : null,
        isCorrect,
        awardedMarks,
        maxMarks: qMax,
      });
    }

    totalScore = Math.max(0, totalScore); // Non-negative final score
    const percentage = maxScore > 0 ? Number(((totalScore / maxScore) * 100).toFixed(1)) : 0;
    const passMarks = invitation.test.passMarks || (maxScore * 0.4);
    const passed = totalScore >= passMarks;

    // Record Result & finalize session in transaction
    const [result] = await prisma.$transaction([
      prisma.result.create({
        data: {
          testId: invitation.test.id,
          candidateId: invitation.candidate.id,
          sessionId: invitation.session.id,
          totalScore,
          maxScore,
          percentage,
          passed,
          answers: evaluatedAnswers,
        },
      }),
      prisma.examSession.update({
        where: { id: invitation.session.id },
        data: {
          status: SessionStatus.SUBMITTED,
          submittedAt: new Date(),
          timeRemainingSeconds: 0,
        },
      }),
      prisma.testInvitation.update({
        where: { id: invitation.id },
        data: {
          status: InvitationStatus.COMPLETED,
          completedAt: new Date(),
        },
      }),
    ]);

    // Send Result notification email asynchronously
    sendEmail({
      recipient: invitation.candidate.email,
      template: 'result_notification',
      data: {
        candidateName: invitation.candidate.fullName,
        testTitle: invitation.test.title,
        totalScore,
        maxScore,
        percentage,
        passed,
      },
      organizationId: invitation.test.organizationId,
      roleContext: 'CANDIDATE',
    }).catch((e) => console.error('Failed to dispatch result email:', e));

    return res.json({
      success: true,
      message: 'Assessment submitted successfully!',
      result: {
        totalScore,
        maxScore,
        percentage,
        passed,
        submittedAt: new Date(),
      },
    });
  } catch (err: any) {
    console.error('[EXAM SUBMIT ERROR]', err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
