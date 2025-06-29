// --- Globals ---
const tabOrder = ['assumptions', 'basic', 'cashflow', 'goals', 'advanced', 'results'];
let currentActiveTabIndex = 0;
window.fireData = null;
let chartInstances = {};
const LOCAL_STORAGE_KEY = 'fireCalculatorData_v6';
let isInitialized = false;


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
    try {
      if (typeof gtag !== 'undefined') {
        const analyticsData = this.getAnalyticsState();
        
        gtag('event', eventName, {
          event_category: 'FIRE Calculator',
          event_label: 'State Update',
          custom_map: analyticsData
        });
      }
      
      // Check if New Relic is available before using it
      if (typeof window !== 'undefined' && window.newrelic && typeof window.newrelic.addPageAction === 'function') {
        const analyticsData = this.getAnalyticsState();
        window.newrelic.addPageAction(eventName, analyticsData);
      }
    } catch (error) {
      console.warn('Analytics error:', error);
    }
  }
}

// Initialize state manager
const stateManager = new FIREStateManager();

// --- Mobile Navigation ---
function toggleMobileNav() {
    try {
        const mobileNav = document.getElementById('mobile-nav');
        const overlay = document.getElementById('nav-overlay');
        const hamburger = document.getElementById('hamburger-menu');
        
        if (mobileNav && overlay && hamburger) {
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
    } catch (error) {
        console.error('Error toggling mobile navigation:', error);
    }
}

// --- Navigation Logic ---
function goToNextTab() {
    try {
        const currentTab = document.querySelector('.tab.active');
        if (currentTab && currentTab.dataset.tab) {
            const currentIndex = tabOrder.indexOf(currentTab.dataset.tab);
            if (currentIndex < tabOrder.length - 1) {
                showTab(tabOrder[currentIndex + 1]);
            }
        }
    } catch (error) {
        console.error('Error going to next tab:', error);
    }
}

function goToPreviousTab() {
    try {
        const currentTab = document.querySelector('.tab.active');
        if (currentTab && currentTab.dataset.tab) {
            const currentIndex = tabOrder.indexOf(currentTab.dataset.tab);
            if (currentIndex > 0) {
                showTab(tabOrder[currentIndex - 1]);
            }
        }
    } catch (error) {
        console.error('Error going to previous tab:', error);
    }
}

function showTab(tabId) {
    try {
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
            const initialMessage = document.getElementById('initial-results-message');
            const actualContent = document.getElementById('actual-results-content');
            
            if (window.fireData) {
                if (initialMessage) initialMessage.classList.add('hidden');
                if (actualContent) actualContent.classList.remove('hidden');
                updateUIAndCharts(window.fireData);
            } else {
                if (initialMessage) initialMessage.classList.remove('hidden');
                if (actualContent) actualContent.classList.add('hidden');
            }
        }
        
        // Close mobile nav if open
        const mobileNav = document.getElementById('mobile-nav');
        const overlay = document.getElementById('nav-overlay');
        const hamburger = document.getElementById('hamburger-menu');
        if (mobileNav && mobileNav.classList.contains('active')) {
            mobileNav.classList.remove('active');
            if (overlay) overlay.classList.remove('active');
            if (hamburger) hamburger.classList.remove('active');
        }
        
        // Track tab visit
        stateManager.trackTab(tabId);
        
        // Update state and send to analytics
        stateManager.updateState({ current_tab: tabId });
        stateManager.sendToAnalytics('tab_visit');
        
        // Scroll to top smoothly
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
    } catch (error) {
        console.error('Error showing tab:', tabId, error);
    }
}

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    if (isInitialized) {
        console.log('FIRE Calculator: Already initialized, skipping');
        return;
    }
    
    console.log('FIRE Calculator: DOM Content Loaded');
    
    try {
        isInitialized = true;
        
        // Track initial page load
        console.log('FIRE Calculator: Sending page view analytics');
        stateManager.sendToAnalytics('page_view');
        
        // Set up navigation event listeners
        const hamburgerBtn = document.getElementById('hamburger-menu');
        const navOverlay = document.getElementById('nav-overlay');
        const allNavLinks = document.querySelectorAll('.desktop-nav .tab, .mobile-nav .tab');
        
        console.log('FIRE Calculator: Setting up navigation listeners');
        
        if (hamburgerBtn) {
            hamburgerBtn.addEventListener('click', toggleMobileNav);
        }
        if (navOverlay) {
            navOverlay.addEventListener('click', toggleMobileNav);
        }
        
        allNavLinks.forEach(tab => {
            tab.addEventListener('click', (event) => {
                event.preventDefault();
                const targetTabId = event.currentTarget.getAttribute('data-tab');
                showTab(targetTabId);
                const mobileNav = document.getElementById('mobile-nav');
                if (mobileNav && mobileNav.classList.contains('active')) {
                    toggleMobileNav();
                }
            });
        });
        
        // Set up mobile action buttons
        const mobileScrollToBottom = document.getElementById('mobile-scroll-to-bottom');
        const mobileFeedback = document.getElementById('mobile-feedback');
        
        if (mobileScrollToBottom) {
            mobileScrollToBottom.addEventListener('click', (event) => {
                event.preventDefault();
                // Scroll to the bottom of the current content
                const currentTabContent = document.querySelector('.tab-content:not(.hidden)');
                if (currentTabContent) {
                    // Scroll to the bottom of the current tab content
                    const rect = currentTabContent.getBoundingClientRect();
                    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                    const targetScroll = scrollTop + rect.bottom - window.innerHeight + 20; // Add 20px padding
                    
                    window.scrollTo({
                        top: targetScroll,
                        behavior: 'smooth'
                    });
                }
                // Close mobile nav
                toggleMobileNav();
            });
        }
        
        if (mobileFeedback) {
            mobileFeedback.addEventListener('click', (event) => {
                event.preventDefault();
                // Trigger feedback modal
                const feedbackFab = document.getElementById('feedback-fab');
                if (feedbackFab) {
                    feedbackFab.click();
                }
                // Close mobile nav
                toggleMobileNav();
            });
        }
        
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
                if (shareModal) {
                    shareModal.classList.add('hidden');
                }
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
                const blobUrl = shareModal?.dataset.screenshotBlob;
                if (blobUrl) {
                    fetch(blobUrl)
                        .then(res => res.blob())
                        .then(blob => shareToPlatform(platform, blob))
                        .catch(error => console.error('Error sharing to platform:', error));
                }
            });
        });
        
        // Initialize with assumptions tab as default
        console.log('FIRE Calculator: Showing assumptions tab');
        showTab('assumptions');
        
        // Load saved form data
        console.log('FIRE Calculator: Loading form data');
        loadFormData();
        
        // Initialize expense displays
        console.log('FIRE Calculator: Initializing expense displays');
        updateExpenseDisplays();
        
        console.log('FIRE Calculator: Initialization complete');
        
    } catch (error) {
        console.error('Error initializing FIRE calculator:', error);
        isInitialized = false; // Reset flag on error
    }
});

