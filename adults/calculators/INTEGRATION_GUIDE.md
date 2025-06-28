# Calculator Integration Guide

## Overview
This guide documents the comprehensive instrumentation, feedback system, and Google Ads integration that has been added to all calculators in the suite.

## Features Added

### 1. New Relic Instrumentation
**File**: `common/newrelic.js`

#### Configuration
- Replace placeholder values in `newrelic.js`:
  - `YOUR_AGENT_ID`
  - `YOUR_LICENSE_KEY`
  - `YOUR_APPLICATION_ID`

#### Tracking Functions
- `trackCalculatorUsage(calculatorName, action, data)` - Track calculator interactions
- `trackFormInteraction(calculatorName, fieldName, action)` - Track form field interactions
- `trackCalculation(calculatorName, calculationType, duration)` - Track calculation performance
- `trackError(calculatorName, errorType, errorMessage)` - Track errors and exceptions

#### Usage
```javascript
// Track calculator usage
window.NREUM.customTracking.trackCalculatorUsage('FIRE Calculator', 'calculation_started', {
    user_inputs: formData
});

// Track form interactions
window.NREUM.customTracking.trackFormInteraction('FIRE Calculator', 'age', 'input_change');

// Track calculations
window.NREUM.customTracking.trackCalculation('FIRE Calculator', 'retirement_planning', 150);

// Track errors
window.NREUM.customTracking.trackError('FIRE Calculator', 'validation_error', 'Invalid age input');
```

### 2. Google Analytics Integration
**Enhanced tracking** in all calculators with custom events:

#### Events Tracked
- `page_view` - Page loads
- `calculator_initialized` - Calculator initialization
- `tab_changed` - Navigation between tabs
- `form_interaction` - Form field interactions
- `calculation_completed` - Calculation completion with duration
- `feedback_submitted` - User feedback submissions
- `ad_impression` - Advertisement impressions
- `ad_click` - Advertisement clicks
- `user_signin` - Google Sign-In events
- `exception` - Error tracking

#### Custom Dimensions
- `calculator` - Calculator name
- `calculator_slug` - Calculator identifier
- `field_name` - Form field name
- `calculation_type` - Type of calculation performed
- `feedback_type` - Type of feedback submitted

### 3. Reusable Feedback System
**Files**: 
- `common/feedback.js` - JavaScript functionality
- `common/feedback.css` - Styling

#### Features
- Google Sign-In integration
- Star rating system (1-5 stars)
- Feedback categorization (bug, feature, improvement, etc.)
- Section-specific feedback
- Success/error handling
- Mobile-responsive design
- Dark mode support

#### Configuration
```javascript
window.feedbackSystem = new FeedbackSystem({
    calculatorName: 'Calculator Name',
    googleClientId: 'your-google-client-id',
    feedbackEndpoint: 'https://your-endpoint.com/api/feedback' // Optional
});
```

#### Feedback Types
- 🐛 Bug Report
- 💡 Feature Request
- ⚡ Improvement Suggestion
- 🧮 Calculation Issue
- 🎨 UI/UX Feedback
- 💬 General Feedback
- 👏 Praise/Compliment

#### Integration Points
- Floating Action Button (FAB) - Bottom right corner
- Scroll to Bottom button - Appears on first tab
- Modal with Google Sign-In
- Form validation and submission
- Success confirmation

### 4. Google Ads Integration
**File**: `common/google-ads.js`

#### Features
- Responsive ad slots
- Impression and click tracking
- Ad refresh functionality
- Enable/disable controls
- Integration with Google Analytics and New Relic

#### Ad Slots
- `header-ad` - Header advertisement
- `sidebar-ad` - Sidebar advertisement  
- `footer-ad` - Footer advertisement
- `results-ad` - Results page advertisement

#### Configuration
```javascript
window.initializeGoogleAds({
    calculatorName: 'Calculator Name',
    publisherId: 'ca-pub-8268518333873371',
    enableAds: true
});
```

#### Ad Tracking
- Impressions tracked on page load
- Clicks tracked via event listeners
- Data sent to Google Analytics and New Relic
- Performance metrics included

### 5. Calculator Index Page
**File**: `index.html`

#### Features
- Comprehensive listing of all calculators
- Categorized by completion status
- Beautiful card-based design
- Responsive layout
- Integration with all tracking systems
- Ad placement optimization

