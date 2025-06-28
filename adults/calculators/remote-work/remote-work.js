// Remote Work Relocation Calculator Class
class RemoteWorkCalculator extends CalculatorBase {
    constructor(config) {
        super(config);
        this.setupEventListeners();
    }

    // Override validation for remote work calculator
    validateTab(tabId) {
        switch (tabId) {
            case 'current':
                return this.validateCurrentLocation();
            case 'new-location':
                return this.validateNewLocation();
            case 'relocation':
                return this.validateRelocationCosts();
            default:
                return true;
        }
    }

    validateCurrentLocation() {
        const currentCity = document.getElementById('current-city').value.trim();
        const currentSalary = parseFloat(document.getElementById('current-salary').value) || 0;
        const currentRent = parseFloat(document.getElementById('current-rent').value) || 0;
        
        if (!currentCity) {
            this.showMessage('Please enter your current city', 'error');
            return false;
        }
        
        if (currentSalary <= 0) {
            this.showMessage('Please enter a valid current salary', 'error');
            return false;
        }
        
        if (currentRent <= 0) {
            this.showMessage('Please enter your current monthly rent', 'error');
            return false;
        }
        
        return true;
    }

    validateNewLocation() {
        const newCity = document.getElementById('new-city').value.trim();
        const newSalary = parseFloat(document.getElementById('new-salary').value) || 0;
        const newRent = parseFloat(document.getElementById('new-rent').value) || 0;
        
        if (!newCity) {
            this.showMessage('Please enter your new city', 'error');
            return false;
        }
        
        if (newSalary <= 0) {
            this.showMessage('Please enter a valid new salary', 'error');
            return false;
        }
        
        if (newRent <= 0) {
            this.showMessage('Please enter your new monthly rent', 'error');
            return false;
        }
        
        return true;
    }

    validateRelocationCosts() {
        // All relocation cost fields are optional, so just return true
        return true;
    }

    // Override calculate method for remote work-specific calculations
    calculate() {
        const data = this.getFormData();
        const results = this.performCalculations(data);
        this.updateResults(results);
        this.createCharts(results);
        this.generateRecommendations(results);
    }

    performCalculations(data) {
        // Parse current location data
        const currentSalary = parseFloat(data['current-salary']) || 0;
        const currentRent = parseFloat(data['current-rent']) || 0;
        const currentUtilities = parseFloat(data['current-utilities']) || 0;
        const currentTransport = parseFloat(data['current-transport']) || 0;
        const currentFood = parseFloat(data['current-food']) || 0;
        const currentEntertainment = parseFloat(data['current-entertainment']) || 0;
        const currentOther = parseFloat(data['current-other']) || 0;

        // Parse new location data
        const newSalary = parseFloat(data['new-salary']) || 0;
        const newRent = parseFloat(data['new-rent']) || 0;
        const newUtilities = parseFloat(data['new-utilities']) || 0;
        const newTransport = parseFloat(data['new-transport']) || 0;
        const newFood = parseFloat(data['new-food']) || 0;
        const newEntertainment = parseFloat(data['new-entertainment']) || 0;
        const newOther = parseFloat(data['new-other']) || 0;
        const costOfLivingIndex = parseFloat(data['cost-of-living-index']) || 100;
        const qualityOfLife = parseFloat(data['quality-of-life']) || 5;

        // Parse relocation costs
        const movingCosts = parseFloat(data['moving-costs']) || 0;
        const travelCosts = parseFloat(data['travel-costs']) || 0;
        const depositCosts = parseFloat(data['deposit-costs']) || 0;
        const setupCosts = parseFloat(data['setup-costs']) || 0;
        const legalCosts = parseFloat(data['legal-costs']) || 0;
        const otherRelocation = parseFloat(data['other-relocation']) || 0;
        const timeOff = parseFloat(data['time-off']) || 0;
        const dailyRate = parseFloat(data['daily-rate']) || 0;

        // Calculate monthly expenses
        const currentMonthlyExpenses = currentRent + currentUtilities + currentTransport + 
                                      currentFood + currentEntertainment + currentOther;
        
        const newMonthlyExpenses = newRent + newUtilities + newTransport + 
                                  newFood + newEntertainment + newOther;

        // Calculate salary adjustments
        const salaryDifference = newSalary - currentSalary;
        const salaryChangePercentage = currentSalary > 0 ? (salaryDifference / currentSalary) * 100 : 0;

        // Calculate monthly savings
        const monthlySavings = currentMonthlyExpenses - newMonthlyExpenses;
        const annualSavings = monthlySavings * 12;

        // Calculate total relocation costs
        const unpaidLeaveCost = timeOff * dailyRate;
        const totalRelocationCost = movingCosts + travelCosts + depositCosts + 
                                   setupCosts + legalCosts + otherRelocation + unpaidLeaveCost;

        // Calculate break-even point
        const breakEvenMonths = monthlySavings > 0 ? totalRelocationCost / monthlySavings : 0;

        // Calculate cost of living adjustment
        const costOfLivingAdjustment = (costOfLivingIndex - 100) / 100;
        const adjustedMonthlySavings = monthlySavings - (currentMonthlyExpenses * costOfLivingAdjustment);

        // Calculate quality of life score
        const qualityOfLifeScore = (qualityOfLife / 10) * 100;

        // Calculate ROI
        const roi = totalRelocationCost > 0 ? (annualSavings / totalRelocationCost) * 100 : 0;

        return {
            currentMonthlyExpenses,
            newMonthlyExpenses,
            monthlySavings,
            annualSavings,
            totalRelocationCost,
            breakEvenMonths,
            salaryDifference,
            salaryChangePercentage,
            costOfLivingAdjustment,
            adjustedMonthlySavings,
            qualityOfLifeScore,
            roi,
            costBreakdown: {
                current: {
                    rent: currentRent,
                    utilities: currentUtilities,
                    transport: currentTransport,
                    food: currentFood,
                    entertainment: currentEntertainment,
                    other: currentOther
                },
                new: {
                    rent: newRent,
                    utilities: newUtilities,
                    transport: newTransport,
                    food: newFood,
                    entertainment: newEntertainment,
                    other: newOther
                }
            }
        };
    }

