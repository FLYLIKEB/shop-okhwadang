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
    <div className="rounded-lg border border-dashed border-yellow-400 bg-yellow-50 p-4 text-center text-sm text-yellow-700">
      {prefix}<code>{type}</code>
    </div>
  );
}
