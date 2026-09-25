# KẾ HOẠCH REFACTOR GIAO DIỆN HỆ THỐNG QUẢN LÝ ĐẤU THẦU

## 1. Thông tin chung

**Đơn vị:** Nhà xuất bản Chính trị quốc gia Sự thật  
**Loại hệ thống:** Hệ thống quản lý đấu thầu và văn bản nội bộ  
**Định hướng giao diện:** Trang trọng, tối giản, dễ sử dụng, phù hợp với hệ thống quản lý nhà nước  
**Màu chủ đạo:** Đỏ đô, trắng và xám trung tính

---

## 2. Mục tiêu refactor

Việc refactor giao diện cần đạt các mục tiêu sau:

- Đồng bộ toàn bộ hệ thống theo một bộ màu thống nhất.
- Giảm số lượng màu đang sử dụng.
- Loại bỏ các màu tím, xanh dương, xanh ngọc và cam mang tính trang trí.
- Tăng cảm giác chính thống, nghiêm túc và đáng tin cậy.
- Tăng khả năng đọc dữ liệu trên các màn hình bảng biểu.
- Giảm số lượng nút và badge xuất hiện cùng lúc.
- Chuẩn hóa các thành phần giao diện để dễ bảo trì.
- Hỗ trợ tốt màn hình máy tính văn phòng phổ biến.
- Bảo đảm giao diện vẫn rõ ràng khi người dùng zoom trình duyệt.
- Hạn chế thay đổi luồng nghiệp vụ hiện tại.

---

## 3. Nguyên tắc thiết kế

### 3.1. Nguyên tắc màu sắc

Toàn bộ hệ thống sử dụng ba nhóm màu chính:

1. **Đỏ đô:** màu thương hiệu, trạng thái active, nút chính.
2. **Trắng:** nền card, sidebar, bảng, form.
3. **Xám trung tính:** nền trang, đường viền, chữ phụ, trạng thái trung tính.

Màu xanh lá và vàng chỉ được sử dụng cho trạng thái nghiệp vụ.

### 3.2. Tỉ lệ màu đề xuất

- Trắng: 75%
- Xám trung tính: 15%
- Đỏ đô: 8%
- Màu trạng thái: 2%

### 3.3. Những màu cần loại bỏ

- Tím.
- Xanh dương làm màu chính.
- Xanh ngọc.
- Cam trang trí.
- Gradient.
- Mỗi module một màu riêng.
- Mỗi nút một màu khác nhau.

### 3.4. Nguyên tắc hình khối

- Bo góc vừa phải.
- Không sử dụng card quá tròn.
- Không sử dụng hiệu ứng glassmorphism.
- Không dùng shadow quá đậm.
- Ưu tiên đường viền nhẹ và bố cục rõ ràng.
- Không sử dụng quá nhiều khối nền màu.

---

## 4. Bộ màu chuẩn

```css
:root {
  /* Brand */
  --primary-900: #5E1016;
  --primary-800: #74151C;
  --primary-700: #8B1E24;
  --primary-600: #A2262D;
  --primary-100: #F5E7E8;
  --primary-50: #FCF5F5;

  /* Neutral */
  --white: #FFFFFF;
  --page-bg: #F7F7F8;
  --surface-subtle: #FAFAFA;

  --text-primary: #1F2328;
  --text-secondary: #667085;
  --text-muted: #98A2B3;

  --border: #E4E7EC;
  --border-strong: #D0D5DD;

  /* Status */
  --success: #287A4B;
  --success-bg: #EDF7F1;

  --warning: #9A6700;
  --warning-bg: #FFF8E6;

  --danger: #B42318;
  --danger-bg: #FEF3F2;
}
```

### 4.1. Màu chính

| Vai trò | Màu |
|---|---|
| Màu chủ đạo | `#8B1E24` |
| Đỏ đậm | `#5E1016` |
| Đỏ hover | `#74151C` |
| Nền đỏ nhạt | `#F5E7E8` |
| Nền đỏ rất nhạt | `#FCF5F5` |
| Nền trang | `#F7F7F8` |
| Nền card | `#FFFFFF` |
| Chữ chính | `#1F2328` |
| Chữ phụ | `#667085` |
| Viền | `#E4E7EC` |

