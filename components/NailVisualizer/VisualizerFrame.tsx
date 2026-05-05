import React, { type ReactElement } from 'react';

interface VisualizerFrameProps {
  children: React.ReactNode;
}

export function VisualizerFrame({
  children,
}: VisualizerFrameProps): ReactElement {
  return <div className="visualizer-frame">{children}</div>;
}
