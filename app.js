/**
 * BioGuard 74 - Virus Quarantine & Treatment Facility Management
 * Core Application Logic, State Machine, and Analytics
 */

// Global App State
const APP_STORAGE_KEY = 'bioguard_74_quarantine_data_v1';

const DEFAULT_STATE = {
  currentRole: 'nurse', // 'nurse' | 'doctor' | 'admin' | 'director' | 'unified'
  temperatureUnit: 'C', // 'C' | 'F'
  currentDayNumber: 8, // Facility Day Counter
  facilityCapacity: 74,
  
  // Historical Benchmark Metrics (Pre-seeded with realistic baseline cases)
  stats: {
    benchmarkMortalityRate: 15.0, // 15% Expected benchmark
    benchmarkSuccessRate: 85.0,   // 85% Expected cure rate
    totalHistoricalAdmissions: 174,
    totalHistoricalDischarged: 85,
    totalHistoricalDeceased: 15
  },

  // 74 Current Active Patients occupying Rooms 1 to 74
  patients: []
};

// Seed realistic sample patient names
const FIRST_NAMES = ["Liam", "Olivia", "Noah", "Emma", "Oliver", "Ava", "Elijah", "Charlotte", "William", "Sophia", "James", "Amelia", "Benjamin", "Isabella", "Lucas", "Mia", "Henry", "Evelyn", "Alexander", "Harper", "Daniel", "Grace", "Matthew", "Chloe", "Samuel", "Ella", "David", "Victoria", "Joseph", "Penelope"];
const LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson"];

function generateInitialPatients() {
  const patients = [];
  
  for (let room = 1; room <= 74; room++) {
    const fn = FIRST_NAMES[(room * 3 + 7) % FIRST_NAMES.length];
    const ln = LAST_NAMES[(room * 5 + 11) % LAST_NAMES.length];
    const age = 22 + ((room * 7) % 58);
    const admissionDaysAgo = 3 + (room % 9);
    
    // Distribute realistic clinical stages across the 74 beds:
    // Bed 1-6: Cured (3 days fever-free), Doctor discharge approved (waiting for Admin discharge)
    // Bed 7-14: Cured (3 days fever-free), Ready for doctor visit/review
    // Bed 15-32: Temp taken today, 1-2 days streak, awaiting doctor round
    // Bed 33-46: Active fever recorded today (>= 38.0 C), streak reset to 0
    // Bed 47-74: Morning vitals not taken yet today (Nurse worklist)
    
    let streak = 0;
    let todayTemp = null;
    let todayTempLogged = false;
    let todayDoctorVisited = false;
    let status = 'AWAITING_TEMP';
    let tempHistory = [];
    
    if (room <= 6) {
      // 3 full days fever-free!
      streak = 3;
      todayTemp = 36.6;
      todayTempLogged = true;
      todayDoctorVisited = true;
      status = 'DISCHARGE_RECOMMENDED';
      tempHistory = [
        { day: 'Day 5', tempC: 38.4, status: 'fever' },
        { day: 'Day 6', tempC: 36.8, status: 'normal' },
        { day: 'Day 7', tempC: 36.7, status: 'normal' },
        { day: 'Day 8 (Today)', tempC: 36.6, status: 'normal' }
      ];
    } else if (room <= 14) {
      // 3 days fever-free, but doctor hasn't reviewed yet today
      streak = 3;
      todayTemp = 36.8;
      todayTempLogged = true;
      todayDoctorVisited = false;
      status = 'READY_FOR_DOCTOR';
      tempHistory = [
        { day: 'Day 5', tempC: 38.6, status: 'fever' },
        { day: 'Day 6', tempC: 37.1, status: 'normal' },
        { day: 'Day 7', tempC: 36.9, status: 'normal' },
        { day: 'Day 8 (Today)', tempC: 36.8, status: 'normal' }
      ];
    } else if (room <= 32) {
      // 1 or 2 days streak, temp taken today, ready for doctor
      streak = (room % 2 === 0) ? 2 : 1;
      todayTemp = parseFloat((36.9 + ((room % 5) * 0.1)).toFixed(1));
      todayTempLogged = true;
      todayDoctorVisited = false;
      status = 'READY_FOR_DOCTOR';
      tempHistory = [
        { day: 'Day 6', tempC: 38.5, status: 'fever' },
        { day: 'Day 7', tempC: 37.2, status: 'normal' },
        { day: 'Day 8 (Today)', tempC: todayTemp, status: 'normal' }
      ];
    } else if (room <= 46) {
      // Active Fever recorded today!
      streak = 0;
      todayTemp = parseFloat((38.5 + ((room % 6) * 0.2)).toFixed(1));
      todayTempLogged = true;
      todayDoctorVisited = false;
      status = 'READY_FOR_DOCTOR';
      tempHistory = [
        { day: 'Day 6', tempC: 37.8, status: 'low-grade' },
        { day: 'Day 7', tempC: 38.2, status: 'fever' },
        { day: 'Day 8 (Today)', tempC: todayTemp, status: 'fever' }
      ];
    } else {
      // Morning temp pending (Awaiting Nurse)
      streak = room % 3;
      todayTemp = null;
      todayTempLogged = false;
      todayDoctorVisited = false;
      status = 'AWAITING_TEMP';
      tempHistory = [
        { day: 'Day 6', tempC: 38.2, status: 'fever' },
        { day: 'Day 7', tempC: 37.1, status: 'normal' }
      ];
    }

    patients.push({
      id: `P-${100 + room}`,
      roomNumber: room,
      name: `${fn} ${ln}`,
      age: age,
      admissionDaysAgo: admissionDaysAgo,
      feverFreeStreak: streak,
      todayTempLogged: todayTempLogged,
      todayTemp: todayTemp,
      todayDoctorVisited: todayDoctorVisited,
      todayDoctorNotes: room <= 6 ? 'Afebrile for 72 consecutive hours. Clear breath sounds. Recommended for immediate discharge.' : '',
      treatmentPlan: room % 2 === 0 ? 'Antiviral Regimen B + Hydration IV' : 'Symptomatic Paracetamol + Vitamin C + Electrolytes',
      status: status,
      tempHistory: tempHistory,
      symptoms: (todayTemp && todayTemp >= 38.0) ? ['Fever', 'Shivering', 'Body ache'] : ['Mild fatigue']
    });
  }

  return patients;
}

class AppState {
  constructor() {
    this.data = this.load();
  }

