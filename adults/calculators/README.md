# Financial Calculators - Reusable Structure

This directory contains a collection of financial calculators built with a reusable, modular architecture. Each calculator extends a base class and uses shared styling and functionality.

## Structure

```
adults/calculators/
├── common/                    # Shared assets
│   ├── calculator-base.css    # Base styling for all calculators
│   ├── calculator-base.js     # Base JavaScript class and utilities
│   └── template.html         # HTML template for new calculators
├── hobby-item/               # Hobby Item Calculator (example)
│   ├── index.html           # Calculator HTML
│   ├── hobby-item.css       # Calculator-specific styles
│   └── hobby-item.js        # Calculator-specific logic
└── README.md                # This file
```

## Shared Components

### Base CSS (`calculator-base.css`)
- **Design System**: Consistent color scheme, typography, and spacing
- **Layout Components**: Navigation, forms, cards, buttons, tooltips
- **Responsive Design**: Mobile-first approach with breakpoints
- **Animations**: Smooth transitions and micro-interactions

### Base JavaScript (`calculator-base.js`)
- **CalculatorBase Class**: Abstract base class for all calculators
- **Navigation System**: Tab-based navigation with mobile support
- **Form Management**: Data persistence, validation, and auto-save
- **Tooltip System**: Desktop hover and mobile tap tooltips
- **Utility Functions**: Currency formatting, mobile detection, etc.

## Creating a New Calculator

### 1. Create Directory Structure
```bash
mkdir adults/calculators/your-calculator-name
cd adults/calculators/your-calculator-name
```

### 2. Create HTML File (`index.html`)
Use the template structure:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <!-- Meta tags and SEO -->
    <title>Your Calculator - Financial Calculator</title>
    
    <!-- Shared assets -->
    <link rel="stylesheet" href="../common/calculator-base.css">
    <script src="../common/calculator-base.js"></script>
    
    <!-- Calculator-specific assets -->
    <link rel="stylesheet" href="your-calculator.css">
    <script src="your-calculator.js"></script>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <h1>Your Calculator</h1>
            <button class="hamburger-menu" id="hamburger-menu">
                <i class="fas fa-bars"></i>
            </button>
        </div>

        <!-- Navigation -->
        <nav class="desktop-nav">
            <!-- Define your tabs -->
        </nav>

        <!-- Tab Contents -->
        <div id="tab1" class="tab-content">
            <!-- Your form content -->
        </div>

        <!-- Navigation Buttons -->
        <div class="navigation-buttons">
            <button class="btn btn-prev">Previous</button>
            <button class="btn btn-next">Next</button>
        </div>
    </div>

    <!-- Initialize Calculator -->
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            window.calculator = new YourCalculatorClass({
                calculatorName: 'Your Calculator',
                tabOrder: ['tab1', 'tab2', 'results'],
                localStorageKey: 'yourCalculatorData'
            });
        });
    </script>
</body>
</html>
```

### 3. Create CSS File (`your-calculator.css`)
Extend the base styles with calculator-specific styling:

```css
/* Your Calculator Specific Styles */

/* Custom color variables */
:root {
    --your-primary: #your-color;
    --your-secondary: #your-color;
}

/* Enhanced form styling */
.form-group input:focus {
    border-color: var(--your-primary);
    box-shadow: 0 0 0 3px rgba(your-color, 0.1);
}

/* Results styling */
.result-item {
    background: linear-gradient(135deg, var(--glass-bg) 0%, rgba(your-color, 0.1) 100%);
}

