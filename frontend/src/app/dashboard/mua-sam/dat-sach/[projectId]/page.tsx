'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { User } from '@/lib/types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

type Tab = 'gdni' | 'pcdi' | 'quyetdinh';

export default function DatSachDetailPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { user } = useAuthStore();

  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('gdni');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showAssignmentView, setShowAssignmentView] = useState(false);
  const [myAssignments, setMyAssignments] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(false);

  // GDN form data
  const [gdnData, setGdnData] = useState({
    tenSach: '', tacGia: '', bbt: '', namXB: '', soTrang: '', khoSach: '',
    giaBia: '', soLuongTon: '', thoiGianCanSach: '', deNghiNoiIn: '', ghiChu: '',
  });

  // PCDI form data
  const [pcdiData, setPcdiData] = useState({
    bbt: '', phuongThuc: '', tenSach: '', tacGia: '', soTrang: '', khoSach: '',
    soLuongIn: '', giaTriHopDong: '', coSoIn: '', thongSoKyThuat: '', ghiChu: '',
  });

  const fetchProject = async () => {
    try {
      const p = await api.getDatSachProject(projectId);
      setProject(p);
      if (p.gdnDocuments?.[0]) {
        const g = p.gdnDocuments[0];
        setGdnData(prev => ({
          ...prev,
          tenSach: g.data?.tenSach || g.data?.TenSach || prev.tenSach,
          tacGia: g.data?.tacGia || g.data?.TacGia || prev.tacGia,
          bbt: g.data?.bbt || g.data?.BBT || prev.bbt,
          namXB: g.data?.namXB || g.data?.NamXB || prev.namXB,
          soTrang: g.data?.soTrang || g.data?.SoTrang || prev.soTrang,
          khoSach: g.data?.khoSach || g.data?.KhoSach || prev.khoSach,
          giaBia: g.data?.giaBia || g.data?.GiaBia || prev.giaBia,
          soLuongTon: g.data?.soLuongTon || g.data?.SoLuongTon || prev.soLuongTon,
          thoiGianCanSach: g.data?.thoiGianCanSach || g.data?.ThoiGianCanSach || prev.thoiGianCanSach,
          deNghiNoiIn: g.data?.deNghiNoiIn || g.data?.DeNghiNoiIn || prev.deNghiNoiIn,
          ghiChu: g.data?.ghiChu || g.data?.GhiChu || prev.ghiChu,
        }));
      }
      if (p.pcdiDocuments?.[0]) {
        const pc = p.pcdiDocuments[0];
        setPcdiData(prev => ({
          ...prev,
          bbt: pc.data?.bbt || pc.data?.BBT || prev.bbt,
          phuongThuc: pc.data?.phuongThuc || pc.data?.PhuongThuc || prev.phuongThuc,
          tenSach: pc.data?.tenSach || pc.data?.TenSach || prev.tenSach,
          tacGia: pc.data?.tacGia || pc.data?.TacGia || prev.tacGia,
          soTrang: pc.data?.soTrang || pc.data?.SoTrang || prev.soTrang,
          khoSach: pc.data?.khoSach || pc.data?.KhoSach || prev.khoSach,
          soLuongIn: pc.data?.soLuongIn || pc.data?.SoLuongIn || prev.soLuongIn,
          giaTriHopDong: pc.data?.giaTriHopDong || pc.data?.GiaTriHopDong || prev.giaTriHopDong,
          coSoIn: pc.data?.coSoIn || pc.data?.CoSoIn || prev.coSoIn,
          thongSoKyThuat: pc.data?.thongSoKyThuat || pc.data?.ThongSoKyThuat || prev.thongSoKyThuat,
          ghiChu: pc.data?.ghiChu || pc.data?.GhiChu || prev.ghiChu,
        }));
      }
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchProject();
    api.getUsers().then(setUsers).catch(() => {});
    api.getMyAssignments().then(setMyAssignments).catch(() => {});
  }, [projectId]);

  // ─── GDN Actions ─────────────────────────────────────────────────

  const handleCreateOrUpdateGDN = async (approve = false) => {
    setSaving(true);
    try {
      const gdn = project.gdnDocuments?.[0];
      if (gdn) {
        await api.updateGDNInSach(gdn.id, gdnData);
      } else {
        await api.createGDNInSach(projectId, gdnData);
      }
      toast.success('Đã lưu thông tin GDN');
      fetchProject();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleAssignUsers = async () => {
    if (selectedUsers.length === 0) { toast.error('Chọn ít nhất 1 user'); return; }
    setSaving(true);
    try {
      const gdn = project.gdnDocuments?.[0];
      if (!gdn) { toast.error('Tạo GDN trước'); return; }
      await api.assignUsersForSL(gdn.id, selectedUsers);
      toast.success('Đã phân công user điền SL');
      setShowAssignModal(false);
      fetchProject();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleFillSL = async (gdnId: string, userId: string, soLuong: number) => {
    setSaving(true);
    try {
      await api.fillSL(gdnId, userId, soLuong);
      toast.success('Đã cập nhật số lượng');
      fetchProject();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleApproveGDN = async () => {
    setSaving(true);
    try {
      const gdn = project.gdnDocuments?.[0];
      if (!gdn) return;
      await api.approveGDN(gdn.id);
      toast.success('Đã duyệt GDN');
      fetchProject();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleDownloadGDN = async () => {
    const gdn = project?.gdnDocuments?.[0];
    if (!gdn) return;
    try {
      const res = await api.downloadGDNDatSach(gdn.id);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GiayDeNghiIn_${gdn.id.slice(0, 8)}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) { toast.error(err.message); }
  };

  // ─── PCDI Actions ────────────────────────────────────────────────

  const handleCreateOrUpdatePCDI = async () => {
    setSaving(true);
    try {
      const pcdi = project.pcdiDocuments?.[0];
      if (pcdi) {
        await api.updatePCDICoSoIn(pcdi.id, pcdiData);
      } else {
        await api.createPCDICoSoIn(projectId, pcdiData);
      }
      toast.success('Đã lưu Phiếu chỉ định');
      fetchProject();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleApprovePCDI = async () => {
    setSaving(true);
    try {
      const pcdi = project.pcdiDocuments?.[0];
      if (!pcdi) return;
      await api.approvePCDI(pcdi.id);
      toast.success('Đã duyệt Phiếu chỉ định');
      fetchProject();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleDownloadPCDI = async () => {
    const pcdi = project?.pcdiDocuments?.[0];
    if (!pcdi) return;
    try {
      const res = await api.downloadPCDIDatSach(pcdi.id);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PhieuChiDinhCoSoIn_${pcdi.id.slice(0, 8)}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) { toast.error(err.message); }
  };

  // ─── Generate Quyết Định ────────────────────────────────────────

  const handleGenerateQuyetDinh = async () => {
    setSaving(true);
    try {
      const res = await api.generateQuyetDinhDatSach(projectId);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `QuyetDinhDatSach_${(project?.tenDuAn || 'document').replace(/[^a-zA-Z0-9]/g, '_')}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      await api.markDatSachCompleted(projectId);
      toast.success('Đã generate và tải Quyết định');
      fetchProject();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
    </div>
  );

  const gdn = project?.gdnDocuments?.[0];
  const pcdi = project?.pcdiDocuments?.[0];
  const totalSL = (gdn?.assignments || []).reduce((sum: number, a: any) => sum + (a.soLuong || 0), 0);
  const gdnApproved = gdn?.status === 'APPROVED';
  const pcdiApproved = pcdi?.status === 'APPROVED';
  const canGenerateQD = gdnApproved && pcdiApproved;

  return (
    <div className="space-y-6">
      {/* Project Info */}
      <div className="bg-white rounded-xl p-5 shadow-sm border">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium px-2 py-1 rounded ${
                project?.status === 'COMPLETED' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'
              }`}>
                {project?.status === 'COMPLETED' ? 'Hoàn thành' : 'Đang thực hiện'}
              </span>
              <span className="text-xs text-gray-400">
                {project?.procurementType === 'THAU_SACH' ? 'Thầu Sách' : 'Thầu Thiết Bị'}
              </span>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mt-2">{project?.tenDuAn}</h1>
            <p className="text-sm text-gray-500 mt-1">
              Người tạo: {project?.creator?.name} • {format(new Date(project?.createdAt), 'dd/MM/yyyy', { locale: vi })}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('gdni')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'gdni' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          1. Giấy đề nghị in sách
        </button>
        <button
          onClick={() => setActiveTab('pcdi')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'pcdi' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          } ${!gdnApproved ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={!gdnApproved}
        >
          2. Phiếu chỉ định cơ sở in {!gdnApproved && '🔒'}
        </button>
        <button
          onClick={() => setActiveTab('quyetdinh')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'quyetdinh' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          } ${!canGenerateQD ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={!canGenerateQD}
        >
          3. Quyết định {!canGenerateQD && '🔒'}
        </button>
      </div>

      {/* ─── Tab 1: GDN ─── */}
      {activeTab === 'gdni' && (
        <div className="space-y-4">
          {/* GDN Status */}
          <div className="bg-white rounded-xl p-4 border">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">Giấy đề nghị in/tái bản sách</h3>
              <div className="flex gap-2 items-center">
                {gdn?.status && (
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    gdn.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                    gdn.status === 'ASSIGNED' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {gdn.status === 'ASSIGNED' ? 'Đã phân công' : gdn.status === 'APPROVED' ? 'Đã duyệt' : 'Nháp'}
                  </span>
                )}
                {gdn && (
                  <button onClick={handleDownloadGDN} className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
                    📥 DOCX
                  </button>
                )}
              </div>
            </div>

            {/* GDN Form */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Tên sách</label>
                <input className="inp w-full mt-1" value={gdnData.tenSach} onChange={e => setGdnData({ ...gdnData, tenSach: e.target.value })} placeholder="VD: Quản trị công ty thực chiến" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Tác giả</label>
                <input className="inp w-full mt-1" value={gdnData.tacGia} onChange={e => setGdnData({ ...gdnData, tacGia: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">BBT</label>
                <input className="inp w-full mt-1" value={gdnData.bbt} onChange={e => setGdnData({ ...gdnData, bbt: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Năm XB</label>
                <input className="inp w-full mt-1" value={gdnData.namXB} onChange={e => setGdnData({ ...gdnData, namXB: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Số trang</label>
                <input className="inp w-full mt-1" value={gdnData.soTrang} onChange={e => setGdnData({ ...gdnData, soTrang: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Khổ sách</label>
                <input className="inp w-full mt-1" value={gdnData.khoSach} onChange={e => setGdnData({ ...gdnData, khoSach: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Giá bìa</label>
                <input className="inp w-full mt-1" value={gdnData.giaBia} onChange={e => setGdnData({ ...gdnData, giaBia: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Số lượng tồn</label>
                <input className="inp w-full mt-1" value={gdnData.soLuongTon} onChange={e => setGdnData({ ...gdnData, soLuongTon: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">SL đề nghị in (tổng)</label>
                <input className="inp w-full mt-1 bg-gray-50" value={totalSL || ''} readOnly placeholder="Tự động tính từ assignments" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Thời gian cần sách</label>
                <input className="inp w-full mt-1" value={gdnData.thoiGianCanSach} onChange={e => setGdnData({ ...gdnData, thoiGianCanSach: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600">Đề nghị nơi in</label>
                <input className="inp w-full mt-1" value={gdnData.deNghiNoiIn} onChange={e => setGdnData({ ...gdnData, deNghiNoiIn: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600">Ghi chú</label>
                <input className="inp w-full mt-1" value={gdnData.ghiChu} onChange={e => setGdnData({ ...gdnData, ghiChu: e.target.value })} />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-4 flex-wrap">
              <button onClick={() => handleCreateOrUpdateGDN()} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50">
                {saving ? 'Đang lưu...' : gdn ? 'Cập nhật' : 'Tạo GDN'}
              </button>
              {!gdnApproved && gdn && (
                <>
                  <button onClick={() => setShowAssignModal(true)} className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm">
                    Phân công user điền SL
                  </button>
                  <button onClick={() => setShowAssignmentView(true)} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm">
                    Xem/Điền SL
                  </button>
                  <button onClick={handleApproveGDN} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
                    Duyệt GDN
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Assignment View */}
          {showAssignmentView && gdn && (
            <div className="bg-white rounded-xl p-4 border">
              <h3 className="font-semibold text-gray-800 mb-3">Danh sách phân công - Điền số lượng</h3>
              {(gdn.assignments || []).length === 0 ? (
                <p className="text-gray-400 text-sm">Chưa có user nào được phân công</p>
              ) : (
                <div className="space-y-2">
                  {(gdn.assignments || []).map((a: any) => (
                    <div key={a.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">{a.user?.name}</p>
                        <p className="text-xs text-gray-400">{a.user?.email}</p>
                      </div>
                      <input
                        type="number"
                        className="border rounded px-3 py-1.5 text-sm w-28 text-center"
                        defaultValue={a.soLuong || ''}
                        placeholder="Số lượng"
                        onBlur={e => { if (e.target.value) handleFillSL(gdn.id, a.userId, parseInt(e.target.value)); }}
                      />
                      <span className={`text-xs px-2 py-1 rounded ${a.soLuong ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {a.soLuong ? `${a.soLuong} sách` : 'Chưa điền'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── Tab 2: PCDI ─── */}
      {activeTab === 'pcdi' && gdnApproved && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-4 border">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">Phiếu chỉ định cơ sở in</h3>
              <div className="flex gap-2 items-center">
                {pcdi?.status && (
                  <span className={`text-xs px-2 py-1 rounded-full ${pcdi.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {pcdi.status === 'APPROVED' ? 'Đã duyệt' : 'Nháp'}
                  </span>
                )}
                {pcdi && (
                  <button onClick={handleDownloadPCDI} className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
                    📥 DOCX
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600">BBT</label>
                <input className="inp w-full mt-1" value={pcdiData.bbt} onChange={e => setPcdiData({ ...pcdiData, bbt: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Phương thức</label>
                <input className="inp w-full mt-1" value={pcdiData.phuongThuc} onChange={e => setPcdiData({ ...pcdiData, phuongThuc: e.target.value })} placeholder="VD: In offset, In kỹ thuật số" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Tên sách</label>
                <input className="inp w-full mt-1" value={pcdiData.tenSach} onChange={e => setPcdiData({ ...pcdiData, tenSach: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Tác giả</label>
                <input className="inp w-full mt-1" value={pcdiData.tacGia} onChange={e => setPcdiData({ ...pcdiData, tacGia: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Số trang</label>
                <input className="inp w-full mt-1" value={pcdiData.soTrang} onChange={e => setPcdiData({ ...pcdiData, soTrang: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Khổ sách</label>
                <input className="inp w-full mt-1" value={pcdiData.khoSach} onChange={e => setPcdiData({ ...pcdiData, khoSach: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Số lượng in</label>
                <input className="inp w-full mt-1" value={pcdiData.soLuongIn} onChange={e => setPcdiData({ ...pcdiData, soLuongIn: e.target.value })} placeholder="Tự điền từ GDN" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Giá trị HĐ (đ)</label>
                <input className="inp w-full mt-1" value={pcdiData.giaTriHopDong} onChange={e => setPcdiData({ ...pcdiData, giaTriHopDong: e.target.value })} placeholder="VD: 50000000" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Cơ sở in</label>
                <input className="inp w-full mt-1" value={pcdiData.coSoIn} onChange={e => setPcdiData({ ...pcdiData, coSoIn: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Thông số kỹ thuật</label>
                <input className="inp w-full mt-1" value={pcdiData.thongSoKyThuat} onChange={e => setPcdiData({ ...pcdiData, thongSoKyThuat: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600">Ghi chú</label>
                <input className="inp w-full mt-1" value={pcdiData.ghiChu} onChange={e => setPcdiData({ ...pcdiData, ghiChu: e.target.value })} />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={handleCreateOrUpdatePCDI} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50">
                {saving ? 'Đang lưu...' : pcdi ? 'Cập nhật' : 'Tạo Phiếu'}
              </button>
              {!pcdiApproved && pcdi && (
                <button onClick={handleApprovePCDI} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
                  Duyệt Phiếu
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Tab 3: Quyết Định ─── */}
      {activeTab === 'quyetdinh' && canGenerateQD && (
        <div className="bg-white rounded-xl p-6 border">
          <h3 className="font-semibold text-gray-800 mb-2">Quyết định đặt sách</h3>
          <p className="text-sm text-gray-500 mb-4">
            Quyết định sẽ được tạo từ dữ liệu của Giấy đề nghị in và Phiếu chỉ định cơ sở in đã duyệt.
          </p>
          <div className="bg-green-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-green-800">
              <strong>Điều kiện đã đủ:</strong><br />
              {gdnApproved && <span className="text-green-600">- GDN: Đã duyệt</span>}<br />
              {pcdiApproved && <span className="text-green-600">- PCDI: Đã duyệt</span>}
            </p>
          </div>
          <button onClick={handleGenerateQuyetDinh} disabled={saving} className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium disabled:opacity-50">
            {saving ? 'Đang generate...' : 'Generate & Tải Quyết định'}
          </button>
        </div>
      )}

      {activeTab === 'quyetdinh' && !canGenerateQD && (
        <div className="bg-white rounded-xl p-6 border">
          <h3 className="font-semibold text-gray-800 mb-2">Quyết định đặt sách</h3>
          <p className="text-sm text-gray-500 mb-4">
            Cần hoàn thành bước 1 (GDN) và bước 2 (PCDI) và được duyệt trước khi tạo Quyết định.
          </p>
          <div className="bg-yellow-50 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              {!gdnApproved && <span>- GDN: Chưa duyệt</span>}<br />
              {!pcdiApproved && <span>- PCDI: Chưa duyệt</span>}
            </p>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowAssignModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Phân công user điền số lượng</h3>
            <p className="text-sm text-gray-500 mb-3">Chọn các user cần điền số lượng đề nghị in sách:</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {users.filter(u => u.role !== 'ADMIN').map(u => (
                <label key={u.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(u.id)}
                    onChange={e => {
                      if (e.target.checked) setSelectedUsers([...selectedUsers, u.id]);
                      else setSelectedUsers(selectedUsers.filter(id => id !== u.id));
                    }}
                    className="w-4 h-4"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{u.name}</p>
                    <p className="text-xs text-gray-400">{u.email} - {u.department || 'Không có phòng'}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex gap-2 mt-6 justify-end">
              <button onClick={() => setShowAssignModal(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm">Hủy</button>
              <button onClick={handleAssignUsers} disabled={saving} className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm disabled:opacity-50">
                {saving ? 'Đang phân công...' : `Phân công (${selectedUsers.length})`}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .inp { border: 1px solid #d1d5db; border-radius: 0.5rem; padding: 0.5rem 0.75rem; font-size: 0.875rem; outline: none; }
        .inp:focus { border-color: #6366f1; box-shadow: 0 0 0 2px rgba(99,102,241,0.1); }
      `}</style>
    </div>
  );
}
