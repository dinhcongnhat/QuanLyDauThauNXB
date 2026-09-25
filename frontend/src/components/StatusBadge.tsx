'use client';

const statusConfig: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'Bản nháp', className: 'status-neutral' },
  NOT_STARTED: { label: 'Chưa thực hiện', className: 'status-neutral' },
  PENDING: { label: 'Chờ xử lý', className: 'status-pending' },
  SUBMITTED: { label: 'Đã trình', className: 'status-pending' },
  PENDING_APPROVAL: { label: 'Chờ phê duyệt', className: 'status-pending' },
  REVIEWING: { label: 'Đang thẩm định', className: 'status-processing' },
  IN_PROGRESS: { label: 'Đang thực hiện', className: 'status-processing' },
  APPROVED: { label: 'Đã phê duyệt', className: 'status-approved' },
  COMPLETED: { label: 'Hoàn thành', className: 'status-approved' },
  REJECTED: { label: 'Từ chối', className: 'status-rejected' },
  CANCELLED: { label: 'Đã hủy', className: 'status-neutral' },
  EXPIRED: { label: 'Hết hiệu lực', className: 'status-neutral' },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || { label: status, className: 'status-neutral' };
  return (
    <span className={config.className}>
      {config.label}
    </span>
  );
}
