# ============================================================
# Document Library - Frontend Test Checklist
# ============================================================
# How to use: Follow each step, mark [x] when completed.
# ============================================================

## Prerequisites
- [ ] Backend server running on http://localhost:4000
- [ ] Frontend running on http://localhost:3000
- [ ] Database migrated (`prisma migrate dev`)
- [ ] Database seeded (`prisma seed`)
- [ ] Logged in as ADMIN (admin@qlda.vn / password123)

---

## 1. Admin Panel - Thư viện Văn Bản Page

### 1.1 Navigate to Page
- [ ] Open browser to http://localhost:3000/dashboard/admin/thu-vien-van-ban
- [ ] Verify page loads without errors
- [ ] Verify "Thư viện Văn Bản" page title appears
- [ ] Verify sidebar shows "Thư viện Văn Bản" menu item under "Quản lý hệ thống"

### 1.2 Organization Tab (Tab Tổ chức)
- [ ] Default tab is "Tổ chức"
- [ ] Verify 2 seeded organizations appear:
  - [ ] "Tổ chức A - Chủ đầu tư"
  - [ ] "Tổ chức B - Nhà thầu"
- [ ] Click "Thêm Tổ chức" button
  - [ ] Modal/form appears
  - [ ] Enter name: "Test Organization"
  - [ ] Enter description: "Created by test"
  - [ ] Click "Lưu"
  - [ ] New organization appears in the list
  - [ ] Success toast notification appears
- [ ] Edit an organization:
  - [ ] Click edit icon on any org
  - [ ] Change name to "Updated Name"
  - [ ] Click "Lưu"
  - [ ] Changes reflected in the list
- [ ] Delete the test organization:
  - [ ] Click delete icon
  - [ ] Confirm deletion in browser prompt
  - [ ] Organization removed from list

### 1.3 Library Tab (Tab Thư viện)
- [ ] Click on an organization (e.g., "Tổ chức A")
- [ ] Verify tab changes to "Thư viện"
- [ ] Verify 2 seeded libraries appear:
  - [ ] "Thông tin Chủ đầu tư" (loại: THONG_TIN_TO_CHUC)
  - [ ] "Thông tin người ký CDT" (loại: KY_TUONG)
- [ ] Click "Thêm Thư viện" button
  - [ ] Enter name: "Test Library"
  - [ ] Select loại: "Tuỳ chỉnh"
  - [ ] Click "Lưu"
  - [ ] New library appears
- [ ] Edit library:
  - [ ] Click edit icon
  - [ ] Change name to "Updated Library"
  - [ ] Click "Lưu"
- [ ] Click "Quản lý" button on a library
  - [ ] Tab changes to "Giá trị đã lưu"
  - [ ] Fields table shows columns: Tên trường, Khoá, Kiểu, Nhóm, Bắt buộc, Thao tác

### 1.4 Fields Management
- [ ] Verify seeded fields display (for CDT library, should have 9+ fields):
  - Tên công ty, Địa chỉ, Mã số thuế, Số tài khoản, Ngân hàng,
    Đại diện theo pháp luật, Chức vụ, Email, Điện thoại
- [ ] Verify field icons display (FieldTypeIcon)
- [ ] Verify FieldType labels show correctly (Văn bản, Email, Số điện thoại, etc.)
- [ ] Click "Thêm Trường" button
  - [ ] Form appears with fields: Tên trường, Khoá, Kiểu dữ liệu, Nhóm, Giá trị mặc định, Thứ tự, Bắt buộc
  - [ ] Enter: Tên="Website", Khoá="website_url", Kiểu="URL"
  - [ ] Select: TEXT type
  - [ ] Click "Lưu Trường"
  - [ ] New field appears in the table
- [ ] Edit field:
  - [ ] Click edit icon
  - [ ] Change Tên to "Website (Updated)"
  - [ ] Click "Lưu Trường"
  - [ ] Changes reflected
- [ ] Delete field:
  - [ ] Click delete icon
  - [ ] Confirm deletion
  - [ ] Field removed from table

### 1.5 Saved Values Management
- [ ] Verify "Lưu Giá trị" button is visible
- [ ] Click "Lưu Giá trị" button
  - [ ] Form appears with all fields from the library
  - [ ] Enter: Tên giá trị="Công ty Test Manual"
  - [ ] Fill in some fields
  - [ ] Click "Lưu giá trị"
  - [ ] New value appears in the Saved Values table
- [ ] Edit saved value:
  - [ ] Click edit icon
  - [ ] Change Tên giá trị
  - [ ] Click "Cập nhật"
  - [ ] Changes reflected
