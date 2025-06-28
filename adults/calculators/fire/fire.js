// --- Globals ---
const tabOrder = ['assumptions', 'basic', 'cashflow', 'goals', 'advanced', 'results'];
let currentActiveTabIndex = 0;
window.fireData = null;
let chartInstances = {};
const LOCAL_STORAGE_KEY = 'fireCalculatorData_v6';

// --- Application State Management ---
class FIREStateManager {
  constructor() {
    this.state = {};
    this.sessionStartTime = Date.now();
    this.tabsVisited = new Set();
  }

  // Update state with new data
  updateState(newData) {
    this.state = { ...this.state, ...newData };
  }

  // Format numbers in Indian currency format
  formatIndianCurrency(amount) {
    if (amount === 0) return '0';
    if (amount < 1000) return Math.round(amount).toString();
    if (amount < 100000) return Math.round(amount / 1000) + 'K';
    if (amount < 10000000) return Math.round(amount / 100000) + 'L';
    return Math.round(amount / 10000000) + 'Cr';
  }

  // Flatten nested objects for analytics
  flattenObject(obj, prefix = '') {
    const flattened = {};
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const newKey = prefix ? `${prefix}_${key}` : key;
        
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
          Object.assign(flattened, this.flattenObject(obj[key], newKey));
        } else if (Array.isArray(obj[key])) {
          flattened[`${newKey}_count`] = obj[key].length;
        } else {
          // Format numbers appropriately
          if (typeof obj[key] === 'number') {
            if (key.includes('age') || key.includes('years') || key.includes('count') || key.includes('percent')) {
              flattened[newKey] = Math.round(obj[key]);
            } else if (key.includes('rate') || key.includes('factor')) {
              flattened[newKey] = Math.round(obj[key] * 100);
            } else if (key.includes('value') || key.includes('amount') || key.includes('income') || key.includes('expense') || key.includes('corpus') || key.includes('number')) {
              flattened[newKey] = this.formatIndianCurrency(obj[key]);
            } else {
              flattened[newKey] = Math.round(obj[key]);
            }
          } else {
            flattened[newKey] = obj[key];
          }
        }
      }
    }
    
    return flattened;
  }

  // Get current state for analytics
  getAnalyticsState() {
    const baseState = {
      session_duration: Math.round((Date.now() - this.sessionStartTime) / 1000),
      tabs_visited: this.tabsVisited.size,
      timestamp: new Date().toISOString()
    };

    const flattenedState = this.flattenObject(this.state);
    return { ...baseState, ...flattenedState };
  }

  // Track tab visit
  trackTab(tabId) {
    this.tabsVisited.add(tabId);
  }

  // Send state to analytics (subtle)
  sendToAnalytics(eventName = 'app_state_update') {
    if (typeof gtag !== 'undefined') {
      const analyticsData = this.getAnalyticsState();
      
      gtag('event', eventName, {
        event_category: 'FIRE Calculator',
        event_label: 'State Update',
        custom_map: analyticsData
      });
    }
  }
}

// Initialize state manager
const stateManager = new FIREStateManager();

// --- Mobile Navigation ---
function toggleMobileNav() {
    const mobileNav = document.getElementById('mobile-nav');
    const overlay = document.getElementById('nav-overlay');
    const hamburger = document.getElementById('hamburger-menu');
    
    if (mobileNav.classList.contains('active')) {
        mobileNav.classList.remove('active');
        overlay.classList.remove('active');
        hamburger.classList.remove('active');
    } else {
        mobileNav.classList.add('active');
        overlay.classList.add('active');
        hamburger.classList.add('active');
    }
}

// --- Navigation Logic ---
function goToNextTab() {
    const currentTab = document.querySelector('.tab.active');
    const currentIndex = tabOrder.indexOf(currentTab.dataset.tab);
    if (currentIndex < tabOrder.length - 1) {
        showTab(tabOrder[currentIndex + 1]);
    }
}

function goToPreviousTab() {
    const currentTab = document.querySelector('.tab.active');
    const currentIndex = tabOrder.indexOf(currentTab.dataset.tab);
    if (currentIndex > 0) {
        showTab(tabOrder[currentIndex - 1]);
    }
}

