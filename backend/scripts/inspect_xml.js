const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');

function inspectDocx(fileName) {
  const filePath = path.join('/home/pcloud/qlda/FileMau/DatSach', fileName);
  console.log(`=== Inspecting ${fileName} ===`);
  const zip = new AdmZip(filePath);
  const docXml = zip.readAsText('word/document.xml');
  
  // Find all text tags
  let texts = [];
  const regex = /<w:t[^>]*>(.*?)<\/w:t>/g;
  let match;
  while ((match = regex.exec(docXml)) !== null) {
    texts.push(match[1]);
  }
  
  // Let's print occurrences of curly braces
  console.log("Joined text preview (first 1000 chars):");
  console.log(texts.join('').substring(0, 1000));
  
  console.log("\nOccurrences of curly braces in raw XML:");
  // Let's look around '{' or '}' in XML
  const rawXml = docXml;
  let index = 0;
  while ((index = rawXml.indexOf('{', index)) !== -1) {
    const start = Math.max(0, index - 20);
    const end = Math.min(rawXml.length, index + 40);
    console.log(`FOUND '{' at index ${index}: "${rawXml.substring(start, end).replace(/\n/g, ' ')}"`);
    index += 1;
  }
}

inspectDocx('giay_de_nghi_in.docx');
inspectDocx('phieu_chi_dinh_co_so_in.docx');
