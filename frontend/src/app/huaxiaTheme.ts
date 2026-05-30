import { alpha, createTheme } from '@mui/material/styles';

const ink = '#1f2933';
const cinnabar = '#d94834';
const jade = '#2f6f73';
const paper = '#fffaf4';

export const huaxiaTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: cinnabar,
      light: '#ef8c78',
      dark: '#a82f21',
      contrastText: paper,
    },
    secondary: {
      main: jade,
      light: '#76aaa8',
      dark: '#1e4d50',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f8f3ec',
      paper: 'rgba(255, 255, 255, 0.88)',
    },
    text: {
      primary: ink,
      secondary: '#5d6572',
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
      fontWeight: 700,
      textTransform: 'none',
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
          backgroundColor: '#f8f3ec',
        },
        '*:focus-visible': {
          outline: `3px solid ${alpha(cinnabar, 0.32)}`,
          outlineOffset: 3,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: '0 4px 10px rgba(31, 41, 51, 0.08)',
          transition:
            'transform 180ms ease, box-shadow 180ms ease, background-color 180ms ease, border-color 180ms ease',
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
          transition: 'transform 220ms ease, box-shadow 220ms ease, border-color 220ms ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            borderColor: alpha(cinnabar, 0.22),
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
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          height: 8,
          borderRadius: 8,
          backgroundColor: alpha(jade, 0.12),
        },
        bar: {
          borderRadius: 8,
        },
      },
    },
  },
});
