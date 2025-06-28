// Hobby Item Calculator Class
class HobbyCalculator extends CalculatorBase {
    constructor(config) {
        super(config);
        this.setupEventListeners();
    }

    // Override validation for hobby calculator
    validateTab(tabId) {
        switch (tabId) {
            case 'basic':
                return this.validateBasicInfo();
            case 'expenses':
                return this.validateExpenses();
            case 'time':
                return this.validateTimeInvestment();
            default:
                return true;
        }
    }

    validateBasicInfo() {
        const hobbyName = document.getElementById('hobby-name').value.trim();
        const category = document.getElementById('hobby-category').value;
        
        if (!hobbyName) {
            this.showMessage('Please enter a hobby name', 'error');
            return false;
        }
        
        if (!category) {
            this.showMessage('Please select a hobby category', 'error');
            return false;
        }
        
        return true;
    }

    validateExpenses() {
        // All expense fields are optional, so just return true
        return true;
    }

    validateTimeInvestment() {
        const hoursPerSession = parseFloat(document.getElementById('hours-per-session').value) || 0;
        const sessionsPerMonth = parseFloat(document.getElementById('sessions-per-month').value) || 0;
        
        if (hoursPerSession <= 0) {
            this.showMessage('Please enter valid hours per session', 'error');
            return false;
        }
        
        if (sessionsPerMonth <= 0) {
            this.showMessage('Please enter valid sessions per month', 'error');
            return false;
        }
        
        return true;
    }

    // Override calculate method for hobby-specific calculations
    calculate() {
        const data = this.getFormData();
        const results = this.performCalculations(data);
        this.updateResults(results);
        this.createCharts(results);
        this.generateRecommendations(results);
    }

    performCalculations(data) {
        // Parse numeric values
        const initialInvestment = parseFloat(data['initial-investment']) || 0;
        const monthlyBudget = parseFloat(data['monthly-budget']) || 0;
        const equipmentCost = parseFloat(data['equipment-cost']) || 0;
        const suppliesCost = parseFloat(data['supplies-cost']) || 0;
        const membershipCost = parseFloat(data['membership-cost']) || 0;
        const travelCost = parseFloat(data['travel-cost']) || 0;
        const educationCost = parseFloat(data['education-cost']) || 0;
        const otherCost = parseFloat(data['other-cost']) || 0;
        const resaleValue = parseFloat(data['resale-value']) || 0;
        const incomePotential = parseFloat(data['income-potential']) || 0;
        
        const hoursPerSession = parseFloat(data['hours-per-session']) || 0;
        const sessionsPerMonth = parseFloat(data['sessions-per-month']) || 0;
        const hourlyRate = parseFloat(data['hourly-rate']) || 0;
        const learningHours = parseFloat(data['learning-hours']) || 0;
        const enjoymentLevel = parseFloat(data['enjoyment-level']) || 5;

        // Calculate totals
        const totalMonthlyExpenses = monthlyBudget + equipmentCost + suppliesCost + 
                                   membershipCost + travelCost + educationCost + otherCost;
        
        const totalInvestment = initialInvestment + (totalMonthlyExpenses * 12);
        
        const totalHoursPerMonth = (hoursPerSession * sessionsPerMonth) + learningHours;
        const timeValue = totalHoursPerMonth * hourlyRate;
        
        const netCost = totalInvestment - resaleValue - incomePotential;
        const costPerHour = totalHoursPerMonth > 0 ? totalMonthlyExpenses / totalHoursPerMonth : 0;
        
        // Calculate ROI
        const roi = incomePotential > 0 ? ((incomePotential - totalMonthlyExpenses) / totalMonthlyExpenses) * 100 : 0;
        
        // Calculate enjoyment score
        const enjoymentScore = (enjoymentLevel / 10) * 100;

        return {
            totalInvestment,
            totalMonthlyExpenses,
            timeValue,
            netCost,
            costPerHour,
            roi,
            enjoymentScore,
            totalHoursPerMonth,
            monthlyBreakdown: {
                equipment: equipmentCost,
                supplies: suppliesCost,
                membership: membershipCost,
                travel: travelCost,
                education: educationCost,
                other: otherCost,
                budget: monthlyBudget
            }
        };
    }

