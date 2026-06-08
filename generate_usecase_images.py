#!/usr/bin/env python3
"""Generate Use Case diagrams as PNG images for QLDA system."""

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch
import os

OUTPUT_DIR = "/home/pcloud/qlda/usecase_images"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Color scheme
ACTOR_COLOR  = "#2E75B6"
UC_FILL      = "#DAE3F3"
UC_BORDER    = "#2E75B6"
SYSTEM_BG    = "#F2F2F2"
SYSTEM_EDGE  = "#595959"
LINE_COLOR   = "#404040"
LABEL_COLOR  = "#333333"


# ─── Drawing primitives ───────────────────────────────────────

def draw_actor(ax, x, y, label):
    s = 1.0
    ax.add_patch(plt.Circle((x, y + 0.85*s), 0.18*s,
                              color=ACTOR_COLOR, zorder=3, alpha=0.9))
    ax.plot([x, x], [y + 0.67*s, y + 0.15*s],
            color=ACTOR_COLOR, lw=2.5, zorder=3)
    ax.plot([x - 0.35*s, x + 0.35*s], [y + 0.45*s, y + 0.45*s],
            color=ACTOR_COLOR, lw=2.5, zorder=3)
    ax.plot([x, x - 0.25*s], [y + 0.15*s, y - 0.20*s],
            color=ACTOR_COLOR, lw=2.5, zorder=3)
    ax.plot([x, x + 0.25*s], [y + 0.15*s, y - 0.20*s],
            color=ACTOR_COLOR, lw=2.5, zorder=3)
    ax.text(x, y - 0.50*s, label, ha='center', va='top',
            fontsize=8.5, fontweight='bold', color=LABEL_COLOR, zorder=4)


def draw_uc(ax, x, y, label, w=2.1, h=0.70):
    ell = mpatches.Ellipse((x, y), w, h,
                           facecolor=UC_FILL, edgecolor=UC_BORDER,
                           linewidth=1.3, zorder=2, alpha=0.92)
    ax.add_patch(ell)
    ax.text(x, y, label, ha='center', va='center',
            fontsize=7.5, color='#1A1A1A', zorder=3,
            multialignment='center', linespacing=1.2)
    return w, h  # return ellipse dimensions


def line_to_ellipse_edge(cx, cy, a, b, px, py):
    """Compute where the line from (px,py) to (cx,cy) hits the ellipse border.

    a = semi-major (half-width), b = semi-minor (half-height).
    Returns (hit_x, hit_y) on the ellipse perimeter.
    """
    from math import sqrt
    dx = cx - px
    dy = cy - py
    if abs(dx) < 1e-9 and abs(dy) < 1e-9:
        return cx, cy
    # Parametric solve along direction (dx, dy)
    # (cx + t*dx - cx)^2 / a^2 + (cy + t*dy - cy)^2 / b^2 = 1
    # t^2 * (dx^2/a^2 + dy^2/b^2) = 1
    denom = (dx*dx)/(a*a) + (dy*dy)/(b*b)
    if denom < 1e-12:
        return cx, cy
    t = 1.0 / sqrt(denom)
    hit_x = cx + t * dx
    hit_y = cy + t * dy
    return hit_x, hit_y


def draw_system(ax, cx, cy, w, h, title):
    rect = FancyBboxPatch((cx - w/2, cy - h/2), w, h,
                           boxstyle="round,pad=0.15",
                           facecolor=SYSTEM_BG, edgecolor=SYSTEM_EDGE,
                           linewidth=1.8, zorder=1)
    ax.add_patch(rect)
    ax.text(cx, cy + h/2 - 0.30, title,
            ha='center', va='center', fontsize=10, fontweight='bold',
            color='#333333', zorder=3)


def draw_direct_line(ax, ax_x, ax_y, uc_x, uc_y):
    """Simple direct line from actor to use case."""
    ax.plot([ax_x, uc_x], [ax_y, uc_y],
            color=LINE_COLOR, lw=1.1, zorder=2)


# ─── Layout engine ──────────────────────────────────────────
#
# Actors sit outside the system box on left / right.
# Use cases sit in a single column inside the system box.
# Each actor→use-case relationship is drawn as ONE separate line.
# No vertical bus. No "UC" prefix in labels.
#
# Data format per diagram:
#   actors  = [(name, side)]   side = 'L' or 'R'
#   usecases = [(label_text, [actor_names])]
# ─────────────────────────────────────────────────────────────

