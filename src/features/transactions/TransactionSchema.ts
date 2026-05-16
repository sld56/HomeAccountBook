import { z } from 'zod';

export const transactionSchema = z.object({
  kind: z.enum(['in', 'out']),
  amount: z.coerce.number().int().positive('금액을 입력해주세요'),
  cat: z.string().min(1, '카테고리를 선택해주세요'),
  title: z.string().min(1, '제목을 입력해주세요').max(40),
  memo: z.string().max(140).optional().or(z.literal('')),
  member: z.string().min(1),
  account: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type TransactionFormValues = z.infer<typeof transactionSchema>;
