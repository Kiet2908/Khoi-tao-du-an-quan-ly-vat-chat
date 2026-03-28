import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, Shield, X, RotateCcw, QrCode, Activity, 
  Package, HeartPulse, Building2, Undo2, ArrowRightCircle, CheckCircle2,
  History // Thêm icon lịch sử
} from 'lucide-react';
import { supabase } from '../supabaseClient'; 
import './Equipment.css';

// --- INTERFACES ---
interface EquipmentItem { 
  id: string; VatChat: string; SoLuong: number; TongBanDau: number; TrangThai: string; Loai: 'TRANG_BI' | 'Y_TE' | 'CO_SO'; 
}

interface ChoMuonLog {
  id?: string | number; NgayThang: string; NguoiNhan: string; VatChat: string; MaVatChat?: string; SoLuong: number; TrangThai: string; teacherId?: string; 
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
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCloudData(); }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (borrowModal && isScannerRequired(borrowModal.VatChat) && scanInputRef.current) {
        if (document.activeElement !== scanInputRef.current) scanInputRef.current.focus();
      }
    }, 400);
    return () => clearInterval(interval);
  }, [borrowModal]);

  const handleTeacherBorrow = async (item: EquipmentItem, qty: number, qrCodeData?: string) => {
    const latestItem = equipment.find(e => e.id === item.id);
    if (!latestItem || latestItem.SoLuong < qty) return showToast('Kho không đủ!', 'error');

    setLoading(true);
    try {
      const existingLog = logs.find(l => l.teacherId === currentUsername && l.VatChat === item.VatChat && l.TrangThai === 'Đang giữ');
      if (existingLog) {
        let newMaList = existingLog.MaVatChat || '';
        if (qrCodeData) {
          if (newMaList.includes(qrCodeData)) {
            setLoading(false);
            return showToast(`Mã ${qrCodeData} đã quét!`, 'error');
          }
          newMaList = newMaList ? `${newMaList}, ${qrCodeData}` : qrCodeData;
        }
        await supabase.from('ChoMuon').update({ SoLuong: Number(existingLog.SoLuong) + qty, MaVatChat: newMaList }).eq('id', existingLog.id);
      } else {
        await supabase.from('ChoMuon').insert([{ NgayThang: new Date().toISOString(), NguoiNhan: currentUserFullName, VatChat: item.VatChat, MaVatChat: qrCodeData || '', SoLuong: qty, TrangThai: 'Đang giữ', teacherId: currentUsername }]);
      }
      await supabase.from('Equipment').update({ SoLuong: latestItem.SoLuong - qty }).eq('id', item.id);
      showToast(qrCodeData ? `Nhận mã: ${qrCodeData}` : `Mượn thành công!`);
      if (!qrCodeData) setBorrowModal(null); 
      fetchCloudData();
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
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

  const executeReturn = async () => {
    if (!confirmData || loading) return;
    setLoading(true);
    try {
      await supabase.from('ChoMuon').update({ TrangThai: 'Đã trả' }).eq('id', confirmData.id);
      const eqItem = equipment.find(i => i.VatChat === confirmData.VatChat);
      if (eqItem) {
        await supabase.from('Equipment').update({ SoLuong: Number(eqItem.SoLuong) + Number(confirmData.SoLuong) }).eq('id', eqItem.id);
      }
      setConfirmData(null); showToast('Đã trả!'); fetchCloudData();
    } catch (err) { showToast('Lỗi!', 'error'); }
    finally { setLoading(false); }
  };

  const filteredLogs = useMemo(() => {
    const userLogs = userRole === 'ADMIN' ? logs : logs.filter(log => log.teacherId === currentUsername);
    const active = userLogs.filter(l => l.TrangThai === 'Đang giữ');
    const getCategory = (name: string) => equipment.find(e => e.VatChat === name)?.Loai;

    return {
      vuKhi: active.filter(l => l.VatChat.toUpperCase().includes('AK') || l.VatChat.toUpperCase().includes('CKC')),
      mayBan: active.filter(l => l.VatChat.toUpperCase().includes('MÁY BẮN') || l.VatChat.toUpperCase().includes('MBT') || l.VatChat.toUpperCase().includes('TBS')),
      coSo: active.filter(l => getCategory(l.VatChat) === 'CO_SO'),
      yTe: active.filter(l => getCategory(l.VatChat) === 'Y_TE'),
      daTra: userLogs.filter(l => l.TrangThai === 'Đã trả'),
      tatCa: userLogs // Lịch sử tổng hợp
    };
  }, [logs, equipment, userRole, currentUsername]);

  const LogTable = ({ title, data, icon: Icon, isReturnTable = false, isHistory = false }: any) => (
    <div className="table-wrapper" style={isReturnTable ? {border: '1px solid #4ade80'} : isHistory ? {border: '1px solid #94a3b8'} : {}}>
      <div className="table-header-box">
        <Icon size={20} color={isReturnTable ? "#16a34a" : isHistory ? "#64748b" : "#14532d"} /> {title}
      </div>
      <div className="desktop-table-view">
        <table className="main-table">
          <thead>
            <tr>
              <th>THỜI GIAN</th><th>NGƯỜI MƯỢN</th><th>VẬT CHẤT</th><th>CHI TIẾT</th><th>TRẠNG THÁI</th>
              {!isReturnTable && !isHistory && userRole === 'TEACHER' && <th>THAO TÁC</th>}
            </tr>
          </thead>
          <tbody>
            {data.length > 0 ? data.map((log: any) => (
              <tr key={log.id}>
                <td>{new Date(log.NgayThang).toLocaleString('vi-VN')}</td>
                <td><b>{log.NguoiNhan}</b></td>
                <td>{log.VatChat}</td>
                <td>{log.MaVatChat ? log.MaVatChat.split(', ').map((m: any, i: any) => <span key={i} className="badge-unit">{m}</span>) : <b>SL: {log.SoLuong}</b>}</td>
                <td><span style={{color: log.TrangThai === 'Đã trả' ? '#16a34a' : '#ef4444', fontWeight:'bold'}}>{log.TrangThai}</span></td>
                {!isReturnTable && !isHistory && userRole === 'TEACHER' && (
                  <td><button onClick={() => setConfirmData(log)} className="btn-borrow" style={{width:'auto', padding:'5px 10px'}}><Undo2 size={14}/> TRẢ</button></td>
                )}
              </tr>
            )) : <tr><td colSpan={6} style={{padding:'20px', textAlign:'center', color:'#94a3b8'}}>Trống</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="equipment-container">
      <div className="grid-overlay"></div>
      {toast && <div className="toast-animate" style={{position:'fixed', bottom:'20px', right:'20px', background: toast.type==='success'?'#14532d':'#dc2626', color:'white', padding:'15px', borderRadius:'12px', zIndex:2000, fontWeight:800}}>{toast.msg}</div>}

      <div className="header-section">
        <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
          <Shield size={32} color="#ffffff" />
          <div>
            <h1 className="title-style">QUẢN TRỊ KHO VẬT CHẤT</h1>
            <p className="sub-title-text">HỆ THỐNG GIAO DIỆN QUÂN ĐỘI - TON XANH LÁ</p>
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
                  <button onClick={() => setBorrowModal(item)} className="btn-borrow">
                    {isScannerRequired(item.VatChat) ? <><QrCode size={18}/> QUÉT MÃ</> : <><Plus size={18}/> MƯỢN</>}
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{display:'flex', flexDirection:'column', gap:'30px', position:'relative', zIndex:2}}>
        <LogTable title="NHẬT KÝ VŨ KHÍ ĐANG GIỮ" data={filteredLogs.vuKhi} icon={Shield} />
        <LogTable title="NHẬT KÝ MÁY BẮN TẬP ĐANG GIỮ" data={filteredLogs.mayBan} icon={Activity} />
        <LogTable title="NHẬT KÝ CƠ SỞ VẬT CHẤT ĐANG GIỮ" data={filteredLogs.coSo} icon={Building2} />
        <LogTable title="NHẬT KÝ Y TẾ ĐANG GIỮ" data={filteredLogs.yTe} icon={HeartPulse} />
        <LogTable title="LỊCH SỬ THU HỒI (ĐÃ TRẢ)" data={filteredLogs.daTra} icon={CheckCircle2} isReturnTable={true} />
        
        {/* BẢNG LỊCH SỬ TỔNG HỢP MỚI THÊM */}
        <LogTable title="LỊCH SỬ MƯỢN TRẢ TỔNG HỢP" data={filteredLogs.tatCa} icon={History} isHistory={true} />
      </div>

      {/* --- MODAL MƯỢN --- */}
      {borrowModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{fontSize:'14px', margin:0, display:'flex', alignItems:'center', gap:'8px'}}>
                <ArrowRightCircle size={18}/> {borrowModal.VatChat.toUpperCase()}
              </h3>
              <X style={{cursor:'pointer'}} onClick={() => setBorrowModal(null)} />
            </div>
            <div style={{padding:'20px'}}>
              {isScannerRequired(borrowModal.VatChat) ? (
                <div style={{textAlign:'center', padding:'30px', border:'2px dashed #bbf7d0', borderRadius:'15px', position:'relative', background:'#f0fdf4'}}>
                  <input ref={scanInputRef} type="text" onChange={handleAutoScanner} style={{position:'absolute', opacity:0}} autoFocus />
                  <div className="scanner-line"></div>
                  <QrCode size={60} color="#15803d" style={{opacity:0.3}} />
                  <p style={{fontSize:'11px', fontWeight:'bold', marginTop:'10px', color: '#15803d'}}>ĐANG CHỜ QUÉT MÃ...</p>
                </div>
              ) : (
                <div style={{display:'flex', flexDirection:'column', gap:'15px'}}>
                  <input type="number" value={borrowQty} min="1" max={borrowModal.SoLuong} onChange={(e) => setBorrowQty(Number(e.target.value))} style={{width:'100%', padding:'12px', borderRadius:'8px', border:'1px solid #e2e8f0', textAlign:'center'}} />
                  <button onClick={() => handleTeacherBorrow(borrowModal, borrowQty)} className="btn-borrow">XÁC NHẬN MƯỢN</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL TRẢ --- */}
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