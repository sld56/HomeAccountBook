import { CATEGORIES } from '@/data/categories';
import { MEMBERS_BY_ID } from '@/data/members';
import { fmt } from '@/lib/format';
import { useSettings } from '@/stores/settingsStore';
import { useAccounts } from '@/stores/accountStore';
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
  const cat = CATEGORIES[tx.cat];
  const account = accounts.find((a) => a.id === tx.account);
  const member = MEMBERS_BY_ID[tx.member];
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
