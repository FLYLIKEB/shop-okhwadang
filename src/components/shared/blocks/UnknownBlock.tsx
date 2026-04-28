interface Props {
  type: string;
}

export default function UnknownBlock({ type }: Props) {
  if (process.env.NODE_ENV === 'production') {
    return <div data-block-type={type} />;
  }

  return (
    <div className="rounded-lg border border-dashed border-yellow-400 bg-yellow-50 p-4 text-center text-sm text-yellow-700">
      알 수 없는 블록 타입: <code>{type}</code>
    </div>
  );
}
