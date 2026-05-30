import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import { useState } from 'react';

import { useCreateSalesHandoffTourismSalesHandoffsPost } from '../../api/generated/huaxia';
import type { SalesHandoffRequest, TravelAnswer } from '../../api/generated/model';
import { HuaxiaActionButton } from '../../components/HuaxiaActionButton';
import { useUIStore } from '../../state/uiStore';
import { answerSnapshot } from '../../utils/format';

type Props = {
  answer: TravelAnswer | null;
  originalRequest: string;
  language: 'zh-CN' | 'en';
};

export function SalesHandoffDialog({ answer, originalRequest, language }: Props) {
  const open = useUIStore((state) => state.handoffOpen);
  const setOpen = useUIStore((state) => state.setHandoffOpen);
  const [customerName, setCustomerName] = useState('');
  const [contact, setContact] = useState('');
  const [channel, setChannel] = useState<SalesHandoffRequest['preferred_channel']>('any');
  const [mustKeep, setMustKeep] = useState('');
  const [flexibleItems, setFlexibleItems] = useState('');
  const [quoteItems, setQuoteItems] = useState('');
  const mutation = useCreateSalesHandoffTourismSalesHandoffsPost();

  const submit = () => {
    if (!answer || !contact.trim()) {
      return;
    }
    mutation.mutate({
      data: {
        customer_name: customerName.trim() || undefined,
        contact: contact.trim(),
        preferred_channel: channel,
        original_request: originalRequest || answer.answer.slice(0, 500),
        itinerary_snapshot: answerSnapshot(answer),
        must_keep: toLines(mustKeep),
        flexible_items: toLines(flexibleItems),
        quote_items: toLines(quoteItems),
        session_id: answer.session_id ?? undefined,
        language,
      },
    });
  };

  return (
    <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
      <DialogTitle>{language === 'zh-CN' ? '转给华夏旅行社顾问' : 'Send to a HuaXia Travel Advisor'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {mutation.isPending ? <LinearProgress /> : null}
          {mutation.data ? <Alert severity="success">{mutation.data.message}</Alert> : null}
          {mutation.error ? <Alert severity="error">{language === 'zh-CN' ? '提交失败，请稍后再试。' : 'Submission failed. Please try again.'}</Alert> : null}
          <TextField
            label={language === 'zh-CN' ? '姓名（可选）' : 'Name (optional)'}
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
          />
          <TextField
            required
            label={language === 'zh-CN' ? '联系方式' : 'Contact'}
            value={contact}
            onChange={(event) => setContact(event.target.value)}
          />
          <TextField
            select
            label={language === 'zh-CN' ? '希望怎么联系' : 'Preferred channel'}
            value={channel}
            onChange={(event) => setChannel(event.target.value as SalesHandoffRequest['preferred_channel'])}
          >
            <MenuItem value="any">{language === 'zh-CN' ? '都可以' : 'Any'}</MenuItem>
            <MenuItem value="phone">{language === 'zh-CN' ? '电话' : 'Phone'}</MenuItem>
            <MenuItem value="wechat">{language === 'zh-CN' ? '微信' : 'WeChat'}</MenuItem>
            <MenuItem value="email">{language === 'zh-CN' ? '邮件' : 'Email'}</MenuItem>
          </TextField>
          <TextField
            label={language === 'zh-CN' ? '一定要保留的安排' : 'Must-keep items'}
            placeholder={language === 'zh-CN' ? '每行一项' : 'One item per line'}
            multiline
            minRows={2}
            value={mustKeep}
            onChange={(event) => setMustKeep(event.target.value)}
          />
          <TextField
            label={language === 'zh-CN' ? '可调整项' : 'Flexible items'}
            multiline
            minRows={2}
            value={flexibleItems}
            onChange={(event) => setFlexibleItems(event.target.value)}
          />
          <TextField
            label={language === 'zh-CN' ? '需要顾问报价或核实的内容' : 'Quote or verification needed'}
            multiline
            minRows={2}
            value={quoteItems}
            onChange={(event) => setQuoteItems(event.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpen(false)}>{language === 'zh-CN' ? '关闭' : 'Close'}</Button>
        <HuaxiaActionButton variant="contained" onClick={submit} disabled={!contact.trim() || mutation.isPending}>
          {language === 'zh-CN' ? '提交给顾问' : 'Submit'}
        </HuaxiaActionButton>
      </DialogActions>
    </Dialog>
  );
}

function toLines(value: string): string[] {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}
