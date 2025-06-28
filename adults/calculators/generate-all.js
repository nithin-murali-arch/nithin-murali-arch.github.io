#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// List of remaining calculators to generate
const calculators = [
    { slug: 'gig-economy-tax', title: 'Gig Economy Tax', description: 'Calculate taxes for gig economy income including deductions, quarterly payments, and self-employment tax.' },
    { slug: 'home-improvement-roi', title: 'Home Improvement ROI', description: 'Calculate return on investment for home improvements and renovations.' },
    { slug: 'student-loan-refinancing', title: 'Student Loan Refinancing', description: 'Compare student loan refinancing options and calculate potential savings.' },
    { slug: 'early-retirement-what-if', title: 'Early Retirement What If', description: 'Explore different scenarios for early retirement planning and financial independence.' },
    { slug: 'car-lease-vs-buy', title: 'Car Lease vs Buy', description: 'Compare the total cost of leasing versus buying a car over time.' },
    { slug: 'bad-habit-cost', title: 'Cost of Bad Habit', description: 'Calculate the financial impact of daily habits and their long-term cost.' },
    { slug: 'family-leave-impact', title: 'Family Leave Impact', description: 'Calculate the financial impact of taking family leave on your income and career.' }
];

function generateCalculator(calculator) {
    const calculatorDir = path.join(__dirname, calculator.slug);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(calculatorDir)) {
        fs.mkdirSync(calculatorDir);
    }

    // Generate HTML
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${calculator.title} - Financial Calculator</title>
    <link rel="icon" href="../common/favicon.ico" type="image/x-icon">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://nithin-murali-arch.github.io/adults/calculators/${calculator.slug}/">
    <meta property="og:title" content="${calculator.title} - Financial Calculator">
    <meta property="og:description" content="${calculator.description}">
    <meta property="og:site_name" content="${calculator.title}">
    <meta property="og:locale" content="en_US">
    <meta property="og:image:type" content="image/png">
    <meta property="og:image:alt" content="${calculator.title} - Financial Calculator">

    <!-- Twitter -->
    <meta property="twitter:card" content="summary">
    <meta property="twitter:url" content="https://nithin-murali-arch.github.io/adults/calculators/${calculator.slug}/">
    <meta property="twitter:title" content="${calculator.title} - Financial Calculator">
    <meta property="twitter:description" content="${calculator.description}">
    <meta property="twitter:creator" content="@nithin_murali">

    <!-- LinkedIn -->
    <meta property="linkedin:owner" content="nithin-murali-arch">
    <meta name="author" content="Nithin Murali">
    <meta name="description" content="${calculator.description}">

    <!-- Additional Meta Tags -->
    <meta name="keywords" content="${calculator.slug.replace('-', ' ')}, financial calculator, ${calculator.title.toLowerCase()}, financial planning">
    <meta name="robots" content="index, follow">
    <meta name="theme-color" content="#FF6B35">
    <meta name="application-name" content="${calculator.title}">
    <meta name="apple-mobile-web-app-title" content="${calculator.title}">

    <!-- Structured Data -->
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": "${calculator.title}",
        "description": "${calculator.description}",
        "url": "https://nithin-murali-arch.github.io/adults/calculators/${calculator.slug}/",
        "applicationCategory": "FinanceApplication",
        "operatingSystem": "Web Browser",
        "author": {
            "@type": "Person",
            "name": "Nithin Murali"
        },
        "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
        },
        "featureList": [
            "Financial Analysis",
            "Data Visualization",
            "Customizable Inputs",
            "Detailed Results",
            "Mobile Responsive"
        ]
    }
    </script>

    <!-- Google Analytics -->
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag() { dataLayer.push(arguments); }
        gtag('js', new Date());
        gtag('config', 'G-X7566Q6TZM');
    </script>
    <script src="https://www.googletagmanager.com/gtag/js?id=G-X7566Q6TZM"></script>
    
    <!-- External Libraries -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
    
    <!-- Shared Styles and Scripts -->
    <link rel="stylesheet" href="../common/calculator-base.css">
    <script src="../common/calculator-base.js"></script>
    
    <!-- Calculator-specific styles and scripts -->
    <link rel="stylesheet" href="${calculator.slug}.css">
    <script src="${calculator.slug}.js"></script>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <h1>${calculator.title}</h1>
            <button class="hamburger-menu" id="hamburger-menu">
                <i class="fas fa-bars"></i>
            </button>
        </div>

        <!-- Desktop Navigation -->
        <nav class="desktop-nav">
            <button class="tab active" data-tab="basic">
                <i class="fas fa-info-circle"></i> Basic Info
            </button>
            <button class="tab" data-tab="details">
                <i class="fas fa-calculator"></i> Details
            </button>
            <button class="tab" data-tab="results">
                <i class="fas fa-chart-line"></i> Results
            </button>
        </nav>

        <!-- Mobile Navigation -->
        <div class="nav-overlay" id="nav-overlay"></div>
        <nav class="mobile-nav" id="mobile-nav">
            <ul class="tab-list">
                <li><a href="#" class="tab active" data-tab="basic"><i class="fas fa-info-circle"></i> Basic Info</a></li>
                <li><a href="#" class="tab" data-tab="details"><i class="fas fa-calculator"></i> Details</a></li>
                <li><a href="#" class="tab" data-tab="results"><i class="fas fa-chart-line"></i> Results</a></li>
            </ul>
        </nav>

        <!-- Tab Contents -->
        <div id="basic" class="tab-content">
            <div class="card">
                <h2>Basic Information</h2>
                <p>Enter the basic information to get started with your ${calculator.title.toLowerCase()} calculation.</p>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="input1">Input 1</label>
                        <input type="number" id="input1" placeholder="Enter value">
                    </div>
                    <div class="form-group">
                        <label for="input2">Input 2</label>
                        <input type="number" id="input2" placeholder="Enter value">
                    </div>
                </div>
            </div>
        </div>

        <div id="details" class="tab-content hidden">
            <div class="card">
                <h2>Additional Details</h2>
                <p>Provide additional details for more accurate calculations.</p>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="input3">Input 3</label>
                        <input type="number" id="input3" placeholder="Enter value">
                    </div>
                    <div class="form-group">
                        <label for="input4">Input 4</label>
                        <input type="number" id="input4" placeholder="Enter value">
                    </div>
                </div>
            </div>
        </div>

        <div id="results" class="tab-content hidden">
            <div class="card">
                <h2>Calculation Results</h2>
                <p>Here are your calculated results for ${calculator.title.toLowerCase()}.</p>
                
                <div class="results-grid">
                    <div class="result-item">
                        <div class="result-value" id="result1">₹0</div>
                        <div class="result-label">Result 1</div>
                    </div>
                    <div class="result-item">
                        <div class="result-value" id="result2">₹0</div>
                        <div class="result-label">Result 2</div>
                    </div>
                </div>

                <div class="card mt-20">
                    <h3>Analysis</h3>
                    <canvas id="analysis-chart" width="400" height="200"></canvas>
                </div>
            </div>
        </div>

        <!-- Navigation Buttons -->
        <div class="navigation-buttons">
            <button class="btn btn-prev" style="display: none;">
                <i class="fas fa-arrow-left"></i> Previous
            </button>
            <button class="btn btn-next">
                Next <i class="fas fa-arrow-right"></i>
            </button>
        </div>
    </div>

    <!-- Initialize Calculator -->
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            // Initialize the calculator
            window.calculator = new ${calculator.slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('')}Calculator({
                calculatorName: '${calculator.title}',
                tabOrder: ['basic', 'details', 'results'],
                localStorageKey: '${calculator.slug}Data'
            });
        });
    </script>