#### Calculator Categories
- **Complete Calculators** (4)
  - FIRE Calculator
  - Hobby Item Calculator
  - Remote Work Relocation Calculator
  - Pet Ownership Cost Calculator

- **Coming Soon** (6)
  - Gig Economy Tax Calculator
  - Home Improvement ROI Calculator
  - Student Loan Refinancing Calculator
  - Early Retirement What If Calculator
  - Car Lease vs Buy Calculator
  - Cost of Bad Habit Calculator
  - Family Leave Impact Calculator

## Implementation Details

### Template Updates
The `common/template.html` has been updated to include:

1. **New Relic script** - Loaded in head
2. **Google Analytics** - Enhanced with custom events
3. **Google Ads** - AdSense integration
4. **Google Sign-In** - For feedback system
5. **Feedback system** - Complete modal and FAB
6. **Ad placeholders** - Header, results, and footer ads

### Base Class Enhancements
The `CalculatorBase` class now includes:

1. **Event tracking** - All user interactions
2. **Form tracking** - Field changes and submissions
3. **Calculation timing** - Performance measurement
4. **Error tracking** - Exception handling
5. **Tab navigation tracking** - User flow analysis

### Tracking Integration
All calculators automatically track:

- Page views
- Calculator initialization
- Tab navigation
- Form interactions
- Calculation performance
- Error occurrences
- User feedback
- Advertisement interactions

## Setup Instructions

### 1. New Relic Setup
1. Create a New Relic account
2. Get your Agent ID, License Key, and Application ID
3. Update `common/newrelic.js` with your credentials
4. Deploy and verify tracking in New Relic dashboard

### 2. Google Analytics Setup
1. Ensure Google Analytics is properly configured
2. Verify custom events are being tracked
3. Set up custom dimensions for better analysis
4. Monitor conversion tracking

### 3. Google Ads Setup
1. Replace `YOUR_AD_SLOT_ID` in `google-ads.js`
2. Configure ad units in AdSense dashboard
3. Test ad display and tracking
4. Optimize ad placement for better performance

### 4. Feedback System Setup
1. Configure Google Sign-In OAuth credentials
2. Set up feedback endpoint (optional)
3. Test feedback submission flow
4. Monitor feedback analytics

## Analytics Dashboard

### Key Metrics to Monitor
- **Calculator Usage**: Most/least used calculators
- **User Engagement**: Time spent, interactions per session
- **Conversion Funnel**: Input completion rates
- **Error Rates**: Form validation and calculation errors
- **Feedback Sentiment**: User satisfaction scores
- **Ad Performance**: CTR, revenue, user experience impact

### Custom Reports
- Calculator performance comparison
- User journey analysis
- Error trend analysis
- Feedback categorization
- Revenue attribution

## Best Practices

### Performance
- All scripts load asynchronously
- Minimal impact on page load times
- Efficient event handling
- Optimized tracking calls

### Privacy
- No personally identifiable information tracked
- User consent for feedback system
- GDPR-compliant data handling
- Transparent tracking disclosure

### User Experience
- Non-intrusive feedback system
- Responsive ad placement
- Fast calculation performance
- Clear error messaging

## Troubleshooting

### Common Issues
1. **New Relic not loading**: Check credentials and network
2. **Google Analytics events missing**: Verify gtag configuration
3. **Feedback system errors**: Check Google Sign-In setup
4. **Ads not displaying**: Verify AdSense configuration

### Debug Mode
Enable debug logging by setting:
```javascript
window.DEBUG_MODE = true;
```

### Testing Checklist
- [ ] New Relic tracking active
- [ ] Google Analytics events firing
- [ ] Feedback system functional
- [ ] Ads displaying correctly
- [ ] All calculators loading properly
- [ ] Mobile responsiveness working
- [ ] Error tracking operational

## Future Enhancements

### Planned Features
- A/B testing framework
- Advanced user segmentation
- Predictive analytics
- Automated optimization
- Enhanced reporting dashboard

### Integration Opportunities
- CRM system integration
- Email marketing automation
- Social media tracking
- Advanced attribution modeling

---

**Last Updated**: December 2024  
**Version**: 2.0  
**Status**: Production Ready 