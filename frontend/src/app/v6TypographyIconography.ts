import AssignmentIcon from '@mui/icons-material/Assignment';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import DescriptionIcon from '@mui/icons-material/Description';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import HotelIcon from '@mui/icons-material/Hotel';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import PlaceIcon from '@mui/icons-material/Place';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import RouteIcon from '@mui/icons-material/Route';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import SyncIcon from '@mui/icons-material/Sync';
import TheaterComedyIcon from '@mui/icons-material/TheaterComedy';
import TrainIcon from '@mui/icons-material/Train';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import type { SvgIconComponent } from '@mui/icons-material';

export type V6TypographyRole =
  | 'appTitle'
  | 'screenTitle'
  | 'sectionTitle'
  | 'commandTitle'
  | 'taskTitle'
  | 'body'
  | 'helper'
  | 'metadata'
  | 'chipLabel'
  | 'buttonLabel'
  | 'finePrint';

export type V6DensityMode = 'spacious' | 'medium' | 'compact' | 'focused' | 'execution';

export type V6TripIconToken =
  | 'route'
  | 'place'
  | 'flight'
  | 'rail'
  | 'car'
  | 'lodging'
  | 'ticket'
  | 'document'
  | 'calendar'
  | 'weather'
  | 'safety'
  | 'food'
  | 'shopping'
  | 'entertainment'
  | 'sync'
  | 'manual';

export const v6TripIconTokens: V6TripIconToken[] = [
  'route',
  'place',
  'flight',
  'rail',
  'car',
  'lodging',
  'ticket',
  'document',
  'calendar',
  'weather',
  'safety',
  'food',
  'shopping',
  'entertainment',
  'sync',
  'manual',
];

export const v6WebTypographyRoles: Record<
  V6TypographyRole,
  {
    fontSize: number;
    lineHeight: number;
    fontWeight: number;
    letterSpacing: number;
    maxLines?: number;
  }
> = {
  appTitle: { fontSize: 44, lineHeight: 52, fontWeight: 800, letterSpacing: 0 },
  screenTitle: { fontSize: 34, lineHeight: 42, fontWeight: 800, letterSpacing: 0 },
  sectionTitle: { fontSize: 22, lineHeight: 30, fontWeight: 800, letterSpacing: 0 },
  commandTitle: { fontSize: 20, lineHeight: 28, fontWeight: 800, letterSpacing: 0, maxLines: 2 },
  taskTitle: { fontSize: 17, lineHeight: 24, fontWeight: 800, letterSpacing: 0, maxLines: 2 },
  body: { fontSize: 16, lineHeight: 24, fontWeight: 400, letterSpacing: 0 },
  helper: { fontSize: 14, lineHeight: 21, fontWeight: 500, letterSpacing: 0 },
  metadata: { fontSize: 13, lineHeight: 19, fontWeight: 600, letterSpacing: 0 },
  chipLabel: { fontSize: 12, lineHeight: 18, fontWeight: 750, letterSpacing: 0 },
  buttonLabel: { fontSize: 15, lineHeight: 20, fontWeight: 700, letterSpacing: 0 },
  finePrint: { fontSize: 12, lineHeight: 16, fontWeight: 400, letterSpacing: 0 },
};

export const v6WebIconTokenMap: Record<V6TripIconToken, SvgIconComponent> = {
  route: RouteIcon,
  place: PlaceIcon,
  flight: FlightTakeoffIcon,
  rail: TrainIcon,
  car: DirectionsCarIcon,
  lodging: HotelIcon,
  ticket: ConfirmationNumberIcon,
  document: DescriptionIcon,
  calendar: CalendarMonthIcon,
  weather: WbSunnyIcon,
  safety: LocalHospitalIcon,
  food: RestaurantIcon,
  shopping: ShoppingBagIcon,
  entertainment: TheaterComedyIcon,
  sync: SyncIcon,
  manual: AssignmentIcon,
};

export const v6DensityModeByPhase = {
  planning: 'spacious',
  review: 'medium',
  preparation: 'compact',
  departure: 'focused',
  transit: 'execution',
  arrival: 'focused',
  daily_exploration: 'medium',
  return: 'compact',
  home_completed: 'spacious',
  needs_review: 'medium',
} as const;

export function getV6WebIcon(token?: string | null): SvgIconComponent {
  if (token && v6TripIconTokens.includes(token as V6TripIconToken)) {
    return v6WebIconTokenMap[token as V6TripIconToken];
  }
  return v6WebIconTokenMap.manual;
}