function showTab(tabId) {
    // Validate current tab before proceeding
    if (currentActiveTabIndex < tabOrder.indexOf('results')) {
        if (!validateTab(tabOrder[currentActiveTabIndex])) return;
    }

    currentActiveTabIndex = tabOrder.indexOf(tabId);

    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
    });
    
    // Remove active class from all tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected tab content
    const selectedContent = document.getElementById(tabId);
    if (selectedContent) {
        selectedContent.classList.remove('hidden');
    }
    
    // Add active class to selected tab
    const selectedTab = document.querySelector(`[data-tab="${tabId}"]`);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Handle results tab
    if (tabId === 'results') {
        calculateFIRE();
        if (window.fireData) {
            document.getElementById('initial-results-message').classList.add('hidden');
            document.getElementById('actual-results-content').classList.remove('hidden');
            updateUIAndCharts(window.fireData);
        } else {
            document.getElementById('initial-results-message').classList.remove('hidden');
            document.getElementById('actual-results-content').classList.add('hidden');
        }
    }
    
    // Close mobile nav if open
    const mobileNav = document.getElementById('mobile-nav');
    const overlay = document.getElementById('nav-overlay');
    const hamburger = document.getElementById('hamburger-menu');
    if (mobileNav.classList.contains('active')) {
        mobileNav.classList.remove('active');
        overlay.classList.remove('active');
        hamburger.classList.remove('active');
    }
    
    // Track tab visit
    stateManager.trackTab(tabId);
    
    // Update state and send to analytics
    stateManager.updateState({ current_tab: tabId });
    stateManager.sendToAnalytics('tab_visit');
    
    // Scroll to top smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    // Track initial page load
    stateManager.sendToAnalytics('page_view');
    
    // Set up navigation event listeners
    const hamburgerBtn = document.getElementById('hamburger-menu');
    const navOverlay = document.getElementById('nav-overlay');
    const allNavLinks = document.querySelectorAll('.desktop-nav .tab, .mobile-nav .tab');
    
    hamburgerBtn.addEventListener('click', toggleMobileNav);
    navOverlay.addEventListener('click', toggleMobileNav);
    
    allNavLinks.forEach(tab => {
        tab.addEventListener('click', (event) => {
            event.preventDefault();
            const targetTabId = event.currentTarget.getAttribute('data-tab');
            showTab(targetTabId);
            const mobileNav = document.getElementById('mobile-nav');
            if (mobileNav.classList.contains('active')) {
                toggleMobileNav();
            }
        });
    });
    
    // Set up share button event listener
    const shareButton = document.getElementById('share-screenshot-btn');
    if (shareButton) {
        shareButton.addEventListener('click', shareResults);
    }
    
    // Set up share modal event listeners
    const shareModal = document.getElementById('share-modal-overlay');
    const closeShareModal = document.getElementById('close-share-modal');
    const sharePlatformBtns = document.querySelectorAll('.share-platform-btn');
    
    if (closeShareModal) {
        closeShareModal.addEventListener('click', () => {
            shareModal.classList.add('hidden');
        });
    }
    
    if (shareModal) {
        shareModal.addEventListener('click', (e) => {
            if (e.target === shareModal) {
                shareModal.classList.add('hidden');
            }
        });
    }
    
    sharePlatformBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const platform = btn.dataset.platform;
            const blobUrl = shareModal.dataset.screenshotBlob;
            if (blobUrl) {
                fetch(blobUrl)
                    .then(res => res.blob())
                    .then(blob => shareToPlatform(platform, blob));
            }
        });
    });
    
    // Initialize with assumptions tab as default
    showTab('assumptions');
    
    // Load saved form data
    loadFormData();
    
    // Initialize expense displays
    updateExpenseDisplays();
});

// --- Validation ---
function validateTab(tabId) {
    let isValid = true;
    const inputs = document.querySelectorAll(`#${tabId} input[type="number"], #${tabId} select`);
    inputs.forEach(input => {
        const isNumericInput = input.type === 'number';
        if (isNumericInput) {
            const val = parseFloat(input.value);
            if (input.value.trim() === '' || isNaN(val) || val < 0) {
                input.classList.add('invalid');
                isValid = false;
            } else {
                input.classList.remove('invalid');
            }
        }
    });
    // Also validate expense to income ratio when validating basic tab
    if (tabId === 'basic') {
        if (!checkExpenseToIncomeRatio()) {
            isValid = false;
        }
    }
    if (!isValid) showMessage('Please fill in all fields with valid numbers and address any warnings.', 'error');
    return isValid;
}

// --- Helper Functions ---
const formatCurrency = (amount) => {
    if (isNaN(amount) || amount === null) return '₹--';
    const sign = amount < 0 ? '-' : '';
    amount = Math.abs(amount);
    if (amount >= 1e7) return `${sign}₹${(amount / 1e7).toFixed(2)} Cr`;
    if (amount >= 1e5) return `${sign}₹${(amount / 1e5).toFixed(2)} L`;
    return `${sign}₹${new Intl.NumberFormat('en-IN').format(Math.round(amount))}`;
};

const showMessage = (message, type = 'info') => {
    const box = document.getElementById('message-box');
    box.textContent = message;
    box.className = `message-box ${type}`;
    box.classList.remove('hidden');
    setTimeout(() => box.classList.add('hidden'), 5000);
};

