// src/analytics.js
import ReactGA from 'react-ga4';

// Measurement ID from your Google Analytics 4 property
const MEASUREMENT_ID = 'G-6SLDSTNNBL';

// Initialize GA4 with your measurement ID
export const initGA = () => {
  ReactGA.initialize(MEASUREMENT_ID, {
    debug_mode: process.env.NODE_ENV === 'development',
    send_page_view: false, // We'll handle page views manually
    gaOptions: {
      cookieFlags: 'SameSite=None;Secure'
    }
  });
};

// Enhanced page view tracking with route and title information
export const logPageView = () => {
  const pageTitle = document.title;
  const pagePath = window.location.pathname + window.location.search;
  
  ReactGA.send({
    hitType: "pageview",
    page: pagePath,
    title: pageTitle,
    location: window.location.href
  });

  // Log additional page metadata as a custom event
  ReactGA.event({
    category: 'Page Metadata',
    action: 'Page View',
    label: `${pageTitle} | ${pagePath}`
  });
};

// Track scroll depth with debouncing
let scrollTimeout;
let lastScrollDepth = 0;

export const trackScrollDepth = () => {
  const calculateScrollDepth = () => {
    // Clear existing timeout
    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
    }

    // Set new timeout to debounce scroll events
    scrollTimeout = setTimeout(() => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      
      const scrollDistance = documentHeight - windowHeight;
      const scrollPercentage = Math.round((scrollTop / scrollDistance) * 100);
      
      // Track scroll depth at 25%, 50%, 75%, and 100%
      const thresholds = [25, 50, 75, 100];
      
      thresholds.forEach(threshold => {
        if (scrollPercentage >= threshold && lastScrollDepth < threshold) {
          ReactGA.event({
            category: 'Scroll Depth',
            action: `Scrolled ${threshold}%`,
            label: window.location.pathname,
            value: threshold
          });
        }
      });
      
      lastScrollDepth = scrollPercentage;
    }, 150); // Debounce time in milliseconds
  };

  return calculateScrollDepth;
};

// Enhanced event tracking with validation and error handling
export const logEvent = (category, action, label, value = null) => {
  try {
    if (!category || !action) {
      console.warn('GA Event requires at least category and action');
      return;
    }

    const eventParams = {
      category: category,
      action: action,
      label: label || undefined,
      value: value !== null ? Number(value) : undefined
    };

    ReactGA.event(eventParams);
  } catch (error) {
    console.error('Error logging GA event:', error);
  }
};

// Track tab changes specifically
export const logTabChange = (tabName) => {
  logEvent('Navigation', 'Tab Change', tabName);
};

// Track data refresh events
export const logDataRefresh = (dataType, status) => {
  logEvent('Data Refresh', dataType, status);
};

// Track user interactions with charts
export const logChartInteraction = (chartId, interactionType) => {
  logEvent('Chart Interaction', interactionType, chartId);
};