---

## 5. Typography

### 5.1. Font chữ

```css
font-family: "Inter", "Segoe UI", Arial, sans-serif;
```

### 5.2. Thang kích thước chữ

```css
--text-xs: 12px;
--text-sm: 14px;
--text-md: 16px;
--text-lg: 18px;
--heading-sm: 20px;
--heading-md: 24px;
--heading-lg: 30px;
```

### 5.3. Quy tắc sử dụng

- Nội dung bảng: 14px.
- Nội dung form: 14–15px.
- Tiêu đề section: 18–20px.
- Tiêu đề trang: 28–30px.
- Text phụ không nhạt hơn `#667085`.
- Hạn chế sử dụng font-weight 700 trên diện rộng.
- Dùng font-weight 600 cho menu active, tiêu đề bảng và nút.

---

## 6. Spacing và bo góc

### 6.1. Hệ spacing

```text
4px, 8px, 12px, 16px, 20px, 24px, 32px, 40px, 48px
```

### 6.2. Border radius

```css
--radius-sm: 6px;
--radius-md: 8px;
--radius-lg: 10px;
--radius-pill: 999px;
```

### 6.3. Áp dụng

- Button: 6px.
- Input: 6px.
- Card: 8px.
- Modal: 10px.
- Badge trạng thái: dạng pill.
- Không dùng bo góc lớn hơn 12px cho các khối nghiệp vụ.

---

## 7. Kế hoạch refactor theo khu vực

## 7.1. Sidebar

### Hiện trạng

- Sidebar hơi rộng.
- Menu active dùng nền màu nhưng chưa có hệ thống rõ ràng.
- Các icon đang sử dụng nhiều màu.
- Nhóm menu con chưa đồng nhất.
- Khu vực chuyển vai trò chưa đủ nổi bật.

### Thiết kế mới

```css
--sidebar-width: 256px;
--sidebar-collapsed-width: 72px;
```

### Quy tắc

- Nền sidebar: trắng.
- Viền phải: `#E4E7EC`.
- Icon mặc định: xám.
- Text mặc định: `#344054`.
- Hover: nền đỏ rất nhạt.
- Active: nền đỏ nhạt, chữ đỏ đô, có thanh đỏ bên trái.
- Không tô màu icon theo module.
- Menu con lùi vào 16–20px.
- Khu vực hồ sơ người dùng cố định phía dưới.

### CSS gợi ý

```css
.sidebar-item {
  color: #344054;
  background: transparent;
}

.sidebar-item:hover {
  color: #74151C;
  background: #FCF5F5;
}

.sidebar-item.active {
  color: #8B1E24;
  background: #F5E7E8;
  border-left: 3px solid #8B1E24;
  font-weight: 600;
}
```

---

## 7.2. Header và tiêu đề trang

### Cấu trúc chuẩn

```text
Breadcrumb

Tiêu đề trang                        Nút phụ | Nút chính
Mô tả ngắn
```

### Quy tắc

- Bổ sung breadcrumb ở các màn hình sâu.
- H1 dùng màu chữ đậm hoặc đỏ đậm.
- Mô tả dùng màu xám.
- Không để quá hai nút nổi bật ở góc phải.
- Nút chính dùng đỏ đô.
- Nút phụ dùng outline hoặc neutral.
- Khoảng cách dưới tiêu đề: 20–24px.

---

## 7.3. Button

Toàn hệ thống chỉ sử dụng bốn loại nút.

### Primary

Dùng cho hành động chính:

- Tạo hồ sơ.
- Lưu.
- Trình phê duyệt.
- Ban hành.
- Xác nhận.

```css
.btn-primary {
  background: #8B1E24;
  color: #FFFFFF;
}
```

### Secondary

Dùng cho hành động phụ có liên quan đến thương hiệu:

