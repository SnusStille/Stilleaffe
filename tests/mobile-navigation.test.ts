import assert from 'node:assert/strict';
import test from 'node:test';
import { splitMobileNavigation } from '../lib/mobile-navigation';

const tabs = ['mission', 'review', 'overview', 'register', 'history', 'stats', 'year', 'goals', 'achievements', 'comments', 'ai', 'settings'].map((id) => ({ id }));

test('seller mobile navigation keeps registration one tap away and every tab reachable', () => {
  const { primary, more } = splitMobileNavigation(tabs, 'seller');
  assert.deepEqual(primary.map((tab) => tab.id), ['mission', 'register', 'review', 'overview']);
  assert.equal(more.some((tab) => tab.id === 'register'), false);
  assert.deepEqual([...primary, ...more].map((tab) => tab.id).sort(), tabs.map((tab) => tab.id).sort());
});

test('manager mobile navigation keeps read-only communication nearby and excludes seller registration', () => {
  const managerTabs = tabs.filter((tab) => tab.id !== 'register');
  const { primary, more } = splitMobileNavigation(managerTabs, 'manager');
  assert.deepEqual(primary.map((tab) => tab.id), ['mission', 'overview', 'review', 'comments']);
  assert.equal([...primary, ...more].some((tab) => tab.id === 'register'), false);
  assert.deepEqual([...primary, ...more].map((tab) => tab.id).sort(), managerTabs.map((tab) => tab.id).sort());
});
