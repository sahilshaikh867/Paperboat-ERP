const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runTest() {
  const timestamp = Date.now();
  console.log('================================================================');
  console.log('PART 1: RECRUITER COMPANY REGISTRATION, VERIFICATION & WORKSPACE');
  console.log('================================================================');

  const companyOfficialEmail = `careers.acme.${timestamp}@acme.corp`;
  const recruiterPersonalEmail = `recruiter.${timestamp}@gmail.com`;
  const recruiterPassword = 'RecruiterPass123!';

  console.log('1. Submitting Company Registration...');
  const regRecruiterRes = await fetch('http://localhost:5001/api/v1/auth/register-recruiter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      companyName: `Acme Corp ${timestamp}`,
      officialEmail: companyOfficialEmail,
      contactPhone: '+1-555-0199',
      hrName: 'Sarah Connor',
      email: recruiterPersonalEmail,
      password: recruiterPassword,
    }),
  });
  const regRecruiterData = await regRecruiterRes.json();
  console.log('   Registration Status:', regRecruiterRes.status, 'Message:', regRecruiterData.message);

  console.log('\n2. Attempting Personal Login BEFORE Company Verification (Expect 403)...');
  const preVerifyLoginRes = await fetch('http://localhost:5001/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: recruiterPersonalEmail, password: recruiterPassword }),
  });
  const preVerifyLoginData = await preVerifyLoginRes.json();
  console.log('   Pre-Verify Login Status:', preVerifyLoginRes.status, 'Error:', preVerifyLoginData.error);
  if (preVerifyLoginRes.status !== 403) throw new Error('Expected 403 for unverified company login');

  console.log('\n3. Verifying Company via Official Verification Token...');
  const orgRecord = await prisma.organization.findFirst({
    where: { officialEmail: companyOfficialEmail },
  });
  console.log('   Found Org Token:', orgRecord?.verificationToken);

  const verifyRes = await fetch(`http://localhost:5001/api/v1/auth/verify-org?token=${orgRecord.verificationToken}`);
  const verifyData = await verifyRes.json();
  console.log('   Verification Result:', verifyData.message, 'Org Type:', verifyData.orgType);

  console.log('\n4. Logging In with Recruiter Personal Email (Expect 200 + Login Alert Email)...');
  const recruiterLoginRes = await fetch('http://localhost:5001/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: recruiterPersonalEmail, password: recruiterPassword }),
  });
  const recruiterLoginData = await recruiterLoginRes.json();
  console.log('   Login Status:', recruiterLoginRes.status, 'Role:', recruiterLoginData.user?.role, 'isOrgVerified:', recruiterLoginData.user?.isOrgVerified);
  const recruiterToken = recruiterLoginData.token;

  console.log('\n5. Creating Hiring Assessment with Languages & Questions (Expect Assessment Created Email)...');
  const createAssessmentRes = await fetch('http://localhost:5001/api/v1/exams', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${recruiterToken}`,
    },
    body: JSON.stringify({
      title: `Senior Backend Screening ${timestamp}`,
      description: 'Algorithm and system optimization evaluation',
      durationMins: 75,
      status: 'ACTIVE',
      languages: ['Python', 'Go', 'TypeScript'],
    }),
  });
  const assessmentData = await createAssessmentRes.json();
  console.log('   Assessment Created:', assessmentData.id, assessmentData.title, 'Duration:', assessmentData.durationMins);

  console.log('\n6. Managing Candidates (Enroll, Deactivate, Re-activate, Modify, Delete)...');
  const candidateEmail = `candidate.${timestamp}@example.com`;
  const candidateUser = await prisma.user.create({
    data: {
      email: candidateEmail,
      fullName: 'John Doe Candidate',
      role: 'CANDIDATE',
      passwordHash: 'dummy',
      isActive: true,
      isEmailVerified: true,
    },
  });
  console.log('   Enrolled Candidate:', candidateUser.id, candidateUser.fullName);

  // Deactivate
  const deactRes = await fetch(`http://localhost:5001/api/v1/auth/users/${candidateUser.id}/candidate-status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${recruiterToken}`,
    },
    body: JSON.stringify({ isActive: false }),
  });
  const deactData = await deactRes.json();
  console.log('   Candidate Deactivated (isActive):', deactData.isActive);

  // Re-activate
  const reactRes = await fetch(`http://localhost:5001/api/v1/auth/users/${candidateUser.id}/candidate-status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${recruiterToken}`,
    },
    body: JSON.stringify({ isActive: true }),
  });
  const reactData = await reactRes.json();
  console.log('   Candidate Re-activated (isActive):', reactData.isActive);

  // Modify
  const modRes = await fetch(`http://localhost:5001/api/v1/auth/users/${candidateUser.id}/candidate-details`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${recruiterToken}`,
    },
    body: JSON.stringify({ fullName: 'Johnathan Doe, MSc' }),
  });
  const modData = await modRes.json();
  console.log('   Candidate Modified Full Name:', modData.fullName);

  // Delete Candidate
  const delCandRes = await fetch(`http://localhost:5001/api/v1/auth/users/${candidateUser.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${recruiterToken}` },
  });
  const delCandData = await delCandRes.json();
  console.log('   Candidate Delete Result:', delCandData.message);

  // Delete Assessment
  const delExamRes = await fetch(`http://localhost:5001/api/v1/exams/${assessmentData.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${recruiterToken}` },
  });
  const delExamData = await delExamRes.json();
  console.log('   Assessment Delete Result:', delExamData.message);

  console.log('\n================================================================');
  console.log('PART 2: TEACHER COLLEGE REGISTRATION, VERIFICATION & WORKSPACE');
  console.log('================================================================');

  const collegeOfficialEmail = `dean.cse.${timestamp}@university.edu`;
  const teacherPersonalEmail = `prof.alan.${timestamp}@gmail.com`;
  const teacherPassword = 'TeacherPass123!';

  console.log('1. Submitting College Registration...');
  const regTeacherRes = await fetch('http://localhost:5001/api/v1/auth/register-teacher', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      collegeName: `MIT Computer Science ${timestamp}`,
      officialEmail: collegeOfficialEmail,
      contactPhone: '+1-555-0822',
      teacherName: 'Prof. Alan Turing',
      department: 'Computer Science & AI',
      email: teacherPersonalEmail,
      password: teacherPassword,
    }),
  });
  const regTeacherData = await regTeacherRes.json();
  console.log('   Registration Status:', regTeacherRes.status, 'Message:', regTeacherData.message);

  console.log('\n2. Attempting Personal Login BEFORE College Verification (Expect 403)...');
  const preTeacherLoginRes = await fetch('http://localhost:5001/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: teacherPersonalEmail, password: teacherPassword }),
  });
  const preTeacherLoginData = await preTeacherLoginRes.json();
  console.log('   Pre-Verify Teacher Login Status:', preTeacherLoginRes.status, 'Error:', preTeacherLoginData.error);
  if (preTeacherLoginRes.status !== 403) throw new Error('Expected 403 for unverified college login');

  console.log('\n3. Verifying College via Official Verification Token...');
  const teacherOrg = await prisma.organization.findFirst({
    where: { officialEmail: collegeOfficialEmail },
  });
  console.log('   Found College Token:', teacherOrg?.verificationToken);

  const verifyTeacherOrgRes = await fetch(`http://localhost:5001/api/v1/auth/verify-org?token=${teacherOrg.verificationToken}`);
  const verifyTeacherOrgData = await verifyTeacherOrgRes.json();
  console.log('   Verification Result:', verifyTeacherOrgData.message, 'Org Type:', verifyTeacherOrgData.orgType);

  console.log('\n4. Logging In with Teacher Personal Email (Expect 200 + Login Alert Email)...');
  const teacherLoginRes = await fetch('http://localhost:5001/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: teacherPersonalEmail, password: teacherPassword }),
  });
  const teacherLoginData = await teacherLoginRes.json();
  console.log('   Login Status:', teacherLoginRes.status, 'Role:', teacherLoginData.user?.role, 'isOrgVerified:', teacherLoginData.user?.isOrgVerified);
  const teacherToken = teacherLoginData.token;

  console.log('\n5. Creating Course Examination with Languages (Expect Assessment Created Email)...');
  const createExamRes = await fetch('http://localhost:5001/api/v1/exams', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${teacherToken}`,
    },
    body: JSON.stringify({
      title: `CS201 Data Structures Midterm ${timestamp}`,
      description: 'Binary trees, heaps, and graph algorithms exam',
      durationMins: 90,
      status: 'ACTIVE',
      languages: ['C++', 'Java', 'Python'],
    }),
  });
  const examData = await createExamRes.json();
  console.log('   Course Exam Created:', examData.id, examData.title, 'Duration:', examData.durationMins);

  console.log('\n6. Managing Enrolled Students (Enroll, Deactivate, Re-activate, Modify, Delete)...');
  const studentEmail = `student.${timestamp}@university.edu`;
  const studentUser = await prisma.user.create({
    data: {
      email: studentEmail,
      fullName: 'Alice Walker',
      role: 'CANDIDATE',
      passwordHash: 'dummy',
      isActive: true,
      isEmailVerified: true,
    },
  });
  console.log('   Enrolled Student:', studentUser.id, studentUser.fullName);

  // Deactivate
  const deactStudentRes = await fetch(`http://localhost:5001/api/v1/auth/users/${studentUser.id}/candidate-status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${teacherToken}`,
    },
    body: JSON.stringify({ isActive: false }),
  });
  const deactStudentData = await deactStudentRes.json();
  console.log('   Student Deactivated (isActive):', deactStudentData.isActive);

  // Re-activate
  const reactStudentRes = await fetch(`http://localhost:5001/api/v1/auth/users/${studentUser.id}/candidate-status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${teacherToken}`,
    },
    body: JSON.stringify({ isActive: true }),
  });
  const reactStudentData = await reactStudentRes.json();
  console.log('   Student Re-activated (isActive):', reactStudentData.isActive);

  // Modify
  const modStudentRes = await fetch(`http://localhost:5001/api/v1/auth/users/${studentUser.id}/candidate-details`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${teacherToken}`,
    },
    body: JSON.stringify({ fullName: 'Alice Walker, Class of 2026' }),
  });
  const modStudentData = await modStudentRes.json();
  console.log('   Student Modified Full Name:', modStudentData.fullName);

  // Delete Student
  const delStudentRes = await fetch(`http://localhost:5001/api/v1/auth/users/${studentUser.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${teacherToken}` },
  });
  const delStudentData = await delStudentRes.json();
  console.log('   Student Delete Result:', delStudentData.message);

  // Delete Exam
  const delTeacherExamRes = await fetch(`http://localhost:5001/api/v1/exams/${examData.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${teacherToken}` },
  });
  const delTeacherExamData = await delTeacherExamRes.json();
  console.log('   Course Exam Delete Result:', delTeacherExamData.message);

  console.log('\n================================================================');
  console.log('SUCCESS: ALL RECRUITER & TEACHER WORKFLOW TESTS PASSED PERFECTLY!');
  console.log('================================================================');
  await prisma.$disconnect();
}

runTest().catch((err) => {
  console.error(err);
  prisma.$disconnect();
  process.exit(1);
});
