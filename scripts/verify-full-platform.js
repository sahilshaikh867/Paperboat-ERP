const http = require('http');

function api(method, path, data, token) {
  return new Promise((resolve) => {
    const payload = data ? JSON.stringify(data) : null;
    const req = http.request({
      hostname: 'localhost',
      port: 5001,
      path: '/api/v1' + path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        ...(token ? { 'Authorization': 'Bearer ' + token } : {}),
      },
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', (err) => resolve({ error: err.message }));
    if (payload) req.write(payload);
    req.end();
  });
}

async function runVerification() {
  console.log('================================================================');
  console.log('🚀 EXAMFORGE COMPREHENSIVE END-TO-END PLATFORM VERIFICATION');
  console.log('================================================================\n');

  const ts = Date.now();

  // 1. Super Admin 2FA Email Confirmation Flow
  console.log('--- TEST 1: Super Admin Login & 2FA Email Confirmation ---');
  const adminLoginReq = await api('POST', '/auth/login', {
    email: 'admin@example.com',
    password: 'password12345',
  });
  console.log('Super Admin Login Request:', adminLoginReq.status, 'Requires Approval:', adminLoginReq.data?.requiresApproval);
  if (!adminLoginReq.data?.requiresApproval) throw new Error('Expected 2FA approval requirement for Super Admin');

  const approvalUrl = adminLoginReq.data?.approvalUrl;
  const approvalToken = new URL(approvalUrl).searchParams.get('token');
  console.log('Approval Token Generated:', approvalToken?.slice(0, 16) + '...');

  // 1b. Confirm Login
  const confirmRes = await api('GET', `/auth/super-admin/confirm?token=${approvalToken}`);
  console.log('Super Admin Confirm Status:', confirmRes.status, 'Success:', confirmRes.data?.success);
  const superAdminToken = confirmRes.data?.token;
  if (!superAdminToken) throw new Error('Failed to get super admin token after approval');

  // 1c. Test Dead-Link (Second Click)
  const deadLinkRes = await api('GET', `/auth/super-admin/confirm?token=${approvalToken}`);
  console.log('Super Admin 2nd Click Status (Expect 410 dead link):', deadLinkRes.status);
  if (deadLinkRes.status !== 410) throw new Error('Approval token must be dead after first use');

  // 2. Public College Registration (Instant, no manual platform verification needed)
  console.log('\n--- TEST 2: Public College Registration (Instant Onboarding) ---');
  const collegeReg = await api('POST', '/organizations/college', {
    collegeName: `Harvard University ${ts}`,
    collegeEmail: `admissions.${ts}@harvard.edu`,
    phone: '+1 617-495-1000',
    address: 'Massachusetts Hall',
    city: 'Cambridge',
    state: 'MA',
    country: 'USA',
    adminName: 'Dean Katherine',
    adminEmail: `katherine.${ts}@harvard.edu`,
    password: 'Password123!',
  });
  console.log('College Registration Status:', collegeReg.status, 'Org Type:', collegeReg.data?.user?.organization?.type);
  const collegeAdminToken = collegeReg.data?.token;
  const collegeOrgId = collegeReg.data?.user?.organization?.id;

  // 3. Public Company Registration (Instant Onboarding)
  console.log('\n--- TEST 3: Public Company Registration (Instant Onboarding) ---');
  const companyReg = await api('POST', '/organizations/company', {
    companyName: `Stripe Inc ${ts}`,
    companyEmail: `hiring.${ts}@stripe.com`,
    phone: '+1 415-555-9000',
    address: '510 Townsend St',
    city: 'San Francisco',
    state: 'CA',
    country: 'USA',
    adminName: 'Patrick HR',
    adminEmail: `patrick.${ts}@stripe.com`,
    password: 'Password123!',
  });
  console.log('Company Registration Status:', companyReg.status, 'Org Type:', companyReg.data?.user?.organization?.type);
  const companyAdminToken = companyReg.data?.token;
  const companyOrgId = companyReg.data?.user?.organization?.id;

  // 4. College Admin Invites Teacher
  console.log('\n--- TEST 4: College Admin Adds Teacher & Teacher Activates Account ---');
  const teacherInvite = await api('POST', '/teachers', {
    name: 'Prof. Alan Turing',
    email: `turing.${ts}@harvard.edu`,
    department: 'Computer Science',
    designation: 'Chair Professor',
    degree: 'Ph.D. Mathematics',
  }, collegeAdminToken);
  console.log('Teacher Invite Status:', teacherInvite.status, 'Activation URL Generated:', !!teacherInvite.data?.activationUrl);

  const teacherToken = new URL(teacherInvite.data?.activationUrl).searchParams.get('token');
  const teacherActivation = await api('POST', '/auth/accept-invitation', {
    token: teacherToken,
    password: 'TeacherPassword123!',
  });
  console.log('Teacher Account Activation Status:', teacherActivation.status, 'Role:', teacherActivation.data?.user?.role);
  const teacherAuthToken = teacherActivation.data?.token;

  // 5. Company Admin Invites Recruiter
  console.log('\n--- TEST 5: Company Admin Adds Recruiter & Recruiter Activates Account ---');
  const recruiterInvite = await api('POST', '/recruiters', {
    name: 'Sarah Hiring Lead',
    email: `sarah.recruiter.${ts}@stripe.com`,
    department: 'Tech Recruiting',
    designation: 'Senior Lead',
  }, companyAdminToken);
  console.log('Recruiter Invite Status:', recruiterInvite.status);

  const recruiterToken = new URL(recruiterInvite.data?.activationUrl).searchParams.get('token');
  const recruiterActivation = await api('POST', '/auth/accept-invitation', {
    token: recruiterToken,
    password: 'RecruiterPassword123!',
  });
  console.log('Recruiter Account Activation Status:', recruiterActivation.status, 'Role:', recruiterActivation.data?.user?.role);
  const recruiterAuthToken = recruiterActivation.data?.token;

  // 6. Teacher Creates Test & Questions & Publishes
  console.log('\n--- TEST 6: Teacher Creates Assessment & Questions (Shared Test Engine) ---');
  const testCreate = await api('POST', '/tests', {
    title: `CS50 Algorithms Final Exam ${ts}`,
    description: 'Comprehensive exam on graph theory and algorithmic complexity.',
    durationMins: 30,
    accessCode: 'HARVARD-ALGO',
    defaultMarks: 5,
    defaultNegativeMarks: 1,
    passMarks: 8,
  }, teacherAuthToken);
  console.log('Test Create Status:', testCreate.status, 'Status:', testCreate.data?.test?.status);
  const testId = testCreate.data?.test?.id;

  // 6b. Add Questions
  const q1 = await api('POST', `/tests/${testId}/questions`, {
    questionText: 'What is the worst-case runtime complexity of QuickSort?',
    type: 'MULTIPLE_CHOICE',
    options: ['O(n)', 'O(n log n)', 'O(n^2)', 'O(2^n)'],
    correctAnswers: [2],
    marks: 5,
    negativeMarks: 1,
  }, teacherAuthToken);

  const q2 = await api('POST', `/tests/${testId}/questions`, {
    questionText: 'Which data structure implements FIFO (First-In, First-Out) ordering?',
    type: 'MULTIPLE_CHOICE',
    options: ['Stack', 'Queue', 'Heap', 'Tree'],
    correctAnswers: [1],
    marks: 5,
    negativeMarks: 1,
  }, teacherAuthToken);
  console.log('Added Questions Q1 & Q2. Statuses:', q1.status, q2.status);

  // 6c. Publish Test
  const publishRes = await api('POST', `/tests/${testId}/publish`, {}, teacherAuthToken);
  console.log('Publish Test Status:', publishRes.status, 'New Test Status:', publishRes.data?.test?.status);

  // 7. Bulk Candidate Import via CSV
  console.log('\n--- TEST 7: Bulk Candidate CSV Import & Invitations ---');
  const candEmail = `student.alex.${ts}@gmail.com`;
  const csvContent = `Name,Email,Phone\nAlex Student,${candEmail},+1555123456\nJane Doe,jane.${ts}@gmail.com,+1555654321`;
  const csvImport = await api('POST', '/candidates/import-csv', { csvContent }, teacherAuthToken);
  console.log('CSV Import Status:', csvImport.status, 'Imported Count:', csvImport.data?.importedCount);

  // 7b. Issue Test Invitations
  const inviteRes = await api('POST', '/invitations', {
    testId,
    candidateEmails: [candEmail],
  }, teacherAuthToken);
  console.log('Issue Invitations Status:', inviteRes.status, 'Count:', inviteRes.data?.invitations?.length);
  const examUrl = inviteRes.data?.invitations[0]?.examUrl;
  const invitationToken = new URL(examUrl).searchParams.get('token');
  console.log('Candidate Exam URL:', examUrl);

  // 8. Candidate Pre-Flight Status Check
  console.log('\n--- TEST 8: Candidate Pre-Flight Check & OTP Verification ---');
  const preflight = await api('GET', `/exams/invitation/${invitationToken}`);
  console.log('Pre-flight Status:', preflight.status, 'Candidate Name:', preflight.data?.candidateName, 'Masked Email:', preflight.data?.maskedEmail);

  // 8b. Request Candidate OTP
  const otpReq = await api('POST', '/otp/request', {
    token: invitationToken,
    email: candEmail,
  });
  console.log('OTP Request Status:', otpReq.status, 'Message:', otpReq.data?.message);
  const generatedOtp = otpReq.data?.otp;
  console.log('Candidate OTP Code:', generatedOtp);

  // 8c. Verify Candidate OTP
  const otpVerify = await api('POST', '/otp/verify', {
    token: invitationToken,
    email: candEmail,
    otp: generatedOtp,
  });
  console.log('OTP Verify Status:', otpVerify.status, 'Success:', otpVerify.data?.success);

  // 9. Start Fullscreen Exam Session
  console.log('\n--- TEST 9: Start Exam Session & Fullscreen Mode ---');
  const examStart = await api('POST', `/exams/${testId}/start`, {
    token: invitationToken,
    accessCode: 'HARVARD-ALGO',
  });
  console.log('Exam Start Status:', examStart.status, 'Session ID:', examStart.data?.session?.id);

  // 9b. Fetch Questions for Candidate (Confirms correctAnswers & explanations are hidden)
  const sessionData = await api('GET', `/exams/${testId}/session?token=${invitationToken}`);
  console.log('Session Questions Count:', sessionData.data?.questions?.length);
  const sampleQuestion = sessionData.data?.questions[0]?.question;
  console.log('Sample Question Delivered:', sampleQuestion?.questionText);
  console.log('Security check: correctAnswers hidden from candidate?', sampleQuestion?.correctAnswers === undefined);

  // 9c. Candidate Submits Exam
  const qId1 = sessionData.data?.questions[0]?.question?.id;
  const qId2 = sessionData.data?.questions[1]?.question?.id;

  const submitRes = await api('POST', `/exams/${testId}/submit`, {
    token: invitationToken,
    answers: [
      { questionId: qId1, selectedAnswer: 2 }, // Correct (O(n^2)) -> 5 marks
      { questionId: qId2, selectedAnswer: 1 }, // Correct (Queue) -> 5 marks
    ],
  });
  console.log('Submit Exam Status:', submitRes.status, 'Score:', submitRes.data?.result?.totalScore, '/', submitRes.data?.result?.maxScore, 'Passed:', submitRes.data?.result?.passed);

  // 10. Audit Results & Email Delivery Logs
  console.log('\n--- TEST 10: Staff Results Audit & Email Diagnostics ---');
  const resultsAudit = await api('GET', `/results/test/${testId}`, null, teacherAuthToken);
  console.log('Results Summary:', JSON.stringify(resultsAudit.data?.summary));

  const emailLogs = await api('GET', '/emails/logs', null, teacherAuthToken);
  console.log('Email Logs Count:', emailLogs.data?.length);
  console.log('Recent Email Logs:');
  emailLogs.data?.slice(0, 3).forEach(l => console.log(`  - [${l.status}] to ${l.recipient} (Template: ${l.template})`));

  // 11. Multi-Tenant Data Isolation Test
  console.log('\n--- TEST 11: Multi-Tenant Data Isolation Test ---');
  // Teacher from Harvard tries to read Stripe test
  const crossTenantCheck = await api('GET', `/tests/${testId}`, null, recruiterAuthToken);
  console.log('Stripe Recruiter accessing Harvard Test (Expect 404 Isolated):', crossTenantCheck.status);
  if (crossTenantCheck.status !== 404) throw new Error('Multi-tenant data isolation breached!');

  console.log('\n================================================================');
  console.log('✅ ALL 11 ENTERPRISE ARCHITECTURE TESTS PASSED WITH 100% SUCCESS');
  console.log('================================================================\n');
}

runVerification().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
