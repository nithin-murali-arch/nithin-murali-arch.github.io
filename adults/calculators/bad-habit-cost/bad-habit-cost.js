// Cost of Bad Habit Calculator Class
class BadHabitCostCalculator extends CalculatorBase {
    constructor(config) {
        super(config);
        this.setupEventListeners();
    }

    // Override validation for bad-habit-cost calculator
    validateTab(tabId) {
        switch (tabId) {
            case 'basic':
                return this.validateBasicInfo();
            case 'details':
                return this.validateDetails();
            default:
                return true;
        }
    }

    validateBasicInfo() {
        const input1 = document.getElementById('input1').value.trim();
        const input2 = document.getElementById('input2').value.trim();
        
        if (!input1 || parseFloat(input1) <= 0) {
            this.showMessage('Please enter a valid value for Input 1', 'error');
            return false;
        }
        
        if (!input2 || parseFloat(input2) <= 0) {
            this.showMessage('Please enter a valid value for Input 2', 'error');
            return false;
        }
        
        return true;
    }

    validateDetails() {
        // Add validation logic for details tab
        return true;
    }

    // Override calculate method for bad-habit-cost-specific calculations
    calculate() {
        const data = this.getFormData();
        const results = this.performCalculations(data);
        this.updateResults(results);
        this.createCharts(results);
    }

    performCalculations(data) {
        // Parse numeric values
        const input1 = parseFloat(data.input1) || 0;
        const input2 = parseFloat(data.input2) || 0;
        const input3 = parseFloat(data.input3) || 0;
        const input4 = parseFloat(data.input4) || 0;

        // Perform your calculations here
        const result1 = input1 * input2;
        const result2 = input3 + input4;

        return {
            result1,
            result2,
            // Add more calculated values as needed
        };
    }

    updateResults(results) {
        // Update result displays
        document.getElementById('result1').textContent = 
            this.formatCurrency(results.result1);
        
        document.getElementById('result2').textContent = 
            this.formatCurrency(results.result2);
    }

    createCharts(results) {
        // Create analysis chart
        this.createChart('analysis-chart', {
            type: 'doughnut',
            data: {
                labels: ['Result 1', 'Result 2'],
                datasets: [{
                    data: [results.result1, results.result2],
                    backgroundColor: [
                        '#4CAF50',
                        '#2196F3'
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

    // Override populateForm to handle bad-habit-cost-specific data
    populateForm() {
        super.populateForm();
        
        // Set default values for new users
        if (!this.data.input1) {
            document.getElementById('input1').value = '1000';
        }
        if (!this.data.input2) {
            document.getElementById('input2').value = '12';
        }
    }
}

// Make the class globally available
window.BadHabitCostCalculator = BadHabitCostCalculator;