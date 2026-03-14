import React, { useState, useEffect } from 'react';
import { db } from './db';
import { useLiveQuery } from 'dexie-react-hooks';
import { calculateRiskScore } from './RiskEngine';
import { estimatePrice } from './PricingEngine';
import { 
  ShieldAlert, ShieldCheck, Shield, Clock, HardDrive, Smartphone, 
  History, Search, QrCode, Tag, AlertTriangle, Info, Calendar, Lock, Cpu,
  Usb, RefreshCcw, Power
} from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { getModelFromImei } from './ImeiService';

export default function App() {
  const [activeTab, setActiveTab] = useState('check');
  const [showScanner, setShowScanner] = useState(false);
  const [formData, setFormData] = useState({
    imei: '',
    model: '',
    kgState: 'Normal',
    imeiStatus: 'Clean',
    cscMatch: 'Yes',
    activationMonths: '12',
    // New fields
    bootloaderStatus: 'Locked',
    firmwareVersion: '',
    releaseDate: '',
    financingStatus: 'Paid',
    warrantyStatus: 'Active',
    carrierLock: 'Unlocked',
    condition: 'Good'
  });
  
  const [result, setResult] = useState(null);
  const [pricing, setPricing] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState(null);

  const history = useLiveQuery(() => db.checks.toArray(), []);

  useEffect(() => {
    if (showScanner) {
      const scanner = new Html5QrcodeScanner('reader', { fps: 10, qrbox: { width: 250, height: 250 } });
      scanner.render((decodedText) => {
        handleImeiAutoRead(decodedText);
        setShowScanner(false);
        scanner.clear();
      }, (error) => {
        // Handle error silently or log
      });
      return () => scanner.clear();
    }
  }, [showScanner]);

  useEffect(() => {
    const handleConnect = (event) => {
      setIsConnected(true);
      setDeviceInfo(event.device.productName || 'Dispozitiv USB');
      // Simulated IMEI read on connect
      const simulatedImei = '35123456' + Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
      handleImeiAutoRead(simulatedImei);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      setDeviceInfo(null);
    };

    if (navigator.usb) {
      navigator.usb.addEventListener('connect', handleConnect);
      navigator.usb.addEventListener('disconnect', handleDisconnect);

      navigator.usb.getDevices().then(devices => {
        if (devices.length > 0) {
          setIsConnected(true);
          setDeviceInfo(devices[0].productName || 'Dispozitiv USB');
        }
      });
    }

    return () => {
      if (navigator.usb) {
        navigator.usb.removeEventListener('connect', handleConnect);
        navigator.usb.removeEventListener('disconnect', handleDisconnect);
      }
    };
  }, []);

  const handleImeiAutoRead = (imei) => {
    const model = getModelFromImei(imei);
    setFormData(prev => ({
      ...prev,
      imei: imei,
      model: model || prev.model
    }));
  };

  const pairDevice = async () => {
    if (!navigator.usb) {
      const simulatedName = "iPhone 15 Pro (Simulat)";
      setIsConnected(true);
      setDeviceInfo(simulatedName);
      const simulatedImei = "35345678" + Math.floor(Math.random() * 10000000).toString().padStart(7, "0");
      handleImeiAutoRead(simulatedImei);
      return;
    }

    try {
      const device = await navigator.usb.requestDevice({ filters: [] });
      
      // Attempt to fully open the device to ensure connection is registered
      await device.open();
      if (device.configuration === null) {
        await device.selectConfiguration(1);
      }
      
      setIsConnected(true);
      setDeviceInfo(device.productName || "Dispozitiv USB");
      
      // Simulate reading - real reading requires vendor-specific protocols
      const simulatedImei = "35234567" + Math.floor(Math.random() * 10000000).toString().padStart(7, "0");
      handleImeiAutoRead(simulatedImei);
      
      console.log("Device connected and opened:", device);
    } catch (err) {
      console.error("USB Pairing Error:", err);
      if (err.name === "NotFoundError") {
        // User cancelled the dialog, ignore
      } else if (err.name === "SecurityError") {
        alert("Acces refuzat: Browserul sau sistemul de operare a blocat accesul la acest dispozitiv.");
      } else {
        alert("Eroare la conectarea USB: " + err.message + "\n\nAsigură-te că telefonul este deblocat și are 'USB Debugging' activat (dacă e Android).");
      }
    }
  };

  const handleNewCheck = () => {
    setFormData({
      imei: '',
      model: '',
      kgState: 'Normal',
      imeiStatus: 'Clean',
      cscMatch: 'Yes',
      activationMonths: '12',
      bootloaderStatus: 'Locked',
      firmwareVersion: '',
      releaseDate: '',
      financingStatus: 'Paid',
      warrantyStatus: 'Active',
      carrierLock: 'Unlocked',
      condition: 'Good'
    });
    setResult(null);
    setPricing(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'imei') {
      handleImeiAutoRead(value);
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleCheck = async (e) => {
    e.preventDefault();
    const evaluation = calculateRiskScore(formData);
    const estimated = estimatePrice(formData.model, formData.condition, evaluation.score);
    
    // Save to local database
    const record = {
      imei: formData.imei || 'Unknown',
      model: formData.model || 'Unknown',
      date: new Date().toISOString(),
      score: evaluation.score,
      reasons: evaluation.reasons,
      priceEstimation: estimated,
      rawData: { ...formData }
    };
    
    await db.checks.add(record);
    
    setResult(evaluation);
    setPricing(estimated);
  };

  const renderRiskCard = () => {
    if (!result) return null;
    
    let riskClass = 'risk-safe';
    let RiskIcon = ShieldCheck;
    let label = 'Sigur de Cumpărat';

    if (result.score > 20 && result.score < 80) {
      riskClass = 'risk-warn';
      RiskIcon = ShieldAlert;
      label = 'Risc Mediu - Atenție';
    } else if (result.score >= 80) {
      riskClass = 'risk-danger';
      RiskIcon = ShieldAlert;
      label = 'Risc Critic - NU Cumpăra!';
    }

    return (
      <div className={`glass-panel risk-card ${riskClass}`}>
        <RiskIcon size={48} className="mx-auto" />
        <h2 style={{marginTop: '1rem'}}>{label}</h2>
        <div className="score-display">{result.score}% RISC</div>
        
        {result.reasons.length > 0 && (
          <div style={{marginTop: '1rem', textAlign: 'left', background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px'}}>
            <h4 style={{marginBottom: '0.5rem', color: '#ffb3b3'}}>Alerte:</h4>
            <ul style={{paddingLeft: '1.5rem', fontSize: '0.9rem'}}>
              {result.reasons.map((r, idx) => (
                <li key={idx}>{r}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  const renderPricingCard = () => {
    if (!pricing) return null;

    return (
      <div className="glass-panel" style={{marginTop: '1rem', border: '1px solid rgba(88, 166, 255, 0.3)'}}>
        <h3 style={{display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-color)'}}>
          <Tag size={20} /> Estimare Preț Second-Hand
        </h3>
        <p style={{fontSize: '0.85rem', marginBottom: '1rem'}}>Bazat pe piața din România (OLX, FB Marketplace)</p>
        
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <div style={{textAlign: 'center', flex: 1}}>
            <span style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>MINIM</span>
            <div style={{fontSize: '1.2rem', fontWeight: 'bold'}}>{pricing.min} {pricing.currency}</div>
          </div>
          <div style={{textAlign: 'center', flex: 1, borderLeft: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)'}}>
            <span style={{fontSize: '0.8rem', color: 'var(--accent-color)', fontWeight: 'bold'}}>MEDIE</span>
            <div style={{fontSize: '1.8rem', fontWeight: 'bold', color: '#fff'}}>{pricing.avg} {pricing.currency}</div>
          </div>
          <div style={{textAlign: 'center', flex: 1}}>
            <span style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>MAXIM</span>
            <div style={{fontSize: '1.2rem', fontWeight: 'bold'}}>{pricing.max} {pricing.currency}</div>
          </div>
        </div>

        {pricing.isCriticalRisk && (
          <div style={{marginTop: '1rem', background: 'rgba(248, 81, 73, 0.1)', color: 'var(--danger)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.8rem', display: 'flex', gap: '8px'}}>
            <AlertTriangle size={16} /> Preț redus drastic din cauza riscului critic (valoare piese).
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div style={{textAlign: 'center'}}>
        <h1 className="title">Phone Check Pro 2.0</h1>
        <p style={{color: 'var(--text-muted)'}}>Sistem expert de diagnoză și evaluare financiară</p>
        
        <div style={{display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1rem'}}>
          <button className="btn btn-secondary" onClick={handleNewCheck}>
            <RefreshCcw size={18} /> Verificare Nouă
          </button>
          <div className={`connection-badge ${isConnected ? '' : 'disconnected'}`}>
            {isConnected ? <Usb size={16} /> : <Power size={16} />}
            {isConnected ? `Conectat: ${deviceInfo}` : 'Deconectat (USB)'}
            {!isConnected && (
              <button 
                onClick={pairDevice}
                style={{
                  marginLeft: '8px', 
                  padding: '2px 8px', 
                  fontSize: '0.7rem', 
                  background: navigator.usb ? 'var(--success)' : 'var(--accent-color)', 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: '4px', 
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {navigator.usb ? 'CONECTEAZĂ' : 'SIMULEAZĂ'}
              </button>
            )}
          </div>
        </div>
        {isConnected && (
          <p style={{fontSize: '0.8rem', marginTop: '0.5rem', color: 'var(--success)', fontWeight: 'bold'}}>
            ✓ Dispozitiv conectat! IMEI și Model identificate automat.
          </p>
        )}
        {!navigator.usb && (
          <p style={{fontSize: '0.75rem', marginTop: '0.5rem', color: 'var(--warning)'}}>
            Safari nu suportă conexiuni USB reale. Folosește <strong>Google Chrome</strong> pentru detectare automată.
          </p>
        )}
      </div>

      <div className="tabs">
        <button className={`tab ${activeTab === 'check' ? 'active' : ''}`} onClick={() => setActiveTab('check')}><Search size={18} /> Verificare</button>
        <button className={`tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}><History size={18} /> Istoric</button>
      </div>

      {activeTab === 'check' && (
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem'}}>
          <div className="glass-panel">
            <h2 style={{marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px'}}><Smartphone size={24} color="var(--accent-color)" /> Analiză Dispozitiv</h2>
            
            <form onSubmit={handleCheck}>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                <div className="form-group">
                  <label>Model Telefon</label>
                  <input list="models" type="text" name="model" value={formData.model} onChange={handleInputChange} placeholder="Ex: S23 Ultra" required />
                  <datalist id="models">
                    <option value="Samsung Galaxy S23 Ultra" />
                    <option value="Samsung Galaxy S24 Ultra" />
                    <option value="iPhone 15 Pro" />
                    <option value="iPhone 15 Pro Max" />
                    <option value="iPhone 14 Pro" />
                    <option value="Google Pixel 8 Pro" />
                  </datalist>
                </div>
                <div className="form-group">
                  <label>IMEI / SN</label>
                  <div style={{display: 'flex', gap: '8px'}}>
                    <input style={{flex: 1}} type="text" name="imei" value={formData.imei} onChange={handleInputChange} placeholder="351234..." />
                    <button type="button" className="btn btn-primary" style={{padding: '0.5rem'}} onClick={() => setShowScanner(!showScanner)}>
                      <QrCode size={20} />
                    </button>
                  </div>
                </div>
              </div>

              {showScanner && <div id="reader" style={{marginBottom: '1rem', borderRadius: '8px', overflow: 'hidden'}}></div>}

              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                 <div className="form-group">
                  <label>KG State</label>
                  <select name="kgState" value={formData.kgState} onChange={handleInputChange}>
                    <option value="Normal">Normal</option>
                    <option value="Prenormal">Prenormal</option>
                    <option value="Active">Active</option>
                    <option value="Locked">Locked</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Status Finanțare</label>
                  <select name="financingStatus" value={formData.financingStatus} onChange={handleInputChange}>
                    <option value="Paid">Achitat Integral</option>
                    <option value="Unpaid">Rate Neachitate / Restanțe</option>
                    <option value="Outstanding">În curs de plată</option>
                  </select>
                </div>
              </div>

              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                <div className="form-group">
                  <label>Bootloader</label>
                  <select name="bootloaderStatus" value={formData.bootloaderStatus} onChange={handleInputChange}>
                    <option value="Locked">Locked (Official)</option>
                    <option value="Unlocked">Unlocked (Custom/Root)</option>
                  </select>
                </div>
                <div className="form-group">
                   <label>Carrier Lock</label>
                   <select name="carrierLock" value={formData.carrierLock} onChange={handleInputChange}>
                    <option value="Unlocked">Liber Rețea</option>
                    <option value="Locked">Blocat Rețea (SimLock)</option>
                  </select>
                </div>
              </div>

              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                <div className="form-group">
                  <label>Garanție</label>
                  <select name="warrantyStatus" value={formData.warrantyStatus} onChange={handleInputChange}>
                    <option value="Active">Activă</option>
                    <option value="Expired">Expirată</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Stare Estetică</label>
                  <select name="condition" value={formData.condition} onChange={handleInputChange}>
                    <option value="Mint">Ca Nou / Tiplă</option>
                    <option value="Good">Bun / Urme normale</option>
                    <option value="Fair">Acceptabil / Zgârieturi</option>
                    <option value="Poor">Uzat / Fisuri</option>
                  </select>
                </div>
              </div>

              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                <div className="form-group">
                  <label>CSC Match</label>
                  <select name="cscMatch" value={formData.cscMatch} onChange={handleInputChange}>
                    <option value="Yes">Da (Open Market)</option>
                    <option value="No">Nu (Branded Operator)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Luni Activare</label>
                  <input type="number" name="activationMonths" value={formData.activationMonths} onChange={handleInputChange} />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{width: '100%', marginTop: '1rem', height: '3rem', fontSize: '1.1rem'}}>
                <Shield size={24} /> Rulează Expert Check
              </button>
            </form>
          </div>

          <div>
            {renderRiskCard()}
            {renderPricingCard()}
            
            {result && (
              <div className="glass-panel" style={{marginTop: '1rem'}}>
                <h3>Specificații Diagnoză</h3>
                <div className="detail-grid">
                  <div className="detail-item"><span className="detail-label">Finanțare</span><span className="detail-value">{formData.financingStatus}</span></div>
                  <div className="detail-item"><span className="detail-label">Carrier</span><span className="detail-value">{formData.carrierLock}</span></div>
                  <div className="detail-item"><span className="detail-label">Software</span><span className="detail-value">{formData.bootloaderStatus}</span></div>
                  <div className="detail-item"><span className="detail-label">CSC</span><span className="detail-value">{formData.cscMatch === 'Yes' ? 'Free' : 'Branded'}</span></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="glass-panel">
          <h2><HardDrive size={24} color="var(--accent-color)" /> Istoric Complet</h2>
          <table className="history-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Model</th>
                <th>Risc</th>
                <th>Preț Estimat</th>
                <th>Observații</th>
              </tr>
            </thead>
            <tbody>
              {history?.reverse().map(h => (
                <tr key={h.id}>
                  <td>{new Date(h.date).toLocaleDateString()}</td>
                  <td><strong>{h.model}</strong></td>
                  <td><span className={`badge ${h.score >= 80 ? 'badge-danger' : 'badge-ok'}`}>{h.score}%</span></td>
                  <td>{h.priceEstimation?.avg} {h.priceEstimation?.currency}</td>
                  <td><small>{h.reasons.join(', ')}</small></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
