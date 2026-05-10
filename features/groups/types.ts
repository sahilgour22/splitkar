import type { GroupRow, GroupMemberRow, UserRow } from '@/types/database';

export type Result<T, E = string> = { data: T; error: null } | { data: null; error: E };

export type GroupMemberWithUser = GroupMemberRow & {
  user: Pick<UserRow, 'id' | 'name' | 'avatar_url' | 'upi_id'>;
};

export type GroupWithMeta = GroupRow & {
  myRole: 'admin' | 'member';
  memberCount: number;
};

export type GroupWithMembers = GroupRow & {
  members: GroupMemberWithUser[];
  myRole: 'admin' | 'member';
};

export type GroupPreview = {
  id: string;
  name: string;
  avatar_url: string | null;
  currency: string;
  member_count: number;
  already_member: boolean;
};

export type CreateGroupInput = {
  name: string;
  description?: string;
  currency: string;
  avatarEmoji?: string;
};
