import {
  PrismaClient,
  Role,
} from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Purging all demo records from database...');

  // Delete dependent tables in order
  await prisma.notification.deleteMany({});
  await prisma.studentTask.deleteMany({});
  await prisma.calendarEvent.deleteMany({});
  await prisma.vivaEvaluation.deleteMany({});
  await prisma.viva.deleteMany({});
  await prisma.practicalAssessment.deleteMany({});
  await prisma.theoryAssessment.deleteMany({});
  await prisma.attendanceRecord.deleteMany({});
  await prisma.reportCard.deleteMany({});
  await prisma.subjectTeacherAssignment.deleteMany({});
  await prisma.classTeacherAssignment.deleteMany({});
  await prisma.studentEnrollment.deleteMany({});
  await prisma.subject.deleteMany({});
  await prisma.academicClass.deleteMany({});
  await prisma.program.deleteMany({});
  await prisma.department.deleteMany({});
  await prisma.academicYear.deleteMany({});
  await prisma.emailLog.deleteMany({});
  await prisma.result.deleteMany({});
  await prisma.examSession.deleteMany({});
  await prisma.otpRequest.deleteMany({});
  await prisma.testInvitation.deleteMany({});
  await prisma.candidate.deleteMany({});
  await prisma.testQuestion.deleteMany({});
  await prisma.question.deleteMany({});
  await prisma.test.deleteMany({});
  await prisma.loginAttempt.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.organization.deleteMany({});

  console.log('🌱 Seeding production-ready Administrator account...');

  // Standard secure password hash
  const passwordHash = await bcrypt.hash('Password@123', 10);

  // Super Admin Account
  const superAdmin = await prisma.user.create({
    data: {
      email: 'examforge.superadmin@gmail.com',
      passwordHash,
      fullName: 'ExamForge Super Administrator',
      role: Role.SUPER_ADMIN,
      isEmailVerified: true,
      isActive: true,
    },
  });

  console.log('✅ Clean Database Ready. Retained Authorized Admin:');
  console.log(`   - Super Admin: ${superAdmin.email} (Role: ${superAdmin.role}, ID: ${superAdmin.id})`);
  console.log('   - Password: Password@123');
  console.log('   - All demo colleges, teachers, students, and dummy classes have been wiped clean.');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
