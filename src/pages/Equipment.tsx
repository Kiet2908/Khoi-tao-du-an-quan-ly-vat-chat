import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, Shield, X, Check, RotateCcw, QrCode, Activity,  LayoutGrid, 
  Package, HeartPulse, Building2, Undo2, ArrowRightCircle,
} from 'lucide-react';
import { supabase } from '../supabaseClient'; 

// --- INTERFACES ---
interface EquipmentItem { 
  id: string; 
  VatChat: string; 
  SoLuong: number; 
  TongBanDau: number; 
  TrangThai: string; 
  Loai: 'TRANG_BI' | 'Y_TE' | 'CO_SO'; 
}

interface ChoMuonLog {
  id?: string | number;
  NgayThang: string;   
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
  const scanInputRef = useRef<HTMLInputElement>(null);
  const lastScanTime = useRef<number>(0);

  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  const [confirmData, setConfirmData] = useState<ChoMuonLog | null>(null);

  const isScannerRequired = (name: string) => {
    const n = name.toUpperCase();
    return n.includes('AK') || n.includes('MÁY BẮN') || n.includes('MBT') || n.includes('TBS');
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
    if (!latestItem || latestItem.SoLuong < qty) {
      return showToast('Kho không đủ số lượng!', 'error');
    }

    setLoading(true);
    try {
      const existingLog = logs.find(l => 
        l.teacherId === currentUsername && 
        l.VatChat === item.VatChat && 
        l.TrangThai === 'Đang giữ'
      );

      if (existingLog) {
        let newMaList = existingLog.MaVatChat || '';
        if (qrCodeData) {
          if (newMaList.includes(qrCodeData)) {
            setLoading(false);
            return showToast(`Mã ${qrCodeData} đã quét rồi!`, 'error');
          }
          newMaList = newMaList ? `${newMaList}, ${qrCodeData}` : qrCodeData;
        }

        await supabase.from('ChoMuon').update({ 
          SoLuong: Number(existingLog.SoLuong) + qty,
          MaVatChat: newMaList 
        }).eq('id', existingLog.id);
      } else {
        await supabase.from('ChoMuon').insert([{
          NgayThang: new Date().toISOString(),
          NguoiNhan: currentUserFullName,
          VatChat: item.VatChat,
          MaVatChat: qrCodeData || '',
          SoLuong: qty,
          TrangThai: 'Đang giữ',
          teacherId: currentUsername
        }]);
      }

      const newStockValue = latestItem.SoLuong - qty;
      await supabase.from('Equipment').update({ SoLuong: newStockValue }).eq('id', item.id);

      showToast(qrCodeData ? `Đã nhận mã: ${qrCodeData}` : `Mượn thành công!`);
      if (!qrCodeData) setBorrowModal(null); 
      fetchCloudData();
    } catch (err) { 
      console.error("Lỗi:", err);
      showToast('Lỗi hệ thống!', 'error'); 
    }
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
        await supabase.from('Equipment').update({ 
          SoLuong: Number(eqItem.SoLuong) + Number(confirmData.SoLuong) 
        }).eq('id', eqItem.id);
      }
      setConfirmData(null); showToast('Đã trả thiết bị!'); fetchCloudData();
    } catch (err) { showToast('Lỗi!', 'error'); }
    finally { setLoading(false); }
  };

  const filteredLogs = useMemo(() => {
    const userLogs = userRole === 'ADMIN' ? logs : logs.filter(log => log.teacherId === currentUsername);
    return {
      vuKhi: userLogs.filter(l => l.VatChat.toUpperCase().includes('AK')),
      mayBan: userLogs.filter(l => 
        l.VatChat.toUpperCase().includes('MÁY BẮN') || 
        l.VatChat.toUpperCase().includes('MBT') || 
        l.VatChat.toUpperCase().includes('TBS')
      ),
      khac: userLogs.filter(l => 
        !l.VatChat.toUpperCase().includes('AK') && 
        !l.VatChat.toUpperCase().includes('MÁY BẮN') && 
        !l.VatChat.toUpperCase().includes('MBT') && 
        !l.VatChat.toUpperCase().includes('TBS')
      )
    };
  }, [logs, userRole, currentUsername]);

  const LogTable = ({ title, data, icon: Icon }: { title: string, data: ChoMuonLog[], icon: any }) => (
    <div style={styles.tableWrapper}>
      <div style={styles.tableHeaderStyle}><Icon size={20} color="#fbbf24" /> {title}</div>
      <div style={{ overflowX: 'auto' }}>
        <table style={styles.tableMain}>
          <thead>
            <tr>
              <th style={styles.thStyle}>THỜI GIAN</th>
              <th style={styles.thStyle}>NGƯỜI MƯỢN</th>
              <th style={styles.thStyle}>VẬT CHẤT</th>
              <th style={styles.thStyle}>MÃ SÚNG / SL</th>
              <th style={styles.thStyle}>TRẠNG THÁI</th>
              {userRole === 'TEACHER' && <th style={styles.thStyle}>THAO TÁC</th>}
            </tr>
          </thead>
          <tbody>
            {data.length > 0 ? data.map((log) => (
              <tr key={log.id} style={styles.trStyle}>
                <td style={styles.tdStyle}>{new Date(log.NgayThang).toLocaleString('vi-VN', {hour:'2-digit', minute:'2-digit', day:'2-digit', month:'2-digit'})}</td>
                <td style={styles.tdStyle}><b style={{color: '#fff'}}>{log.NguoiNhan}</b></td>
                <td style={styles.tdStyle}>{log.VatChat}</td>
                <td style={styles.tdStyle}>
                  {log.MaVatChat ? (
                    <div style={{display:'flex', flexWrap:'wrap', gap:'4px'}}>{log.MaVatChat.split(', ').map((m, i) => <span key={i} style={styles.vkBadge}>{m}</span>)}</div>
                  ) : <b style={{color: '#fbbf24'}}>SL: {log.SoLuong}</b>}
                </td>
                <td style={styles.tdStyle}><span style={log.TrangThai === 'Đã trả' ? styles.statusOk : styles.statusWait}>{log.TrangThai}</span></td>
                {userRole === 'TEACHER' && log.TrangThai !== 'Đã trả' && (
                  <td style={styles.tdStyle}>
                    <button onClick={() => setConfirmData(log)} style={styles.btnReturnSmall}>
                       <Undo2 size={14} /> TRẢ ĐỒ
                    </button>
                  </td>
                )}
              </tr>
            )) : <tr><td colSpan={6} style={{padding:'40px', textAlign:'center', color:'#6b7280'}}>Hệ thống chưa ghi nhận dữ liệu</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div style={styles.containerStyle}>
      <div style={styles.gridOverlayStyle}></div>
      {toast && <div className="toast-animate" style={styles.toastStyle(toast.type)}>{toast.msg}</div>}

      <div style={styles.headerSection}>
        <div style={styles.logoWrapper}>
          <Shield size={40} color="#fbbf24" style={{filter: 'drop-shadow(0 0 10px rgba(251,191,36,0.5))'}} />
          <div>
            <h1 style={styles.titleStyle}>HỆ THỐNG QUẢN TRỊ VẬT CHẤT</h1>
            <p style={{fontSize: '11px', opacity: 0.6, margin: 0, letterSpacing: '2px', color: '#fff'}}>MILITARY LOGISTICS MANAGEMENT</p>
          </div>
        </div>
      </div>

      <div style={styles.tabRow}>
        <button onClick={() => setActiveTab('TRANG_BI')} style={activeTab === 'TRANG_BI' ? styles.tabActive : styles.tabInactive}>
          <Package size={18} /> TRANG BỊ
        </button>
        <button onClick={() => setActiveTab('CO_SO')} style={activeTab === 'CO_SO' ? styles.tabActive : styles.tabInactive}>
          <Building2 size={18} /> CƠ SỞ
        </button>
        <button onClick={() => setActiveTab('Y_TE')} style={activeTab === 'Y_TE' ? styles.tabActive : styles.tabInactive}>
          <HeartPulse size={18} /> Y TẾ
        </button>
      </div>

      <div style={styles.gridStyle}>
        {equipment.filter(i => i.Loai === activeTab).map(item => (
          <div key={item.id} style={styles.cardStyle} className="card-hover">
            <h4 style={styles.cardTitle}>{item.VatChat}</h4>
            <div style={styles.stockNumberStyle}>{item.SoLuong} <span style={{fontSize: '14px', opacity: 0.4}}>/ {item.TongBanDau}</span></div>
            {userRole === 'TEACHER' && item.SoLuong > 0 && (
              <button onClick={() => setBorrowModal(item)} style={styles.btnBorrow}>
                {isScannerRequired(item.VatChat) ? <><QrCode size={18}/> QUÉT MÃ VŨ KHÍ</> : <><Plus size={18}/> MƯỢN VẬT CHẤT</>}
              </button>
            )}
          </div>
        ))}
      </div>

      <div style={{display:'flex', flexDirection:'column', gap:'40px', position: 'relative', zIndex: 2}}>
        <LogTable title="NHẬT KÝ VŨ KHÍ & KHÍ TÀI" data={filteredLogs.vuKhi} icon={Shield} />
        <LogTable title="NHẬT KÝ MÁY BẮN TẬP KỸ THUẬT" data={filteredLogs.mayBan} icon={Activity} />
        <LogTable title="NHẬT KÝ HẬU CẦN & VẬT TƯ KHÁC" data={filteredLogs.khac} icon={LayoutGrid} />
      </div>

      {borrowModal && (
        <div style={styles.overlayStyle}>
          <div className="modal-animate" style={styles.modalStyle}>
            <div style={styles.modalHeader}>
              <h3 style={{display:'flex', alignItems:'center', gap:'10px', fontSize: '16px', margin: 0}}>
                <ArrowRightCircle size={20}/> CẤP PHÁT: {borrowModal.VatChat.toUpperCase()}
              </h3>
              <X style={{cursor:'pointer'}} onClick={() => setBorrowModal(null)} />
            </div>
            <div style={{padding:'30px'}}>
              {isScannerRequired(borrowModal.VatChat) ? (
                <div style={styles.qrBoxStyle}>
                  <input ref={scanInputRef} type="text" onChange={handleAutoScanner} style={{position:'absolute', opacity:0}} autoFocus />
                  <div className="scanner-line"></div>
                  <QrCode size={80} color="#fbbf24" style={{opacity:0.3}} />
                  <p style={{fontSize:'12px', fontWeight:'bold', marginTop:'15px', color: '#fbbf24'}}>ĐANG CHỜ QUÉT MÃ...</p>
                </div>
              ) : (
                <div style={{display:'flex', flexDirection:'column', gap:'20px'}}>
                  <div>
                    <label style={{fontSize: '12px', color: '#94a3b8', marginBottom: '8px', display: 'block'}}>SỐ LƯỢNG MƯỢN</label>
                    <input type="number" value={borrowQty} min="1" max={borrowModal.SoLuong} onChange={(e) => setBorrowQty(Number(e.target.value))} style={styles.inputModern} />
                  </div>
                  <button onClick={() => handleTeacherBorrow(borrowModal, borrowQty)} style={styles.btnPrimaryFull}>
                    <Check size={18} /> XÁC NHẬN CẤP PHÁT
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {confirmData && (
        <div style={styles.overlayStyle}>
          <div className="modal-animate" style={styles.modalStyle}>
            <div style={{padding:'40px', textAlign:'center', background: '#022c22'}}>
              <RotateCcw size={50} color="#fbbf24" style={{marginBottom:'20px'}}/>
              <h3 style={{margin:'0 0 10px 0', color: '#fff'}}>THU HỒI VẬT CHẤT?</h3>
              <p style={{color:'#94a3b8', fontSize:'14px'}}>{confirmData.VatChat}</p>
              <div style={{display:'flex', gap:'15px', marginTop:'30px'}}>
                <button onClick={executeReturn} style={styles.btnPrimaryFull}>XÁC NHẬN</button>
                <button onClick={() => setConfirmData(null)} style={styles.btnSecondary}>HỦY BỎ</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .scanner-line { width: 100%; height: 2px; background: #fbbf24; position: absolute; animation: scan 2s infinite ease-in-out; box-shadow: 0 0 10px #fbbf24; }
        @keyframes scan { 0% { top: 10%; } 50% { top: 90%; } 100% { top: 10%; } }
        .card-hover:hover { transform: translateY(-8px); box-shadow: 0 20px 40px rgba(0,0,0,0.4); border-color: #fbbf24 !important; }
        .toast-animate { animation: slideIn 0.4s ease-out; }
        .modal-animate { animation: zoomIn 0.3s ease-out; }
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes zoomIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  );
}

// --- HỆ THỐNG STYLE ĐÃ ĐƯỢC FIX ---
const styles: any = {
  containerStyle: { 
    padding: '40px 20px', maxWidth: '1300px', margin: '0 auto', 
    background: 'linear-gradient(135deg, #064e3b 0%, #022c22 100%)', 
    minHeight: '100vh', position: 'relative', color: '#cbd5e1' 
  },
  gridOverlayStyle: {
    position: 'absolute', inset: 0,
    backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)`,
    backgroundSize: '30px 30px', pointerEvents: 'none', zIndex: 1
  },
  headerSection: { 
    background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(10px)',
    padding: '30px', borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.1)',
    marginBottom: '40px', position: 'relative', zIndex: 2
  },
  logoWrapper: { display: 'flex', alignItems: 'center', gap: '20px' },
  titleStyle: { margin: 0, fontSize: '1.8rem', fontWeight: '900', letterSpacing: '-1px', color: '#fff' },
  tabRow: { display: 'flex', gap: '12px', marginBottom: '35px', position: 'relative', zIndex: 2 },
  tabActive: { 
    display:'flex', alignItems:'center', gap:'10px', padding: '12px 24px', 
    background: '#fbbf24', color: '#022c22', borderRadius: '12px', 
    fontWeight: '800', border: 'none', cursor:'pointer'
  },
  tabInactive: { 
    display:'flex', alignItems:'center', gap:'10px', padding: '12px 24px', 
    background: 'rgba(255,255,255,0.05)', color: '#94a3b8', borderRadius: '12px', 
    border: '1px solid rgba(255,255,255,0.1)', cursor:'pointer'
  },
  gridStyle: { 
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
    gap: '25px', marginBottom: '50px', position: 'relative', zIndex: 2 
  },
  cardStyle: { 
    background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(10px)',
    padding: '30px', borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.08)', transition: 'all 0.4s'
  },
  cardTitle: { margin: 0, fontWeight: '700', color: '#94a3b8', fontSize: '13px', textTransform: 'uppercase' },
  stockNumberStyle: { fontSize: '2.5rem', fontWeight: '900', color: '#fff', margin: '15px 0' },
  btnBorrow: { 
    width: '100%', padding: '14px', background: '#fbbf24', color: '#022c22', 
    border: 'none', borderRadius: '14px', fontWeight: '800', cursor: 'pointer', 
    display:'flex', alignItems:'center', justifyContent:'center', gap:'10px'
  },
  tableWrapper: { 
    background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(20px)',
    borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.08)', overflow: 'hidden' 
  },
  tableHeaderStyle: { 
    padding: '25px', fontWeight: '800', fontSize: '16px', color: '#fff',
    display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' 
  },
  tableMain: { width: '100%', borderCollapse: 'collapse' },
  thStyle: { padding: '18px 25px', textAlign: 'left', background: 'rgba(255,255,255,0.02)', fontSize: '11px', color: '#64748b' },
  tdStyle: { padding: '18px 25px', fontSize: '14px', borderBottom: '1px solid rgba(255, 255, 255, 0.03)', color: '#d1d5db' },
  vkBadge: { 
    background: 'rgba(251, 191, 36, 0.1)', padding: '4px 10px', borderRadius: '8px', 
    fontSize: '11px', fontWeight: '800', color: '#fbbf24', border: '1px solid rgba(251, 191, 36, 0.2)' 
  },
  statusOk: { color: '#4ade80', fontWeight: 'bold' },
  statusWait: { color: '#f87171', fontWeight: 'bold' },
  btnReturnSmall: { 
    display:'flex', alignItems:'center', gap:'8px', padding: '8px 16px', 
    background: 'transparent', color: '#fbbf24', border: '1.5px solid #fbbf24', 
    borderRadius: '10px', cursor: 'pointer', fontWeight:'800'
  },
  overlayStyle: { 
    position: 'fixed', inset: 0, background: 'rgba(2, 44, 34, 0.85)', 
    backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 
  },
  modalStyle: { background: '#0f172a', borderRadius: '32px', width: '420px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' },
  modalHeader: { padding: '20px 30px', background: '#fbbf24', color: '#022c22', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  qrBoxStyle: { 
    padding: '40px', border: '2px dashed rgba(251, 191, 36, 0.3)', 
    borderRadius: '24px', textAlign: 'center', position: 'relative'
  },
  inputModern: { 
    width: '100%', padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '18px', outline: 'none'
  },
  btnPrimaryFull: { 
    display:'flex', alignItems:'center', justifyContent:'center', gap:'10px', width: '100%', 
    padding: '16px', background: '#fbbf24', color: '#022c22', borderRadius: '16px', fontWeight: '900', border: 'none', cursor: 'pointer'
  },
  btnSecondary: { 
    display:'flex', alignItems:'center', justifyContent:'center', gap:'10px', width: '100%', 
    padding: '16px', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', borderRadius: '16px', border: 'none', cursor: 'pointer'
  },
  toastStyle: (t: string) => ({ 
    position: 'fixed', bottom: '30px', right: '30px', padding: '18px 30px', 
    background: t === 'success' ? '#059669' : '#dc2626', color: 'white', borderRadius: '20px', zIndex: 2000, fontWeight: '800'
    
  })
  
};