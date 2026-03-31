import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, Shield, X, RotateCcw, QrCode, Activity, 
  Package, HeartPulse, Building2, Undo2, ArrowRightCircle, CheckCircle2,
  History, AlertCircle, Calendar, Timer,
} from 'lucide-react';
import { supabase } from '../supabaseClient'; 
import './Equipment.css';

// --- INTERFACES ---
interface EquipmentItem { 
  id: string; VatChat: string; SoLuong: number; TongBanDau: number; TrangThai: string; Loai: 'TRANG_BI' | 'Y_TE' | 'CO_SO'; 
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
}

export default function Equipment() {
  const userRole = localStorage.getItem('userRole') || '';
  const currentUsername = localStorage.getItem('userName') || ''; 
  const currentUserFullName = localStorage.getItem('userFullName') || '';

  const [activeTab, setActiveTab] = useState<'TRANG_BI' | 'Y_TE' | 'CO_SO'>('TRANG_BI');
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]); 
  const [logs, setLogs] = useState<ChoMuonLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [borrowModal, setBorrowModal] = useState<EquipmentItem | null>(null);
  const [borrowQty, setBorrowQty] = useState(1);
  const [confirmData, setConfirmData] = useState<ChoMuonLog | null>(null);
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
    // Xóa sạch logs cũ trước khi tải mới để tránh lag hiện đè
    setLogs([]); 
    try {
      const { data: eqData } = await supabase.from('Equipment').select('*').order('VatChat');
      if (eqData) setEquipment(eqData);
      const { data: dbLogs } = await supabase.from('ChoMuon').select('*').order('id', { ascending: false });
      if (dbLogs) setLogs(dbLogs);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCloudData(); }, []);

  const logData = useMemo(() => {
    const baseLogs = userRole === 'ADMIN' ? logs : logs.filter(log => log.teacherId === currentUsername);
    const active = baseLogs.filter(l => l.TrangThai === 'Đang giữ');
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
      vuKhi: active.filter(l => 
        l.VatChat.toUpperCase().includes('AK') || 
        l.VatChat.toUpperCase().includes('CKC') ||
        l.VatChat.toUpperCase().includes('LỰU ĐẠN') ||
        l.VatChat.toUpperCase().includes('LĐ')
      ),
      mayBan: active.filter(l => 
        l.VatChat.toUpperCase().includes('MÁY BẮN') || 
        l.VatChat.toUpperCase().includes('MBT') || 
        l.VatChat.toUpperCase().includes('TBS')
      ),
      coSo: active.filter(l => getCategory(l.VatChat) === 'CO_SO'),
      yTe: active.filter(l => getCategory(l.VatChat) === 'Y_TE'),
      daTra: historyLogs.filter(l => l.TrangThai === 'Đã trả'),
      tatCa: historyLogs 
    };
  }, [logs, equipment, userRole, currentUsername, startDate, endDate]);

  const handleTeacherBorrow = async (item: EquipmentItem, qty: number, qrCodeData?: string) => {
    if (isCooldown) return;

    const latestItem = equipment.find(e => e.id === item.id);
    if (!latestItem || latestItem.SoLuong < qty) {
      setBorrowModal(null); // Reset modal ngay nếu kho hết
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
          SoLuong: Number(existingLog.SoLuong) + qty, 
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
          SoLuong: qty, 
          TrangThai: 'Đang giữ', 
          teacherId: currentUsername 
        }]);
      }
      await supabase.from('Equipment').update({ SoLuong: latestItem.SoLuong - qty }).eq('id', item.id);
      
      showToast(qrCodeData ? `NHẬN MÃ: ${qrCodeData}` : `MƯỢN THÀNH CÔNG!`);
      
      // Nếu không phải quét mã (mượn số lượng) thì reset modal luôn
      if (!qrCodeData) {
        setBorrowModal(null);
        setBorrowQty(1);
      }

      fetchCloudData();
    } catch (err) { 
        console.error(err); 
        showToast('LỖI KẾT NỐI!', 'error');
    }
    finally { 
        setLoading(false); 
        // Sau 3 giây mới mở khóa cho lần bấm tiếp theo
        setTimeout(() => setIsCooldown(false), 3000);
    }
  }

  const executeReturn = async () => {
    if (!confirmData || loading) return;
    setLoading(true);
    try {
      const { error: logErr } = await supabase.from('ChoMuon').update({ 
        TrangThai: 'Đã trả',
        ngaytra: new Date().toISOString() 
      }).eq('id', confirmData.id);
      if (logErr) throw logErr;
      const eqItem = equipment.find(i => i.VatChat === confirmData.VatChat);
      if (eqItem) {
        await supabase.from('Equipment').update({ 
          SoLuong: Number(eqItem.SoLuong) + Number(confirmData.SoLuong) 
        }).eq('id', eqItem.id);
      }
      setConfirmData(null); 
      showToast('ĐÃ TRẢ KHO THÀNH CÔNG!'); 
      fetchCloudData();
    } catch (err: any) { 
      showToast('LỖI TRẢ KHO!', 'error'); 
    } finally { setLoading(false); }
  };

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
      }, 700); 
    }
  };

  const LogTable = ({ title, data, icon: Icon, isReturnTable = false, isHistory = false }: any) => (
    <div className="table-wrapper" style={{ marginBottom: '25px', border: isReturnTable ? '1.5px solid #16a34a' : isHistory ? '1.5px solid #64748b' : '1px solid #e2e8f0' }}>
      <div className="table-header-box">
        <Icon size={20} color={isReturnTable ? "#16a34a" : isHistory ? "#64748b" : "#14532d"} /> {title}
      </div>
      <div className="desktop-table-view">
        <table className="main-table">
          <thead>
            <tr>
              <th>{isReturnTable ? "NGÀY TRẢ" : "NGÀY MƯỢN"}</th>
              <th>NGƯỜI MƯỢN</th>
              <th>VẬT CHẤT</th>
              <th>CHI TIẾT</th>
              {isReturnTable && <th>NGÀY MƯỢN</th>}
              <th>TRẠNG THÁI</th>
              {!isReturnTable && !isHistory && userRole === 'TEACHER' && <th>THAO TÁC</th>}
            </tr>
          </thead>
          <tbody>
            {data.length > 0 ? data.map((log: any) => (
              <tr key={log.id}>
                <td>{new Date(isReturnTable && log.ngaytra ? log.ngaytra : log.ngaymuon).toLocaleString('vi-VN')}</td>
                <td><b>{log.NguoiNhan}</b></td>
                <td>{log.VatChat}</td>
                <td>{log.MaVatChat ? log.MaVatChat.split(', ').map((m: any, i: any) => <span key={i} className="badge-unit" style={{fontSize:'10px', background:'#f1f5f9', padding:'2px 6px', borderRadius:'4px', marginRight:'4px', border:'1px solid #e2e8f0'}}>{m}</span>) : <b>SL: {log.SoLuong}</b>}</td>
                {isReturnTable && <td style={{fontSize:'12px', color:'#64748b'}}>{new Date(log.ngaymuon).toLocaleString('vi-VN')}</td>}
                <td><span style={{color: log.TrangThai === 'Đã trả' ? '#16a34a' : '#ef4444', fontWeight:'bold'}}>{log.TrangThai}</span></td>
                {!isReturnTable && !isHistory && userRole === 'TEACHER' && (
                  <td><button onClick={() => setConfirmData(log)} className="btn-borrow" style={{width:'auto', padding:'5px 10px'}}><Undo2 size={14}/> TRẢ</button></td>
                )}
              </tr>
            )) : <tr><td colSpan={isReturnTable ? 7 : 6} style={{padding:'20px', textAlign:'center', color:'#94a3b8'}}>Trống</td></tr>}
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
            <button onClick={() => setActiveTab('TRANG_BI')} className={`tab-btn ${activeTab === 'TRANG_BI' ? 'active' : ''}`}><Package size={18}/> TRANG BỊ</button>
            <button onClick={() => setActiveTab('CO_SO')} className={`tab-btn ${activeTab === 'CO_SO' ? 'active' : ''}`}><Building2 size={18}/> CƠ SỞ</button>
            <button onClick={() => setActiveTab('Y_TE')} className={`tab-btn ${activeTab === 'Y_TE' ? 'active' : ''}`}><HeartPulse size={18}/> Y TẾ</button>
          </div>
          <div className="equipment-grid">
            {equipment.filter(i => i.Loai === activeTab).map(item => (
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
          </div>
        </>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <LogTable title="NHẬT KÝ MƯỢN VŨ KHÍ" data={logData.vuKhi} icon={Shield} />
        <LogTable title="NHẬT KÝ MƯỢN CƠ SỞ VẬT CHẤT" data={logData.coSo} icon={Building2} />
        <LogTable title="NHẬT KÝ MƯỢN Y TẾ" data={logData.yTe} icon={HeartPulse} />
        <LogTable title="NHẬT KÝ MƯỢN MÁY BẮN TẬP" data={logData.mayBan} icon={Activity} />
      </div>

      <div style={{margin: '40px 0 20px 0', borderTop: '2px dashed #cbd5e1'}}></div>

      <div style={{ background: '#f0fdf4', padding: '20px', borderRadius: '16px', marginBottom: '20px', border: '1px solid #bbf7d0', display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: '900', color: '#16a34a', marginBottom: '8px' }}><Calendar size={14} /> LỌC LỊCH SỬ TỪ NGÀY (YYYY-MM-DD):</label>
          <input type="text" placeholder="Gõ: 2026-03-28" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #16a34a', fontFamily: 'monospace', fontWeight: 'bold' }} />
        </div>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: '900', color: '#16a34a', marginBottom: '8px' }}><Calendar size={14} /> ĐẾN NGÀY (YYYY-MM-DD):</label>
          <input type="text" placeholder="Gõ: 2026-03-28" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #16a34a', fontFamily: 'monospace', fontWeight: 'bold' }} />
        </div>
        <button onClick={() => { setStartDate(''); setEndDate(''); }} style={{ padding: '12px 25px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}>LÀM MỚI</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <LogTable title="NHẬT KÝ TRẢ VŨ KHÍ,CƠ SỞ,VẬT CHẤT" data={logData.daTra} icon={CheckCircle2} isReturnTable={true} />
        <LogTable title="NHẬT KÝ MƯỢN VŨ KHÍ,CƠ SỞ,VẬT CHẤT" data={logData.tatCa} icon={History} isHistory={true} />
      </div>

      {borrowModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{fontSize:'14px', margin:0, display:'flex', alignItems:'center', gap:'8px'}}><ArrowRightCircle size={18}/> {borrowModal.VatChat.toUpperCase()}</h3>
              <X 
                style={{cursor:'pointer'}} 
                onClick={() => {
                  setBorrowModal(null);
                  setBorrowQty(1);
                  setIsCooldown(false);
                }} 
              />
            </div>
            <div style={{padding:'20px'}}>
              {isScannerRequired(borrowModal.VatChat) ? (
                <div className="qr-box-scanner">
                  <input ref={scanInputRef} type="text" onChange={handleAutoScanner} style={{position:'absolute', opacity:0}} autoFocus />
                  <div className="scanner-line"></div>
                  <QrCode size={60} color="#15803d" style={{opacity:0.3}} />
                  <p style={{fontSize:'11px', fontWeight:'bold', marginTop:'10px', color: '#15803d'}}>
                    {isCooldown ? "VUI LÒNG ĐỢI 3 GIÂY..." : "ĐANG CHỜ QUÉT MÃ..."}
                  </p>
                </div>
              ) : (
                <div style={{display:'flex', flexDirection:'column', gap:'15px'}}>
                  <label style={{fontSize: '12px', fontWeight: 'bold', color: '#64748b'}}>SỐ LƯỢNG MƯỢN:</label>
                  <input type="number" value={borrowQty} min="1" max={borrowModal.SoLuong} onChange={(e) => setBorrowQty(Number(e.target.value))} style={{width:'100%', padding:'12px', borderRadius:'8px', border:'1px solid #e2e8f0', textAlign:'center', fontSize: '18px', fontWeight: 'bold'}} />
                  
                  <button 
                    disabled={isCooldown}
                    onClick={() => handleTeacherBorrow(borrowModal, borrowQty)} 
                    className="btn-borrow"
                    style={{ 
                        opacity: isCooldown ? 0.5 : 1, 
                        cursor: isCooldown ? 'not-allowed' : 'pointer',
                        background: isCooldown ? '#94a3b8' : '' 
                    }}
                  >
                    {isCooldown ? <><Timer size={18}/> ĐANG XỬ LÝ (3S)...</> : "XÁC NHẬN MƯỢN"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {confirmData && (
        <div className="modal-overlay">
          <div className="modal-content" style={{textAlign:'center'}}>
              <div style={{padding:'30px'}}>
                <RotateCcw size={40} color="#15803d" style={{marginBottom:'15px', margin: '0 auto'}}/>
                <h4 style={{margin:'15px 0 10px 0'}}>XÁC NHẬN TRẢ KHO?</h4>
                <p style={{color:'#64748b', fontSize:'13px'}}>{confirmData.VatChat}</p>
                <div style={{display:'flex', gap:'10px', marginTop:'20px'}}>
                  <button onClick={executeReturn} className="btn-borrow">TRẢ</button>
                  <button onClick={() => setConfirmData(null)} style={{width:'100%', padding:'12px', borderRadius:'8px', border:'none', background:'#f1f5f9', cursor:'pointer', fontWeight:800}}>HỦY</button>
                </div>
              </div>
          </div>
        </div>
      )}
    </div>
  );
}