// --- Validation ---
function validateTab(tabId) {
    let isValid = true;
    const inputs = document.querySelectorAll(`#${tabId} input[type="number"], #${tabId} select`);
    inputs.forEach(input => {
        const isNumericInput = input.type === 'number';
        if (isNumericInput) {
            const val = parseFloat(input.value);
            // Allow empty "years left" fields (expense-years-input and goal-years)
            const isYearsField = input.classList.contains('expense-years-input') || input.classList.contains('goal-years');
            
            if (input.value.trim() === '' || isNaN(val) || val < 0) {
                // Don't mark years fields as invalid if they're empty
                if (!isYearsField || input.value.trim() !== '') {
                    input.classList.add('invalid');
                    isValid = false;
                } else {
                    input.classList.remove('invalid');
                }
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
        const yearsLeft = yearsInput ? (parseFloat(yearsInput.value) || 0) : 0;
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
        const yearsLeft = yearsInput ? (parseFloat(yearsInput.value) || 0) : 0;
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
    
    // Debug the calculation inputs
    console.log('FIRE Calculation Debug:', {
        monthlyIncome: inputs.monthlyIncome,
        monthlyExpenses: inputs.monthlyExpenses,
        initialContributions: initialTotalMonthlyContributions,
        investibleSurplus: investibleSurplus,
        currentAge: inputs.currentAge,
        targetAge: inputs.targetAge,
        yearsToSimulate: inputs.targetAge - inputs.currentAge
    });
    
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
    
    // Only include goals that occur after retirement in the FIRE number
    const retirementGoals = inputs.goals.filter(goal => goal.years > yearsToSimulate);
    const totalFutureGoalValues = retirementGoals.reduce((total, goal) => {
        const futureValue = goal.value * Math.pow(1 + goal.inflation, goal.years);
        return total + futureValue;
    }, 0);
    
    // Calculate healthcare buffer only for the period from retirement to healthcare age
    const retirementAge = inputs.targetAge;
    const yearsFromRetirementToHealthcare = Math.max(0, inputs.healthcareBuffer.age - retirementAge);
    const healthcareBufferForRetirement = yearsFromRetirementToHealthcare > 0 ?
        inputs.healthcareBuffer.value * Math.pow(1 + inputs.healthcareBuffer.inflation, yearsToHealthcare) * (yearsFromRetirementToHealthcare / (inputs.healthcareBuffer.age - inputs.currentAge)) : 0;
    
    const inflatedFireNumber = (inflatedAnnualExpenses / inputs.withdrawalRate) + totalFutureGoalValues + healthcareBufferForRetirement;
    
    // Debug FIRE number calculation
    console.log('FIRE Number Debug:', {
        monthlyRetirementExpenses: monthlyRetirementExpenses,
        annualRetirementExpenses: annualRetirementExpenses,
        inflatedAnnualExpenses: inflatedAnnualExpenses,
        withdrawalRate: inputs.withdrawalRate,
        totalFutureGoalValues: totalFutureGoalValues,
        healthcareBufferForRetirement: healthcareBufferForRetirement,
        inflatedFireNumber: inflatedFireNumber,
        accumulationGoals: inputs.goals.filter(goal => goal.years <= yearsToSimulate),
        retirementGoals: retirementGoals,
        yearsToSimulate: yearsToSimulate,
        healthcareAge: inputs.healthcareBuffer.age,
        yearsToHealthcare: yearsToHealthcare,
        retirementAge: retirementAge,
        yearsFromRetirementToHealthcare: yearsFromRetirementToHealthcare
    });
    
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
    
    // Debug STP values
    console.log('STP Debug:', {
        stp: inputs.stp,
        transfersPerMonth: getTransfersPerMonth(),
        debtValue: simulationPortfolio.debt.value,
        equityValue: simulationPortfolio.equity_in.value
    });
    
    // Track when corpus reaches FIRE number for earliest FIRE age calculation
    let earliestFireAge = null;
    let corpusReachedFireNumber = false;
    
    // Separate goals into accumulation and retirement goals
    const accumulationGoals = inputs.goals.filter(goal => goal.years <= yearsToSimulate);
    // const retirementGoals = inputs.goals.filter(goal => goal.years > yearsToSimulate); // Duplicate declaration removed
    
    // First, simulate the target period
    for (let month = 1; month <= yearsToSimulate * 12; month++) {
        if ((month - 1) % 12 === 0 && month > 1) {
            for (const key in currentMonthlyContributions) {
                currentMonthlyContributions[key] *= (1 + (inputs.salaryGrowth || 0.05));
            }
        }
        let transfers = getTransfersPerMonth();
        for (let i = 0; i < transfers; i++) {
            let transferAmount = Math.min(inputs.stp.amount, simulationPortfolio.debt.value);
            if (transferAmount > 0) {
                simulationPortfolio.debt.value -= transferAmount;
                simulationPortfolio.equity_in.value += transferAmount;
                
                // Debug logging for first few months
                if (month <= 3) {
                    console.log(`Month ${month}, Transfer ${i + 1}: ${transferAmount} from debt to equity_in`);
                    console.log(`Debt: ${simulationPortfolio.debt.value}, Equity: ${simulationPortfolio.equity_in.value}`);
                }
            }
        }
        
        // Add investible surplus to the portfolio (distribute across assets proportionally)
        if (investibleSurplus > 0) {
            const totalPortfolioValue = Object.values(simulationPortfolio).reduce((sum, asset) => sum + asset.value, 0);
            if (totalPortfolioValue > 0) {
                for (const key in simulationPortfolio) {
                    const proportion = simulationPortfolio[key].value / totalPortfolioValue;
                    simulationPortfolio[key].value += investibleSurplus * proportion;
                }
            } else {
                // If no existing portfolio, add to first asset
                const firstKey = Object.keys(simulationPortfolio)[0];
                if (firstKey) {
                    simulationPortfolio[firstKey].value += investibleSurplus;
                }
            }
        }
        
        // Add regular contributions
        for (const key in simulationPortfolio) {
            if (currentMonthlyContributions[key] !== undefined) {
                simulationPortfolio[key].value += currentMonthlyContributions[key];
            }
        }
        
        // Apply monthly returns
        for (const key in simulationPortfolio) {
            simulationPortfolio[key].value *= (1 + simulationPortfolio[key].return / 12);
        }
        
        // Execute accumulation goals that occur this year
        const currentYear = month / 12;
        const goalsThisYear = accumulationGoals.filter(goal => Math.floor(goal.years) === currentYear);
        if (goalsThisYear.length > 0) {
            const totalGoalDeduction = goalsThisYear.reduce((sum, goal) => {
                const futureValue = goal.value * Math.pow(1 + goal.inflation, goal.years);
                return sum + futureValue;
            }, 0);
            
            // Deduct goals proportionally from all assets
            const totalPortfolioValue = Object.values(simulationPortfolio).reduce((sum, asset) => sum + asset.value, 0);
            if (totalPortfolioValue > 0) {
                for (const key in simulationPortfolio) {
                    const proportion = simulationPortfolio[key].value / totalPortfolioValue;
                    simulationPortfolio[key].value = Math.max(0, simulationPortfolio[key].value - (totalGoalDeduction * proportion));
                }
            }
            
            console.log(`Year ${currentYear}: Executed goals worth ${formatCurrency(totalGoalDeduction)}`);
        }
        
        // Check if corpus has reached FIRE number for earliest FIRE age
        if (!corpusReachedFireNumber) {
            const currentCorpus = Object.values(simulationPortfolio).reduce((s, a) => s + a.value, 0);
            if (currentCorpus >= inflatedFireNumber) {
                earliestFireAge = inputs.currentAge + (month / 12);
                corpusReachedFireNumber = true;
                console.log(`FIRE achieved at age ${earliestFireAge} (month ${month})`);
            }
        }
        
        if (month % 12 === 0) {
            portfolioHistory.push({
                year: month / 12,
                ...Object.keys(simulationPortfolio).reduce((acc, key) => ({ ...acc, [key]: simulationPortfolio[key].value }), {})
            });
        }
    }
    
    // If FIRE not achieved in target period, extend simulation to find earliest achievable age
    if (!corpusReachedFireNumber) {
        console.log('FIRE not achieved in target period, extending simulation...');
        
        // Create a copy of the portfolio for extended simulation
        const extendedPortfolio = JSON.parse(JSON.stringify(simulationPortfolio));
        const extendedContributions = JSON.parse(JSON.stringify(currentMonthlyContributions));
        
        // Continue simulation for additional years (up to age 58)
        const maxExtendedYears = 58 - inputs.currentAge;
        const additionalYears = maxExtendedYears - yearsToSimulate;
        
        for (let month = 1; month <= additionalYears * 12; month++) {
            const currentYear = yearsToSimulate + (month / 12);
            
            // Apply salary growth to contributions
            if ((month - 1) % 12 === 0) {
                for (const key in extendedContributions) {
                    extendedContributions[key] *= (1 + (inputs.salaryGrowth || 0.05));
                }
            }
            
            // Apply STP transfers
            let transfers = getTransfersPerMonth();
            for (let i = 0; i < transfers; i++) {
                let transferAmount = Math.min(inputs.stp.amount, extendedPortfolio.debt.value);
                if (transferAmount > 0) {
                    extendedPortfolio.debt.value -= transferAmount;
                    extendedPortfolio.equity_in.value += transferAmount;
                }
            }
            
            // Add investible surplus
            if (investibleSurplus > 0) {
                const totalPortfolioValue = Object.values(extendedPortfolio).reduce((sum, asset) => sum + asset.value, 0);
                if (totalPortfolioValue > 0) {
                    for (const key in extendedPortfolio) {
                        const proportion = extendedPortfolio[key].value / totalPortfolioValue;
                        extendedPortfolio[key].value += investibleSurplus * proportion;
                    }
                }
            }
            
            // Add regular contributions
            for (const key in extendedPortfolio) {
                if (extendedContributions[key] !== undefined) {
                    extendedPortfolio[key].value += extendedContributions[key];
                }
            }
            
            // Apply monthly returns
            for (const key in extendedPortfolio) {
                extendedPortfolio[key].value *= (1 + extendedPortfolio[key].return / 12);
            }
            
            // Check if corpus has reached FIRE number
            const currentCorpus = Object.values(extendedPortfolio).reduce((s, a) => s + a.value, 0);
            if (currentCorpus >= inflatedFireNumber) {
                earliestFireAge = inputs.currentAge + currentYear;
                corpusReachedFireNumber = true;
                console.log(`FIRE achieved at age ${earliestFireAge} (extended simulation)`);
                break;
            }
        }
    }
    const finalCorpus = Object.values(simulationPortfolio).reduce((s, a) => s + a.value, 0);
    const finalAllocation = Object.keys(simulationPortfolio).reduce((acc, key) => ({ ...acc, [key]: simulationPortfolio[key].value }), {});
    
    // Debug final results
    console.log('Final Results Debug:', {
        finalCorpus: finalCorpus,
        inflatedFireNumber: inflatedFireNumber,
        shortfall: finalCorpus - inflatedFireNumber,
        earliestFireAge: earliestFireAge,
        targetAge: inputs.targetAge
    });
    
    // Debug final allocation
    console.log('Final Allocation:', finalAllocation);
    console.log('STP Effect:', {
        initialDebt: inputs.portfolio.debt.value,
        finalDebt: finalAllocation.debt,
        initialEquity: inputs.portfolio.equity_in.value,
        finalEquity: finalAllocation.equity_in,
        debtReduction: inputs.portfolio.debt.value - finalAllocation.debt,
        equityIncrease: finalAllocation.equity_in - inputs.portfolio.equity_in.value
    });
    
    // --- End Portfolio Simulation Logic ---
    
    // Determine FIRE age based on shortfall
    let fireAge = inputs.targetAge;
    let actualFireAge = inputs.targetAge;
    let yearsToFire = inputs.targetAge - inputs.currentAge;
    let actualYearsToFire = inputs.targetAge - inputs.currentAge;
    let extendedWorkAge = 58; // Assume income continues until 58 if target not achievable
    
    if (finalCorpus < inflatedFireNumber) {
        // Portfolio shortfall - check if earliest achievable age is within target
        if (earliestFireAge && earliestFireAge <= inputs.targetAge) {
            // Achievable within target age
            actualFireAge = earliestFireAge;
            actualYearsToFire = earliestFireAge - inputs.currentAge;
        } else if (earliestFireAge && earliestFireAge <= extendedWorkAge) {
            // Not achievable at target age, but achievable by extending work to 58
            actualFireAge = earliestFireAge;
            actualYearsToFire = earliestFireAge - inputs.currentAge;
        } else {
            // Not achievable even by extending work to 58
            actualFireAge = null;
            actualYearsToFire = null;
        }
    } else {
        // No shortfall - target age is achievable
        actualFireAge = inputs.targetAge;
        actualYearsToFire = inputs.targetAge - inputs.currentAge;
    }
    
    const retirementDuration = (inputs.lifeExpectancy || 85) - (actualFireAge || inputs.targetAge || 0);
    const monthlyExpenses = inputs.monthlyExpenses;
    const annualExpenses = monthlyExpenses * 12;
    const withdrawalRate = inputs.withdrawalRate;
    window.fireData = {
        ...inputs,
        fireAge: actualFireAge, // Use actual achievable age
        targetAge: inputs.targetAge, // Keep original target for reference
        earliestFireAge: earliestFireAge, // Earliest possible age
        yearsToFire: actualYearsToFire, // Years to actual FIRE age
        targetYearsToFire: inputs.targetAge - inputs.currentAge, // Years to target age
        retirementDuration,
        monthlyExpenses,
        annualExpenses,
        withdrawalRate,
        inflatedFireNumber,
        finalCorpus,
        corpusShortfall: finalCorpus - inflatedFireNumber,
        unutilizedMonthlyInvestment: investibleSurplus,
        portfolioHistory,
        finalAllocation,
        fireAchievable: finalCorpus >= inflatedFireNumber || earliestFireAge !== null
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
      portfolio_history: data.portfolioHistory,
      user_name: data.userName || ''
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

    // Update result values with appropriate styling
    const expectedFireAgeEl = document.getElementById('expected-fire-age');
    const actualFireAgeEl = document.getElementById('actual-fire-age');
    const expectedYearsEl = document.getElementById('expected-years-to-fire');
    const actualYearsEl = document.getElementById('actual-years-to-fire');
    
    expectedFireAgeEl.textContent = data.targetAge ?? '--';
    expectedFireAgeEl.className = 'result-value expected';
    
    actualFireAgeEl.textContent = data.fireAge ?? '--';
    if (data.corpusShortfall < 0 && data.fireAge) {
        if (data.fireAge > data.targetAge) {
            // Achievable by extending work
            actualFireAgeEl.className = 'result-value extended';
            actualFireAgeEl.textContent = `${Math.round(data.fireAge)} (extended)`;
        } else {
            // Achievable within target
            actualFireAgeEl.className = 'result-value actual';
        }
    } else if (data.corpusShortfall < 0 && !data.fireAge) {
        if (data.earliestFireAge && data.earliestFireAge > 58) {
            actualFireAgeEl.className = 'result-value unachievable';
            actualFireAgeEl.textContent = 'Not Achievable';
        } else {
            actualFireAgeEl.className = 'result-value unachievable';
            actualFireAgeEl.textContent = 'Not Achievable';
        }
    } else {
        actualFireAgeEl.className = 'result-value actual';
    }
    
    expectedYearsEl.textContent = data.targetYearsToFire ?? (data.targetAge && data.currentAge ? data.targetAge - data.currentAge : '--');
    expectedYearsEl.className = 'result-value expected';
    
    actualYearsEl.textContent = data.yearsToFire ?? '--';
    if (data.corpusShortfall < 0 && data.yearsToFire) {
        if (data.fireAge > data.targetAge) {
            // Achievable by extending work
            actualYearsEl.className = 'result-value extended';
            actualYearsEl.textContent = `${Math.round(data.yearsToFire)} (extended)`;
        } else {
            // Achievable within target
            actualYearsEl.className = 'result-value actual';
        }
    } else if (data.corpusShortfall < 0 && !data.yearsToFire) {
        actualYearsEl.className = 'result-value unachievable';
        actualYearsEl.textContent = '--';
    } else {
        actualYearsEl.className = 'result-value actual';
    }
    
    document.getElementById('retirement-duration-result').textContent = data.retirementDuration ?? ((data.lifeExpectancy && data.fireAge) ? data.lifeExpectancy - data.fireAge : '--');
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

    // Update FIRE Progress Bar
    updateFireProgressBar(data);
    
    // Show message if FIRE is not achievable
    if (data.corpusShortfall < 0 && !data.fireAge) {
        if (data.earliestFireAge && data.earliestFireAge > 58) {
            showMessage('FIRE is not achievable even by extending work to age 58. Consider increasing your savings rate, reducing expenses, or adjusting your FIRE goals.', 'error');
        } else {
            showMessage('FIRE is not achievable with your current inputs. Consider increasing your savings rate, reducing expenses, or extending your target age.', 'error');
        }
    } else if (data.corpusShortfall < 0 && data.fireAge && data.fireAge > data.targetAge) {
        showMessage(`Your target FIRE age of ${data.targetAge} is not achievable, but you can achieve FIRE at age ${Math.round(data.fireAge)} by extending your work until then.`, 'info');
    } else if (data.corpusShortfall < 0 && data.fireAge) {
        showMessage(`Your target FIRE age of ${data.targetAge} is not achievable, but you can achieve FIRE at age ${Math.round(data.fireAge)} with your current inputs.`, 'info');
    }

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
    let retirementIndex = data.yearsToFire ?? (data.fireAge && data.currentAge ? data.fireAge - data.currentAge : 0);
    if (retirementIndex < 0) retirementIndex = 0;
    const portfolioAtRetirement = data.portfolioHistory[retirementIndex] || data.portfolioHistory[data.portfolioHistory.length - 1];
    const allocationAtRetirement = {};
    Object.keys(assetLabels).forEach(key => {
        allocationAtRetirement[key] = portfolioAtRetirement[key] || 0;
    });
    // Update subtitle for asset allocation chart
    const subtitle = document.getElementById('asset-allocation-retirement-age');
    if (subtitle) {
        subtitle.textContent = `Asset Allocation at Retirement (Age ${data.fireAge ?? '--'})`;
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
    // Simulate corpus burn down using actual achieved corpus and include goal execution events
    const multipliers = { lean: 0.7, regular: 1.0, fat: 1.5 };
    const years = 50; // Simulate 50 years post retirement to catch money running out
    
    // Use actual final corpus achieved, not theoretical required corpus
    const actualFinalCorpus = data.finalCorpus || 0;
    const swr = data.withdrawalRate ?? 0.04; // Safe Withdrawal Rate (4% default)
    const inflation = data.inflationRate ?? 0.06;
    const annualReturn = 0.06; // Assume 6% post-retirement return
    const salaryGrowth = data.salaryGrowth ?? 0.05; // Use salary growth for step-up assumption
    
    // Calculate annual withdrawal amounts for each FIRE type using SWR
    const annualWithdrawals = {
        lean: (data.annualExpenses ?? 0) * multipliers.lean,
        regular: (data.annualExpenses ?? 0) * multipliers.regular,
        fat: (data.annualExpenses ?? 0) * multipliers.fat
    };
    
    // Process goals to create execution timeline
    const goalEvents = [];
    if (data.goals && data.goals.length > 0) {
        data.goals.forEach(goal => {
            if (goal.name && goal.value > 0 && goal.years > 0) {
                const executionYear = goal.years;
                const futureValue = goal.value * Math.pow(1 + (goal.inflation || 0.06), goal.years);
                goalEvents.push({
                    year: executionYear,
                    name: goal.name,
                    value: futureValue,
                    originalValue: goal.value
                });
            }
        });
    }
    
    // Sort goal events by execution year
    goalEvents.sort((a, b) => a.year - b.year);
    
    // Create burndown chart data - start from retirement corpus and show depletion
    const burnDownLabels = [];
    const burnDownData = { lean: [], regular: [], fat: [] };
    const burnDownDataToday = { lean: [], regular: [], fat: [] };
    
    // Calculate different starting corpus amounts for each FIRE type
    // Each FIRE type needs a different corpus based on their withdrawal needs
    const startingCorpus = {
        lean: actualFinalCorpus * 0.7,    // Lean FIRE needs 70% of regular corpus
        regular: actualFinalCorpus,       // Regular FIRE uses full corpus
        fat: actualFinalCorpus * 1.5      // Fat FIRE needs 150% of regular corpus
    };
    
    for (let year = 0; year <= years; year++) {
        burnDownLabels.push(`Year ${year}`);
        
        if (year === 0) {
            // Start with different corpus amounts for each FIRE type
            for (const type of ['lean', 'regular', 'fat']) {
                burnDownData[type][year] = startingCorpus[type];
                burnDownDataToday[type][year] = startingCorpus[type];
            }
        } else {
            // Apply withdrawals and growth for each FIRE type
            for (const type of ['lean', 'regular', 'fat']) {
                const prevCorpus = burnDownData[type][year - 1];
                
                if (prevCorpus <= 0) {
                    burnDownData[type][year] = 0;
                    burnDownDataToday[type][year] = 0;
                } else {
                    // Apply SWR-based withdrawal (percentage of current corpus)
                    const swrWithdrawal = prevCorpus * swr;
                    
                    // Apply lifestyle-based withdrawal (fixed amount)
                    const lifestyleWithdrawal = annualWithdrawals[type];
                    
                    // Use the higher of the two withdrawal methods
                    const withdrawal = Math.max(swrWithdrawal, lifestyleWithdrawal);
                    
                    // Apply goal deductions if any goals occur this year
                    const goalsThisYear = goalEvents.filter(g => g.year === year);
                    const totalGoalDeduction = goalsThisYear.reduce((sum, goal) => sum + goal.value, 0);
                    
                    // Total deductions: withdrawal + goals
                    const totalDeductions = withdrawal + totalGoalDeduction;
                    const afterDeductions = Math.max(0, prevCorpus - totalDeductions);
                    
                    // Apply growth on remaining corpus
                    const futureValue = afterDeductions * (1 + annualReturn);
                    
                    burnDownData[type][year] = futureValue;
                    burnDownDataToday[type][year] = futureValue / Math.pow(1 + inflation, year);
                }
            }
        }
    }
    
    // Find when money runs out for each type
    const moneyRunsOut = {};
    for (const type of ['lean', 'regular', 'fat']) {
        const zeroIndex = burnDownData[type].findIndex(value => value <= 0);
        moneyRunsOut[type] = zeroIndex > 0 ? zeroIndex : null;
    }
    
    // Create goal event annotations (only for goals that occur during retirement)
    const retirementGoalEvents = goalEvents.filter(goal => goal.year > 0);
    
    // Color palette for goal events
    const goalColors = [
        '#FF6B35', // Orange
        '#4ECDC4', // Teal
        '#45B7D1', // Blue
        '#96CEB4', // Green
        '#FFEAA7', // Yellow
        '#DDA0DD', // Plum
        '#98D8C8', // Mint
        '#F7DC6F', // Gold
        '#BB8FCE', // Purple
        '#85C1E9'  // Light Blue
    ];
    
    const goalAnnotations = retirementGoalEvents.map((goal, index) => ({
        type: 'point',
        xValue: goal.year,
        yValue: burnDownData.regular[goal.year] || 0,
        backgroundColor: goalColors[index % goalColors.length] + '80',
        borderColor: goalColors[index % goalColors.length],
        borderWidth: 2,
        radius: 6,
        label: {
            content: `${goal.name}\n-${formatCurrency(goal.value)}`,
            enabled: true,
            position: 'top'
        }
    }));
    
    chartInstances.burnDownChart = new Chart(document.getElementById('burnDownChart'), {
        type: 'line',
        data: {
            labels: burnDownLabels,
            datasets: [
                {
                    label: `Lean FIRE${moneyRunsOut.lean ? ` (Runs out: Year ${moneyRunsOut.lean})` : ''}`,
                    data: burnDownData.lean,
                    borderColor: '#10B981',
                    fill: false,
                    tension: 0.4
                },
                {
                    label: `Regular FIRE${moneyRunsOut.regular ? ` (Runs out: Year ${moneyRunsOut.regular})` : ''}`,
                    data: burnDownData.regular,
                    borderColor: '#FF6B35',
                    fill: false,
                    tension: 0.4
                },
                {
                    label: `Fat FIRE${moneyRunsOut.fat ? ` (Runs out: Year ${moneyRunsOut.fat})` : ''}`,
                    data: burnDownData.fat,
                    borderColor: '#8B5CF6',
                    fill: false,
                    tension: 0.4
                },
                // Goal events as scatter points (only for retirement goals)
                ...retirementGoalEvents.map((goal, index) => ({
                    label: `${goal.name} (Goal)`,
                    data: burnDownLabels.map((label, idx) => {
                        if (idx === goal.year) {
                            return burnDownData.regular[idx] || 0;
                        }
                        return null;
                    }),
                    type: 'scatter',
                    backgroundColor: goalColors[index % goalColors.length] + '80',
                    borderColor: goalColors[index % goalColors.length],
                    borderWidth: 2,
                    pointRadius: 8,
                    pointHoverRadius: 12,
                    showLine: false
                }))
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { labels: { color: '#6c757d' } },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const value = context.parsed.y;
                            const year = context.dataIndex;
                            
                            if (value <= 0) {
                                return label + ': Money has run out';
                            }
                            
                            // Add withdrawal rate info for FIRE types
                            if (label.includes('FIRE') && !label.includes('Goal')) {
                                const withdrawalRate = (swr * 100).toFixed(1);
                                const withdrawalAmount = annualWithdrawals[label.toLowerCase().split(' ')[0]] || 0;
                                const goalsThisYear = goalEvents.filter(g => g.year === year);
                                const totalGoalDeduction = goalsThisYear.reduce((sum, goal) => sum + goal.value, 0);
                                
                                let tooltipText = label + ': ' + formatCurrency(value);
                                tooltipText += `\nWithdrawal Rate: ${withdrawalRate}%`;
                                tooltipText += `\nAnnual Withdrawal: ${formatCurrency(withdrawalAmount)}`;
                                
                                if (totalGoalDeduction > 0) {
                                    tooltipText += `\nGoal Deductions: ${formatCurrency(totalGoalDeduction)}`;
                                }
                                
                                return tooltipText;
                            }
                            
                            return label + ': ' + formatCurrency(value);
                        }
                    }
                }
            },
            scales: {
                y: {
                    position: 'left',
                    title: { display: true, text: 'Portfolio Value (₹)', color: '#6c757d' },
                    ticks: { callback: (v) => formatCurrency(v), color: '#6c757d' }
                },
                x: {
                    title: { display: true, text: 'Years After Retirement', color: '#6c757d' },
                    ticks: { color: '#6c757d' }
                }
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
                    label: `Lean FIRE (Today's Value)${moneyRunsOut.lean ? ` (Runs out: Year ${moneyRunsOut.lean})` : ''}`,
                    data: burnDownDataToday.lean,
                    borderColor: '#10B981',
                    borderDash: [8, 4],
                    fill: false,
                    tension: 0.4
                },
                {
                    label: `Regular FIRE (Today's Value)${moneyRunsOut.regular ? ` (Runs out: Year ${moneyRunsOut.regular})` : ''}`,
                    data: burnDownDataToday.regular,
                    borderColor: '#FF6B35',
                    borderDash: [8, 4],
                    fill: false,
                    tension: 0.4
                },
                {
                    label: `Fat FIRE (Today's Value)${moneyRunsOut.fat ? ` (Runs out: Year ${moneyRunsOut.fat})` : ''}`,
                    data: burnDownDataToday.fat,
                    borderColor: '#8B5CF6',
                    borderDash: [8, 4],
                    fill: false,
                    tension: 0.4
                },
                // Goal events as scatter points (Today's Value)
                ...goalEvents.map((goal, index) => ({
                    label: `${goal.name} (Goal)`,
                    data: burnDownLabels.map((label, idx) => {
                        if (idx === goal.year) {
                            return burnDownDataToday.regular[idx] || 0;
                        }
                        return null;
                    }),
                    type: 'scatter',
                    backgroundColor: goalColors[index % goalColors.length] + '80',
                    borderColor: goalColors[index % goalColors.length],
                    borderWidth: 2,
                    pointRadius: 8,
                    pointHoverRadius: 12,
                    showLine: false
                }))
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { labels: { color: '#6c757d' } },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const value = context.parsed.y;
                            if (value <= 0) {
                                return label + ': Money has run out';
                            }
                            return label + ': ' + formatCurrency(value);
                        }
                    }
                }
            },
            scales: {
                y: {
                    position: 'left',
                    title: { display: true, text: "Today's Value (₹)", color: '#6c757d' },
                    ticks: { callback: (v) => formatCurrency(v), color: '#6c757d' }
                },
                x: { 
                    ticks: { color: '#6c757d' },
                    title: { display: true, text: 'Years from Now', color: '#6c757d' }
                }
            }
        }
    });

    // Update goal events summary
    const goalEventsSummary = document.getElementById('goal-events-summary');
    if (goalEventsSummary) {
        if (goalEvents.length === 0) {
            goalEventsSummary.innerHTML = '<div class="goal-events-summary empty">No financial goals defined. Add goals in the Goals tab to see their impact on your portfolio.</div>';
        } else {
            let summaryHTML = '<h4>Goal Execution Timeline</h4>';
            goalEvents.forEach(goal => {
                const todayValue = goal.value / Math.pow(1 + inflation, goal.year);
                summaryHTML += `
                    <div class="goal-event-item">
                        <div class="goal-event-info">
                            <div class="goal-event-name">${goal.name}</div>
                            <div class="goal-event-details">Year ${goal.year} • Original: ${formatCurrency(goal.originalValue)}</div>
                        </div>
                        <div class="goal-event-impact">
                            -${formatCurrency(goal.value)}
                            <span class="goal-event-year">Year ${goal.year}</span>
                        </div>
                    </div>
                `;
            });
            goalEventsSummary.innerHTML = summaryHTML;
        }
    }
}