    updateResults(results) {
        // Update result displays
        document.getElementById('monthly-savings').textContent = 
            this.formatCurrency(results.monthlySavings);
        
        document.getElementById('annual-savings').textContent = 
            this.formatCurrency(results.annualSavings);
        
        document.getElementById('total-relocation-cost').textContent = 
            this.formatCurrency(results.totalRelocationCost);
        
        document.getElementById('break-even-months').textContent = 
            results.breakEvenMonths > 0 ? Math.ceil(results.breakEvenMonths) + ' months' : 'N/A';
    }

    createCharts(results) {
        // Create cost comparison chart
        this.createChart('cost-comparison-chart', {
            type: 'bar',
            data: {
                labels: ['Rent', 'Utilities', 'Transport', 'Food', 'Entertainment', 'Other'],
                datasets: [{
                    label: 'Current Location',
                    data: [
                        results.costBreakdown.current.rent,
                        results.costBreakdown.current.utilities,
                        results.costBreakdown.current.transport,
                        results.costBreakdown.current.food,
                        results.costBreakdown.current.entertainment,
                        results.costBreakdown.current.other
                    ],
                    backgroundColor: 'rgba(255, 107, 53, 0.8)',
                    borderColor: 'rgba(255, 107, 53, 1)',
                    borderWidth: 1
                }, {
                    label: 'New Location',
                    data: [
                        results.costBreakdown.new.rent,
                        results.costBreakdown.new.utilities,
                        results.costBreakdown.new.transport,
                        results.costBreakdown.new.food,
                        results.costBreakdown.new.entertainment,
                        results.costBreakdown.new.other
                    ],
                    backgroundColor: 'rgba(76, 175, 80, 0.8)',
                    borderColor: 'rgba(76, 175, 80, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: '#B8BCC8',
                            padding: 15
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                return `${context.dataset.label}: ${this.formatCurrency(context.parsed.y)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: '#B8BCC8'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    y: {
                        ticks: {
                            color: '#B8BCC8',
                            callback: (value) => this.formatCurrency(value)
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    }
                }
            }
        });
    }

    generateRecommendations(results) {
        const recommendations = [];
        
        // Savings-based recommendations
        if (results.monthlySavings > 10000) {
            recommendations.push('Excellent monthly savings! This relocation could significantly improve your financial situation');
        } else if (results.monthlySavings > 0) {
            recommendations.push('Positive monthly savings. The relocation appears financially beneficial');
        } else if (results.monthlySavings < -5000) {
            recommendations.push('Higher costs in new location. Consider if the lifestyle benefits justify the increased expenses');
        }
        
        // Break-even analysis
        if (results.breakEvenMonths > 0 && results.breakEvenMonths < 12) {
            recommendations.push('Quick break-even period! You\'ll recover relocation costs within a year');
        } else if (results.breakEvenMonths > 24) {
            recommendations.push('Long break-even period. Consider if you plan to stay long enough to justify the move');
        }
        
        // Salary considerations
        if (results.salaryChangePercentage > 10) {
            recommendations.push('Significant salary increase! This relocation offers both lifestyle and financial benefits');
        } else if (results.salaryChangePercentage < -10) {
            recommendations.push('Salary reduction. Ensure the lifestyle benefits outweigh the income decrease');
        }
        
        // Quality of life
        if (results.qualityOfLifeScore > 80) {
            recommendations.push('High quality of life score! The lifestyle benefits may outweigh pure financial considerations');
        }
        
        // ROI analysis
        if (results.roi > 50) {
            recommendations.push('Excellent ROI! This relocation offers strong financial returns');
        } else if (results.roi < 0) {
            recommendations.push('Negative ROI. Consider if non-financial benefits justify the investment');
        }
        
        // Cost of living adjustments
        if (results.costOfLivingAdjustment < -0.1) {
            recommendations.push('Lower cost of living area. Your money will go further in the new location');
        } else if (results.costOfLivingAdjustment > 0.1) {
            recommendations.push('Higher cost of living area. Factor this into your long-term financial planning');
        }
        
        // Update recommendations display
        const recommendationsDiv = document.getElementById('recommendations');
        if (recommendations.length > 0) {
            recommendationsDiv.innerHTML = `
                <h4>Relocation Recommendations</h4>
                <ul>
                    ${recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            `;
        } else {
            recommendationsDiv.innerHTML = `
                <h4>Analysis Complete</h4>
                <p>The relocation appears to be financially neutral. Consider lifestyle and personal factors.</p>
            `;
        }
    }

    // Override populateForm to handle remote work-specific data
    populateForm() {
        super.populateForm();
        
        // Set default values for new users
        if (!this.data['cost-of-living-index']) {
            document.getElementById('cost-of-living-index').value = '100';
        }
        if (!this.data['quality-of-life']) {
            document.getElementById('quality-of-life').value = '7';
        }
        if (!this.data['daily-rate']) {
            document.getElementById('daily-rate').value = '3000';
        }
    }
}

// Make the class globally available
window.RemoteWorkCalculator = RemoteWorkCalculator;