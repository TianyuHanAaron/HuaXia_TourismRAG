import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import { Stack, Typography } from '@mui/material';

import { HuaxiaActionButton } from '../HuaxiaActionButton';
import { dynamicTextSx } from './accessibility';
import { HuaxiaStatusChip } from './HuaxiaStatusChip';
import type { DocumentVaultRowView } from './viewModels';

type Props = {
  view: DocumentVaultRowView;
  onPrimaryAction?: (documentId: string) => void;
};

export function HuaxiaDocumentRow({ view, onPrimaryAction }: Props) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.25}
      sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', py: 1.35 }}
    >
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'flex-start', minWidth: 0 }}>
        <DescriptionOutlinedIcon color="primary" />
        <Stack spacing={0.35} sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 900, ...dynamicTextSx }}>{view.title}</Typography>
          <Typography variant="body2" color="text.secondary" sx={dynamicTextSx}>
            {view.documentTypeLabel} · {view.sensitivityLabel}
          </Typography>
          {view.linkedTaskLabel ? (
            <Typography variant="body2" color="text.secondary" sx={dynamicTextSx}>
              Linked task: {view.linkedTaskLabel}
            </Typography>
          ) : null}
        </Stack>
      </Stack>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <HuaxiaStatusChip view={view.statusChip} />
        {view.primaryAction ? (
          <HuaxiaActionButton variant="outlined" onClick={() => onPrimaryAction?.(view.documentId)}>
            {view.primaryAction.label}
          </HuaxiaActionButton>
        ) : null}
      </Stack>
    </Stack>
  );
}
