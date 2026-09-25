'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

interface ActionButtonsProps {
  status: string;
  role: string;
  canApprove: boolean;
  entityType: 'budget' | 'plan';
  isOwner: boolean;
  onSubmit?: () => Promise<void>;
  onApprove?: (comment: string) => Promise<void>;
  onReject?: (comment: string) => Promise<void>;
  onReview?: (comment: string) => Promise<void>;
  onResubmit?: () => Promise<void>;
}

export function ActionButtons({
  status, role, canApprove, entityType, isOwner,
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

  // Submit button for owners on DRAFT items
  if (status === 'DRAFT' && isOwner && onSubmit) {
    buttons.push(
      <button key="submit" onClick={() => handleSimpleAction('submit', onSubmit)} disabled={loading === 'submit'}
        className="btn-primary disabled:opacity-50">
        {loading === 'submit' ? 'Đang gửi...' : 'Gửi duyệt'}
      </button>
    );
  }

  // Resubmit for rejected items
  if (status === 'REJECTED' && isOwner && onResubmit) {
    buttons.push(
      <button key="resubmit" onClick={() => handleSimpleAction('resubmit', onResubmit)} disabled={loading === 'resubmit'}
        className="btn-secondary disabled:opacity-50">
        {loading === 'resubmit' ? 'Đang gửi...' : 'Gửi lại'}
      </button>
    );
  }

  // Review button for approvers on SUBMITTED plans
  if (entityType === 'plan' && status === 'SUBMITTED' && (role === 'ADMIN' || canApprove) && onReview) {
    buttons.push(
      <button key="review" onClick={() => showComment === 'review' ? handleAction('review', onReview) : setShowComment('review')}
        disabled={loading === 'review'}
        className="btn-secondary disabled:opacity-50">
        {loading === 'review' ? 'Đang xử lý...' : 'Thẩm định'}
      </button>
    );
  }

  // Approve button - ADMIN or canApprove users
  if ((role === 'ADMIN' || canApprove) && onApprove) {
    const showApprove = (status === 'SUBMITTED' || status === 'PENDING_APPROVAL' || status === 'REVIEWING');
    if (showApprove) {
      buttons.push(
        <button key="approve" onClick={() => showComment === 'approve' ? handleAction('approve', onApprove) : setShowComment('approve')}
          disabled={loading === 'approve'}
          className="btn-primary disabled:opacity-50">
          {loading === 'approve' ? 'Đang xử lý...' : 'Phê duyệt'}
        </button>
      );
    }
  }

  // Reject button - ADMIN or canApprove users
  if ((role === 'ADMIN' || canApprove) && onReject) {
    const showReject = (status === 'SUBMITTED' || status === 'PENDING_APPROVAL' || status === 'REVIEWING');
    if (showReject) {
      buttons.push(
        <button key="reject" onClick={() => showComment === 'reject' ? handleAction('reject', onReject) : setShowComment('reject')}
          disabled={loading === 'reject'}
          className="btn-danger disabled:opacity-50">
          {loading === 'reject' ? 'Đang xử lý...' : 'Từ chối'}
        </button>
      );
    }
  }

  if (buttons.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">{buttons}</div>
      {showComment && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Nhập nhận xét (tùy chọn)..."
            className="input-field flex-1"
          />
          <button onClick={() => setShowComment(null)} className="btn-neutral">
            Hủy
          </button>
        </div>
      )}
    </div>
  );
}
