// New Relic Browser Agent Configuration
// This is the actual configuration used in the FIRE calculator
;window.NREUM||(NREUM={});NREUM.init={privacy:{cookies_enabled:true},ajax:{deny_list:["bam.nr-data.net"]}};
;NREUM.loader_config={accountID:"6868563",trustKey:"6868563",agentID:"1103422883",licenseKey:"NRJS-6675c673671042b1b48",applicationID:"1103422883"};
;NREUM.info={beacon:"bam.nr-data.net",errorBeacon:"bam.nr-data.net",licenseKey:"NRJS-6675c673671042b1b48",applicationID:"1103422883",sa:1};

// Load New Relic Browser Agent
(function() {
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://js-agent.newrelic.com/nr-loader-spa-1.292.0.min.js';
    script.async = true;
    document.head.appendChild(script);
})();

// Custom New Relic tracking functions
window.NREUM = window.NREUM || {};
window.NREUM.customTracking = {
    // Track calculator usage
    trackCalculatorUsage: function(calculatorName, action, data = {}) {
        if (typeof newrelic !== 'undefined') {
            newrelic.addPageAction('calculator_action', {
                calculator: calculatorName,
                action: action,
                ...data
            });
        }
    },

    // Track form interactions
    trackFormInteraction: function(calculatorName, fieldName, action) {
        if (typeof newrelic !== 'undefined') {
            newrelic.addPageAction('form_interaction', {
                calculator: calculatorName,
                field: fieldName,
                action: action
            });
        }
    },

    // Track calculation events
    trackCalculation: function(calculatorName, calculationType, duration) {
        if (typeof newrelic !== 'undefined') {
            newrelic.addPageAction('calculation_completed', {
                calculator: calculatorName,
                type: calculationType,
                duration: duration
            });
        }
    },

    // Track error events
    trackError: function(calculatorName, errorType, errorMessage) {
        if (typeof newrelic !== 'undefined') {
            newrelic.noticeError(new Error(errorMessage), {
                calculator: calculatorName,
                errorType: errorType
            });
        }
    }
}; 