    updateResults(results) {
        // Update result displays
        document.getElementById('total-investment').textContent = 
            this.formatCurrency(results.totalInvestment);
        
        document.getElementById('monthly-cost').textContent = 
            this.formatCurrency(results.totalMonthlyExpenses);
        
        document.getElementById('time-value').textContent = 
            this.formatCurrency(results.timeValue);
        
        document.getElementById('total-cost').textContent = 
            this.formatCurrency(results.netCost);
    }

    createCharts(results) {
        // Create cost breakdown chart
        const costChart = this.createChart('costBreakdownChart', {
            type: 'doughnut',
            data: {
                labels: ['Equipment', 'Supplies', 'Membership', 'Travel', 'Education', 'Other', 'Budget'],
                datasets: [{
                    data: [
                        results.monthlyBreakdown.equipment,
                        results.monthlyBreakdown.supplies,
                        results.monthlyBreakdown.membership,
                        results.monthlyBreakdown.travel,
                        results.monthlyBreakdown.education,
                        results.monthlyBreakdown.other,
                        results.monthlyBreakdown.budget
                    ],
                    backgroundColor: [
                        '#4CAF50',
                        '#2196F3',
                        '#9C27B0',
                        '#FF9800',
                        '#F44336',
                        '#795548',
                        '#607D8B'
                    ],
                    borderWidth: 2,
                    borderColor: 'rgba(255, 255, 255, 0.1)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#B8BCC8',
                            padding: 15,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${context.label}: ${this.formatCurrency(value)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    generateRecommendations(results) {
        const recommendations = [];
        
        // Cost-based recommendations
        if (results.totalMonthlyExpenses > 10000) {
            recommendations.push('Consider reducing monthly expenses to make this hobby more sustainable');
        }
        
        if (results.costPerHour > 500) {
            recommendations.push('This hobby is quite expensive per hour. Look for ways to reduce costs');
        }
        
        // ROI-based recommendations
        if (results.roi > 50) {
            recommendations.push('Great potential for income generation! Consider monetizing your hobby');
        } else if (results.roi < -20) {
            recommendations.push('This hobby has a negative ROI. Consider if the enjoyment justifies the cost');
        }
        
        // Time-based recommendations
        if (results.totalHoursPerMonth > 40) {
            recommendations.push('This hobby requires significant time commitment. Ensure it fits your schedule');
        }
        
        // Enjoyment-based recommendations
        if (results.enjoymentScore > 80) {
            recommendations.push('High enjoyment level! This hobby provides great value for your investment');
        } else if (results.enjoymentScore < 40) {
            recommendations.push('Low enjoyment level. Consider if this hobby is worth continuing');
        }
        
        // General recommendations
        if (results.netCost < 0) {
            recommendations.push('Excellent! Your hobby is generating positive returns');
        }
        
        if (results.totalInvestment > 50000) {
            recommendations.push('High initial investment. Consider starting smaller and scaling up');
        }
        
        // Update recommendations display
        const recommendationsDiv = document.getElementById('recommendations-list');
        if (recommendations.length > 0) {
            recommendationsDiv.innerHTML = `
                <h4>Personalized Recommendations</h4>
                <ul>
                    ${recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            `;
        } else {
            recommendationsDiv.innerHTML = `
                <h4>Analysis Complete</h4>
                <p>Your hobby appears to be well-balanced. Continue enjoying it!</p>
            `;
        }
    }

    // Override populateForm to handle hobby-specific data
    populateForm() {
        super.populateForm();
        
        // Set default values for new users
        if (!this.data['hours-per-session']) {
            document.getElementById('hours-per-session').value = '2';
        }
        if (!this.data['sessions-per-month']) {
            document.getElementById('sessions-per-month').value = '4';
        }
        if (!this.data['enjoyment-level']) {
            document.getElementById('enjoyment-level').value = '7';
        }
    }
}

// Make the class globally available
window.HobbyCalculator = HobbyCalculator; 