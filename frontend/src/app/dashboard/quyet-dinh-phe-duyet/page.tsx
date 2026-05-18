'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Document as Doc } from '@/lib/types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { AnimatePresence, motion } from 'framer-motion';
import { OnlyOfficePreview } from '@/components/OnlyOfficePreview';

const typeLabels: Record<string, string> = {
  QD_DUTOAN: 'QĐ phê duyệt dự toán',
  QD_KHLCNT: 'QĐ phê duyệt KHLCNT',
};

/** QĐ KHLCNT lưu chi tiết gói trong `goiThau[]`; UI thẻ cần đọc từ đó nếu không có trường tầng trên */
function qdKhlcntCardFields(data: Record<string, any> | undefined) {
  const rows = Array.isArray(data?.goiThau) ? data!.goiThau : [];
  const first = rows[0];
  const tenTop = data?.tenGoiThau;
  const hinhTop = data?.hinhThucLuaChon;
  const giaTop = data?.giaGoiThau;
  let tenGoiThau = tenTop || first?.tenGoiThau || '';
  if (!tenGoiThau && rows.length > 1) tenGoiThau = `${rows.length} gói thầu`;
  return {
    tenGoiThau,
    giaGoiThau: giaTop ?? first?.giaGoiThau,
    hinhThucLuaChon: hinhTop || first?.hinhThucLuaChon || '',
  };
}

function docSearchFields(doc: Doc): string[] {
  const d = doc.data || {};
  const base = [
    d.soQuyetDinh, d.tenDuAn, d.tenChuDauTu, d.chuDauTu,
    d.tenCoQuanDuyet, d.tenGoiThau, d.hinhThucLuaChon,
    doc.creator?.name, typeLabels[doc.type],
  ];
  if (doc.type === 'QD_KHLCNT' && Array.isArray(d.goiThau)) {
    for (const g of d.goiThau) {
      base.push(g?.tenGoiThau, g?.hinhThucLuaChon, g?.phuongThucLuaChon);
    }
  }
  return base.filter(Boolean) as string[];
}

export default function QuyetDinhPheDuyetPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailDoc, setDetailDoc] = useState<Doc | null>(null);
  const [previewDocId, setPreviewDocId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getApprovedDecisions();
        setDocs(data);
      } catch (err: any) { toast.error(err.message); }
      finally { setLoading(false); }
    })();
  }, []);

  const handleDownload = async (id: string) => {
    try {
      const res = await api.downloadDocumentPdf(id);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const disposition = res.headers.get('Content-Disposition');
      let filename = 'document.pdf';
      if (disposition) {
        const utf8Match = disposition.match(/filename\*=UTF-8''(.+)/);
        if (utf8Match) filename = decodeURIComponent(utf8Match[1]);
      }
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) { toast.error(err.message); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Quyết định phê duyệt</h1>
        <p className="text-gray-500 mt-1">Danh sách tất cả quyết định đã được Giám đốc phê duyệt</p>
      </div>

      {docs.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-400 border">
          Chưa có quyết định nào được phê duyệt
        </div>
      ) : (
        <>
          <div className="relative">
            <input type="text" placeholder="Tìm kiếm theo số QĐ, tên dự án, chủ đầu tư, gói thầu, người tạo..."
              className="w-full px-4 py-2.5 pl-10 bg-white border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400"
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div className="grid gap-4">
          {docs.filter(doc => {
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase();
            return docSearchFields(doc).some(f => String(f).toLowerCase().includes(q));
          }).length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center text-gray-400 border">
              Không tìm thấy kết quả phù hợp
            </div>
          ) : docs.filter(doc => {
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase();
            return docSearchFields(doc).some(f => String(f).toLowerCase().includes(q));
          }).map(doc => (
            <div key={doc.id} className="bg-white rounded-xl p-5 shadow-sm border hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setDetailDoc(doc)}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-medium px-2 py-1 rounded ${
                      doc.type === 'QD_DUTOAN' ? 'bg-purple-50 text-purple-700' : 'bg-indigo-50 text-indigo-700'
                    }`}>
                      {typeLabels[doc.type]}
                    </span>
                    <span className="text-xs font-medium px-2 py-1 rounded bg-green-50 text-green-700">
                      ✅ Đã phê duyệt
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900">
                    {doc.data?.soQuyetDinh || 'Quyết định dự toán'}
                  </h3>

                  <div className="mt-2 space-y-1 text-sm text-gray-600">
                    {doc.type === 'QD_DUTOAN' && (
                      <>
                        <p>Chủ đầu tư: <span className="font-medium">{doc.data?.tenChuDauTu}</span></p>
                        <p>Giá trị dự toán: <span className="font-medium">{doc.data?.giaTriDuToanDuyet?.toLocaleString('vi-VN')} đồng</span></p>
                        <p>Cơ quan duyệt: {doc.data?.tenCoQuanDuyet}</p>
                      </>
                    )}
                    {doc.type === 'QD_KHLCNT' && (() => {
                      const k = qdKhlcntCardFields(doc.data);
                      const giaStr = k.giaGoiThau != null && k.giaGoiThau !== ''
                        ? Number(k.giaGoiThau).toLocaleString('vi-VN')
                        : '';
                      return (
                      <>
                        <p>Dự án: <span className="font-medium">{doc.data?.tenDuAn}</span></p>
                        <p>Gói thầu: <span className="font-medium">{k.tenGoiThau || '—'}</span></p>
                        <p>Giá gói thầu: <span className="font-medium">{giaStr ? `${giaStr} đồng` : '—'}</span></p>
                        <p>Hình thức: {k.hinhThucLuaChon || '—'}</p>
                      </>
                      );
                    })()}
                  </div>

                  <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
                    <span>Người tạo: {doc.creator.name}</span>
                    <span>{format(new Date(doc.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi })}</span>
                    {doc.reviews && doc.reviews.length > 0 && (
                      <span>Duyệt bởi: {doc.reviews[doc.reviews.length - 1].user.name}</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <button onClick={(e) => { e.stopPropagation(); setPreviewDocId(doc.id); }}
                    className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-sm font-medium">
                    👁 Xem
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDownload(doc.id); }}
                    className="px-4 py-2 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 text-sm font-medium">
                    📥 Tải PDF
                  </button>
                </div>
              </div>
            </div>
          ))}
          </div>
        </>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {detailDoc && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setDetailDoc(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 p-6 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-1 rounded ${detailDoc.type === 'QD_DUTOAN' ? 'bg-purple-50 text-purple-700' : 'bg-indigo-50 text-indigo-700'}`}>
                    {typeLabels[detailDoc.type]}
                  </span>
                  <span className="text-xs font-medium px-2 py-1 rounded bg-green-50 text-green-700">✅ Đã phê duyệt</span>
                </div>
                <button onClick={() => setDetailDoc(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-4">{detailDoc.data?.soQuyetDinh || 'Chi tiết quyết định'}</h3>

              <div className="space-y-2 text-sm">
                {detailDoc.type === 'QD_DUTOAN' && (
                  <>
                    {detailDoc.data?.tenCoQuanDuyet && <div className="flex justify-between py-1.5 border-b"><span className="text-gray-500">Cơ quan duyệt</span><span className="font-medium">{detailDoc.data.tenCoQuanDuyet}</span></div>}
                    {detailDoc.data?.soQuyetDinh && <div className="flex justify-between py-1.5 border-b"><span className="text-gray-500">Số quyết định</span><span className="font-medium">{detailDoc.data.soQuyetDinh}</span></div>}
                    {detailDoc.data?.ngayBanHanh && <div className="flex justify-between py-1.5 border-b"><span className="text-gray-500">Ngày ban hành</span><span className="font-medium">{detailDoc.data.ngayBanHanh}</span></div>}
                    {detailDoc.data?.tenChuDauTu && <div className="flex justify-between py-1.5 border-b"><span className="text-gray-500">Chủ đầu tư</span><span className="font-medium">{detailDoc.data.tenChuDauTu}</span></div>}
                    {detailDoc.data?.giaTriDuToanDuyet != null && <div className="flex justify-between py-1.5 border-b"><span className="text-gray-500">Giá trị dự toán</span><span className="font-medium">{detailDoc.data.giaTriDuToanDuyet.toLocaleString('vi-VN')} đồng</span></div>}
                    {detailDoc.data?.tenBQLDA && <div className="flex justify-between py-1.5 border-b"><span className="text-gray-500">Ban QLDA</span><span className="font-medium">{detailDoc.data.tenBQLDA}</span></div>}
                    {detailDoc.data?.tenDonViDeNghi && <div className="flex justify-between py-1.5 border-b"><span className="text-gray-500">Đơn vị đề nghị</span><span className="font-medium">{detailDoc.data.tenDonViDeNghi}</span></div>}
                    {detailDoc.data?.canCuPhapLy?.length > 0 && (
                      <div className="py-1.5 border-b">
                        <span className="text-gray-500">Căn cứ pháp lý:</span>
                        <ul className="mt-1 ml-4 list-disc text-gray-700">{detailDoc.data.canCuPhapLy.map((cc: string, i: number) => <li key={i}>{cc}</li>)}</ul>
                      </div>
                    )}
                  </>
                )}
                {detailDoc.type === 'QD_KHLCNT' && (
                  <>
                    {detailDoc.data?.coQuanPheDuyet && <div className="flex justify-between py-1.5 border-b"><span className="text-gray-500">Cơ quan phê duyệt</span><span className="font-medium">{detailDoc.data.coQuanPheDuyet}</span></div>}
                    {detailDoc.data?.soQuyetDinh && <div className="flex justify-between py-1.5 border-b"><span className="text-gray-500">Số quyết định</span><span className="font-medium">{detailDoc.data.soQuyetDinh}</span></div>}
                    {detailDoc.data?.ngayBanHanh && <div className="flex justify-between py-1.5 border-b"><span className="text-gray-500">Ngày ban hành</span><span className="font-medium">{detailDoc.data.ngayBanHanh}</span></div>}
                    {detailDoc.data?.tenDuAn && <div className="flex justify-between py-1.5 border-b"><span className="text-gray-500">Tên dự án</span><span className="font-medium">{detailDoc.data.tenDuAn}</span></div>}
                    {detailDoc.data?.chuDauTu && <div className="flex justify-between py-1.5 border-b"><span className="text-gray-500">Chủ đầu tư</span><span className="font-medium">{detailDoc.data.chuDauTu}</span></div>}
                    {detailDoc.data?.nguoiPheDuyet && <div className="flex justify-between py-1.5 border-b"><span className="text-gray-500">Người phê duyệt</span><span className="font-medium">{detailDoc.data.nguoiPheDuyet}</span></div>}
                    {detailDoc.data?.donViTrinh && <div className="flex justify-between py-1.5 border-b"><span className="text-gray-500">Đơn vị trình</span><span className="font-medium">{detailDoc.data.donViTrinh}</span></div>}
                    {detailDoc.data?.donViThamDinh && <div className="flex justify-between py-1.5 border-b"><span className="text-gray-500">Đơn vị thẩm định</span><span className="font-medium">{detailDoc.data.donViThamDinh}</span></div>}
                    {detailDoc.data?.soHieuToTrinh && <div className="flex justify-between py-1.5 border-b"><span className="text-gray-500">Số hiệu tờ trình</span><span className="font-medium">{detailDoc.data.soHieuToTrinh}</span></div>}
                    {detailDoc.data?.ngayToTrinh && <div className="flex justify-between py-1.5 border-b"><span className="text-gray-500">Ngày tờ trình</span><span className="font-medium">{detailDoc.data.ngayToTrinh}</span></div>}
                    {detailDoc.data?.donViGiamSat && <div className="flex justify-between py-1.5 border-b"><span className="text-gray-500">Đơn vị giám sát</span><span className="font-medium">{detailDoc.data.donViGiamSat}</span></div>}
                    {detailDoc.data?.canCuPhapLy?.length > 0 && (
                      <div className="py-1.5 border-b">
                        <span className="text-gray-500">Căn cứ pháp lý:</span>
                        <ul className="mt-1 ml-4 list-disc text-gray-700">{detailDoc.data.canCuPhapLy.map((cc: string, i: number) => <li key={i}>{cc}</li>)}</ul>
                      </div>
                    )}
                    {detailDoc.data?.goiThau?.length > 0 && (
                      <div className="py-2 border-b">
                        <p className="text-gray-500 font-medium mb-3">Phụ lục - Danh sách gói thầu:</p>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs border-collapse border border-gray-300">
                            <thead>
                              <tr className="bg-gray-100">
                                <th className="border border-gray-300 px-2 py-1.5 text-center">STT</th>
                                <th className="border border-gray-300 px-2 py-1.5">Tên gói thầu</th>
                                <th className="border border-gray-300 px-2 py-1.5">Tóm tắt công việc</th>
                                <th className="border border-gray-300 px-2 py-1.5 text-right">Giá gói thầu</th>
                                <th className="border border-gray-300 px-2 py-1.5">Nguồn vốn</th>
                                <th className="border border-gray-300 px-2 py-1.5">Hình thức lựa chọn NT</th>
                                <th className="border border-gray-300 px-2 py-1.5">Phương thức lựa chọn NT</th>
                                <th className="border border-gray-300 px-2 py-1.5">Loại hợp đồng</th>
                                <th className="border border-gray-300 px-2 py-1.5">TG tổ chức</th>
                                <th className="border border-gray-300 px-2 py-1.5">TG thực hiện</th>
                              </tr>
                            </thead>
                            <tbody>
                              {detailDoc.data.goiThau.map((gt: any, i: number) => (
                                <tr key={i} className="hover:bg-gray-50">
                                  <td className="border border-gray-300 px-2 py-1.5 text-center">{i + 1}</td>
                                  <td className="border border-gray-300 px-2 py-1.5 font-medium">{gt.tenGoiThau}</td>
                                  <td className="border border-gray-300 px-2 py-1.5">{gt.tomTatCongViec}</td>
                                  <td className="border border-gray-300 px-2 py-1.5 text-right whitespace-nowrap">{gt.giaGoiThau ? Number(gt.giaGoiThau).toLocaleString('vi-VN') : ''}</td>
                                  <td className="border border-gray-300 px-2 py-1.5">{gt.nguonVon}</td>
                                  <td className="border border-gray-300 px-2 py-1.5">{gt.hinhThucLuaChon}</td>
                                  <td className="border border-gray-300 px-2 py-1.5">{gt.phuongThucLuaChon}</td>
                                  <td className="border border-gray-300 px-2 py-1.5">{gt.loaiHopDong}</td>
                                  <td className="border border-gray-300 px-2 py-1.5">{gt.thoiGianToChuc}</td>
                                  <td className="border border-gray-300 px-2 py-1.5">{gt.thoiGianThucHien}</td>
                                </tr>
                              ))}
                              <tr className="bg-gray-50 font-medium">
                                <td colSpan={3} className="border border-gray-300 px-2 py-1.5 text-right">Tổng giá gói thầu</td>
                                <td className="border border-gray-300 px-2 py-1.5 text-right whitespace-nowrap">
                                  {detailDoc.data.goiThau.reduce((s: number, g: any) => s + (Number(g.giaGoiThau) || 0), 0).toLocaleString('vi-VN')}
                                </td>
                                <td colSpan={6} className="border border-gray-300 px-2 py-1.5"></td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                )}
                <div className="flex justify-between py-1.5 border-b"><span className="text-gray-500">Người tạo</span><span className="font-medium">{detailDoc.creator.name}</span></div>
                <div className="flex justify-between py-1.5"><span className="text-gray-500">Ngày tạo</span><span className="font-medium">{format(new Date(detailDoc.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi })}</span></div>
                {detailDoc.reviews && detailDoc.reviews.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-gray-500 font-medium mb-2">Lịch sử xét duyệt:</p>
                    {detailDoc.reviews.map((r, i) => (
                      <div key={i} className="flex items-center gap-2 py-1 text-xs">
                        <span className={`px-2 py-0.5 rounded ${r.action === 'APPROVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {r.action === 'APPROVE' ? 'Duyệt' : 'Từ chối'}
                        </span>
                        <span className="text-gray-600">{r.user.name}</span>
                        <span className="text-gray-400">{format(new Date(r.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi })}</span>
                        {r.comment && <span className="text-gray-500">- {r.comment}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-5 justify-end">
                <button onClick={() => { setPreviewDocId(detailDoc.id); setDetailDoc(null); }} className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-sm">👁 Xem trước</button>
                <button onClick={() => handleDownload(detailDoc.id)} className="px-4 py-2 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 text-sm">📥 Tải PDF</button>
                <button onClick={() => setDetailDoc(null)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm">Đóng</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {previewDocId && (
        <OnlyOfficePreview documentId={previewDocId} onClose={() => setPreviewDocId(null)} />
      )}
    </div>
  );
}
