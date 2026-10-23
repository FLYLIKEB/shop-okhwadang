import { localMessage } from '@/utils/localMessages';

interface Props {
  type: string;
}

export default function UnknownBlock({ type }: Props) {
  if (process.env.NODE_ENV === 'production') {
    return <div data-block-type={type} />;
  }

  const [prefix] = localMessage('ui.unknownBlock', { type }).split(type);

  return (
    <div className="rounded-lg border border-dashed border-yellow-400 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/40 p-4 text-center text-sm text-yellow-700 dark:text-yellow-200">
      {prefix}<code>{type}</code>
    </div>
  );
}
