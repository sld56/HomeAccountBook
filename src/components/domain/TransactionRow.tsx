import { useMemo } from 'react';
import { CATEGORIES } from '@/data/categories';
import { fmt } from '@/lib/format';
import { useSettings } from '@/stores/settingsStore';
import { useAccounts } from '@/stores/accountStore';
import { useMembers } from '@/stores/memberStore';
import type { Transaction } from '@/types/domain';
import { CategoryIcon } from './CategoryIcon';
import { Chip } from '@/components/ui/Chip';
import './TransactionRow.css';

type Props = {
  tx: Transaction;
  onClick?: () => void;
};

export function TransactionRow({ tx, onClick }: Props) {
  const currency = useSettings((s) => s.currencyMode);
  const accounts = useAccounts((s) => s.accounts);
  const members = useMembers((s) => s.members);
  const cat = CATEGORIES[tx.cat];
  const account = useMemo(
    () => accounts.find((a) => a.id === tx.account),
    [accounts, tx.account],
  );
  const member = useMemo(
    () => members.find((m) => m.id === tx.member),
    [members, tx.member],
  );
  return (
    <button type="button" className="tx-row" onClick={onClick}>
      <CategoryIcon catId={tx.cat} size={40} />
      <div className="tx-main">
        <div className="tx-title">{tx.title}</div>
        <div className="tx-meta">
          <span>{cat.label}</span>
          {member && <span>· {member.name}</span>}
          {tx.memo && <span>· {tx.memo}</span>}
        </div>
      </div>
      {account && <Chip tone="default">{account.label}</Chip>}
      <div className={`tx-amount num ${tx.kind === 'in' ? 'income' : 'expense'}`}>
        {fmt.signed(tx.amount, tx.kind, currency)}
      </div>
    </button>
  );
}