```css
.btn-secondary {
  background: #FFFFFF;
  color: #74151C;
  border: 1px solid #8B1E24;
}
```

### Neutral

Dùng cho thao tác thông thường:

```css
.btn-neutral {
  background: #FFFFFF;
  color: #344054;
  border: 1px solid #D0D5DD;
}
```

### Danger

Chỉ dùng cho:

- Xóa.
- Hủy.
- Từ chối.
- Thu hồi.

### Quy tắc

- Không dùng nút tím.
- Không dùng nút xanh dương.
- Không dùng gradient.
- Không dùng hai nút primary cạnh nhau.
- Các nút nhỏ trong bảng nên chuyển về dạng ghost hoặc menu ba chấm.

---

## 7.4. Input, Select và bộ lọc

### Thiết kế mới

- Nền trắng.
- Viền xám.
- Focus đỏ đô.
- Error đỏ cảnh báo.
- Không sử dụng nền xanh nhạt diện tích lớn.
- Chiều cao mặc định 40–44px.

```css
.input,
.select {
  height: 40px;
  border: 1px solid #D0D5DD;
  border-radius: 6px;
  background: #FFFFFF;
}

.input:focus,
.select:focus {
  border-color: #8B1E24;
  box-shadow: 0 0 0 3px rgba(139, 30, 36, 0.10);
}
```

### Bố cục bộ lọc

```text
Từ khóa | Dự án | Trạng thái | Từ ngày | Đến ngày | Xóa bộ lọc
```

### Quy tắc

- Gom các điều kiện lọc vào một khu vực rõ ràng.
- Không đặt mỗi bộ lọc trong một card riêng.
- Có nút xóa bộ lọc.
- Hạn chế chiều cao khu vực filter.
- Trên màn hình nhỏ, cho phép xuống hàng theo nhóm.

---

## 7.5. Card

### Thiết kế mới

```css
.card {
  background: #FFFFFF;
  border: 1px solid #E4E7EC;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.03);
}
```

### Quy tắc

- Không dùng nhiều màu nền cho từng card.
- Không dùng shadow đậm.
- Card thống kê dùng cùng một kiểu.
- Chỉ icon hoặc chi tiết nhỏ sử dụng đỏ nhạt.
- Con số chính ưu tiên đỏ đô hoặc màu chữ đậm.

---

## 7.6. Dashboard

### Card thống kê

Giữ bốn card:

- Tổng dự án.
- Đang thực hiện.
- Hoàn thành.
- Đã hủy.

### Thiết kế

- Nền trắng.
- Viền xám.
- Số liệu màu đỏ đô.
- Nhãn màu xám.
- Icon đỏ đô trên nền đỏ nhạt.
- Không dùng mỗi card một màu.

### Khu vực dự án gần đây

- Tiêu đề rõ ràng.
- Trạng thái dùng badge nhỏ.
- Ngày tháng cùng một định dạng.
- Nút “Xem tất cả” dùng link đỏ đô.
- Tăng độ rõ của đường phân cách.

### Khu vực thao tác nhanh

Hiện tại đang dùng nhiều màu nền khác nhau. Cần đổi thành:

```css
.quick-action {
  background: #FAFAFA;
  color: #344054;
  border: 1px solid #E4E7EC;
}

.quick-action:hover {
  background: #FCF5F5;
  color: #8B1E24;
  border-color: #D8AEB1;
}
```

---

## 7.7. Table

### Thiết kế mới

- Header bảng nền xám rất nhạt.
- Dòng dữ liệu nền trắng.
- Hover nền đỏ rất nhạt.
- Link màu đỏ đô.
- Viền hàng nhẹ.
- Row cao khoảng 56–64px.
- Căn giữa hợp lý với các cột số, ngày, trạng thái.

```css
.table thead {
  background: #F7F7F8;
}

.table tbody tr:hover {
  background: #FCF5F5;
}

.table a {
  color: #8B1E24;
}
```

### Cột thao tác

Không hiển thị quá nhiều nút cùng lúc.

