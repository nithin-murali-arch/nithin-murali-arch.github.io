// --- Globals ---
const tabOrder = ['assumptions', 'basic', 'cashflow', 'goals', 'advanced', 'results'];
let currentActiveTabIndex = 0;
window.fireData = null;
let chartInstances = {};
const LOCAL_STORAGE_KEY = 'fireCalculatorData_v7'; // Changed key for new structure

// --- Navigation Logic ---
const hamburgerBtn = document.getElementById('hamburger-menu');
const mobileNav = document.getElementById('mobile-nav');
const navOverlay = document.getElementById('nav-overlay');
const allNavLinks = document.querySelectorAll('.desktop-nav .tab, .mobile-nav .tab');

function toggleMobileNav() {
    const isOpen = mobileNav.classList.toggle('is-open');
    navOverlay.classList.toggle('is-open', isOpen);
    document.body.classList.toggle('nav-open', isOpen);
    hamburgerBtn.innerHTML = isOpen ? '<i class="fas fa-times"></i>' : '<i class="fas fa-bars"></i>';
}

hamburgerBtn.addEventListener('click', toggleMobileNav);
navOverlay.addEventListener('click', toggleMobileNav);

allNavLinks.forEach(tab => {
    tab.addEventListener('click', (event) => {
        event.preventDefault();
        const targetTabId = event.currentTarget.getAttribute('data-tab');
        showTab(targetTabId);
        if (mobileNav.classList.contains('is-open')) {
            toggleMobileNav();
        }
    });
});

function goToNextTab() {
    if (currentActiveTabIndex < tabOrder.length - 1) {
        showTab(tabOrder[currentActiveTabIndex + 1]);
    }
}

function goToPreviousTab() {
    if (currentActiveTabIndex > 0) {
        showTab(tabOrder[currentActiveTabIndex - 1]);
    }
}

function showTab(tabId) {
    if (currentActiveTabIndex < tabOrder.indexOf('results')) {
        if (!validateTab(tabOrder[currentActiveTabIndex])) return;
    }

    currentActiveTabIndex = tabOrder.indexOf(tabId);

    document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
    document.getElementById(tabId)?.classList.remove('hidden');

    allNavLinks.forEach(t => {
        t.classList.toggle('active', t.getAttribute('data-tab') === tabId);
    });

    // Scroll to top when changing tabs
    window.scrollTo({ top: 0, behavior: 'smooth' });

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
}

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
        }
    }, 500); // 500ms delay
}

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
    loadFormData();
    showTab('assumptions');
    
    // Add event listeners for all portfolio value, contribution, and return inputs
    [
        'value-equity-in','contribution-equity-in','return-equity-in',
        'value-equity-gl','contribution-equity-gl','return-equity-gl',
        'value-debt','contribution-debt','return-debt',
        'value-real-estate','contribution-real-estate','return-real-estate',
        'value-epf','contribution-epf','return-epf',
        'value-nps','contribution-nps','return-nps',
        'value-other','contribution-other','return-other' // Add other investments
    ].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', updateTotalCorpus);
            el.addEventListener('input', triggerResultUpdate);
        }
    });
    
    // Add event listeners for all basic inputs
    [
        'user-name', 'current-age', 'target-age', 'withdrawal-rate', 'inflation-rate',
        'life-expectancy', 'emergency-fund', 'buffer-percentage',
        'monthly-income', 'sip-stepup-percent', 'stp-amount', 'stp-frequency'
    ].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', triggerResultUpdate);
    });
    
    // Add event listeners for select elements
    [
        'lifestyle-factor-now', 'lifestyle-factor-retire',
        'risk-tolerance-now', 'risk-tolerance-retire',
        'stp-frequency'
    ].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', triggerResultUpdate);
    });
    
    // Add event listeners for tax inputs
    [
        'tax-equity-short-current', 'tax-equity-long-current',
        'tax-debt-short-current', 'tax-debt-long-current',
        'tax-equity-short-retire', 'tax-equity-long-retire',
        'tax-debt-short-retire', 'tax-debt-long-retire'
    ].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', triggerResultUpdate);
    });
    
    // Add event listeners for healthcare buffer inputs
    [
        'healthcare-buffer-value', 'healthcare-buffer-age', 'healthcare-buffer-inflation'
    ].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', triggerResultUpdate);
    });
    
    // Add event listeners for expense inputs
    document.querySelectorAll('.expense-input, .annual-expense-input, .expense-years-input').forEach(input => {
        input.addEventListener('input', updateExpenseDisplays);
        input.addEventListener('input', triggerResultUpdate);
    });
    
    // Add event listeners for goal inputs
    document.querySelectorAll('.goal-name, .goal-value, .goal-years, .goal-inflation').forEach(input => {
        input.addEventListener('input', triggerResultUpdate);
    });
    
    updateTotalCorpus();
});

