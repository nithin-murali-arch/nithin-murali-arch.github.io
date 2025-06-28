// Google Ads Integration for Calculators
// Replace 'ca-pub-8268518333873371' with your actual AdSense publisher ID

class GoogleAdsManager {
    constructor(config = {}) {
        this.config = {
            publisherId: 'ca-pub-8268518333873371',
            calculatorName: 'Calculator',
            enableAds: true,
            ...config
        };
        
        this.adSlots = {};
        this.init();
    }

    init() {
        if (!this.config.enableAds) return;
        
        this.loadAdSense();
        this.setupAdSlots();
        this.trackAdEvents();
    }

    loadAdSense() {
        // Load Google AdSense script
        const script = document.createElement('script');
        script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${this.config.publisherId}`;
        script.crossOrigin = 'anonymous';
        script.async = true;
        document.head.appendChild(script);
    }

    setupAdSlots() {
        // Create ad slots for different positions
        this.createAdSlot('header-ad', 'Header Advertisement', 'responsive');
        this.createAdSlot('sidebar-ad', 'Sidebar Advertisement', 'responsive');
        this.createAdSlot('footer-ad', 'Footer Advertisement', 'responsive');
        this.createAdSlot('results-ad', 'Results Advertisement', 'responsive');
    }

    createAdSlot(elementId, adName, format = 'responsive') {
        const adElement = document.getElementById(elementId);
        if (!adElement) return;

        const adSlot = {
            element: adElement,
            name: adName,
            format: format,
            loaded: false
        };

        this.adSlots[elementId] = adSlot;

        // Create AdSense ad
        const adCode = `
            <ins class="adsbygoogle"
                 style="display:block"
                 data-ad-client="${this.config.publisherId}"
                 data-ad-slot="YOUR_AD_SLOT_ID"
                 data-ad-format="${format}"
                 data-full-width-responsive="true"></ins>
            <script>
                (adsbygoogle = window.adsbygoogle || []).push({});
            </script>
        `;

        adElement.innerHTML = adCode;
    }

    trackAdEvents() {
        // Track ad impressions
        document.addEventListener('DOMContentLoaded', () => {
            this.trackAdImpression('page_load');
        });

        // Track ad clicks
        document.addEventListener('click', (e) => {
            if (e.target.closest('.adsbygoogle')) {
                this.trackAdClick(e.target.closest('.adsbygoogle').id);
            }
        });
    }

    trackAdImpression(trigger) {
        // Google Analytics
        if (typeof gtag !== 'undefined') {
            gtag('event', 'ad_impression', {
                calculator: this.config.calculatorName,
                trigger: trigger,
                publisher_id: this.config.publisherId
            });
        }

        // New Relic
        if (window.NREUM && window.NREUM.customTracking) {
            window.NREUM.customTracking.trackCalculatorUsage(
                this.config.calculatorName,
                'ad_impression',
                {
                    trigger: trigger,
                    publisher_id: this.config.publisherId
                }
            );
        }
    }

    trackAdClick(adSlotId) {
        // Google Analytics
        if (typeof gtag !== 'undefined') {
            gtag('event', 'ad_click', {
                calculator: this.config.calculatorName,
                ad_slot: adSlotId,
                publisher_id: this.config.publisherId
            });
        }

        // New Relic
        if (window.NREUM && window.NREUM.customTracking) {
            window.NREUM.customTracking.trackCalculatorUsage(
                this.config.calculatorName,
                'ad_click',
                {
                    ad_slot: adSlotId,
                    publisher_id: this.config.publisherId
                }
            );
        }
    }

    // Method to refresh ads
    refreshAds() {
        Object.values(this.adSlots).forEach(slot => {
            if (slot.element && !slot.loaded) {
                try {
                    (adsbygoogle = window.adsbygoogle || []).push({});
                    slot.loaded = true;
                } catch (error) {
                    console.error('Error refreshing ad:', error);
                }
            }
        });
    }

    // Method to disable ads for specific users
    disableAds() {
        this.config.enableAds = false;
        Object.values(this.adSlots).forEach(slot => {
            if (slot.element) {
                slot.element.style.display = 'none';
            }
        });
    }

    // Method to enable ads
    enableAds() {
        this.config.enableAds = true;
        Object.values(this.adSlots).forEach(slot => {
            if (slot.element) {
                slot.element.style.display = 'block';
            }
        });
        this.refreshAds();
    }
}

// Global function to initialize ads
window.initializeGoogleAds = function(config) {
    window.googleAdsManager = new GoogleAdsManager(config);
};

// Auto-initialize if config is available
if (window.calculatorConfig && window.calculatorConfig.googleAds) {
    window.initializeGoogleAds(window.calculatorConfig.googleAds);
} 