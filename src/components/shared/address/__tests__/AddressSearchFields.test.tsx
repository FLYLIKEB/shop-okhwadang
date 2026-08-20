import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AddressSearchFields, type AddressSearchResult } from '@/components/shared/address/AddressSearchFields';

interface TestPostcodeOptions {
  oncomplete: (data: AddressSearchResult) => void;
  width?: string;
  height?: string;
}

interface TestPostcodeWindow extends Window {
  daum?: {
    Postcode: new (options: TestPostcodeOptions) => { embed: (element: HTMLElement) => void };
  };
}

const labels = {
  zipcode: '우편번호',
  address: '주소',
  addressDetail: '상세 주소',
  addressSearch: '주소 검색',
  addressSearchClose: '주소 검색 닫기',
  addressSearchLoadError: '주소 검색을 불러오지 못했습니다.',
};

const placeholders = {
  zipcode: '12345',
  address: '주소 검색으로 기본 주소를 입력하세요.',
  addressDetail: '동/호수 등',
};

function renderFields(onAddressSelect = vi.fn()) {
  return render(
    <AddressSearchFields
      values={{ zipcode: '', address: '', addressDetail: '' }}
      labels={labels}
      placeholders={placeholders}
      onChange={vi.fn()}
      onAddressSelect={onAddressSelect}
      idPrefix="test-address"
    />,
  );
}

describe('AddressSearchFields', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.querySelectorAll('script[data-daum-postcode]').forEach((script) => script.remove());
    delete (window as TestPostcodeWindow).daum;
  });

  afterEach(() => {
    document.body.querySelectorAll('script[data-daum-postcode]').forEach((script) => script.remove());
    delete (window as TestPostcodeWindow).daum;
  });

  it('loads the Daum postcode script and keeps search disabled until ready', () => {
    renderFields();

    expect(document.querySelector('script[data-daum-postcode]')).toHaveAttribute(
      'src',
      'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js',
    );
    expect(screen.getByRole('button', { name: '주소 검색' })).toBeDisabled();
  });

  it('opens the embedded search dialog and emits selected zipcode and address', async () => {
    const user = userEvent.setup();
    const onAddressSelect = vi.fn();
    let postcodeOptions: TestPostcodeOptions | null = null;
    const embed = vi.fn();

    (window as TestPostcodeWindow).daum = {
      Postcode: class {
        constructor(options: TestPostcodeOptions) {
          postcodeOptions = options;
        }

        embed(element: HTMLElement) {
          embed(element);
        }
      },
    };

    renderFields(onAddressSelect);

    const searchButton = screen.getByRole('button', { name: '주소 검색' });
    await waitFor(() => expect(searchButton).toBeEnabled());
    await user.click(searchButton);

    expect(screen.getByRole('dialog', { name: '주소 검색' })).toBeInTheDocument();
    expect(embed).toHaveBeenCalledWith(expect.any(HTMLElement));

    act(() => {
      postcodeOptions?.oncomplete({
        zonecode: '06234',
        address: '서울특별시 강남구 테헤란로',
        roadAddress: '서울특별시 강남구 테헤란로',
        jibunAddress: '서울특별시 강남구 역삼동',
      });
    });

    expect(onAddressSelect).toHaveBeenCalledWith({
      zonecode: '06234',
      address: '서울특별시 강남구 테헤란로',
      roadAddress: '서울특별시 강남구 테헤란로',
      jibunAddress: '서울특별시 강남구 역삼동',
    });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '주소 검색' })).not.toBeInTheDocument());
  });

  it('shows a localized load error and allows manual entry when the external script fails', async () => {
    renderFields();

    act(() => {
      document.querySelector('script[data-daum-postcode]')?.dispatchEvent(new Event('error'));
    });

    expect(await screen.findByRole('status')).toHaveTextContent('주소 검색을 불러오지 못했습니다.');
    expect(screen.getByLabelText(/우편번호/)).not.toHaveAttribute('readonly');
    expect(screen.getByLabelText(/^주소/)).not.toHaveAttribute('readonly');
    expect(screen.getByRole('button', { name: '주소 검색' })).toBeEnabled();
  });

  it('closes the embedded search dialog with Escape and restores focus to the search button', async () => {
    const user = userEvent.setup();
    (window as TestPostcodeWindow).daum = {
      Postcode: class {
        constructor() {}
        embed() {}
      },
    };

    renderFields();

    const searchButton = screen.getByRole('button', { name: '주소 검색' });
    await waitFor(() => expect(searchButton).toBeEnabled());
    await user.click(searchButton);
    expect(screen.getByRole('dialog', { name: '주소 검색' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: '주소 검색 닫기' })).toHaveFocus());

    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog', { name: '주소 검색' })).not.toBeInTheDocument());
    await waitFor(() => expect(searchButton).toHaveFocus());
  });
});
