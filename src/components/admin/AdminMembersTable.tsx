'use client';

import type { AdminMember } from '@/lib/api';
import { MemberRoleSelect } from './MemberRoleSelect';

const ROLE_LABELS: Record<string, string> = {
  user: '일반회원',
  admin: '관리자',
  super_admin: '최고관리자',
};

interface AdminMembersTableProps {
  members: AdminMember[];
  onRoleChange: () => void;
}

export function AdminMembersTable({ members, onRoleChange }: AdminMembersTableProps) {
  if (members.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">회원이 없습니다.</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left font-medium">ID</th>
            <th className="px-4 py-3 text-left font-medium">이메일</th>
            <th className="px-4 py-3 text-left font-medium">이름</th>
            <th className="px-4 py-3 text-left font-medium">역할</th>
            <th className="px-4 py-3 text-left font-medium">상태</th>
            <th className="px-4 py-3 text-left font-medium">가입일</th>
            <th className="px-4 py-3 text-left font-medium">역할 변경</th>
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
                  {ROLE_LABELS[member.role] ?? member.role}
                </span>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    member.isActive
                      ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                      : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                  }`}
                >
                  {member.isActive ? '활성' : '비활성'}
                </span>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {new Date(member.createdAt).toLocaleDateString('ko-KR')}
              </td>
              <td className="px-4 py-3">
                {member.isActive ? (
                  <MemberRoleSelect
                    memberId={member.id}
                    currentRole={member.role}
                    onRoleChange={onRoleChange}
                  />
                ) : (
                  <span className="text-xs text-muted-foreground">변경 불가</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