  load() {
    try {
      const stored = localStorage.getItem(APP_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to parse localStorage data:', e);
    }
    const fresh = JSON.parse(JSON.stringify(DEFAULT_STATE));
    fresh.patients = generateInitialPatients();
    return fresh;
  }

  save() {
    try {
      localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }

  resetData() {
    localStorage.removeItem(APP_STORAGE_KEY);
    this.data = JSON.parse(JSON.stringify(DEFAULT_STATE));
    this.data.patients = generateInitialPatients();
    this.save();
  }

  // Clinical helper: Convert C to F
  cToF(c) {
    return parseFloat(((c * 9/5) + 32).toFixed(1));
  }

  // Clinical helper: Convert F to C
  fToC(f) {
    return parseFloat(((f - 32) * 5/9).toFixed(1));
  }

  // Clinical evaluation of temperature
  classifyTemp(tempC) {
    if (tempC < 37.5) return { label: 'Normal', color: 'green', isFever: false };
    if (tempC < 38.0) return { label: 'Low-Grade Fever', color: 'amber', isFever: false };
    return { label: 'High Fever', color: 'red', isFever: true };
  }

  // Record a temperature measurement (Nurse or Doctor)
  recordTemperature(patientId, tempValue, unit, symptoms = [], notes = '') {
    const patient = this.data.patients.find(p => p.id === patientId);
    if (!patient) throw new Error('Patient not found');

    const tempC = unit === 'F' ? this.fToC(tempValue) : parseFloat(tempValue);

    // Biological safety validation
    if (tempC < 32.0 || tempC > 43.0) {
      throw new Error(`Temperature ${tempC}°C (${this.cToF(tempC)}°F) is outside human survivable range (32.0°C - 43.0°C).`);
    }

    const classification = this.classifyTemp(tempC);

    // Update Fever-Free Streak Algorithm
    if (classification.isFever) {
      // Fever detected (>= 38.0 C): Immediately reset streak to 0!
      patient.feverFreeStreak = 0;
      // If was previously recommended for discharge, revoke it!
      if (patient.status === 'DISCHARGE_RECOMMENDED') {
        patient.status = 'READY_FOR_DOCTOR';
      }
    } else {
      // Fever-Free reading (< 38.0 C)
      // If not already logged today, increment streak
      if (!patient.todayTempLogged) {
        patient.feverFreeStreak += 1;
      }
    }

    patient.todayTemp = tempC;
    patient.todayTempLogged = true;
    patient.symptoms = symptoms;
    
    // Add to history
    patient.tempHistory.push({
      day: `Day ${this.data.currentDayNumber} (Today)`,
      tempC: tempC,
      status: classification.color === 'green' ? 'normal' : (classification.color === 'amber' ? 'low-grade' : 'fever'),
      notes: notes
    });

    // Workflow state transition:
    // If not already visited by doctor today, it is now READY_FOR_DOCTOR
    if (!patient.todayDoctorVisited) {
      patient.status = 'READY_FOR_DOCTOR';
    } else {
      patient.status = patient.feverFreeStreak >= 3 ? 'DISCHARGE_RECOMMENDED' : 'VISIT_COMPLETED';
    }

    this.save();
    return { patient, classification };
  }

  // Record a doctor visit
  recordDoctorVisit(patientId, clinicalNotes, treatmentPlan, recommendDischarge = false, overrideReason = '') {
    const patient = this.data.patients.find(p => p.id === patientId);
    if (!patient) throw new Error('Patient not found');

    patient.todayDoctorVisited = true;
    patient.todayDoctorNotes = clinicalNotes;
    if (treatmentPlan) patient.treatmentPlan = treatmentPlan;

    if (recommendDischarge) {
      if (patient.feverFreeStreak < 3 && !overrideReason) {
        throw new Error('Patient has not completed 3 consecutive days without fever. Clinical override reason required.');
      }
      patient.status = 'DISCHARGE_RECOMMENDED';
    } else {
      patient.status = patient.feverFreeStreak >= 3 ? 'DISCHARGE_RECOMMENDED' : 'VISIT_COMPLETED';
    }

    this.save();
    return patient;
  }

  // Admin discharge patient (Frees room)
  executeDischarge(patientId) {
    const patientIdx = this.data.patients.findIndex(p => p.id === patientId);
    if (patientIdx === -1) throw new Error('Patient not found');

    const patient = this.data.patients[patientIdx];

    // Remove from active quarantine ward
    this.data.patients.splice(patientIdx, 1);

    // Update cumulative facility stats
    this.data.stats.totalHistoricalDischarged += 1;

    this.save();
    return patient;
  }

  // Mark patient deceased
  recordPatientDeceased(patientId, cause = 'Viral Complications & Acute Respiratory Distress') {
    const patientIdx = this.data.patients.findIndex(p => p.id === patientId);
    if (patientIdx === -1) throw new Error('Patient not found');

    const patient = this.data.patients[patientIdx];

    // Remove from active quarantine ward
    this.data.patients.splice(patientIdx, 1);

    // Update cumulative facility stats
    this.data.stats.totalHistoricalDeceased += 1;

    this.save();
    return patient;
  }

  // Admin admit new patient into a free room
  admitPatient(name, age, roomNumber, initialTempC, symptoms = []) {
    if (this.data.patients.length >= this.data.facilityCapacity) {
      throw new Error(`Quarantine facility is at maximum capacity (${this.data.facilityCapacity}/${this.data.facilityCapacity} beds). Cannot admit without a discharge.`);
    }

    const roomOccupied = this.data.patients.some(p => p.roomNumber === roomNumber);
    if (roomOccupied) {
      throw new Error(`Room ${roomNumber} is currently occupied.`);
    }

    if (roomNumber < 1 || roomNumber > this.data.facilityCapacity) {
      throw new Error(`Invalid room number. Must be between 1 and ${this.data.facilityCapacity}.`);
    }

    const classification = this.classifyTemp(initialTempC);
    const newPatient = {
      id: `P-${Date.now().toString().slice(-4)}`,
      roomNumber: roomNumber,
      name: name,
      age: parseInt(age, 10),
      admissionDaysAgo: 0,
      feverFreeStreak: classification.isFever ? 0 : 1,
      todayTempLogged: true,
      todayTemp: initialTempC,
      todayDoctorVisited: false,
      todayDoctorNotes: 'Admitted today. Baseline assessment pending physician round.',
      treatmentPlan: 'Standard quarantine protocol + initial symptomatic monitoring.',
      status: 'READY_FOR_DOCTOR',
      tempHistory: [
        {
          day: `Day ${this.data.currentDayNumber} (Admission)`,
          tempC: initialTempC,
          status: classification.color === 'green' ? 'normal' : (classification.color === 'amber' ? 'low-grade' : 'fever')
        }
      ],
      symptoms: symptoms
    };

    this.data.patients.push(newPatient);
    this.data.stats.totalHistoricalAdmissions += 1;
    this.save();
    return newPatient;
  }

  // Advance facility calendar by 1 day (Simulate next 24-hour cycle)
  advanceToNextDay() {
    this.data.currentDayNumber += 1;

    this.data.patients.forEach(p => {
      p.admissionDaysAgo += 1;
      p.todayTempLogged = false;
      p.todayTemp = null;
      p.todayDoctorVisited = false;
      p.todayDoctorNotes = '';

      // Reset daily status to awaiting temp
      if (p.status !== 'DISCHARGE_RECOMMENDED') {
        p.status = 'AWAITING_TEMP';
      }
    });

    this.save();
  }

  // Computed Facility Analytics
  getAnalytics() {
    const closedCases = this.data.stats.totalHistoricalDischarged + this.data.stats.totalHistoricalDeceased;
    const mortalityRate = closedCases > 0 
      ? parseFloat(((this.data.stats.totalHistoricalDeceased / closedCases) * 100).toFixed(2))
      : 0.0;

    const cureRate = closedCases > 0 
      ? parseFloat(((this.data.stats.totalHistoricalDischarged / closedCases) * 100).toFixed(2))
      : 0.0;

    const activeCount = this.data.patients.length;
    const occupancyRate = parseFloat(((activeCount / this.data.facilityCapacity) * 100).toFixed(1));

    const pendingTempCount = this.data.patients.filter(p => !p.todayTempLogged).length;
    const readyForDoctorCount = this.data.patients.filter(p => p.todayTempLogged && !p.todayDoctorVisited).length;
    const dischargeReadyCount = this.data.patients.filter(p => p.feverFreeStreak >= 3 || p.status === 'DISCHARGE_RECOMMENDED').length;
    const highFeverCount = this.data.patients.filter(p => p.todayTemp && p.todayTemp >= 38.0).length;

    return {
      activeCount,
      occupancyRate,
      freeBeds: this.data.facilityCapacity - activeCount,
      closedCases,
      mortalityRate,
      mortalityBenchmark: this.data.stats.benchmarkMortalityRate,
      mortalityBreached: mortalityRate > this.data.stats.benchmarkMortalityRate,
      cureRate,
      cureBenchmark: this.data.stats.benchmarkSuccessRate,
      pendingTempCount,
      readyForDoctorCount,
      dischargeReadyCount,
      highFeverCount,
      tempLoggedTodayCount: activeCount - pendingTempCount,
      doctorVisitedTodayCount: this.data.patients.filter(p => p.todayDoctorVisited).length
    };
  }
}

// Global App State Instance
const state = new AppState();
window.state = state;

// ==========================================
// UI CONTROLLER & RENDERING ENGINE
// ==========================================

let activeChartInstance = null;
let currentSelectedPatientId = null;

// Helper: Format temperature for display based on preference
function formatTemp(tempC, unit = state.data.temperatureUnit) {
  if (tempC === null || tempC === undefined) return '--';
  if (unit === 'F') {
    return `${state.cToF(tempC)}°F`;
  }
  return `${tempC.toFixed(1)}°C`;
}

// Render Top Summary Bar
function renderTopSummary() {
  const analytics = state.getAnalytics();
  
  const occupancyEl = document.getElementById('metric-occupancy');
  if (occupancyEl) {
    occupancyEl.innerHTML = `
      <div class="text-[10px] text-slate-500 uppercase font-semibold">Bed Occupancy</div>
      <div class="text-xl font-bold ${analytics.activeCount >= 74 ? 'text-rose-600' : 'text-slate-800'}">
        ${analytics.activeCount} <span class="text-xs font-normal text-slate-500">/ 74</span>
      </div>
      <div class="text-[11px] text-slate-500 font-medium">${analytics.occupancyRate}% Full</div>
    `;
  }

  const vitalsEl = document.getElementById('metric-vitals');
  if (vitalsEl) {
    vitalsEl.innerHTML = `
      <div class="text-[10px] text-slate-500 uppercase font-semibold">Today's Vitals</div>
      <div class="text-xl font-bold text-sky-600">
        ${analytics.tempLoggedTodayCount} <span class="text-xs font-normal text-slate-500">/ ${analytics.activeCount}</span>
      </div>
      <div class="text-[11px] ${analytics.pendingTempCount > 0 ? 'text-amber-600 font-medium' : 'text-emerald-600 font-medium'}">
        ${analytics.pendingTempCount} Pending
      </div>
    `;
  }

  const roundsEl = document.getElementById('metric-rounds');
  if (roundsEl) {
    roundsEl.innerHTML = `
      <div class="text-[10px] text-slate-500 uppercase font-semibold">Doctor Rounds</div>
      <div class="text-xl font-bold text-indigo-600">
        ${analytics.doctorVisitedTodayCount} <span class="text-xs font-normal text-slate-500">/ ${analytics.activeCount}</span>
      </div>
      <div class="text-[11px] text-slate-500 font-medium">${analytics.readyForDoctorCount} Awaiting Round</div>
    `;
  }

  const dischargeEl = document.getElementById('metric-discharge');
  if (dischargeEl) {
    dischargeEl.innerHTML = `
      <div class="text-[10px] text-slate-500 uppercase font-semibold">3-Day Fever-Free</div>
      <div class="text-xl font-bold text-emerald-600">${analytics.dischargeReadyCount} Ready</div>
      <div class="text-[11px] text-emerald-700 font-medium">Eligible for Discharge</div>
    `;
  }

  const mortalityEl = document.getElementById('metric-mortality');
  if (mortalityEl) {
    const isBreach = analytics.mortalityBreached;
    mortalityEl.innerHTML = `
      <div class="text-[10px] text-slate-500 uppercase font-semibold">Mortality Benchmark</div>
      <div class="text-xl font-bold ${isBreach ? 'text-rose-600' : 'text-emerald-600'}">
        ${analytics.mortalityRate}%
      </div>
      <div class="text-[11px] font-medium ${isBreach ? 'text-rose-600 font-bold' : 'text-slate-500'}">
        Target: ≤${analytics.mortalityBenchmark}% ${isBreach ? '⚠️ Breach' : '✓ Met'}
      </div>
    `;
  }

  const dayCounterEl = document.getElementById('facility-day-display');
  if (dayCounterEl) {
    dayCounterEl.innerText = `Facility Operation Day ${state.data.currentDayNumber}`;
  }

  // Director Alert Banner
  const alertBanner = document.getElementById('director-alert-banner');
  if (alertBanner) {
    if (analytics.mortalityBreached) {
      alertBanner.classList.remove('hidden');
      alertBanner.innerHTML = `
        <div class="flex items-center justify-between p-3.5 bg-rose-50 border-l-4 border-rose-500 text-rose-800 rounded-r-lg shadow-sm">
          <div class="flex items-center space-x-3">
            <span class="text-2xl">⚠️</span>
            <div>
              <p class="font-bold text-sm">CRITICAL QUALITY ALERT: Mortality Rate (${analytics.mortalityRate}%) Exceeds 15% Expected Benchmark!</p>
              <p class="text-xs text-rose-700">Protocol mandates immediate clinical audit of critical cases, antipyretic efficacy, and nurse-to-doctor round latency.</p>
            </div>
          </div>
          <button onclick="switchRole('director')" class="px-3 py-1.5 bg-rose-600 text-white text-xs font-semibold rounded shadow hover:bg-rose-700 transition">
            View Analytics
          </button>
        </div>
      `;
    } else {
      alertBanner.classList.add('hidden');
    }
  }
}

// Render Nurse View
function renderNurseView() {
  const container = document.getElementById('nurse-patient-list');
  if (!container) return;

  const searchQuery = (document.getElementById('nurse-search-input')?.value || '').toLowerCase();
  const filterType = document.getElementById('nurse-filter-select')?.value || 'pending';

  let list = [...state.data.patients];

  // Filter
  if (filterType === 'pending') {
    list = list.filter(p => !p.todayTempLogged);
  } else if (filterType === 'completed') {
    list = list.filter(p => p.todayTempLogged);
  } else if (filterType === 'fever') {
    list = list.filter(p => p.todayTemp && p.todayTemp >= 38.0);
  }

  // Search
  if (searchQuery) {
    list = list.filter(p => 
      p.name.toLowerCase().includes(searchQuery) || 
      `room ${p.roomNumber}`.includes(searchQuery) ||
      p.roomNumber.toString() === searchQuery
    );
  }

  // Sort by room number ascending
  list.sort((a, b) => a.roomNumber - b.roomNumber);

  if (list.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
        <span class="text-3xl block mb-2">🎉</span>
        <p class="font-semibold text-slate-700">No patients in this queue.</p>
        <p class="text-xs text-slate-400 mt-1">All filtered temperature readings have been completed or match no search results.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(p => {
    const hasTemp = p.todayTempLogged;
    const tempClass = hasTemp ? state.classifyTemp(p.todayTemp) : null;
    const badgeColor = hasTemp 
      ? (tempClass.color === 'green' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 
         tempClass.color === 'amber' ? 'bg-amber-100 text-amber-800 border-amber-300' : 
         'bg-rose-100 text-rose-800 border-rose-300')
      : 'bg-slate-100 text-slate-600 border-slate-300';

    return `
      <div class="patient-card bg-white rounded-xl border ${hasTemp && p.todayTemp >= 38.0 ? 'border-rose-300 ring-1 ring-rose-300' : 'border-slate-200'} p-4 shadow-sm flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="px-2 py-0.5 text-xs font-bold rounded-md bg-slate-900 text-white">
              Room ${p.roomNumber}
            </span>
            <span class="text-[11px] px-2 py-0.5 rounded-full border ${badgeColor} font-semibold">
              ${hasTemp ? tempClass.label : 'Awaiting Temp'}
            </span>
          </div>
          
          <h4 class="font-bold text-slate-800 text-base leading-tight">${p.name}</h4>
          <p class="text-xs text-slate-500 mb-2">Age: ${p.age} • Admitted ${p.admissionDaysAgo}d ago</p>

          <div class="bg-slate-50 rounded-lg p-2.5 mb-3 border border-slate-100">
            <div class="flex justify-between items-center text-xs text-slate-600 mb-1">
              <span>Today's Temperature:</span>
              <span class="font-bold text-sm ${hasTemp && p.todayTemp >= 38.0 ? 'text-rose-600' : 'text-slate-800'}">
                ${formatTemp(p.todayTemp)}
              </span>
            </div>
            <div class="flex justify-between items-center text-xs text-slate-500">
              <span>Fever-Free Streak:</span>
              <span class="font-semibold ${p.feverFreeStreak >= 3 ? 'text-emerald-600 font-bold' : 'text-slate-700'}">
                ${p.feverFreeStreak} / 3 days ${p.feverFreeStreak >= 3 ? '✓' : ''}
              </span>
            </div>
          </div>
        </div>

        <div>
          ${hasTemp 
            ? `<button onclick="openTempModal('${p.id}', true)" class="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition flex items-center justify-center space-x-1">
                <span>🔄 Update / Re-check Temp</span>
               </button>`
            : `<button onclick="openTempModal('${p.id}')" class="w-full py-2 px-3 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center justify-center space-x-1">
                <span>🌡️ Record Temperature</span>
               </button>`
          }
        </div>
      </div>
    `;
  }).join('');
}

// Render Doctor View
function renderDoctorView() {
  const container = document.getElementById('doctor-patient-list');
  if (!container) return;

  const searchQuery = (document.getElementById('doctor-search-input')?.value || '').toLowerCase();
  const filterType = document.getElementById('doctor-filter-select')?.value || 'ready';

  let list = [...state.data.patients];

  // Filter
  if (filterType === 'ready') {
    list = list.filter(p => p.todayTempLogged && !p.todayDoctorVisited);
  } else if (filterType === 'discharge_ready') {
    list = list.filter(p => p.feverFreeStreak >= 3 || p.status === 'DISCHARGE_RECOMMENDED');
  } else if (filterType === 'visited') {
    list = list.filter(p => p.todayDoctorVisited);
  } else if (filterType === 'unmeasured') {
    list = list.filter(p => !p.todayTempLogged);
  }

  // Search
  if (searchQuery) {
    list = list.filter(p => 
      p.name.toLowerCase().includes(searchQuery) || 
      `room ${p.roomNumber}`.includes(searchQuery) ||
      p.roomNumber.toString() === searchQuery
    );
  }

  // Sort: Patients ready for discharge first, then highest fevers, then room number
  list.sort((a, b) => {
    if (a.feverFreeStreak >= 3 && b.feverFreeStreak < 3) return -1;
    if (b.feverFreeStreak >= 3 && a.feverFreeStreak < 3) return 1;
    const aTemp = a.todayTemp || 0;
    const bTemp = b.todayTemp || 0;
    if (bTemp !== aTemp) return bTemp - aTemp;
    return a.roomNumber - b.roomNumber;
  });

  if (list.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
        <span class="text-3xl block mb-2">📋</span>
        <p class="font-semibold text-slate-700">No patients in selected queue.</p>
        <p class="text-xs text-slate-400 mt-1">Check other filters or wait for nurses to finish morning vitals rounds.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(p => {
    const hasTemp = p.todayTempLogged;
    const isCured = p.feverFreeStreak >= 3;
    const isDischargeRecommended = p.status === 'DISCHARGE_RECOMMENDED';
    const isVisited = p.todayDoctorVisited;

    return `
      <div class="patient-card bg-white rounded-xl border ${isCured ? 'border-emerald-300 ring-2 ring-emerald-400/30' : (hasTemp && p.todayTemp >= 38.0 ? 'border-rose-300' : 'border-slate-200')} p-4 shadow-sm flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="px-2 py-0.5 text-xs font-bold rounded-md bg-slate-900 text-white">
              Room ${p.roomNumber}
            </span>
            <div class="flex items-center space-x-1">
              ${isDischargeRecommended 
                ? '<span class="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-300 font-semibold">Discharge Sent</span>'
                : (isCured 
                  ? '<span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold pulse-badge">⭐ Cured (3/3)</span>'
                  : '')
              }
              <span class="text-[10px] px-2 py-0.5 rounded-full ${isVisited ? 'bg-slate-100 text-slate-600' : (hasTemp ? 'bg-sky-100 text-sky-800 border border-sky-300' : 'bg-amber-100 text-amber-800 border border-amber-300')} font-semibold">
                ${isVisited ? 'Round Done' : (hasTemp ? 'Ready for Doctor' : 'Awaiting Nurse')}
              </span>
            </div>
          </div>

          <h4 class="font-bold text-slate-800 text-base leading-tight">${p.name}</h4>
          <p class="text-xs text-slate-500 mb-2">Age: ${p.age} • In Facility: ${p.admissionDaysAgo} days</p>

          <div class="bg-slate-50 rounded-lg p-2.5 mb-3 border border-slate-100 space-y-1.5">
            <div class="flex justify-between items-center text-xs">
              <span class="text-slate-600">Today's Temperature:</span>
              <span class="font-bold text-sm ${hasTemp && p.todayTemp >= 38.0 ? 'text-rose-600' : 'text-slate-800'}">
                ${formatTemp(p.todayTemp)} ${hasTemp ? (p.todayTemp >= 38.0 ? '🔥' : '✓') : '⚠️ Pending'}
              </span>
            </div>
            
            <div class="flex justify-between items-center text-xs">
              <span class="text-slate-600">Fever-Free Streak:</span>
              <span class="font-bold ${isCured ? 'text-emerald-600' : 'text-slate-700'}">
                ${p.feverFreeStreak} / 3 consecutive days
              </span>
            </div>

            <div class="flex space-x-1 pt-1">
              <span class="flex-1 text-center py-0.5 text-[10px] rounded font-semibold ${p.feverFreeStreak >= 1 ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}">Day 1</span>
              <span class="flex-1 text-center py-0.5 text-[10px] rounded font-semibold ${p.feverFreeStreak >= 2 ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}">Day 2</span>
              <span class="flex-1 text-center py-0.5 text-[10px] rounded font-semibold ${p.feverFreeStreak >= 3 ? 'bg-emerald-600 text-white ring-1 ring-emerald-700' : 'bg-slate-200 text-slate-500'}">Day 3 (Cured)</span>
            </div>
          </div>

          ${p.todayDoctorNotes ? `
            <div class="p-2 mb-3 bg-sky-50 border border-sky-100 rounded text-xs text-slate-700">
              <span class="font-bold text-sky-900 block text-[11px]">Today's Clinical Note:</span>
              ${p.todayDoctorNotes}
            </div>
          ` : ''}
        </div>

        <div>
          <button onclick="openDoctorModal('${p.id}')" class="w-full py-2 px-3 ${isCured ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'} text-xs font-semibold rounded-lg shadow-sm transition flex items-center justify-center space-x-1">
            <span>👨‍⚕️ ${isVisited ? 'Review Clinical Dossier' : 'Start Medical Round'}</span>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// Render Admin View: 74-Bed Facility Matrix & Discharge Center
function renderAdminView() {
  const gridContainer = document.getElementById('admin-bed-matrix');
  const dischargeListContainer = document.getElementById('admin-discharge-list');
  const admitButton = document.getElementById('admin-admit-btn');

  const analytics = state.getAnalytics();

  if (admitButton) {
    if (analytics.activeCount >= state.data.facilityCapacity) {
      admitButton.disabled = true;
      admitButton.className = "py-2 px-4 bg-slate-300 text-slate-500 text-xs font-semibold rounded-lg cursor-not-allowed flex items-center space-x-1";
      admitButton.title = "Facility is full (74/74 beds). Discharge a patient first.";
    } else {
      admitButton.disabled = false;
      admitButton.className = "py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow transition flex items-center space-x-1";
      admitButton.title = "Admit a waiting patient";
    }
  }

  // Render 74-bed grid
  if (gridContainer) {
    const bedTiles = [];
    for (let r = 1; r <= state.data.facilityCapacity; r++) {
      const patient = state.data.patients.find(p => p.roomNumber === r);
      if (patient) {
        const isDischargeRec = patient.status === 'DISCHARGE_RECOMMENDED';
        const isCured = patient.feverFreeStreak >= 3;
        const hasFever = patient.todayTemp && patient.todayTemp >= 38.0;

        let bgClass = "bg-slate-100 border-slate-300 text-slate-800";
        if (isDischargeRec) {
          bgClass = "bg-amber-50 border-amber-400 text-amber-900 ring-2 ring-amber-400/50";
        } else if (isCured) {
          bgClass = "bg-emerald-50 border-emerald-400 text-emerald-900";
        } else if (hasFever) {
          bgClass = "bg-rose-50 border-rose-300 text-rose-900";
        } else {
          bgClass = "bg-sky-50 border-sky-300 text-sky-900";
        }

        bedTiles.push(`
          <div onclick="openDoctorModal('${patient.id}')" class="bed-tile p-2.5 border rounded-lg ${bgClass} text-center flex flex-col justify-between">
            <div class="flex justify-between items-center text-[10px] font-bold">
              <span>Room ${r}</span>
              ${isDischargeRec ? '<span title="Discharge Approved">⭐</span>' : (hasFever ? '<span title="High Fever">🔥</span>' : '<span>●</span>')}
            </div>
            <div class="my-1">
              <p class="font-bold text-xs truncate" title="${patient.name}">${patient.name}</p>
              <p class="text-[10px] text-slate-500">${formatTemp(patient.todayTemp)}</p>
            </div>
            <div class="text-[9px] font-semibold uppercase tracking-wider">
              ${isDischargeRec ? 'Ready Exit' : (isCured ? '3/3 Cured' : (patient.todayDoctorVisited ? 'Visited' : 'Active'))}
            </div>
          </div>
        `);
      } else {
        // Empty Bed
        bedTiles.push(`
          <div onclick="openAdmitModal(${r})" class="bed-tile p-2.5 border-2 border-dashed border-emerald-300 bg-emerald-50/50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-center flex flex-col justify-between">
            <div class="flex justify-between items-center text-[10px] font-bold">
              <span>Room ${r}</span>
              <span>✓</span>
            </div>
            <div class="my-2">
              <p class="font-bold text-xs text-emerald-700">Empty Bed</p>
              <p class="text-[10px] text-emerald-600">Cleaned & Ready</p>
            </div>
            <div class="text-[9px] font-bold text-emerald-700 uppercase">
              + Admit
            </div>
          </div>
        `);
      }
    }
    gridContainer.innerHTML = bedTiles.join('');
  }

  // Render Discharge Queue for Admin
  if (dischargeListContainer) {
    const readyForDischarge = state.data.patients.filter(p => p.status === 'DISCHARGE_RECOMMENDED' || p.feverFreeStreak >= 3);
    
    if (readyForDischarge.length === 0) {
      dischargeListContainer.innerHTML = `
        <div class="p-6 text-center text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
          <p class="text-xs font-semibold text-slate-600">No pending discharges waiting for administrative action.</p>
        </div>
      `;
    } else {
      dischargeListContainer.innerHTML = readyForDischarge.map(p => `
        <div class="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
          <div>
            <div class="flex items-center space-x-2">
              <span class="px-2 py-0.5 bg-amber-200 text-amber-900 rounded font-bold text-xs">Room ${p.roomNumber}</span>
              <span class="font-bold text-slate-800 text-sm">${p.name}</span>
              <span class="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-semibold">3/3 Days Fever-Free</span>
            </div>
            <p class="text-xs text-slate-600 mt-1">Doctor Note: ${p.todayDoctorNotes || 'Criteria met for complete recovery.'}</p>
          </div>
          <button onclick="confirmAdminDischarge('${p.id}')" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow transition">
            ✓ Finalize Discharge & Free Bed
          </button>
        </div>
      `).join('');
    }
  }
}

// Render Director Analytics View
function renderDirectorView() {
  const analytics = state.getAnalytics();

  const mortValEl = document.getElementById('dir-mortality-val');
  const mortStatusEl = document.getElementById('dir-mortality-status');
  const cureValEl = document.getElementById('dir-cure-val');
  const activeCasesEl = document.getElementById('dir-active-cases');
  const closedCasesEl = document.getElementById('dir-closed-cases');
  const deceasedCasesEl = document.getElementById('dir-deceased-cases');
  const dischargedCasesEl = document.getElementById('dir-discharged-cases');

  if (mortValEl) mortValEl.innerText = `${analytics.mortalityRate}%`;
  if (mortStatusEl) {
    if (analytics.mortalityBreached) {
      mortStatusEl.className = "text-xs font-bold text-rose-600";
      mortStatusEl.innerText = `⚠️ Above ${analytics.mortalityBenchmark}% Benchmark! Immediate Clinical Audit Required`;
    } else {
      mortStatusEl.className = "text-xs font-semibold text-emerald-600";
      mortStatusEl.innerText = `✓ Within ${analytics.mortalityBenchmark}% Benchmark Target`;
    }
  }

  if (cureValEl) cureValEl.innerText = `${analytics.cureRate}% (Target: ≥${analytics.cureBenchmark}%)`;
  if (activeCasesEl) activeCasesEl.innerText = `${analytics.activeCount} / 74 Beds (${analytics.occupancyRate}%)`;
  if (closedCasesEl) closedCasesEl.innerText = `${analytics.closedCases} Patients`;
  if (deceasedCasesEl) deceasedCasesEl.innerText = `${state.data.stats.totalHistoricalDeceased} Deaths`;
  if (dischargedCasesEl) dischargedCasesEl.innerText = `${state.data.stats.totalHistoricalDischarged} Cured`;

  // Bottleneck indicators
  const vitalsBottleneckEl = document.getElementById('dir-bottleneck-vitals');
  if (vitalsBottleneckEl) {
    vitalsBottleneckEl.innerText = `${analytics.pendingTempCount} of ${analytics.activeCount} patients still waiting for morning temperature`;
  }
  const roundsBottleneckEl = document.getElementById('dir-bottleneck-rounds');
  if (roundsBottleneckEl) {
    roundsBottleneckEl.innerText = `${analytics.readyForDoctorCount} patients measured by nurse but awaiting physician visit`;
  }
  const dischargeBottleneckEl = document.getElementById('dir-bottleneck-discharge');
  if (dischargeBottleneckEl) {
    dischargeBottleneckEl.innerText = `${analytics.dischargeReadyCount} cured patients awaiting doctor authorization or administrative release`;
  }
}

// Global View Switcher
function switchRole(role) {
  state.data.currentRole = role;
  state.save();

  // Highlight active role pill
  document.querySelectorAll('.role-pill').forEach(btn => {
    if (btn.dataset.role === role) {
      btn.className = "role-pill px-4 py-2 rounded-lg text-xs font-bold bg-white text-slate-900 shadow-sm border border-slate-200";
    } else {
      btn.className = "role-pill px-4 py-2 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100";
    }
  });

  // Toggle view containers
  const roles = ['nurse', 'doctor', 'admin', 'director'];
  roles.forEach(r => {
    const el = document.getElementById(`view-${r}`);
    if (el) {
      if (role === 'unified' || role === r) {
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    }
  });

  refreshCurrentViews();
}

// Refresh all views
function refreshCurrentViews() {
  renderTopSummary();
  renderNurseView();
  renderDoctorView();
  renderAdminView();
  renderDirectorView();
}

// Toggle C / F units
function toggleUnit(unit) {
  state.data.temperatureUnit = unit;
  state.save();
  document.querySelectorAll('.unit-btn').forEach(btn => {
    if (btn.dataset.unit === unit) {
      btn.className = "unit-btn px-2.5 py-1 text-xs font-bold bg-sky-600 text-white rounded-md";
    } else {
      btn.className = "unit-btn px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded-md hover:bg-slate-200";
    }
  });
  refreshCurrentViews();
}

// Open Temperature Logging Modal
function openTempModal(patientId, isRecheck = false) {
  currentSelectedPatientId = patientId;
  const patient = state.data.patients.find(p => p.id === patientId);
  if (!patient) return;

  const modal = document.getElementById('temp-modal');
  const title = document.getElementById('temp-modal-title');
  const subtitle = document.getElementById('temp-modal-subtitle');
  const tempInput = document.getElementById('temp-input-val');
  const unitLabel = document.getElementById('temp-unit-label');
  const warningContainer = document.getElementById('temp-warning-container');

  if (title) title.innerText = `Record Temperature — Room ${patient.roomNumber} (${patient.name})`;
  if (subtitle) subtitle.innerText = `Admitted ${patient.admissionDaysAgo} days ago • Current Streak: ${patient.feverFreeStreak}/3 days`;
  
  if (unitLabel) unitLabel.innerText = state.data.temperatureUnit === 'C' ? '°C' : '°F';
  if (tempInput) {
    tempInput.value = patient.todayTemp ? (state.data.temperatureUnit === 'C' ? patient.todayTemp : state.cToF(patient.todayTemp)) : (state.data.temperatureUnit === 'C' ? '37.0' : '98.6');
  }

  // Duplicate entry warning check
  if (warningContainer) {
    if (patient.todayTempLogged && isRecheck) {
      warningContainer.classList.remove('hidden');
      warningContainer.innerHTML = `
        <div class="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-800">
          <strong>Notice:</strong> Room ${patient.roomNumber} already had a reading of <strong>${formatTemp(patient.todayTemp)}</strong> recorded today. Submitting will update the official daily temperature.
        </div>
      `;
    } else {
      warningContainer.classList.add('hidden');
    }
  }

  updateTempPreview();
  if (modal) modal.classList.remove('hidden');
}

function updateTempPreview() {
  const tempInput = document.getElementById('temp-input-val');
  const badge = document.getElementById('temp-classification-badge');
  if (!tempInput || !badge) return;

  const val = parseFloat(tempInput.value);
  if (isNaN(val)) return;

  const tempC = state.data.temperatureUnit === 'F' ? state.fToC(val) : val;
  const classification = state.classifyTemp(tempC);

  badge.className = `px-3 py-1 rounded-full text-xs font-bold ${
    classification.color === 'green' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
    classification.color === 'amber' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
    'bg-rose-100 text-rose-800 border border-rose-300'
  }`;
  badge.innerText = `${classification.label} (${tempC.toFixed(1)}°C / ${state.cToF(tempC)}°F)`;
}

function closeTempModal() {
  const modal = document.getElementById('temp-modal');
  if (modal) modal.classList.add('hidden');
  currentSelectedPatientId = null;
}

function submitTemperature() {
  if (!currentSelectedPatientId) return;
  const tempInput = document.getElementById('temp-input-val');
  const notesInput = document.getElementById('temp-notes-input');
  
  const val = parseFloat(tempInput.value);
  if (isNaN(val)) {
    alert('Please enter a valid numeric temperature.');
    return;
  }

  const symptoms = [];
  document.querySelectorAll('.symptom-chk:checked').forEach(c => symptoms.push(c.value));

  try {
    const result = state.recordTemperature(
      currentSelectedPatientId,
      val,
      state.data.temperatureUnit,
      symptoms,
      notesInput ? notesInput.value : ''
    );

    closeTempModal();
    refreshCurrentViews();
  } catch (err) {
    alert(`Validation Error: ${err.message}`);
  }
}

// Open Doctor Clinical Dossier Modal
function openDoctorModal(patientId) {
  currentSelectedPatientId = patientId;
  const patient = state.data.patients.find(p => p.id === patientId);
  if (!patient) return;

  const modal = document.getElementById('doctor-modal');
  const title = document.getElementById('doc-modal-title');
  const details = document.getElementById('doc-modal-patient-details');
  const warningContainer = document.getElementById('doc-unmeasured-warning');
  const streakDisplay = document.getElementById('doc-streak-display');
  const dischargeBtn = document.getElementById('doc-discharge-btn');
  const notesField = document.getElementById('doc-clinical-notes');
  const treatmentField = document.getElementById('doc-treatment-field');

  if (title) title.innerText = `Clinical Round: Room ${patient.roomNumber} — ${patient.name}`;
  if (details) {
    details.innerHTML = `
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-lg text-xs">
        <div><span class="text-slate-500 block">Age:</span><strong>${patient.age} years</strong></div>
        <div><span class="text-slate-500 block">Length of Stay:</span><strong>${patient.admissionDaysAgo} days</strong></div>
        <div><span class="text-slate-500 block">Today's Temp:</span><strong class="${patient.todayTemp >= 38.0 ? 'text-rose-600' : 'text-slate-800'}">${formatTemp(patient.todayTemp)}</strong></div>
        <div><span class="text-slate-500 block">Round Status:</span><strong class="${patient.todayDoctorVisited ? 'text-emerald-600' : 'text-sky-600'}">${patient.todayDoctorVisited ? 'Visited' : 'Pending'}</strong></div>
      </div>
    `;
  }

  // Check if temperature has NOT been logged today
  if (warningContainer) {
    if (!patient.todayTempLogged) {
      warningContainer.classList.remove('hidden');
      warningContainer.innerHTML = `
        <div class="p-3 bg-amber-50 border-l-4 border-amber-500 text-amber-800 text-xs rounded-r-lg flex items-center justify-between">
          <div>
            <strong>Operational Warning:</strong> Nurse has not yet recorded today's temperature for Room ${patient.roomNumber}.
          </div>
          <button onclick="closeDoctorModal(); openTempModal('${patient.id}');" class="px-3 py-1 bg-amber-600 text-white rounded font-bold hover:bg-amber-700">
            Take Temp Now
          </button>
        </div>
      `;
    } else {
      warningContainer.classList.add('hidden');
    }
  }

  // 3-Day Fever-Free Streak Tracker
  if (streakDisplay) {
    const isCured = patient.feverFreeStreak >= 3;
    streakDisplay.innerHTML = `
      <div class="p-4 rounded-xl ${isCured ? 'bg-emerald-50 border border-emerald-300' : 'bg-slate-50 border border-slate-200'}">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-bold uppercase tracking-wider ${isCured ? 'text-emerald-800' : 'text-slate-700'}">
            3-Day Fever-Free Discharge Protocol
          </span>
          <span class="px-2.5 py-0.5 rounded-full text-xs font-bold ${isCured ? 'bg-emerald-600 text-white pulse-badge' : 'bg-slate-200 text-slate-700'}">
            ${isCured ? '✓ Criteria Met (3/3 Days)' : `${patient.feverFreeStreak} / 3 Days Complete`}
          </span>
        </div>
        <p class="text-xs text-slate-600 mb-3">
          ${isCured 
            ? 'Patient has documented 3 consecutive full calendar days with temperature strictly below 38.0°C (100.4°F). Qualified for cure discharge.'
            : 'Protocol requires 3 consecutive fever-free days (< 38.0°C) before discharge can be authorized.'}
        </p>
        <div class="grid grid-cols-3 gap-2">
          <div class="p-2 rounded text-center text-xs font-semibold ${patient.feverFreeStreak >= 1 ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}">
            Day 1: ${patient.feverFreeStreak >= 1 ? 'No Fever ✓' : 'Pending'}
          </div>
          <div class="p-2 rounded text-center text-xs font-semibold ${patient.feverFreeStreak >= 2 ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}">
            Day 2: ${patient.feverFreeStreak >= 2 ? 'No Fever ✓' : 'Pending'}
          </div>
          <div class="p-2 rounded text-center text-xs font-semibold ${patient.feverFreeStreak >= 3 ? 'bg-emerald-600 text-white ring-2 ring-emerald-700' : 'bg-slate-200 text-slate-500'}">
            Day 3: ${patient.feverFreeStreak >= 3 ? 'Cured ✓' : 'Pending'}
          </div>
        </div>
      </div>
    `;
  }

  // Discharge Button enable/disable state
  if (dischargeBtn) {
    if (patient.feverFreeStreak >= 3 || patient.status === 'DISCHARGE_RECOMMENDED') {
      dischargeBtn.disabled = false;
      dischargeBtn.className = "px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow transition";
      dischargeBtn.innerText = patient.status === 'DISCHARGE_RECOMMENDED' ? "✓ Discharge Sent to Admin" : "⭐ Authorize Discharge (Cured)";
    } else {
      dischargeBtn.disabled = true;
      dischargeBtn.className = "px-4 py-2 bg-slate-200 text-slate-400 text-xs font-bold rounded-lg cursor-not-allowed";
      dischargeBtn.innerText = `Discharge Locked (${patient.feverFreeStreak}/3 Days)`;
    }
  }

  if (notesField) notesField.value = patient.todayDoctorNotes || '';
  if (treatmentField) treatmentField.value = patient.treatmentPlan || '';

  renderClinicalChart(patient);

  if (modal) modal.classList.remove('hidden');
}

// Render Temperature Trajectory Chart
function renderClinicalChart(patient) {
  const ctx = document.getElementById('patient-temp-chart')?.getContext('2d');
  if (!ctx) return;

  if (activeChartInstance) {
    activeChartInstance.destroy();
  }

  const labels = patient.tempHistory.map(h => h.day);
  const dataPoints = patient.tempHistory.map(h => h.tempC);

  activeChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Patient Temperature (°C)',
          data: dataPoints,
          borderColor: '#0284c7',
          backgroundColor: 'rgba(2, 132, 199, 0.1)',
          fill: true,
          tension: 0.2,
          pointBackgroundColor: dataPoints.map(t => t >= 38.0 ? '#ef4444' : '#10b981'),
          pointRadius: 6,
          pointHoverRadius: 8
        },
        {
          label: 'Fever Threshold (38.0°C)',
          data: labels.map(() => 38.0),
          borderColor: '#ef4444',
          borderDash: [6, 4],
          borderWidth: 2,
          pointRadius: 0,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { font: { size: 11 } }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.dataset.label}: ${context.raw}°C (${state.cToF(context.raw)}°F)`;
            }
          }
        }
      },
      scales: {
        y: {
          min: 35.5,
          max: 40.5,
          ticks: { stepSize: 0.5 }
        }
      }
    }
  });
}