def make_diagram(fig_size, actors, usecases,
                 sys_cx, sys_cy, sys_w, sys_h, title,
                 left_ax_x, right_ax_x):
    fig, ax = plt.subplots(figsize=fig_size)
    fig.patch.set_facecolor('white')
    ax.set_aspect('equal')
    ax.axis('off')
    ax.set_xlim(left_ax_x - 2.5, right_ax_x + 2.5)
    ax.set_ylim(sys_cy - sys_h/2 - 1.0, sys_cy + sys_h/2 + 1.5)

    draw_system(ax, sys_cx, sys_cy, sys_w, sys_h, title)

    sys_top  = sys_cy + sys_h / 2
    sys_bot  = sys_cy - sys_h / 2
    content_top = sys_top - 0.60
    content_bot = sys_bot + 0.30

    # ONE gap for both actors and UCs
    n_rows  = max(len(usecases), len(actors))
    row_gap = (content_top - content_bot) / (n_rows + 1)

    # ── Actors: compact spacing, no extra padding ──
    name_to_y    = {}
    name_to_side = {}
    for i, (name, side) in enumerate(actors):
        y = content_top - (i + 1) * row_gap
        name_to_y[name]    = y
        name_to_side[name] = side
        x = left_ax_x if side == 'L' else right_ax_x
        draw_actor(ax, x, y, name)

    # ── Use cases ──
    uc_x = sys_cx
    UC_DATA = []   # store (label, actors, y, w, h)
    for i, (label, actor_names) in enumerate(usecases):
        y = content_top - (i + 1) * row_gap
        w, h = draw_uc(ax, uc_x, y, label)
        UC_DATA.append((label, actor_names, y, w, h))

    # ── One line per actor↔use-case pair: actor → ellipse edge ──
    for label, actor_names, uc_y, w, h in UC_DATA:
        a = w / 2.0
        b = h / 2.0
        for aname in actor_names:
            if aname not in name_to_y:
                continue
            ay   = name_to_y[aname]
            ax_x = left_ax_x if name_to_side[aname] == 'L' else right_ax_x
            hit_x, hit_y = line_to_ellipse_edge(uc_x, uc_y, a, b, ax_x, ay)
            ax.plot([ax_x, hit_x], [ay, hit_y], color=LINE_COLOR, lw=1.1, zorder=2)

    return fig


# ═════════════════════════════════════════════════════════════
# 9.2  Xác thực và Quản lý Truy cập
# ═════════════════════════════════════════════════════════════
def create_auth_diagram():
    actors = [
        ('Người dùng', 'L'),
        ('Người dùng (CĐT/NT)', 'R'),
    ]
    usecases = [
        ('Đăng nhập',          ['Người dùng', 'Người dùng (CĐT/NT)']),
        ('Đăng xuất',          ['Người dùng', 'Người dùng (CĐT/NT)']),
        ('Đổi mật khẩu',      ['Người dùng', 'Người dùng (CĐT/NT)']),
        ('Chuyển đổi vai trò', ['Người dùng', 'Người dùng (CĐT/NT)']),
    ]
    fig = make_diagram(
        (12, 9), actors, usecases,
        sys_cx=7, sys_cy=5, sys_w=6, sys_h=9.5,
        title="9.2. Xác thực và Quản lý Truy cập",
        left_ax_x=1.5, right_ax_x=12.5
    )
    path = f"{OUTPUT_DIR}/09_2_XacThuc_QuanLyTruyCap.png"
    fig.savefig(path, dpi=150, bbox_inches='tight', facecolor='white')
    plt.close(fig)
    print(f"Saved: {path}")


# ═════════════════════════════════════════════════════════════
# 9.3  Dashboard và Điều hướng
# ═════════════════════════════════════════════════════════════
def create_dashboard_diagram():
    actors = [
        ('Người dùng', 'L'),
    ]
    usecases = [
        ('Xem Dashboard Tổng quan',  ['Người dùng']),
        ('Điều hướng Sidebar',       ['Người dùng']),
        ('Nhận thông báo Real-time', ['Người dùng']),
        ('Đánh dấu thông báo đã đọc', ['Người dùng']),
    ]
    fig = make_diagram(
        (10, 9), actors, usecases,
        sys_cx=6, sys_cy=5, sys_w=6, sys_h=9.5,
        title="9.3. Dashboard và Điều hướng",
        left_ax_x=1.5, right_ax_x=12.5
    )
    path = f"{OUTPUT_DIR}/09_3_Dashboard_DieuHuong.png"
    fig.savefig(path, dpi=150, bbox_inches='tight', facecolor='white')
    plt.close(fig)
    print(f"Saved: {path}")


