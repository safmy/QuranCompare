import React from 'react';
import EnhancedDebaterBot from './EnhancedDebaterBot';

// Wrapper component to integrate EnhancedDebaterBot with existing DebaterBot usage
const DebaterBotIntegration = (props) => {
  // Extract any props that might be passed from parent components
  const {
    onNavigateToTab,
    currentTab, 
    currentVerses,
    recentSearch,
    ...otherProps
  } = props;

  // Handle navigation to different tabs
  const handleNavigateToTab = (tab, data) => {
    // If parent provided navigation handler, use it
    if (onNavigateToTab) {
      onNavigateToTab(tab, data);
    } else {
      // Otherwise, dispatch custom event for App.js to handle
      const event = new CustomEvent('navigateToTab', {
        detail: { tab, data }
      });
      window.dispatchEvent(event);
    }
  };

  return (
    <EnhancedDebaterBot
      onNavigateToTab={handleNavigateToTab}
      currentTab={currentTab || 'debater'}
      currentVerses={currentVerses || []}
      recentSearch={recentSearch || ''}
      {...otherProps}
    />
  );
};

export default DebaterBotIntegration;