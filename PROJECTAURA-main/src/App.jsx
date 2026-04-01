import React, { useState, useEffect } from 'react';
// import { supabase } from './supabaseClient';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './App.css';
import { jsPDF } from "jspdf"
import "jspdf-autotable";

function App() {
  const [currentStep, setCurrentStep] = useState(0);
  const [backendData, setBackendData] = useState(null);
  const [userData, setUserData] = useState({ 
    housing: 'Renter', 
    budget: 'Standard', 
    familyMembers: '', 
    language: 'English' 
  });
  const [history, setHistory] = useState([]);

useEffect(() => {
  const fetchHistory = async () => {
    const { data } = await supabase
      .from('usage_history')
      .select('*')
      .eq('user_id', userData.id)
      .order('created_at', { ascending: false })
      .limit(1); // Get the most recent previous entry
    setHistory(data);
  };
  if (currentStep === 5) fetchHistory();
}, [currentStep]);
  
  const [elecData, setElecData] = useState({
    connectionType: 'Single-Phase', evCharging: '',
    appliances: {
      fans: { label: 'Fans (Count)', val: '', year: '2020-Present' },
      ledLights: { label: 'LED Lights (Count)', val: '', year: '2020-Present' },
      nonLedLights: { label: 'Non-LED Lights (Count)', val: '', year: '2020-Present' },
      ac: { label: 'Air Conditioner (Hours/day)', val: '', year: '2020-Present' },
      fridge: { label: 'Refrigerator (Hours/day)', val: '', year: '2020-Present' },
      tv: { label: 'Television (Hours/day)', val: '', year: '2020-Present' },
      washingMachine: { label: 'Washing Machine (Hours/day)', val: '', year: '2020-Present' },
      waterHeater: { label: 'Water Heater (Hours/day)', val: '', year: '2020-Present' }
    }
  });

  const [vehicles, setVehicles] = useState([
    { id: Date.now(), vehicle: 'Select', fuelType: 'Select', km: '', mileage: '', fuel: '0.00' }
  ]);

  const [waterData, setWaterData] = useState({ waterLiters: '', source: '-- Select Source --' });

  const nextStep = () => setCurrentStep(prev => prev + 1);
  const prevStep = () => setCurrentStep(prev => prev - 1);
  const handleAnalyze = async () => {
  try {
    // 1. Calculate Total Fuel from vehicles
    const totalFuel = vehicles.reduce((sum, v) => sum + parseFloat(v.fuel || 0), 0);
    
    // 2. Calculate Total Electricity from Appliances grid
    const applianceUnits = Object.values(elecData.appliances).reduce((sum, app) => {
      // Logic: If it's a count (Fans), we estimate units. If it's hours, we calculate.
      const val = parseFloat(app.val) || 0;
      return sum + (app.label.includes('Count') ? val * 0.5 : val * 1.2); 
    }, 0);
    
    const finalElecUnits = applianceUnits + (parseFloat(elecData.evCharging) || 0);

    // 3. Get the oldest appliance year
    const applianceYears = Object.values(elecData.appliances).map(a => a.year);
    const oldestYear = applianceYears.includes('Pre-2010') ? 2005 : 
                       applianceYears.includes('2010-2019') ? 2015 : 2024;

    // 4. API Call to LOCALHOST
    const response = await axios.post('http://127.0.0.1:8000/analyze', {
      user_id: "2c1f2d20-dc85-41ba-9c95-b43fc694be59", 
      elec_units: finalElecUnits,
      water_liters: parseFloat(waterData.waterLiters || 0),
      fuel_liters: totalFuel,
      appliance_year: oldestYear,
      language: userData.language, 
      budget: userData.budget
    });

    if (response.data) {
      setBackendData(response.data); 
      setCurrentStep(4); // Show Dashboard
    }
  } catch (error) {
    console.error("Connection Error:", error);
    alert("Backend is not responding. Run 'python main.py' in your terminal!");
  }
};
  // --- THE LANDING PAGE ---
  const Step0Home = () => (
    <div className="hero-section">
      <h1 className="brand-title">AURA</h1>
      <p className="brand-tagline">Breaking the green divide: Inclusive energy decisions for every home.</p>

      <h2 className="hero-headline">Don't just track your carbon.<br/>Make smart decisions.</h2>
      <p className="hero-subtitle">
        Your Adaptive Usage & Resource Assistant, tailored exclusively to your budget, housing, and language.
      </p>
      
      <div className="feature-cards-container">
        <div className="feature-card float-1">
          <div className="icon-wrapper icon-fast">⚡</div>
          <div className="card-text">
            <h3>Fast & Effortless</h3>
            <p>Complete your assessment in under 3 minutes. No sign-ups, no hassle.</p>
          </div>
        </div>
        <div className="feature-card float-2">
          <div className="icon-wrapper icon-budget">💎</div>
          <div className="card-text">
            <h3>Budget-Aware Logic</h3>
            <p>AI-driven sustainability tips filtered specifically for what you can afford.</p>
          </div>
        </div>
        <div className="feature-card float-3">
          <div className="icon-wrapper icon-voice">🗣️</div>
          <div className="card-text">
            <h3>Multilingual Voice</h3>
            <p>Fully accessible. Listen to your action plan in Tamil, Hindi, or English.</p>
          </div>
        </div>
      </div>

      <button className="primary-btn hero-btn" onClick={nextStep}>
        Start My Assessment <span className="arrow">➔</span>
      </button>
    </div>
  );

  // --- CONTEXT PAGE ---
  const Step1Onboarding = () => (
    <div className="card">
      <h2>Let's Customize AURA for You</h2>
      <p style={{color: '#64748b', marginBottom: '30px', textAlign: 'center', fontSize: '1.05rem'}}>This helps us filter out expensive tips and calculate your per-person impact.</p>
      
      <label>Housing Type:</label>
      <select value={userData.housing} onChange={e => setUserData({...userData, housing: e.target.value})}>
        <option>Renter</option>
        <option>Homeowner</option>
      </select>

      <label>Budget Tier:</label>
      <select value={userData.budget} onChange={e => setUserData({...userData, budget: e.target.value})}>
        <option>Economy</option>
        <option>Standard</option>
        <option>Premium</option>
      </select>

      <label>Number of Family Members:</label>
      <input 
        type="number" 
        placeholder="e.g., 4" 
        value={userData.familyMembers} 
        onChange={e => setUserData({...userData, familyMembers: e.target.value})} 
      />

      <label>Preferred Voice Language:</label>
      <select value={userData.language} onChange={e => setUserData({...userData, language: e.target.value})}>
        <option>English</option>
        <option>Tamil</option>
        <option>Hindi</option>
      </select>
      
      <div className="button-group">
        <button className="secondary-btn" onClick={prevStep}>Back</button>
        <button className="primary-btn" onClick={nextStep}>Next: Electricity</button>
      </div>
    </div>
  );

  // --- ELECTRICITY PAGE ---
  const Step2Electricity = () => {
    const updateAppliance = (key, field, value) => {
      setElecData({
        ...elecData,
        appliances: {
          ...elecData.appliances,
          [key]: { ...elecData.appliances[key], [field]: value }
        }
      });
    };

    return (
      <div className="card" style={{ maxWidth: '100%' }}>
        <h2>Electricity Usage</h2>
        
        <div className="appliance-box" style={{ marginBottom: '25px' }}>
          <label>Connection Type</label>
          <select value={elecData.connectionType} onChange={e => setElecData({...elecData, connectionType: e.target.value})}>
            <option>Single-Phase</option>
            <option>Three-Phase</option>
          </select>
        </div>

        <div className="elec-grid">
          {Object.entries(elecData.appliances).map(([key, data]) => (
            <div key={key} className="appliance-box">
              <label>{data.label}</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="number" 
                  placeholder={data.label.includes('Count') ? 'Count' : 'Hours'} 
                  value={data.val} 
                  onChange={e => updateAppliance(key, 'val', e.target.value)} 
                />
                <select value={data.year} onChange={e => updateAppliance(key, 'year', e.target.value)}>
                  <option>Pre-2010</option>
                  <option>2010-2019</option>
                  <option>2020-Present</option>
                </select>
              </div>
            </div>
          ))}
          <div className="appliance-box">
            <label>EV Charging (kWh/day)</label>
            <input type="number" placeholder="e.g., 10" value={elecData.evCharging} onChange={e => setElecData({...elecData, evCharging: e.target.value})} />
          </div>
        </div>

        <div className="button-group">
          <button className="secondary-btn" onClick={prevStep}>Back</button>
          <button className="primary-btn" onClick={nextStep}>Next: Fuel & Water</button>
        </div>
      </div>
    );
  };

  // --- FUEL & WATER PAGE ---
  const Step3Resources = () => {
    const addVehicleRow = () => setVehicles([...vehicles, { id: Date.now(), vehicle: 'Select', fuelType: 'Select', km: '', mileage: '', fuel: '0.00' }]);
    const removeVehicleRow = (id) => setVehicles(vehicles.filter(v => v.id !== id));
    
    const handleVehicleChange = (id, field, value) => {
      setVehicles(vehicles.map(v => {
        if (v.id === id) {
          const updatedV = { ...v, [field]: value };
          const kmVal = parseFloat(updatedV.km);
          const milVal = parseFloat(updatedV.mileage);
          updatedV.fuel = (kmVal > 0 && milVal > 0) ? (kmVal / milVal).toFixed(2) : '0.00';
          return updatedV;
        }
        return v;
      }));
    };

    const totalFuel = vehicles.reduce((sum, v) => sum + parseFloat(v.fuel || 0), 0).toFixed(2);

    return (
      <div className="card" style={{ maxWidth: '100%' }}>
        <h2>Fuel & Water Consumption</h2>
        <div className="fuel-table-container">
          <h3 style={{marginTop: 0, color: '#1e293b'}}>Fuel Consumption (Auto-Calculated)</h3>
          <div className="table-header">
            <div>Vehicle</div><div>Fuel Type</div><div>KM / day</div><div>Mileage</div><div>Fuel (L)</div><div>Action</div>
          </div>
          {vehicles.map((v) => (
            <div key={v.id} className="table-row">
              <select value={v.vehicle} onChange={(e) => handleVehicleChange(v.id, 'vehicle', e.target.value)}>
                <option>Select</option><option>Car</option><option>Bike</option>
              </select>
              <select value={v.fuelType} onChange={(e) => handleVehicleChange(v.id, 'fuelType', e.target.value)}>
                <option>Select</option><option>Petrol</option><option>Diesel</option><option>EV</option>
              </select>
              <input type="number" placeholder="KM/day" value={v.km} onChange={(e) => handleVehicleChange(v.id, 'km', e.target.value)} />
              <input type="number" placeholder="Mileage" value={v.mileage} onChange={(e) => handleVehicleChange(v.id, 'mileage', e.target.value)} />
              <div className="calculated-fuel">{v.fuel} L</div>
              <button className="remove-btn" onClick={() => removeVehicleRow(v.id)}>Remove</button>
            </div>
          ))}
          <div className="table-footer">
            <button className="add-btn" onClick={addVehicleRow}>+ Add Vehicle</button>
            <div className="total-fuel">Total Daily Fuel: <span>{totalFuel} L</span></div>
          </div>
        </div>

        <hr style={{ margin: '40px 0', borderTop: '2px dashed #e2e8f0' }} />

        <h3 style={{color: '#1e293b'}}>Water Usage</h3>
        <div className="elec-grid">
          <div className="appliance-box">
            <label>Daily Water Consumption (Liters/day):</label>
            <input type="number" placeholder="e.g., 500" value={waterData.waterLiters} onChange={e => setWaterData({...waterData, waterLiters: e.target.value})} />
          </div>
          <div className="appliance-box">
            <label>Water Source:</label>
            <select value={waterData.source} onChange={e => setWaterData({...waterData, source: e.target.value})}>
              <option>-- Select Source --</option>
              <option>Municipal Supply</option>
              <option>Borewell</option>
              <option>Private Supply</option>
            </select>
          </div>
        </div>

        <div className="button-group">
          <button className="secondary-btn" onClick={prevStep}>Back</button>
          <button className="primary-btn" onClick={handleAnalyze}>Analyze Data</button>
        </div>
      </div>
    );
  };

const Step4Dashboard = ({ backendData, userData, prevStep, nextStep }) => {
  const treesNeeded = Math.ceil((backendData?.carbon_footprint || 0) / 21);
  
  // AUDIO LOGIC ONLY
const playAudio = () => {
  if (backendData?.voice_url) {
    const audio = new Audio(backendData.voice_url);
    audio.play().catch(e => console.error("Playback failed:", e));
  } else {
    alert("Audio not ready yet!");
  }
};

  return (
    <div className="card">
      {/* SLAB WARNING */}
      {backendData?.warning && (
        <div className="warning-banner" style={{
          backgroundColor: '#fef2f2', border: '2px solid #ef4444', color: '#b91c1c',
          padding: '1rem', borderRadius: '8px', marginBottom: '1rem', fontWeight: 'bold'
        }}>
          ⚠️ {backendData.warning}
        </div>
      )}

      <h2 style={{ marginBottom: '20px' }}>Sustainability Dashboard</h2>
      
      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
        {/* COST CARD */}
        <div className="dash-card cost" style={{ padding: '15px', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
          <h3 style={{ fontSize: '0.9rem', color: '#64748b' }}>Estimated Bill</h3>
          <div className="big-text" style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>₹ {backendData?.bill_est || 0}</div>
        </div>

        {/* CARBON CARD */}
        <div className="dash-card carbon-meter" style={{ padding: '15px', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
          <h3 style={{ fontSize: '0.9rem', color: '#64748b' }}>Carbon Footprint</h3>
          <div className="big-text" style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#ef4444' }}>{backendData?.carbon_footprint || 0} kg</div>
        </div>

        {/* TREE GOAL */}
        <div className="dash-card tree-offset" style={{ 
          gridColumn: 'span 2', background: '#f0fdf4', border: '1px solid #bbf7d0', 
          padding: '20px', borderRadius: '12px', textAlign: 'center' 
        }}>
          <div style={{ fontSize: '2.5rem' }}>🌳</div>
          <h3 style={{ color: '#166534', margin: '5px 0' }}>Reforestation Goal</h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#15803d' }}>
            {treesNeeded} Trees
          </div>
          <p style={{ fontSize: '0.8rem', color: '#166534' }}>Monthly goal to offset your usage</p>
        </div>
      </div>

      {/* ADVICE SECTION */}
      <div className="dash-card advice" style={{ marginTop: '15px', padding: '15px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <h3 style={{ fontSize: '0.9rem', color: '#64748b', margin: '0 0 5px 0' }}>AI Engineering Advice</h3>
        <p style={{ fontSize: '0.95rem', margin: 0, fontStyle: 'italic' }}>{backendData?.advice}</p>
      </div>

      {/* MULTILINGUAL AUDIO BUTTON */}
      <div style={{ marginTop: '20px' }}>
        <button 
          className="audio-btn" 
          onClick={playAudio}
          style={{ 
            width: '100%', 
            padding: '15px', 
            background: '#4f46e5', 
            color: 'white', 
            borderRadius: '8px', 
            border: 'none', 
            cursor: 'pointer', 
            fontWeight: 'bold',
            fontSize: '1rem' 
          }}
        >
          🔊 Hear Summary in {userData.language}
        </button>
      </div>

      {/* NAVIGATION */}
      <div className="button-group" style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
        <button className="secondary-btn" onClick={prevStep} style={{ flex: 1 }}>Back</button>
        <button className="primary-btn" onClick={nextStep} style={{ flex: 1 }}>View Growth Rate</button>
      </div>
    </div>
  );
};
const Step5Progress = ({ backendData, prevStep, setCurrentStep }) => {
  // 1. DATA LOGIC
  const currentTrees = Math.ceil((backendData?.carbon_footprint || 0) / 21);
  const stateAverageTrees = 20; // Average TN household offset
  
  // UPDATED: Added Sat and Sun to the array
  const chartData = [
    { day: 'Mon', userTrees: currentTrees + 2, avg: stateAverageTrees },
    { day: 'Tue', userTrees: currentTrees + 1, avg: stateAverageTrees },
    { day: 'Wed', userTrees: currentTrees + 3, avg: stateAverageTrees },
    { day: 'Thu', userTrees: currentTrees, avg: stateAverageTrees },
    { day: 'Fri', userTrees: currentTrees - 1, avg: stateAverageTrees },
    { day: 'Sat', userTrees: currentTrees, avg: stateAverageTrees }, // Added Sat
    { day: 'Sun', userTrees: currentTrees + 1, avg: stateAverageTrees }, // Added Sun
  ];

  const savings = stateAverageTrees - currentTrees;

  return (
    <div className="card">
      <h2 style={{ marginBottom: '10px' }}>Sustainability Progress</h2>
      <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '20px' }}>
        How your carbon offset (in trees) compares to the Tamil Nadu average across the week.
      </p>

      {/* COMPARISON BAR */}
      <div style={{ 
        background: savings > 0 ? '#ecfdf5' : '#fff7ed', 
        padding: '15px', 
        borderRadius: '12px', 
        marginBottom: '20px',
        border: savings > 0 ? '1px solid #10b981' : '1px solid #f59e0b'
      }}>
        <h3 style={{ margin: 0, fontSize: '1rem', color: savings > 0 ? '#065f46' : '#9a3412' }}>
          {savings > 0 
            ? `🎉 You are saving ${savings} trees compared to the average home!` 
            : `⚠️ You need ${Math.abs(savings)} more trees than the average home.`}
        </h3>
      </div>

      {/* THE CHART */}
      <div style={{ height: '300px', width: '100%', marginBottom: '30px' }}>
        <ResponsiveContainer>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            {/* XAxis will now automatically show Sat and Sun because they are in the data */}
            <XAxis dataKey="day" axisLine={false} tickLine={false} />
            <YAxis axisLine={false} tickLine={false} label={{ value: 'Trees', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Legend verticalAlign="top" height={36}/>
            
            <Line 
              type="monotone" 
              dataKey="userTrees" 
              name="Your Required Trees" 
              stroke="#10b981" 
              strokeWidth={4} 
              dot={{ r: 6, fill: '#10b981' }} 
            />
            
            <Line 
              type="step" 
              dataKey="avg" 
              name="TN State Average" 
              stroke="#94a3b8" 
              strokeDasharray="5 5" 
              strokeWidth={2} 
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="button-group">
        <button className="secondary-btn" onClick={prevStep}>Back to Dashboard</button>
        <button className="primary-btn" onClick={() => setCurrentStep(0)} style={{ background: '#4f46e5' }}>
          Restart Audit
        </button>
      </div>
    </div>
  );
};

  // --- MAIN RENDERER ---
  return (
    <div className="app-container">
      {currentStep > 0 && (
        <header>
          <h1 style={{fontSize: '2rem', margin: '0 0 5px 0', color: '#065f46'}}>AURA</h1>
          <p>Adaptive Usage & Resource Assistant</p>
          <div className="progress-bar-container">
              <div className="progress-bar" style={{ width: `${(currentStep / 5) * 100}%` }}></div>
          </div>
        </header>
      )}

      <main>
        {currentStep === 0 && <Step0Home />}
        {currentStep === 1 && <Step1Onboarding />}
        {currentStep === 2 && <Step2Electricity />}
        {currentStep === 3 && <Step3Resources />}
        {currentStep === 4 && backendData ? (
  <Step4Dashboard 
    backendData={backendData} 
    userData={userData} 
    prevStep={prevStep} 
    nextStep={nextStep} 
  />
) : currentStep === 4 && (
  <div className="card">Loading your Sustainability Audit...</div>
)}
        {currentStep === 5 && (
  <Step5Progress 
    backendData={backendData} 
    prevStep={prevStep} 
    setCurrentStep={setCurrentStep} 
  />
)}
      </main>
    </div>
  );
}

export default App;