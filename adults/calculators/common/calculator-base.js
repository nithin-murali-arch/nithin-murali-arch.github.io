// --- Calculator Base Class ---
class CalculatorBase {
    constructor(config) {
        this.config = {
            calculatorName: 'Calculator',
            tabOrder: ['basic', 'results'],
            localStorageKey: 'calculatorData',
            ...config
        };
        
        this.currentTabIndex = 0;
        this.data = {};
        this.isInitialized = false;
        this.calculationStartTime = null;
        
        this.init();
    }

    init() {
        this.setupNavigation();
        this.setupTooltips();
        this.setupEventListeners();
        this.loadData();
        this.showTab(this.config.tabOrder[0]);
        this.isInitialized = true;
        
        // Track calculator initialization
        this.trackEvent('calculator_initialized', {
            calculator_name: this.config.calculatorName,
            tab_order: this.config.tabOrder
        });
    }

    // --- Navigation System ---
    setupNavigation() {
        // Desktop navigation
        const desktopNav = document.querySelector('.desktop-nav');
        if (desktopNav) {
            desktopNav.addEventListener('click', (e) => {
                if (e.target.classList.contains('tab')) {
                    const tabId = e.target.dataset.tab;
                    if (tabId) {
                        this.showTab(tabId);
                    }
                }
            });
        }

        // Mobile navigation
        const hamburger = document.getElementById('hamburger-menu');
        if (hamburger) {
            hamburger.addEventListener('click', this.toggleMobileNav.bind(this));
        }

        // Navigation buttons
        const nextBtn = document.querySelector('.btn-next');
        const prevBtn = document.querySelector('.btn-prev');
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.goToNextTab());
        }
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.goToPreviousTab());
        }

        // Close mobile nav when clicking overlay
        const overlay = document.getElementById('nav-overlay');
        if (overlay) {
            overlay.addEventListener('click', this.toggleMobileNav.bind(this));
        }
    }

    toggleMobileNav() {
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
    }

    showTab(tabId) {
        const currentIndex = this.config.tabOrder.indexOf(tabId);
        if (currentIndex === -1) return;

        // Validate current tab before proceeding
        if (this.currentTabIndex < this.config.tabOrder.length - 1) {
            if (!this.validateTab(this.config.tabOrder[this.currentTabIndex])) return;
        }

        const previousTab = this.config.tabOrder[this.currentTabIndex];
        this.currentTabIndex = currentIndex;

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
            this.calculate();
        }

        // Update navigation buttons
        this.updateNavigationButtons();
        
        // Track tab change
        this.trackEvent('tab_changed', {
            from_tab: previousTab,
            to_tab: tabId,
            tab_index: currentIndex
        });
    }

    goToNextTab() {
        if (this.currentTabIndex < this.config.tabOrder.length - 1) {
            this.showTab(this.config.tabOrder[this.currentTabIndex + 1]);
        }
    }

    goToPreviousTab() {
        if (this.currentTabIndex > 0) {
            this.showTab(this.config.tabOrder[this.currentTabIndex - 1]);
        }
    }

    updateNavigationButtons() {
        const nextBtn = document.querySelector('.btn-next');
        const prevBtn = document.querySelector('.btn-prev');
        
        if (nextBtn) {
            nextBtn.style.display = this.currentTabIndex < this.config.tabOrder.length - 1 ? 'block' : 'none';
        }
        
        if (prevBtn) {
            prevBtn.style.display = this.currentTabIndex > 0 ? 'block' : 'none';
        }
    }

    // --- Form Validation ---
    validateTab(tabId) {
        // Override this method in child classes for specific validation
        return true;
    }

    // --- Tooltip System ---
    setupTooltips() {
        // Desktop tooltips (hover)
        document.addEventListener('mouseover', (e) => {
            if (e.target.classList.contains('chart-info')) {
                this.showTooltip(e.target);
            }
        });

        document.addEventListener('mouseout', (e) => {
            if (e.target.classList.contains('chart-info')) {
                this.hideTooltip(e.target);
            }
        });

        // Mobile tooltips (tap)
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('chart-info')) {
                e.preventDefault();
                this.toggleMobileTooltip(e.target);
            }
        });

        // Hide tooltips when clicking elsewhere
        document.addEventListener('click', (e) => {
            if (!e.target.classList.contains('chart-info')) {
                this.hideAllTooltips();
            }
        });
    }

    showTooltip(element) {
        if (this.isMobile()) return;
        element.classList.add('tooltip-active');
    }

    hideTooltip(element) {
        if (this.isMobile()) return;
        element.classList.remove('tooltip-active');
    }

    toggleMobileTooltip(element) {
        if (!this.isMobile()) return;
        
        // Hide all other tooltips first
        document.querySelectorAll('.chart-info').forEach(tooltip => {
            if (tooltip !== element) {
                tooltip.classList.remove('mobile-tooltip-active');
            }
        });
        
        // Toggle current tooltip
        element.classList.toggle('mobile-tooltip-active');
    }

    hideAllTooltips() {
        document.querySelectorAll('.chart-info').forEach(tooltip => {
            tooltip.classList.remove('tooltip-active', 'mobile-tooltip-active');
        });
    }

    isMobile() {
        return window.innerWidth <= 768;
    }

    // --- Data Persistence ---
    saveData() {
        try {
            localStorage.setItem(this.config.localStorageKey, JSON.stringify(this.data));
        } catch (error) {
            console.warn('Failed to save data:', error);
        }
    }

    loadData() {
        try {
            const savedData = localStorage.getItem(this.config.localStorageKey);
            if (savedData) {
                this.data = JSON.parse(savedData);
                this.populateForm();
            }
        } catch (error) {
            console.warn('Failed to load data:', error);
        }
    }

    populateForm() {
        // Override this method in child classes
        Object.keys(this.data).forEach(key => {
            const input = document.getElementById(key);
            if (input && this.data[key] !== undefined) {
                input.value = this.data[key];
            }
        });
    }

    getFormData() {
        const formData = {};
        const inputs = document.querySelectorAll('input, select');
        
        inputs.forEach(input => {
            if (input.id) {
                const value = input.type === 'number' ? parseFloat(input.value) || 0 : input.value;
                formData[input.id] = value;
            }
        });
        
        return formData;
    }

    // --- Utility Functions ---
    formatCurrency(amount, currency = '₹') {
        if (amount === 0) return '0';
        if (amount < 1000) return Math.round(amount).toString();
        if (amount < 100000) return Math.round(amount / 1000) + 'K';
        if (amount < 10000000) return Math.round(amount / 100000) + 'L';
        return Math.round(amount / 10000000) + 'Cr';
    }

    formatPercentage(value, decimals = 1) {
        return (value * 100).toFixed(decimals) + '%';
    }

    showMessage(message, type = 'info') {
        // Create a simple message display
        const messageDiv = document.createElement('div');
        messageDiv.className = `message-box ${type}`;
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--${type === 'error' ? 'fire-red' : 'success-green'});
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }

    // --- Chart Utilities ---
    createChart(canvasId, config) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;
        
        const ctx = canvas.getContext('2d');
        return new Chart(ctx, {
            type: config.type || 'line',
            data: config.data || {},
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#B8BCC8'
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
                            color: '#B8BCC8'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    }
                },
                ...config.options
            }
        });
    }

    // --- Abstract Methods (to be implemented by child classes) ---
    calculate() {
        // Start timing the calculation
        this.calculationStartTime = performance.now();
        
        // Override this method in child classes
        console.warn('calculate() method not implemented');
        
        // Track calculation completion
        this.trackCalculation('default', this.calculationStartTime);
    }

    // --- Event Listeners ---
    setupEventListeners() {
        // Auto-save on input changes
        document.addEventListener('input', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') {
                this.data = this.getFormData();
                this.saveData();
                
                // Track form interaction
                this.trackFormInteraction(e.target.id, 'input_change', {
                    field_type: e.target.type,
                    field_value: e.target.value
                });
            }
        });

        // Handle form submission
        const form = document.querySelector('form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.calculate();
            });
        }
    }

    // --- Tracking Methods ---
    trackEvent(eventName, parameters = {}) {
        // Google Analytics
        if (typeof gtag !== 'undefined') {
            gtag('event', eventName, {
                calculator: this.config.calculatorName,
                ...parameters
            });
        }

        // New Relic
        if (window.NREUM && window.NREUM.customTracking) {
            window.NREUM.customTracking.trackCalculatorUsage(
                this.config.calculatorName,
                eventName,
                parameters
            );
        }
    }

    trackFormInteraction(fieldName, action, data = {}) {
        // Google Analytics
        if (typeof gtag !== 'undefined') {
            gtag('event', 'form_interaction', {
                calculator: this.config.calculatorName,
                field_name: fieldName,
                action: action,
                ...data
            });
        }

        // New Relic
        if (window.NREUM && window.NREUM.customTracking) {
            window.NREUM.customTracking.trackFormInteraction(
                this.config.calculatorName,
                fieldName,
                action
            );
        }
    }

    trackCalculation(calculationType, startTime) {
        const duration = performance.now() - startTime;
        
        // Google Analytics
        if (typeof gtag !== 'undefined') {
            gtag('event', 'calculation_completed', {
                calculator: this.config.calculatorName,
                calculation_type: calculationType,
                duration: duration
            });
        }

        // New Relic
        if (window.NREUM && window.NREUM.customTracking) {
            window.NREUM.customTracking.trackCalculation(
                this.config.calculatorName,
                calculationType,
                duration
            );
        }
    }

    trackError(errorType, errorMessage) {
        // Google Analytics
        if (typeof gtag !== 'undefined') {
            gtag('event', 'exception', {
                description: errorMessage,
                fatal: false,
                calculator: this.config.calculatorName,
                error_type: errorType
            });
        }

        // New Relic
        if (window.NREUM && window.NREUM.customTracking) {
            window.NREUM.customTracking.trackError(
                this.config.calculatorName,
                errorType,
                errorMessage
            );
        }
    }
}

// --- Global Utility Functions ---
window.CalculatorUtils = {
    formatCurrency: (amount, currency = '₹') => {
        if (amount === 0) return '0';
        if (amount < 1000) return Math.round(amount).toString();
        if (amount < 100000) return Math.round(amount / 1000) + 'K';
        if (amount < 10000000) return Math.round(amount / 100000) + 'L';
        return Math.round(amount / 10000000) + 'Cr';
    },

    formatPercentage: (value, decimals = 1) => {
        return (value * 100).toFixed(decimals) + '%';
    },

    isMobile: () => window.innerWidth <= 768,

    showMessage: (message, type = 'info') => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message-box ${type}`;
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--${type === 'error' ? 'fire-red' : 'success-green'});
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }
};

// --- Initialize when DOM is ready ---
document.addEventListener('DOMContentLoaded', () => {
    // Global tooltip setup
    const tooltipSetup = () => {
        document.addEventListener('click', (e) => {
            if (!e.target.classList.contains('chart-info')) {
                document.querySelectorAll('.chart-info').forEach(tooltip => {
                    tooltip.classList.remove('mobile-tooltip-active');
                });
            }
        });
    };

    tooltipSetup();
}); 