import React, { useEffect, useRef, useState } from "react";

interface PageTransitionProps {
  children: React.ReactNode;
  locationKey: string;
}

type TransitionStage = "fadeIn" | "fadeOut";

const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  locationKey,
}) => {
  const [transitionStage, setTransitionStage] =
    useState<TransitionStage>("fadeIn");
  const [displayState, setDisplayState] = useState<{
    pathname: string;
    node: React.ReactNode;
  }>({
    pathname: locationKey,
    node: children,
  });

  const pendingStateRef = useRef<{
    pathname: string;
    node: React.ReactNode;
  } | null>(null);

  useEffect(() => {
    if (locationKey !== displayState.pathname) {
      pendingStateRef.current = {
        pathname: locationKey,
        node: children,
      };
      setTransitionStage("fadeOut");
    } else {
      // Same route but content updated (e.g., filters) – render immediately.
      setDisplayState({ pathname: locationKey, node: children });
    }
  }, [children, locationKey, displayState.pathname]);

  const handleTransitionEnd = () => {
    if (transitionStage === "fadeOut") {
      const nextState = pendingStateRef.current;
      setDisplayState(
        nextState ?? { pathname: locationKey, node: children }
      );
      pendingStateRef.current = null;
      requestAnimationFrame(() => setTransitionStage("fadeIn"));
    }
  };

  return (
    <div
      className={`page-transition-wrapper page-transition-${transitionStage}`}
      onAnimationEnd={handleTransitionEnd}
    >
      <div key={displayState.pathname} className="page-transition-content">
        {displayState.node}
      </div>
    </div>
  );
};

export default PageTransition;