Thay vì:

```text
Xem | DOCX | Phiếu trình ký | Tải bộ hồ sơ | Phụ lục | Đổi phụ lục
```

Sử dụng:

```text
Xem hồ sơ | Tải xuống | ...
```

Menu ba chấm chứa:

- Tải DOCX.
- Phiếu trình ký.
- Tải bộ hồ sơ.
- Tải phụ lục.
- Đổi phụ lục.
- Xem lịch sử.

### Quy tắc

- Badge không xuống dòng.
- Số văn bản không tự ngắt dòng.
- Tên dự án dài được giới hạn tối đa hai dòng.
- Cột thao tác cố định bên phải nếu bảng rộng.
- Có empty state và loading state rõ ràng.

---

## 7.8. Badge trạng thái

Chỉ dùng màu ngoài đỏ đô cho trạng thái nghiệp vụ.

| Trạng thái | Màu chữ | Màu nền |
|---|---|---|
| Bản nháp | Xám đậm | Xám nhạt |
| Chờ phê duyệt | Vàng trầm | Vàng nhạt |
| Đang xử lý | Đỏ đô | Đỏ nhạt |
| Đã phê duyệt | Xanh lá trầm | Xanh lá nhạt |
| Từ chối | Đỏ cảnh báo | Đỏ rất nhạt |
| Đã hủy | Xám đậm | Xám nhạt |
| Hết hiệu lực | Xám đậm | Xám nhạt |

```css
.status-processing {
  color: #74151C;
  background: #F5E7E8;
}

.status-approved {
  color: #287A4B;
  background: #EDF7F1;
}

.status-pending {
  color: #9A6700;
  background: #FFF8E6;
}
```

### Quy tắc

- Badge cao khoảng 24px.
- Dùng font-size 12–13px.
- Không xuống dòng.
- Không chỉ dùng màu để truyền đạt ý nghĩa.
- Có thể bổ sung icon nhỏ khi cần.

---

## 7.9. Tabs

### Thiết kế mới

Tất cả tab dùng cùng một hệ màu.

```css
.tab {
  background: #FFFFFF;
  color: #475467;
  border: 1px solid #E4E7EC;
}

.tab.active {
  background: #F5E7E8;
  color: #8B1E24;
  border-color: #D8AEB1;
}
```

### Badge số lượng

```css
.tab-count {
  background: #EFEFF0;
  color: #475467;
}

.tab.active .tab-count {
  background: #8B1E24;
  color: #FFFFFF;
}
```

### Quy tắc

- Không dùng mỗi tab một màu.
- Không dùng tím, xanh, cam.
- Tab active phải rõ bằng nền, viền hoặc thanh dưới.
- Số lượng hiển thị nhỏ gọn.

---

## 7.10. Stepper quy trình

Áp dụng cho các luồng:

- Phiếu trình ký.
- Tờ trình.
- Quyết định.
- Dự toán.
- Kế hoạch LCNT.
- Lựa chọn nhà thầu.
- Thanh toán.

### Trạng thái step

- Hoàn thành: xanh lá trầm.
- Đang thực hiện: đỏ đô.
- Chưa thực hiện: xám.
- Cần bổ sung: vàng trầm.
- Có lỗi: đỏ cảnh báo.

### Cấu trúc

```text
1. Phiếu trình ký ─── 2. Tờ trình ─── 3. Quyết định
```

### Thông tin kèm theo

- Người xử lý.
- Ngày hoàn thành.
- Trạng thái.
- Ghi chú.
- Nút xem hồ sơ.

---

## 7.11. Kho văn bản

### Các thay đổi cần thực hiện

- Bỏ màu riêng cho từng tab.
- Dùng đỏ đô cho tab active.
- Giảm chiều cao khu vực bộ lọc.
- Thống nhất icon.
- Link “Mở hồ sơ” dùng đỏ đô.
- Cột thao tác dùng icon và menu ba chấm.
- Ngày cập nhật cùng định dạng.
- Cột tên văn bản giới hạn tối đa hai dòng.
- Danh mục văn bản dùng badge đỏ nhạt hoặc xám.
- Trạng thái dùng semantic color theo quy chuẩn.