function closeDoctorModal() {
  const modal = document.getElementById('doctor-modal');
  if (modal) modal.classList.add('hidden');
  currentSelectedPatientId = null;
}

function saveDoctorRound(recommendDischarge = false) {
  if (!currentSelectedPatientId) return;
  const notesField = document.getElementById('doc-clinical-notes');
  const treatmentField = document.getElementById('doc-treatment-field');

  try {
    state.recordDoctorVisit(
      currentSelectedPatientId,
      notesField ? notesField.value : '',
      treatmentField ? treatmentField.value : '',
      recommendDischarge
    );

    closeDoctorModal();
    refreshCurrentViews();
  } catch (err) {
    alert(`Doctor Round Error: ${err.message}`);
  }
}

// Mark patient deceased dialog
function markPatientDeceasedPrompt() {
  if (!currentSelectedPatientId) return;
  const patient = state.data.patients.find(p => p.id === currentSelectedPatientId);
  if (!patient) return;

  const reason = prompt(`Confirm declaring patient Room ${patient.roomNumber} (${patient.name}) DECEASED?\n\nThis will remove the patient, free the bed, and update the facility mortality rate. Enter primary clinical cause of death:`, "Acute Viral Pneumonia & Respiratory Failure");
  
  if (reason !== null) {
    state.recordPatientDeceased(patient.id, reason);
    closeDoctorModal();
    refreshCurrentViews();
    alert(`Outcome recorded. Mortality analytics updated.`);
  }
}

