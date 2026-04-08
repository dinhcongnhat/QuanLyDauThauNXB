#!/usr/bin/env python3
"""
Extract text and placeholder patterns from .docx files without external dependencies.
Uses zipfile and xml.etree.ElementTree (standard library only).
"""

import zipfile
import xml.etree.ElementTree as ET
import re
import os
from pathlib import Path

def extract_text_from_docx(docx_path):
    """Extract all text content from a docx file."""
    texts = []
    
    with zipfile.ZipFile(docx_path, 'r') as zf:
        # Read document.xml which contains the main content
        xml_content = zf.read('word/document.xml')
        
        # Parse XML
        root = ET.fromstring(xml_content)
        
        # Namespace for Word documents
        namespaces = {
            'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
        }
        
        # Extract all text from <w:t> elements
        for t_elem in root.iter():
            if t_elem.tag.endswith('}t'):
                if t_elem.text:
                    texts.append(t_elem.text)
    
    return ' '.join(texts)

def find_placeholders(text):
    """Find all placeholder patterns in text."""
    placeholders = []
    
    # Pattern 1: {{variable}}
    pattern1 = re.findall(r'\{\{([^}]+)\}\}', text)
    for p in pattern1:
        placeholders.append(f'{{{{{p}}}}}'  )
    
    # Pattern 2: (variable)
    pattern2 = re.findall(r'\(([^()]+)\)', text)
    for p in pattern2:
        # Filter out common non-placeholder parentheses
        if p and not any(skip in p.lower() for skip in ['ghi chú', 'chú thích', 'note', 'ngày', 'tháng', 'năm', '...', '....']):
            # Only include if it looks like a variable (has specific patterns)
            if re.search(r'[A-ZĐ]|^d\.|^m\.|^\d', p) or len(p) < 30:
                placeholders.append(f'({p})')
    
    # Pattern 3: [variable]
    pattern3 = re.findall(r'\[([^\[\]]+)\]', text)
    for p in pattern3:
        placeholders.append(f'[{p}]')
    
    return placeholders

def process_files():
    """Process all docx files and extract placeholders."""
    
    base_path = Path('/home/pcloud/qlda/FileMau')
    
    # File list
    files = [
        ('ChiDinhThau/Biên bản hoàn thiện hợp đồng.docx', '1. ChiDinhThau - Biên bản hoàn thiện hợp đồng.docx'),
        ('ChiDinhThau/Hợp đồng.docx', '2. ChiDinhThau - Hợp đồng.docx'),
        ('ChiDinhThau/Quyết định phê duyệt KQLCNT.docx', '3. ChiDinhThau - Quyết định phê duyệt KQLCNT.docx'),
        ('ChiDinhThau/Thư mời hoàn thiện hợp đồng.docx', '4. ChiDinhThau - Thư mời hoàn thiện hợp đồng.docx'),
        ('ChiDinhThau/Tờ trình phê duyệt KQLCNT.docx', '5. ChiDinhThau - Tờ trình phê duyệt KQLCNT.docx'),
        ('ChaoHangCanhTranh/Hợp đồng.docx', '6. ChaoHangCanhTranh - Hợp đồng.docx'),
        ('ChaoHangCanhTranh/Quyết định lựa chọn nhà thầu.docx', '7. ChaoHangCanhTranh - Quyết định lựa chọn nhà thầu.docx'),
        ('ChaoHangCanhTranh/Quyết định phê duyệt hồ sơ mời thầu.docx', '8. ChaoHangCanhTranh - Quyết định phê duyệt hồ sơ mời thầu.docx'),
        ('ChaoHangCanhTranh/Tờ trình phê duyệt HSMT.docx', '9. ChaoHangCanhTranh - Tờ trình phê duyệt HSMT.docx'),
        ('ChaoHangCanhTranh/Tờ trình phê duyệt KQLCNT.docx', '10. ChaoHangCanhTranh - Tờ trình phê duyệt KQLCNT.docx'),
        ('DauThauRongRai/Hợp đồng.docx', '11. DauThauRongRai - Hợp đồng.docx'),
        ('DauThauRongRai/Quyết định lựa chọn nhà thầu.docx', '12. DauThauRongRai - Quyết định lựa chọn nhà thầu.docx'),
        ('DauThauRongRai/Quyết định phê duyệt hồ sơ mời thầu.docx', '13. DauThauRongRai - Quyết định phê duyệt hồ sơ mời thầu.docx'),
        ('DauThauRongRai/Tờ trình phê duyệt HSMT.docx', '14. DauThauRongRai - Tờ trình phê duyệt HSMT.docx'),
        ('DauThauRongRai/Tờ trình phê duyệt KQLCNT.docx', '15. DauThauRongRai - Tờ trình phê duyệt KQLCNT.docx'),
    ]
    
    results = {}
    
    for file_path, display_name in files:
        full_path = base_path / file_path
        print(f"\n{'='*80}")
        print(f"处理: {display_name}")
        print(f"{'='*80}")
        
        if not full_path.exists():
            print(f"  ❌ 文件不存在: {full_path}")
            results[display_name] = {'error': 'File not found'}
            continue
        
        try:
            # Extract text
            text = extract_text_from_docx(full_path)
            print(f"\n--- 文本内容 (前2000字符) ---")
            print(text[:2000])
            if len(text) > 2000:
                print(f"\n... [文本总长度: {len(text)} 字符]")
            
            # Find placeholders
            placeholders = find_placeholders(text)
            
            print(f"\n--- 发现的所有占位符 ({len(placeholders)} 个) ---")
            if placeholders:
                for i, p in enumerate(placeholders, 1):
                    print(f"  {i}. {p}")
            else:
                print("  (无)")
            
            results[display_name] = {
                'text': text,
                'placeholders': placeholders
            }
            
        except Exception as e:
            print(f"  ❌ 处理错误: {e}")
            results[display_name] = {'error': str(e)}
    
    return results

if __name__ == '__main__':
    results = process_files()
    
    # Summary
    print("\n\n" + "="*80)
    print("摘要 - 所有占位符汇总")
    print("="*80)
    
    all_placeholders = {}
    for filename, data in results.items():
        if 'placeholders' in data and data['placeholders']:
            all_placeholders[filename] = data['placeholders']
    
    if all_placeholders:
        for filename, placeholders in all_placeholders.items():
            print(f"\n📄 {filename}")
            for p in placeholders:
                print(f"   - {p}")
    else:
        print("\n未找到任何占位符模式。")
