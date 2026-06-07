import { alpha, createTheme } from '@mui/material/styles';

import { motionDurations, motionEasings } from './motion';
import { v6SemanticColorTokens } from './v6ThemeTokens';

const ink = v6SemanticColorTokens.ink;
const primary = v6SemanticColorTokens.primary;
const secondary = v6SemanticColorTokens.secondary;
const paper = v6SemanticColorTokens.paper;

export const huaxiaTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: primary,
      light: v6SemanticColorTokens.primaryLight,
      dark: v6SemanticColorTokens.primaryDark,
      contrastText: paper,
    },
    secondary: {
      main: secondary,
      light: v6SemanticColorTokens.secondaryLight,
      dark: v6SemanticColorTokens.secondaryDark,
      contrastText: '#ffffff',
    },
    success: {
      main: v6SemanticColorTokens.success,
      light: v6SemanticColorTokens.successSurface,
      dark: v6SemanticColorTokens.success,
      contrastText: '#ffffff',
    },
    warning: {
      main: v6SemanticColorTokens.warning,
      light: v6SemanticColorTokens.warningSurface,
      dark: v6SemanticColorTokens.warning,
      contrastText: '#ffffff',
    },
    error: {
      main: v6SemanticColorTokens.danger,
      light: v6SemanticColorTokens.dangerSurface,
      dark: v6SemanticColorTokens.danger,
      contrastText: '#ffffff',
    },
    info: {
      main: v6SemanticColorTokens.info,
      light: v6SemanticColorTokens.infoSurface,
      dark: v6SemanticColorTokens.info,
      contrastText: '#ffffff',
    },
    background: {
      default: v6SemanticColorTokens.paper,
      paper: v6SemanticColorTokens.surfaceRaised,
    },
    text: {
      primary: ink,
      secondary: v6SemanticColorTokens.mutedInk,
    },
    divider: alpha(ink, 0.12),
  },
  typography: {
    fontFamily:
      '"Inter", "Noto Sans SC", "Source Han Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif',
    h1: {
      fontWeight: 800,
      letterSpacing: 0,
    },
    h2: {
      fontWeight: 800,
      letterSpacing: 0,
    },
    h3: {
      fontWeight: 750,
      letterSpacing: 0,
    },
    button: {
      fontSize: '0.95rem',
      fontWeight: 700,
      letterSpacing: 0,
      lineHeight: 1.35,
      textTransform: 'none',
    },
    caption: {
      fontSize: '0.78rem',
      fontWeight: 600,
      letterSpacing: 0,
      lineHeight: 1.5,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          color: ink,
          backgroundColor: v6SemanticColorTokens.paper,
        },
        '*:focus-visible': {
          outline: `3px solid ${alpha(v6SemanticColorTokens.focusRing, 0.72)}`,
          outlineOffset: 3,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontSize: '0.95rem',
          fontWeight: 700,
          lineHeight: 1.35,
          minHeight: 44,
          boxShadow: '0 4px 10px rgba(31, 41, 51, 0.08)',
          transition:
            `transform ${motionDurations.fast}ms ${motionEasings.standard}, box-shadow ${motionDurations.fast}ms ${motionEasings.standard}, background-color ${motionDurations.fast}ms ${motionEasings.standard}, border-color ${motionDurations.fast}ms ${motionEasings.standard}`,
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 8px 18px rgba(31, 41, 51, 0.12)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 750,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(12px)',
          backgroundImage: 'none',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          border: `1px solid ${alpha(ink, 0.1)}`,
          boxShadow: '0 12px 28px rgba(31, 41, 51, 0.08)',
          transition: `transform ${motionDurations.base}ms ${motionEasings.standard}, box-shadow ${motionDurations.base}ms ${motionEasings.standard}, border-color ${motionDurations.base}ms ${motionEasings.standard}`,
          '&:hover': {
            transform: 'translateY(-2px)',
            borderColor: alpha(primary, 0.22),
            boxShadow: '0 16px 34px rgba(31, 41, 51, 0.12)',
          },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 44,
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 800,
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: 'rgba(255, 255, 255, 0.78)',
        },
        input: {
          fontSize: 15,
          lineHeight: '22px',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          fontSize: 14,
          lineHeight: 1.45,
        },
        head: {
          fontWeight: 800,
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          height: 8,
          borderRadius: 8,
          backgroundColor: alpha(secondary, 0.12),
        },
        bar: {
          borderRadius: 8,
        },
      },
    },
  },
});