// Admin Confirm Discharge
function confirmAdminDischarge(patientId) {
  const patient = state.data.patients.find(p => p.id === patientId);
  if (!patient) return;

  if (confirm(`Execute official discharge for ${patient.name} (Room ${patient.roomNumber})?\n\n- Consecutive Fever-Free: ${patient.feverFreeStreak} days\n- Bed ${patient.roomNumber} will be marked available for new intake.\n- Outcome recorded as CURED.`)) {
    state.executeDischarge(patientId);
    refreshCurrentViews();
    alert(`Patient ${patient.name} discharged successfully. Room ${patient.roomNumber} is now ready for intake.`);
  }
}

// Admin Open Admit Modal
function openAdmitModal(preSelectedRoom = null) {
  const analytics = state.getAnalytics();
  if (analytics.activeCount >= state.data.facilityCapacity) {
    alert(`Cannot admit new patient: Quarantine facility is at 100% capacity (${state.data.facilityCapacity}/${state.data.facilityCapacity} beds occupied). Discharge a patient first.`);
    return;
  }

  const modal = document.getElementById('admit-modal');
  const roomSelect = document.getElementById('admit-room-select');

  // Populate available rooms
  if (roomSelect) {
    const occupiedRooms = state.data.patients.map(p => p.roomNumber);
    const freeRooms = [];
    for (let r = 1; r <= state.data.facilityCapacity; r++) {
      if (!occupiedRooms.includes(r)) {
        freeRooms.push(r);
      }
    }

    roomSelect.innerHTML = freeRooms.map(r => `
      <option value="${r}" ${preSelectedRoom === r ? 'selected' : ''}>Room ${r} (Clean & Free)</option>
    `).join('');
  }

  if (modal) modal.classList.remove('hidden');
}