function updateExpenseDisplays() {
    const totalMonthly = updateTotalExpenses();
    const totalAnnual = totalMonthly * 12;
    const monthlyDisplay = document.getElementById('monthly-expenses-total-display');
    const annualDisplay = document.getElementById('annual-expenses-display');
    if (monthlyDisplay) monthlyDisplay.textContent = `Total Monthly Expenses: ${formatCurrency(totalMonthly)}`;
    if (annualDisplay) annualDisplay.textContent = `Total Annual Expenses: ${formatCurrency(totalAnnual)}`;
}

// Update displays on input change
['.expense-input', '.annual-expense-input', '.expense-years-input'].forEach(cls => {
    document.querySelectorAll(cls).forEach(input => {
        input.addEventListener('input', updateExpenseDisplays);
        input.addEventListener('input', triggerResultUpdate);
    });
});

document.addEventListener('DOMContentLoaded', updateExpenseDisplays);

document.addEventListener('DOMContentLoaded', function() {
  const shareBtn = document.getElementById('share-screenshot-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', async function() {
      const resultsContent = document.getElementById('actual-results-content');
      if (!resultsContent) return;
      shareBtn.disabled = true;
      const originalBtnText = shareBtn.textContent;
      shareBtn.textContent = 'Preparing screenshot...';
      
      // Get user name for personalized sharing
      const userName = document.getElementById('user-name')?.value?.trim() || '';
      const personalizedTitle = userName ? `${userName}'s FIRE Journey Results` : 'My FIRE Calculator Results';
      const personalizedText = userName ? 
        `Check out ${userName}'s FIRE journey results! 🚀` : 
        'Check out my FIRE journey results! 🚀';
      
      // Save original background
      const originalBg = resultsContent.style.backgroundColor;
      
      try {
        // Set a solid dark background for screenshot
        resultsContent.style.backgroundColor = '#181825';
        
        // Wait a moment for the background to apply
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Capture screenshot
        const canvas = await html2canvas(resultsContent, { 
          scale: 2, 
          useCORS: true, 
          backgroundColor: '#181825',
          width: resultsContent.offsetWidth
        });
        
        // Restore original background
        resultsContent.style.backgroundColor = originalBg;
        
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        if (navigator.canShare && navigator.canShare({ files: [new File([blob], 'fire-results.png', { type: 'image/png' })] })) {
          const file = new File([blob], 'fire-results.png', { type: 'image/png' });
          await navigator.share({
            files: [file],
            title: personalizedTitle,
            text: personalizedText
          });
        } else {
          // Fallback: download the image and show a message
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'fire-results.png';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          showMessage('Screenshot downloaded! You can share it manually on social media.', 'info');
        }
      } catch (e) {
        // Restore original background in case of error
        resultsContent.style.backgroundColor = originalBg;
        showMessage('Failed to capture screenshot. Please try again.', 'error');
      }
      shareBtn.textContent = originalBtnText;
      shareBtn.disabled = false;
    });
  }
  
  // Initialize tooltips
  initializeTooltips();
});

// Tooltip functionality
function initializeTooltips() {
  const tooltipElements = document.querySelectorAll('.chart-info[data-tooltip]');
  
  tooltipElements.forEach(element => {
    element.addEventListener('mouseenter', showTooltip);
    element.addEventListener('mouseleave', hideTooltip);
    element.addEventListener('focus', showTooltip);
    element.addEventListener('blur', hideTooltip);
  });
}

function showTooltip(event) {
  const element = event.target;
  const tooltipText = element.getAttribute('data-tooltip');
  
  // Remove existing tooltip
  const existingTooltip = document.querySelector('.custom-tooltip');
  if (existingTooltip) {
    existingTooltip.remove();
  }
  
  // Create tooltip
  const tooltip = document.createElement('div');
  tooltip.className = 'custom-tooltip';
  tooltip.textContent = tooltipText;
  tooltip.style.cssText = `
    position: fixed;
    background: var(--card-bg);
    color: var(--text-primary);
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 0.85rem;
    max-width: 250px;
    z-index: 1000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    border: 1px solid var(--glass-border);
    pointer-events: none;
    white-space: normal;
    line-height: 1.4;
  `;
  
  document.body.appendChild(tooltip);
  
  // Get element position
  const rect = element.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  
  // Calculate position relative to the ? symbol
  let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
  let top = rect.top - tooltipRect.height - 8;
  
  // Adjust if tooltip goes off screen
  if (left < 10) left = 10;
  if (left + tooltipRect.width > window.innerWidth - 10) {
    left = window.innerWidth - tooltipRect.width - 10;
  }
  if (top < 10) {
    // Show below the element if not enough space above
    top = rect.bottom + 8;
  }
  
  tooltip.style.left = left + 'px';
  tooltip.style.top = top + 'px';
}

function hideTooltip() {
  const tooltip = document.querySelector('.custom-tooltip');
  if (tooltip) {
    tooltip.remove();
  }
}