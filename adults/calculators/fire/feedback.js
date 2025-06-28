// Feedback System with Google Sign-In, Google Analytics, and New Relic Integration

class FeedbackSystem {
    constructor() {
        this.currentUser = null;
        this.currentRating = 0;
        this.currentTab = 'assumptions';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupGoogleSignIn();
        this.setupScrollToBottom();
        this.trackCurrentTab();
    }

    setupEventListeners() {
        // Feedback FAB
        document.getElementById('feedback-fab').addEventListener('click', () => {
            this.openFeedbackModal();
        });

        // Scroll to bottom bubble
        document.getElementById('scroll-to-bottom').addEventListener('click', () => {
            this.scrollToResults();
        });

        // Modal close buttons
        document.getElementById('close-feedback').addEventListener('click', () => {
            this.closeFeedbackModal();
        });

        document.getElementById('cancel-feedback').addEventListener('click', () => {
            this.closeFeedbackModal();
        });

        // Modal backdrop click
        document.getElementById('feedback-modal').addEventListener('click', (e) => {
            if (e.target.id === 'feedback-modal') {
                this.closeFeedbackModal();
            }
        });

        // Star rating
        const stars = document.querySelectorAll('.star');
        stars.forEach(star => {
            star.addEventListener('click', () => {
                this.setRating(parseInt(star.dataset.rating));
            });
        });

        // Form submission
        document.getElementById('feedback-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitFeedback();
        });

