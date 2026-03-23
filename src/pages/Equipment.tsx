import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, Shield, X, RotateCcw, QrCode, Activity,  LayoutGrid, 
  Package, HeartPulse, Building2, Undo2, ArrowRightCircle
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

  // --- LOGIC CŨ ---
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
    <div className="table-section" style={styles.tableWrapper}>
      <div style={styles.tableHeaderStyle}><Icon size={20} color="#fbbf24" /> {title}</div>
      <div className="desktop-table-view">
        <table style={styles.tableMain}>
          <thead>
            <tr>
              <th style={styles.thStyle}>THỜI GIAN</th>
              <th style={styles.thStyle}>NGƯỜI MƯỢN</th>
              <th style={styles.thStyle}>VẬT CHẤT</th>
              <th style={styles.thStyle}>MÃ / SL</th>
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
                    <button onClick={() => setConfirmData(log)} style={styles.btnReturnSmall}><Undo2 size={14} /> TRẢ</button>
                  </td>
                )}
              </tr>
            )) : <tr><td colSpan={6} style={{padding:'40px', textAlign:'center', color:'#6b7280'}}>Hệ thống chưa ghi nhận dữ liệu</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="mobile-table-view">
        {data.length > 0 ? data.map((log) => (
          <div key={log.id} style={styles.mobileLogCard}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'10px'}}>
              <span style={{fontSize:'12px', color:'#94a3b8'}}>{new Date(log.NgayThang).toLocaleDateString('vi-VN')}</span>
              <span style={log.TrangThai === 'Đã trả' ? styles.statusOk : styles.statusWait}>{log.TrangThai}</span>
            </div>
            <div style={{color:'#fff', fontWeight:'bold', fontSize:'15px'}}>{log.VatChat}</div>
            <div style={{fontSize:'13px', margin:'5px 0'}}>{log.NguoiNhan}</div>
            <div style={{marginTop:'10px'}}>
               {log.MaVatChat ? (
                  <div style={{display:'flex', flexWrap:'wrap', gap:'4px'}}>{log.MaVatChat.split(', ').map((m, i) => <span key={i} style={styles.vkBadge}>{m}</span>)}</div>
                ) : <span style={{color: '#fbbf24', fontSize:'12px'}}>Số lượng: {log.SoLuong}</span>}
            </div>
            {userRole === 'TEACHER' && log.TrangThai !== 'Đã trả' && (
              <button onClick={() => setConfirmData(log)} style={{...styles.btnReturnSmall, width:'100%', marginTop:'15px', justifyContent:'center'}}><Undo2 size={14} /> TRẢ VẬT CHẤT</button>
            )}
          </div>
        )) : <div style={{textAlign:'center', padding:'20px', color: '#6b7280'}}>Chưa có dữ liệu</div>}
      </div>
    </div>
  );

  return (
    <div style={styles.containerStyle}>
      <div style={styles.gridOverlayStyle}></div>
      {toast && <div className="toast-animate" style={styles.toastStyle(toast.type)}>{toast.msg}</div>}

      <div style={styles.headerSection} className="header-responsive">
        <div style={styles.logoWrapper}>
          <Shield size={32} color="#fbbf24" />
          <div>
            <h1 style={styles.titleStyle} className="title-responsive">HỆ THỐNG QUẢN TRỊ VẬT CHẤT</h1>
            <p style={styles.subTitleText}>MILITARY LOGISTICS MANAGEMENT</p>
          </div>
        </div>
      </div>

      {/* --- PHÂN QUYỀN HIỂN THỊ TABS VÀ KHO --- */}
      {(userRole === 'ADMIN' || userRole === 'TEACHER') ? (
        <>
          <div style={styles.tabRow} className="tabs-scroll">
            <button onClick={() => setActiveTab('TRANG_BI')} style={activeTab === 'TRANG_BI' ? styles.tabActive : styles.tabInactive}>
              <Package size={18} /> <span className="tab-text">TRANG BỊ</span>
            </button>
            <button onClick={() => setActiveTab('CO_SO')} style={activeTab === 'CO_SO' ? styles.tabActive : styles.tabInactive}>
              <Building2 size={18} /> <span className="tab-text">CƠ SỞ</span>
            </button>
            <button onClick={() => setActiveTab('Y_TE')} style={activeTab === 'Y_TE' ? styles.tabActive : styles.tabInactive}>
              <HeartPulse size={18} /> <span className="tab-text">Y TẾ</span>
            </button>
          </div>

          <div style={styles.gridStyle}>
            {equipment.filter(i => i.Loai === activeTab).map(item => (
              <div key={item.id} style={styles.cardStyle} className="card-hover">
                <h4 style={styles.cardTitle}>{item.VatChat}</h4>
                <div style={styles.stockNumberStyle}>{item.SoLuong} <span style={{fontSize: '14px', opacity: 0.4}}>/ {item.TongBanDau}</span></div>
                {userRole === 'TEACHER' && item.SoLuong > 0 && (
                  <button onClick={() => setBorrowModal(item)} style={styles.btnBorrow}>
                    {isScannerRequired(item.VatChat) ? <><QrCode size={18}/> QUÉT MÃ</> : <><Plus size={18}/> MƯỢN</>}
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        /* GIAO DIỆN TRỐNG CHO SINH VIÊN (Chỉ hiện thông báo nhỏ hoặc để trống) */
        <div style={{ marginBottom: '30px', padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>Chào mừng chiến sĩ, xem nhật ký mượn trả bên dưới.</p>
        </div>
      )}

      {/* NHẬT KÝ LUÔN HIỂN THỊ (Nhưng code filteredLogs đã đảm bảo Sinh viên chỉ thấy đồ của họ) */}
      <div className="log-sections" style={{display:'flex', flexDirection:'column', gap:'30px', position: 'relative', zIndex: 2}}>
        <LogTable title="NHẬT KÝ VŨ KHÍ & KHÍ TÀI" data={filteredLogs.vuKhi} icon={Shield} />
        <LogTable title="NHẬT KÝ MÁY BẮN TẬP KỸ THUẬT" data={filteredLogs.mayBan} icon={Activity} />
        <LogTable title="NHẬT KÝ HẬU CẦN & VẬT TƯ KHÁC" data={filteredLogs.khac} icon={LayoutGrid} />
      </div>

      {/* MODALS */}
      {borrowModal && (
        <div style={styles.overlayStyle}>
          <div className="modal-animate" style={styles.modalStyle}>
            <div style={styles.modalHeader}>
              <h3 style={{display:'flex', alignItems:'center', gap:'10px', fontSize: '14px', margin: 0}}>
                <ArrowRightCircle size={18}/> CẤP PHÁT: {borrowModal.VatChat.toUpperCase()}
              </h3>
              <X style={{cursor:'pointer'}} onClick={() => setBorrowModal(null)} />
            </div>
            <div style={{padding:'20px'}}>
              {isScannerRequired(borrowModal.VatChat) ? (
                <div style={styles.qrBoxStyle}>
                  <input ref={scanInputRef} type="text" onChange={handleAutoScanner} style={{position:'absolute', opacity:0}} autoFocus />
                  <div className="scanner-line"></div>
                  <QrCode size={60} color="#fbbf24" style={{opacity:0.3}} />
                  <p style={{fontSize:'11px', fontWeight:'bold', marginTop:'10px', color: '#fbbf24'}}>ĐANG CHỜ QUÉT MÃ...</p>
                </div>
              ) : (
                <div style={{display:'flex', flexDirection:'column', gap:'15px'}}>
                  <label style={{fontSize: '12px', color: '#94a3b8'}}>SỐ LƯỢNG MƯỢN</label>
                  <input type="number" value={borrowQty} min="1" max={borrowModal.SoLuong} onChange={(e) => setBorrowQty(Number(e.target.value))} style={styles.inputModern} />
                  <button onClick={() => handleTeacherBorrow(borrowModal, borrowQty)} style={styles.btnPrimaryFull}>XÁC NHẬN CẤP PHÁT</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {confirmData && (
        <div style={styles.overlayStyle}>
          <div className="modal-animate" style={{...styles.modalStyle, width: '90%', maxWidth:'400px'}}>
            <div style={{padding:'30px', textAlign:'center', background: '#022c22'}}>
              <RotateCcw size={40} color="#fbbf24" style={{marginBottom:'15px'}}/>
              <h4 style={{color:'#fff', margin:'0 0 10px 0'}}>THU HỒI VẬT CHẤT?</h4>
              <p style={{color:'#94a3b8', fontSize:'13px'}}>{confirmData.VatChat}</p>
              <div style={{display:'flex', gap:'10px', marginTop:'20px'}}>
                <button onClick={executeReturn} style={styles.btnPrimaryFull}>XÁC NHẬN</button>
                <button onClick={() => setConfirmData(null)} style={styles.btnSecondary}>HỦY BỎ</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .scanner-line { width: 100%; height: 2px; background: #fbbf24; position: absolute; animation: scan 2s infinite ease-in-out; }
        @keyframes scan { 0% { top: 10%; } 50% { top: 90%; } 100% { top: 10%; } }
        .tabs-scroll { overflow-x: auto; padding-bottom: 10px; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
        .tabs-scroll::-webkit-scrollbar { display: none; }
        .desktop-table-view { display: block; }
        .mobile-table-view { display: none; }
        @media (max-width: 768px) {
          .desktop-table-view { display: none !important; }
          .mobile-table-view { display: flex !important; flex-direction: column; gap: 10px; padding: 10px; }
          .title-responsive { font-size: 1.2rem !important; }
          .header-responsive { padding: 15px !important; }
          .tab-text { font-size: 11px; }
          .container-style { padding: 15px !important; }
        }
        .card-hover:hover { transform: translateY(-5px); border-color: #fbbf24 !important; }
        .toast-animate { animation: slideIn 0.4s ease-out; }
        @keyframes slideIn { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
}

const styles: any = {
  containerStyle: { padding: '30px 15px', maxWidth: '1200px', margin: '0 auto', background: '#022c22', minHeight: '100vh', position: 'relative', color: '#cbd5e1', overflowX: 'hidden' },
  gridOverlayStyle: { position: 'absolute', inset: 0, backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)`, backgroundSize: '20px 20px', pointerEvents: 'none', zIndex: 1 },
  headerSection: { background: 'rgba(255, 255, 255, 0.03)', padding: '20px', borderRadius: '15px', border: '1px solid rgba(255, 255, 255, 0.1)', marginBottom: '25px', position: 'relative', zIndex: 2 },
  logoWrapper: { display: 'flex', alignItems: 'center', gap: '15px' },
  titleStyle: { margin: 0, fontSize: '1.5rem', fontWeight: '900', color: '#fff' },
  subTitleText: { fontSize: '10px', opacity: 0.5, margin: 0, letterSpacing: '2px', color: '#fff' },
  tabRow: { display: 'flex', gap: '8px', marginBottom: '25px', position: 'relative', zIndex: 2 },
  tabActive: { display:'flex', alignItems:'center', gap:'8px', padding: '10px 15px', whiteSpace: 'nowrap', background: '#fbbf24', color: '#022c22', borderRadius: '8px', fontWeight: '800', border: 'none' },
  tabInactive: { display:'flex', alignItems:'center', gap:'8px', padding: '10px 15px', whiteSpace: 'nowrap', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' },
  gridStyle: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '15px', marginBottom: '40px', position: 'relative', zIndex: 2 },
  cardStyle: { background: 'rgba(255, 255, 255, 0.03)', padding: '15px', borderRadius: '15px', border: '1px solid rgba(255, 255, 255, 0.08)', transition: '0.3s' },
  cardTitle: { margin: 0, fontWeight: '700', color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase' },
  stockNumberStyle: { fontSize: '1.8rem', fontWeight: '900', color: '#fff', margin: '10px 0' },
  btnBorrow: { width: '100%', padding: '10px', background: '#fbbf24', color: '#022c22', border: 'none', borderRadius: '8px', fontWeight: '800', fontSize: '11px', display:'flex', alignItems:'center', justifyContent:'center', gap:'5px' },
  tableWrapper: { background: 'rgba(15, 23, 42, 0.4)', borderRadius: '15px', border: '1px solid rgba(255, 255, 255, 0.08)', overflow: 'hidden' },
  tableHeaderStyle: { padding: '15px', fontWeight: '800', fontSize: '14px', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' },
  tableMain: { width: '100%', borderCollapse: 'collapse' },
  thStyle: { padding: '12px 15px', textAlign: 'left', background: 'rgba(255,255,255,0.02)', fontSize: '10px', color: '#64748b' },
  tdStyle: { padding: '12px 15px', fontSize: '13px', borderBottom: '1px solid rgba(255, 255, 255, 0.03)' },
  vkBadge: { background: 'rgba(251, 191, 36, 0.1)', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', color: '#fbbf24', border: '1px solid rgba(251, 191, 36, 0.2)' },
  statusOk: { color: '#4ade80', fontWeight: 'bold', fontSize: '12px' },
  statusWait: { color: '#f87171', fontWeight: 'bold', fontSize: '12px' },
  btnReturnSmall: { display:'flex', alignItems:'center', gap:'5px', padding: '5px 10px', background: 'transparent', color: '#fbbf24', border: '1px solid #fbbf24', borderRadius: '6px', fontWeight:'800', fontSize: '11px' },
  mobileLogCard: { background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' },
  overlayStyle: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '15px' },
  modalStyle: { background: '#0f172a', borderRadius: '20px', width: '100%', maxWidth: '350px', overflow: 'hidden' },
  modalHeader: { padding: '15px 20px', background: '#fbbf24', color: '#022c22', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  qrBoxStyle: { padding: '30px', border: '2px dashed rgba(251, 191, 36, 0.2)', borderRadius: '15px', textAlign: 'center', position: 'relative' },
  inputModern: { width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '16px', textAlign: 'center' },
  btnPrimaryFull: { width: '100%', padding: '12px', background: '#fbbf24', color: '#022c22', borderRadius: '8px', fontWeight: '900', border: 'none' },
  btnSecondary: { width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', borderRadius: '8px', border: 'none' },
  toastStyle: (t: string) => ({ position: 'fixed', bottom: '20px', right: '20px', left: '20px', padding: '15px', background: t === 'success' ? '#059669' : '#dc2626', color: 'white', borderRadius: '12px', zIndex: 2000, fontWeight: '800', textAlign: 'center' as const })
};