function closeAdmitModal() {
  const modal = document.getElementById('admit-modal');
  if (modal) modal.classList.add('hidden');
}

function submitAdmission() {
  const nameInput = document.getElementById('admit-name');
  const ageInput = document.getElementById('admit-age');
  const roomSelect = document.getElementById('admit-room-select');
  const tempInput = document.getElementById('admit-temp');

  const name = nameInput.value.trim();
  const age = parseInt(ageInput.value, 10);
  const room = parseInt(roomSelect.value, 10);
  const temp = parseFloat(tempInput.value);

  if (!name || isNaN(age) || isNaN(room) || isNaN(temp)) {
    alert('Please fill out all admission fields with valid values.');
    return;
  }

  try {
    state.admitPatient(name, age, room, temp, ['Fever', 'Cough']);
    closeAdmitModal();
    refreshCurrentViews();
    alert(`Patient ${name} successfully admitted to Room ${room}.`);
  } catch (err) {
    alert(`Admission Error: ${err.message}`);
  }
}

// Advance Day Simulation
function simulateNextDay() {
  if (confirm(`Advance quarantine facility to Day ${state.data.currentDayNumber + 1}?\n\n- Simulates next 24-hour cycle\n- Resets daily temperature & doctor visit status for all active patients\n- Allows testing multi-day fever streak progression towards the 3-day discharge criteria`)) {
    state.advanceToNextDay();
    refreshCurrentViews();
    alert(`Advanced to Facility Day ${state.data.currentDayNumber}. Morning nurse rounds are now open.`);
  }
}

// Reset data to factory demo
function resetFacilityData() {
  if (confirm('Reset all facility data to initial benchmark demo state? (74 full beds, 15% mortality baseline)')) {
    state.resetData();
    refreshCurrentViews();
    alert('Facility data reset to factory demo state.');
  }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  switchRole('nurse');
  refreshCurrentViews();
});