        // Track tab changes
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('tab')) {
                this.currentTab = e.target.dataset.tab;
                this.updateScrollToBottomVisibility();
            }
        });

        // Update scroll-to-bottom visibility when tabs change programmatically
        const observer = new MutationObserver(() => {
            this.updateScrollToBottomVisibility();
        });
        
        // Observe changes to the active tab
        const desktopNav = document.querySelector('.desktop-nav');
        if (desktopNav) {
            observer.observe(desktopNav, { 
                attributes: true, 
                subtree: true, 
                attributeFilter: ['class'] 
            });
        }
    }

    setupScrollToBottom() {
        // Update visibility immediately when page loads
        this.updateScrollToBottomVisibility();
    }

    updateScrollToBottomVisibility() {
        const scrollButton = document.getElementById('scroll-to-bottom');
        const currentTab = document.querySelector('.tab.active')?.dataset.tab || 'assumptions';

        // Show on first page (assumptions) immediately, hide on other tabs
        if (currentTab === 'assumptions') {
            scrollButton.classList.add('show');
        } else {
            scrollButton.classList.remove('show');
        }
    }

    scrollToResults() {
        // Scroll to the bottom of the current content instead of jumping to results
        const currentTabContent = document.querySelector('.tab-content:not(.hidden)');
        if (currentTabContent) {
            // Scroll to the bottom of the current tab content
            const rect = currentTabContent.getBoundingClientRect();
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const targetScroll = scrollTop + rect.bottom - window.innerHeight + 20; // Add 20px padding
            
            window.scrollTo({
                top: targetScroll,
                behavior: 'smooth'
            });
        }

        // Track this action
        this.trackEvent('scroll_to_bottom', {
            from_tab: this.currentTab,
            scroll_position: window.scrollY
        });
    }

    setupGoogleSignIn() {
        // Google Sign-In configuration
        const clientId = '1007036765292-j0mpklubv5sek38hf15213u8csvsmh2j.apps.googleusercontent.com';
        
        // Initialize Google Sign-In
        if (typeof google !== 'undefined' && google.accounts) {
            google.accounts.id.initialize({
                client_id: clientId,
                callback: this.handleCredentialResponse.bind(this)
            });
        }
    }

    handleCredentialResponse(response) {
        try {
            // Decode the JWT token
            const payload = JSON.parse(atob(response.credential.split('.')[1]));
            
            this.currentUser = {
                name: payload.name,
                email: payload.email,
                picture: payload.picture,
                sub: payload.sub
            };

            this.updateUserInfo();
            this.trackEvent('user_signin', {
                user_id: this.currentUser.sub,
                user_email: this.currentUser.email
            });

        } catch (error) {
            console.error('Error handling Google sign-in:', error);
        }
    }

    updateUserInfo() {
        const userInfo = document.getElementById('user-info');
        const signinSection = document.getElementById('signin-section');
        const feedbackFormSection = document.getElementById('feedback-form-section');
        const userAvatar = document.getElementById('user-avatar');
        const userName = document.getElementById('user-name');
        const userEmail = document.getElementById('user-email');

        if (!userInfo || !signinSection || !feedbackFormSection) {
            console.error('Feedback modal structure missing required elements.');
            return;
        }

        if (this.currentUser) {
            if (userAvatar) userAvatar.src = this.currentUser.picture;
            if (userName) userName.textContent = this.currentUser.name;
            if (userEmail) userEmail.textContent = this.currentUser.email;
            userInfo.style.display = 'flex';
            signinSection.style.display = 'none';
            feedbackFormSection.style.display = 'block';
        } else {
            userInfo.style.display = 'none';
            signinSection.style.display = 'block';
            feedbackFormSection.style.display = 'none';
        }
    }

    openFeedbackModal() {
        document.getElementById('feedback-modal').style.display = 'block';
        document.body.style.overflow = 'hidden';
        this.updateUserInfo();
        this.trackEvent('feedback_modal_opened', {
            current_tab: this.currentTab,
            user_signed_in: !!this.currentUser
        });
    }

    closeFeedbackModal() {
        document.getElementById('feedback-modal').style.display = 'none';
        document.body.style.overflow = '';
        this.resetForm();
    }

    setRating(rating) {
        this.currentRating = rating;
        const stars = document.querySelectorAll('.star');
        
        stars.forEach((star, index) => {
            if (index < rating) {
                star.classList.add('active');
            } else {
                star.classList.remove('active');
            }
        });
    }

    resetForm() {
        this.currentRating = 0;
        document.querySelectorAll('.star').forEach(star => star.classList.remove('active'));
        document.getElementById('feedback-form').reset();
        document.getElementById('feedback-success').style.display = 'none';
        document.getElementById('feedback-form').style.display = 'block';
    }

    async submitFeedback() {
        const rating = this.currentRating;
        const type = document.getElementById('feedback-type').value;
        const message = document.getElementById('feedback-message').value;
        const section = document.getElementById('feedback-section').value;

        if (!rating || !type || !message.trim()) {
            alert('Please fill in all required fields and provide a rating.');
            return;
        }

        const feedbackData = {
            rating,
            type,
            message: message.trim(),
            section,
            current_tab: this.currentTab,
            user: this.currentUser ? {
                id: this.currentUser.sub,
                email: this.currentUser.email,
                name: this.currentUser.name
            } : null,
            timestamp: new Date().toISOString(),
            user_agent: navigator.userAgent,
            url: window.location.href
        };

        try {
            // Send to Google Analytics
            this.sendToGoogleAnalytics(feedbackData);
            
            // Send to New Relic
            this.sendToNewRelic(feedbackData);
            
            // Show success message
            this.showSuccessMessage();
            
            // Track submission
            this.trackEvent('feedback_submitted', {
                rating,
                type,
                section,
                has_user: !!this.currentUser
            });

        } catch (error) {
            console.error('Error submitting feedback:', error);
            alert('There was an error submitting your feedback. Please try again.');
        }
    }

    sendToGoogleAnalytics(data) {
        if (typeof gtag !== 'undefined') {
            gtag('event', 'feedback_submitted', {
                event_category: 'User Feedback',
                event_label: data.type,
                value: data.rating,
                custom_map: {
                    'feedback_type': data.type,
                    'feedback_section': data.section,
                    'user_signed_in': !!data.user
                }
            });
        }
    }

    sendToNewRelic(data) {
        if (typeof newrelic !== 'undefined') {
            newrelic.recordCustomEvent('FeedbackSubmitted', {
                rating: data.rating,
                type: data.type,
                section: data.section,
                message_length: data.message.length,
                user_signed_in: !!data.user,
                current_tab: data.current_tab,
                timestamp: data.timestamp
            });
        }
    }

    showSuccessMessage() {
        document.getElementById('feedback-form').style.display = 'none';
        document.getElementById('feedback-success').style.display = 'block';
        
        setTimeout(() => {
            this.closeFeedbackModal();
        }, 3000);
    }

    trackEvent(eventName, parameters = {}) {
        // Google Analytics
        if (typeof gtag !== 'undefined') {
            gtag('event', eventName, {
                event_category: 'Feedback System',
                ...parameters
            });
        }

        // New Relic
        if (typeof newrelic !== 'undefined') {
            newrelic.recordCustomEvent('FeedbackEvent', {
                event_name: eventName,
                ...parameters,
                timestamp: new Date().toISOString()
            });
        }
    }

    trackCurrentTab() {
        // Track initial tab
        const activeTab = document.querySelector('.tab.active');
        if (activeTab) {
            this.currentTab = activeTab.dataset.tab;
        }
    }
}

// Initialize feedback system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.feedbackSystem = new FeedbackSystem();
});

// Global function for Google Sign-In callback
window.handleCredentialResponse = function(response) {
    if (window.feedbackSystem) {
        window.feedbackSystem.handleCredentialResponse(response);
    }
}; 