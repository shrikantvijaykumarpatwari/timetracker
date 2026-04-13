const $ = id => document.getElementById(id);

// Default holidays for 2026 (can be customized)
const DEFAULT_HOLIDAYS_2026 = [
  "2026-01-01","2026-01-26","2026-03-03","2026-03-19",
  "2026-05-01","2026-09-14","2026-10-02","2026-10-20",
  "2026-11-09","2026-11-10","2026-12-25"
];

// ---------- STATE ----------
let currentYear = new Date().getFullYear();
let currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
let currentMonth = new Date().getMonth() + 1; // Track current month for monthly view
let editingDate = null; // Track which date is being edited
let displayedLogEntries = 10; // Track how many log entries to display

// ---------- STORAGE ----------
const getLog = () => JSON.parse(localStorage.getItem('log') || '[]');
const saveLog = d => localStorage.setItem('log', JSON.stringify(d));

// ---------- MIGRATION ----------
function migrateOldData() {
  const oldData = localStorage.getItem('att_log');
  if (!oldData) {
    return; // No old data to migrate
  }
  
  try {
    const oldEntries = JSON.parse(oldData);
    if (!Array.isArray(oldEntries) || oldEntries.length === 0) {
      localStorage.removeItem('att_log');
      return;
    }
    
    // Get existing log data
    const currentLog = getLog();
    
    // Create a map of existing entries by date for quick lookup
    const existingDates = new Set(currentLog.map(entry => entry.date));
    
    // Merge old entries that don't already exist in current log
    let migratedCount = 0;
    oldEntries.forEach(entry => {
      if (entry.date && !existingDates.has(entry.date)) {
        currentLog.push({
          date: entry.date,
          hours: entry.hours || 0,
          checkin: entry.checkin || '09:00',
          checkout: entry.checkout || '18:00'
        });
        migratedCount++;
      }
    });
    
    // Save merged data
    if (migratedCount > 0) {
      saveLog(currentLog);
      console.log(`Migrated ${migratedCount} entries from 'att_log' to 'log'`);
    }
    
    // Remove old data
    localStorage.removeItem('att_log');
    
    if (migratedCount > 0) {
      showToast(`Migrated ${migratedCount} entries from previous version`, 'success');
    }
  } catch (error) {
    console.error('Error migrating old data:', error);
    // Don't remove old data if migration failed
  }
}

// Leave storage with migration
const getLeaves = () => {
  let leaves = JSON.parse(localStorage.getItem('leaves') || '[]');

  // Migrate old string format to new object format
  let migrated = false;
  leaves = leaves.map(leave => {
    if (typeof leave === 'string') {
      migrated = true;
      return { date: leave, type: 'full' };
    }
    return leave;
  });

  if (migrated) {
    saveLeaves(leaves);
  }

  return leaves;
};
const saveLeaves = d => localStorage.setItem('leaves', JSON.stringify(d));

// Holiday storage (per year)
const getHolidays = (year) => {
  const stored = localStorage.getItem('holidays_' + year);
  if (stored) {
    return JSON.parse(stored);
  }
  // Return default holidays for 2026 if no custom holidays set
  if (year === 2026) {
    return DEFAULT_HOLIDAYS_2026;
  }
  return [];
};
const saveHolidays = (year, holidays) => localStorage.setItem('holidays_' + year, JSON.stringify(holidays));

// Daily hours storage
const getDailyHours = () => {
  const stored = localStorage.getItem('dailyHours');
  return stored ? parseFloat(stored) : 6;
};
const saveDailyHours = (hours) => localStorage.setItem('dailyHours', hours);

// ---------- HELPERS ----------
const pad = n => String(n).padStart(2,'0');

function getWorkingDays(y,m){
  let d=new Date(y,m-1,1),c=0;
  while(d.getMonth()==m-1){
    let day=d.getDay();
    if(day>=1 && day<=5) c++;
    d.setDate(d.getDate()+1);
  }
  return c;
}

function getHolidayCount(y,m){
  const holidays = getHolidays(y);
  return holidays.filter(d=>{
    let dt=new Date(d);
    return dt.getFullYear()==y && dt.getMonth()+1==m;
  }).length;
}

function getLeaveDeduction(y,m){
  const leaves = getLeaves();
  return leaves.filter(leave => {
    let dt = new Date(leave.date);
    return dt.getFullYear() == y && dt.getMonth() + 1 == m;
  }).reduce((total, leave) => {
    return total + (leave.type === 'half' ? 3 : 6);
  }, 0);
}

function getLeaveDays(y,m){
  const leaves = getLeaves();
  return leaves.filter(leave => {
    let dt = new Date(leave.date);
    return dt.getFullYear() == y && dt.getMonth() + 1 == m;
  }).reduce((total, leave) => {
    return total + (leave.type === 'half' ? 0.5 : 1);
  }, 0);
}

