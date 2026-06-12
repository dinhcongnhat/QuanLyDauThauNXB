'use client';

const statusConfig: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Bản nháp', color: 'bg-gray-100 text-gray-700' },
  PENDING_APPROVAL: { label: 'Chờ phê duyệt', color: 'bg-yellow-100 text-yellow-700' },
  APPROVED: { label: 'Đã phê duyệt', color: 'bg-green-100 text-green-700' },
  REJECTED: { label: 'Từ chối', color: 'bg-red-100 text-red-700' },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-700' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}
