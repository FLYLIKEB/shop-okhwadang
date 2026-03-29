'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { adminMembersApi } from '@/lib/api';

const ROLE_LABELS: Record<string, string> = {
  user: '일반회원',
  admin: '관리자',
  super_admin: '최고관리자',
};

const ALL_ROLES = ['user', 'admin', 'super_admin'];

interface MemberRoleSelectProps {
  memberId: number;
  currentRole: string;
  onRoleChange: () => void;
}

export function MemberRoleSelect({ memberId, currentRole, onRoleChange }: MemberRoleSelectProps) {
  const [updating, setUpdating] = useState(false);

  const handleChange = async (nextRole: string) => {
    if (!nextRole || nextRole === currentRole) return;

    setUpdating(true);
    try {
      await adminMembersApi.updateRole(memberId, nextRole);
      toast.success(`역할이 ${ROLE_LABELS[nextRole]}(으)로 변경되었습니다.`);
      onRoleChange();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '역할 변경에 실패했습니다.';
      toast.error(message);
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
          {ROLE_LABELS[role]}
        </option>
      ))}
    </select>
  );
}