.result-value {
    background: linear-gradient(45deg, var(--your-primary), var(--your-secondary));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

/* Button styling */
.btn {
    background: linear-gradient(45deg, var(--your-primary), var(--your-secondary));
}
```

### 4. Create JavaScript File (`your-calculator.js`)
Extend the base class with your calculator logic:

```javascript
class YourCalculator extends CalculatorBase {
    constructor(config) {
        super(config);
        this.setupEventListeners();
    }

    // Override validation
    validateTab(tabId) {
        switch (tabId) {
            case 'tab1':
                return this.validateTab1();
            case 'tab2':
                return this.validateTab2();
            default:
                return true;
        }
    }

    // Override calculation method
    calculate() {
        const data = this.getFormData();
        const results = this.performCalculations(data);
        this.updateResults(results);
        this.createCharts(results);
    }

    performCalculations(data) {
        // Your calculation logic here
        return {
            result1: calculatedValue1,
            result2: calculatedValue2,
            // ... more results
        };
    }

    updateResults(results) {
        // Update DOM with results
        document.getElementById('result1').textContent = 
            this.formatCurrency(results.result1);
    }

    createCharts(results) {
        // Create charts using Chart.js
        this.createChart('chart-id', {
            type: 'doughnut',
            data: {
                // Chart data
            },
            options: {
                // Chart options
            }
        });
    }
}

// Make globally available
window.YourCalculator = YourCalculator;
```

## Features Available

### Navigation System
- **Desktop Tabs**: Horizontal tab navigation
- **Mobile Navigation**: Hamburger menu with slide-out navigation
- **Progress Tracking**: Visual indication of current step
- **Validation**: Prevents progression with invalid data

### Form Management
- **Auto-save**: Automatically saves form data to localStorage
- **Data Persistence**: Restores form data on page reload
- **Validation**: Built-in validation system with error messages
- **Tooltips**: Helpful information on form fields

### Results Display
- **Grid Layout**: Responsive grid for displaying results
- **Charts**: Chart.js integration for data visualization
- **Animations**: Smooth animations for better UX
- **Responsive**: Works on all device sizes

### Utility Functions
- **Currency Formatting**: Indian currency format (₹, K, L, Cr)
- **Percentage Formatting**: Consistent percentage display
- **Mobile Detection**: Responsive behavior based on screen size
- **Message System**: Toast notifications for user feedback

## Best Practices

### Design Consistency
- Use the established color scheme and typography
- Follow the card-based layout pattern
- Maintain consistent spacing and padding
- Use the same button and input styles

### Code Organization
- Extend the base class for all functionality
- Override only the methods you need to customize
- Use the shared utility functions
- Follow the established naming conventions

### User Experience
- Provide clear labels and helpful tooltips
- Include validation with meaningful error messages
- Use progressive disclosure (tabs) for complex forms
- Ensure mobile-friendly interactions

### Performance
- Minimize DOM queries by caching elements
- Use efficient calculations and avoid unnecessary re-renders
- Optimize chart rendering for better performance
- Implement proper error handling

## Example Calculators

### Hobby Item Calculator
- **Purpose**: Calculate the true cost of hobbies
- **Features**: Expense tracking, time investment analysis, ROI calculation
- **Tabs**: Basic Info, Expenses, Time Investment, Results
- **Charts**: Cost breakdown doughnut chart
- **Recommendations**: Personalized suggestions based on analysis

## Adding New Features

### New Chart Types
```javascript
// In your calculator class
createCustomChart() {
    this.createChart('chart-id', {
        type: 'line', // or 'bar', 'radar', 'polarArea', etc.
        data: {
            labels: ['Label 1', 'Label 2'],
            datasets: [{
                label: 'Dataset',
                data: [value1, value2],
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                borderColor: 'rgba(255, 99, 132, 1)'
            }]
        },
        options: {
            // Chart.js options
        }
    });
}
```

### New Validation Rules
```javascript
validateCustomField() {
    const value = document.getElementById('field-id').value;
    if (value < 0) {
        this.showMessage('Value must be positive', 'error');
        return false;
    }
    return true;
}
```

### New Utility Functions
```javascript
// Add to calculator-base.js
window.CalculatorUtils.customFunction = (param) => {
    // Your utility function
    return result;
};
```

## Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- Progressive enhancement for older browsers

## Dependencies
- **Chart.js**: For data visualization
- **Font Awesome**: For icons
- **Google Fonts**: Inter font family
- **Google Analytics**: For usage tracking

## Contributing
When adding new calculators:
1. Follow the established patterns
2. Test on mobile devices
3. Ensure accessibility compliance
4. Add proper documentation
5. Update this README if needed 