# ═════════════════════════════════════════════════════════════
# 9.4  Quản lý Dự án
# ═════════════════════════════════════════════════════════════
def create_project_diagram():
    actors = [
        ('Nhân viên',     'L'),
        ('Quản trị viên', 'R'),
    ]
    usecases = [
        ('Xem danh sách Dự án',  ['Nhân viên', 'Quản trị viên']),
        ('Tạo Dự án mới',       ['Nhân viên']),
        ('Xem Tiến độ Dự án',   ['Nhân viên']),
    ]
    fig = make_diagram(
        (11, 8), actors, usecases,
        sys_cx=7, sys_cy=4.5, sys_w=7, sys_h=9.5,
        title="9.4. Quản lý Dự án",
        left_ax_x=1.5, right_ax_x=13.5
    )
    path = f"{OUTPUT_DIR}/09_4_QuanLyDuAn.png"
    fig.savefig(path, dpi=150, bbox_inches='tight', facecolor='white')
    plt.close(fig)
    print(f"Saved: {path}")


# ═════════════════════════════════════════════════════════════
# 9.5  Đặt sách
# ═════════════════════════════════════════════════════════════
def create_dat_sach_diagram():
    actors = [
        ('Nhân viên',    'L'),
        ('Trưởng phòng', 'R'),
        ('Quản trị viên','R'),
    ]
    usecases = [
        ('Quản lý Đặt sách',          ['Nhân viên', 'Quản trị viên']),
        ('Lập GDN',                   ['Nhân viên']),
        ('Phân công số lượng in',     ['Nhân viên']),
        ('Duyệt GDN',                 ['Nhân viên']),
        ('Lập PCDI',                  ['Nhân viên']),
        ('Duyệt PCDI',                ['Nhân viên']),
        ('Lập & Duyệt Quyết định',   ['Nhân viên']),
        ('Xem trước & Tải tài liệu', ['Nhân viên']),
    ]
    fig = make_diagram(
        (13, 13), actors, usecases,
        sys_cx=7, sys_cy=6, sys_w=7, sys_h=12,
        title="9.5. Đặt sách",
        left_ax_x=1.5, right_ax_x=13.5
    )
    path = f"{OUTPUT_DIR}/09_5_DatSach.png"
    fig.savefig(path, dpi=150, bbox_inches='tight', facecolor='white')
    plt.close(fig)
    print(f"Saved: {path}")


# ═════════════════════════════════════════════════════════════
# 9.6  Dự toán
# ═════════════════════════════════════════════════════════════
def create_du_toan_diagram():
    actors = [
        ('Nhân viên',     'L'),
        ('Giám đốc',     'R'),
        ('Quản trị viên','R'),
    ]
    usecases = [
        ('Tạo Dự toán',              ['Nhân viên']),
        ('Phê duyệt Dự toán',        ['Giám đốc']),
        ('Từ chối Dự toán',          ['Giám đốc']),
        ('Sửa và Gửi lại Dự toán', ['Nhân viên']),
    ]
    fig = make_diagram(
        (12, 9), actors, usecases,
        sys_cx=7, sys_cy=4.5, sys_w=7, sys_h=9.5,
        title="9.6. Dự toán và Quyết định phê duyệt",
        left_ax_x=1.5, right_ax_x=13.5
    )
    path = f"{OUTPUT_DIR}/09_6_DuToan.png"
    fig.savefig(path, dpi=150, bbox_inches='tight', facecolor='white')
    plt.close(fig)
    print(f"Saved: {path}")


# ═════════════════════════════════════════════════════════════
# 9.7  Kế hoạch LCNT
# ═════════════════════════════════════════════════════════════
def create_ke_hoach_lcnt_diagram():
    actors = [
        ('Nhân viên',     'L'),
        ('Trưởng phòng', 'R'),
        ('Giám đốc',     'R'),
        ('Quản trị viên','R'),
    ]
    usecases = [
        ('Lập Tờ trình KHLCNT',       ['Nhân viên']),
        ('Lập Quyết định KHLCNT',     ['Nhân viên']),
        ('Thêm / Xóa Gói thầu',       ['Nhân viên']),
        ('Phê duyệt Tờ trình KHLCNT', ['Trưởng phòng']),
        ('Phê duyệt QĐ KHLCNT',       ['Giám đốc']),
    ]
    fig = make_diagram(
        (13, 10), actors, usecases,
        sys_cx=7, sys_cy=5, sys_w=7, sys_h=10,
        title="9.7. Kế hoạch Lựa chọn Nhà thầu",
        left_ax_x=1.5, right_ax_x=13.5
    )
    path = f"{OUTPUT_DIR}/09_7_KeHoachLCNT.png"
    fig.savefig(path, dpi=150, bbox_inches='tight', facecolor='white')
    plt.close(fig)
    print(f"Saved: {path}")


