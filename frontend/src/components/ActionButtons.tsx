'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

interface ActionButtonsProps {
  status: string;
  role: string;
  entityType: 'budget' | 'plan';
  isOwner: boolean;
  onSubmit?: () => Promise<void>;
  onApprove?: (comment: string) => Promise<void>;
  onReject?: (comment: string) => Promise<void>;
  onReview?: (comment: string) => Promise<void>;
  onResubmit?: () => Promise<void>;
}

export function ActionButtons({
  status, role, entityType, isOwner,
  onSubmit, onApprove, onReject, onReview, onResubmit,
}: ActionButtonsProps) {
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState('');
  const [showComment, setShowComment] = useState<string | null>(null);

  const handleAction = async (action: string, fn?: (c: string) => Promise<void>) => {
    if (!fn) return;
    setLoading(action);
    try {
      await fn(comment);
      setComment('');
      setShowComment(null);
      toast.success('Thao tác thành công');
    } catch (err: any) {
      toast.error(err.message || 'Thao tác thất bại');
    } finally {
      setLoading('');
    }
  };

  const handleSimpleAction = async (action: string, fn?: () => Promise<void>) => {
    if (!fn) return;
    setLoading(action);
    try {
      await fn();
      toast.success('Thao tác thành công');
    } catch (err: any) {
      toast.error(err.message || 'Thao tác thất bại');
    } finally {
      setLoading('');
    }
  };

  const buttons: React.ReactNode[] = [];

  // Submit button for INVESTOR on DRAFT items
  if (status === 'DRAFT' && isOwner && onSubmit) {
    buttons.push(
      <button key="submit" onClick={() => handleSimpleAction('submit', onSubmit)} disabled={loading === 'submit'}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
        {loading === 'submit' ? '...' : 'Gửi duyệt'}
      </button>
    );
  }

  // Resubmit for rejected items
  if (status === 'REJECTED' && isOwner && onResubmit) {
    buttons.push(
      <button key="resubmit" onClick={() => handleSimpleAction('resubmit', onResubmit)} disabled={loading === 'resubmit'}
        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 text-sm font-medium">
        {loading === 'resubmit' ? '...' : 'Gửi lại'}
      </button>
    );
  }

  // Review button for HEAD_OF_DEPARTMENT on SUBMITTED plans
  if (entityType === 'plan' && status === 'SUBMITTED' && (role === 'HEAD_OF_DEPARTMENT' || role === 'ADMIN') && onReview) {
    buttons.push(
      <button key="review" onClick={() => showComment === 'review' ? handleAction('review', onReview) : setShowComment('review')}
        disabled={loading === 'review'}
        className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 text-sm font-medium">
        {loading === 'review' ? '...' : 'Thẩm định'}
      </button>
    );
  }

  // Approve button
  const canApproveBudget = entityType === 'budget' && status === 'SUBMITTED' && (role === 'DIRECTOR' || role === 'ADMIN');
  const canApprovePlan = entityType === 'plan' && status === 'REVIEWING' && (role === 'DIRECTOR' || role === 'ADMIN');
  if ((canApproveBudget || canApprovePlan) && onApprove) {
    buttons.push(
      <button key="approve" onClick={() => showComment === 'approve' ? handleAction('approve', onApprove) : setShowComment('approve')}
        disabled={loading === 'approve'}
        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium">
        {loading === 'approve' ? '...' : 'Phê duyệt'}
      </button>
    );
  }

  // Reject button
  const canRejectBudget = entityType === 'budget' && status === 'SUBMITTED' && (role === 'DIRECTOR' || role === 'ADMIN');
  const canRejectPlan = entityType === 'plan' && ['SUBMITTED', 'REVIEWING'].includes(status) && ['HEAD_OF_DEPARTMENT', 'DIRECTOR', 'ADMIN'].includes(role);
  if ((canRejectBudget || canRejectPlan) && onReject) {
    buttons.push(
      <button key="reject" onClick={() => showComment === 'reject' ? handleAction('reject', onReject) : setShowComment('reject')}
        disabled={loading === 'reject'}
        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium">
        {loading === 'reject' ? '...' : 'Từ chối'}
      </button>
    );
  }

  if (buttons.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">{buttons}</div>
      {showComment && (
        <div className="flex gap-2">
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Nhập nhận xét (tùy chọn)..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
          />
          <button onClick={() => setShowComment(null)} className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800">
            Hủy
          </button>
        </div>
      )}
    </div>
  );
}
