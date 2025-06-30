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
    
    // Calculate Coast FIRE
    const calculateCoastFIRE = () => {
        const currentPortfolioValue = Object.values(inputs.portfolio).reduce((sum, asset) => sum + asset.value, 0);
        const yearsToTarget = inputs.targetAge - inputs.currentAge;
        
        // Calculate the required growth rate to reach FIRE number
        // Formula: FIRE_Number = Current_Portfolio * (1 + growth_rate)^years
        // Therefore: growth_rate = (FIRE_Number / Current_Portfolio)^(1/years) - 1
        
        if (currentPortfolioValue > 0 && yearsToTarget > 0) {
            const requiredGrowthRate = Math.pow(inflatedFireNumber / currentPortfolioValue, 1 / yearsToTarget) - 1;
            
            // Calculate weighted average return of current portfolio
            const totalValue = Object.values(inputs.portfolio).reduce((sum, asset) => sum + asset.value, 0);
            const weightedReturn = Object.values(inputs.portfolio).reduce((sum, asset) => {
                return sum + (asset.value / totalValue) * asset.return;
            }, 0);
            
            // Coast FIRE is achieved if weighted return >= required growth rate
            const coastFireAchieved = weightedReturn >= requiredGrowthRate;
            
            // Calculate when Coast FIRE would be achieved with current contributions
            let coastFireAge = null;
            let coastFireYears = null;
            
            if (!coastFireAchieved) {
                // Simulate to find when Coast FIRE is achieved
                let testPortfolio = JSON.parse(JSON.stringify(inputs.portfolio));
                let testContributions = {};
                for (const key in inputs.portfolio) {
                    testContributions[key] = inputs.portfolio[key].contribution;
                }
                
                for (let year = 1; year <= 30; year++) { // Check up to 30 years
                    // Add contributions
                    for (const key in testPortfolio) {
                        if (testContributions[key] !== undefined) {
                            testPortfolio[key].value += testContributions[key] * 12;
                        }
                    }
                    
                    // Apply returns
                    for (const key in testPortfolio) {
                        testPortfolio[key].value *= (1 + testPortfolio[key].return);
                    }
                    
                    // Check if Coast FIRE achieved
                    const testPortfolioValue = Object.values(testPortfolio).reduce((sum, asset) => sum + asset.value, 0);
                    const testRequiredGrowthRate = Math.pow(inflatedFireNumber / testPortfolioValue, 1 / (inputs.targetAge - inputs.currentAge - year)) - 1;
                    const testWeightedReturn = Object.values(testPortfolio).reduce((sum, asset) => {
                        return sum + (asset.value / testPortfolioValue) * asset.return;
                    }, 0);
                    
                    if (testWeightedReturn >= testRequiredGrowthRate) {
                        coastFireAge = inputs.currentAge + Math.ceil(year); // Round up to next whole year
                        coastFireYears = Math.ceil(year); // Round up to next whole year
                        break;
                    }
                }
            } else {
                coastFireAge = inputs.currentAge;
                coastFireYears = 0;
            }
            
            return {
                coastFireAchieved,
                coastFireAge,
                coastFireYears,
                currentPortfolioValue,
                requiredGrowthRate: requiredGrowthRate * 100,
                weightedReturn: weightedReturn * 100,
                coastFireNumber: inflatedFireNumber
            };
        }
        
        return {
            coastFireAchieved: false,
            coastFireAge: null,
            coastFireYears: null,
            currentPortfolioValue: 0,
            requiredGrowthRate: 0,
            weightedReturn: 0,
            coastFireNumber: inflatedFireNumber
        };
    };
    
    const coastFireData = calculateCoastFIRE();
    
    // Debug Coast FIRE calculation
    console.log('Coast FIRE Debug:', coastFireData);
    
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
                earliestFireAge = inputs.currentAge + Math.ceil(month / 12); // Round up to next whole year
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
                earliestFireAge = inputs.currentAge + Math.ceil(currentYear); // Round up to next whole year
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
            actualYearsToFire = Math.ceil(earliestFireAge - inputs.currentAge); // Round up to next whole year
        } else if (earliestFireAge && earliestFireAge <= extendedWorkAge) {
            // Not achievable at target age, but achievable by extending work to 58
            actualFireAge = earliestFireAge;
            actualYearsToFire = Math.ceil(earliestFireAge - inputs.currentAge); // Round up to next whole year
        } else {
            // Not achievable even by extending work to 58
            actualFireAge = null;
            actualYearsToFire = null;
        }
    } else {
        // No shortfall - target age is achievable
        actualFireAge = inputs.targetAge;
        actualYearsToFire = Math.ceil(inputs.targetAge - inputs.currentAge); // Round up to next whole year
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
        targetYearsToFire: Math.ceil(inputs.targetAge - inputs.currentAge), // Years to target age (rounded up)
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
        fireAchievable: finalCorpus >= inflatedFireNumber || earliestFireAge !== null,
        // Coast FIRE data
        coastFireAchieved: coastFireData.coastFireAchieved,
        coastFireAge: coastFireData.coastFireAge,
        coastFireYears: coastFireData.coastFireYears,
        coastFireNumber: coastFireData.coastFireNumber,
        currentPortfolioValue: coastFireData.currentPortfolioValue,
        requiredGrowthRate: coastFireData.requiredGrowthRate,
        weightedReturn: coastFireData.weightedReturn
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
      user_name: data.userName || '',
      // Coast FIRE data
      coast_fire_achieved: data.coastFireAchieved,
      coast_fire_age: data.coastFireAge,
      coast_fire_years: data.coastFireYears,
      coast_fire_number: data.coastFireNumber,
      current_portfolio_value: data.currentPortfolioValue,
      required_growth_rate: data.requiredGrowthRate,
      weighted_return: data.weightedReturn
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
    
    expectedFireAgeEl.textContent = data.targetAge ? Math.ceil(data.targetAge) : '--';
    expectedFireAgeEl.className = 'result-value expected';
    
    actualFireAgeEl.textContent = data.fireAge ? Math.ceil(data.fireAge) : '--';
    if (data.corpusShortfall < 0 && data.fireAge) {
        if (data.fireAge > data.targetAge) {
            // Achievable by extending work
            actualFireAgeEl.className = 'result-value extended';
            actualFireAgeEl.textContent = `${Math.ceil(data.fireAge)} `;
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
    
    expectedYearsEl.textContent = data.targetYearsToFire ? Math.ceil(data.targetYearsToFire) : (data.targetAge && data.currentAge ? Math.ceil(data.targetAge - data.currentAge) : '--');
    expectedYearsEl.className = 'result-value expected';
    
    actualYearsEl.textContent = data.yearsToFire ? Math.ceil(data.yearsToFire) : '--';
    if (data.corpusShortfall < 0 && data.yearsToFire) {
        if (data.fireAge > data.targetAge) {
            // Achievable by extending work
            actualYearsEl.className = 'result-value extended';
            actualYearsEl.textContent = `${Math.ceil(data.yearsToFire)} `;
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
    
    // Update Coast FIRE elements
    const coastFireAgeEl = document.getElementById('coast-fire-age');
    const coastFireYearsEl = document.getElementById('coast-fire-years');
    const coastFireStatusEl = document.getElementById('coast-fire-status');
    
    coastFireAgeEl.textContent = data.coastFireAge ? Math.ceil(data.coastFireAge) : '--';
    coastFireAgeEl.className = data.coastFireAchieved ? 'result-value actual' : 'result-value expected';
    
    coastFireYearsEl.textContent = data.coastFireYears ? Math.ceil(data.coastFireYears) : '--';
    coastFireYearsEl.className = data.coastFireAchieved ? 'result-value actual' : 'result-value expected';
    
    if (data.coastFireAchieved) {
        coastFireStatusEl.textContent = 'Achieved';
        coastFireStatusEl.className = 'result-value actual';
        coastFireStatusEl.style.color = 'var(--success-green)';
    } else if (data.coastFireAge) {
        coastFireStatusEl.textContent = `Achievable in ${Math.ceil(data.coastFireYears)} years`;
        coastFireStatusEl.className = 'result-value extended';
        coastFireStatusEl.style.color = 'var(--fire-orange)';
    } else {
        coastFireStatusEl.textContent = 'Not Achievable';
        coastFireStatusEl.className = 'result-value unachievable';
        coastFireStatusEl.style.color = 'var(--fire-red)';
    }
    
    document.getElementById('retirement-duration-result').textContent = data.retirementDuration ? Math.ceil(data.retirementDuration) : ((data.lifeExpectancy && data.fireAge) ? Math.ceil(data.lifeExpectancy - data.fireAge) : '--');
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
        showMessage(`Your target FIRE age of ${data.targetAge} is not achievable, but you can achieve FIRE at age ${Math.ceil(data.fireAge)} by extending your work until then.`, 'info');
    } else if (data.corpusShortfall < 0 && data.fireAge) {
        showMessage(`Your target FIRE age of ${data.targetAge} is not achievable, but you can achieve FIRE at age ${Math.ceil(data.fireAge)} with your current inputs.`, 'info');
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

    // 4. Coast FIRE Chart
    const coastFireChartContainer = document.getElementById('coast-fire-chart-container');
    if (coastFireChartContainer) {
        // Create Coast FIRE timeline data
        const coastFireLabels = [];
        const coastFireData = [];
        const fireNumberLine = [];
        const coastFireAchievedLine = [];
        
        // Generate data for 30 years or until Coast FIRE is achieved
        const maxYears = 30;
        let coastFireAchieved = false;
        let coastFireYear = null;
        
        for (let year = 0; year <= maxYears; year++) {
            coastFireLabels.push(`Year ${year}`);
            
            // Calculate portfolio value at this year (with contributions)
            let portfolioValue = data.currentPortfolioValue || 0;
            let weightedReturn = data.weightedReturn / 100 || 0.08; // Default 8%
            
            // Add contributions for each year
            for (let y = 0; y < year; y++) {
                // Add annual contributions (monthly contributions * 12)
                const annualContributions = Object.values(data.portfolio || {}).reduce((sum, asset) => {
                    return sum + (asset.contribution || 0) * 12;
                }, 0);
                
                // Apply salary growth to contributions
                const salaryGrowth = data.salaryGrowth || 0.05;
                const growthFactor = Math.pow(1 + salaryGrowth, y);
                const adjustedContributions = annualContributions * growthFactor;
                
                portfolioValue += adjustedContributions;
                portfolioValue *= (1 + weightedReturn);
            }
            
            coastFireData.push(portfolioValue);
            
            // Calculate required growth rate to reach FIRE number from current portfolio
            const yearsToTarget = (data.targetAge || 45) - (data.currentAge || 32) - year;
            const requiredGrowthRate = yearsToTarget > 0 ? 
                Math.pow((data.inflatedFireNumber || 0) / portfolioValue, 1 / yearsToTarget) - 1 : 0;
            
            // Check if Coast FIRE is achieved (weighted return >= required growth rate)
            if (!coastFireAchieved && weightedReturn >= requiredGrowthRate && yearsToTarget > 0) {
                coastFireAchieved = true;
                coastFireYear = year;
            }
            
            // FIRE number line (constant)
            fireNumberLine.push(data.inflatedFireNumber || 0);
            
            // Coast FIRE achieved line (shows when Coast FIRE is achieved)
            if (coastFireAchieved && coastFireYear !== null) {
                coastFireAchievedLine.push(portfolioValue);
            } else {
                coastFireAchievedLine.push(null);
            }
        }
        
        const coastFireChartData = {
            labels: coastFireLabels,
            datasets: [
                {
                    label: 'Portfolio Value',
                    data: coastFireData,
                    borderColor: '#4ECDC4',
                    backgroundColor: '#4ECDC4',
                    fill: false,
                    tension: 0.4
                },
                {
                    label: 'FIRE Number',
                    data: fireNumberLine,
                    borderColor: '#FF6B35',
                    backgroundColor: '#FF6B35',
                    fill: false,
                    borderDash: [5, 5],
                    tension: 0
                },
                {
                    label: 'Coast FIRE Achieved',
                    data: coastFireAchievedLine,
                    borderColor: '#10B981',
                    backgroundColor: '#10B981',
                    fill: false,
                    borderWidth: 3,
                    tension: 0.4
                }
            ]
        };
        
        chartInstances.coastFireChart = new Chart(document.getElementById('coastFireChart'), {
            type: 'line',
            data: coastFireChartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { 
                        labels: { color: '#6c757d' },
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.dataset.label || '';
                                const value = context.parsed.y;
                                
                                if (label === 'Portfolio Value') {
                                    return `${label}: ${formatCurrency(value)}`;
                                } else if (label === 'FIRE Number') {
                                    return `${label}: ${formatCurrency(value)}`;
                                } else if (label === 'Coast FIRE Achieved') {
                                    return `${label}: ${formatCurrency(value)}`;
                                }
                                return `${label}: ${formatCurrency(value)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Years from Now',
                            color: '#6c757d'
                        },
                        ticks: { color: '#6c757d' }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Portfolio Value (₹)',
                            color: '#6c757d'
                        },
                        ticks: { 
                            color: '#6c757d',
                            callback: function(value) {
                                return formatCurrency(value);
                            }
                        }
                    }
                }
            }
        });
        
        // Add annotation for Coast FIRE achievement
        if (coastFireYear !== null) {
            chartInstances.coastFireChart.options.plugins.annotation = {
                annotations: {
                    coastFirePoint: {
                        type: 'point',
                        xValue: coastFireYear,
                        yValue: coastFireData[coastFireYear],
                        backgroundColor: '#10B981',
                        borderColor: '#10B981',
                        borderWidth: 3,
                        radius: 8,
                        label: {
                            content: `Coast FIRE\nAchieved!`,
                            enabled: true,
                            position: 'top',
                            color: '#10B981',
                            font: {
                                weight: 'bold'
                            }
                        }
                    }
                }
            };
            chartInstances.coastFireChart.update();
        }
    }

    // 5. Burn Down Chart (Post Retirement Corpus)
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
    
    // Get retirement age for age-based labels
    const retirementAge = data.fireAge || data.targetAge || 0;
    
    // Calculate different starting corpus amounts for each FIRE type
    // Each FIRE type needs a different corpus based on their withdrawal needs
    const startingCorpus = {
        lean: actualFinalCorpus * 0.7,    // Lean FIRE needs 70% of regular corpus
        regular: actualFinalCorpus,       // Regular FIRE uses full corpus
        fat: actualFinalCorpus * 1.5      // Fat FIRE needs 150% of regular corpus
    };
    
    for (let year = 0; year <= years; year++) {
        const age = retirementAge + year;
        burnDownLabels.push(`Age ${age}`);
        
        if (year === 0) {
            // Start with different corpus amounts for each FIRE type
            for (const type of ['lean', 'regular', 'fat']) {
                burnDownData[type][year] = startingCorpus[type];
            }
        } else {
            // Apply withdrawals and growth for each FIRE type
            for (const type of ['lean', 'regular', 'fat']) {
                const prevCorpus = burnDownData[type][year - 1];
                
                if (prevCorpus <= 0) {
                    burnDownData[type][year] = 0;
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
    
    // Determine which burndown chart to show based on FIRE achievement
    const hasShortfall = data.corpusShortfall < 0; // True when there's a shortfall (FIRE not achieved)
    const achievedContainer = document.getElementById('burndown-achieved-container');
    const notAchievedContainer = document.getElementById('burndown-not-achieved-container');
    
    console.log('FIRE Achievement Debug:', {
        corpusShortfall: data.corpusShortfall,
        fireAge: data.fireAge,
        hasShortfall: hasShortfall,
        achievedContainer: achievedContainer,
        notAchievedContainer: notAchievedContainer
    });
    
    if (!hasShortfall) {
        // Show only achieved burndown chart when FIRE is achieved (no shortfall)
        console.log('Showing FIRE Achieved chart only');
        achievedContainer.style.display = 'flex';
        notAchievedContainer.style.display = 'none';
        
        chartInstances.burnDownChartAchieved = new Chart(document.getElementById('burnDownChartAchieved'), {
            type: 'line',
            data: {
                labels: burnDownLabels,
                datasets: [
                    {
                        label: `Lean FIRE${moneyRunsOut.lean ? ` (Runs out: Age ${retirementAge + moneyRunsOut.lean})` : ''}`,
                        data: burnDownData.lean,
                        borderColor: '#10B981',
                        fill: false,
                        tension: 0.4
                    },
                    {
                        label: `Regular FIRE${moneyRunsOut.regular ? ` (Runs out: Age ${retirementAge + moneyRunsOut.regular})` : ''}`,
                        data: burnDownData.regular,
                        borderColor: '#FF6B35',
                        fill: false,
                        tension: 0.4
                    },
                    {
                        label: `Fat FIRE${moneyRunsOut.fat ? ` (Runs out: Age ${retirementAge + moneyRunsOut.fat})` : ''}`,
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
                        title: { display: true, text: 'Age', color: '#6c757d' },
                        ticks: { color: '#6c757d' }
                    }
                }
            }
        });
    } else {
        // Show both charts when there's a shortfall - reality and motivation
        console.log('Showing both FIRE Not Achieved and FIRE Achieved charts due to shortfall');
        achievedContainer.style.display = 'flex';
        notAchievedContainer.style.display = 'flex';
        
        // Reorder the containers so Not Achieved comes first, then Achieved for motivation
        const chartsContainer = document.querySelector('.charts-container');
        if (chartsContainer) {
            // Find the Goal Execution Timeline container to move it back to the end
            const goalTimelineContainer = chartsContainer.querySelector('.chart-row:has(#goal-events-summary)') || 
                                        chartsContainer.querySelector('.chart-row:last-child');
            
            // Move the not achieved container before the achieved container
            chartsContainer.appendChild(notAchievedContainer);
            chartsContainer.appendChild(achievedContainer);
            
            // Move the Goal Execution Timeline back to the end
            if (goalTimelineContainer && goalTimelineContainer !== chartsContainer.lastElementChild) {
                chartsContainer.appendChild(goalTimelineContainer);
            }
        }
        
        // Calculate what would happen if they retired at target age without achieving FIRE
        const targetAgeCorpus = data.finalCorpus; // This is what they'd have at target age
        const notAchievedBurnDownLabels = [];
        const notAchievedBurnDownData = { lean: [], regular: [], fat: [] };
        
        // Get target age for age-based labels in Not Achieved scenario
        const targetAge = data.targetAge || 0;
        
        // Calculate different starting corpus amounts for each FIRE type (using target age corpus)
        const notAchievedStartingCorpus = {
            lean: targetAgeCorpus * 0.7,    // Lean FIRE needs 70% of regular corpus
            regular: targetAgeCorpus,       // Regular FIRE uses full corpus
            fat: targetAgeCorpus * 1.5      // Fat FIRE needs 150% of regular corpus
        };
        
        for (let year = 0; year <= years; year++) {
            const age = targetAge + year;
            notAchievedBurnDownLabels.push(`Age ${age}`);
            
            if (year === 0) {
                // Start with different corpus amounts for each FIRE type
                for (const type of ['lean', 'regular', 'fat']) {
                    notAchievedBurnDownData[type][year] = notAchievedStartingCorpus[type];
                }
            } else {
                // Apply withdrawals and growth for each FIRE type
                for (const type of ['lean', 'regular', 'fat']) {
                    const prevCorpus = notAchievedBurnDownData[type][year - 1];
                    
                    if (prevCorpus <= 0) {
                        notAchievedBurnDownData[type][year] = 0;
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
                        
                        notAchievedBurnDownData[type][year] = futureValue;
                    }
                }
            }
        }
        
        // Find when money runs out for each type in not achieved scenario
        const notAchievedMoneyRunsOut = {};
        for (const type of ['lean', 'regular', 'fat']) {
            const zeroIndex = notAchievedBurnDownData[type].findIndex(value => value <= 0);
            notAchievedMoneyRunsOut[type] = zeroIndex > 0 ? zeroIndex : null;
        }
        
        chartInstances.burnDownChartNotAchieved = new Chart(document.getElementById('burnDownChartNotAchieved'), {
            type: 'line',
            data: {
                labels: notAchievedBurnDownLabels,
                datasets: [
                    {
                        label: `Lean FIRE${notAchievedMoneyRunsOut.lean ? ` (Runs out: Age ${targetAge + notAchievedMoneyRunsOut.lean})` : ''}`,
                        data: notAchievedBurnDownData.lean,
                        borderColor: '#10B981',
                        fill: false,
                        tension: 0.4
                    },
                    {
                        label: `Regular FIRE${notAchievedMoneyRunsOut.regular ? ` (Runs out: Age ${targetAge + notAchievedMoneyRunsOut.regular})` : ''}`,
                        data: notAchievedBurnDownData.regular,
                        borderColor: '#FF6B35',
                        fill: false,
                        tension: 0.4
                    },
                    {
                        label: `Fat FIRE${notAchievedMoneyRunsOut.fat ? ` (Runs out: Age ${targetAge + notAchievedMoneyRunsOut.fat})` : ''}`,
                        data: notAchievedBurnDownData.fat,
                        borderColor: '#8B5CF6',
                        fill: false,
                        tension: 0.4
                    },
                    // Goal events as scatter points (only for retirement goals)
                    ...retirementGoalEvents.map((goal, index) => ({
                        label: `${goal.name} (Goal)`,
                        data: notAchievedBurnDownLabels.map((label, idx) => {
                            if (idx === goal.year) {
                                return notAchievedBurnDownData.regular[idx] || 0;
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
                        title: { display: true, text: 'Age', color: '#6c757d' },
                        ticks: { color: '#6c757d' }
                    }
                }
            }
        });
        
        // Now create the FIRE Achieved chart for motivation (showing what they could achieve)
        // Use the actual FIRE corpus (inflatedFireNumber) instead of target age corpus
        const fireAchievedCorpus = data.inflatedFireNumber || 0;
        const fireAchievedBurnDownLabels = [];
        const fireAchievedBurnDownData = { lean: [], regular: [], fat: [] };
        
        // Calculate different starting corpus amounts for each FIRE type (using actual FIRE corpus)
        const fireAchievedStartingCorpus = {
            lean: fireAchievedCorpus * 0.7,    // Lean FIRE needs 70% of regular corpus
            regular: fireAchievedCorpus,       // Regular FIRE uses full corpus
            fat: fireAchievedCorpus * 1.5      // Fat FIRE needs 150% of regular corpus
        };
        
        for (let year = 0; year <= years; year++) {
            const age = retirementAge + year;
            fireAchievedBurnDownLabels.push(`Age ${age}`);
            
            if (year === 0) {
                // Start with different corpus amounts for each FIRE type
                for (const type of ['lean', 'regular', 'fat']) {
                    fireAchievedBurnDownData[type][year] = fireAchievedStartingCorpus[type];
                }
            } else {
                // Apply withdrawals and growth for each FIRE type
                for (const type of ['lean', 'regular', 'fat']) {
                    const prevCorpus = fireAchievedBurnDownData[type][year - 1];
                    
                    if (prevCorpus <= 0) {
                        fireAchievedBurnDownData[type][year] = 0;
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
                        
                        fireAchievedBurnDownData[type][year] = futureValue;
                    }
                }
            }
        }
        
        // Find when money runs out for each type in FIRE achieved scenario
        const fireAchievedMoneyRunsOut = {};
        for (const type of ['lean', 'regular', 'fat']) {
            const zeroIndex = fireAchievedBurnDownData[type].findIndex(value => value <= 0);
            fireAchievedMoneyRunsOut[type] = zeroIndex > 0 ? zeroIndex : null;
        }
        
        chartInstances.burnDownChartAchieved = new Chart(document.getElementById('burnDownChartAchieved'), {
            type: 'line',
            data: {
                labels: fireAchievedBurnDownLabels,
                datasets: [
                    {
                        label: `Lean FIRE${fireAchievedMoneyRunsOut.lean ? ` (Runs out: Age ${retirementAge + fireAchievedMoneyRunsOut.lean})` : ''}`,
                        data: fireAchievedBurnDownData.lean,
                        borderColor: '#10B981',
                        fill: false,
                        tension: 0.4
                    },
                    {
                        label: `Regular FIRE${fireAchievedMoneyRunsOut.regular ? ` (Runs out: Age ${retirementAge + fireAchievedMoneyRunsOut.regular})` : ''}`,
                        data: fireAchievedBurnDownData.regular,
                        borderColor: '#FF6B35',
                        fill: false,
                        tension: 0.4
                    },
                    {
                        label: `Fat FIRE${fireAchievedMoneyRunsOut.fat ? ` (Runs out: Age ${retirementAge + fireAchievedMoneyRunsOut.fat})` : ''}`,
                        data: fireAchievedBurnDownData.fat,
                        borderColor: '#8B5CF6',
                        fill: false,
                        tension: 0.4
                    },
                    // Goal events as scatter points (only for retirement goals)
                    ...retirementGoalEvents.map((goal, index) => ({
                        label: `${goal.name} (Goal)`,
                        data: fireAchievedBurnDownLabels.map((label, idx) => {
                            if (idx === goal.year) {
                                return fireAchievedBurnDownData.regular[idx] || 0;
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
                        title: { display: true, text: 'Age', color: '#6c757d' },
                        ticks: { color: '#6c757d' }
                    }
                }
            }
        });
    }
    
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
    document.getElementById('progress-current-age').textContent = Math.ceil(currentAge);
    document.getElementById('progress-target-age').textContent = actualFireAge ? Math.ceil(actualFireAge) : Math.ceil(expectedFireAge);
    
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
    document.getElementById('progress-years-completed').textContent = Math.ceil(yearsCompleted);
    document.getElementById('progress-years-remaining').textContent = Math.ceil(yearsRemaining);
    
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
                    const fireAge = document.getElementById('fire-age')?.textContent || '--';
                    const coastFireAge = document.getElementById('coast-fire-age')?.textContent || '--';
                    const coastFireStatus = document.getElementById('coast-fire-status')?.textContent || '--';
                    
                    let shareText = `Check out my FIRE (Financial Independence, Retire Early) journey! I can achieve financial independence at age ${fireAge}.`;
                    
                    // Add Coast FIRE information if available
                    if (coastFireAge && coastFireAge !== '--') {
                        if (coastFireStatus && coastFireStatus.includes('Achieved')) {
                            shareText += ` I've already reached Coast FIRE!`;
                        } else if (coastFireStatus && coastFireStatus.includes('Achievable')) {
                            shareText += ` My Coast FIRE age is ${coastFireAge}.`;
                        }
                    }
                    
                    navigator.share({
                        title: `${userName}'s FIRE Journey Results`,
                        text: shareText,
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
    const coastFireAge = document.getElementById('coast-fire-age')?.textContent || '--';
    const coastFireStatus = document.getElementById('coast-fire-status')?.textContent || '--';
    
    let shareText = `Check out my FIRE (Financial Independence, Retire Early) journey! I can achieve financial independence at age ${fireAge}.`;
    
    // Add Coast FIRE information if available
    if (coastFireAge && coastFireAge !== '--') {
        if (coastFireStatus && coastFireStatus.includes('Achieved')) {
            shareText += ` I've already reached Coast FIRE!`;
        } else if (coastFireStatus && coastFireStatus.includes('Achievable')) {
            shareText += ` My Coast FIRE age is ${coastFireAge}.`;
        }
    }
    
    // Generate preview URL with essential results data only
    const previewUrl = new URL('https://nithin-murali-arch.github.io/adults/calculators/fire/preview.html');
    previewUrl.searchParams.set('userName', encodeURIComponent(userName));
    previewUrl.searchParams.set('fireAge', encodeURIComponent(fireAge));
    previewUrl.searchParams.set('yearsToFire', encodeURIComponent(yearsToFire));
    previewUrl.searchParams.set('finalCorpus', encodeURIComponent(finalCorpus));
    previewUrl.searchParams.set('fireNumber', encodeURIComponent(fireNumber));
    previewUrl.searchParams.set('coastFireAge', encodeURIComponent(coastFireAge));
    previewUrl.searchParams.set('coastFireStatus', encodeURIComponent(coastFireStatus));
    
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

// --- Export/Import Functionality ---
function exportFireData() {
    try {
        // Get all form inputs in the new format
        const exportData = {
            // Basic user info
            userName: document.getElementById('user-name')?.value || '',
            currentAge: parseFloat(document.getElementById('current-age')?.value || 0),
            targetAge: parseFloat(document.getElementById('target-age')?.value || 0),
            
            // Financial inputs
            annualExpenses: parseFloat(document.getElementById('annual-expenses')?.value || 0),
            withdrawalRate: parseFloat(document.getElementById('withdrawal-rate')?.value || 0) / 100,
            inflationRate: parseFloat(document.getElementById('inflation-rate')?.value || 0) / 100,
            monthlyIncome: parseFloat(document.getElementById('monthly-income')?.value || 0),
            monthlyExpenses: parseFloat(document.getElementById('monthly-expenses')?.value || 0),
            lifeExpectancy: parseFloat(document.getElementById('life-expectancy')?.value || 0),
            emergencyFund: parseFloat(document.getElementById('emergency-fund')?.value || 0),
            bufferPercentage: parseFloat(document.getElementById('buffer-percentage')?.value || 0) / 100,
            sipStepUpPercent: parseFloat(document.getElementById('sip-stepup-percent')?.value || 0) / 100,
            
            // Portfolio data
            portfolio: {
                equity_in: {
                    value: parseFloat(document.getElementById('equity-in-value')?.value || 0),
                    return: parseFloat(document.getElementById('return-equity-in')?.value || 0) / 100,
                    contribution: parseFloat(document.getElementById('equity-in-contribution')?.value || 0)
                },
                equity_gl: {
                    value: parseFloat(document.getElementById('equity-gl-value')?.value || 0),
                    return: parseFloat(document.getElementById('return-equity-gl')?.value || 0) / 100,
                    contribution: parseFloat(document.getElementById('equity-gl-contribution')?.value || 0)
                },
                debt: {
                    value: parseFloat(document.getElementById('debt-value')?.value || 0),
                    return: parseFloat(document.getElementById('return-debt')?.value || 0) / 100,
                    contribution: parseFloat(document.getElementById('debt-contribution')?.value || 0)
                },
                real_estate: {
                    value: parseFloat(document.getElementById('real-estate-value')?.value || 0),
                    return: parseFloat(document.getElementById('return-real-estate')?.value || 0) / 100,
                    contribution: parseFloat(document.getElementById('real-estate-contribution')?.value || 0)
                },
                epf: {
                    value: parseFloat(document.getElementById('epf-value')?.value || 0),
                    return: parseFloat(document.getElementById('return-epf')?.value || 0) / 100,
                    contribution: parseFloat(document.getElementById('epf-contribution')?.value || 0)
                },
                nps: {
                    value: parseFloat(document.getElementById('nps-value')?.value || 0),
                    return: parseFloat(document.getElementById('return-nps')?.value || 0) / 100,
                    contribution: parseFloat(document.getElementById('nps-contribution')?.value || 0)
                }
            },
            
            // STP data
            stp: {
                amount: parseFloat(document.getElementById('stp-amount')?.value || 0),
                frequency: document.getElementById('stp-frequency')?.value || 'none'
            },
            
            // Healthcare buffer
            healthcareBuffer: {
                value: parseFloat(document.getElementById('healthcare-buffer-value')?.value || 0),
                age: parseFloat(document.getElementById('healthcare-buffer-age')?.value || 65),
                inflation: parseFloat(document.getElementById('healthcare-buffer-inflation')?.value || 0) / 100
            },
            
            // Tax rates
            tax: {
                equityShortCurrent: parseFloat(document.getElementById('tax-equity-short-current')?.value || 0) / 100,
                equityLongCurrent: parseFloat(document.getElementById('tax-equity-long-current')?.value || 0) / 100,
                debtShortCurrent: parseFloat(document.getElementById('tax-debt-short-current')?.value || 0) / 100,
                debtLongCurrent: parseFloat(document.getElementById('tax-debt-long-current')?.value || 0) / 100,
                equityShortRetire: parseFloat(document.getElementById('tax-equity-short-retire')?.value || 0) / 100,
                equityLongRetire: parseFloat(document.getElementById('tax-equity-long-retire')?.value || 0) / 100,
                debtShortRetire: parseFloat(document.getElementById('tax-debt-short-retire')?.value || 0) / 100,
                debtLongRetire: parseFloat(document.getElementById('tax-debt-long-retire')?.value || 0) / 100
            },
            
            // Lifestyle and risk tolerance
            lifestyle: {
                now: parseFloat(document.getElementById('lifestyle-now')?.value || 1),
                retire: parseFloat(document.getElementById('lifestyle-retire')?.value || 1)
            },
            riskTolerance: {
                now: document.getElementById('risk-tolerance-now')?.value || 'moderate',
                retire: document.getElementById('risk-tolerance-retire')?.value || 'moderate'
            },
            
            // Goals
            goals: []
        };
        
        // Get goals data
        document.querySelectorAll('.goal-row').forEach(row => {
            exportData.goals.push({
                name: row.querySelector('.goal-name')?.value || '',
                value: parseFloat(row.querySelector('.goal-value')?.value || 0),
                years: parseFloat(row.querySelector('.goal-years')?.value || 0),
                inflation: parseFloat(row.querySelector('.goal-inflation')?.value || 0) / 100
            });
        });
        
        // Get current FIRE calculation results if available
        const fireAge = document.getElementById('fire-age')?.textContent;
        if (fireAge && fireAge !== '--') {
            exportData.fireAge = parseFloat(fireAge);
            exportData.earliestFireAge = parseFloat(document.getElementById('fire-age')?.textContent || 0);
            exportData.yearsToFire = Math.ceil(parseFloat(document.getElementById('years-to-fire')?.textContent || 0)); // Round up to next whole year
            exportData.targetYearsToFire = Math.ceil(exportData.targetAge - exportData.currentAge); // Round up to next whole year
            exportData.retirementDuration = exportData.lifeExpectancy - exportData.fireAge;
            exportData.inflatedFireNumber = parseFloat(document.getElementById('inflated-fire-number')?.textContent?.replace(/[^\d.-]/g, '') || 0);
            exportData.finalCorpus = parseFloat(document.getElementById('final-corpus')?.textContent?.replace(/[^\d.-]/g, '') || 0);
            exportData.corpusShortfall = parseFloat(document.getElementById('corpus-shortfall')?.textContent?.replace(/[^\d.-]/g, '') || 0);
            exportData.unutilizedMonthlyInvestment = parseFloat(document.getElementById('unutilized-money')?.textContent?.replace(/[^\d.-]/g, '') || 0);
            exportData.fireAchievable = document.getElementById('fire-achievable')?.textContent?.includes('Achievable') || false;
            
            // Coast FIRE data
            const coastFireAge = document.getElementById('coast-fire-age')?.textContent;
            if (coastFireAge && coastFireAge !== '--') {
                exportData.coastFireAge = parseFloat(coastFireAge);
                exportData.coastFireYears = Math.ceil(parseFloat(document.getElementById('coast-fire-years')?.textContent || 0)); // Round up to next whole year
                exportData.coastFireAchieved = document.getElementById('coast-fire-status')?.textContent?.includes('Achieved') || false;
                exportData.coastFireNumber = exportData.inflatedFireNumber;
            }
            
            // Portfolio summary
            exportData.currentPortfolioValue = Object.values(exportData.portfolio).reduce((sum, asset) => sum + asset.value, 0);
            
            // Calculate weighted return
            const totalValue = exportData.currentPortfolioValue;
            if (totalValue > 0) {
                exportData.weightedReturn = Object.values(exportData.portfolio).reduce((sum, asset) => {
                    return sum + (asset.value / totalValue) * asset.return;
                }, 0);
            }
            
            // Required growth rate for FIRE
            if (exportData.yearsToFire > 0) {
                exportData.requiredGrowthRate = Math.pow(exportData.inflatedFireNumber / exportData.currentPortfolioValue, 1 / exportData.yearsToFire) - 1;
            }
        }
        
        // Add metadata
        exportData.exportDate = new Date().toISOString();
        exportData.version = '2.0';
        exportData.calculator = 'FIRE Calculator';
        exportData.url = window.location.href;
        
        // Create and download file
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `fire-calculator-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showMessage('FIRE data exported successfully!', 'success');
        
        // Track export event
        if (typeof gtag !== 'undefined') {
            gtag('event', 'export_data', {
                event_category: 'engagement',
                event_label: 'FIRE Calculator Export'
            });
        }
        
    } catch (error) {
        console.error('Export failed:', error);
        showMessage('Failed to export data. Please try again.', 'error');
    }
}

// Function to import FIRE data
function importFireData(importedData) {
    try {
        console.log('Importing data:', importedData);
        
        // Handle both old format (with formData wrapper) and new format (direct properties)
        let dataToImport = importedData;
        if (importedData.formData) {
            // Old format - extract formData
            dataToImport = importedData.formData;
        }
        
        // Validate the imported data
        if (!dataToImport || (typeof dataToImport !== 'object')) {
            throw new Error('Invalid import data format');
        }
        
        // Map the new data structure to form fields
        const fieldMappings = {
            'userName': 'user-name',
            'currentAge': 'current-age',
            'targetAge': 'target-age',
            'annualExpenses': 'annual-expenses',
            'withdrawalRate': 'withdrawal-rate',
            'inflationRate': 'inflation-rate',
            'monthlyIncome': 'monthly-income',
            'monthlyExpenses': 'monthly-expenses',
            'lifeExpectancy': 'life-expectancy',
            'emergencyFund': 'emergency-fund',
            'bufferPercentage': 'buffer-percentage',
            'sipStepUpPercent': 'sip-stepup-percent'
        };
        
        // Load basic form fields
        for (const [newKey, formFieldId] of Object.entries(fieldMappings)) {
            if (dataToImport[newKey] !== undefined) {
                const el = document.getElementById(formFieldId);
                if (el) {
                    el.value = dataToImport[newKey];
                }
            }
        }
        
        // Handle detailed expenses
        if (dataToImport.detailedExpenses && Array.isArray(dataToImport.detailedExpenses)) {
            // Clear existing expense rows
            const expenseContainer = document.getElementById('expenses-container');
            if (expenseContainer) {
                expenseContainer.innerHTML = '';
                dataToImport.detailedExpenses.forEach(expense => {
                    // Add expense row logic here if needed
                    // For now, we'll just set the total monthly expenses
                    const monthlyExpensesEl = document.getElementById('monthly-expenses');
                    if (monthlyExpensesEl) {
                        monthlyExpensesEl.value = dataToImport.monthlyExpenses || 0;
                    }
                });
            }
        }
        
        // Handle portfolio data
        if (dataToImport.portfolio) {
            const portfolio = dataToImport.portfolio;
            
            // Map portfolio assets to form fields
            const portfolioMappings = {
                'equity_in': { value: 'equity-in-value', return: 'return-equity-in', contribution: 'equity-in-contribution' },
                'equity_gl': { value: 'equity-gl-value', return: 'return-equity-gl', contribution: 'equity-gl-contribution' },
                'debt': { value: 'debt-value', return: 'return-debt', contribution: 'debt-contribution' },
                'real_estate': { value: 'real-estate-value', return: 'return-real-estate', contribution: 'real-estate-contribution' },
                'epf': { value: 'epf-value', return: 'return-epf', contribution: 'epf-contribution' },
                'nps': { value: 'nps-value', return: 'return-nps', contribution: 'nps-contribution' }
            };
            
            for (const [assetKey, fieldMappings] of Object.entries(portfolioMappings)) {
                if (portfolio[assetKey]) {
                    const asset = portfolio[assetKey];
                    if (asset.value !== undefined) {
                        const valueEl = document.getElementById(fieldMappings.value);
                        if (valueEl) valueEl.value = asset.value;
                    }
                    if (asset.return !== undefined) {
                        const returnEl = document.getElementById(fieldMappings.return);
                        if (returnEl) returnEl.value = asset.return * 100; // Convert to percentage
                    }
                    if (asset.contribution !== undefined) {
                        const contributionEl = document.getElementById(fieldMappings.contribution);
                        if (contributionEl) contributionEl.value = asset.contribution;
                    }
                }
            }
        }
        
        // Handle STP data
        if (dataToImport.stp) {
            const stpAmountEl = document.getElementById('stp-amount');
            const stpFrequencyEl = document.getElementById('stp-frequency');
            if (stpAmountEl) stpAmountEl.value = dataToImport.stp.amount || 0;
            if (stpFrequencyEl) stpFrequencyEl.value = dataToImport.stp.frequency || 'none';
        }
        
        // Handle goals
        if (dataToImport.goals && Array.isArray(dataToImport.goals)) {
            const goalsContainer = document.getElementById('goals-container');
            if (goalsContainer) {
                goalsContainer.innerHTML = ''; // Clear existing goals
                dataToImport.goals.forEach(goal => {
                    addGoalRow({
                        name: goal.name || '',
                        value: goal.value || 0,
                        years: goal.years || 0,
                        inflation: goal.inflation ? goal.inflation * 100 : 0 // Convert to percentage
                    });
                });
            }
        }
        
        // Handle healthcare buffer
        if (dataToImport.healthcareBuffer) {
            const healthcareValueEl = document.getElementById('healthcare-buffer-value');
            const healthcareAgeEl = document.getElementById('healthcare-buffer-age');
            const healthcareInflationEl = document.getElementById('healthcare-buffer-inflation');
            
            if (healthcareValueEl) healthcareValueEl.value = dataToImport.healthcareBuffer.value || 0;
            if (healthcareAgeEl) healthcareAgeEl.value = dataToImport.healthcareBuffer.age || 65;
            if (healthcareInflationEl) healthcareInflationEl.value = (dataToImport.healthcareBuffer.inflation || 0) * 100;
        }
        
        // Handle tax rates
        if (dataToImport.tax) {
            const taxMappings = {
                'equityShortCurrent': 'tax-equity-short-current',
                'equityLongCurrent': 'tax-equity-long-current',
                'debtShortCurrent': 'tax-debt-short-current',
                'debtLongCurrent': 'tax-debt-long-current',
                'equityShortRetire': 'tax-equity-short-retire',
                'equityLongRetire': 'tax-equity-long-retire',
                'debtShortRetire': 'tax-debt-short-retire',
                'debtLongRetire': 'tax-debt-long-retire'
            };
            
            for (const [taxKey, fieldId] of Object.entries(taxMappings)) {
                if (dataToImport.tax[taxKey] !== undefined) {
                    const el = document.getElementById(fieldId);
                    if (el) el.value = dataToImport.tax[taxKey] * 100; // Convert to percentage
                }
            }
        }
        
        // Handle lifestyle and risk tolerance
        if (dataToImport.lifestyle) {
            const lifestyleNowEl = document.getElementById('lifestyle-now');
            const lifestyleRetireEl = document.getElementById('lifestyle-retire');
            if (lifestyleNowEl) lifestyleNowEl.value = dataToImport.lifestyle.now || 1;
            if (lifestyleRetireEl) lifestyleRetireEl.value = dataToImport.lifestyle.retire || 1;
        }
        
        if (dataToImport.riskTolerance) {
            const riskNowEl = document.getElementById('risk-tolerance-now');
            const riskRetireEl = document.getElementById('risk-tolerance-retire');
            if (riskNowEl) riskNowEl.value = dataToImport.riskTolerance.now || 'moderate';
            if (riskRetireEl) riskRetireEl.value = dataToImport.riskTolerance.retire || 'moderate';
        }
        
        // Trigger recalculation
        triggerResultUpdate();
        
        showMessage('FIRE data imported successfully!', 'success');
        
        // Track import event
        if (typeof gtag !== 'undefined') {
            gtag('event', 'import_data', {
                event_category: 'engagement',
                event_label: 'FIRE Calculator Import'
            });
        }
        
    } catch (error) {
        console.error('Import failed:', error);
        showMessage('Failed to import data. Please check the file format.', 'error');
    }
}

// Function to handle file import from file input
function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            importFireData(importedData);
        } catch (error) {
            console.error('Error parsing imported file:', error);
            showMessage('Invalid file format. Please select a valid FIRE calculator export file.', 'error');
        }
    };
    reader.readAsText(file);
}