import AltRouteOutlinedIcon from '@mui/icons-material/AltRouteOutlined';
import { Alert, Divider, Stack, Typography } from '@mui/material';

import { HuaxiaActionButton } from '../HuaxiaActionButton';
import { HuaxiaSurface } from '../HuaxiaSurface';
import { dynamicTextSx } from './accessibility';
import { HuaxiaStatusChip } from './HuaxiaStatusChip';
import type { RoutePreviewBundleView } from './viewModels';

type Props = {
  view: RoutePreviewBundleView;
  onPrimaryLaunch?: () => void;
  onFallback?: () => void;
};

export function HuaxiaRoutePreview({ view, onPrimaryLaunch, onFallback }: Props) {
  return (
    <HuaxiaSurface v6Pattern="execution_sheet" ariaLabel="Route preview" sx={{ p: { xs: 2, md: 2.5 } }}>
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <AltRouteOutlinedIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 950, ...dynamicTextSx }}>
            Route prepared for {view.providerLabel}
          </Typography>
        </Stack>
        <HuaxiaStatusChip view={view.confidenceStatus} />
        <Typography sx={{ fontWeight: 900, ...dynamicTextSx }}>
          {`${view.originLabel} -> ${view.destinationLabel}`}
        </Typography>
        {view.waypointLabels?.length ? (
          <Typography variant="body2" color="text.secondary" sx={dynamicTextSx}>
            Via {view.waypointLabels.join(' -> ')}
          </Typography>
        ) : null}
        <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
          <Typography variant="body2">{view.travelModeLabel}</Typography>
          {view.durationLabel ? <Typography variant="body2">{view.durationLabel}</Typography> : null}
          {view.distanceLabel ? <Typography variant="body2">{view.distanceLabel}</Typography> : null}
          {view.plannedTimeLabel ? <Typography variant="body2">{view.plannedTimeLabel}</Typography> : null}
        </Stack>
        {view.validationMessage ? <Alert severity="warning">{view.validationMessage}</Alert> : null}
        <Divider />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          {view.primaryLaunchAllowed ? (
            <HuaxiaActionButton variant="contained" onClick={onPrimaryLaunch}>
              {view.primaryLaunchLabel}
            </HuaxiaActionButton>
          ) : null}
          {view.fallbackLabel ? (
            <HuaxiaActionButton variant="outlined" onClick={onFallback}>
              {view.fallbackLabel}
            </HuaxiaActionButton>
          ) : null}
        </Stack>
      </Stack>
    </HuaxiaSurface>
  );
}