// --- Input Gathering ---
function getInputs() {
    const getVal = id => parseFloat(document.getElementById(id)?.value) || 0;
    const getRate = id => getVal(id) / 100;
    const getStr = id => document.getElementById(id)?.value;

    // Gather goals
    const goals = [];
    document.querySelectorAll('.goal-row').forEach(row => {
        const name = row.querySelector('.goal-name').value;
        const value = parseFloat(row.querySelector('.goal-value').value) || 0;
        const years = parseFloat(row.querySelector('.goal-years').value) || 0;
        const inflation = (parseFloat(row.querySelector('.goal-inflation').value) || 0) / 100;
        if (name && value > 0 && years > 0) {
            goals.push({ name, value, years, inflation });
        }
    });

    // Gather monthly detailed expenses
    const monthlyExpensesList = [];
    document.querySelectorAll('.expense-row').forEach(row => {
        const amountInput = row.querySelector('.expense-input');
        const yearsInput = row.querySelector('.expense-years-input');
        const amount = parseFloat(amountInput.value) || 0;
        const yearsLeft = yearsInput ? (parseFloat(yearsInput.value) || 99) : 99;
        if (amount > 0) {
            monthlyExpensesList.push({ amount, yearsLeft });
        }
    });

    // Gather annual detailed expenses
    const annualExpensesList = [];
    document.querySelectorAll('.annual-expense-row').forEach(row => {
        const amountInput = row.querySelector('.annual-expense-input');
        const yearsInput = row.querySelector('.expense-years-input');
        const amount = parseFloat(amountInput.value) || 0;
        const yearsLeft = yearsInput ? (parseFloat(yearsInput.value) || 99) : 99;
        if (amount > 0) {
            annualExpensesList.push({ amount, yearsLeft });
        }
    });

    // Combine into a single list of detailed expenses with monthly amounts
    const detailedExpenses = [];
    monthlyExpensesList.forEach(exp => detailedExpenses.push({ amount: exp.amount, yearsLeft: exp.yearsLeft }));
    annualExpensesList.forEach(exp => detailedExpenses.push({ amount: exp.amount / 12, yearsLeft: exp.yearsLeft }));

    const totalMonthlyFromMonthly = monthlyExpensesList.reduce((sum, exp) => sum + exp.amount, 0);
    const totalMonthlyFromAnnual = annualExpensesList.reduce((sum, exp) => sum + (exp.amount / 12), 0);
    const totalMonthlyExpenses = totalMonthlyFromMonthly + totalMonthlyFromAnnual;

    // Gather healthcare buffer details
    const healthcareBuffer = {
        value: getVal('healthcare-buffer-value'),
        age: getVal('healthcare-buffer-age'),
        inflation: getRate('healthcare-buffer-inflation')
    };

    return {
        userName: getStr('user-name') || '',
        currentAge: getVal('current-age'),
        targetAge: getVal('target-age'),
        annualExpenses: totalMonthlyExpenses * 12, // Use calculated value
        withdrawalRate: getRate('withdrawal-rate'),
        inflationRate: getRate('inflation-rate'),
        monthlyIncome: getVal('monthly-income'),
        monthlyExpenses: totalMonthlyExpenses,
        detailedExpenses: detailedExpenses,
        lifeExpectancy: getVal('life-expectancy'),
        emergencyFund: getVal('emergency-fund'),
        bufferPercentage: getRate('buffer-percentage'),
        // Tax fields
        tax: {
            equityShortCurrent: getRate('tax-equity-short-current'),
            equityLongCurrent: getRate('tax-equity-long-current'),
            debtShortCurrent: getRate('tax-debt-short-current'),
            debtLongCurrent: getRate('tax-debt-long-current'),
            equityShortRetire: getRate('tax-equity-short-retire'),
            equityLongRetire: getRate('tax-equity-long-retire'),
            debtShortRetire: getRate('tax-debt-short-retire'),
            debtLongRetire: getRate('tax-debt-long-retire')
        },
        // Lifestyle & risk fields
        lifestyle: {
            now: parseFloat(getStr('lifestyle-factor-now')),
            retire: parseFloat(getStr('lifestyle-factor-retire'))
        },
        riskTolerance: {
            now: getStr('risk-tolerance-now'),
            retire: getStr('risk-tolerance-retire')
        },
        portfolio: {
            equity_in: { value: getVal('value-equity-in'), return: getRate('return-equity-in'), contribution: getVal('contribution-equity-in') },
            equity_gl: { value: getVal('value-equity-gl'), return: getRate('return-equity-gl'), contribution: getVal('contribution-equity-gl') },
            debt: { value: getVal('value-debt'), return: getRate('return-debt'), contribution: getVal('contribution-debt') },
            real_estate: { value: getVal('value-real-estate'), return: getRate('return-real-estate'), contribution: getVal('contribution-real-estate') },
            epf: { value: getVal('value-epf'), return: getRate('return-epf'), contribution: getVal('contribution-epf') },
            nps: { value: getVal('value-nps'), return: getRate('return-nps'), contribution: getVal('contribution-nps') }
        },
        sipStepUpPercent: getRate('sip-stepup-percent'),
        stp: {
            amount: getVal('stp-amount'),
            frequency: getStr('stp-frequency')
        },
        healthcareBuffer,
        goals
    };
}

function updateTotalCorpus() {
    // Sum values from portfolio input fields directly
    const ids = [
        'value-equity-in',
        'value-equity-gl',
        'value-debt',
        'value-real-estate',
        'value-epf',
        'value-nps',
        'value-other' // Add other investments
    ];
    let totalCorpus = 0;
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) totalCorpus += parseFloat(el.value) || 0;
    });
    document.getElementById('total-corpus').textContent = `Total Corpus: ${formatCurrency(totalCorpus)}`;
}

// --- Expense/Income Linkage and Warning ---
// This function is largely simplified as monthly and annual expenses are now derived from detailed expenses
function linkExpenses() {
    const monthlyExpensesTotal = parseFloat(document.getElementById('monthly-expenses-total').value) || 0;
    document.getElementById('annual-expenses').value = (monthlyExpensesTotal * 12).toFixed(2);
}

function updateTotalExpenses() {
    // Monthly expenses
    const monthlyExpenseInputs = document.querySelectorAll('.expense-input');
    let totalFromMonthly = 0;
    monthlyExpenseInputs.forEach(input => {
        totalFromMonthly += parseFloat(input.value) || 0;
    });

    // Annual expenses
    const annualExpenseInputs = document.querySelectorAll('.annual-expense-input');
    let totalFromAnnual = 0;
    annualExpenseInputs.forEach(input => {
        totalFromAnnual += parseFloat(input.value) || 0;
    });

    // Combined total
    let totalMonthlyExpenses = 0;
    totalMonthlyExpenses = totalFromMonthly + (totalFromAnnual / 12);

    // No DOM updates here, just return the value for use elsewhere
    return totalMonthlyExpenses;
}

