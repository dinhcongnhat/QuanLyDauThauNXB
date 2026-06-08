const fs = require('fs');
const path = require('path');

const outputPath = path.join(__dirname, 'usecase_full.csv');

const groups = [
  {
    id: '1',
    title: 'Quản lý truy cập và phiên làm việc',
    bmt: 'B',
    cases: [
      {
        id: '1.1',
        name: 'Đăng nhập hệ thống',
        actor: 'Người dùng hệ thống',
        transaction:
          'Người dùng hệ thống truy cập màn hình Đăng nhập, hệ thống hiển thị form đăng nhập gồm hai trường Email và Mật khẩu. Người dùng nhập email, nhập mật khẩu, có thể nhấn biểu tượng mắt để hiện hoặc ẩn mật khẩu, sau đó nhấn nút Đăng nhập. Nếu thông tin hợp lệ, hệ thống đăng nhập thành công và điều hướng tới Dashboard; nếu thông tin không hợp lệ, hệ thống hiển thị thông báo lỗi và giữ nguyên màn hình đăng nhập.',
        complexity: 'Đơn giản',
      },
      {
        id: '1.2',
        name: 'Đăng xuất hệ thống',
        actor: 'Người dùng đã đăng nhập',
        transaction:
          'Người dùng đã đăng nhập nhấn biểu tượng bánh răng ở thanh điều hướng, chọn mục Đăng xuất. Hệ thống xóa phiên đăng nhập hiện tại và chuyển người dùng về màn hình Đăng nhập.',
        complexity: 'Đơn giản',
      },
      {
        id: '1.3',
        name: 'Đổi mật khẩu',
        actor: 'Người dùng đã đăng nhập',
        transaction:
          'Người dùng đã đăng nhập mở menu cài đặt, nhấn mục Đổi mật khẩu để hệ thống mở cửa sổ đổi mật khẩu. Người dùng nhập mật khẩu cũ, mật khẩu mới, xác nhận mật khẩu mới rồi nhấn nút Đổi mật khẩu. Nếu thông tin hợp lệ, hệ thống cập nhật mật khẩu, hiển thị thông báo thành công và đóng cửa sổ; nếu không hợp lệ, hệ thống hiển thị lỗi tương ứng để người dùng nhập lại.',
        complexity: 'Đơn giản',
      },
      {
        id: '1.4',
        name: 'Xem và xử lý thông báo',
        actor: 'Người dùng đã đăng nhập',
        transaction:
          'Người dùng đã đăng nhập nhấn biểu tượng chuông thông báo để hệ thống mở danh sách thông báo và hiển thị số lượng chưa đọc. Người dùng có thể nhấn từng thông báo để mở màn hình liên quan, nhấn liên kết Đánh dấu đã đọc tất cả hoặc nhấn nút đóng bảng thông báo. Hệ thống cập nhật trạng thái đã đọc, giảm số lượng chưa đọc và làm mới danh sách thông báo theo thao tác đã chọn.',
        complexity: 'Trung bình',
      },
      {
        id: '1.5',
        name: 'Chuyển đổi vai trò làm việc',
        actor: 'Người dùng có nhiều vai trò',
        transaction:
          'Người dùng có đồng thời vai trò Chủ đầu tư và Nhà thầu nhấn nút Đổi sang Nhà thầu / Chủ đầu tư trên thanh điều hướng. Hệ thống đổi chế độ hiển thị menu, nạp đúng màn hình khởi đầu của vai trò vừa chọn và giới hạn các thao tác theo quyền của vai trò đó.',
        complexity: 'Đơn giản',
      },
    ],
  },
  {
    id: '2',
    title: 'Dashboard và điều hướng chung',
    bmt: 'B',
    cases: [
      {
        id: '2.1',
        name: 'Xem Dashboard tổng quan',
        actor: 'Người dùng đã đăng nhập',
        transaction:
          'Người dùng đã đăng nhập truy cập Dashboard, hệ thống tự động tải các thẻ tổng quan, các số liệu nhanh và các lối tắt nghiệp vụ chính. Người dùng quan sát thông tin tổng hợp để nắm tình trạng công việc trước khi chuyển sang các màn hình xử lý chi tiết.',
        complexity: 'Đơn giản',
      },
      {
        id: '2.2',
        name: 'Mở màn hình Quản lý Dự án',
        actor: 'Chủ đầu tư',
        transaction:
          'Chủ đầu tư nhấn card Quản lý Dự án hoặc liên kết Xem tất cả trên Dashboard. Hệ thống điều hướng sang màn hình Danh sách Dự án và hiển thị toàn bộ dự án mà người dùng được phép theo dõi.',
        complexity: 'Đơn giản',
      },
      {
        id: '2.3',
        name: 'Mở màn hình Đặt sách',
        actor: 'Chủ đầu tư',
        transaction:
          'Chủ đầu tư nhấn card Thầu Sách trên Dashboard. Hệ thống điều hướng sang màn hình Đặt sách và hiển thị các hồ sơ, dự án liên quan đến nghiệp vụ mua sắm sách.',
        complexity: 'Đơn giản',
      },
      {
        id: '2.4',
        name: 'Mở màn hình Dự toán thiết bị',
        actor: 'Chủ đầu tư',
        transaction:
          'Chủ đầu tư nhấn card Thầu Thiết Bị trên Dashboard. Hệ thống điều hướng sang màn hình Dự toán thiết bị để người dùng tiếp tục lập hoặc xử lý hồ sơ dự toán thiết bị.',
        complexity: 'Đơn giản',
      },
      {
        id: '2.5',
        name: 'Mở màn hình Lựa chọn nhà thầu',
        actor: 'Chủ đầu tư',
        transaction:
          'Chủ đầu tư nhấn card Lựa chọn Nhà thầu trên Dashboard. Hệ thống điều hướng sang màn hình Lựa chọn Nhà thầu và hiển thị danh sách quyết định, gói thầu cùng các quy trình đang xử lý.',
        complexity: 'Đơn giản',
      },
    ],
  },
  {
    id: '3',
    title: 'Quản lý dự án',
    bmt: 'B',
    cases: [
      {
        id: '3.1',
        name: 'Xem và lọc danh sách dự án',
        actor: 'Chủ đầu tư',
        transaction:
          'Chủ đầu tư mở màn hình Danh sách Dự án, hệ thống tải các thẻ dự án cùng trạng thái, người tạo và thời gian tạo. Chủ đầu tư nhấn tab Tất cả, tab Thầu Thiết Bị hoặc tab Thầu Sách để lọc dữ liệu; hệ thống cập nhật danh sách dự án theo loại đã chọn.',
        complexity: 'Đơn giản',
      },
      {
        id: '3.2',
        name: 'Tạo dự án mới',
        actor: 'Chủ đầu tư',
        transaction:
          'Chủ đầu tư nhấn nút Tạo dự án để hệ thống mở cửa sổ tạo dự án. Chủ đầu tư nhập tên dự án, chọn radio Thầu Thiết Bị hoặc Thầu Sách rồi nhấn nút Tạo dự án. Hệ thống tạo dự án mới, hiển thị thông báo thành công, đóng cửa sổ và làm mới danh sách dự án.',
        complexity: 'Trung bình',
      },
      {
        id: '3.3',
        name: 'Xem tiến độ tổng thể dự án',
        actor: 'Chủ đầu tư',
        transaction:
          'Chủ đầu tư nhấn biểu tượng mở rộng trên thẻ dự án, hệ thống hiển thị tiến độ tổng thể, các bước nghiệp vụ, phần trăm hoàn thành và các thống kê tài liệu của dự án. Chủ đầu tư theo dõi dữ liệu này để biết bước nào đang xử lý và bước nào còn thiếu.',
        complexity: 'Trung bình',
      },
      {
        id: '3.4',
        name: 'Mở luồng Đặt sách từ dự án',
        actor: 'Chủ đầu tư',
        transaction:
          'Tại thẻ dự án thầu sách, Chủ đầu tư nhấn nút Đặt sách. Hệ thống điều hướng sang màn hình Đặt sách hoặc màn hình Chi tiết Đặt sách của dự án tương ứng để người dùng tiếp tục lập hồ sơ.',
        complexity: 'Đơn giản',
      },
      {
        id: '3.5',
        name: 'Mở luồng Dự toán hoặc KHLCNT từ dự án',
        actor: 'Chủ đầu tư',
        transaction:
          'Tại thẻ dự án, Chủ đầu tư nhấn nút Dự toán hoặc nút KH LCNT. Hệ thống điều hướng sang màn hình Dự toán hoặc KHLCNT của dự án tương ứng và nạp sẵn dữ liệu liên quan để người dùng tiếp tục xử lý.',
        complexity: 'Đơn giản',
      },
      {
        id: '3.6',
        name: 'Xóa dự án',
        actor: 'Chủ đầu tư',
        transaction:
          'Chủ đầu tư nhấn nút Xóa trên thẻ dự án và xác nhận thao tác. Hệ thống xóa dự án khi đủ điều kiện nghiệp vụ, hiển thị thông báo kết quả và cập nhật lại danh sách dự án.',
        complexity: 'Đơn giản',
      },
    ],
  },
  {
    id: '4',
    title: 'Quản lý đặt sách',
    bmt: 'M',
    cases: [
      {
        id: '4.1',
        name: 'Xem danh sách và tạo hồ sơ đặt sách',
        actor: 'Chủ đầu tư',
        transaction:
          'Chủ đầu tư mở màn hình Đặt sách, hệ thống hiển thị danh sách dự án đặt sách, ô tìm kiếm và các nút tạo hồ sơ. Chủ đầu tư có thể nhấn nút Tạo dự án Đặt sách, nút Tạo đơn Đặt sách hoặc nút Tạo Đặt sách trên card quyết định dự toán. Hệ thống mở cửa sổ tạo hồ sơ, ghi sẵn thông tin liên quan và tạo mới hồ sơ sau khi người dùng xác nhận.',
        complexity: 'Trung bình',
      },
      {
        id: '4.2',
        name: 'Lập Giấy đề nghị in sách',
        actor: 'Chủ đầu tư',
        transaction:
          'Tại màn hình Chi tiết Đặt sách, Chủ đầu tư mở tab Giấy đề nghị in sách, nhập thông tin biểu mẫu rồi nhấn nút Tạo GDN hoặc Cập nhật. Hệ thống lưu dữ liệu Giấy đề nghị in sách, giữ lại trạng thái xử lý hiện tại và hiển thị thông báo kết quả.',
        complexity: 'Trung bình',
      },
      {
        id: '4.3',
        name: 'Phân công số lượng in và duyệt GDN',
        actor: 'Chủ đầu tư',
        transaction:
          'Ở tab Giấy đề nghị in sách, Chủ đầu tư nhấn nút Phân công điền SL hoặc nút Thêm người điền, hệ thống mở cửa sổ phân công để chọn người và nhập số lượng. Sau khi hoàn tất, Chủ đầu tư nhấn nút Phân công hoặc nút Duyệt GDN. Hệ thống lưu phân công, cập nhật số lượng, chuyển GDN sang trạng thái đã duyệt và mở khóa tab Phiếu chỉ định cơ sở in.',
        complexity: 'Phức tạp',
      },
      {
        id: '4.4',
        name: 'Lập Phiếu chỉ định cơ sở in',
        actor: 'Chủ đầu tư',
        transaction:
          'Chủ đầu tư mở tab Phiếu chỉ định cơ sở in, có thể nhấn nút Từ thư viện hoặc nút Auto-fill để lấy dữ liệu từ thư viện và từ GDN đã duyệt. Sau đó Chủ đầu tư bổ sung nội dung cần thiết rồi nhấn nút Tạo Phiếu hoặc Cập nhật. Hệ thống lưu dữ liệu Phiếu chỉ định cơ sở in và hiển thị thông báo kết quả.',
        complexity: 'Phức tạp',
      },
      {
        id: '4.5',
        name: 'Duyệt Phiếu chỉ định cơ sở in',
        actor: 'Chủ đầu tư',
        transaction:
          'Khi Phiếu chỉ định cơ sở in đã đầy đủ nội dung, Chủ đầu tư nhấn nút Duyệt Phiếu. Hệ thống chuyển phiếu sang trạng thái đã duyệt, ghi nhận kết quả và mở khóa tab Quyết định để tiếp tục quy trình.',
        complexity: 'Trung bình',
      },
      {
        id: '4.6',
        name: 'Lập Quyết định đặt sách',
        actor: 'Chủ đầu tư',
        transaction:
          'Chủ đầu tư mở tab Quyết định, có thể nhấn nút Từ thư viện hoặc nút Auto-fill để lấy dữ liệu từ GDN và PCDI đã duyệt. Sau khi cập nhật nội dung cần thiết, Chủ đầu tư nhấn nút Lưu thông tin QĐ. Hệ thống lưu dữ liệu quyết định và hiển thị thông báo kết quả.',
        complexity: 'Phức tạp',
      },
      {
        id: '4.7',
        name: 'Duyệt và hoàn thành quy trình đặt sách',
        actor: 'Chủ đầu tư',
        transaction:
          'Sau khi hoàn tất nội dung quyết định, Chủ đầu tư nhấn nút Duyệt & Hoàn thành Đặt sách. Hệ thống duyệt quyết định, đánh dấu dự án hoàn thành bước đặt sách và cập nhật điều kiện để người dùng chuyển sang bước dự toán.',
        complexity: 'Phức tạp',
      },
      {
        id: '4.8',
        name: 'Xem trước, tải DOCX và dùng thư viện cho hồ sơ đặt sách',
        actor: 'Chủ đầu tư',
        transaction:
          'Tại các tab Giấy đề nghị in sách, Phiếu chỉ định cơ sở in và Quyết định, Chủ đầu tư có thể nhấn nút Xem trước, nút DOCX, nút Từ thư viện hoặc nút Lưu vào thư viện. Hệ thống mở trình xem trước tài liệu, tải tệp DOCX hoặc mở bộ chọn và cửa sổ thư viện để tái sử dụng dữ liệu của hồ sơ đặt sách.',
        complexity: 'Trung bình',
      },
      {
        id: '4.9',
        name: 'Chuyển từ đặt sách sang dự toán',
        actor: 'Chủ đầu tư',
        transaction:
          'Từ màn hình Đặt sách hoặc màn hình Chi tiết Đặt sách, Chủ đầu tư nhấn liên kết Tiếp tục → Dự toán hoặc liên kết Phê duyệt Dự toán. Khi điều kiện nghiệp vụ đã hoàn tất, hệ thống điều hướng sang màn hình Dự toán sách của dự án; nếu chưa đủ điều kiện, hệ thống giữ nguyên màn hình và khóa bước tiếp theo.',
        complexity: 'Trung bình',
      },
    ],
  },
  {
    id: '5',
    title: 'Quản lý dự toán và quyết định phê duyệt',
    bmt: 'M',
    cases: [
      {
        id: '5.1',
        name: 'Xem quyết định phê duyệt',
        actor: 'Chủ đầu tư',
        transaction:
          'Chủ đầu tư mở màn hình Quyết định phê duyệt, hệ thống hiển thị danh sách tài liệu đã phát hành. Chủ đầu tư có thể nhấn nút Xem, nút Xem trước, nút Tải PDF, nút Đóng hoặc biểu tượng đóng cửa sổ chi tiết. Hệ thống mở trình xem trước tài liệu, tải tệp PDF hoặc đóng cửa sổ theo thao tác đã chọn.',
        complexity: 'Trung bình',
      },
      {
        id: '5.2',
        name: 'Lập và gửi duyệt dự toán sách',
        actor: 'Chủ đầu tư',
        transaction:
          'Tại màn hình Dự toán sách, Chủ đầu tư nhấn nút Tạo Dự toán, có thể nhấn nút Auto-fill từ GDN + PCDI để lấy dữ liệu sẵn có, sau đó nhập hoặc chỉnh sửa nội dung dự toán và nhấn nút Tạo & Gửi duyệt. Hệ thống lưu tờ trình dự toán, chuyển tài liệu sang trạng thái chờ duyệt và hiển thị thông báo kết quả.',
        complexity: 'Phức tạp',
      },
      {
        id: '5.3',
        name: 'Duyệt hoặc từ chối dự toán sách',
        actor: 'Người duyệt có thẩm quyền',
        transaction:
          'Người duyệt có thẩm quyền mở danh sách dự toán sách, nhấn nút Duyệt để chấp thuận hoặc nhấn nút Làm lại rồi nút Gửi để từ chối kèm lý do. Hệ thống cập nhật trạng thái tài liệu, lưu ý kiến xử lý và làm mới danh sách sau khi thao tác hoàn tất.',
        complexity: 'Phức tạp',
      },
      {
        id: '5.4',
        name: 'Lập tờ trình và quyết định dự toán',
        actor: 'Chủ đầu tư',
        transaction:
          'Tại màn hình Danh sách Dự toán, Chủ đầu tư nhấn nút + Tờ trình dự toán hoặc + Quyết định dự toán. Hệ thống mở form tương ứng, kiểm tra điều kiện nghiệp vụ của quyết định, sau đó lưu tài liệu và chuyển sang trạng thái chờ duyệt khi người dùng nhấn nút Tạo & Gửi duyệt.',
        complexity: 'Trung bình',
      },
      {
        id: '5.5',
        name: 'Sửa và gửi lại dự toán bị từ chối',
        actor: 'Chủ đầu tư',
        transaction:
          'Đối với tài liệu dự toán bị từ chối, Chủ đầu tư nhấn nút Sửa, chỉnh lại nội dung trong cửa sổ sửa rồi nhấn nút Lưu & Gửi lại duyệt. Hệ thống cập nhật tài liệu, gửi lại vào vòng duyệt mới, đóng cửa sổ và làm mới danh sách.',
        complexity: 'Phức tạp',
      },
      {
        id: '5.6',
        name: 'Lập và gửi duyệt dự toán thiết bị',
        actor: 'Chủ đầu tư',
        transaction:
          'Tại màn hình Dự toán thiết bị, Chủ đầu tư nhấn nút + Tờ trình dự toán hoặc + Quyết định dự toán, nhập nội dung biểu mẫu rồi nhấn nút Tạo & Gửi duyệt. Hệ thống lưu tài liệu dự toán thiết bị, kiểm tra điều kiện của quyết định và cập nhật trạng thái tài liệu theo quy trình.',
        complexity: 'Trung bình',
      },
      {
        id: '5.7',
        name: 'Duyệt, từ chối và gửi lại dự toán thiết bị',
        actor: 'Người duyệt có thẩm quyền',
        transaction:
          'Người duyệt có thẩm quyền nhấn nút Duyệt hoặc nhấn nút Làm lại rồi nút Gửi để từ chối tài liệu dự toán thiết bị; sau khi chỉnh sửa, Chủ đầu tư có thể nhấn nút Gửi lại. Hệ thống ghi nhận kết quả duyệt, từ chối hoặc gửi lại, cập nhật trạng thái tài liệu và phản ánh thay đổi trên danh sách.',
        complexity: 'Phức tạp',
      },
      {
        id: '5.8',
        name: 'Xem trước và tải tài liệu dự toán',
        actor: 'Chủ đầu tư',
        transaction:
          'Trên các màn hình dự toán, Chủ đầu tư có thể nhấn nút Xem, nút Xem trước, nút Tải DOCX, nút Tải PDF, nút Đóng hoặc nút Hủy ở các cửa sổ chi tiết. Hệ thống mở trình xem trước, tải tài liệu tương ứng hoặc đóng cửa sổ theo thao tác của người dùng.',
        complexity: 'Trung bình',
      },
    ],
  },
  {
    id: '6',
    title: 'Quản lý kế hoạch lựa chọn nhà thầu',
    bmt: 'M',
    cases: [
      {
        id: '6.1',
        name: 'Lập tờ trình KHLCNT',
        actor: 'Chủ đầu tư',
        transaction:
          'Tại màn hình KHLCNT, Chủ đầu tư nhấn nút + Tờ trình KHLCNT, nhập các thông tin biểu mẫu và nhấn nút Tạo & Gửi. Hệ thống lưu tờ trình kế hoạch lựa chọn nhà thầu, chuyển tài liệu sang trạng thái chờ duyệt và hiển thị thông báo kết quả.',
        complexity: 'Trung bình',
      },
      {
        id: '6.2',
        name: 'Lập quyết định KHLCNT',
        actor: 'Chủ đầu tư',
        transaction:
          'Khi đã đủ điều kiện nghiệp vụ, Chủ đầu tư nhấn nút + Quyết định KHLCNT, nhập nội dung quyết định rồi nhấn nút Tạo & Gửi. Hệ thống lưu quyết định KHLCNT, kiểm tra quyền thao tác và chuyển tài liệu sang trạng thái phù hợp.',
        complexity: 'Trung bình',
      },
      {
        id: '6.3',
        name: 'Thêm và xóa căn cứ pháp lý, gói thầu',
        actor: 'Chủ đầu tư',
        transaction:
          'Trong form Tờ trình hoặc Quyết định KHLCNT, Chủ đầu tư nhấn nút + Thêm căn cứ, + Thêm gói thầu hoặc nút × để xóa từng dòng dữ liệu. Hệ thống thêm mới hoặc loại bỏ dòng thông tin ngay trên biểu mẫu để người dùng tiếp tục hoàn thiện hồ sơ.',
        complexity: 'Trung bình',
      },
      {
        id: '6.4',
        name: 'Tự động điền KHLCNT từ thư viện',
        actor: 'Chủ đầu tư',
        transaction:
          'Chủ đầu tư nhấn nút Từ thư viện trong form Tờ trình hoặc Quyết định KHLCNT, hệ thống mở bộ chọn thư viện văn bản. Khi người dùng chọn giá trị phù hợp, hệ thống tự động điền dữ liệu vào biểu mẫu KHLCNT để rút ngắn thao tác nhập liệu.',
        complexity: 'Phức tạp',
      },
      {
        id: '6.5',
        name: 'Duyệt, từ chối và gửi lại KHLCNT',
        actor: 'Người duyệt có thẩm quyền',
        transaction:
          'Người duyệt có thẩm quyền nhấn nút Duyệt hoặc nhấn nút Làm lại rồi nút Gửi để từ chối, còn Chủ đầu tư có thể nhấn nút Gửi lại sau khi chỉnh sửa tài liệu bị từ chối. Hệ thống cập nhật trạng thái KHLCNT, lưu ý kiến xử lý và phản ánh kết quả trên danh sách tài liệu.',
        complexity: 'Phức tạp',
      },
      {
        id: '6.6',
        name: 'Xem trước và tải tài liệu KHLCNT',
        actor: 'Chủ đầu tư',
        transaction:
          'Trên danh sách KHLCNT, Chủ đầu tư nhấn nút Xem hoặc nút DOCX để xem trước hay tải tài liệu; khi cần chỉnh sửa, người dùng có thể mở cửa sổ sửa rồi nhấn Hủy hoặc Lưu & Gửi lại duyệt. Hệ thống mở trình xem trước, tải tệp tài liệu hoặc cập nhật tài liệu theo thao tác tương ứng.',
        complexity: 'Trung bình',
      },
      {
        id: '6.7',
        name: 'Tạo KHLCNT từ quyết định dự toán',
        actor: 'Chủ đầu tư',
        transaction:
          'Tại danh sách quyết định dự toán sách hoặc thiết bị, Chủ đầu tư nhấn liên kết Tạo KH LCNT hoặc nhấn trực tiếp vào card quyết định. Hệ thống điều hướng sang màn hình KHLCNT chi tiết, nạp sẵn ngữ cảnh quyết định và cho phép lập hồ sơ từ tài liệu đó.',
        complexity: 'Trung bình',
      },
    ],
  },
  {
    id: '7',
    title: 'Lựa chọn nhà thầu',
    bmt: 'M',
    cases: [
      {
        id: '7.1',
        name: 'Xem danh sách quyết định, gói thầu và quy trình LCNT',
        actor: 'Chủ đầu tư',
        transaction:
          'Chủ đầu tư mở màn hình Lựa chọn Nhà thầu, hệ thống hiển thị danh sách quyết định, danh sách gói thầu và tình trạng quy trình của từng gói. Chủ đầu tư có thể dùng các liên kết Quay lại để chuyển giữa ba mức danh sách; hệ thống cập nhật vùng hiển thị tương ứng với cấp dữ liệu đang được chọn.',
        complexity: 'Trung bình',
      },
      {
        id: '7.2',
        name: 'Tạo mới hoặc mở quy trình LCNT',
        actor: 'Chủ đầu tư',
        transaction:
          'Tại thẻ gói thầu, Chủ đầu tư nhấn nút Tạo quy trình LCNT hoặc nhấn trực tiếp vào thẻ để Mở quy trình. Hệ thống khởi tạo quy trình mới nếu chưa có, hoặc mở quy trình hiện hữu để người dùng tiếp tục thao tác trên từng bước.',
        complexity: 'Trung bình',
      },
      {
        id: '7.3',
        name: 'Nhập liệu và cập nhật bước quy trình',
        actor: 'Chủ đầu tư',
        transaction:
          'Trong danh sách bước hoặc màn hình chi tiết bước, Chủ đầu tư nhấn nút Nhập liệu, nút Chỉnh sửa hoặc nút Lưu thông tin để cập nhật dữ liệu của bước. Hệ thống mở biểu mẫu tương ứng, lưu nội dung đã nhập và giữ lại trạng thái xử lý của bước.',
        complexity: 'Trung bình',
      },
      {
        id: '7.4',
        name: 'Tải lên, xem và tải file đính kèm của bước',
        actor: 'Chủ đầu tư',
        transaction:
          'Chủ đầu tư nhấn nút Tải file lên để chọn tệp đính kèm, nhấn nút Xem để mở tệp hoặc nhấn nút Tải để tải về. Hệ thống mở bộ chọn file, lưu tệp đính kèm mới hoặc mở và tải tệp đã có theo thao tác của người dùng.',
        complexity: 'Phức tạp',
      },
      {
        id: '7.5',
        name: 'Tạo và tải DOCX theo bước',
        actor: 'Chủ đầu tư',
        transaction:
          'Tại từng bước quy trình, Chủ đầu tư nhấn nút Tạo DOCX hoặc nút Tải DOCX sau khi dữ liệu đã sẵn sàng. Hệ thống sinh tài liệu DOCX theo mẫu của bước, lưu kết quả và cho phép tải tệp về máy.',
        complexity: 'Trung bình',
      },
      {
        id: '7.6',
        name: 'Hoàn thành hoặc mở lại bước',
        actor: 'Chủ đầu tư',
        transaction:
          'Khi bước đã xử lý xong, Chủ đầu tư nhấn nút Hoàn thành; nếu cần sửa lại, người dùng nhấn nút Mở lại. Hệ thống cập nhật trạng thái bước, khóa hoặc mở lại quyền chỉnh sửa và phản ánh thay đổi trên timeline.',
        complexity: 'Phức tạp',
      },
      {
        id: '7.7',
        name: 'Trình duyệt, phê duyệt hoặc từ chối bước',
        actor: 'Người duyệt có thẩm quyền',
        transaction:
          'Tại chi tiết bước, người có thẩm quyền nhấn nút Trình phê duyệt, nút Phê duyệt hoặc nút Từ chối, nhập ý kiến trong cửa sổ xác nhận rồi hoàn tất thao tác. Hệ thống ghi nhận kết quả xử lý, cập nhật trạng thái bước và chuyển luồng sang người xử lý tiếp theo khi cần.',
        complexity: 'Phức tạp',
      },
      {
        id: '7.8',
        name: 'Xem chi tiết bước theo timeline',
        actor: 'Người dùng có quyền thao tác',
        transaction:
          'Người dùng nhấn các nút bước trên timeline hoặc nhấn nút Chi tiết để mở màn hình chi tiết bước. Hệ thống chuyển tới nội dung của bước được chọn, hiển thị hồ sơ liên quan và khóa các bước chưa đủ điều kiện truy cập.',
        complexity: 'Phức tạp',
      },
      {
        id: '7.9',
        name: 'Tải toàn bộ hồ sơ LCNT dạng ZIP',
        actor: 'Người dùng có quyền thao tác',
        transaction:
          'Tại màn hình chi tiết quy trình LCNT, người dùng nhấn nút Tải toàn bộ file. Hệ thống mở cửa sổ tải ZIP, tổng hợp toàn bộ hồ sơ của quy trình và tạo tệp ZIP để người dùng tải về.',
        complexity: 'Phức tạp',
      },
      {
        id: '7.10',
        name: 'Tự động điền và lưu dữ liệu thư viện trong bước LCNT',
        actor: 'Người dùng có quyền thao tác',
        transaction:
          'Tại màn hình chi tiết bước LCNT, người dùng nhấn nút Từ thư viện hoặc nút Lưu vào thư viện. Hệ thống mở bộ chọn thư viện hoặc cửa sổ lưu dữ liệu, cho phép tự động điền thông tin tổ chức, nhà thầu hoặc lưu mẫu dùng lại cho các bước sau.',
        complexity: 'Phức tạp',
      },
    ],
  },
  {
    id: '8',
    title: 'Quản lý thanh toán',
    bmt: 'M',
    cases: [
      {
        id: '8.1',
        name: 'Xem danh sách hồ sơ thanh toán',
        actor: 'Chủ đầu tư',
        transaction:
          'Chủ đầu tư mở màn hình Hồ sơ thanh toán, hệ thống hiển thị danh sách hồ sơ, ô tìm kiếm và trạng thái từng bộ hồ sơ. Chủ đầu tư nhập từ khóa vào ô tìm kiếm hoặc nhấn vào card hồ sơ; hệ thống lọc danh sách hoặc chuyển sang chi tiết hồ sơ tương ứng.',
        complexity: 'Trung bình',
      },
      {
        id: '8.2',
        name: 'Tạo hồ sơ thanh toán từ hợp đồng',
        actor: 'Chủ đầu tư',
        transaction:
          'Chủ đầu tư nhấn nút Tạo hồ sơ thanh toán, hệ thống mở hộp thoại chọn hợp đồng. Sau khi người dùng nhấn nút Chọn trên hợp đồng mong muốn, hệ thống tạo hồ sơ thanh toán mới, đóng hộp thoại và điều hướng sang chi tiết hồ sơ.',
        complexity: 'Trung bình',
      },
      {
        id: '8.3',
        name: 'Xem chi tiết quy trình thanh toán',
        actor: 'Chủ đầu tư',
        transaction:
          'Tại màn hình chi tiết hồ sơ thanh toán, Chủ đầu tư nhấn các nút bước trên timeline hoặc nhấn nút Mở chi tiết để đi vào từng bước cụ thể. Hệ thống hiển thị nội dung bước đang chọn và giữ các liên kết quay lại danh sách hoặc quay lại hồ sơ khi người dùng cần.',
        complexity: 'Trung bình',
      },
      {
        id: '8.4',
        name: 'Nhập liệu và quản lý file bước thanh toán',
        actor: 'Chủ đầu tư',
        transaction:
          'Tại chi tiết bước thanh toán, Chủ đầu tư nhập nội dung biểu mẫu, nhấn nút Lưu thông tin, nút Tải file lên, nút Xem hoặc nút Xóa trên từng file đính kèm. Hệ thống lưu dữ liệu bước, tiếp nhận tệp mới, mở tệp xem trước hoặc xóa tệp khỏi danh sách theo thao tác của người dùng.',
        complexity: 'Phức tạp',
      },
      {
        id: '8.5',
        name: 'Tạo, tải DOCX và hoàn thành bước thanh toán',
        actor: 'Chủ đầu tư',
        transaction:
          'Sau khi hoàn tất dữ liệu bước, Chủ đầu tư nhấn nút Tải DOCX, nút Hoàn thành bước hoặc nút Mở lại để chỉnh sửa. Hệ thống sinh tài liệu DOCX, cập nhật trạng thái bước và cho phép mở lại bước nếu cần tiếp tục xử lý.',
        complexity: 'Phức tạp',
      },
      {
        id: '8.6',
        name: 'Tải toàn bộ hồ sơ thanh toán dạng ZIP',
        actor: 'Chủ đầu tư',
        transaction:
          'Tại chi tiết hồ sơ thanh toán, Chủ đầu tư nhấn nút Tải toàn bộ file. Hệ thống mở cửa sổ tải ZIP, gom toàn bộ tài liệu của hồ sơ thanh toán và tạo tệp ZIP để tải về máy.',
        complexity: 'Phức tạp',
      },
    ],
  },
  {
    id: '9',
    title: 'Quản lý hợp đồng',
    bmt: 'B',
    cases: [
      {
        id: '9.1',
        name: 'Xem chi tiết hợp đồng',
        actor: 'Chủ đầu tư',
        transaction:
          'Chủ đầu tư mở màn hình Chi tiết Hợp đồng, hệ thống hiển thị các tệp đính kèm, các tài liệu DOCX đã sinh và các thao tác có sẵn cho hợp đồng. Chủ đầu tư theo dõi nội dung hồ sơ trực tiếp trên một màn hình chi tiết duy nhất.',
        complexity: 'Đơn giản',
      },
      {
        id: '9.2',
        name: 'Xem và tải file đính kèm, DOCX hợp đồng',
        actor: 'Chủ đầu tư',
        transaction:
          'Chủ đầu tư nhấn nút Xem hoặc nút Tải trên tệp đính kèm và tài liệu DOCX của hợp đồng. Hệ thống mở trình xem trước tài liệu hoặc tải tệp tương ứng về máy của người dùng.',
        complexity: 'Trung bình',
      },
      {
        id: '9.3',
        name: 'Tải PDF và đóng xem trước hợp đồng',
        actor: 'Chủ đầu tư',
        transaction:
          'Chủ đầu tư nhấn nút Tải PDF để xuất hợp đồng ra PDF hoặc nhấn nút × để đóng cửa sổ xem trước. Hệ thống tạo và tải tệp PDF của hợp đồng hoặc đóng vùng xem trước theo thao tác của người dùng.',
        complexity: 'Trung bình',
      },
    ],
  },
  {
    id: '10',
    title: 'Nhà thầu tham dự đấu thầu',
    bmt: 'M',
    cases: [
      {
        id: '10.1',
        name: 'Tạo hồ sơ tham dự đấu thầu',
        actor: 'Nhà thầu',
        transaction:
          'Nhà thầu mở màn hình Tham dự đấu thầu, nhấn nút Tạo hồ sơ mới, nhập thông tin ban đầu rồi nhấn nút Tạo hồ sơ. Hệ thống tạo hồ sơ dự thầu, hiển thị thông báo thành công và đưa người dùng vào quy trình xử lý.',
        complexity: 'Trung bình',
      },
      {
        id: '10.2',
        name: 'Xem và điều hướng theo timeline hồ sơ dự thầu',
        actor: 'Nhà thầu',
        transaction:
          'Nhà thầu nhấn các nút bước trên timeline hoặc nhấn liên kết Quay lại danh sách để di chuyển giữa các bước và giữa danh sách hồ sơ. Hệ thống hiển thị bước đang chọn, khóa các bước chưa đến lượt và quay về danh sách khi người dùng yêu cầu.',
        complexity: 'Trung bình',
      },
      {
        id: '10.3',
        name: 'Nhập liệu DOCX và dùng thư viện tự động điền',
        actor: 'Nhà thầu',
        transaction:
          'Tại bước biểu mẫu DOCX, Nhà thầu nhập nội dung hồ sơ, có thể nhấn nút Từ thư viện để tự động điền thông tin tổ chức hoặc nhà thầu rồi nhấn nút Lưu thông tin. Hệ thống cập nhật dữ liệu bước và giữ lại thông tin để sinh tài liệu.',
        complexity: 'Phức tạp',
      },
      {
        id: '10.4',
        name: 'Tạo và tải DOCX hồ sơ dự thầu',
        actor: 'Nhà thầu',
        transaction:
          'Sau khi dữ liệu đã đầy đủ, Nhà thầu nhấn nút Tạo file DOCX hoặc nút Tải DOCX. Hệ thống sinh tệp DOCX của bước, lưu kết quả và cho phép tải về máy.',
        complexity: 'Trung bình',
      },
      {
        id: '10.5',
        name: 'Tải lên, xem và xóa file đính kèm',
        actor: 'Nhà thầu',
        transaction:
          'Nhà thầu nhấn nút chọn file để tải lên tài liệu, nhấn nút Xem để mở file hoặc nhấn nút Xóa để loại bỏ file không còn sử dụng. Hệ thống cập nhật danh sách tệp đính kèm của bước và phản hồi ngay trên giao diện.',
        complexity: 'Phức tạp',
      },
      {
        id: '10.6',
        name: 'Hoàn thành hoặc mở lại bước',
        actor: 'Nhà thầu',
        transaction:
          'Khi bước dự thầu đã xử lý xong, Nhà thầu nhấn nút Hoàn thành; nếu cần làm lại, Nhà thầu nhấn nút Mở lại. Hệ thống đổi trạng thái bước, khóa hoặc mở lại quyền chỉnh sửa và cập nhật tiến độ trên timeline.',
        complexity: 'Phức tạp',
      },
      {
        id: '10.7',
        name: 'Cập nhật kết quả trúng thầu hoặc trượt thầu',
        actor: 'Nhà thầu',
        transaction:
          'Ở bước Kết quả, Nhà thầu nhấn nút Trúng thầu hoặc nút Trượt thầu. Hệ thống ghi nhận kết quả cuối cùng của hồ sơ và cập nhật trạng thái tổng thể của quy trình dự thầu.',
        complexity: 'Trung bình',
      },
      {
        id: '10.8',
        name: 'Tải toàn bộ hồ sơ dự thầu dạng ZIP',
        actor: 'Nhà thầu',
        transaction:
          'Tại chi tiết hồ sơ dự thầu, Nhà thầu nhấn nút Tải toàn bộ file. Hệ thống mở cửa sổ tải ZIP, tổng hợp toàn bộ tệp của hồ sơ và tạo tệp ZIP để tải về.',
        complexity: 'Phức tạp',
      },
    ],
  },
  {
    id: '11',
    title: 'Quản trị hệ thống',
    bmt: 'B',
    cases: [
      {
        id: '11.1',
        name: 'Quản lý tổ chức trong thư viện văn bản',
        actor: 'Quản trị viên',
        transaction:
          'Quản trị viên mở màn hình Thư viện Văn bản, nhấn tab Tổ chức rồi sử dụng nút Thêm Tổ chức, nút Sửa hoặc nút Xóa trên từng tổ chức. Hệ thống mở form tạo hoặc sửa tổ chức, lưu thay đổi, xóa dữ liệu khi được xác nhận và cập nhật lại danh sách tổ chức.',
        complexity: 'Trung bình',
      },
      {
        id: '11.2',
        name: 'Quản lý thư viện văn bản',
        actor: 'Quản trị viên',
        transaction:
          'Sau khi chọn một tổ chức, Quản trị viên nhấn tab Thư viện, dùng nút Thêm Thư viện, nút Quản lý, nút Sửa hoặc nút Xóa trên từng thư viện. Hệ thống hiển thị danh sách thư viện của tổ chức, mở form chỉnh sửa hoặc cập nhật danh sách theo thao tác đã chọn.',
        complexity: 'Trung bình',
      },
      {
        id: '11.3',
        name: 'Quản lý trường dữ liệu và giá trị lưu sẵn',
        actor: 'Quản trị viên',
        transaction:
          'Trong thư viện đã chọn, Quản trị viên nhấn nút Thêm Trường, nút Lưu Trường, nút Lưu Giá trị, nút Sửa hoặc nút Xóa trên từng trường và từng giá trị đã lưu. Hệ thống mở form tương ứng, lưu cấu hình trường, lưu dữ liệu mẫu và cập nhật lại danh sách trường cũng như giá trị dùng lại.',
        complexity: 'Phức tạp',
      },
      {
        id: '11.4',
        name: 'Xem, tạo và lọc người dùng',
        actor: 'Quản trị viên',
        transaction:
          'Quản trị viên mở màn hình Quản lý người dùng, nhập từ khóa vào ô tìm kiếm để lọc danh sách hoặc nhấn nút Thêm người dùng để mở cửa sổ tạo mới. Hệ thống hiển thị danh sách người dùng theo từ khóa, mở form tạo người dùng và lưu hồ sơ mới khi quản trị viên xác nhận.',
        complexity: 'Trung bình',
      },
      {
        id: '11.5',
        name: 'Sửa thông tin, đổi vai trò nghiệp vụ và xóa người dùng',
        actor: 'Quản trị viên',
        transaction:
          'Tại danh sách người dùng, Quản trị viên nhấn nút Sửa, bật hoặc tắt checkbox Chủ đầu tư, checkbox Nhà thầu, đổi vai trò hệ thống rồi nhấn nút Lưu thay đổi; khi cần có thể nhấn nút Xóa. Hệ thống cập nhật hồ sơ người dùng, lưu quyền nghiệp vụ mới hoặc xóa người dùng khỏi danh sách khi thao tác được xác nhận.',
        complexity: 'Phức tạp',
      },
      {
        id: '11.6',
        name: 'Xem chi tiết và đặt lại mật khẩu người dùng',
        actor: 'Quản trị viên',
        transaction:
          'Quản trị viên nhấn vào dòng người dùng để xem chi tiết, có thể nhấn nút Sửa thông tin hoặc nút Đổi mật khẩu/Đặt lại mật khẩu. Hệ thống mở cửa sổ chi tiết, chuyển sang cửa sổ chỉnh sửa hoặc cập nhật mật khẩu mới và đóng cửa sổ sau khi hoàn tất.',
        complexity: 'Trung bình',
      },
      {
        id: '11.7',
        name: 'Quản lý phân quyền theo vai trò',
        actor: 'Quản trị viên',
        transaction:
          'Trên màn hình Quản lý phân quyền, Quản trị viên nhấn các tab Quản trị viên, Nhân viên, Trưởng phòng hoặc Giám đốc, bật hoặc tắt từng quyền rồi nhấn nút Lưu quyền hoặc Lưu thay đổi. Hệ thống cập nhật ma trận quyền cho vai trò đã chọn và hiển thị thông báo kết quả.',
        complexity: 'Trung bình',
      },
    ],
  },
  {
    id: '12',
    title: 'Tác vụ dùng chung',
    bmt: 'B',
    cases: [
      {
        id: '12.1',
        name: 'Gửi duyệt tài liệu',
        actor: 'Chủ đầu tư',
        transaction:
          'Khi tài liệu đang ở trạng thái nháp, Chủ đầu tư nhấn nút Gửi duyệt. Hệ thống chuyển tài liệu sang trạng thái chờ duyệt, gửi thông báo cho người xử lý tiếp theo và cập nhật giao diện.',
        complexity: 'Trung bình',
      },
      {
        id: '12.2',
        name: 'Thẩm định, phê duyệt và từ chối tài liệu',
        actor: 'Người duyệt có thẩm quyền',
        transaction:
          'Người duyệt nhấn nút Thẩm định, nút Phê duyệt hoặc nút Từ chối, nhập ý kiến vào ô nhận xét rồi xác nhận thao tác. Hệ thống lưu nhận xét, cập nhật trạng thái tài liệu và phản ánh kết quả trên màn hình hiện tại.',
        complexity: 'Phức tạp',
      },
      {
        id: '12.3',
        name: 'Gửi lại tài liệu bị từ chối',
        actor: 'Chủ đầu tư',
        transaction:
          'Sau khi chỉnh sửa tài liệu bị từ chối, Chủ đầu tư nhấn nút Gửi lại. Hệ thống gửi lại tài liệu vào vòng duyệt mới, cập nhật trạng thái xử lý và thông báo cho người duyệt liên quan.',
        complexity: 'Trung bình',
      },
      {
        id: '12.4',
        name: 'Chọn và lưu dữ liệu thư viện văn bản',
        actor: 'Người dùng có quyền thao tác',
        transaction:
          'Người dùng nhấn nút Từ thư viện để mở bộ chọn, chọn thư viện, chọn giá trị đã lưu hoặc nhấn nút Lưu vào thư viện để lưu dữ liệu hiện tại làm mẫu. Hệ thống tự động điền dữ liệu vào biểu mẫu hoặc lưu giá trị mới vào thư viện và hiển thị thông báo kết quả.',
        complexity: 'Trung bình',
      },
      {
        id: '12.5',
        name: 'Tải toàn bộ hồ sơ dạng ZIP',
        actor: 'Người dùng có quyền thao tác',
        transaction:
          'Tại các quy trình hỗ trợ tải gói hồ sơ, người dùng nhấn nút Tải ZIP hoặc nút Tải toàn bộ file, có thể nhấn nút Hủy hoặc nút đóng trên cửa sổ tải. Hệ thống tạo tệp ZIP từ toàn bộ hồ sơ liên quan, cho phép tải tệp về hoặc đóng cửa sổ khi người dùng hủy thao tác.',
        complexity: 'Phức tạp',
      },
    ],
  },
];

function csvEscape(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function toRow(values) {
  return values.map(csvEscape).join(';');
}

function buildRows() {
  const rows = [
    toRow([
      'STT',
      'Tên Use-case',
      'Tên tác nhân',
      'Giao dịch (Transaction)',
      'Phân loại theo BMT',
      'Phân loại theo độ phức tạp',
    ]),
  ];

  groups.forEach((group) => {
    rows.push(toRow([group.id, group.title, '', '', group.bmt, '']));

    group.cases.forEach((usecase) => {
      rows.push(
        toRow([
          usecase.id,
          usecase.name,
          usecase.actor,
          usecase.transaction,
          group.bmt,
          usecase.complexity,
        ]),
      );
    });
  });

  return rows;
}

fs.writeFileSync(outputPath, `${buildRows().join('\n')}\n`, 'utf8');
console.log(`Generated ${outputPath}`);
