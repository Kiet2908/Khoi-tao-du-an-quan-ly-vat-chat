import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, Shield, X, QrCode, Activity, 
  Package, HeartPulse, Building2, Undo2, ArrowRightCircle, CheckCircle2,
  History, AlertCircle, Calendar, Timer, UserCheck, Archive
} from 'lucide-react';
import { supabase } from '../supabaseClient'; 
import './Equipment.css';

// --- INTERFACES ---
interface EquipmentItem { 
  id: string; VatChat: string; SoLuong: number; TongBanDau: number; TrangThai: string; Loai: 'TRANG_BI' | 'Y_TE' | 'CO_SO'; 
}

interface TuTrangBiItem {
  id: number;
  TuSo: string;
  MaSung: string;
  tong: number; 
}

interface ChoMuonLog {
  id?: string | number; 
  ngaymuon: string; 
  ngaytra?: string; 
  NguoiNhan: string; 
  VatChat: string; 
  MaVatChat?: string; 
  SoLuong: number; 
  TrangThai: string; 
  teacherId?: string; 
  GhiChu?: string;
}

export default function Equipment() {
  const userRole = localStorage.getItem('userRole') || '';
  const currentUsername = localStorage.getItem('userName') || ''; 
  const currentUserFullName = localStorage.getItem('userFullName') || '';

  const [activeTab, setActiveTab] = useState<'TRANG_BI' | 'Y_TE' | 'CO_SO' | 'TU_TRANG_BI'>('TRANG_BI');
  
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]); 
  const [tuTrangBi, setTuTrangBi] = useState<TuTrangBiItem[]>([]); 
  const [logs, setLogs] = useState<ChoMuonLog[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [borrowModal, setBorrowModal] = useState<EquipmentItem | null>(null);
  const [borrowQty, setBorrowQty] = useState(1);
  const [confirmData, setConfirmData] = useState<ChoMuonLog | null>(null);

  const [returnType, setReturnType] = useState<'FULL' | 'PARTIAL'>('FULL');
  const [actualReturnQty, setActualReturnQty] = useState(0);
  const [returnNote, setReturnNote] = useState('');

  const scanInputRef = useRef<HTMLInputElement>(null);
  const lastScanTime = useRef<number>(0);
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  const [isCooldown, setIsCooldown] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const isScannerRequired = (name: string) => {
    const n = name.toUpperCase();
    return n.includes('AK') || n.includes('CKC') || n.includes('MÁY BẮN') || n.includes('MBT') || n.includes('TBS');
  };

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchCloudData = async () => {
    setLoading(true);
    try {
      const { data: eqData } = await supabase.from('Equipment').select('*').order('VatChat');
      if (eqData) setEquipment(eqData);
      
      const { data: dbLogs } = await supabase.from('ChoMuon').select('*').order('id', { ascending: false });
      if (dbLogs) setLogs(dbLogs);

      const { data: tuData, error: tuErr } = await supabase.from('TuTrangBi').select('*').order('id');
      if (tuErr) {
          console.error("LỖI SUPABASE (TuTrangBi):", tuErr);
      } else if (tuData) {
          setTuTrangBi(tuData);
      }

    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCloudData(); }, []);

  const logData = useMemo(() => {
    const baseLogs = userRole === 'ADMIN' ? logs : logs.filter(log => log.teacherId === currentUsername);
    const active = baseLogs.filter(l => l.TrangThai === 'Đang giữ');
    const pending = baseLogs.filter(l => l.TrangThai === 'Chờ xác nhận');
    const getCategory = (name: string) => equipment.find(e => e.VatChat === name)?.Loai;

    let historyLogs = baseLogs;
    if (startDate || endDate) {
      historyLogs = baseLogs.filter(log => {
        const dateStr = log.ngaymuon.split('T')[0];
        const startMatch = startDate ? dateStr >= startDate : true;
        const endMatch = endDate ? dateStr <= endDate : true;
        return startMatch && endMatch;
      });
    }

    return {
      vuKhi: active.filter(l => l.VatChat.toUpperCase().includes('AK') || l.VatChat.toUpperCase().includes('CKC') || l.VatChat.toUpperCase().includes('LỰU ĐẠN') || l.VatChat.toUpperCase().includes('LĐ') || l.VatChat.toUpperCase().includes('TỦ') || l.VatChat.toUpperCase().includes('TU')),
      mayBan: active.filter(l => l.VatChat.toUpperCase().includes('MÁY BẮN') || l.VatChat.toUpperCase().includes('MBT') || l.VatChat.toUpperCase().includes('TBS')),
      coSo: active.filter(l => getCategory(l.VatChat) === 'CO_SO'),
      yTe: active.filter(l => getCategory(l.VatChat) === 'Y_TE'),
      choXacNhan: pending,
      daTra: historyLogs.filter(l => l.TrangThai === 'Đã trả' || l.TrangThai === 'Trả thiếu'),
      tatCa: historyLogs 
    };
  }, [logs, equipment, userRole, currentUsername, startDate, endDate]);

  const handleTeacherBorrow = async (item: EquipmentItem, qty: number, qrCodeData?: string) => {
    if (isCooldown) return;
    const latestItem = equipment.find(e => e.id === item.id);
    if (!latestItem || latestItem.SoLuong < qty) {
      setBorrowModal(null);
      return showToast('Kho không đủ!', 'error');
    }
    setLoading(true);
    setIsCooldown(true);

    try {
      const existingLog = logs.find(l => l.teacherId === currentUsername && l.VatChat === item.VatChat && l.TrangThai === 'Đang giữ');
      if (existingLog) {
        let newMaList = existingLog.MaVatChat || '';
        if (qrCodeData) {
          if (newMaList.includes(qrCodeData)) {
            showToast(`Mã ${qrCodeData} đã quét!`, 'error');
            setLoading(false);
            setIsCooldown(false);
            return; 
          }
          newMaList = newMaList ? `${newMaList}, ${qrCodeData}` : qrCodeData;
        }
        await supabase.from('ChoMuon').update({ 
          SoLuong: Number(existingLog.SoLuong) + Number(qty), 
          MaVatChat: newMaList,
          ngaymuon: new Date().toISOString() 
        }).eq('id', existingLog.id);
      } else {
        await supabase.from('ChoMuon').insert([{ 
          ngaymuon: new Date().toISOString(), 
          ngaytra: null,
          NguoiNhan: currentUserFullName, 
          VatChat: item.VatChat, 
          MaVatChat: qrCodeData || '', 
          SoLuong: Number(qty), 
          TrangThai: 'Đang giữ', 
          teacherId: currentUsername 
        }]);
      }
      await supabase.from('Equipment').update({ SoLuong: Number(latestItem.SoLuong) - Number(qty) }).eq('id', item.id);
      showToast(qrCodeData ? `NHẬN MÃ: ${qrCodeData}` : `MƯỢN THÀNH CÔNG!`);
      if (!qrCodeData) { setBorrowModal(null); setBorrowQty(1); }
      fetchCloudData();
    } catch (err) { console.error(err); }
    finally { setLoading(false); setTimeout(() => setIsCooldown(false), 3000); }
  }

  // --- HÀM MƯỢN TỦ ---
  const handleBorrowCabinet = async (tuItem: TuTrangBiItem) => {
    if (isCooldown) return;
    setLoading(true);
    setIsCooldown(true);

    try {
      await supabase.from('ChoMuon').insert([{ 
        ngaymuon: new Date().toISOString(), 
        ngaytra: null,
        NguoiNhan: currentUserFullName, 
        VatChat: tuItem.TuSo,           
        MaVatChat: tuItem.MaSung,       
        SoLuong: tuItem.tong || 10,  
        TrangThai: 'Đang giữ', 
        teacherId: currentUsername 
      }]);

      showToast(`MƯỢN ${tuItem.TuSo.toUpperCase()} THÀNH CÔNG!`);
      fetchCloudData();
    } catch (err) { 
      console.error(err); 
      showToast('LỖI KHI MƯỢN TỦ!', 'error');
    } finally { 
      setLoading(false); 
      setTimeout(() => setIsCooldown(false), 3000); 
    }
  }

  const requestReturn = async () => {
    if (!confirmData || loading) return;
    const qtyToReturn = returnType === 'FULL' ? confirmData.SoLuong : actualReturnQty;
    const isPartial = qtyToReturn < confirmData.SoLuong;
    const missingAmount = confirmData.SoLuong - qtyToReturn;

    setLoading(true);
    try {
      const noteRequest = isPartial 
        ? `[Gv báo thiếu ${missingAmount}] - ${returnNote}`
        : `[Gv báo trả đủ] - ${returnNote}`;

      await supabase.from('ChoMuon').update({ 
        TrangThai: 'Chờ xác nhận',
        GhiChu: noteRequest,
        SoLuong: qtyToReturn 
      }).eq('id', confirmData.id);

      setConfirmData(null);
      showToast('ĐÃ GỬI YÊU CẦU TRẢ. VUI LÒNG BÀN GIAO ĐỒ CHO QUẢN LÝ!', 'success');
      fetchCloudData();
    } catch (err) { showToast('LỖI GỬI YÊU CẦU!', 'error'); }
    finally { setLoading(false); }
  };

  const adminConfirmReturn = async (log: ChoMuonLog) => {
    if (loading) return;
    setLoading(true);
    try {
      const isPartialRequest = log.GhiChu?.includes('báo thiếu');
      const finalStatus = isPartialRequest ? 'Trả thiếu' : 'Đã trả';
      
      await supabase.from('ChoMuon').update({ 
        TrangThai: finalStatus,
        ngaytra: new Date().toISOString(),
        GhiChu: `Quản lý kho ĐÃ XÁC NHẬN NHẬP KHO. (${log.GhiChu})`
      }).eq('id', log.id);

      const isCabinet = tuTrangBi.some(t => t.TuSo === log.VatChat);
      
      if (!isCabinet) {
        const eqItem = equipment.find(i => i.VatChat === log.VatChat);
        if (eqItem) {
          let newStock = Number(eqItem.SoLuong) + Number(log.SoLuong);
          if (newStock > eqItem.TongBanDau) { newStock = eqItem.TongBanDau; }
          await supabase.from('Equipment').update({ SoLuong: newStock }).eq('id', eqItem.id);
        }
      }

      showToast('XÁC NHẬN NHẬP KHO THÀNH CÔNG!');
      fetchCloudData();
    } catch (err) { showToast('LỖI XÁC NHẬN!', 'error'); }
    finally { setLoading(false); }
  };

  // --- LOGIC MÁY QUÉT (ĐÃ XÓA CODE CHẶN LẰNG NHẰNG, DÙNG INPUTMODE NATIVE) ---
  const handleAutoScanner = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.trim().toUpperCase();
    if (val.length >= 2) {
      const now = Date.now();
      lastScanTime.current = now;
      setTimeout(async () => {
        if (lastScanTime.current === now && scanInputRef.current?.value.trim().toUpperCase() === val) {
          if (borrowModal) {
            await handleTeacherBorrow(borrowModal, 1, val);
            if (scanInputRef.current) scanInputRef.current.value = "";
          }
        }
      }, 500); 
    }
  };

  const LogTable = ({ title, data, icon: Icon, isReturnTable = false, isHistory = false, isPendingTable = false }: any) => (
    <div className={`table-wrapper ${isReturnTable ? 'return-border' : isHistory ? 'history-border' : isPendingTable ? 'pending-border' : ''}`} style={{ marginBottom: '25px' }}>
      <div className="table-header-box" style={{ background: isPendingTable ? '#f59e0b' : '' }}>
        <Icon size={20} /> {title}
      </div>
      <div className="desktop-table-view">
        <table className="main-table">
          <thead>
            <tr>
              <th>{isReturnTable ? "NGÀY TRẢ" : "NGÀY MƯỢN"}</th>
              <th>NGƯỜI MƯỢN</th>
              <th>VẬT CHẤT / TỦ</th>
              <th>CHI TIẾT MÃ</th>
              <th>GHI CHÚ</th>
              <th>TRẠNG THÁI</th>
              <th>THAO TÁC</th>
            </tr>
          </thead>
          <tbody>
            {data.length > 0 ? data.map((log: any) => (
              <tr key={log.id}>
                <td>{new Date(isReturnTable && log.ngaytra ? log.ngaytra : log.ngaymuon).toLocaleString('vi-VN')}</td>
                <td><b>{log.NguoiNhan}</b></td>
                <td>{log.VatChat}</td>
                <td>
                  <div style={{maxHeight: '45px', overflowY: 'auto', paddingRight: '5px'}}>
                    {log.MaVatChat ? log.MaVatChat.split(/\s+|, /).map((m: any, i: any) => <span key={i} className="badge-unit" style={{margin:'2px', display:'inline-block'}}>{m}</span>) : <b>SL: {log.SoLuong}</b>}
                  </div>
                </td>
                <td style={{fontSize:'11px', color:'#64748b'}}>{log.GhiChu || '-'}</td>
                <td>
                    <span className={`status-text status-${log.TrangThai === 'Đã trả' ? 'green' : log.TrangThai === 'Chờ xác nhận' ? 'orange' : log.TrangThai === 'Trả thiếu' ? 'orange' : 'red'}`}>
                        {log.TrangThai}
                    </span>
                </td>
                <td>
                  {log.TrangThai === 'Đang giữ' && userRole === 'TEACHER' && (
                    <button onClick={() => {
                        setConfirmData(log);
                        setActualReturnQty(log.SoLuong);
                        setReturnType('FULL');
                    }} className="btn-borrow btn-table-small"><Undo2 size={14}/> TRẢ</button>
                  )}
                  {log.TrangThai === 'Chờ xác nhận' && userRole === 'ADMIN' && (
                    <button onClick={() => adminConfirmReturn(log)} className="btn-borrow btn-table-small" style={{background: '#16a34a'}}>
                      <UserCheck size={14}/> XÁC NHẬN TRẢ KHO
                    </button>
                  )}
                  {log.TrangThai === 'Chờ xác nhận' && userRole === 'TEACHER' && (
                    <span style={{fontSize:'11px', color:'#f59e0b'}}><Timer size={12}/> Đợi Admin...</span>
                  )}
                  {(log.TrangThai === 'Đã trả' || log.TrangThai === 'Trả thiếu') && '-'}
                </td>
              </tr>
            )) : <tr><td colSpan={7} style={{padding:'20px', textAlign:'center', color:'#94a3b8'}}>Trống</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="equipment-container">
      {toast && (
        <div className={`toast-animate ${toast.type === 'error' ? 'toast-error' : ''}`}>
          {toast.type === 'success' ? <CheckCircle2 size={22} /> : <AlertCircle size={22} />}
          <span>{toast.msg}</span>
        </div>
      )}

      <div className="header-section">
        <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
          <Shield size={32} color="#ffffff" />
          <div>
            <h1 className="title-style">TRANG QUẢN LÍ VŨ KHÍ, CƠ SỞ, VẬT CHẤT</h1>
            <p className="sub-title-text">Tổ bộ môn Giáo dục quốc phòng và an ninh - TDC</p>
          </div>
        </div>
      </div>

      {(userRole === 'ADMIN' || userRole === 'TEACHER') && (
        <>
          <div className="tab-row">
            <button onClick={() => setActiveTab('TRANG_BI')} className={`tab-btn ${activeTab === 'TRANG_BI' ? 'active' : ''}`}><Package size={18}/> VŨ KHÍ LẺ</button>
            <button onClick={() => setActiveTab('CO_SO')} className={`tab-btn ${activeTab === 'CO_SO' ? 'active' : ''}`}><Building2 size={18}/> CƠ SỞ</button>
            <button onClick={() => setActiveTab('Y_TE')} className={`tab-btn ${activeTab === 'Y_TE' ? 'active' : ''}`}><HeartPulse size={18}/> Y TẾ</button>
            <button onClick={() => setActiveTab('TU_TRANG_BI')} className={`tab-btn ${activeTab === 'TU_TRANG_BI' ? 'active' : ''}`}><Archive size={18}/> TỦ TRANG BỊ</button>
          </div>
          
          <div className="equipment-grid">
            {activeTab === 'TU_TRANG_BI' && tuTrangBi.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 20px', background: 'white', borderRadius: '20px', border: '1px dashed #cbd5e1' }}>
                <Archive size={40} style={{ opacity: 0.3, marginBottom: '10px', color: '#64748b' }} />
                <p style={{ margin: 0, fontWeight: 800, color: '#334155' }}>CHƯA CÓ DỮ LIỆU TỦ</p>
                <small style={{ color: '#64748b' }}>
                  Vui lòng kiểm tra lại dữ liệu hoặc cài đặt Row Level Security (RLS) trên Supabase.
                </small>
              </div>
            )}

            {/* VẬT CHẤT LẺ */}
            {activeTab !== 'TU_TRANG_BI' && equipment.filter(i => i.Loai === activeTab).map(item => (
              <div key={item.id} className="item-card">
                <h4 className="card-title">{item.VatChat}</h4>
                <div className="stock-number">{item.SoLuong} <small style={{fontSize:'14px', color:'#94a3b8'}}>/ {item.TongBanDau}</small></div>
                {userRole === 'TEACHER' && item.SoLuong > 0 && (
                  <button onClick={() => { setBorrowModal(item); setBorrowQty(1); }} className="btn-borrow">
                    {isScannerRequired(item.VatChat) ? <><QrCode size={18}/> QUÉT MÃ</> : <><Plus size={18}/> MƯỢN</>}
                  </button>
                )}
              </div>
            ))}

            {/* TỦ TRANG BỊ */}
            {activeTab === 'TU_TRANG_BI' && tuTrangBi.length > 0 && tuTrangBi.map(tu => {
              const isBorrowed = logs.some(l => l.VatChat === tu.TuSo && (l.TrangThai === 'Đang giữ' || l.TrangThai === 'Chờ xác nhận'));
              
              const maxGuns = tu.tong || 10;
              const currentStock = isBorrowed ? 0 : maxGuns;

              return (
                <div key={tu.id} className="item-card" style={{ border: isBorrowed ? '1.5px solid #f59e0b' : '' }}>
                  <h4 className="card-title">{tu.TuSo}</h4>
                  
                  <div className="stock-number" style={{fontSize: '18px', display: 'flex', alignItems: 'flex-end', gap: '5px'}}>
                    <span style={{color: currentStock === 0 ? 'var(--danger)' : 'var(--primary-main)'}}>{currentStock}</span>
                    <small style={{fontSize: '13px', color: '#94a3b8', paddingBottom: '3px'}}>/ {maxGuns} khẩu</small>
                  </div>

                  <div style={{fontSize: '11px', color: '#64748b', marginBottom: '15px', lineHeight: '1.4', maxHeight: '50px', overflowY: 'auto'}}>
                    <b>Chi tiết mã:</b> <br/>{tu.MaSung || 'Trống'}
                  </div>
                  
                  {userRole === 'TEACHER' && !isBorrowed && (
                    <button disabled={isCooldown} onClick={() => handleBorrowCabinet(tu)} className="btn-borrow">
                      <Archive size={16}/> MƯỢN TỦ NÀY
                    </button>
                  )}
                  {isBorrowed && (
                    <span className="status-text status-orange" style={{textAlign: 'center', marginTop: '10px', display: 'block', width: '100%'}}>
                      ĐANG CÓ NGƯỜI MƯỢN
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {logData.choXacNhan.length > 0 && (
          <LogTable title="DANH SÁCH ĐỢI QUẢN LÝ KHO XÁC NHẬN NHẬP KHO" data={logData.choXacNhan} icon={Timer} isPendingTable={true} />
        )}
        <LogTable title="NHẬT KÝ MƯỢN VŨ KHÍ & TỦ SÚNG" data={logData.vuKhi} icon={Shield} />
        <LogTable title="NHẬT KÝ MƯỢN CƠ SỞ VẬT CHẤT" data={logData.coSo} icon={Building2} />
        <LogTable title="NHẬT KÝ MƯỢN Y TẾ" data={logData.yTe} icon={HeartPulse} />
        <LogTable title="NHẬT KÝ MƯỢN MÁY BẮN TẬP" data={logData.mayBan} icon={Activity} />
      </div>

      <div style={{margin: '40px 0 20px 0', borderTop: '2px dashed #cbd5e1'}}></div>

      <div className="filter-section">
        <div className="filter-input-group">
          <label className="filter-label"><Calendar size={14} /> LỌC LỊCH SỬ TỪ NGÀY:</label>
          <input type="text" placeholder="YYYY-MM-DD" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="filter-input-style" />
        </div>
        <div className="filter-input-group">
          <label className="filter-label"><Calendar size={14} /> ĐẾN NGÀY:</label>
          <input type="text" placeholder="YYYY-MM-DD" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="filter-input-style" />
        </div>
        <button onClick={() => { setStartDate(''); setEndDate(''); }} className="btn-refresh">LÀM MỚI</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <LogTable title="NHẬT KÝ ĐĐA NHẬP KHO (QUẢN LÝ KHO ĐÃ XÁC NHẬN)" data={logData.daTra} icon={CheckCircle2} isReturnTable={true} />
        <LogTable title="TỔNG HỢP LỊCH SỬ GIAO DỊCH" data={logData.tatCa} icon={History} isHistory={true} />
      </div>

      {borrowModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{fontSize:'14px', margin:0, display:'flex', alignItems:'center', gap:'8px'}}><ArrowRightCircle size={18}/> {borrowModal.VatChat.toUpperCase()}</h3>
              <X style={{cursor:'pointer'}} onClick={() => { setBorrowModal(null); setBorrowQty(1); setIsCooldown(false); }} />
            </div>
            <div style={{padding:'20px'}}>
              {isScannerRequired(borrowModal.VatChat) ? (
                <div className="qr-box-scanner">
                  <input 
                    ref={scanInputRef} 
                    type="text" 
                    onChange={handleAutoScanner} 
                    /* THUỘC TÍNH MA THUẬT: CHẶN BÀN PHÍM ẢO TRÊN ĐIỆN THOẠI NHƯNG VẪN NHẬN MÁY QUÉT */
                    inputMode="none" 
                    autoComplete="off"
                    style={{
                      position:'fixed', 
                      left:'-9999px', 
                      opacity: 0,
                      pointerEvents: 'none' /* Chặn luôn việc vô tình bấm trúng */
                    }} 
                    autoFocus 
                  />
                  <div className="scanner-line"></div>
                  <QrCode size={80} color="#15803d" />
                  <p>
                    {isCooldown ? "ĐANG XỬ LÝ..." : "ĐANG CHỜ QUÉT MÃ..."}
                  </p>
                </div>
              ) : (
                <div style={{display:'flex', flexDirection:'column', gap:'15px'}}>
                  <label style={{fontSize: '12px', fontWeight: 'bold', color: '#64748b'}}>SỐ LƯỢNG MƯỢN:</label>
                  <input type="number" value={borrowQty} min="1" max={borrowModal.SoLuong} onChange={(e) => setBorrowQty(Number(e.target.value))} style={{width:'100%', padding:'12px', borderRadius:'8px', border:'1px solid #e2e8f0', textAlign:'center', fontSize: '18px', fontWeight: 'bold'}} />
                  <button disabled={isCooldown} onClick={() => handleTeacherBorrow(borrowModal, borrowQty)} className="btn-borrow">
                    {isCooldown ? "ĐỢI TRONG 3s" : "XÁC NHẬN MƯỢN"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {confirmData && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header" style={{background: '#16a34a'}}>
              <h3 style={{fontSize:'14px', margin:0, color:'white'}}>YÊU CẦU TRẢ: {confirmData.VatChat}</h3>
              <X style={{cursor:'pointer', color:'white'}} onClick={() => setConfirmData(null)} />
            </div>
            <div style={{padding:'25px'}}>
               <div className="return-tabs">
                  <button onClick={() => {setReturnType('FULL'); setActualReturnQty(confirmData.SoLuong);}} className={`tab-item ${returnType === 'FULL' ? 'full-active' : ''}`}>TRẢ ĐỦ</button>
                  <button onClick={() => setReturnType('PARTIAL')} className={`tab-item ${returnType === 'PARTIAL' ? 'partial-active' : ''}`}>TRẢ THIẾU</button>
               </div>
               {returnType === 'PARTIAL' && (
                 <div className="partial-box">
                    <div style={{color:'#ef4444', marginBottom:'10px', fontWeight:800}}>SỐ LƯỢNG TRẢ THỰC TẾ:</div>
                    <input type="number" max={confirmData.SoLuong - 1} min="0" value={actualReturnQty} onChange={(e) => setActualReturnQty(Number(e.target.value))} className="partial-input-number" />
                 </div>
               )}
               <div style={{marginBottom:'20px'}}>
                  <label style={{fontSize:'12px', fontWeight:800, color:'#64748b', display:'block', marginBottom:'8px'}}>GHI CHÚ GỬI QUẢN LÝ KHO:</label>
                  <textarea value={returnNote} onChange={(e) => setReturnNote(e.target.value)} className="note-textarea" placeholder="Nhập lý do trả thiếu hoặc lời nhắn..." />
               </div>
               <div style={{display:'flex', gap:'10px'}}>
                  <button onClick={requestReturn} className="btn-borrow" style={{background: '#059669'}}>GỬI YÊU CẦU TRẢ</button>
                  <button onClick={() => setConfirmData(null)} className="btn-cancel-gray">HỦY</button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}