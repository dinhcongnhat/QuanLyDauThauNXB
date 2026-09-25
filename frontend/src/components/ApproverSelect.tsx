'use client';

import { api } from '@/lib/api';
import { CheckCircle2, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface Approver {
  id: string;
  name: string;
  email: string;
  department?: string;
  position?: string;
}

export function ApproverSelect({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [approvers, setApprovers] = useState<Approver[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getApprovers()
      .then(setApprovers)
      .catch(() => setApprovers([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('vi');
    if (!normalized) return approvers;
    return approvers.filter((approver) =>
      [approver.name, approver.email, approver.department, approver.position]
        .filter(Boolean)
        .some((field) => field!.toLocaleLowerCase('vi').includes(normalized)),
    );
  }, [approvers, query]);

  return (
    <section className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-5 w-5 text-blue-600" />
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Chọn người phê duyệt
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Bắt buộc đối với Quyết định. Chỉ các tài khoản được Admin cấp quyền mới xuất hiện.
          </p>
        </div>
      </div>
      <div className="relative mt-3">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input
          value={query}
          disabled={disabled}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Tìm theo tên, email, phòng ban..."
          className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-400"
        />
      </div>
      <select
        value={value}
        disabled={disabled || loading}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400 disabled:opacity-60"
      >
        <option value="">
          {loading ? 'Đang tải danh sách...' : '-- Chọn người phê duyệt --'}
        </option>
        {filtered.map((approver) => (
          <option key={approver.id} value={approver.id}>
            {approver.name}
            {approver.position ? ` · ${approver.position}` : ''}
            {approver.department ? ` · ${approver.department}` : ''}
          </option>
        ))}
      </select>
      {!loading && approvers.length === 0 && (
        <p className="mt-2 text-xs text-amber-700">
          Chưa có tài khoản nào được cấp quyền phê duyệt.
        </p>
      )}
    </section>
  );
}
