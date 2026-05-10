/**
 * Snapshot tests for Groups UI components.
 */
import React from 'react';
import { render } from '@testing-library/react-native';

import { EmptyGroups } from '@/features/groups/components/EmptyGroups';
import { GroupListItem } from '@/features/groups/components/GroupListItem';
import { GroupAvatar } from '@/features/groups/components/GroupAvatar';
import { MemberAvatarRow } from '@/features/groups/components/MemberAvatarRow';
import type { GroupWithMeta, GroupMemberWithUser } from '@/features/groups/types';

// ---- shared fixtures -----------------------------------------------

const MOCK_GROUP: GroupWithMeta = {
  id: 'group-1',
  name: 'Goa Trip',
  description: 'Epic road trip',
  avatar_url: '✈️',
  currency: 'INR',
  created_by: 'user-1',
  invite_code: 'ABCD1234',
  created_at: '2026-05-07T00:00:00Z',
  updated_at: '2026-05-07T00:00:00Z',
  myRole: 'admin',
  memberCount: 3,
};

const MOCK_MEMBERS: GroupMemberWithUser[] = [
  {
    id: 'mem-1',
    group_id: 'group-1',
    user_id: 'user-1',
    role: 'admin',
    joined_at: '2026-05-07T00:00:00Z',
    user: { id: 'user-1', name: 'Sahil', avatar_url: null, upi_id: null },
  },
  {
    id: 'mem-2',
    group_id: 'group-1',
    user_id: 'user-2',
    role: 'member',
    joined_at: '2026-05-07T00:01:00Z',
    user: { id: 'user-2', name: 'Priya', avatar_url: null, upi_id: null },
  },
];

// ---- empty state ----------------------------------------------------

describe('EmptyGroups', () => {
  it('renders empty state correctly', () => {
    const { toJSON } = render(<EmptyGroups />);
    expect(toJSON()).toMatchSnapshot();
  });
});

// ---- group list item -----------------------------------------------

describe('GroupListItem', () => {
  it('renders a group row with emoji avatar', () => {
    const { toJSON } = render(<GroupListItem group={MOCK_GROUP} index={0} onPress={() => {}} />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders a group row with initials avatar', () => {
    const group: GroupWithMeta = { ...MOCK_GROUP, avatar_url: null };
    const { toJSON } = render(<GroupListItem group={group} index={1} onPress={() => {}} />);
    expect(toJSON()).toMatchSnapshot();
  });
});

// ---- group avatar --------------------------------------------------

describe('GroupAvatar', () => {
  it('renders emoji avatar', () => {
    const { toJSON } = render(<GroupAvatar name="Goa Trip" avatarUrl="✈️" size="md" />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders initials fallback', () => {
    const { toJSON } = render(<GroupAvatar name="Flat Expenses" avatarUrl={null} size="md" />);
    expect(toJSON()).toMatchSnapshot();
  });
});

// ---- member avatar row ---------------------------------------------

describe('MemberAvatarRow', () => {
  it('renders up to 5 member avatars', () => {
    const { toJSON } = render(<MemberAvatarRow members={MOCK_MEMBERS} />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders overflow badge when more than 5 members', () => {
    const manyMembers: GroupMemberWithUser[] = Array.from({ length: 7 }, (_, i) => ({
      id: `mem-${i}`,
      group_id: 'group-1',
      user_id: `user-${i}`,
      role: 'member',
      joined_at: '2026-05-07T00:00:00Z',
      user: { id: `user-${i}`, name: `Member ${i}`, avatar_url: null, upi_id: null },
    }));
    const { toJSON } = render(<MemberAvatarRow members={manyMembers} />);
    expect(toJSON()).toMatchSnapshot();
  });
});