function diff(ci,co){
  if(!ci || !co) return 0;
  let [h1,m1]=ci.split(':').map(Number);
  let [h2,m2]=co.split(':').map(Number);
  return ((h2*60+m2)-(h1*60+m1))/60;
}

function getMonthName(month) {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
  return months[month - 1];
}

function getQuarterMonths(quarter) {
  const startMonth = (quarter - 1) * 3 + 1;
  return [startMonth, startMonth + 1, startMonth + 2];
}

// ---------- TOAST NOTIFICATIONS ----------
function showToast(message, type = 'success') {
  const toast = $('toast');
  const toastMessage = $('toast-message');
  
  // Remove previous type classes
  toast.classList.remove('success', 'error', 'warning');
  
  // Add new type class
  if (type) {
    toast.classList.add(type);
  }
  
  toastMessage.textContent = message;
  toast.classList.add('show');
  
  // Auto-hide after 3 seconds
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// ---------- FORM VALIDATION ----------
function validateForm() {
  const date = $('date').value;
  const checkin = $('checkin').value;
  const checkout = $('checkout').value;
  
  if (!date) {
    showToast('Please select a date', 'error');
    return false;
  }
  
  if (!checkin) {
    showToast('Please enter check-in time', 'error');
    return false;
  }
  
  if (!checkout) {
    showToast('Please enter check-out time', 'error');
    return false;
  }
  
  const hours = diff(checkin, checkout);
  if (hours <= 0) {
    showToast('Check-out time must be after check-in time', 'error');
    return false;
  }
  
  return true;
}

// ---------- DEDUCTION DETAILS MODAL ----------
function showDeductionDetails(year = null, month = null) {
  let y, m;
  
  if (year && month) {
    // Specific month provided (for quarterly/yearly views)
    y = year;
    m = month;
  } else {
    // Current month (for dashboard)
    let now = new Date();
    y = now.getFullYear();
    m = now.getMonth() + 1;
  }
  
  let leaveDeduction = getLeaveDeduction(y, m);
  let holidays = getHolidayCount(y, m);
  let dailyHours = getDailyHours();
  let deduction = leaveDeduction + holidays * 6;
  
  // Get leave entries for the month
  const leaves = getLeaves().filter(leave => {
    let dt = new Date(leave.date);
    return dt.getFullYear() == y && dt.getMonth() + 1 == m;
  });
  
  // Get holidays for the month
  const holidayDates = getHolidays(y).filter(d => {
    let dt = new Date(d);
    return dt.getFullYear() == y && dt.getMonth() + 1 == m;
  });
  
  // Create modal content
  const modal = document.createElement('div');
  modal.className = 'deduction-modal';
  modal.innerHTML = `
    <div class="deduction-modal-content">
      <div class="deduction-modal-header">
        <h3>Deduction Breakdown - ${getMonthName(m)} ${y}</h3>
        <button class="deduction-modal-close" onclick="this.parentElement.parentElement.remove()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="deduction-modal-body">
        <div class="deduction-section">
          <h4>Calculation Formula</h4>
          <div class="deduction-formula">
            <span>Leave Hours + Holidays × 6 hours = Total Deduction</span>
          </div>
          <div class="deduction-calculation">
            <span>${leaveDeduction} + ${holidays} × 6 = ${deduction} hours</span>
          </div>
        </div>

        <div class="deduction-section">
          <h4>Leave (${leaveDeduction} hours)</h4>
          ${leaves.length > 0 ? `
            <ul class="deduction-list">
              ${leaves.map(leave => `<li>${formatDate(leave.date)} - ${leave.type === 'half' ? 'Half Day (3 hours)' : 'Full Day (6 hours)'}</li>`).join('')}
            </ul>
          ` : '<p class="deduction-empty">No leave this month</p>'}
        </div>
        
        <div class="deduction-section">
          <h4>Holidays (${holidays} days)</h4>
          ${holidayDates.length > 0 ? `
            <ul class="deduction-list">
              ${holidayDates.map(date => `<li>${formatDate(date)}</li>`).join('')}
            </ul>
          ` : '<p class="deduction-empty">No holidays this month</p>'}
        </div>
        
        <div class="deduction-summary">
          <div class="deduction-summary-row">
            <span>Total Deduction:</span>
            <span class="deduction-total">${deduction} hours</span>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Add click outside to close
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      modal.remove();
    }
  });
  
  document.body.appendChild(modal);
}

// ---------- DASHBOARD ----------
function refreshDash(){
  let now=new Date();
  let y=now.getFullYear(), m=now.getMonth()+1;
  
  // Reset displayed log entries when refreshing dashboard
  displayedLogEntries = 10;

  let workingDays = getWorkingDays(y,m);
  let weeks = (workingDays/5).toFixed(1);
  let dailyHours = getDailyHours();

  let expected = (weeks * 3 * dailyHours).toFixed(1);

  let leaveDeduction = getLeaveDeduction(y,m);
  let holidays = getHolidayCount(y,m);

  let deduction = leaveDeduction + holidays * 6;
  let netTarget = (expected - deduction).toFixed(1);

  let worked = getLog()
    .filter(r=>r.date.startsWith(`${y}-${pad(m)}`))
    .reduce((s,r)=>s+r.hours,0)
    .toFixed(1);

  let shortfall = (netTarget - worked).toFixed(1);

  // UI
  $('hdr-month').innerText = now.toLocaleString('default',{month:'long',year:'numeric'});
  $('d-wdays').innerText = workingDays;
  $('d-expected').innerText = expected;
  $('d-pl').innerText = deduction + ` (Leave:${leaveDeduction}h, H:${holidays})`;
  $('d-net').innerText = netTarget;
  $('d-worked').innerText = worked;
  $('d-short').innerText = shortfall;

  // Update Monthly tab
  $('m-wdays').innerText = workingDays;
  $('m-expected').innerText = expected;
  $('m-worked').innerText = worked;
  $('m-shortfall').innerText = shortfall;

  $('holidays').value = holidays;
  $('pl-days-display').value = getLeaveDays(y,m);

  // Update shortfall card styling
  const shortfallCard = $('shortfall-card');
  if (parseFloat(shortfall) > 0) {
    shortfallCard.style.borderColor = 'var(--danger)';
  } else {
    shortfallCard.style.borderColor = 'var(--success)';
  }

  renderTable();
  renderLeaveTable();
  renderHolidayTable();
  refreshMonthly();
  refreshQuarter();
  refreshYearly();
}

// ---------- QUARTER VIEW ----------
function refreshQuarter() {
  const months = getQuarterMonths(currentQuarter);
  const log = getLog();
  
  // Update quarter label
  $('quarter-label').innerText = `Q${currentQuarter} ${currentYear}`;
  
  let totalExpected = 0;
  let totalWorked = 0;
  let totalDeduction = 0;
  
    months.forEach((month, index) => {
      const monthNum = index + 1;
      const workingDays = getWorkingDays(currentYear, month);
      const weeks = (workingDays / 5).toFixed(1);
      const dailyHours = getDailyHours();
      const expected = (weeks * 3 * dailyHours).toFixed(1);

      const leaveDeduction = getLeaveDeduction(currentYear, month);
      const holidays = getHolidayCount(currentYear, month);
      const deduction = leaveDeduction + holidays * 6;
    const netTarget = (expected - deduction).toFixed(1);
    
    const worked = log
      .filter(r => r.date.startsWith(`${currentYear}-${pad(month)}`))
      .reduce((s, r) => s + r.hours, 0)
      .toFixed(1);
    
    const shortfall = (netTarget - worked).toFixed(1);
    
    // Update month card
    $(`q-month-${monthNum}-name`).innerText = getMonthName(month);
    $(`q-month-${monthNum}-expected`).innerText = expected;
    $(`q-month-${monthNum}-worked`).innerText = worked;
    $(`q-month-${monthNum}-shortfall`).innerText = shortfall;
    
    // Update status
    const statusEl = $(`q-month-${monthNum}-status`);
    statusEl.classList.remove('complete', 'incomplete', 'over');
    
    if (parseFloat(shortfall) <= 0) {
      statusEl.innerText = 'Complete';
      statusEl.classList.add('complete');
    } else if (parseFloat(worked) > 0) {
      statusEl.innerText = 'In Progress';
      statusEl.classList.add('incomplete');
    } else {
      statusEl.innerText = 'Not Started';
    }
    
    // Accumulate totals
    totalExpected += parseFloat(expected);
    totalWorked += parseFloat(worked);
    totalDeduction += deduction;
  });
  
  // Update quarter summary
  const totalShortfall = (totalExpected - totalDeduction - totalWorked).toFixed(1);
  $('q-expected').innerText = totalExpected.toFixed(1);
  $('q-worked').innerText = totalWorked.toFixed(1);
  $('q-deduction').innerText = totalDeduction.toFixed(1);
  $('q-shortfall').innerText = totalShortfall;
}

// ---------- MONTHLY VIEW ----------
function refreshMonthly() {
  const log = getLog();
  
  // Update month label
  $('month-label').innerText = `${getMonthName(currentMonth)} ${currentYear}`;
  
  const workingDays = getWorkingDays(currentYear, currentMonth);
  const weeks = (workingDays / 5).toFixed(1);
  const dailyHours = getDailyHours();
  const expected = (weeks * 3 * dailyHours).toFixed(1);

  const leaveDeduction = getLeaveDeduction(currentYear, currentMonth);
  const holidays = getHolidayCount(currentYear, currentMonth);
  const deduction = leaveDeduction + holidays * 6;
  const netTarget = (expected - deduction).toFixed(1);
  
  const worked = log
    .filter(r => r.date.startsWith(`${currentYear}-${pad(currentMonth)}`))
    .reduce((s, r) => s + r.hours, 0)
    .toFixed(1);
  
  const shortfall = (netTarget - worked).toFixed(1);
  
  // Update monthly summary
  $('m-wdays').innerText = workingDays;
  $('m-expected').innerText = expected;
  $('m-worked').innerText = worked;
  $('m-shortfall').innerText = shortfall;
  $('m-deduction').innerText = deduction + ` (Leave:${leaveDeduction}h, H:${holidays})`;
  
  // Update shortfall card styling
  const shortfallCard = $('m-shortfall-card');
  if (parseFloat(shortfall) > 0) {
    shortfallCard.style.borderColor = 'var(--danger)';
  } else {
    shortfallCard.style.borderColor = 'var(--success)';
  }
}

// ---------- YEARLY VIEW ----------
function refreshYearly() {
  const log = getLog();
  
  // Update year label
  $('year-label').innerText = currentYear;
  
  let totalExpected = 0;
  let totalWorked = 0;
  let totalDeduction = 0;
  
  for (let quarter = 1; quarter <= 4; quarter++) {
    const months = getQuarterMonths(quarter);
    let quarterExpected = 0;
    let quarterWorked = 0;
    let quarterDeduction = 0;
    
    months.forEach(month => {
      const workingDays = getWorkingDays(currentYear, month);
      const weeks = (workingDays / 5).toFixed(1);
      const dailyHours = getDailyHours();
      const expected = (weeks * 3 * dailyHours).toFixed(1);

      const leaveDeduction = getLeaveDeduction(currentYear, month);
      const holidays = getHolidayCount(currentYear, month);
      const deduction = leaveDeduction + holidays * 6;
      
      const worked = log
        .filter(r => r.date.startsWith(`${currentYear}-${pad(month)}`))
        .reduce((s, r) => s + r.hours, 0)
        .toFixed(1);
      
      quarterExpected += parseFloat(expected);
      quarterWorked += parseFloat(worked);
      quarterDeduction += deduction;
    });
    
    const quarterShortfall = (quarterExpected - quarterDeduction - quarterWorked).toFixed(1);
    
    // Update quarter card
    $(`y-q${quarter}-expected`).innerText = quarterExpected.toFixed(1);
    $(`y-q${quarter}-worked`).innerText = quarterWorked.toFixed(1);
    $(`y-q${quarter}-shortfall`).innerText = quarterShortfall;
    
    // Update status
    const statusEl = $(`y-q${quarter}-status`);
    statusEl.classList.remove('complete', 'incomplete', 'over');
    
    if (parseFloat(quarterShortfall) <= 0) {
      statusEl.innerText = 'Complete';
      statusEl.classList.add('complete');
    } else if (quarterWorked > 0) {
      statusEl.innerText = 'In Progress';
      statusEl.classList.add('incomplete');
    } else {
      statusEl.innerText = 'Not Started';
    }
    
    // Accumulate totals
    totalExpected += quarterExpected;
    totalWorked += quarterWorked;
    totalDeduction += quarterDeduction;
  }
  
  // Update yearly summary
  const totalShortfall = (totalExpected - totalDeduction - totalWorked).toFixed(1);
  $('y-expected').innerText = totalExpected.toFixed(1);
  $('y-worked').innerText = totalWorked.toFixed(1);
  $('y-deduction').innerText = totalDeduction.toFixed(1);
  $('y-shortfall').innerText = totalShortfall;
}

// ---------- TABLE ----------
function renderTable(){
  let log = getLog();
  const logBody = $('log-body');
  const emptyState = $('empty-state');
  const logCount = $('log-count');
  const loadMoreContainer = $('load-more-container');
  
  // Update log count
  logCount.textContent = `${log.length} ${log.length === 1 ? 'entry' : 'entries'}`;
  
  if (log.length === 0) {
    logBody.innerHTML = '';
    emptyState.classList.add('show');
    if (loadMoreContainer) loadMoreContainer.style.display = 'none';
    return;
  }
  
  emptyState.classList.remove('show');
  
  // Sort by date descending
  log.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  // Show only the first N entries
  const displayedLog = log.slice(0, displayedLogEntries);
  
  logBody.innerHTML = displayedLog.map((r, index) => `
    <tr style="animation: fadeIn 0.3s ease-out; animation-delay: ${index * 0.05}s; animation-fill-mode: both;">
      <td>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <svg style="width: 16px; height: 16px; color: var(--text-muted);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
          </svg>
          ${formatDate(r.date)}
        </div>
      </td>
      <td>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <svg style="width: 16px; height: 16px; color: var(--text-muted);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <span style="font-weight: 600;">
            ${r.checkin || '09:00'}
          </span>
        </div>
      </td>
      <td>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <svg style="width: 16px; height: 16px; color: var(--text-muted);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <span style="font-weight: 600;">
            ${r.checkout || (() => {
              const checkoutHour = 9 + r.hours;
              return `${String(Math.floor(checkoutHour)).padStart(2, '0')}:${String(Math.round((checkoutHour % 1) * 60)).padStart(2, '0')}`;
            })()}
          </span>
        </div>
      </td>
      <td>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <svg style="width: 16px; height: 16px; color: var(--text-muted);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <span style="font-weight: 600; color: ${r.hours >= 6 ? 'var(--success)' : 'var(--warning)'};">
            ${r.hours.toFixed(1)} hrs
          </span>
        </div>
      </td>
      <td>
        <button class="btn-edit" onclick="editEntry('${r.date}')" title="Edit entry">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
        <button class="btn-delete" onclick="deleteEntry('${r.date}')" title="Delete entry">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
        </button>
      </td>
    </tr>
  `).join('');
  
  // Show/hide load more button
  if (loadMoreContainer) {
    if (log.length > displayedLogEntries) {
      loadMoreContainer.style.display = 'flex';
    } else {
      loadMoreContainer.style.display = 'none';
    }
  }
}

// ---------- LEAVE TABLE ----------
function renderLeaveTable(){
  let leaves = getLeaves();
  const leaveBody = $('leave-body');
  const emptyLeaveState = $('empty-leave-state');
  const leaveCount = $('leave-count');
  
  // Update leave count (calculate total days)
  const totalLeaveDays = leaves.reduce((total, leave) => total + (leave.type === 'half' ? 0.5 : 1), 0);
  leaveCount.textContent = `${totalLeaveDays} ${totalLeaveDays === 1 ? 'day' : 'days'}`;
  
  if (leaves.length === 0) {
    leaveBody.innerHTML = '';
    emptyLeaveState.classList.add('show');
    return;
  }
  
  emptyLeaveState.classList.remove('show');
  
  // Sort by date descending
  leaves.sort((a, b) => new Date(b.date) - new Date(a.date));

  leaveBody.innerHTML = leaves.map((leave, index) => `
    <tr style="animation: fadeIn 0.3s ease-out; animation-delay: ${index * 0.05}s; animation-fill-mode: both;">
      <td>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <svg style="width: 16px; height: 16px; color: var(--text-muted);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
          </svg>
          ${formatDate(leave.date)}
        </div>
      </td>
      <td>
        <span class="leave-type">${leave.type === 'half' ? 'Half Day (3h)' : 'Full Day (6h)'}</span>
      </td>
      <td>
        <button class="btn-delete" onclick="deleteLeave('${leave.date}')" title="Delete leave">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
        </button>
      </td>
    </tr>
  `).join('');
}

// ---------- HOLIDAY TABLE ----------
function renderHolidayTable(){
  let holidays = getHolidays(currentYear);
  const holidayBody = $('holiday-body');
  const emptyHolidayState = $('empty-holiday-state');
  const holidayCount = $('holiday-count');
  
  // Update holiday count
  holidayCount.textContent = `${holidays.length} ${holidays.length === 1 ? 'day' : 'days'}`;
  
  if (holidays.length === 0) {
    holidayBody.innerHTML = '';
    emptyHolidayState.classList.add('show');
    return;
  }
  
  emptyHolidayState.classList.remove('show');
  
  // Sort by date ascending
  holidays.sort((a, b) => new Date(a) - new Date(b));
  
  holidayBody.innerHTML = holidays.map((date, index) => `
    <tr style="animation: fadeIn 0.3s ease-out; animation-delay: ${index * 0.05}s; animation-fill-mode: both;">
      <td>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <svg style="width: 16px; height: 16px; color: var(--text-muted);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
          </svg>
          ${formatDate(date)}
        </div>
      </td>
      <td>
        <span class="holiday-type">Holiday</span>
      </td>
      <td>
        <button class="btn-delete" onclick="deleteHoliday('${date}')" title="Delete holiday">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
        </button>
      </td>
    </tr>
  `).join('');
}

// ---------- FORMAT DATE ----------
function formatDate(dateString) {
  const date = new Date(dateString);
  const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

// ---------- DELETE ENTRY ----------
function deleteEntry(date) {
  if (!confirm('Are you sure you want to delete this entry?')) {
    return;
  }
  
  let log = getLog();
  log = log.filter(entry => entry.date !== date);
  saveLog(log);
  
  showToast('Entry deleted successfully', 'success');
  refreshDash();
}

// ---------- DELETE LEAVE ----------
function deleteLeave(date) {
  if (!confirm('Are you sure you want to delete this leave?')) {
    return;
  }

  let leaves = getLeaves();
  leaves = leaves.filter(leave => leave.date !== date);
  saveLeaves(leaves);

  showToast('Leave deleted successfully', 'success');
  refreshDash();
}

// ---------- DELETE HOLIDAY ----------
function deleteHoliday(date) {
  if (!confirm('Are you sure you want to delete this holiday?')) {
    return;
  }
  
  let holidays = getHolidays(currentYear);
  holidays = holidays.filter(d => d !== date);
  saveHolidays(currentYear, holidays);
  
  showToast('Holiday deleted successfully', 'success');
  refreshDash();
}

// ---------- EDIT ENTRY ----------
function editEntry(date) {
  const log = getLog();
  const entry = log.find(e => e.date === date);
  
  if (!entry) {
    showToast('Entry not found', 'error');
    return;
  }
  
  // Set editing state
  editingDate = date;
  
  // Populate form with entry data
  $('date').value = entry.date;
  
  // Use stored checkin/checkout times if available, otherwise generate defaults
  if (entry.checkin && entry.checkout) {
    $('checkin').value = entry.checkin;
    $('checkout').value = entry.checkout;
  } else {
    // Fallback: set checkin to 9:00 AM and calculate checkout based on hours
    const checkinHour = 9;
    const checkoutHour = checkinHour + entry.hours;
    $('checkin').value = `${pad(checkinHour)}:00`;
    $('checkout').value = `${pad(Math.floor(checkoutHour))}:${pad(Math.round((checkoutHour % 1) * 60))}`;
  }
  
  // Update UI for edit mode
  $('entry-title-text').textContent = 'Edit Entry';
  $('save-btn-text').textContent = 'Update Entry';
  $('cancel-edit').style.display = 'inline-flex';
  
  // Scroll to form
  $('entry-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
  
  showToast('Editing entry for ' + formatDate(date), 'warning');
}

// ---------- CANCEL EDIT ----------
function cancelEdit() {
  editingDate = null;
  
  // Clear form
  $('date').value = '';
  $('checkin').value = '';
  $('checkout').value = '';
  
  // Reset UI
  $('entry-title-text').textContent = 'Log Entry';
  $('save-btn-text').textContent = 'Save Entry';
  $('cancel-edit').style.display = 'none';
  
  // Set default date
  setDefaultDate();
}

// ---------- SAVE ----------
function saveEntry(){
  if (!validateForm()) {
    return;
  }
  
  let date = $('date').value;
  let ci = $('checkin').value;
  let co = $('checkout').value;

  let hours = Math.min(diff(ci,co), 10); // Cap at 10 hours

  let log = getLog();
  
  // Check if we're editing an existing entry
  if (editingDate) {
    // Find and update the entry
    const existingIndex = log.findIndex(entry => entry.date === editingDate);
    if (existingIndex !== -1) {
      // If date changed, check if new date already exists
      if (date !== editingDate) {
        const newDateExists = log.some(entry => entry.date === date);
        if (newDateExists) {
          showToast('An entry for this date already exists', 'error');
          return;
        }
      }
      log[existingIndex].date = date;
      log[existingIndex].hours = hours;
      log[existingIndex].checkin = ci;
      log[existingIndex].checkout = co;
      showToast('Entry updated successfully!', 'success');
    }
    editingDate = null;
  } else {
    // Check if entry for this date already exists
    const existingIndex = log.findIndex(entry => entry.date === date);
    if (existingIndex !== -1) {
      if (!confirm('An entry for this date already exists. Do you want to update it?')) {
        return;
      }
      log[existingIndex].hours = hours;
      log[existingIndex].checkin = ci;
      log[existingIndex].checkout = co;
    } else {
      log.push({date, hours, checkin: ci, checkout: co});
    }
    showToast('Entry saved successfully!', 'success');
  }
  
  saveLog(log);

  // Clear form and reset UI
  $('date').value = '';
  $('checkin').value = '';
  $('checkout').value = '';
  $('entry-title-text').textContent = 'Log Entry';
  $('save-btn-text').textContent = 'Save Entry';
  $('cancel-edit').style.display = 'none';
  
  setDefaultDate();
  refreshDash();
}

// ---------- SAVE LEAVE ----------
function saveLeave(){
  const date = $('leave-date').value;
  const leaveType = document.querySelector('input[name="leave-type"]:checked').value;

  if (!date) {
    showToast('Please select a date', 'error');
    return;
  }

  let leaves = getLeaves();

  // Check if leave for this date already exists
  if (leaves.some(leave => leave.date === date)) {
    showToast('Leave for this date already exists', 'error');
    return;
  }

  leaves.push({ date, type: leaveType });
  saveLeaves(leaves);

  // Clear form
  $('leave-date').value = '';

  showToast('Leave added successfully!', 'success');
  refreshDash();
}

// ---------- SAVE HOLIDAY ----------
function saveHoliday(){
  const date = $('holiday-date').value;
  
  if (!date) {
    showToast('Please select a date', 'error');
    return;
  }
  
  let holidays = getHolidays(currentYear);
  
  // Check if holiday for this date already exists
  if (holidays.includes(date)) {
    showToast('Holiday for this date already exists', 'error');
    return;
  }
  
  holidays.push(date);
  saveHolidays(currentYear, holidays);
  
  // Clear form
  $('holiday-date').value = '';
  
  showToast('Holiday added successfully!', 'success');
  refreshDash();
}

// ---------- SET DEFAULT DATE ----------
function setDefaultDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = pad(today.getMonth() + 1);
  const day = pad(today.getDate());
  $('date').value = `${year}-${month}-${day}`;
}

// ---------- GET CURRENT TIME ----------
function getCurrentTime() {
  const now = new Date();
  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());
  return `${hours}:${minutes}`;
}

// ---------- SET CURRENT TIME ----------
function setCurrentTime(inputId) {
  const input = $(inputId);
  if (input) {
    input.value = getCurrentTime();
    // Trigger input event to update any listeners
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

// ---------- QUARTER NAVIGATION ----------
function navigateQuarter(direction) {
  currentQuarter += direction;
  
  if (currentQuarter > 4) {
    currentQuarter = 1;
    currentYear++;
  } else if (currentQuarter < 1) {
    currentQuarter = 4;
    currentYear--;
  }
  
  refreshQuarter();
  refreshYearly();
}

// ---------- YEAR NAVIGATION ----------
function navigateYear(direction) {
  currentYear += direction;
  refreshQuarter();
  refreshYearly();
}

// ---------- MONTH NAVIGATION ----------
function navigateMonth(direction) {
  currentMonth += direction;
  
  if (currentMonth > 12) {
    currentMonth = 1;
    currentYear++;
  } else if (currentMonth < 1) {
    currentMonth = 12;
    currentYear--;
  }
  
  refreshMonthly();
  refreshQuarter();
  refreshYearly();
}

// ---------- CSV UPLOAD ----------
function handleCSVUpload(event) {
  const file = event.target.files[0];
  if (!file) {
    return;
  }
  
  if (!file.name.endsWith('.csv')) {
    showToast('Please select a CSV file', 'error');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const content = e.target.result;
      const lines = content.split('\n');
      let importedCount = 0;
      let skippedCount = 0;
      let log = getLog();
      
      lines.forEach((line, index) => {
        // Skip header row
        if (index === 0 && line.toLowerCase().includes('date')) {
          return;
        }
        
        const trimmedLine = line.trim();
        if (!trimmedLine) {
          return;
        }
        
        const parts = trimmedLine.split(',');
        
        // Support both old format (date,hours) and new format (date,checkin,checkout,hours)
        if (parts.length < 2) {
          skippedCount++;
          return;
        }
        
        const date = parts[0].trim();
        
        // Validate date format (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
          skippedCount++;
          return;
        }
        
        let hours, checkin, checkout;
        
        if (parts.length >= 4) {
          // New format: date,checkin,checkout,hours
          checkin = parts[1].trim();
          checkout = parts[2].trim();
          hours = parseFloat(parts[3].trim());
          
          // Validate time format (HH:MM)
          const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
          if (!timeRegex.test(checkin) || !timeRegex.test(checkout)) {
            skippedCount++;
            return;
          }
        } else {
          // Old format: date,hours
          hours = parseFloat(parts[1].trim());
          // Generate default times
          checkin = '09:00';
          const checkoutHour = 9 + hours;
          checkout = `${String(Math.floor(checkoutHour)).padStart(2, '0')}:${String(Math.round((checkoutHour % 1) * 60)).padStart(2, '0')}`;
        }
        
        // Validate hours (cap at 10)
        if (isNaN(hours) || hours < 0) {
          skippedCount++;
          return;
        }
        hours = Math.min(hours, 10); // Cap at 10 hours
        
        // Check if entry already exists
        const existingIndex = log.findIndex(entry => entry.date === date);
        if (existingIndex !== -1) {
          log[existingIndex].hours = hours;
          log[existingIndex].checkin = checkin;
          log[existingIndex].checkout = checkout;
        } else {
          log.push({ date, hours, checkin, checkout });
        }
        
        importedCount++;
      });
      
      saveLog(log);
      refreshDash();
      
      if (importedCount > 0) {
        showToast(`Successfully imported ${importedCount} entries${skippedCount > 0 ? `, skipped ${skippedCount} invalid rows` : ''}`, 'success');
      } else {
        showToast('No valid entries found in CSV file', 'warning');
      }
      
      // Reset file input
      event.target.value = '';
      
    } catch (error) {
      showToast('Error reading CSV file: ' + error.message, 'error');
      event.target.value = '';
    }
  };
  
  reader.onerror = function() {
    showToast('Error reading file', 'error');
    event.target.value = '';
  };
  
  reader.readAsText(file);
}

// ---------- CSV DOWNLOAD ----------
function downloadCSV() {
  const log = getLog();
  
  if (log.length === 0) {
    showToast('No data to export', 'warning');
    return;
  }
  
  // Sort by date
  log.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  // Create CSV content with checkin and checkout times
  let csvContent = 'date,checkin,checkout,hours\n';
  log.forEach(entry => {
    // If entry has checkin/checkout, use them; otherwise generate defaults
    const checkin = entry.checkin || '09:00';
    const checkout = entry.checkout || (() => {
      const checkoutHour = 9 + entry.hours;
      return `${String(Math.floor(checkoutHour)).padStart(2, '0')}:${String(Math.round((checkoutHour % 1) * 60)).padStart(2, '0')}`;
    })();
    
    csvContent += `${entry.date},${checkin},${checkout},${entry.hours.toFixed(1)}\n`;
  });
  
  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `attendance_${currentYear}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
  
  showToast(`Exported ${log.length} entries to CSV`, 'success');
}

// ---------- TAB SWITCHING ----------
function initTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');
  
  tabBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      const tabId = this.getAttribute('data-tab');
      
      // Remove active class from all buttons and panels
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));
      
      // Add active class to clicked button and corresponding panel
      this.classList.add('active');
      document.getElementById('tab-' + tabId).classList.add('active');
    });
  });
}

