const http = require('http');

function request(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data ? JSON.parse(data) : null,
        });
      });
    });

    req.on('error', (err) => reject(err));

    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

async function test() {
  try {
    // 1. Login
    console.log('Logging in...');
    const loginRes = await request({
      hostname: 'localhost',
      port: 80,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }, {
      email: 'nvana@qlda.vn',
      password: '10122002',
    });

    if (loginRes.statusCode !== 201 && loginRes.statusCode !== 200) {
      console.error('Login failed:', loginRes.statusCode, loginRes.data);
      return;
    }

    const token = loginRes.data.access_token;
    console.log('Login successful.');

    // 2. Fetch auto-fill
    console.log('Fetching auto-fill...');
    const projectId = 'e69548c2-ef0f-4027-baca-6acfcca2e439';
    const fillRes = await request({
      hostname: 'localhost',
      port: 80,
      path: `/api/dat-sach/project/${projectId}/auto-fill/dutoan`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    console.log('Auto-fill Status Code:', fillRes.statusCode);
    console.log('Auto-fill Data:', JSON.stringify(fillRes.data, null, 2));

  } catch (err) {
    console.error('Test error:', err);
  }
}

test();
