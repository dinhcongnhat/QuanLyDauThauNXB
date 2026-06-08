# Bao cao trien khai - Sua he thong DatSach & Thu Vien Van Ban

**Ngay:** 08/06/2026
**He thong:** QLDA (Quan Ly Du An - NXB Chinh tri Quoc gia Su that)
**Tac gia:** Claude Code

---

## Muc luc

1. [Tom tat cac van de phat hien](#1-tom-tat-cac-van-de-phat-hien)
2. [Giai doan 1 - Sua Template DOCX](#2-giai-doan-1---sua-template-docx)
3. [Giai doan 2 - Sua luong nghiep vu DatSach](#3-giai-doan-2---sua-luong-nghiep-vu-datsach)
4. [Giai doan 3 - Tai kien truc Thu Vien Van Ban theo phan he](#4-giai-doan-3---tai-kien-truc-thu-vien-van-ban-theo-phan-he)
5. [Kiem thu - Ket qua day du](#5-kiem-thu---ket-qua-day-du)
6. [Cong viec con lai](#6-cong-viec-con-lai)

---

## 1. Tom tat cac van de phat hien

### 1.1 Template DOCX - CRITICAL

| Template | Van de | Nguyen nhan |
|---|---|---|
| `phieu_chi_dinh_co_so_in.docx` | **100% truong bi trong** | Placeholder bi tach ra nhieu `<w:r>` runs (VD: `{{B BT}}`) |
| `quyet_dinh.docx` | **100% truong bi trong** | Cung ly do - placeholder tach nhieu run, co them ky tu `{` thua |
| `giay_de_nghi_in.docx` | **4 truong bi trong** (`TenSach`, `TacGia`, `VuKH-TKBT`, `BanBienTap`) | Placeholder bi tach nhieu run + thieu placeholder |
| LCNT HopDong (CHCT, DTRR, CHCanhTranh) | **5 truong bi trong** | Thieu `{{` mo (VD: `{LoaiHopDong}}`) |
| LCNT KQLCNT | **2 truong bi trong** | Thieu `{{` mo (VD: `{ThoiDiemDongThau}`) |
| LCNT HSMT | **1 truong bi trong** | `{{tendonvicuatochuyengia}}` chu cai dau thuong, khong co alias |
| DuToan templates | **1 truong bi trong** | `{{VietTat PhongBanThuocDonViTrinh}}` co dau cach trong ngoac |

### 1.2 Luong nghiep vu DatSach

| # | Van de | Tac dong |
|---|---|---|
| B1 | `api.getUsers()` that bai manh, khong hien thi loi nao cho nguoi dung | Modal gan nhan vien hien danh sach trong |
| B2 | Nut "Duyet GDN/PCDI/QD" khong co role check frontend, chi nhan 403 tu backend | Nguoi dung khong co quyen se khong biet tai sao nut khong hoat dong |
| B3 | `fillSL` doc userId tu JWT nhung frontend van gui userId trong body | Lam viec dung nhung de hieu lanh |

### 1.3 Thu Vien Van Ban

| Van de | Chi tiet |
|---|---|
| Seed data khong theo phan he | Thu vien "THONG_TIN_TO_CHUC" dung chung cho tat ca, khong phan biet DatSach/DuToan/KHLCNT/LCNT |
| Field keys khong khop voi form fields | Seed dung `cdt_ten_cong_ty`, form dung `tenSach`, `tacGia` |
| Handle functions co nhieu fallback chain | `val.duLieu.tenSach \|\| val.duLieu.TenSach \|\| val.duLieu.ten_sach` |
| Chua co thu vien cho tung phan he | Nguoi dung phai tu nhap lai nhieu truong |

---

## 2. Giai doan 1 - Sua Template DOCX

### 2.1 Script fix placeholders

**File:** `backend/scripts/fix-docx-placeholders.js`

Da sua **13 file DOCX** co placeholder loi trong cac folder:
- `ChaoHangCanhTranh` (5 file)
- `ChiDinhThau` (3 file)
- `DauThauRongRai` (5 file)
- `GioiThauPhiTuVan` (3 file)
- `GioiThauTrienKhai` (3 file)
- `GioiThauTuVan` (3 file)
- `NhaThau-ThamDuThau` (5 file)

Cac loi da sua:
- `{{A B}}` -> `{{AB}}` (dau cach trong ngoac)
- `{LoaiHopDong}}` -> `{{LoaiHopDong}}` (thieu `{{`)
- `{{tendonvicuatochuyengia}}` -> alias sang `Tendonvicuatochuyengia`

### 2.2 DatSach DOCX - Tai tao mau sach

**Root cause cua PCDI va QD 100% trong:** Template cu duoc tao tu Word, voi formatting (bold/italic) tach placeholder thanh nhieu `<w:r>` runs. VD: `{{TacGia}}` duoc luu thanh:
```
<w:r><w:t>{</w:t></w:r>
<w:r><w:t>{T</w:t></w:r>
<w:r><w:t>acGia}</w:t></w:r>
<w:r><w:t>}</w:t></w:r>
```

**Giai phap:** Tao lai 3 template DatSach bang thu vien `docx` (v9.6.1), dam bao moi placeholder nam trong 1 `<w:t>` duy nhat.

**Files tao moi:**
- `FileMau/DatSach/giay_de_nghi_in.docx` - 20 placeholders (sach, tac gia, BBT, so luong, ngay thang nam...)
- `FileMau/DatSach/phieu_chi_dinh_co_so_in.docx` - 17 placeholders (phuong thuc, co so in, gia tri hop dong...)
- `FileMau/DatSach/quyet_dinh.docx` - 15 placeholders (ISBN, tac gia, so luong in, co so in...)

**Script:** `backend/scripts/generate-datsach-templates.js`

### 2.3 Backend aliases

**File:** `backend/src/dat-sach/dat-sach.controller.ts`

Thay the ham `replacePlaceholdersInXML` phuc tap bang ham don gian, hieu qua:
```typescript
function replacePlaceholdersInXML(content: string, replacements: Record<string, string>): string {
  let result = content;
  for (const [key, value] of Object.entries(replacements)) {
    const cleanKey = key.replace(/\s/g, '');
    const escaped = cleanKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const placeholder = new RegExp('\\{\\{\\s*' + escaped + '\\s*\\}\\}', 'g');
    const xmlValue = String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
    result = result.replace(placeholder, xmlValue);
  }
  return result;
}
```

Them 3 helper functions de build replacements cho tung template:
- `buildGDNReplacements()` - 21 fields
- `buildPCDIReplacements()` - 17 fields
- `buildQDReplacements()` - 15 fields

**File:** `backend/src/contractor-selection/lcnt-docx-generator.ts`

Them aliases cho cac truong bi loi:
```typescript
'LoaiHopDong': 'LoaiHopDong',
'NoiDungBaoHiem': 'NoiDungBaoHiem',
'MaSoHĐ': 'MaSoHD',
'ThoiDiemDongThau': 'ThoiDiemDongThau',
'ThoiGianDoiChieuTaiLieu': 'ThoiGianDoiChieuTaiLieu',
'tendonvicuatochuyengia': 'Tendonvicuatochuyengia',
```

---

## 3. Giai doan 2 - Sua luong nghiep vu DatSach

**File:** `frontend/src/app/dashboard/mua-sam/sach/dat-sach/[projectId]/page.tsx`

### 3.1 Fix user list modal

**Truoc:**
```typescript
api.getUsers().then(setUsers).catch(() => {});  // Silent failure
```

**Sau:**
```typescript
api.getUsers()
  .then(setUsers)
  .catch((err) => {
    toast.error('Khong the tai danh sach nguoi dung: ' + (err?.message || 'Loi khong xac dinh'));
  });
```

### 3.2 Role check cho cac nut duyet

**Them bien kiem tra quyen:**
```typescript
const canApprove = user && ['ADMIN', 'HEAD_OF_DEPARTMENT', 'DIRECTOR'].includes(user.role);
```

**Hien thi tooltip cho nguoi khong co quyen:**
```typescript
{!canApprove ? (
  <button disabled className="..." title="Chi Truong phong hoac Giam doc moi duoc duyet GDN">
    Duyet GDN
  </button>
) : (
  <button onClick={handleApproveGDN} className="...">
    Duyet GDN
  </button>
)}
```

**Catch 403 error:**
```typescript
.catch((err) => {
  if (err?.status === 403 || err?.message?.includes('403')) {
    toast.error('Ban khong co quyen duyet GDN. Chi Truong phong hoac Giam doc moi duoc duyet.');
  } else {
    toast.error(err?.message || 'Loi khi duyet GDN');
  }
});
```

Ap dung cho: Duyet GDN, Duyet PCDI, Duyet & Hoan thanh QD.

### 3.3 Fix NotificationService web-push

**File:** `backend/src/notifications/notification.service.ts`

Loi `Cannot read properties of undefined (reading 'setVapidDetails')` khi web-push chua duoc initialize.

**Fix:**
```typescript
if (!vapidPublicKey || !vapidPrivateKey || !webpush) {
  return;
}
try {
  webpush.setVapidDetails(...);
} catch (e) {
  return;
}
```

---

## 4. Giai doan 3 - Tai kien truc Thu Vien Van Ban theo phan he

### 4.1 Database Schema

**File:** `backend/prisma/schema.prisma`

Them 7 LibraryType moi:
```prisma
DAT_SACH_GDN      // GDN: tenSach, tacGia, bbt, namXB, soTrang, khoSach, giaBia...
DAT_SACH_PCDI     // PCDI: bbt, phuongThuc, tenSach, tacGia, soLuongIn...
DAT_SACH_QD       // QD: tacGia, ngonNgu, khuonKho, soLuongIn, isbn...
DUTOAN_TT         // ToTrinh DuToan: tenDuAn, chuDauTu, nguonVon...
DUTOAN_QD         // Quyet dinh DuToan: tenDuAn, soQuyetDinh...
KHLCNT            // KHLCNT: tenDuAn, chuDauTu, nguonVon...
LCNT_STEP        // LCNT step: chu dau tu + nha thau
```

**Thay doi constraint:** `khoa` tu global `@unique` thanh composite `@@unique([libraryId, khoa])` de cung field key co the dung lai nhieu thu vien.

### 4.2 Seed Data

**File:** `backend/prisma/seed-module-libraries.ts`

Da tao **8 thu vien** voi **77 fields** theo phan he. Dac biet, field keys = form field names:

| Thu vien | So fields | Keys chinh |
|---|---|---|
| Mau GDN Dat sach | 13 | tenSach, tacGia, bbt, namXB, soTrang, khoSach, giaBia, soLuongTon, thoiGianCanSach, deNghiNoiIn, ghiChu, vuKHTKBT, banBienTap |
| Mau PCDI Dat sach | 10 | bbt, phuongThuc, tenSach, tacGia, soTrang, khoSach, soLuongIn, giaTriHopDong, coSoIn, thongSoKyThuat |
| Mau QD Dat sach | 9 | tacGia, ngonNgu, khuonKho, soTrangCuaXuatBanPhamIn, soLuongIn, doiTacLienKet, tenBienTapVien, coSoIn, isbn |
| Mau ToTrinh DuToan | 11 | tenDuAn, chuDauTu, diaDanh, donViTrinh, nguonVon, diaDiemThucHien, thoiGianThucHien, tongMucDauTu, soQuyetDinh, donViMuaSam, canCuPhapLy |
| Mau QD DuToan | 8 | tenDuAn, soQuyetDinh, chuDauTu, nguonVon, diaDiemThucHien, tongMucDauTu, diaDanh, donViTrinh |
| Mau KHLCNT | 8 | tenDuAn, chuDauTu, nguonVon, diaDiemThucHien, giaTriHopDong, hinhThucLuaChon, soQuyetDinh, diaDanh |
| Mau thong tin CDT | 9 | tenChuDauTu, diaChiChuDauTu, maSoThueCDT, daiDienChuDauTu, chucVuCDT, soTaiKhoanCDT, nganHangCDT, dienThoaiCDT, emailCDT |
| Mau thong tin NT | 9 | tenNhaThau, diaChiNhaThau, maSoThueNhaThau, daiDienNhaThau, chucVuNT, soTaiKhoanNT, nganHangNT, dienThoaiNT, emailNT |

### 4.3 Backend Service

**File:** `backend/src/document-library/document-library.service.ts`

Them method:
```typescript
async findLibrariesByTypes(types: LibraryType[]) {
  return this.prisma.library.findMany({
    where: { type: { in: types } },
    include: { organization: true, fields: { orderBy: { thuTu: 'asc' } }, _count: { select: { savedValues: true } } },
  });
}
```

**File:** `backend/src/document-library/document-library.controller.ts`

Them endpoint:
```
POST /document-library/libraries/by-types
Body: { types: LibraryType[] }
```

### 4.4 Frontend

**File:** `frontend/src/lib/document-library-types.ts`

Them types:
```typescript
export type ModuleLibraryType =
  | 'DAT_SACH_GDN' | 'DAT_SACH_PCDI' | 'DAT_SACH_QD'
  | 'DUTOAN_TT' | 'DUTOAN_QD'
  | 'KHLCNT'
  | 'LCNT_STEP';
```

**File:** `frontend/src/components/LibraryPicker.tsx`

Component ho tro prop `module?: ModuleLibraryType`. Khi co `module`, tu dong fetch thu vien theo type.

**File:** `frontend/src/app/dashboard/admin/thu-vien-van-ban/page.tsx`

Them 7 library type moi vao admin UI voi mau sac phan biet.

---

## 5. Kiem thu - Ket qua day du

### 5.1 Docker deployment

```
qlda_postgres_1   Up (healthy)
qlda_backend_1    Up
qlda_frontend_1  Up
qlda_nginx_1     Up
```

Prisma migration da apply. Seed module-based libraries da chay thanh cong.

### 5.2 Full Workflow Test

Script: `backend/scripts/test-datsach-full-workflow.js`

**Cac buoc test:**
1. Login as admin
2. Lay thong tin nguoi dung
3. Tao DatSach project
4. Tao GDN voi day du du lieu (ten sach, tac gia, BBT, nam XB, so trang, kho sach, gia bia, so luong ton, so luong de nghi in, thoi gian can sach, de nghi noi in, ghi chu)
5. Gan nhan vien va fill so luong
6. Duyet GDN
7. Tao PCDI voi day du du lieu
8. Duyet PCDI
9. Tao QD data
10. Duyet QD
11. Download va kiem tra 3 DOCX

**Ket qua GDN:**
```
OK [tenSach] "Lich Su Dang Cong San Viet Nam" -> FOUND
OK [tacGia] "PGS.TS. Nguyen Van A" -> FOUND
OK [bbt] "Hoi dong Bien tap" -> FOUND
OK [namXB] "2025" -> FOUND
OK [soTrang] "864" -> FOUND
OK [khoSach] "16x24cm" -> FOUND
OK [giaBia] "120.000" -> FOUND
OK [slDeNghiIn] "5000" -> FOUND
OK [thoiGianCanSach] "30 ngay" -> FOUND
OK [deNghiNoiIn] "Nha in NXB Chinh tri" -> FOUND
No blank placeholders found!
```

**Ket qua PCDI:**
```
OK [tenSach] "Lich Su Dang" -> FOUND
OK [tacGia] "PGS.TS. Nguyen Van A" -> FOUND
OK [bbt] "Hoi dong Bien tap" -> FOUND
OK [phuongThuc] "In offset" -> FOUND
OK [coSoIn] "Nha in NXB Chinh tri" -> FOUND
OK [soLuongIn] "5000" -> FOUND
No blank placeholders found!
```

**Ket qua QD:**
```
OK [tacGia] "PGS.TS. Nguyen Van A" -> FOUND
OK [ngonNgu] "Tieng Viet" -> FOUND
OK [khuonKho] "16x24cm" -> FOUND
OK [soLuongIn] "5000" -> FOUND
OK [isbn] "978-604-57-1234-5" -> FOUND
OK [coSoIn] "Nha in NXB Chinh tri" -> FOUND
No blank placeholders found!
```

**Tong ket:**
- GDN: 10/10 fields PASS, 0 blank placeholders
- PCDI: 6/6 fields PASS, 0 blank placeholders
- QD: 6/6 fields PASS, 0 blank placeholders
- Tat ca 3 DOCX hoan toan fill dung

---

## 6. Cong viec con lai

### 6.1 Quan trong

| # | Cong viec | Uu tien | Ghi chu |
|---|---|---|---|
| 1 | Danh sach nguoi dung trong he thong | Cao | Hien tai `api.getUsers()` tra ve 0 user. Can kiem tra user seed data |
| 2 | Build lai frontend Docker image | Cao | Frontend chua duoc rebuild sau khi them lucide-react va LibraryPicker updates |
| 3 | Ket noi frontend voi thu vien van ban theo phan he | Trung binh | LibraryPicker da co prop `module`, can update cac form page de su dung dung |
| 4 | Test LCNT docx generation | Trung binh | Da sua alias nhung chua test thuc te |
| 5 | Test DuToan docx generation | Trung binh | Template da duoc fix, can test voi du lieu that |

### 6.2 Luu y trien khai

**Sau khi merge code, can chay:**

```bash
# 1. Rebuild backend
cd /home/pcloud/qlda
docker-compose build backend

# 2. Rebuild frontend (neu co thay doi)
docker-compose build frontend

# 3. Restart tat ca
docker-compose up -d

# 4. Apply migrations (neu co thay doi schema)
docker-compose exec backend npx prisma migrate deploy

# 5. Chay seed moi
docker-compose exec backend node dist/prisma/seed-module-libraries.js
```

---

## 7. Files da thay doi

### Backend

| File | Thay doi |
|---|---|
| `src/dat-sach/dat-sach.controller.ts` | Viet lai replacement logic, them helper functions, fix regex |
| `src/contractor-selection/lcnt-docx-generator.ts` | Them aliases cho broken placeholders |
| `src/notifications/notification.service.ts` | Fix web-push null reference |
| `prisma/schema.prisma` | Them 7 LibraryType, doi khoa constraint |
| `prisma/seed-module-libraries.ts` | Seed 8 thu vien theo phan he |
| `src/document-library/document-library.service.ts` | Them findLibrariesByTypes |
| `src/document-library/document-library.controller.ts` | Them endpoint by-types |
| `scripts/fix-docx-placeholders.js` | Script fix 13 DOCX files |
| `scripts/generate-datsach-templates.js` | Script tao 3 template DatSach sach |
| `scripts/test-datsach-full-workflow.js` | Script test full workflow |

### Frontend

| File | Thay doi |
|---|---|
| `src/app/dashboard/mua-sam/sach/dat-sach/[projectId]/page.tsx` | Fix user list error, role check, 403 error handling |
| `src/lib/document-library-types.ts` | Them ModuleLibraryType |
| `src/lib/api.ts` | Doi ten getPermissions thanh getAllPermissions |
| `src/components/LibraryPicker.tsx` | Ho tro prop module |
| `src/app/dashboard/admin/thu-vien-van-ban/page.tsx` | Ho tro 7 type moi |
| `src/app/dashboard/quan-ly/phan-quyen/page.tsx` | Import lucide-react |

---

*Bao cao nay duoc tao tu dong boi Claude Code sau khi trien khai sua chinh he thong.*
