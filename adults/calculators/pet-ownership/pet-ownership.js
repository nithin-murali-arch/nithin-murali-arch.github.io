// Pet Ownership Cost Calculator Class
class PetOwnershipCalculator extends CalculatorBase {
    constructor(config) {
        super(config);
        this.setupEventListeners();
    }

    // Override validation for pet ownership calculator
    validateTab(tabId) {
        switch (tabId) {
            case 'pet-info':
                return this.validatePetInfo();
            case 'basic-care':
                return this.validateBasicCare();
            case 'healthcare':
                return this.validateHealthcare();
            default:
                return true;
        }
    }

    validatePetInfo() {
        const petName = document.getElementById('pet-name').value.trim();
        const petType = document.getElementById('pet-type').value;
        const petAge = parseFloat(document.getElementById('pet-age').value) || 0;
        const lifeExpectancy = parseFloat(document.getElementById('life-expectancy').value) || 0;
        
        if (!petName) {
            this.showMessage('Please enter your pet\'s name', 'error');
            return false;
        }
        
        if (!petType) {
            this.showMessage('Please select a pet type', 'error');
            return false;
        }
        
        if (petAge < 0) {
            this.showMessage('Please enter a valid pet age', 'error');
            return false;
        }
        
        if (lifeExpectancy <= 0) {
            this.showMessage('Please enter expected lifespan', 'error');
            return false;
        }
        
        return true;
    }

    validateBasicCare() {
        const foodCost = parseFloat(document.getElementById('food-cost').value) || 0;
        
        if (foodCost < 0) {
            this.showMessage('Please enter a valid food cost', 'error');
            return false;
        }
        
        return true;
    }

    validateHealthcare() {
        // All healthcare fields are optional, so just return true
        return true;
    }

    // Override calculate method for pet ownership-specific calculations
    calculate() {
        const data = this.getFormData();
        const results = this.performCalculations(data);
        this.updateResults(results);
        this.createCharts(results);
        this.generateRecommendations(results);
    }

    performCalculations(data) {
        // Parse pet information
        const petAge = parseFloat(data['pet-age']) || 0;
        const lifeExpectancy = parseFloat(data['life-expectancy']) || 12;
        const petType = data['pet-type'];
        const petSize = data['pet-size'];

        // Parse basic care costs
        const foodCost = parseFloat(data['food-cost']) || 0;
        const treatsCost = parseFloat(data['treats-cost']) || 0;
        const groomingCost = parseFloat(data['grooming-cost']) || 0;
        const toysCost = parseFloat(data['toys-cost']) || 0;
        const litterCost = parseFloat(data['litter-cost']) || 0;
        const boardingCost = parseFloat(data['boarding-cost']) || 0;
        const trainingCost = parseFloat(data['training-cost']) || 0;
        const equipmentCost = parseFloat(data['equipment-cost']) || 0;

        // Parse healthcare costs
        const insurancePremium = parseFloat(data['insurance-premium']) || 0;
        const insuranceDeductible = parseFloat(data['insurance-deductible']) || 0;
        const vaccinationCost = parseFloat(data['vaccination-cost']) || 0;
        const checkupCost = parseFloat(data['checkup-cost']) || 0;
        const dentalCost = parseFloat(data['dental-cost']) || 0;
        const parasitePrevention = parseFloat(data['parasite-prevention']) || 0;
        const emergencyFund = parseFloat(data['emergency-fund']) || 0;
        const medicationCost = parseFloat(data['medication-cost']) || 0;
        const spayNeuter = parseFloat(data['spay-neuter']) || 0;
        const microchip = parseFloat(data['microchip']) || 0;

        // Calculate monthly costs
        const monthlyBasicCare = foodCost + treatsCost + groomingCost + toysCost + litterCost + boardingCost;
        const monthlyHealthcare = insurancePremium + (medicationCost || 0);
        const monthlyTotal = monthlyBasicCare + monthlyHealthcare;

        // Calculate annual costs
        const annualBasicCare = monthlyBasicCare * 12;
        const annualHealthcare = (vaccinationCost + checkupCost + dentalCost + parasitePrevention + emergencyFund) / 12 * 12;
        const annualTotal = annualBasicCare + annualHealthcare + insuranceDeductible;

        // Calculate one-time costs
        const oneTimeCosts = trainingCost + equipmentCost + spayNeuter + microchip;

        // Calculate remaining years
        const remainingYears = Math.max(0, lifeExpectancy - petAge);

        // Calculate lifetime costs
        const lifetimeRecurring = annualTotal * remainingYears;
        const lifetimeTotal = lifetimeRecurring + oneTimeCosts;

        // Calculate emergency budget (6 months of expenses)
        const emergencyBudget = monthlyTotal * 6 + emergencyFund;

        // Calculate cost per year
        const costPerYear = lifetimeTotal / Math.max(1, remainingYears);

        // Calculate cost per month
        const costPerMonth = costPerYear / 12;

        return {
            monthlyTotal,
            annualTotal,
            lifetimeTotal,
            emergencyBudget,
            costPerYear,
            costPerMonth,
            remainingYears,
            oneTimeCosts,
            costBreakdown: {
                monthly: {
                    food: foodCost,
                    treats: treatsCost,
                    grooming: groomingCost,
                    toys: toysCost,
                    litter: litterCost,
                    boarding: boardingCost,
                    insurance: insurancePremium,
                    medication: medicationCost
                },
                annual: {
                    vaccinations: vaccinationCost,
                    checkups: checkupCost,
                    dental: dentalCost,
                    parasite: parasitePrevention,
                    emergency: emergencyFund,
                    deductible: insuranceDeductible
                },
                oneTime: {
                    training: trainingCost,
                    equipment: equipmentCost,
                    spayNeuter: spayNeuter,
                    microchip: microchip
                }
            }
        };
    }

