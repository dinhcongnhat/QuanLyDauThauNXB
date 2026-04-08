const JSZip = require('jszip');
const fs = require('fs');

async function getPlaceholders(templatePath) {
  try {
    const buf = fs.readFileSync(templatePath);
    const zip = await JSZip.loadAsync(buf);
    const x = await zip.file('word/document.xml').async('string');
    const seen = new Set();
    let depth = 0;
    for (let i = 0; i < x.length - 1; i++) {
      if (x[i] === '{' && x[i+1] === '{') {
        depth++;
        if (depth === 1) {
          let j = i + 2;
          let innerDepth = 1;
          while (j < x.length - 1 && innerDepth > 0) {
            if (x[j] === '{' && x[j+1] === '{') { innerDepth++; j += 2; }
            else if (x[j] === '}' && x[j+1] === '}') { innerDepth--; if (innerDepth === 0) { seen.add(x.substring(i, j + 2)); j += 2; } else j++; }
            else j++;
          }
        }
        i++;
      } else if (x[i] === '}' && x[i+1] === '}') {
        depth--;
        i++;
      }
    }
    return [...seen].sort();
  } catch(err) {
    return [];
  }
}

async function main() {
  const templates = [
    ['chct-hsmt', '/home/pcloud/qlda/FileMau/ChaoHangCanhTranh/Tờ trình phê duyệt HSMT.docx'],
    ['chct-kqlcnt', '/home/pcloud/qlda/FileMau/ChaoHangCanhTranh/Tờ trình phê duyệt KQLCNT.docx'],
    ['chct-qd-lcnt', '/home/pcloud/qlda/FileMau/ChaoHangCanhTranh/Quyết định lựa chọn nhà thầu.docx'],
    ['dtrr-hsmt', '/home/pcloud/qlda/FileMau/DauThauRongRai/Tờ trình phê duyệt HSMT.docx'],
    ['dtrr-kqlcnt', '/home/pcloud/qlda/FileMau/DauThauRongRai/Tờ trình phê duyệt KQLCNT.docx'],
    ['dtrr-qd-lcnt', '/home/pcloud/qlda/FileMau/DauThauRongRai/Quyết định lựa chọn nhà thầu.docx'],
  ];

  for (const [key, t] of templates) {
    const name = t.split('/').slice(-1)[0];
    const results = await getPlaceholders(t);
    console.log(`\n=== ${key}: ${name} (${results.length} placeholders) ===`);
    for (const p of results) console.log('  ' + p);
  }
}
main();