---

## 8. Cấu trúc màn hình chuẩn

```text
Breadcrumb

Tiêu đề trang                                Nút phụ | Nút chính
Mô tả ngắn

Bộ lọc
[Từ khóa] [Dự án] [Trạng thái] [Từ ngày] [Đến ngày]

Khối thống kê hoặc tiến trình

Danh sách dữ liệu
-------------------------------------------------------------
Tên | Số văn bản | Dự án | Trạng thái | Cập nhật | Thao tác
-------------------------------------------------------------

Phân trang
```

Toàn bộ module nên bám theo cấu trúc này để người dùng không phải học lại cách sử dụng ở từng màn hình.

---

## 9. Kế hoạch triển khai theo giai đoạn

## Giai đoạn 1: Audit giao diện hiện tại

**Thời gian dự kiến:** 2–3 ngày

### Công việc

- Chụp toàn bộ màn hình hệ thống.
- Thống kê màu sắc đang sử dụng.
- Thống kê font-size.
- Thống kê border-radius.
- Thống kê shadow.
- Thống kê button variant.
- Thống kê badge trạng thái.
- Thống kê input, select, modal, table.
- Xác định component trùng lặp.
- Xác định CSS hard-code.
- Xác định các màn hình có layout khác chuẩn.

### Đầu ra

- UI inventory.
- Danh sách component.
- Bảng màu cũ và màu mới.
- Danh sách vấn đề cần ưu tiên.
- Danh sách màn hình refactor.

---

## Giai đoạn 2: Xây dựng design token

**Thời gian dự kiến:** 2–3 ngày

### Công việc

- Tạo token màu.
- Tạo token typography.
- Tạo token spacing.
- Tạo token radius.
- Tạo token shadow.
- Tạo token trạng thái.
- Tạo breakpoint.
- Tạo quy chuẩn icon.
- Tạo quy chuẩn focus và disabled.

### Đầu ra

- File theme hoặc CSS variables.
- Tài liệu quy chuẩn UI.
- Bảng mapping màu cũ sang màu mới.

---

## Giai đoạn 3: Refactor component nền tảng

**Thời gian dự kiến:** 5–8 ngày

### Thứ tự triển khai

1. Button.
2. Input.
3. Select.
4. Textarea.
5. Checkbox.
6. Radio.
7. Badge.
8. Card.
9. Table.
10. Tabs.
11. Dropdown.
12. Modal.
13. Stepper.
14. Tooltip.
15. Toast.
16. Pagination.
17. Empty state.
18. Skeleton loading.

### Trạng thái cần hỗ trợ

- Default.
- Hover.
- Active.
- Focus.
- Disabled.
- Loading.
- Error.
- Read-only.

---

## Giai đoạn 4: Refactor layout tổng thể

**Thời gian dự kiến:** 3–5 ngày

### Công việc

- Refactor sidebar.
- Refactor top header.
- Refactor page container.
- Bổ sung breadcrumb.
- Chuẩn hóa page title.
- Chuẩn hóa action area.
- Chuẩn hóa content padding.
- Chuẩn hóa responsive.
- Refactor khu vực hồ sơ người dùng.
- Refactor workspace switcher.

### Cấu hình gợi ý

```css
.page-content {
  max-width: 1600px;
  margin: 0 auto;
  padding: 24px 28px 40px;
}
```

---

## Giai đoạn 5: Refactor theo module

**Thời gian dự kiến:** 10–15 ngày

### Thứ tự ưu tiên

1. Tổng quan.
2. Quản lý dự án.
3. Phê duyệt dự toán.
4. Kế hoạch LCNT.
5. Lựa chọn nhà thầu.
6. Thanh toán.
7. Kho văn bản.
8. Phê duyệt chung.
9. Không gian Nhà thầu.

### Checklist cho từng module

