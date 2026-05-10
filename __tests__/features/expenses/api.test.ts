/**
 * Unit tests for the expenses API layer.
 * Supabase is fully mocked — these verify that:
 *  1. DB error codes are translated to human-readable messages.
 *  2. The happy path returns the expected shape.
 */

// Mock supabase before any imports that transitively import it
import { supabase } from '@/lib/supabase';
import { apiCreateExpense, apiUpdateExpense, apiDeleteExpense } from '@/features/expenses/api';
import type { CreateExpenseInput, UpdateExpenseInput } from '@/features/expenses/types';

jest.mock('@/lib/supabase', () => {
  const rpcMock = jest.fn();
  const chainMock: Record<string, jest.Mock> = {};
  const buildChain = (resolvedValue: unknown) => {
    const chain: Record<string, jest.Mock> = {};
    const methods = ['select', 'eq', 'neq', 'order', 'single', 'returns'] as const;
    methods.forEach((m) => {
      chain[m] = jest.fn().mockReturnThis();
    });
    // Make the chain thenable so `await chain` resolves to resolvedValue
    (chain as { then: (resolve: (v: unknown) => void) => Promise<unknown> }).then = (
      resolve: (v: unknown) => void,
    ) => Promise.resolve(resolvedValue).then(resolve);
    Object.assign(chainMock, chain);
    return chain;
  };

  return {
    supabase: {
      rpc: rpcMock,
      from: jest.fn().mockImplementation(() => buildChain({ data: null, error: null })),
      channel: jest.fn().mockReturnValue({
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
      }),
      removeChannel: jest.fn(),
      auth: {
        getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
        onAuthStateChange: jest.fn().mockReturnValue({
          data: { subscription: { unsubscribe: jest.fn() } },
        }),
      },
    },
  };
});

const mockRpc = supabase.rpc as jest.Mock;

const BASE_CREATE_INPUT: CreateExpenseInput = {
  group_id: 'group-1',
  description: 'Dinner',
  amount: 30000, // 300 rupees
  currency: 'INR',
  paid_by: 'user-1',
  split_type: 'equal',
  splits: [
    { user_id: 'user-1', amount: 15000 },
    { user_id: 'user-2', amount: 15000 },
  ],
};

const BASE_UPDATE_INPUT: UpdateExpenseInput = {
  expense_id: 'exp-1',
  description: 'Lunch',
  amount: 10000,
  currency: 'INR',
  paid_by: 'user-1',
  split_type: 'equal',
  splits: [
    { user_id: 'user-1', amount: 5000 },
    { user_id: 'user-2', amount: 5000 },
  ],
};

beforeEach(() => {
  mockRpc.mockReset();
});

// ─── rpcError mapping ─────────────────────────────────────────────────────────

describe('apiCreateExpense — DB error mapping', () => {
  it('maps splits_mismatch error to readable message', async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: {
        message: 'splits_mismatch: splits sum (29999 paise) != expense total (30000 paise)',
      },
    });
    const result = await apiCreateExpense(BASE_CREATE_INPUT);
    expect(result.error).toMatch(/don't add up/i);
    expect(result.data).toBeNull();
  });

  it('maps not_a_member error', async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'not_a_member: caller is not in group' },
    });
    const result = await apiCreateExpense(BASE_CREATE_INPUT);
    expect(result.error).toMatch(/not a member/i);
  });

  it('maps payer_not_a_member error', async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'payer_not_a_member: paid_by user is not in group' },
    });
    const result = await apiCreateExpense(BASE_CREATE_INPUT);
    expect(result.error).toMatch(/payer is not in this group/i);
  });

  it('maps split_user_not_a_member error', async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'split_user_not_a_member: user-99' },
    });
    const result = await apiCreateExpense(BASE_CREATE_INPUT);
    expect(result.error).toMatch(/participant is not in this group/i);
    expect(result.error).toContain('user-99');
  });

  it('maps not_authorized error', async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'not_authorized: only creator or admin' },
    });
    const result = await apiCreateExpense(BASE_CREATE_INPUT);
    expect(result.error).toMatch(/creator or a group admin/i);
  });

  it('maps expense_not_found error', async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'expense_not_found: deleted or never existed' },
    });
    const result = await apiCreateExpense(BASE_CREATE_INPUT);
    expect(result.error).toMatch(/no longer exists/i);
  });

  it('passes through unknown DB error messages verbatim', async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'something totally unexpected' },
    });
    const result = await apiCreateExpense(BASE_CREATE_INPUT);
    expect(result.error).toBe('something totally unexpected');
  });

  it('returns success on happy path with UUID', async () => {
    const uuid = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    mockRpc.mockResolvedValueOnce({ data: uuid, error: null });
    const result = await apiCreateExpense(BASE_CREATE_INPUT);
    expect(result.error).toBeNull();
    expect(result.data).toBe(uuid);
  });
});

// ─── apiUpdateExpense ─────────────────────────────────────────────────────────

describe('apiUpdateExpense — DB error mapping', () => {
  it('maps splits_mismatch on update', async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'splits_mismatch: 9999 != 10000' },
    });
    const result = await apiUpdateExpense(BASE_UPDATE_INPUT);
    expect(result.error).toMatch(/don't add up/i);
  });

  it('returns success (undefined data) on happy path', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: null });
    const result = await apiUpdateExpense(BASE_UPDATE_INPUT);
    expect(result.error).toBeNull();
  });
});

// ─── apiDeleteExpense ─────────────────────────────────────────────────────────

describe('apiDeleteExpense — error handling', () => {
  it('maps expense_not_found on delete', async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'expense_not_found: already deleted' },
    });
    const result = await apiDeleteExpense('exp-99');
    expect(result.error).toMatch(/no longer exists/i);
  });

  it('maps not_authorized on delete', async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'not_authorized: not the creator' },
    });
    const result = await apiDeleteExpense('exp-1');
    expect(result.error).toMatch(/creator or a group admin/i);
  });

  it('returns success on happy path', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: null });
    const result = await apiDeleteExpense('exp-1');
    expect(result.error).toBeNull();
  });
});