function updateExpenseDisplays() {
    const totalMonthly = updateTotalExpenses();
    const totalAnnual = totalMonthly * 12;
    const monthlyDisplay = document.getElementById('monthly-expenses-total-display');
    const annualDisplay = document.getElementById('annual-expenses-display');
    if (monthlyDisplay) monthlyDisplay.textContent = `Total Monthly Expenses: ${formatCurrency(totalMonthly)}`;
    if (annualDisplay) annualDisplay.textContent = `Total Annual Expenses: ${formatCurrency(totalAnnual)}`;
}

function checkExpenseToIncomeRatio() {
    const monthlyIncome = parseFloat(document.getElementById('monthly-income').value) || 0;
    // Use the calculated total monthly expenses
    const lifestyleMultiplier = parseFloat(document.getElementById('lifestyle-factor-now')?.value) || 1.0;
    const totalMonthlyExpenses = updateTotalExpenses() * lifestyleMultiplier;

    if (monthlyIncome <= 0) {
        return true;
    }

    if ((totalMonthlyExpenses / monthlyIncome) > 0.7) {
        showMessage('Warning: Your total monthly expenses (adjusted for lifestyle) exceed 70% of your income. This may make it harder to reach your FIRE goal.', 'warning');
        return false;
    }
    return true;
}

// --- Main Calculation Logic ---
function calculateFIRE() {
    const inputs = getInputs();
    const initialTotalMonthlyContributions = Object.values(inputs.portfolio).reduce((sum, asset) => sum + asset.contribution, 0);
    let investibleSurplus = inputs.monthlyIncome - inputs.monthlyExpenses - initialTotalMonthlyContributions;
    if (investibleSurplus < 0) {
        showMessage('Expenses plus portfolio contributions exceed income. Cannot invest.', 'error');
        window.fireData = null;
        return;
    }
    const yearsToSimulate = inputs.targetAge - inputs.currentAge;
    if (yearsToSimulate <= 0) {
        showMessage('Target age must be greater than current age.', 'error');
        window.fireData = null;
        return;
    }
    // Use post-retirement lifestyle multiplier for retirement expenses
    const lifestyleMultiplierRetire = inputs.lifestyle?.retire || 1.0;
    const monthlyRetirementExpenses = inputs.detailedExpenses.reduce((total, exp) => {
        if (exp.yearsLeft >= yearsToSimulate) {
            return total + exp.amount;
        }
        return total;
    }, 0) * lifestyleMultiplierRetire;
    const annualRetirementExpenses = monthlyRetirementExpenses * 12;
    const inflatedAnnualExpenses = annualRetirementExpenses * Math.pow(1 + inputs.inflationRate, yearsToSimulate);
    const yearsToHealthcare = inputs.healthcareBuffer.age - inputs.currentAge;
    const futureHealthcareValue = yearsToHealthcare > 0 ?
        inputs.healthcareBuffer.value * Math.pow(1 + inputs.healthcareBuffer.inflation, yearsToHealthcare) : 0;
    const totalFutureGoalValues = inputs.goals.reduce((total, goal) => {
        const futureValue = goal.value * Math.pow(1 + goal.inflation, goal.years);
        return total + futureValue;
    }, 0);
    const inflatedFireNumber = (inflatedAnnualExpenses / inputs.withdrawalRate) + totalFutureGoalValues + futureHealthcareValue;
    // --- Portfolio Simulation Logic (restored) ---
    let simulationPortfolio = JSON.parse(JSON.stringify(inputs.portfolio));
    let portfolioHistory = [];
    let currentMonthlyContributions = {};
    for (const key in inputs.portfolio) {
        currentMonthlyContributions[key] = inputs.portfolio[key].contribution;
    }
    portfolioHistory.push({
        year: 0,
        ...Object.keys(simulationPortfolio).reduce((acc, key) => ({ ...acc, [key]: simulationPortfolio[key].value }), {})
    });
    const getTransfersPerMonth = () => {
        if (!inputs.stp || inputs.stp.frequency === 'none' || inputs.stp.amount <= 0) return 0;
        if (inputs.stp.frequency === 'daily') return 22;
        if (inputs.stp.frequency === 'weekly') return 4;
        if (inputs.stp.frequency === 'monthly') return 1;
        return 0;
    };
    for (let month = 1; month <= yearsToSimulate * 12; month++) {
        if ((month - 1) % 12 === 0 && month > 1) {
            for (const key in currentMonthlyContributions) {
                currentMonthlyContributions[key] *= (1 + inputs.sipStepUpPercent);
            }
        }
        let transfers = getTransfersPerMonth();
        for (let i = 0; i < transfers; i++) {
            let transferAmount = Math.min(inputs.stp.amount, simulationPortfolio.debt.value);
            if (transferAmount > 0) {
                simulationPortfolio.debt.value -= transferAmount;
                simulationPortfolio.equity_in.value += transferAmount;
            }
        }
        for (const key in simulationPortfolio) {
            if (currentMonthlyContributions[key] !== undefined) {
                simulationPortfolio[key].value += currentMonthlyContributions[key];
            }
        }
        for (const key in simulationPortfolio) {
            simulationPortfolio[key].value *= (1 + simulationPortfolio[key].return / 12);
        }
        if (month % 12 === 0) {
            portfolioHistory.push({
                year: month / 12,
                ...Object.keys(simulationPortfolio).reduce((acc, key) => ({ ...acc, [key]: simulationPortfolio[key].value }), {})
            });
        }
    }
    const finalCorpus = Object.values(simulationPortfolio).reduce((s, a) => s + a.value, 0);
    const finalAllocation = Object.keys(simulationPortfolio).reduce((acc, key) => ({ ...acc, [key]: simulationPortfolio[key].value }), {});
    // --- End Portfolio Simulation Logic ---
    const fireAge = inputs.targetAge;
    const retirementDuration = (inputs.lifeExpectancy || 85) - (inputs.targetAge || 0);
    const monthlyExpenses = inputs.monthlyExpenses;
    const annualExpenses = monthlyExpenses * 12;
    const withdrawalRate = inputs.withdrawalRate;
    window.fireData = {
        ...inputs,
        fireAge,
        retirementDuration,
        monthlyExpenses,
        annualExpenses,
        withdrawalRate,
        inflatedFireNumber,
        finalCorpus,
        corpusShortfall: finalCorpus - inflatedFireNumber,
        unutilizedMonthlyInvestment: investibleSurplus,
        portfolioHistory,
        finalAllocation
    };

    saveFormData();
}