// --- FIRE Progress Bar Update ---
function updateFireProgressBar(data) {
    const currentAge = data.currentAge || 0;
    const actualFireAge = data.fireAge || 0; // Use actual achievable FIRE age
    const expectedFireAge = data.targetAge || 0; // Keep expected age for reference
    
    // Update progress bar elements
    document.getElementById('progress-current-age').textContent = currentAge;
    document.getElementById('progress-target-age').textContent = actualFireAge || expectedFireAge;
    
    // Calculate progress percentage
    let progressPercentage = 0;
    let yearsCompleted = 0;
    let yearsRemaining = 0;
    
    if (actualFireAge > currentAge && actualFireAge > 0) {
        // Calculate progress based on corpus accumulation toward actual FIRE age
        const totalYears = actualFireAge - currentAge;
        yearsCompleted = 0; // Since we're measuring progress toward FIRE, not age progress
        yearsRemaining = totalYears;
        
        // Progress based on corpus accumulation toward FIRE goal
        const currentCorpus = Object.values(data.portfolio || {}).reduce((sum, asset) => sum + (asset.value || 0), 0);
        const targetCorpus = data.inflatedFireNumber || 0;
        
        if (targetCorpus > 0) {
            progressPercentage = Math.min((currentCorpus / targetCorpus) * 100, 100);
        }
    } else if (actualFireAge <= currentAge && actualFireAge > 0) {
        // User has already reached or passed their calculated FIRE age
        progressPercentage = 100;
        yearsCompleted = Math.abs(actualFireAge - currentAge);
        yearsRemaining = 0;
    } else if (actualFireAge === 0 && expectedFireAge > currentAge) {
        // FIRE not achievable with current inputs, but expected age is set
        const totalYears = expectedFireAge - currentAge;
        yearsCompleted = 0;
        yearsRemaining = totalYears;
        
        // Show progress based on corpus accumulation
        const currentCorpus = Object.values(data.portfolio || {}).reduce((sum, asset) => sum + (asset.value || 0), 0);
        const targetCorpus = data.inflatedFireNumber || 0;
        
        if (targetCorpus > 0) {
            progressPercentage = Math.min((currentCorpus / targetCorpus) * 100, 100);
        }
    }
    
    // Update progress bar fill
    const progressFill = document.getElementById('fire-progress-fill');
    if (progressFill) {
        progressFill.style.width = `${progressPercentage}%`;
    }
    
    // Update percentage display
    const percentageEl = document.getElementById('fire-progress-percentage');
    if (percentageEl) {
        percentageEl.textContent = `${Math.round(progressPercentage)}%`;
    }
    
    // Update stats
    document.getElementById('progress-years-completed').textContent = yearsCompleted;
    document.getElementById('progress-years-remaining').textContent = yearsRemaining;
    
    // Add visual feedback based on progress
    if (progressPercentage >= 100) {
        progressFill.style.background = 'var(--success-green)';
        percentageEl.style.color = 'var(--success-green)';
    } else if (progressPercentage >= 75) {
        progressFill.style.background = 'var(--fire-orange)';
        percentageEl.style.color = 'var(--fire-orange)';
    } else {
        progressFill.style.background = 'var(--gradient-fire)';
        percentageEl.style.color = 'var(--fire-orange)';
    }
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
        
        // Track username if it was loaded from saved data
        if (savedData['user-name'] && savedData['user-name'].trim()) {
            stateManager.updateState({ user_name: savedData['user-name'].trim() });
            stateManager.sendToAnalytics('username_loaded');
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
        
        // Track username changes specifically
        if (input.id === 'user-name') {
            const userName = input.value.trim();
            stateManager.updateState({ user_name: userName });
            stateManager.sendToAnalytics('username_updated');
        }
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
    const baseOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#6c757d' } } } };
    const scalesOptions = { y: { ticks: { callback: (v) => formatCurrency(v), color: '#6c757d' } }, x: { ticks: { color: '#6c757d' } } };

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
                    corpus_shortfall: window.fireData.corpusShortfall,
                    user_name: window.fireData.userName || ''
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
    const yearsToFire = document.getElementById('years-to-fire')?.textContent || '--';
    const finalCorpus = document.getElementById('final-corpus')?.textContent || '--';
    const fireNumber = document.getElementById('inflated-fire-number')?.textContent || '--';
    
    const shareText = `Check out my FIRE (Financial Independence, Retire Early) journey! I can achieve financial independence at age ${fireAge}.`;
    
    // Generate preview URL with essential results data only
    const previewUrl = new URL('https://nithin-murali-arch.github.io/adults/calculators/fire/preview.html');
    previewUrl.searchParams.set('userName', encodeURIComponent(userName));
    previewUrl.searchParams.set('fireAge', encodeURIComponent(fireAge));
    previewUrl.searchParams.set('yearsToFire', encodeURIComponent(yearsToFire));
    previewUrl.searchParams.set('finalCorpus', encodeURIComponent(finalCorpus));
    previewUrl.searchParams.set('fireNumber', encodeURIComponent(fireNumber));
    
    // Add chart data for portfolio growth chart
    if (chartInstances.portfolioGrowthChart && chartInstances.portfolioGrowthChart.data) {
        // Create a total portfolio value chart from the stacked area data
        const chartData = chartInstances.portfolioGrowthChart.data;
        const totalPortfolioData = chartData.labels.map((label, index) => {
            // Sum all asset values for each year
            return chartData.datasets.reduce((total, dataset) => {
                return total + (dataset.data[index] || 0);
            }, 0);
        });
        
        const simplifiedChartData = {
            labels: chartData.labels,
            datasets: [{
                data: totalPortfolioData
            }]
        };
        previewUrl.searchParams.set('chartData', encodeURIComponent(JSON.stringify(simplifiedChartData)));
    }
    
    // Add a timestamp to ensure unique URLs
    previewUrl.searchParams.set('t', Date.now().toString());
    
    const url = previewUrl.toString();
    
    // Debug: log the URL to console
    console.log('Generated preview URL:', url);
    
    let shareUrl = '';
    
    switch (platform) {
        case 'whatsapp':
            // For WhatsApp, we'll share text + preview URL
            shareUrl = `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + url)}`;
            showMessage('WhatsApp opened! The preview will show your actual FIRE results with charts.', 'info');
            break;
        case 'facebook':
            // Facebook sharing - will use the preview page's meta tags
            shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(shareText)}`;
            showMessage('Facebook opened! The preview will show your actual FIRE results with charts.', 'info');
            break;
        case 'twitter':
            // Twitter sharing with preview URL
            shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`;
            showMessage('Twitter opened! The preview will show your actual FIRE results with charts.', 'info');
            break;
        case 'linkedin':
            // Try multiple LinkedIn sharing methods
            try {
                // Method 1: Direct post with preview URL
                const linkedinText = `${shareText}\n\n${url}`;
                shareUrl = `https://www.linkedin.com/feed/update/urn:li:activity:${Date.now()}/?text=${encodeURIComponent(linkedinText)}`;
                
                // Method 2: Standard LinkedIn sharing (fallback)
                if (!shareUrl) {
                    shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&title=${encodeURIComponent(shareText)}`;
                }
                
                // Method 3: Alternative LinkedIn sharing format
                if (!shareUrl) {
                    shareUrl = `https://www.linkedin.com/feed/update/urn:li:activity:${Date.now()}/?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`;
                }
            } catch (e) {
                console.log('LinkedIn sharing error:', e);
                // Final fallback to simple URL sharing
                shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
            }
            
            // Show a helpful message about LinkedIn sharing
            showMessage('LinkedIn sharing opened! If preview doesn\'t show, you can still post the text and link manually.', 'info');
            break;
        case 'linkedin-alt':
            // Alternative LinkedIn sharing method - direct to main calculator
            const mainCalculatorUrl = 'https://nithin-murali-arch.github.io/adults/calculators/fire/';
            const altLinkedinText = `${shareText}\n\nTry the calculator: ${mainCalculatorUrl}`;
            shareUrl = `https://www.linkedin.com/feed/update/urn:li:activity:${Date.now()}/?text=${encodeURIComponent(altLinkedinText)}`;
            
            showMessage('LinkedIn alternative method opened! This should work better with LinkedIn\'s preview system.', 'info');
            break;
        case 'telegram':
            // Telegram sharing with preview URL
            shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText)}`;
            showMessage('Telegram opened! The preview will show your actual FIRE results with charts.', 'info');
            break;
        case 'email':
            const subject = `${userName}'s FIRE Journey Results`;
            const body = `${shareText}\n\nCheck out my results: ${url}`;
            shareUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            showMessage('Email client opened! The preview will show your actual FIRE results with charts.', 'info');
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

