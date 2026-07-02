'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { handleApiError } from '@/utils/error';
import { adminMembersApi } from '@/lib/api';
import { toastMessage } from '@/utils/toastMessages';

const ALL_ROLES = ['user', 'admin', 'super_admin'];

interface MemberRoleSelectProps {
  memberId: number;
  currentRole: string;
  onRoleChange: () => void;
}

export function MemberRoleSelect({ memberId, currentRole, onRoleChange }: MemberRoleSelectProps) {
  const t = useTranslations('admin.members.roles');
  const [updating, setUpdating] = useState(false);

  const handleChange = async (nextRole: string) => {
    if (!nextRole || nextRole === currentRole) return;

    setUpdating(true);
    try {
      await adminMembersApi.updateRole(memberId, nextRole);
      toast.success(toastMessage('roleChanged', { role: t(nextRole) }));
      onRoleChange();
    } catch (err) {
      toast.error(handleApiError(err, toastMessage('roleChangeError')));
    } finally {
      setUpdating(false);
    }
  };

  return (
    <select
      disabled={updating}
      value={currentRole}
      onChange={(e) => void handleChange(e.target.value)}
      className="rounded border bg-background px-2 py-1 text-xs disabled:opacity-50"
    >
      {ALL_ROLES.map((role) => (
        <option key={role} value={role}>
          {t(role)}
        </option>
      ))}
    </select>
  );
}
