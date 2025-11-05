import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';

interface PageTransitionProps {
  children: React.ReactNode;
}

const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location.pathname);
  const [transitionStage, setTransitionStage] = useState<'fadeIn' | 'fadeOut'>('fadeIn');
  const prevLocationRef = useRef(location.pathname);

  useEffect(() => {
    if (location.pathname !== prevLocationRef.current) {
      // Start fade out
      setTransitionStage('fadeOut');
      prevLocationRef.current = location.pathname;
    }
  }, [location.pathname]);

  const handleTransitionEnd = () => {
    if (transitionStage === 'fadeOut') {
      // Fade out complete, update location and fade in
      setDisplayLocation(location.pathname);
      // Use setTimeout to ensure DOM update happens before fade in
      setTimeout(() => {
        setTransitionStage('fadeIn');
      }, 10);
    }
  };

  return (
    <div
      className={`page-transition-wrapper page-transition-${transitionStage}`}
      onAnimationEnd={handleTransitionEnd}
    >
      <div key={displayLocation} className="page-transition-content">
        {children}
      </div>
    </div>
  );
};

export default PageTransition;
