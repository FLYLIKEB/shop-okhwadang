'use client';

import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  blockType: string;
}

interface State {
  hasError: boolean;
}

export default class BlockErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  componentDidCatch(_error: Error, _errorInfo: ErrorInfo): void {
    // Error logging can be added here
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-sm text-red-600"
          role="alert"
        >
          블록을 표시할 수 없습니다 ({this.props.blockType})
        </div>
      );
    }

    return this.props.children;
  }
}
