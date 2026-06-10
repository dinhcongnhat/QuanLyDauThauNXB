const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const http = require('http');

const prisma = new PrismaClient();
const jwtSecret = process.env.JWT_SECRET || 'qlda-procurement-jwt-secret-key-2024';

async function testEndpoint(name, path, tokenPayload) {
  const token = jwt.sign(tokenPayload, jwtSecret, { expiresIn: '1h' });
  const url = `http://localhost:4000/api/dat-sach/${path}?token=${token}`;
  console.log(`[${name}] Testing: ${url}`);
  
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      console.log(`[${name}] Status: ${res.statusCode}`);
      console.log(`[${name}] Content-Type: ${res.headers['content-type']}`);
      let data = [];
      res.on('data', chunk => data.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(data);
        console.log(`[${name}] Downloaded: ${buffer.length} bytes`);
        if (res.statusCode === 200 && buffer.length > 100) {
          resolve(true);
        } else {
          resolve(false);
        }
      });
    }).on('error', reject);
  });
}

async function test() {
  const gdn = await prisma.gDNInSach.findFirst();
  const pcdi = await prisma.pCDICoSoIn.findFirst();
  const project = await prisma.datSachProject.findFirst();

  let ok = true;

  if (gdn) {
    const res = await testEndpoint('GDN', `gdn/${gdn.id}/download-public`, { gdnId: gdn.id, purpose: 'download' });
    if (!res) ok = false;
  } else {
    console.log("No GDN found.");
  }

  if (pcdi) {
    const res = await testEndpoint('PCDI', `pcdi/${pcdi.id}/download-public`, { pcdiId: pcdi.id, purpose: 'download' });
    if (!res) ok = false;
  } else {
    console.log("No PCDI found.");
  }

  if (project) {
    const res = await testEndpoint('QD', `project/${project.id}/download-qd-public`, { projectId: project.id, purpose: 'download' });
    if (!res) ok = false;
  } else {
    console.log("No DatSachProject found.");
  }

  if (ok) {
    console.log("\n>>> ALL PUBLIC DOWNLOAD ENDPOINTS TESTED SUCCESSFUL! <<<");
  } else {
    console.log("\n>>> SOME ENDPOINTS FAILED! <<<");
  }
}

test()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
