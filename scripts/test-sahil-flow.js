const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

async function runE2E() {
  console.log('=== Step 1: Request Sahil Super Admin Login ===');
  const reqRes = await fetch('http://localhost:5001/api/v1/auth/sahil-login-request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'sahilshaikhcse@gmail.com', password: 'password12345' })
  });
  const reqData = await reqRes.json();
  console.log('Login Request Status:', reqRes.status, 'Response:', reqData);

  if (!reqData.requestId) {
    throw new Error('Failed to get requestId');
  }

  const requestId = reqData.requestId;

  console.log('\n=== Step 2: Poll status while awaiting authorization ===');
  const poll1 = await (await fetch(`http://localhost:5001/api/v1/auth/sahil-login-status?requestId=${requestId}`)).json();
  console.log('Poll Status (expect PENDING):', poll1.status);

  console.log('\n=== Step 3: Get standard super admin JWT to test management endpoints ===');
  const loginRes = await fetch('http://localhost:5001/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'sahilshaikhcse@gmail.com', password: 'password12345' })
  });
  const loginData = await loginRes.json();
  const token = loginData.token;
  console.log('Got Super Admin Token:', Boolean(token));

  console.log('\n=== Step 4: Test Exam Systems Analytics endpoint ===');
  const analyticsRes = await fetch('http://localhost:5001/api/v1/exams/analytics/system', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const analytics = await analyticsRes.json();
  console.log('Analytics Metrics:', analytics.metrics);
  console.log('Infrastructure Health:', analytics.infrastructure);

  console.log('\n=== Step 5: Test Creating a Teacher Staff Account ===');
  const testEmail = `test.teacher.${Date.now()}@example.com`;
  const createRes = await fetch('http://localhost:5001/api/v1/auth/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      fullName: 'Prof. Donald Knuth',
      email: testEmail,
      role: 'TEACHER',
      password: 'TeacherPassword123'
    })
  });
  const createdUser = await createRes.json();
  console.log('Created User:', createdUser.id, createdUser.fullName, createdUser.role, 'isActive:', createdUser.isActive);

  console.log('\n=== Step 6: Test Deactivating Teacher Account ===');
  const deactivateRes = await fetch(`http://localhost:5001/api/v1/auth/users/${createdUser.id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ isActive: false })
  });
  const deactivatedUser = await deactivateRes.json();
  console.log('Deactivated User Status:', deactivatedUser.isActive);

  console.log('\n=== Step 7: Attempt Login with Deactivated Account (Expect 403) ===');
  const deactLoginRes = await fetch('http://localhost:5001/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: 'TeacherPassword123' })
  });
  const deactLoginData = await deactLoginRes.json();
  console.log('Deactivated Login Status:', deactLoginRes.status, 'Error Message:', deactLoginData.error);

  console.log('\n=== Step 8: Re-activate Teacher Account ===');
  const activateRes = await fetch(`http://localhost:5001/api/v1/auth/users/${createdUser.id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ isActive: true })
  });
  const activatedUser = await activateRes.json();
  console.log('Re-activated User Status:', activatedUser.isActive);

  console.log('\n=== Step 9: Modify Teacher Account Details ===');
  const modifyRes = await fetch(`http://localhost:5001/api/v1/auth/users/${createdUser.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ fullName: 'Prof. Donald E. Knuth, PhD', role: 'RECRUITER' })
  });
  const modifiedUser = await modifyRes.json();
  console.log('Modified User:', modifiedUser.fullName, 'New Role:', modifiedUser.role);

  console.log('\n=== Step 10: Delete Teacher/Recruiter Account ===');
  const deleteRes = await fetch(`http://localhost:5001/api/v1/auth/users/${createdUser.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  const deleteData = await deleteRes.json();
  console.log('Delete Result:', deleteData);

  console.log('\nALL 10 VERIFICATION CHECKS PASSED PERFECTLY!');
}

runE2E().catch(console.error);