// --- Mobile tap tooltip for .chart-info[data-tooltip] ---
(function() {
    function isMobile() {
        return window.matchMedia('(hover: none) and (pointer: coarse)').matches || window.innerWidth <= 800;
    }
    function showMobileTooltip(e) {
        if (!isMobile()) return;
        e.stopPropagation();
        e.preventDefault(); // Prevent focus transfer to input
        // Remove other open tooltips
        document.querySelectorAll('.chart-info.mobile-tooltip-active').forEach(el => {
            if (el !== e.currentTarget) el.classList.remove('mobile-tooltip-active');
        });
        // Toggle this one
        e.currentTarget.classList.toggle('mobile-tooltip-active');
    }
    function hideAllMobileTooltips() {
        document.querySelectorAll('.chart-info.mobile-tooltip-active').forEach(el => {
            el.classList.remove('mobile-tooltip-active');
        });
    }
    function attachMobileTooltipHandlers() {
        if (!isMobile()) return;
        document.querySelectorAll('.chart-info[data-tooltip]').forEach(el => {
            el.removeEventListener('click', showMobileTooltip);
            el.addEventListener('click', showMobileTooltip);
        });
        document.removeEventListener('click', hideAllMobileTooltips);
        document.addEventListener('click', hideAllMobileTooltips);
    }
    document.addEventListener('DOMContentLoaded', attachMobileTooltipHandlers);
    window.addEventListener('resize', attachMobileTooltipHandlers);
})();