// --- UI Updates & Persistence ---
function updateUIAndCharts(data) {
    // Update state with results data
    stateManager.updateState({
      results_generated: true,
      fire_achievable: data.corpusShortfall <= 0,
      fire_age: data.fireAge,
      years_to_fire: data.yearsToFire,
      retirement_duration: data.retirementDuration,
      inflated_fire_number: data.inflatedFireNumber,
      final_corpus: data.finalCorpus,
      corpus_shortfall: data.corpusShortfall,
      unutilized_monthly_investment: data.unutilizedMonthlyInvestment,
      monthly_expenses: data.monthlyExpenses,
      annual_expenses: data.annualExpenses,
      portfolio_data: data.portfolio,
      final_allocation: data.finalAllocation,
      portfolio_history: data.portfolioHistory
    });
    
    // Send completion event to analytics
    stateManager.sendToAnalytics('results_completion');
    
    // Display user greeting if name is provided
    const userGreetingEl = document.getElementById('user-greeting');
    if (userGreetingEl) {
        if (data.userName && data.userName.trim()) {
            userGreetingEl.innerHTML = `<h3>Congratulations ${data.userName}! 🎉</h3><p>You've completed your FIRE journey analysis. Here are your personalized results:</p>`;
            userGreetingEl.style.display = 'block';
        } else {
            userGreetingEl.innerHTML = `<h3>Congratulations! 🎉</h3><p>You've completed your FIRE journey analysis. Here are your personalized results:</p>`;
            userGreetingEl.style.display = 'block';
        }
    }

    document.getElementById('fire-age').textContent = data.fireAge ?? data.targetAge ?? '--';
    document.getElementById('years-to-fire').textContent = data.yearsToFire ?? (data.targetAge && data.currentAge ? data.targetAge - data.currentAge : '--');
    document.getElementById('retirement-duration-result').textContent = data.retirementDuration ?? ((data.lifeExpectancy && data.targetAge) ? data.lifeExpectancy - data.targetAge : '--');
    document.getElementById('inflated-fire-number').textContent = formatCurrency(data.inflatedFireNumber);
    document.getElementById('final-corpus').textContent = formatCurrency(data.finalCorpus);
    const shortfallEl = document.getElementById('corpus-shortfall');
    shortfallEl.textContent = formatCurrency(data.corpusShortfall);
    shortfallEl.style.color = data.corpusShortfall < 0 ? 'var(--fire-red)' : 'var(--success-green)';

    const unutilizedMoneyEl = document.getElementById('unutilized-money');
    unutilizedMoneyEl.textContent = formatCurrency(data.unutilizedMonthlyInvestment);
    unutilizedMoneyEl.style.color = data.unutilizedMonthlyInvestment > 0 ? 'var(--fire-blue)' : 'var(--text-secondary)';

    document.getElementById('monthly-expenses-total-result').textContent = formatCurrency(data.monthlyExpenses);
    document.getElementById('annual-expenses-result').textContent = formatCurrency(data.annualExpenses);

    Object.values(chartInstances).forEach(chart => chart.destroy());

    const labels = data.portfolioHistory.map(p => `Year ${p.year}`);
    const colors = {
        equity_in: '#FF6B35',
        equity_gl: '#4ECDC4',
        debt: '#FFD700',
        real_estate: '#8B5CF6',
        epf: '#4F46E5',
        nps: '#10B981',
        lean: '#10B981',
        regular: '#FF6B35',
        fat: '#8B5CF6'
    };
    const assetLabels = {
        equity_in: 'Indian Equity',
        equity_gl: 'Global Equity',
        debt: 'Debt',
        real_estate: 'Real Estate',
        epf: 'EPF',
        nps: 'NPS'
    };

    // 1. Portfolio Growth & Allocation Chart (Stacked Area)
    const portfolioGrowthData = {
        labels,
        datasets: Object.keys(data.finalAllocation).map(key => ({
            label: assetLabels[key],
            data: data.portfolioHistory.map(h => h[key]),
            borderColor: colors[key],
            backgroundColor: colors[key] + '80', // Add alpha for fill
            fill: true,
            tension: 0.4
        }))
    };
    chartInstances.portfolioGrowthChart = new Chart(document.getElementById('portfolioGrowthChart'), getChartConfig('stacked-area', portfolioGrowthData));

    // 2. Final Allocation Chart (Doughnut) - Use allocation at retirement
    let retirementIndex = data.yearsToFire ?? (data.targetAge && data.currentAge ? data.targetAge - data.currentAge : 0);
    if (retirementIndex < 0) retirementIndex = 0;
    const portfolioAtRetirement = data.portfolioHistory[retirementIndex] || data.portfolioHistory[data.portfolioHistory.length - 1];
    const allocationAtRetirement = {};
    Object.keys(assetLabels).forEach(key => {
        allocationAtRetirement[key] = portfolioAtRetirement[key] || 0;
    });
    // Update subtitle for asset allocation chart
    const subtitle = document.getElementById('asset-allocation-retirement-age');
    if (subtitle) {
        subtitle.textContent = `Asset Allocation at Retirement (Age ${data.fireAge ?? data.targetAge ?? '--'})`;
    }
    const finalAllocationData = {
        labels: Object.keys(allocationAtRetirement).map(key => assetLabels[key]),
        datasets: [{
            data: Object.values(allocationAtRetirement),
            backgroundColor: Object.keys(allocationAtRetirement).map(key => colors[key])
        }]
    };
    chartInstances.assetAllocationChart = new Chart(document.getElementById('assetAllocationChart'), getChartConfig('doughnut', finalAllocationData));

    // 3. STP Chart (Line) - Only show if frequency is not 'none'
    const stpChartContainer = document.getElementById('stp-chart-container');
    if (data.stp && data.stp.frequency && data.stp.frequency !== 'none') {
        stpChartContainer.style.display = '';
        const stpChartData = {
            labels,
            datasets: [
                {
                    label: 'Debt Balance',
                    data: data.portfolioHistory.map(h => h.debt),
                    borderColor: colors.debt,
                    fill: false,
                    tension: 0.4
                },
                {
                    label: 'Indian Equity Balance',
                    data: data.portfolioHistory.map(h => h.equity_in),
                    borderColor: colors.equity_in,
                    fill: false,
                    tension: 0.4
                }
            ]
        };
        chartInstances.stpChart = new Chart(document.getElementById('stpChart'), getChartConfig('line', stpChartData));
    } else {
        stpChartContainer.style.display = 'none';
    }

    // 4. Burn Down Chart (Post Retirement Corpus)
    // Simulate corpus burn down for Lean, Regular, Fat FIRE
    const burnDownLabels = [];
    const burnDownData = { lean: [], regular: [], fat: [] };
    const burnDownDataToday = { lean: [], regular: [], fat: [] };
    const multipliers = { lean: 0.7, regular: 1.0, fat: 1.5 };
    const years = 40; // Simulate 40 years post retirement
    // Calculate required corpus for each FIRE type
    const swr = data.withdrawalRate ?? 0.04;
    const inflation = data.inflationRate ?? 0.06;
    const requiredCorpus = {
        lean: (data.annualExpenses ?? 0) * multipliers.lean / swr,
        regular: (data.annualExpenses ?? 0) * multipliers.regular / swr,
        fat: (data.annualExpenses ?? 0) * multipliers.fat / swr
    };
    let annualReturn = 0.06; // Assume 6% post-retirement return
    for (let i = 0; i <= years; i++) {
        burnDownLabels.push(`Year ${i}`);
        for (const type of ['lean', 'regular', 'fat']) {
            if (i === 0) {
                burnDownData[type][i] = requiredCorpus[type];
                burnDownDataToday[type][i] = requiredCorpus[type];
            } else {
                // Previous corpus grows, then withdrawal
                const prev = burnDownData[type][i - 1];
                const withdrawal = (data.annualExpenses ?? 0) * multipliers[type];
                let futureValue = (prev - withdrawal) * (1 + annualReturn);
                burnDownData[type][i] = futureValue;
                // Discount the future value to today's value
                let todayValue = futureValue / Math.pow(1 + inflation, i);
                burnDownDataToday[type][i] = todayValue;
                if (i <= 5 && type === 'regular') {
                    console.log(`Year ${i}: Future Value = ${futureValue}, Today's Value = ${todayValue}`);
                }
            }
        }
    }
    chartInstances.burnDownChart = new Chart(document.getElementById('burnDownChart'), {
        type: 'line',
        data: {
            labels: burnDownLabels,
            datasets: [
                {
                    label: 'Lean FIRE',
                    data: burnDownData.lean,
                    borderColor: '#10B981',
                    fill: false,
                    tension: 0.4
                },
                {
                    label: 'Regular FIRE',
                    data: burnDownData.regular,
                    borderColor: '#FF6B35',
                    fill: false,
                    tension: 0.4
                },
                {
                    label: 'Fat FIRE',
                    data: burnDownData.fat,
                    borderColor: '#8B5CF6',
                    fill: false,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: 'var(--text-secondary)' } } },
            scales: {
                y: {
                    position: 'left',
                    title: { display: true, text: 'Future Value (₹)', color: 'var(--text-secondary)' },
                    ticks: { callback: (v) => formatCurrency(v), color: 'var(--text-secondary)' }
                },
                x: { ticks: { color: 'var(--text-secondary)' } }
            }
        }
    });
    // Burn Down Chart (Today's Value)
    chartInstances.burnDownChartToday = new Chart(document.getElementById('burnDownChartToday'), {
        type: 'line',
        data: {
            labels: burnDownLabels,
            datasets: [
                {
                    label: "Lean FIRE (Today's Value)",
                    data: burnDownDataToday.lean,
                    borderColor: '#10B981',
                    borderDash: [8, 4],
                    fill: false,
                    tension: 0.4
                },
                {
                    label: "Regular FIRE (Today's Value)",
                    data: burnDownDataToday.regular,
                    borderColor: '#FF6B35',
                    borderDash: [8, 4],
                    fill: false,
                    tension: 0.4
                },
                {
                    label: "Fat FIRE (Today's Value)",
                    data: burnDownDataToday.fat,
                    borderColor: '#8B5CF6',
                    borderDash: [8, 4],
                    fill: false,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: 'var(--text-secondary)' } } },
            scales: {
                y: {
                    position: 'left',
                    title: { display: true, text: "Today's Value (₹)", color: 'var(--text-secondary)' },
                    ticks: { callback: (v) => formatCurrency(v), color: 'var(--text-secondary)' }
                },
                x: { ticks: { color: 'var(--text-secondary)' } }
            }
        }
    });
}