// ---------- INIT ----------
document.addEventListener('DOMContentLoaded', function() {
  // Migrate old data from 'att_log' to 'log' if needed
  migrateOldData();
  
  // Set default date
  setDefaultDate();
  
  // Initialize tabs
  initTabs();
  
  // Add event listeners (PL days are now calculated automatically from leave entries)
  
  // Form submission
  $('entry-form').addEventListener('submit', function(e) {
    e.preventDefault();
    saveEntry();
  });
  
  // Leave form submission
  $('leave-form').addEventListener('submit', function(e) {
    e.preventDefault();
    saveLeave();
  });
  
  // Holiday form submission
  $('holiday-form').addEventListener('submit', function(e) {
    e.preventDefault();
    saveHoliday();
  });
  
  // Cancel edit button
  $('cancel-edit').addEventListener('click', cancelEdit);
  
  // Quarter navigation
  $('prev-quarter').addEventListener('click', () => navigateQuarter(-1));
  $('next-quarter').addEventListener('click', () => navigateQuarter(1));
  
  // Year navigation
  $('prev-year').addEventListener('click', () => navigateYear(-1));
  $('next-year').addEventListener('click', () => navigateYear(1));
  
  // Month navigation
  $('prev-month').addEventListener('click', () => navigateMonth(-1));
  $('next-month').addEventListener('click', () => navigateMonth(1));
  
  // CSV upload
  $('csv-upload').addEventListener('change', handleCSVUpload);
  
  // CSV download
  $('csv-download').addEventListener('click', downloadCSV);
  
  // Load more button
  $('load-more-btn').addEventListener('click', function() {
    displayedLogEntries += 10;
    renderTable();
  });
  
  // Now buttons for time inputs
  $('checkin-now').addEventListener('click', function() {
    setCurrentTime('checkin');
  });
  
  $('checkout-now').addEventListener('click', function() {
    setCurrentTime('checkout');
  });
  
  // Deduction card click handler for Dashboard
  $('d-pl').addEventListener('click', () => showDeductionDetails());
  $('d-pl').style.cursor = 'pointer';
  $('d-pl').title = 'Click to see deduction details';
  
  // Deduction card click handler for Quarterly view
  $('q-deduction').addEventListener('click', () => {
    // Show deduction for each month in the quarter
    const months = getQuarterMonths(currentQuarter);
    months.forEach(month => {
      showDeductionDetails(currentYear, month);
    });
  });
  $('q-deduction').style.cursor = 'pointer';
  $('q-deduction').title = 'Click to see deduction details';
  
  // Deduction card click handler for Yearly view
  $('y-deduction').addEventListener('click', () => {
    // Show deduction for each quarter in the year
    for (let quarter = 1; quarter <= 4; quarter++) {
      const months = getQuarterMonths(quarter);
      months.forEach(month => {
        showDeductionDetails(currentYear, month);
      });
    }
  });
  $('y-deduction').style.cursor = 'pointer';
  $('y-deduction').title = 'Click to see deduction details';
  
  // Deduction card click handler for Monthly view
  $('m-deduction').addEventListener('click', () => showDeductionDetails(currentYear, currentMonth));
  $('m-deduction').style.cursor = 'pointer';
  $('m-deduction').title = 'Click to see deduction details';
  
  // Daily hours input
  $('daily-hours').value = getDailyHours();
  $('save-daily-hours').addEventListener('click', function() {
    const hours = parseFloat($('daily-hours').value);
    if (isNaN(hours) || hours < 1 || hours > 24) {
      showToast('Please enter a valid number between 1 and 24', 'error');
      return;
    }
    saveDailyHours(hours);
    showToast('Daily hours updated successfully!', 'success');
    refreshDash();
  });
  
  // Add input animations
  const inputs = document.querySelectorAll('input');
  inputs.forEach(input => {
    input.addEventListener('focus', function() {
      this.parentElement.classList.add('focused');
    });
    input.addEventListener('blur', function() {
      this.parentElement.classList.remove('focused');
    });
  });
  
  // Initial render
  refreshDash();
});