    updateResults(results) {
        // Update result displays
        document.getElementById('monthly-cost').textContent = 
            this.formatCurrency(results.monthlyTotal);
        
        document.getElementById('annual-cost').textContent = 
            this.formatCurrency(results.annualTotal);
        
        document.getElementById('lifetime-cost').textContent = 
            this.formatCurrency(results.lifetimeTotal);
        
        document.getElementById('emergency-budget').textContent = 
            this.formatCurrency(results.emergencyBudget);
    }

    createCharts(results) {
        // Create cost breakdown chart
        this.createChart('cost-breakdown-chart', {
            type: 'doughnut',
            data: {
                labels: ['Food & Treats', 'Grooming & Toys', 'Healthcare', 'Insurance', 'Emergency Fund'],
                datasets: [{
                    data: [
                        results.costBreakdown.monthly.food + results.costBreakdown.monthly.treats,
                        results.costBreakdown.monthly.grooming + results.costBreakdown.monthly.toys,
                        results.costBreakdown.annual.vaccinations + results.costBreakdown.annual.checkups + results.costBreakdown.annual.dental,
                        results.costBreakdown.monthly.insurance * 12 + results.costBreakdown.annual.deductible,
                        results.costBreakdown.annual.emergency
                    ],
                    backgroundColor: [
                        '#4CAF50',
                        '#2196F3',
                        '#FF9800',
                        '#9C27B0',
                        '#F44336'
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
        const petType = document.getElementById('pet-type').value;
        const petSize = document.getElementById('pet-size').value;
        
        // Cost-based recommendations
        if (results.monthlyTotal > 15000) {
            recommendations.push('High monthly costs. Consider ways to reduce expenses while maintaining quality care');
        } else if (results.monthlyTotal < 5000) {
            recommendations.push('Low monthly costs. Ensure you\'re providing adequate care for your pet');
        }
        
        // Emergency fund recommendations
        if (results.emergencyBudget < results.monthlyTotal * 3) {
            recommendations.push('Consider building a larger emergency fund for unexpected veterinary expenses');
        }
        
        // Insurance recommendations
        const insuranceCost = results.costBreakdown.monthly.insurance * 12;
        if (insuranceCost > 0 && insuranceCost < results.annualTotal * 0.1) {
            recommendations.push('Pet insurance appears to be a good value for your situation');
        } else if (insuranceCost > results.annualTotal * 0.2) {
            recommendations.push('Consider if pet insurance is cost-effective for your pet\'s needs');
        }
        
        // Pet type specific recommendations
        if (petType === 'dog') {
            if (petSize === 'large' || petSize === 'giant') {
                recommendations.push('Large dogs typically have higher food and healthcare costs. Plan accordingly');
            }
            if (results.costBreakdown.monthly.grooming === 0) {
                recommendations.push('Consider budgeting for regular grooming, especially for long-haired breeds');
            }
        } else if (petType === 'cat') {
            if (results.costBreakdown.monthly.litter === 0) {
                recommendations.push('Don\'t forget to budget for cat litter and litter box maintenance');
            }
        }
        
        // Lifetime cost considerations
        if (results.lifetimeTotal > 500000) {
            recommendations.push('High lifetime costs. Ensure this fits your long-term financial plan');
        }
        
        // Age-based recommendations
        const petAge = parseFloat(document.getElementById('pet-age').value) || 0;
        if (petAge > 7) {
            recommendations.push('Senior pets may require more frequent veterinary care and specialized diets');
        }
        
        // Cost per year analysis
        if (results.costPerYear > 100000) {
            recommendations.push('High annual costs. Look for ways to reduce expenses without compromising care');
        }
        
        // Update recommendations display
        const recommendationsDiv = document.getElementById('recommendations');
        if (recommendations.length > 0) {
            recommendationsDiv.innerHTML = `
                <h4>Pet Care Recommendations</h4>
                <ul>
                    ${recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            `;
        } else {
            recommendationsDiv.innerHTML = `
                <h4>Analysis Complete</h4>
                <p>Your pet care budget appears well-balanced. Continue providing excellent care!</p>
            `;
        }
    }

    // Override populateForm to handle pet ownership-specific data
    populateForm() {
        super.populateForm();
        
        // Set default values for new users
        if (!this.data['pet-age']) {
            document.getElementById('pet-age').value = '2';
        }
        if (!this.data['life-expectancy']) {
            document.getElementById('life-expectancy').value = '12';
        }
        if (!this.data['food-cost']) {
            document.getElementById('food-cost').value = '2000';
        }
        if (!this.data['grooming-cost']) {
            document.getElementById('grooming-cost').value = '1000';
        }
        if (!this.data['insurance-premium']) {
            document.getElementById('insurance-premium').value = '800';
        }
        if (!this.data['emergency-fund']) {
            document.getElementById('emergency-fund').value = '10000';
        }
    }
}

// Make the class globally available
window.PetOwnershipCalculator = PetOwnershipCalculator;