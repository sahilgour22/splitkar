/**
 * Unit tests for the join group flow.
 * Tests joinGroupByCode from features/groups/api.ts by mocking supabase.
 */

// jest.mock is hoisted before imports, so jest.fn() must live inside the factory.
// Access the mock via the imported `supabase` object after the mock is set up.
import { joinGroupByCode } from '@/features/groups/api';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: jest.fn(),
    from: jest.fn(),
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
    },
  },
}));

const mockRpc = supabase.rpc as jest.Mock;

const VALID_GROUP_ID = 'aaaaaaaa-0000-0000-0000-000000000001';
const VALID_CODE = 'ABCD1234';

describe('joinGroupByCode', () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  it('returns group ID on valid code', async () => {
    mockRpc.mockResolvedValue({ data: VALID_GROUP_ID, error: null });

    const result = await joinGroupByCode(VALID_CODE);

    expect(mockRpc).toHaveBeenCalledWith('join_group_by_code', { p_code: VALID_CODE });
    expect(result.data).toBe(VALID_GROUP_ID);
    expect(result.error).toBeNull();
  });

  it('returns invalid_code error on bad code', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'invalid_code', code: 'P0001' },
    });

    const result = await joinGroupByCode('BADCODE1');

    expect(result.data).toBeNull();
    expect(result.error).toBe('invalid_code');
  });

  it('returns already_member error when user is already in the group', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: {
        message: 'already_member',
        code: 'P0001',
        hint: VALID_GROUP_ID,
      },
    });

    const result = await joinGroupByCode(VALID_CODE);

    expect(result.data).toBeNull();
    expect(result.error).toBe('already_member');
    // @ts-expect-error – narrowed union type
    expect(result.groupId).toBe(VALID_GROUP_ID);
  });

  it('returns generic error for unexpected RPC failures', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'not_authenticated', code: 'P0001' },
    });

    const result = await joinGroupByCode(VALID_CODE);

    expect(result.data).toBeNull();
    expect(typeof result.error).toBe('string');
    expect(result.error).toContain('not_authenticated');
  });
});
