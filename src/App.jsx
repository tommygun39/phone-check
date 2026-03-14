import React, { useState, useEffect } from 'react';
import { db } from './db';
import { useLiveQuery } from 'dexie-react-hooks';
import { calculateRiskScore } from './RiskEngine';
import { estimatePrice } from './PricingEngine';
import { 
  ShieldAlert, ShieldCheck, Shield, Clock, HardDrive, Smartphone, 
  History, Search, QrCode, Tag, AlertTriangle, Info, Calendar, Lock, Cpu,
  Usb, RefreshCcw, Power, Settings, Cloud, Key
} from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { getModelFromImei, getDeviceHint, getModelFromProductName } from './ImeiService';
import { performCloudCheck } from './ExternalApiService';
import { useCallback, useRef } from 'react';

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
  const [logs, setLogs] = useState([]);
  const [imeiHint, setImeiHint] = useState('');
  const [detectedFields, setDetectedFields] = useState({ imei: false, model: false });
  const [apiConfig, setApiConfig] = useState(() => {
    const saved = localStorage.getItem('phoneCheckApiConfig');
    return saved ? JSON.parse(saved) : { key: 'DEMO_MODE', provider: 'IMEI_INFO' };
  });
  const [cloudCheckLoading, setCloudCheckLoading] = useState(false);
  const [cloudResult, setCloudResult] = useState(null);
  const autoCheckTriggered = useRef(false);

  useEffect(() => {
    localStorage.setItem('phoneCheckApiConfig', JSON.stringify(apiConfig));
  }, [apiConfig]);

  const addLog = useCallback((msg) => {
    setLogs(prev => [msg, ...prev].slice(0, 5));
    console.log(`[App Log] ${msg}`);
  }, []);

  const history = useLiveQuery(() => db.checks.toArray(), []);

  const handleCheck = useCallback(async (e) => {
    if (e) e.preventDefault();
    
    // Minimal validation to avoid checking empty forms
    if (!formData.imei && !formData.model) {
      addLog("Atenție: Formularul este gol.");
      return;
    }

    addLog(`Rulăm Expert Check pentru ${formData.model || 'Dispozitiv'}...`);
    const evaluation = calculateRiskScore(formData, cloudResult);
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
    addLog("Verificare finalizată cu succes.");
  }, [formData, addLog]);

  const handleImeiAutoRead = useCallback((id, autoTrigger = false) => {
    if (!id) return;
    addLog(`Analiză date hardware: ${id}...`);
    
    // Try to get model from ID (if it's a real IMEI) or keep current
    const modelFromImei = getModelFromImei(id);
    
    setImeiHint(getDeviceHint(id));
    
    setFormData(prev => ({
      ...prev,
      imei: id,
      model: modelFromImei || prev.model
    }));
    
    if (modelFromImei) {
      addLog(`Model identificat (IMEI): ${modelFromImei}`);
    }

    if (autoTrigger) {
      addLog("Declanșăm Verificarea Automată...");
      setTimeout(() => handleCheck(), 500);
    }
  }, [addLog, handleCheck]);

  useEffect(() => {
    if (showScanner) {
      const scanner = new Html5QrcodeScanner('reader', { fps: 10, qrbox: { width: 250, height: 250 } });
      scanner.render((decodedText) => {
        handleImeiAutoRead(decodedText, true); // Auto check after scan
        setShowScanner(false);
        scanner.clear();
      }, (error) => {});
      return () => scanner.clear();
    }
  }, [showScanner, handleImeiAutoRead]);

  useEffect(() => {
    let activeDevice = null;

    const handleConnect = async (event) => {
      const productName = event.device.productName || 'USB';
      addLog(`Dispozitiv nou detectat: ${productName}`);
      setIsConnected(true);
      setDeviceInfo(productName);
      
      try {
        const device = event.device;
        activeDevice = device;
        if (!device.opened) await device.open();
        addLog("Comunicare USB deschisă.");
        
        // UNIFIED STATE UPDATE - No race conditions
        const realSerial = device.serialNumber || 'SN-UNKNOWN';
        const identifiedModel = getModelFromProductName(productName);
        
        setFormData(prev => ({
          ...prev,
          imei: realSerial,
          model: identifiedModel || prev.model
        }));

        setDetectedFields({
          imei: true,
          model: !!identifiedModel
        });

        setImeiHint(getDeviceHint(realSerial));
        
        if (identifiedModel) addLog(`Model recunoscut: ${identifiedModel}`);
        addLog(`ID Hardware citit: ${realSerial}`);
        
        // Trigger auto check with a slight delay
        setTimeout(() => handleCheck(), 800);
      } catch (err) {
        addLog(`Atenție: Nu s-a putut deschide hardware-ul (${err.message})`);
      }
    };

    const handleDisconnect = () => {
      addLog("Dispozitiv deconectat.");
      setIsConnected(false);
      setDeviceInfo(null);
      activeDevice = null;
    };

    if (navigator.usb) {
      navigator.usb.addEventListener('connect', handleConnect);
      navigator.usb.addEventListener('disconnect', handleDisconnect);

      navigator.usb.getDevices().then(devices => {
        if (devices.length > 0) {
          const device = devices[0];
          setIsConnected(true);
          setDeviceInfo(device.productName || 'Dispozitiv USB');
          addLog("Dispozitiv deja conectat găsit.");
        }
      });
    }

    return () => {
      if (navigator.usb) {
        navigator.usb.removeEventListener('connect', handleConnect);
        navigator.usb.removeEventListener('disconnect', handleDisconnect);
      }
      if (activeDevice && activeDevice.opened) {
        activeDevice.close().catch(() => {});
      }
    };
  }, [handleImeiAutoRead, addLog]);

  const pairDevice = async () => {
    if (!navigator.usb) {
      const simulatedName = "Samsung Galaxy S22";
      const simulatedSN = "R5CR50XABCD";
      setIsConnected(true);
      setDeviceInfo(simulatedName);
      setFormData(prev => ({ ...prev, model: simulatedName, imei: simulatedSN }));
      setDetectedFields({ imei: true, model: true });
      setImeiHint(getDeviceHint(simulatedSN));
      setTimeout(() => handleCheck(), 800);
      return;
    }

    try {
      addLog("Cerere acces USB trimisă...");
      const device = await navigator.usb.requestDevice({ filters: [] });
      const productName = device.productName || "Dispozitiv USB";
      addLog(`Acces permis pentru: ${productName}`);
      
      await device.open();
      if (device.configuration === null) {
        await device.selectConfiguration(1);
      }
      
      setIsConnected(true);
      setDeviceInfo(productName);
      
      const realSerial = device.serialNumber || 'SN-UNKNOWN';
      const identifiedModel = getModelFromProductName(productName);

      setFormData(prev => ({
        ...prev,
        imei: realSerial,
        model: identifiedModel || prev.model
      }));

      setDetectedFields({
        imei: true,
        model: !!identifiedModel
      });

      setImeiHint(getDeviceHint(realSerial));
      addLog("Date hardware citite.");
      setTimeout(() => handleCheck(), 800);
    } catch (err) {
      addLog(`Eroare: ${err.message}`);
      // Keep errors internal for UI logs but alert user of critical ones
      if (err.name !== "NotFoundError") {
        alert("Eroare USB: " + err.message);
      }
    }
  };

  const handleNewCheck = () => {
    setFormData({
      imei: '',
      model: '',
      kgState: '',
      imeiStatus: '',
      cscMatch: '',
      activationMonths: '',
      bootloaderStatus: '',
      firmwareVersion: '',
      releaseDate: '',
      financingStatus: '',
      warrantyStatus: '',
      carrierLock: '',
      condition: ''
    });
    setPricing(null);
    setImeiHint('');
    setCloudResult(null);
    setDetectedFields({ imei: false, model: false });
    addLog("Formular resetat.");
  };

  const handleCloudCheck = async () => {
    if (!formData.imei) {
      alert("Introduceți un IMEI/SN pentru verificarea în cloud.");
      return;
    }
    
    setCloudCheckLoading(true);
    addLog(`Interogare Cloud (Baze de date GSMA/KG)...`);
    
    try {
      const result = await performCloudCheck(formData.imei, apiConfig.key, apiConfig.provider);
      setCloudResult(result);
      addLog(`Răspuns Cloud primit (${result.blacklistStatus})`);
      // Re-trigger calculation with cloud data
      setTimeout(() => handleCheck(), 100);
    } catch (err) {
      addLog(`Eroare Cloud: ${err.message}`);
      alert("Eroare la verificarea externă: " + err.message);
    } finally {
      setCloudCheckLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'imei') {
      handleImeiAutoRead(value);
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
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
            ✓ Dispozitiv conectat! Date identificate.
          </p>
        )}
        
        {logs.length > 0 && (
          <div style={{marginTop: '1rem', background: 'rgba(0,0,0,0.5)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.75rem', color: '#aaa', fontFamily: 'monospace', maxWidth: '400px', margin: '1rem auto'}}>
            {logs.map((log, i) => <div key={i}>{log}</div>)}
          </div>
        )}

        {!navigator.usb && (
          <p style={{fontSize: '0.75rem', marginTop: '0.5rem', color: 'var(--warning)'}}>
            Safari nu suportă conexiuni USB reale. Folosește <strong>Google Chrome</strong>.
          </p>
        )}
      </div>

      <div className="tabs">
        <button className={`tab ${activeTab === 'check' ? 'active' : ''}`} onClick={() => setActiveTab('check')}><Search size={18} /> Verificare</button>
        <button className={`tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}><History size={18} /> Istoric</button>
        <button className={`tab ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}><Settings size={18} /> Setări</button>
      </div>

      {activeTab === 'check' && (
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem'}}>
          <div className="glass-panel">
            <h2 style={{marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px'}}><Smartphone size={24} color="var(--accent-color)" /> Analiză Dispozitiv</h2>
            
            <form onSubmit={handleCheck}>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                <div className="form-group">
                  <label style={{display: 'flex', justifyContent: 'space-between'}}>
                    Model Telefon
                    {detectedFields.model && <span style={{fontSize: '0.65rem', color: 'var(--success)', fontWeight: 'bold'}}>⚡ DETECTAT</span>}
                  </label>
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
                  <label style={{display: 'flex', justifyContent: 'space-between'}}>
                    IMEI / SN
                    {detectedFields.imei && <span style={{fontSize: '0.65rem', color: 'var(--success)', fontWeight: 'bold'}}>⚡ DETECTAT</span>}
                  </label>
                  <div style={{display: 'flex', gap: '8px', flexDirection: 'column'}}>
                    <div style={{display: 'flex', gap: '8px'}}>
                        <input style={{flex: 1}} type="text" name="imei" value={formData.imei} onChange={handleInputChange} placeholder="351234..." />
                        <button type="button" className="btn btn-primary" style={{padding: '0.5rem'}} onClick={() => setShowScanner(!showScanner)}>
                            <QrCode size={20} />
                        </button>
                    </div>
                    {(imeiHint || isConnected) && (
                      <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px'}}>
                        {imeiHint && <span style={{fontSize: '0.75rem', color: 'var(--accent-color)'}}>{imeiHint}</span>}
                        {isConnected && <span style={{fontSize: '0.65rem', background: 'rgba(88, 166, 255, 0.2)', color: 'var(--accent-color)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold'}}>DATE REALE (S/N)</span>}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {showScanner && <div id="reader" style={{marginBottom: '1rem', borderRadius: '8px', overflow: 'hidden'}}></div>}

              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                 <div className="form-group">
                  <label>KG State</label>
                  <select name="kgState" value={formData.kgState} onChange={handleInputChange}>
                    <option value="">Selectează...</option>
                    <option value="Normal">Normal</option>
                    <option value="Prenormal">Prenormal</option>
                    <option value="Active">Active</option>
                    <option value="Locked">Locked</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Status Finanțare</label>
                  <select name="financingStatus" value={formData.financingStatus} onChange={handleInputChange}>
                    <option value="">Selectează...</option>
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
                    <option value="">Selectează...</option>
                    <option value="Locked">Locked (Official)</option>
                    <option value="Unlocked">Unlocked (Custom/Root)</option>
                  </select>
                </div>
                <div className="form-group">
                   <label>Carrier Lock</label>
                   <select name="carrierLock" value={formData.carrierLock} onChange={handleInputChange}>
                    <option value="">Selectează...</option>
                    <option value="Unlocked">Liber Rețea</option>
                    <option value="Locked">Blocat Rețea (SimLock)</option>
                  </select>
                </div>
              </div>

              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                <div className="form-group">
                  <label>Garanție</label>
                  <select name="warrantyStatus" value={formData.warrantyStatus} onChange={handleInputChange}>
                    <option value="">Selectează...</option>
                    <option value="Active">Activă</option>
                    <option value="Expired">Expirată</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Stare Estetică</label>
                  <select name="condition" value={formData.condition} onChange={handleInputChange}>
                    <option value="">Selectează...</option>
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
                    <option value="">Selectează...</option>
                    <option value="Yes">Da (Open Market)</option>
                    <option value="No">Nu (Branded Operator)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Luni Activare</label>
                  <input type="number" name="activationMonths" value={formData.activationMonths} onChange={handleInputChange} />
                </div>
              </div>

              <div style={{display: 'flex', gap: '1rem', marginTop: '1rem'}}>
                <button type="submit" className="btn btn-primary" style={{flex: 1, height: '3rem', fontSize: '1.1rem'}}>
                  <Shield size={24} /> Rulează Expert Check
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{flex: 1, height: '3rem', fontSize: '1.1rem', borderColor: 'var(--accent-color)'}}
                  onClick={handleCloudCheck}
                  disabled={cloudCheckLoading}
                >
                  {cloudCheckLoading ? <RefreshCcw className="animate-spin" size={24} /> : <Cloud size={24} color="var(--accent-color)" />}
                  {cloudCheckLoading ? 'Verificare...' : 'Verifică în Cloud'}
                </button>
              </div>
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

      {activeTab === 'settings' && (
        <div className="glass-panel" style={{maxWidth: '600px', margin: '0 auto'}}>
          <h2 style={{marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px'}}>
            <Settings size={24} color="var(--accent-color)" /> Configurări API Terți
          </h2>
          
          <div className="form-group" style={{marginBottom: '1.5rem'}}>
            <label style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
              <Key size={18} /> API Key (IMEI.info / IMEICheck)
            </label>
            <input 
              type="password" 
              value={apiConfig.key} 
              onChange={(e) => setApiConfig({...apiConfig, key: e.target.value})}
              placeholder="Introdu cheia ta API..."
            />
            <p style={{fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem'}}>
              Cheia este salvată doar local în browserul tău. Folosește "DEMO_MODE" pentru a simula verificări.
            </p>
          </div>

          <div className="form-group" style={{marginBottom: '1.5rem'}}>
            <label>Furnizor Servicii</label>
            <select value={apiConfig.provider} onChange={(e) => setApiConfig({...apiConfig, provider: e.target.value})}>
              <option value="IMEI_INFO">IMEI.info (GSMA + Korea Database)</option>
              <option value="IMEICHECK">IMEICheck.com (Apple Specialist)</option>
            </select>
          </div>

          <div style={{background: 'rgba(255, 255, 255, 0.05)', padding: '1rem', borderRadius: '8px', fontSize: '0.85rem'}}>
            <h4 style={{marginBottom: '0.5rem'}}>Abonament Activ?</h4>
            <p color="#aaa">Pentru a funcționa, asigură-te că ai credite valabile pe platforma aleasă. Această aplicație doar integrează datele lor în procesul tău de diagnoză.</p>
          </div>
        </div>
      )}
    </>
  );
}
