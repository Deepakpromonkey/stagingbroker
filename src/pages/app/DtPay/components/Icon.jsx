import {
  Payments,
  Lock,
  Check,
  LocalShipping,
  WarningAmber,
  Description,
  AccountBalance,
  CreditCard,
  Bolt,
  FileUpload,
  Search,
  Replay,
  Shield,
  People,
  Add,
  Close,
  Balance,
  MenuBook,
  Settings,
  Visibility,
  SentimentSatisfiedAlt,
  Business,
  Send,
  Flag,
  CalendarMonth,
} from '@mui/icons-material';

// Maps the original icon keys (ic('truck')) to Material Icons components.
const MAP = {
  pay: Payments,
  lock: Lock,
  chk: Check,
  truck: LocalShipping,
  alert: WarningAmber,
  doc: Description,
  bank: AccountBalance,
  card: CreditCard,
  bolt: Bolt,
  up: FileUpload,
  search: Search,
  refund: Replay,
  shield: Shield,
  users: People,
  plus: Add,
  x: Close,
  scale: Balance,
  ledger: MenuBook,
  gear: Settings,
  eye: Visibility,
  face: SentimentSatisfiedAlt,
  factor: Business,
  send: Send,
  flag: Flag,
  cal: CalendarMonth,
};

// <Icon name="truck" size={16} /> — drop-in replacement for the old ic() helper.
// Inherits currentColor like the original stroke icons did.
export default function Icon({ name, size = 16, style, className }) {
  const Cmp = MAP[name] || Description;
  return (
    <span className={'mi' + (className ? ' ' + className : '')} style={style}>
      <Cmp sx={{ fontSize: size }} />
    </span>
  );
}
