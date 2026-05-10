/**
 * Snapshot tests for Expenses UI components.
 * Covers each split-type tab in valid and invalid states.
 */
import React from 'react';
import { render } from '@testing-library/react-native';

import { SplitEqualTab } from '@/features/expenses/components/SplitEqualTab';
import { SplitExactTab } from '@/features/expenses/components/SplitExactTab';
import { SplitPercentageTab } from '@/features/expenses/components/SplitPercentageTab';
import { SplitSharesTab } from '@/features/expenses/components/SplitSharesTab';
import type { ParticipantSplit } from '@/features/expenses/types';

// Reanimated needs its mock in tests
// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

// ─── shared fixtures ──────────────────────────────────────────────────────────

const TOTAL_PAISE = 30000; // ₹300
const CURRENCY = 'INR';
const noop = () => {};

function makeParticipant(
  id: string,
  name: string,
  overrides: Partial<ParticipantSplit> = {},
): ParticipantSplit {
  return {
    user_id: id,
    name,
    avatar_url: null,
    included: true,
    amount: 0,
    exactStr: '',
    percentage: 0,
    shares: 1,
    ...overrides,
  };
}

const TWO_PARTICIPANTS: ParticipantSplit[] = [
  makeParticipant('u1', 'Sahil'),
  makeParticipant('u2', 'Priya'),
];

const THREE_PARTICIPANTS: ParticipantSplit[] = [
  makeParticipant('u1', 'Sahil'),
  makeParticipant('u2', 'Priya'),
  makeParticipant('u3', 'Rahul'),
];

// ─── SplitEqualTab ────────────────────────────────────────────────────────────

describe('SplitEqualTab', () => {
  it('renders with all participants included', () => {
    const { toJSON } = render(
      <SplitEqualTab
        participants={TWO_PARTICIPANTS}
        totalPaise={TOTAL_PAISE}
        currency={CURRENCY}
        onChange={noop}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders with one participant excluded', () => {
    const mixed = [
      makeParticipant('u1', 'Sahil', { included: true }),
      makeParticipant('u2', 'Priya', { included: false }),
    ];
    const { toJSON } = render(
      <SplitEqualTab
        participants={mixed}
        totalPaise={TOTAL_PAISE}
        currency={CURRENCY}
        onChange={noop}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders empty state when no participants', () => {
    const { toJSON } = render(
      <SplitEqualTab
        participants={[]}
        totalPaise={TOTAL_PAISE}
        currency={CURRENCY}
        onChange={noop}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders rounding note when 3 participants share uneven amount', () => {
    // 30000 ÷ 3 = 10000, 10000, 10000 — actually even, use 100 ÷ 3 = 34, 33, 33
    const { toJSON } = render(
      <SplitEqualTab
        participants={THREE_PARTICIPANTS}
        totalPaise={100}
        currency={CURRENCY}
        onChange={noop}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});

// ─── SplitExactTab ────────────────────────────────────────────────────────────

describe('SplitExactTab', () => {
  it('renders balanced state', () => {
    const balanced = [
      makeParticipant('u1', 'Sahil', { included: true, exactStr: '150', amount: 15000 }),
      makeParticipant('u2', 'Priya', { included: true, exactStr: '150', amount: 15000 }),
    ];
    const { toJSON } = render(
      <SplitExactTab
        participants={balanced}
        totalPaise={TOTAL_PAISE}
        currency={CURRENCY}
        onChange={noop}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders under-allocated (remaining > 0)', () => {
    const under = [
      makeParticipant('u1', 'Sahil', { included: true, exactStr: '100', amount: 10000 }),
      makeParticipant('u2', 'Priya', { included: true, exactStr: '100', amount: 10000 }),
    ];
    const { toJSON } = render(
      <SplitExactTab
        participants={under}
        totalPaise={TOTAL_PAISE}
        currency={CURRENCY}
        onChange={noop}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders over-allocated (remaining < 0)', () => {
    const over = [
      makeParticipant('u1', 'Sahil', { included: true, exactStr: '200', amount: 20000 }),
      makeParticipant('u2', 'Priya', { included: true, exactStr: '200', amount: 20000 }),
    ];
    const { toJSON } = render(
      <SplitExactTab
        participants={over}
        totalPaise={TOTAL_PAISE}
        currency={CURRENCY}
        onChange={noop}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders with one participant excluded', () => {
    const partial = [
      makeParticipant('u1', 'Sahil', { included: true, exactStr: '300', amount: 30000 }),
      makeParticipant('u2', 'Priya', { included: false, exactStr: '', amount: 0 }),
    ];
    const { toJSON } = render(
      <SplitExactTab
        participants={partial}
        totalPaise={TOTAL_PAISE}
        currency={CURRENCY}
        onChange={noop}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});

// ─── SplitPercentageTab ───────────────────────────────────────────────────────

describe('SplitPercentageTab', () => {
  it('renders balanced (100%) state', () => {
    const balanced = [
      makeParticipant('u1', 'Sahil', { included: true, percentage: 50, amount: 15000 }),
      makeParticipant('u2', 'Priya', { included: true, percentage: 50, amount: 15000 }),
    ];
    const { toJSON } = render(
      <SplitPercentageTab
        participants={balanced}
        totalPaise={TOTAL_PAISE}
        currency={CURRENCY}
        onChange={noop}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders under-allocated (<100%)', () => {
    const under = [
      makeParticipant('u1', 'Sahil', { included: true, percentage: 30, amount: 9000 }),
      makeParticipant('u2', 'Priya', { included: true, percentage: 30, amount: 9000 }),
    ];
    const { toJSON } = render(
      <SplitPercentageTab
        participants={under}
        totalPaise={TOTAL_PAISE}
        currency={CURRENCY}
        onChange={noop}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders over-allocated (>100%)', () => {
    const over = [
      makeParticipant('u1', 'Sahil', { included: true, percentage: 70, amount: 21000 }),
      makeParticipant('u2', 'Priya', { included: true, percentage: 70, amount: 21000 }),
    ];
    const { toJSON } = render(
      <SplitPercentageTab
        participants={over}
        totalPaise={TOTAL_PAISE}
        currency={CURRENCY}
        onChange={noop}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});

// ─── SplitSharesTab ───────────────────────────────────────────────────────────

describe('SplitSharesTab', () => {
  it('renders equal shares (1/1)', () => {
    const equalShares = [
      makeParticipant('u1', 'Sahil', { included: true, shares: 1, amount: 15000 }),
      makeParticipant('u2', 'Priya', { included: true, shares: 1, amount: 15000 }),
    ];
    const { toJSON } = render(
      <SplitSharesTab
        participants={equalShares}
        totalPaise={TOTAL_PAISE}
        currency={CURRENCY}
        onChange={noop}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders unequal shares (1/2)', () => {
    const unequalShares = [
      makeParticipant('u1', 'Sahil', { included: true, shares: 1, amount: 10000 }),
      makeParticipant('u2', 'Priya', { included: true, shares: 2, amount: 20000 }),
    ];
    const { toJSON } = render(
      <SplitSharesTab
        participants={unequalShares}
        totalPaise={TOTAL_PAISE}
        currency={CURRENCY}
        onChange={noop}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders with one participant excluded', () => {
    const partial = [
      makeParticipant('u1', 'Sahil', { included: true, shares: 1, amount: 30000 }),
      makeParticipant('u2', 'Priya', { included: false, shares: 1, amount: 0 }),
    ];
    const { toJSON } = render(
      <SplitSharesTab
        participants={partial}
        totalPaise={TOTAL_PAISE}
        currency={CURRENCY}
        onChange={noop}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