function saveFormData() {
    const formData = {};
    document.querySelectorAll('input[id], select[id]').forEach(input => formData[input.id] = input.value);
    // Save goals separately
    const goals = [];
    document.querySelectorAll('.goal-row').forEach(row => {
        goals.push({
            name: row.querySelector('.goal-name').value,
            value: row.querySelector('.goal-value').value,
            years: row.querySelector('.goal-years').value,
            inflation: row.querySelector('.goal-inflation').value
        });
    });
    formData.goals = goals;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(formData));
}

function loadFormData() {
    try {
        const savedData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || {};
        if (savedData) {
            for (const key in savedData) {
                const el = document.getElementById(key);
                if (el) el.value = savedData[key];
            }
        }
        // Load goals
        if (savedData.goals && savedData.goals.length > 0) {
            const goalsContainer = document.getElementById('goals-container');
            goalsContainer.innerHTML = ''; // Clear default/existing
            savedData.goals.forEach(goal => addGoalRow(goal));
        }
    } catch (e) {
        console.error("Failed to load or parse form data from localStorage", e);
        localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
    // After loading, ensure initial calculation of totals
    updateTotalExpenses();
    updateTotalCorpus();
}

document.querySelectorAll('#basic input, #basic select, #cashflow input, #advanced input, #advanced select').forEach(input => {
    input.addEventListener('change', () => {
        if (input.classList.contains('expense-input') || input.classList.contains('annual-expense-input') || input.classList.contains('expense-years-input')) {
            updateTotalExpenses(); // Call this when any detailed expense changes
        } else if (input.id === 'monthly-income') {
            checkExpenseToIncomeRatio();
        } else if (input.id === 'current-age' || input.id === 'life-expectancy') {
            // Calculate retirement duration when age or life expectancy changes
        }
        if (input.closest('.asset-allocation-form')) updateTotalCorpus();
        saveFormData();
    });
});

// --- Dynamic Goals Logic ---
function addGoalRow(goal = {}) {
    const container = document.getElementById('goals-container');
    const goalRow = document.createElement('div');
    goalRow.className = 'goal-row';
    goalRow.innerHTML = `
        <div class="goal-inputs">
            <div class="form-group">
                <label>Goal Name</label>
                <input type="text" class="goal-name" placeholder="e.g., Down Payment" value="${goal.name || ''}">
            </div>
            <div class="form-group">
                <label>Today's Value (₹)</label>
                <input type="number" class="goal-value" placeholder="e.g., 1000000" value="${goal.value || ''}">
            </div>
            <div class="form-group">
                <label>Years from now</label>
                <input type="number" class="goal-years" placeholder="e.g., 5" value="${goal.years || ''}">
            </div>
            <div class="form-group">
                <label>Expected Inflation %</label>
                <input type="number" class="goal-inflation" placeholder="e.g., 8" value="${goal.inflation || ''}">
            </div>
        </div>
        <div class="goal-actions">
            <button class="remove-goal-btn"><i class="fas fa-trash"></i></button>
        </div>
    `;
    container.appendChild(goalRow);

    // Add event listeners for the new row
    goalRow.querySelector('.remove-goal-btn').addEventListener('click', () => {
        goalRow.remove();
        saveFormData();
        triggerResultUpdate();
    });
    goalRow.querySelectorAll('input').forEach(input => {
        input.addEventListener('change', saveFormData);
        input.addEventListener('input', triggerResultUpdate);
    });
}

document.getElementById('add-goal-btn').addEventListener('click', () => addGoalRow());

// --- Charting ---
function getChartConfig(type, data) {
    const baseOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: 'var(--text-secondary)' } } } };
    const scalesOptions = { y: { ticks: { callback: (v) => formatCurrency(v), color: 'var(--text-secondary)' } }, x: { ticks: { color: 'var(--text-secondary)' } } };

    if (type === 'line') {
        return { type: 'line', data, options: { ...baseOptions, scales: scalesOptions } };
    }
    if (type === 'stacked-area') {
        return { type: 'line', data, options: { ...baseOptions, scales: { ...scalesOptions, y: { ...scalesOptions.y, stacked: true } } } };
    }
    if (type === 'doughnut') {
        return { type: 'doughnut', data, options: { ...baseOptions, plugins: { ...baseOptions.plugins, legend: { position: 'bottom' } } } };
    }
}

