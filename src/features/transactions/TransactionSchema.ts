import { z } from 'zod';

// '2026-02-30' 같은 형식은 맞지만 존재하지 않는 날짜를 거르기 위한 검증
function isValidDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

export const transactionSchema = z.object({
  kind: z.enum(['in', 'out']),
  amount: z.coerce
    .number({ invalid_type_error: '금액을 입력해주세요' })
    .int('금액은 원 단위 정수만 가능합니다')
    .positive('0보다 큰 금액을 입력해주세요'),
  cat: z.string().min(1, '카테고리를 선택해주세요'),
  title: z
    .string()
    .trim()
    .min(1, '제목을 입력해주세요')
    .max(40, '제목은 40자 이내로 입력해주세요'),
  memo: z.string().max(140, '메모는 140자 이내로 입력해주세요').optional().or(z.literal('')),
  member: z.string().min(1, '누가 사용했는지 선택해주세요'),
  account: z.string().min(1, '결제 수단을 선택해주세요'),
  date: z
    .string()
    .refine(isValidDate, { message: '올바른 날짜를 선택해주세요' }),
});

export type TransactionFormValues = z.infer<typeof transactionSchema>;
