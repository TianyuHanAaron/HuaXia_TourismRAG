import type { CSSProperties, DetailedHTMLProps, HTMLAttributes } from 'react';

declare module 'react/jsx-runtime' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        poster?: string;
        alt?: string;
        'camera-controls'?: boolean;
        'interaction-prompt'?: string;
        'auto-rotate'?: boolean;
        'rotation-per-second'?: string;
        exposure?: string;
        loading?: string;
        reveal?: string;
        style?: CSSProperties;
      };
    }
  }
}