</body>
</html>`;

    // Generate CSS
    const cssContent = `/* ${calculator.title} Calculator Specific Styles */

/* Custom color variables for ${calculator.slug} theme */
:root {
    --${calculator.slug}-primary: #4CAF50;
    --${calculator.slug}-secondary: #2196F3;
    --${calculator.slug}-accent: #9C27B0;
}

/* Enhanced form styling for ${calculator.slug} inputs */
.form-group input[type="number"]:focus {
    border-color: var(--${calculator.slug}-primary);
    box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.1);
}

.form-group select:focus {
    border-color: var(--${calculator.slug}-primary);
    box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.1);
}

/* Results styling with ${calculator.slug} theme */
.result-item {
    background: linear-gradient(135deg, var(--glass-bg) 0%, rgba(76, 175, 80, 0.1) 100%);
    border: 1px solid var(--glass-border);
    border-radius: 18px;
    padding: 25px;
    text-align: center;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
}

.result-item::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, var(--${calculator.slug}-primary), var(--${calculator.slug}-secondary));
}

.result-item:hover {
    transform: translateY(-5px);
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
}

.result-value {
    font-size: 2.2rem;
    font-weight: 800;
    background: linear-gradient(45deg, var(--${calculator.slug}-primary), var(--${calculator.slug}-secondary));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 10px;
}