// --- Real-time Result Updates ---
let resultUpdateTimeout;
function triggerResultUpdate() {
    // Clear existing timeout
    if (resultUpdateTimeout) {
        clearTimeout(resultUpdateTimeout);
    }
    
    // Set a new timeout to debounce the updates
    resultUpdateTimeout = setTimeout(() => {
        // Only recalculate if we're on the results tab and results are already computed
        const resultsTab = document.getElementById('results');
        const actualResultsContent = document.getElementById('actual-results-content');
        
        if (resultsTab && !resultsTab.classList.contains('hidden') && 
            actualResultsContent && !actualResultsContent.classList.contains('hidden') &&
            window.fireData) {
            // Recalculate with current inputs
            calculateFIRE();
            
            // Update state with new results
            if (window.fireData) {
                stateManager.updateState({
                    results_recalculated: true,
                    fire_achievable: window.fireData.corpusShortfall <= 0,
                    final_corpus: window.fireData.finalCorpus,
                    corpus_shortfall: window.fireData.corpusShortfall
                });
                stateManager.sendToAnalytics('results_recalculation');
            }
        }
    }, 500); // 500ms delay
}

// --- Share Functionality ---
function shareResults() {
    // Capture screenshot of results
    const resultsContent = document.getElementById('actual-results-content');
    if (!resultsContent) {
        showMessage('No results to share. Please calculate your FIRE journey first.', 'error');
        return;
    }

    // Show loading message
    showMessage('Preparing your results for sharing...', 'info');

    // Create a temporary container with dark background for better screenshot
    const tempContainer = document.createElement('div');
    tempContainer.style.cssText = `
        position: fixed;
        top: -9999px;
        left: -9999px;
        width: 800px;
        background: #1a1a1a;
        color: white;
        padding: 40px;
        border-radius: 20px;
        font-family: 'Inter', sans-serif;
        z-index: -1;
    `;

    // Clone the results content
    const clonedContent = resultsContent.cloneNode(true);
    
    // Remove navigation buttons from clone
    const navButtons = clonedContent.querySelector('.navigation-buttons');
    if (navButtons) navButtons.remove();

    // Add title to the screenshot
    const title = document.createElement('h1');
    title.textContent = '🔥 My FIRE Journey Results';
    title.style.cssText = `
        text-align: center;
        margin-bottom: 30px;
        color: #FF6B35;
        font-size: 2rem;
    `;
    
    tempContainer.appendChild(title);
    tempContainer.appendChild(clonedContent);
    document.body.appendChild(tempContainer);

    // Capture screenshot
    html2canvas(tempContainer, {
        backgroundColor: '#1a1a1a',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        width: 800,
        height: tempContainer.scrollHeight
    }).then(canvas => {
        // Remove temporary container
        document.body.removeChild(tempContainer);

        // Convert to blob
        canvas.toBlob(blob => {
            if (blob) {
                // Create file from blob
                const file = new File([blob], 'fire-results.png', { type: 'image/png' });
                
                // Try Web Share API first
                if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                    const userName = document.getElementById('user-name')?.value || 'User';
                    navigator.share({
                        title: `${userName}'s FIRE Journey Results`,
                        text: `Check out my FIRE (Financial Independence, Retire Early) journey! I can achieve financial independence at age ${document.getElementById('fire-age')?.textContent || '--'}.`,
                        files: [file],
                        url: window.location.href
                    }).catch(err => {
                        console.log('Web Share API failed:', err);
                        showSocialMediaModal(blob);
                    });
                } else {
                    // Fallback to social media modal
                    showSocialMediaModal(blob);
                }
            }
        }, 'image/png');
    }).catch(err => {
        console.error('Screenshot capture failed:', err);
        showMessage('Failed to capture screenshot. Please try again.', 'error');
    });
}