- Tiêu đề trang.
- Breadcrumb.
- Nút chính.
- Bộ lọc.
- Card.
- Bảng dữ liệu.
- Badge.
- Modal.
- Loading state.
- Empty state.
- Error state.
- Phân quyền.
- Responsive.
- Kiểm tra dữ liệu dài.
- Kiểm tra trạng thái đặc biệt.

---

## Giai đoạn 6: Kiểm thử

**Thời gian dự kiến:** 4–6 ngày

### Kiểm thử giao diện

- Màn hình 1366 × 768.
- Màn hình 1920 × 1080.
- Zoom 100%.
- Zoom 125%.
- Zoom 150%.
- Sidebar nhiều menu.
- Bảng nhiều cột.
- Tên dự án dài.
- Số văn bản dài.
- Badge dài.
- Modal nội dung dài.
- Form nhiều trường.

### Kiểm thử accessibility

- Contrast chữ và nền.
- Focus state.
- Điều hướng bằng bàn phím.
- Kích thước vùng bấm.
- Nhãn input.
- Thông báo lỗi.
- Không truyền đạt trạng thái chỉ bằng màu.

### Kiểm thử nghiệp vụ

- Tạo hồ sơ.
- Sửa hồ sơ.
- Trình phê duyệt.
- Phê duyệt.
- Từ chối.
- Tải văn bản.
- Xuất DOCX.
- Chuyển vai trò.
- Phân quyền người dùng.

---

## Giai đoạn 7: Triển khai an toàn

**Thời gian dự kiến:** 3–5 ngày

### Phương án

- Refactor theo route.
- Sử dụng feature flag nếu có thể.
- Cho phép bật giao diện mới theo tài khoản.
- Chạy song song giao diện cũ và mới trong thời gian ngắn.
- Thu thập lỗi hiển thị.
- Ghi nhận phản hồi người dùng nội bộ.
- Sửa lỗi trước khi áp dụng toàn bộ.
- Loại bỏ CSS cũ sau khi ổn định.

---

## 10. Thứ tự ưu tiên sửa nhanh

Trong trường hợp chưa thể refactor toàn hệ thống, triển khai trước các hạng mục sau:

1. Thay toàn bộ nút tím và xanh dương bằng đỏ đô hoặc neutral.
2. Đưa sidebar về nền trắng, active đỏ nhạt.
3. Chuẩn hóa badge trạng thái.
4. Bỏ màu riêng cho từng tab.
5. Bỏ nền xanh nhạt ở khu vực chọn dự án.
6. Thu gọn cột thao tác trong bảng.
7. Đồng bộ card và border.
8. Tăng contrast chữ phụ.
9. Chuẩn hóa input focus màu đỏ đô.
10. Giảm sidebar xuống khoảng 256px.

---

## 11. Mapping màu cũ sang màu mới

| Màu hiện tại | Màu thay thế |
|---|---|
| Xanh dương primary | Đỏ đô `#8B1E24` |
| Tím | Đỏ đô hoặc neutral |
| Xanh ngọc | Xám trung tính |
| Cam trang trí | Xám trung tính |
| Nền xanh nhạt | Trắng hoặc `#F7F7F8` |
| Icon nhiều màu | Xám hoặc đỏ đô |
| Link xanh dương | Đỏ đô |
| Tab nhiều màu | Trắng, xám, đỏ nhạt |
| Button nhiều màu | Primary, secondary, neutral, danger |

---

## 12. Checklist nghiệm thu

### Màu sắc

- [ ] Không còn nút tím.
- [ ] Không còn nút xanh dương làm primary.
- [ ] Không còn tab nhiều màu.
- [ ] Không còn icon mỗi module một màu.
- [ ] Màu chủ đạo là đỏ đô.
- [ ] Xanh lá và vàng chỉ dùng cho trạng thái.
- [ ] Màu danger không bị nhầm với màu primary.

### Component

