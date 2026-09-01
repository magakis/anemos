// ANEMOS-PATCH: provide the reversible fallback surface for cut deep links.

import React from 'react';

import { getFeature, type FeatureKey } from './registry';

export type UnavailableProps = {
  feature?: FeatureKey;
  title?: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
};

export const Unavailable: React.FC<UnavailableProps> = ({ feature, title = 'Not available in anemos', description, className }) => {
  const reason = feature ? getFeature(feature).reason : undefined;

  return (
    <div className={`flex h-full min-h-0 items-center justify-center px-6 text-center ${className ?? ''}`}>
      <div className="max-w-md space-y-2">
        <h2 className="typography-ui-header font-semibold text-foreground">{title}</h2>
        <p className="typography-body text-muted-foreground">
          {description ?? reason ?? 'This feature is not available in anemos yet.'}
        </p>
      </div>
    </div>
  );
};

export const FeatureUnavailable = Unavailable;
