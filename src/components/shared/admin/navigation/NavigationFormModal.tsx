'use client';

import { localMessage } from '@/utils/localMessages';
import { useMemo } from 'react';
import { useFormModal } from '@/components/shared/hooks/useFormModal';
import type { NavigationItem } from '@/lib/api';
import { GROUP_INFO, type NavGroup } from './navigationGroups';
import Modal from '@/components/ui/Modal';
import FormInput from '@/components/ui/FormInput';
import FormSelect from '@/components/ui/FormSelect';
import { Button } from '@/components/ui/button';

export interface NavigationFormData {
  label: string;
  labelEn: string;
  url: string;
  group: NavGroup;
  parent_id: number | null;
  is_active: boolean;
}

interface NavigationFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: NavigationFormData) => Promise<void>;
  initial: NavigationItem | null;
  group: NavGroup;
  flatItems: NavigationItem[];
}

export default function NavigationFormModal({
  open,
  onClose,
  onSubmit,
  initial,
  group,
  flatItems,
}: NavigationFormModalProps) {
  const defaults = useMemo<NavigationFormData>(
    () => ({
      label: '',
      labelEn: '',
      url: '',
      group,
      parent_id: null,
      is_active: true,
    }),
    [group],
  );

  const modalInitial = useMemo<NavigationFormData | null>(
    () =>
      initial
        ? {
            label: initial.label,
            labelEn: initial.labelEn ?? '',
            url: initial.url,
            group,
            parent_id: initial.parent_id,
            is_active: initial.is_active,
          }
        : null,
    [group, initial],
  );
  const { formData, setFormData, loading, handleSubmit } = useFormModal(
    defaults,
    modalInitial,
    open,
  );

  if (!open) return null;

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      maxWidth="md"
      className="p-7"
      ariaLabelledBy="navigation-modal-title"
    >
      <h2 id="navigation-modal-title" className="mb-1 typo-h2 font-body">
        {initial ? localMessage('adminEnglish.editMenu') : localMessage('adminEnglish.addNewMenu')}
      </h2>
      <p className="mb-5 typo-body-sm text-muted-foreground">
        {GROUP_INFO[group].label}{localMessage('adminEnglish.menu')} {initial ? localMessage('popups.edit') : localMessage('common.add')}{localMessage('adminEnglish.sentenceEnd')}
      </p>

      <form onSubmit={(e) => handleSubmit(e, onSubmit, onClose)} className="space-y-4">
        <FormInput
          id="nav-label"
          label={localMessage('adminEnglish.menuName')}
          required
          type="text"
          value={formData.label}
          onChange={(e) => setFormData({ ...formData, label: e.target.value })}
          maxLength={100}
          placeholder={localMessage('adminEnglish.eGProductsEventsCustomerService')}
        />
        <p className="-mt-2 typo-body-sm text-muted-foreground">{localMessage('adminEnglish.theNameDisplayedInTheStorefrontMenu')}</p>

        <FormInput
          id="nav-label-en"
          label={localMessage('adminEnglish.englishMenuName')}
          type="text"
          value={formData.labelEn}
          onChange={(e) => setFormData({ ...formData, labelEn: e.target.value })}
          maxLength={100}
          placeholder={localMessage('adminEnglish.eGProductsEventsCustomerService')}
        />
        <p className="-mt-2 typo-body-sm text-muted-foreground">
          {localMessage('adminEnglish.theEnglishDisplayNameLeaveEmptyTo')}
        </p>

        <FormInput
          id="nav-url"
          label={localMessage('adminEnglish.urlLink')}
          required
          type="text"
          value={formData.url}
          onChange={(e) => setFormData({ ...formData, url: e.target.value })}
          maxLength={500}
          placeholder={localMessage('adminEnglish.eGProductsEventHttpsExampleCom')}
        />
        <p className="-mt-2 typo-body-sm text-muted-foreground">
          {localMessage('adminEnglish.use')} <b>/products</b> {localMessage('adminEnglish.forInternalPagesOrAFullAddress')} <b>https://</b>{localMessage('adminEnglish.forExternalWebsites')}
        </p>

        <div>
          <FormSelect
            id="nav-parent"
            label={localMessage('adminEnglish.parentMenu')}
            options={[
              { value: '', label: localMessage('adminEnglish.noneTopLevelMenu') },
              ...flatItems
                .filter((i) => initial === null || i.id !== initial.id)
                .map((i) => ({ value: String(i.id), label: i.label })),
            ]}
            value={formData.parent_id ?? ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                parent_id: e.target.value ? Number(e.target.value) : null,
              })
            }
            className="border-soft rounded-xl py-3 typo-body-sm"
          />
          <p className="mt-1 typo-body-sm text-muted-foreground">
            {localMessage('adminEnglish.chooseAParentToCreateA')} <b>{localMessage('adminEnglish.submenuDropdown')}</b>{localMessage('adminEnglish.chooseNoneToCreateATopLevel')}
          </p>
        </div>

        <div className="surface-card px-4 py-3">
          <div className="flex items-center gap-2">
            <input
              id="nav-active"
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            <label htmlFor="nav-active" className="typo-body-sm font-semibold">
              {localMessage('adminEnglish.activeShowOnStorefront')}
            </label>
          </div>
          <p className="mt-1 pl-6 typo-body-sm text-muted-foreground">
            {localMessage('adminEnglish.uncheckToTemporarilyHideThisMenuFrom')}
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {localMessage('popups.cancel')}
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? localMessage('common.saving') : localMessage('popups.save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