- [ ] Button có đủ trạng thái.
- [ ] Input có focus rõ ràng.
- [ ] Badge không xuống dòng.
- [ ] Table có hover.
- [ ] Cột thao tác được thu gọn.
- [ ] Modal thống nhất.
- [ ] Stepper thống nhất.
- [ ] Tabs thống nhất.

### Layout

- [ ] Sidebar rộng khoảng 256px.
- [ ] Page title thống nhất.
- [ ] Có breadcrumb.
- [ ] Padding các trang đồng nhất.
- [ ] Các card cùng kiểu.
- [ ] Bộ lọc không chiếm quá nhiều chiều cao.

### Accessibility

- [ ] Contrast đạt yêu cầu.
- [ ] Có focus state.
- [ ] Dùng được bằng bàn phím.
- [ ] Không chỉ dùng màu để biểu thị trạng thái.
- [ ] Vùng bấm đủ lớn.
- [ ] Text phụ không quá nhạt.

### Responsive

- [ ] Hoạt động tốt ở 1366 × 768.
- [ ] Hoạt động tốt ở Full HD.
- [ ] Hoạt động tốt khi zoom 125%.
- [ ] Hoạt động tốt khi zoom 150%.
- [ ] Bảng rộng có xử lý scroll.
- [ ] Sidebar có chế độ thu gọn.

---

## 13. Kết quả mong đợi

Sau khi refactor, hệ thống cần đạt được các đặc điểm:

- Giao diện chủ đạo đỏ đô, trắng và xám.
- Ít màu, trang trọng và nghiêm túc.
- Thể hiện rõ nhận diện Nhà xuất bản Chính trị quốc gia Sự thật.
- Các màn hình có cấu trúc nhất quán.
- Người dùng dễ xác định hành động chính.
- Bảng dữ liệu dễ đọc.
- Trạng thái nghiệp vụ rõ ràng.
- Dễ bảo trì và mở rộng.
- Không làm thay đổi luồng nghiệp vụ hiện tại.
- Phù hợp với hệ thống quản lý nhà nước sử dụng lâu dài.

---

## 14. Bộ design token đề xuất hoàn chỉnh

```css
:root {
  /* Brand */
  --primary-900: #5E1016;
  --primary-800: #74151C;
  --primary-700: #8B1E24;
  --primary-600: #A2262D;
  --primary-100: #F5E7E8;
  --primary-50: #FCF5F5;

  /* Neutral */
  --white: #FFFFFF;
  --page-bg: #F7F7F8;
  --surface-subtle: #FAFAFA;

  --gray-950: #111827;
  --gray-900: #1F2328;
  --gray-700: #344054;
  --gray-600: #475467;
  --gray-500: #667085;
  --gray-400: #98A2B3;
  --gray-300: #D0D5DD;
  --gray-200: #E4E7EC;
  --gray-100: #F2F4F7;
  --gray-50: #F7F7F8;

  /* Semantic */
  --success-700: #287A4B;
  --success-100: #EDF7F1;

  --warning-700: #9A6700;
  --warning-100: #FFF8E6;

  --danger-700: #B42318;
  --danger-100: #FEF3F2;

  /* Layout */
  --sidebar-width: 256px;
  --sidebar-collapsed-width: 72px;
  --header-height: 64px;

  /* Radius */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 10px;
  --radius-pill: 999px;

  /* Shadow */
  --shadow-card: 0 1px 2px rgba(16, 24, 40, 0.03);
  --shadow-dropdown: 0 8px 24px rgba(16, 24, 40, 0.10);

  /* Focus */
  --focus-ring: 0 0 0 3px rgba(139, 30, 36, 0.10);
}
```

---

## 15. Kết luận

Phương án refactor được chốt theo hướng:

> **Đỏ đô làm màu thương hiệu và hành động chính, trắng làm nền nội dung, xám làm màu trung tính; xanh lá và vàng chỉ dùng cho trạng thái nghiệp vụ.**

Đây là hướng phù hợp với một hệ thống quản lý nhà nước vì bảo đảm sự trang trọng, ít màu, dễ sử dụng, dễ bảo trì và có nhận diện rõ ràng.
