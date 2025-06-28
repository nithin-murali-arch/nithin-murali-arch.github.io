// Reusable Feedback System with Google Sign-In, Google Analytics, and New Relic Integration

class FeedbackSystem {
    constructor(config = {}) {
        this.config = {
            calculatorName: 'Calculator',
            googleClientId: '1007036765292-j0mpklubv5sek38hf15213u8csvsmh2j.apps.googleusercontent.com',
            feedbackEndpoint: 'https://your-feedback-endpoint.com/api/feedback',
            ...config
        };
        
        this.currentUser = null;
        this.currentRating = 0;
        this.currentTab = 'basic';
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
        const feedbackFab = document.getElementById('feedback-fab');
        if (feedbackFab) {
            feedbackFab.addEventListener('click', () => {
                this.openFeedbackModal();
            });
        }

        // Scroll to bottom bubble
        const scrollButton = document.getElementById('scroll-to-bottom');
        if (scrollButton) {
            scrollButton.addEventListener('click', () => {
                this.scrollToResults();
            });
        }

        // Modal close buttons
        const closeFeedback = document.getElementById('close-feedback');
        if (closeFeedback) {
            closeFeedback.addEventListener('click', () => {
                this.closeFeedbackModal();
            });
        }

        const cancelFeedback = document.getElementById('cancel-feedback');
        if (cancelFeedback) {
            cancelFeedback.addEventListener('click', () => {
                this.closeFeedbackModal();
            });
        }

        // Modal backdrop click
        const feedbackModal = document.getElementById('feedback-modal');
        if (feedbackModal) {
            feedbackModal.addEventListener('click', (e) => {
                if (e.target.id === 'feedback-modal') {
                    this.closeFeedbackModal();
                }
            });
        }

        // Star rating
        const stars = document.querySelectorAll('.star');
        stars.forEach(star => {
            star.addEventListener('click', () => {
                this.setRating(parseInt(star.dataset.rating));
            });
        });

        // Form submission
        const feedbackForm = document.getElementById('feedback-form');
        if (feedbackForm) {
            feedbackForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitFeedback();
            });
        }

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
        if (!scrollButton) return;

        const currentTab = document.querySelector('.tab.active')?.dataset.tab || 'basic';

        // Show on first page (basic) immediately, hide on other tabs
        if (currentTab === 'basic') {
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
        const clientId = this.config.googleClientId;
        
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
            this.trackError('google_signin_error', error.message);
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
        const modal = document.getElementById('feedback-modal');
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
            this.updateUserInfo();
            this.trackEvent('feedback_modal_opened', {
                current_tab: this.currentTab,
                user_signed_in: !!this.currentUser
            });
        }
    }

    closeFeedbackModal() {
        const modal = document.getElementById('feedback-modal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
            this.resetForm();
        }
    }

    resetForm() {
        this.currentRating = 0;
        const stars = document.querySelectorAll('.star');
        stars.forEach(star => star.classList.remove('active'));
        
        const form = document.getElementById('feedback-form');
        if (form) form.reset();
        
        const successMessage = document.getElementById('feedback-success');
        if (successMessage) successMessage.style.display = 'none';
        
        const feedbackFormSection = document.getElementById('feedback-form-section');
        if (feedbackFormSection) feedbackFormSection.style.display = 'block';
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

    async submitFeedback() {
        if (!this.currentUser) {
            alert('Please sign in to submit feedback.');
            return;
        }

        const feedbackType = document.getElementById('feedback-type')?.value;
        const feedbackMessage = document.getElementById('feedback-message')?.value;
        const feedbackSection = document.getElementById('feedback-section')?.value;

        if (!feedbackType || !feedbackMessage) {
            alert('Please fill in all required fields.');
            return;
        }

        const feedbackData = {
            calculator: this.config.calculatorName,
            user: {
                id: this.currentUser.sub,
                name: this.currentUser.name,
                email: this.currentUser.email
            },
            rating: this.currentRating,
            type: feedbackType,
            message: feedbackMessage,
            section: feedbackSection,
            currentTab: this.currentTab,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        try {
            // Send to Google Analytics
            this.sendToGoogleAnalytics(feedbackData);
            
            // Send to New Relic
            this.sendToNewRelic(feedbackData);
            
            // Send to custom endpoint (if configured)
            if (this.config.feedbackEndpoint) {
                await this.sendToEndpoint(feedbackData);
            }

            this.showSuccessMessage();
            this.trackEvent('feedback_submitted', {
                feedback_type: feedbackType,
                rating: this.currentRating
            });

        } catch (error) {
            console.error('Error submitting feedback:', error);
            this.trackError('feedback_submission_error', error.message);
            alert('There was an error submitting your feedback. Please try again.');
        }
    }

    async sendToEndpoint(data) {
        const response = await fetch(this.config.feedbackEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response.json();
    }

    sendToGoogleAnalytics(data) {
        if (typeof gtag !== 'undefined') {
            gtag('event', 'feedback_submitted', {
                calculator: data.calculator,
                feedback_type: data.type,
                rating: data.rating,
                user_id: data.user.id
            });
        }
    }

    sendToNewRelic(data) {
        if (window.NREUM && window.NREUM.customTracking) {
            window.NREUM.customTracking.trackCalculatorUsage(
                this.config.calculatorName, 
                'feedback_submitted', 
                {
                    feedback_type: data.type,
                    rating: data.rating,
                    user_id: data.user.id
                }
            );
        }
    }

    showSuccessMessage() {
        const successMessage = document.getElementById('feedback-success');
        const feedbackFormSection = document.getElementById('feedback-form-section');
        
        if (successMessage && feedbackFormSection) {
            feedbackFormSection.style.display = 'none';
            successMessage.style.display = 'block';
            
            // Auto-close after 3 seconds
            setTimeout(() => {
                this.closeFeedbackModal();
            }, 3000);
        }
    }

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

    trackCurrentTab() {
        // Track initial tab
        const activeTab = document.querySelector('.tab.active');
        if (activeTab) {
            this.currentTab = activeTab.dataset.tab;
        }
    }

    trackError(errorType, errorMessage) {
        // New Relic error tracking
        if (window.NREUM && window.NREUM.customTracking) {
            window.NREUM.customTracking.trackError(
                this.config.calculatorName,
                errorType,
                errorMessage
            );
        }

        // Google Analytics error tracking
        if (typeof gtag !== 'undefined') {
            gtag('event', 'exception', {
                description: errorMessage,
                fatal: false,
                calculator: this.config.calculatorName,
                error_type: errorType
            });
        }
    }
}

// Global function for Google Sign-In callback
window.handleCredentialResponse = function(response) {
    if (window.feedbackSystem) {
        window.feedbackSystem.handleCredentialResponse(response);
    }
}; 