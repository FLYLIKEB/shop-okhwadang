'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { AdminMember } from '@/lib/api';
import { MemberRoleSelect } from './MemberRoleSelect';
import { StatusBadge } from './StatusBadge';
import { formatDate } from '@/utils/date';

interface AdminMembersTableProps {
  members: AdminMember[];
  onRoleChange: () => void;
}

export function AdminMembersTable({ members, onRoleChange }: AdminMembersTableProps) {
  const t = useTranslations('admin.members');
  const locale = useLocale();

  if (members.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">{t('noMembers')}</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left font-medium">{t('columns.id')}</th>
            <th className="px-4 py-3 text-left font-medium">{t('columns.email')}</th>
            <th className="px-4 py-3 text-left font-medium">{t('columns.name')}</th>
            <th className="px-4 py-3 text-left font-medium">{t('columns.role')}</th>
            <th className="px-4 py-3 text-left font-medium">{t('columns.status')}</th>
            <th className="px-4 py-3 text-left font-medium">{t('columns.joinDate')}</th>
            <th className="px-4 py-3 text-left font-medium">{t('columns.changeRole')}</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {members.map((member) => (
            <tr key={member.id} className="hover:bg-muted/30">
              <td className="px-4 py-3">{member.id}</td>
              <td className="px-4 py-3">{member.email}</td>
              <td className="px-4 py-3">{member.name}</td>
              <td className="px-4 py-3">
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                  {t(`roles.${member.role}`)}
                </span>
              </td>
              <td className="px-4 py-3">
                <StatusBadge isActive={member.isActive} />
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {formatDate(member.createdAt, locale)}
              </td>
              <td className="px-4 py-3">
                {member.isActive ? (
                  <MemberRoleSelect
                    memberId={member.id}
                    currentRole={member.role}
                    onRoleChange={onRoleChange}
                  />
                ) : (
                  <span className="text-xs text-muted-foreground">{t('cannotChange')}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