# ═════════════════════════════════════════════════════════════
# 9.8  LCNT
# ═════════════════════════════════════════════════════════════
def create_lcnt_diagram():
    actors = [
        ('Nhân viên',     'L'),
        ('Giám đốc',     'R'),
        ('Quản trị viên','R'),
    ]
    usecases = [
        ('Xem & Tạo Quy trình LCNT', ['Nhân viên']),
        ('Xử lý Bước LCNT',          ['Nhân viên']),
        ('Auto-fill dữ liệu',         ['Nhân viên']),
        ('Quản lý File đính kèm',    ['Nhân viên']),
        ('Tạo & Tải DOCX',           ['Nhân viên']),
        ('Phê duyệt Bước LCNT',      ['Giám đốc']),
        ('Hoàn thành Bước',          ['Nhân viên']),
        ('Mở lại Bước',              ['Nhân viên']),
        ('Tải ZIP toàn bộ hồ sơ',    ['Nhân viên']),
    ]
    fig = make_diagram(
        (12, 13), actors, usecases,
        sys_cx=7, sys_cy=6, sys_w=7, sys_h=12,
        title="9.8. Lựa chọn Nhà thầu (LCNT)",
        left_ax_x=1.5, right_ax_x=13.5
    )
    path = f"{OUTPUT_DIR}/09_8_LCNT.png"
    fig.savefig(path, dpi=150, bbox_inches='tight', facecolor='white')
    plt.close(fig)
    print(f"Saved: {path}")


# ═════════════════════════════════════════════════════════════
# 9.9  Thanh toán
# ═════════════════════════════════════════════════════════════
def create_thanh_toan_diagram():
    actors = [
        ('Nhân viên',     'L'),
        ('Quản trị viên', 'R'),
    ]
    usecases = [
        ('Xem danh sách Thanh toán', ['Nhân viên', 'Quản trị viên']),
        ('Tạo Hồ sơ Thanh toán',    ['Nhân viên']),
        ('Xử lý Bước Thanh toán',   ['Nhân viên']),
        ('Tải ZIP hồ sơ Thanh toán', ['Nhân viên', 'Quản trị viên']),
    ]
    fig = make_diagram(
        (11, 8), actors, usecases,
        sys_cx=7, sys_cy=4.5, sys_w=7, sys_h=9.5,
        title="9.9. Thanh toán",
        left_ax_x=1.5, right_ax_x=13.5
    )
    path = f"{OUTPUT_DIR}/09_9_ThanhToan.png"
    fig.savefig(path, dpi=150, bbox_inches='tight', facecolor='white')
    plt.close(fig)
    print(f"Saved: {path}")


# ═════════════════════════════════════════════════════════════
# 9.10  Nhà thầu
# ═════════════════════════════════════════════════════════════
def create_nha_thau_diagram():
    actors = [
        ('Nhà thầu', 'L'),
    ]
    usecases = [
        ('Tạo Hồ sơ Dự thầu',       ['Nhà thầu']),
        ('Xử lý Bước Dự thầu',     ['Nhà thầu']),
        ('Auto-fill dữ liệu',       ['Nhà thầu']),
        ('Quản lý File đính kèm',   ['Nhà thầu']),
        ('Tạo & Tải DOCX',          ['Nhà thầu']),
        ('Hoàn thành / Mở lại Bước', ['Nhà thầu']),
        ('Cập nhật Kết quả Dự thầu', ['Nhà thầu']),
        ('Tải ZIP hồ sơ Dự thầu',   ['Nhà thầu']),
    ]
    fig = make_diagram(
        (10, 13), actors, usecases,
        sys_cx=6, sys_cy=6, sys_w=6, sys_h=12,
        title="9.10. Nhà thầu",
        left_ax_x=1.5, right_ax_x=12.5
    )
    path = f"{OUTPUT_DIR}/09_10_NhaThau.png"
    fig.savefig(path, dpi=150, bbox_inches='tight', facecolor='white')
    plt.close(fig)
    print(f"Saved: {path}")


