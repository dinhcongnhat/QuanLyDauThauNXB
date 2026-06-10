import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  stepKey?: string;
  title?: string;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  projectId,
  stepKey,
  title = 'Lịch sử thay đổi quy trình',
}) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen && projectId) {
      fetchLogs();
    }
  }, [isOpen, projectId, stepKey]);

  const fetchLogs = async () => {
    if (!projectId) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.getProjectLogs(projectId, stepKey);
      setLogs(data);
    } catch (err: any) {
      console.error('Failed to load project logs', err);
      setError('Không thể tải lịch sử quy trình');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const getActionBadge = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('CREATE')) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    if (act.includes('APPROVE') || act.includes('COMPLETE')) {
      return 'bg-green-50 text-green-700 border-green-200';
    }
    if (act.includes('REJECT') || act.includes('DELETE')) {
      return 'bg-red-50 text-red-700 border-red-200';
    }
    if (act.includes('REOPEN') || act.includes('UPDATE')) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    return 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      CREATE_PROJECT: 'Khởi tạo dự án',
      CREATE_LCNT: 'Khởi tạo LCNT',
      CREATE_PAYMENT: 'Khởi tạo thanh toán',
      UPDATE_STEP: 'Cập nhật',
      REQUEST_APPROVAL: 'Trình duyệt',
      APPROVE_STEP: 'Phê duyệt',
      REJECT_STEP: 'Từ chối',
      COMPLETE_STEP: 'Hoàn thành',
      REOPEN_STEP: 'Mở lại',
      UPLOAD_FILE: 'Đính kèm file',
      DELETE_FILE: 'Xóa file',
    };
    return labels[action] || action;
  };

  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${hours}:${minutes} - ${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col max-h-[85vh] overflow-hidden transform scale-100 transition-all">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
          <div>
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
              {title}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Toàn bộ lịch sử hành động và thay đổi trạng thái của quy trình</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-gray-500 font-medium">Đang tải lịch sử dữ liệu...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl text-center">
              {error}
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-3">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm text-gray-500 font-medium">Chưa có bản ghi lịch sử nào được ghi nhận cho bước này.</p>
            </div>
          ) : (
            <div className="relative border-l-2 border-indigo-100 ml-4 pl-6 space-y-6">
              {logs.map((log) => (
                <div key={log.id} className="relative group">
                  {/* Dot */}
                  <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 border-indigo-500 bg-white group-hover:scale-125 transition-transform"></div>

                  {/* Log Card */}
                  <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${getActionBadge(log.action)}`}>
                          {getActionLabel(log.action)}
                        </span>
                        <span className="text-xs text-gray-400 font-medium">
                          {formatTime(log.createdAt)}
                        </span>
                      </div>
                      {log.user && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded-lg">
                          <span className="font-semibold text-gray-700">{log.user.name}</span>
                          <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.2 rounded font-medium">
                            {log.user.role === 'ADMIN' ? 'QLDA' : log.user.role === 'HEAD_OF_DEPARTMENT' ? 'Trưởng phòng' : log.user.role === 'DIRECTOR' ? 'Giám đốc' : 'Nhân viên'}
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed font-medium">
                      {log.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-gray-100 bg-white flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm rounded-xl transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
