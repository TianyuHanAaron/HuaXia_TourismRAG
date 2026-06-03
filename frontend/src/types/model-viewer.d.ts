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
        'camera-orbit'?: string;
        'camera-target'?: string;
        'field-of-view'?: string;
        'min-camera-orbit'?: string;
        'max-camera-orbit'?: string;
        'disable-zoom'?: boolean;
        exposure?: string;
        loading?: string;
        reveal?: string;
        style?: CSSProperties;
      };
    }
  }
}