# ═════════════════════════════════════════════════════════════
# 9.11  Thư viện Văn bản
# ═════════════════════════════════════════════════════════════
def create_library_diagram():
    actors = [
        ('Quản trị viên', 'L'),
    ]
    usecases = [
        ('Quản lý Tổ chức',      ['Quản trị viên']),
        ('Quản lý Thư viện',     ['Quản trị viên']),
        ('Quản lý Trường dữ liệu', ['Quản trị viên']),
        ('Lưu Giá trị mẫu',     ['Quản trị viên']),
    ]
    fig = make_diagram(
        (10, 8), actors, usecases,
        sys_cx=6.5, sys_cy=4.5, sys_w=6.5, sys_h=9.5,
        title="9.11. Thư viện Văn bản",
        left_ax_x=1.5, right_ax_x=12.5
    )
    path = f"{OUTPUT_DIR}/09_11_ThuVienVanBan.png"
    fig.savefig(path, dpi=150, bbox_inches='tight', facecolor='white')
    plt.close(fig)
    print(f"Saved: {path}")


# ═════════════════════════════════════════════════════════════
# 9.12  Quản trị
# ═════════════════════════════════════════════════════════════
def create_admin_diagram():
    actors = [
        ('Quản trị viên', 'L'),
    ]
    usecases = [
        ('Quản lý Người dùng',   ['Quản trị viên']),
        ('Thêm Người dùng mới',  ['Quản trị viên']),
        ('Sửa Người dùng',       ['Quản trị viên']),
        ('Xóa Người dùng',       ['Quản trị viên']),
        ('Đặt lại Mật khẩu',     ['Quản trị viên']),
        ('Quản lý Phân quyền',   ['Quản trị viên']),
        ('Bật / Tắt Quyền nghiệp vụ', ['Quản trị viên']),
    ]
    fig = make_diagram(
        (11, 10), actors, usecases,
        sys_cx=6.5, sys_cy=5.5, sys_w=6.5, sys_h=10.5,
        title="9.12. Quản trị",
        left_ax_x=1.5, right_ax_x=12.5
    )
    path = f"{OUTPUT_DIR}/09_12_QuanTri.png"
    fig.savefig(path, dpi=150, bbox_inches='tight', facecolor='white')
    plt.close(fig)
    print(f"Saved: {path}")


# ═════════════════════════════════════════════════════════════
# 9.13  Tác vụ Dùng chung
# ═════════════════════════════════════════════════════════════
def create_common_diagram():
    actors = [
        ('Nhân viên',     'L'),
        ('Giám đốc',     'R'),
        ('Trưởng phòng', 'R'),
        ('Quản trị viên','R'),
    ]
    usecases = [
        ('Gửi duyệt Tài liệu',     ['Nhân viên']),
        ('Thẩm định Tài liệu',      ['Trưởng phòng']),
        ('Phê duyệt Tài liệu',      ['Giám đốc']),
        ('Từ chối Tài liệu',        ['Giám đốc']),
        ('Chọn Dữ liệu Thư viện',  ['Nhân viên', 'Giám đốc', 'Trưởng phòng', 'Quản trị viên']),
        ('Lưu Dữ liệu vào Thư viện',['Nhân viên', 'Giám đốc', 'Trưởng phòng', 'Quản trị viên']),
    ]
    fig = make_diagram(
        (14, 10), actors, usecases,
        sys_cx=7.5, sys_cy=5, sys_w=7.5, sys_h=10,
        title="9.13. Tác vụ Dùng chung",
        left_ax_x=1.5, right_ax_x=14.5
    )
    path = f"{OUTPUT_DIR}/09_13_TacVuDungChung.png"
    fig.savefig(path, dpi=150, bbox_inches='tight', facecolor='white')
    plt.close(fig)
    print(f"Saved: {path}")


# ═════════════════════════════════════════════════════════════
if __name__ == "__main__":
    print("Generating use case diagrams...")
    create_auth_diagram()
    create_dashboard_diagram()
    create_project_diagram()
    create_dat_sach_diagram()
    create_du_toan_diagram()
    create_ke_hoach_lcnt_diagram()
    create_lcnt_diagram()
    create_thanh_toan_diagram()
    create_nha_thau_diagram()
    create_library_diagram()
    create_admin_diagram()
    create_common_diagram()
    print(f"\nAll diagrams saved to: {OUTPUT_DIR}/")