.result-label {
    color: var(--text-secondary);
    font-size: 0.95rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

/* Chart container styling */
.card canvas {
    max-height: 300px;
    margin: 0 auto;
    display: block;
}

/* Enhanced card styling */
.card {
    background: linear-gradient(135deg, var(--glass-bg) 0%, rgba(255, 255, 255, 0.05) 100%);
    border: 1px solid var(--glass-border);
    border-radius: 20px;
    padding: 30px;
    margin-bottom: 25px;
    transition: all 0.3s ease;
}

.card:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

/* Tab styling with ${calculator.slug} theme */
.desktop-nav .tab.active {
    background: linear-gradient(45deg, var(--${calculator.slug}-primary), var(--${calculator.slug}-secondary));
    color: white;
    font-weight: 600;
    box-shadow: 0 5px 15px rgba(76, 175, 80, 0.3);
}

.desktop-nav .tab:hover {
    background: rgba(76, 175, 80, 0.1);
    color: var(--${calculator.slug}-primary);
}

/* Button styling with ${calculator.slug} theme */
.btn {
    background: linear-gradient(45deg, var(--${calculator.slug}-primary), var(--${calculator.slug}-secondary));
    color: white;
    border: none;
    padding: 14px 28px;
    border-radius: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 0.95rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.btn:hover {
    background: linear-gradient(45deg, #45a049, #1976d2);
    transform: translateY(-3px);
    box-shadow: 0 8px 25px rgba(76, 175, 80, 0.3);
}

.btn.prev {
    background: linear-gradient(45deg, var(--text-muted), #6c757d);
}

.btn.prev:hover {
    background: linear-gradient(45deg, #5a6268, #545b62);
}

/* Animation for results */
@keyframes slideInUp {
    from {
        opacity: 0;
        transform: translateY(30px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.result-item {
    animation: slideInUp 0.6s ease-out;
}

.result-item:nth-child(1) { animation-delay: 0.1s; }
.result-item:nth-child(2) { animation-delay: 0.2s; }`;

    // Generate JavaScript
    const className = calculator.slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
    const jsContent = `// ${calculator.title} Calculator Class
class ${className}Calculator extends CalculatorBase {
    constructor(config) {
        super(config);
        this.setupEventListeners();
    }

    // Override validation for ${calculator.slug} calculator
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

    // Override calculate method for ${calculator.slug}-specific calculations
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
                                return \`\${context.label}: \${this.formatCurrency(value)} (\${percentage}%)\`;
                            }
                        }
                    }
                }
            }
        });
    }

    // Override populateForm to handle ${calculator.slug}-specific data
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
window.${className}Calculator = ${className}Calculator;`;

    // Write files
    fs.writeFileSync(path.join(calculatorDir, 'index.html'), htmlContent);
    fs.writeFileSync(path.join(calculatorDir, `${calculator.slug}.css`), cssContent);
    fs.writeFileSync(path.join(calculatorDir, `${calculator.slug}.js`), jsContent);

    console.log(`✅ Generated ${calculator.title} (${calculator.slug})`);
}

// Generate all calculators
console.log('🚀 Generating remaining calculators...\n');

calculators.forEach(calculator => {
    generateCalculator(calculator);
});

console.log('\n🎉 All calculators generated successfully!');
console.log('\n📝 Next steps:');
console.log('1. Customize each calculator with specific form fields and logic');
console.log('2. Update calculations based on the calculator\'s purpose');
console.log('3. Add appropriate validation and recommendations');
console.log('4. Test each calculator in your browser');
console.log('\n📖 See README.md for detailed documentation and examples.'); 