- [ ] Delete saved value:
  - [ ] Click delete icon
  - [ ] Confirm deletion
  - [ ] Value removed from table

---

## 2. LCNT Workflow - Library Picker Integration

### 2.1 Navigate to LCNT Step
- [ ] Go to http://localhost:3000/dashboard/lua-chon-nha-thau
- [ ] Select a project with LCNT steps
- [ ] Click on a step (e.g., "Thu mời hoàn thiện" or "Hợp đồng")
- [ ] Verify the step page loads

### 2.2 Library Picker Buttons
- [ ] Verify "Thư viện văn bản" section appears above the form
- [ ] Verify 2 buttons: "Từ thư viện" (appears twice - one for CDT, one for NT)
- [ ] Verify "Lưu vào thư viện" green button is visible

### 2.3 Fill Form and Save to Library
- [ ] Fill in some form fields (e.g., "Chủ đầu tư" field)
- [ ] Click "Lưu vào thư viện"
  - [ ] Modal appears with:
    - [ ] Dropdown to select library
    - [ ] Text field for "Tên giá trị"
    - [ ] Preview of data to be saved
  - [ ] Select library: "Thông tin Chủ đầu tư"
  - [ ] Enter name: "Test Save from Form"
  - [ ] Click "Lưu vào thư viện"
  - [ ] Success toast appears
  - [ ] Modal closes

### 2.4 Load from Library
- [ ] Click "Từ thư viện" button (CDT)
  - [ ] Dropdown opens
  - [ ] Shows list of saved values
  - [ ] Click on "Test Save from Form" (or any existing value)
  - [ ] Form fields are auto-filled with the saved values
  - [ ] Success toast appears

### 2.5 Verify Auto-Fill
- [ ] Check that multiple fields are filled simultaneously
- [ ] Verify the data matches what was saved
- [ ] Verify existing form data is not lost (merged correctly)

---

## 3. Navigation & UI

### 3.1 Sidebar
- [ ] Navigate to different admin pages, then back
- [ ] Verify sidebar "Thư viện Văn Bản" link is accessible
- [ ] Verify page does NOT break when navigating away and back

### 3.2 Error Handling
- [ ] Try accessing as a non-admin user (investor role)
  - [ ] Admin pages should be protected (redirect or 403)
- [ ] Try accessing as unauthenticated user
  - [ ] Should redirect to login

---

## 4. Edge Cases

### 4.1 Empty States
- [ ] Create a new library with no fields
  - [ ] "Chưa có trường nào" message appears
  - [ ] "Chưa có giá trị nào" message appears
- [ ] Filter to an organization with no libraries
  - [ ] "Chưa có thư viện nào" message appears

### 4.2 Library Picker with Empty Libraries
- [ ] On LCNT step page, if no library exists for the type:
  - [ ] Picker shows "Chưa có thư viện cho loại này"
  - [ ] No crash or error

### 4.3 Form Validation
- [ ] Try to create organization with empty name
  - [ ] Browser native validation prevents submission
- [ ] Try to create field with empty khoá
  - [ ] Validation prevents submission

### 4.4 Duplicate Key Handling
- [ ] Try to create a field with existing khoá
  - [ ] Backend returns 400 error
  - [ ] Error toast appears on frontend

---

## 5. Performance & UX

### 5.1 Loading States
- [ ] Page load shows loading spinner
- [ ] After page loads, spinner disappears
- [ ] CRUD operations show appropriate loading state

### 5.2 Responsive Layout
- [ ] On mobile/narrow viewport:
  - [ ] Layout doesn't break
  - [ ] Sidebar remains accessible
  - [ ] Tables scroll horizontally if needed

### 5.3 Toasts
- [ ] Success operations show success toast (green)
- [ ] Error operations show error toast (red)
- [ ] Toasts disappear after ~3 seconds

---

## Test Results Summary

| # | Test | Status | Notes |
|---|------|--------|-------|
| 1 | Navigate to page | [ ] | |
| 2 | View seeded organizations | [ ] | |
| 3 | Create organization | [ ] | |
| 4 | Edit organization | [ ] | |
| 5 | Delete organization | [ ] | |
| 6 | View seeded libraries | [ ] | |
| 7 | Create library | [ ] | |
| 8 | View seeded fields | [ ] | |
| 9 | Create field | [ ] | |
| 10 | Edit field | [ ] | |
| 11 | Delete field | [ ] | |
| 12 | Save form to library | [ ] | |
| 13 | Load from library picker | [ ] | |
| 14 | Empty states work | [ ] | |
| 15 | Error handling | [ ] | |
| 16 | Duplicate key rejection | [ ] | |

**Total Passed:** __ / 16
**Date:** _________________
**Tester:** ________________