function showSocialMediaModal(blob) {
    const modal = document.getElementById('share-modal-overlay');
    
    // Store blob for later use
    modal.dataset.screenshotBlob = URL.createObjectURL(blob);
    
    // Show modal
    modal.classList.remove('hidden');
}

function shareToPlatform(platform, blob) {
    const userName = document.getElementById('user-name')?.value || 'User';
    const fireAge = document.getElementById('fire-age')?.textContent || '--';
    const shareText = `Check out my FIRE (Financial Independence, Retire Early) journey! I can achieve financial independence at age ${fireAge}.`;
    const url = window.location.href;
    
    let shareUrl = '';
    
    switch (platform) {
        case 'whatsapp':
            shareUrl = `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + url)}`;
            break;
        case 'facebook':
            shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(shareText)}`;
            break;
        case 'twitter':
            shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`;
            break;
        case 'linkedin':
            // Use LinkedIn's direct post URL which is more reliable
            const linkedinText = `${shareText}\n\n${url}`;
            shareUrl = `https://www.linkedin.com/feed/update/urn:li:activity:${Date.now()}/?text=${encodeURIComponent(linkedinText)}`;
            
            // Show a helpful message about LinkedIn sharing
            showMessage('LinkedIn sharing opened. If preview doesn\'t show, you can still post the text and link manually.', 'info');
            
            // Fallback to standard sharing if the above doesn't work
            if (!shareUrl) {
                shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&title=${encodeURIComponent(shareText)}`;
            }
            break;
        case 'telegram':
            shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText)}`;
            break;
        case 'email':
            const subject = `${userName}'s FIRE Journey Results`;
            const body = `${shareText}\n\nCheck out the calculator: ${url}`;
            shareUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            break;
        case 'download':
            downloadImage(blob);
            document.getElementById('share-modal-overlay').classList.add('hidden');
            return;
        case 'copy':
            copyToClipboard(url, shareText);
            document.getElementById('share-modal-overlay').classList.add('hidden');
            return;
    }
    
    if (shareUrl) {
        // Open in new window with specific dimensions
        const popup = window.open(shareUrl, '_blank', 'width=600,height=400,scrollbars=yes,resizable=yes');
        
        // Fallback if popup is blocked
        if (!popup || popup.closed || typeof popup.closed === 'undefined') {
            // Try to open in same window as fallback
            window.location.href = shareUrl;
        }
    }
}

function downloadImage(blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fire-results.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showMessage('Results image downloaded successfully!', 'info');
}

function copyToClipboard(url, shareText) {
    const tempInput = document.createElement('input');
    tempInput.value = url;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand('copy');
    document.body.removeChild(tempInput);
    showMessage('Link copied to clipboard!', 'info');
}