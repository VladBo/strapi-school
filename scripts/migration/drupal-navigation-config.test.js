'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { headerLinks } = require('./drupal-navigation-config');

const titles = (links) => links.map((item) => item.title);

test('header menu uses the approved top-level navigation order', () => {
  assert.deepEqual(titles(headerLinks), [
    'Навчання',
    'Вправи',
    'Матеріали',
    'Розклад',
    'Про вчителя',
    'Контакти',
  ]);
  assert.equal(titles(headerLinks).includes('Головна'), false);
  assert.equal(titles(headerLinks).includes('Курси'), false);
});

test('header menu places learning, exercises, materials, and schedules in their groups', () => {
  const byTitle = Object.fromEntries(headerLinks.map((item) => [item.title, item]));

  assert.deepEqual(titles(byTitle.Навчання.sublinks), [
    'Всеобуч',
    '6 клас',
    '7 клас',
    '8 клас',
    '9 клас',
    '10 клас',
    '11 клас',
    'Факультатив',
  ]);
  assert.equal(byTitle.Вправи.type, 'internal');
  assert.equal(byTitle.Вправи.url, '/quizzes');
  assert.deepEqual(titles(byTitle.Матеріали.sublinks), [
    'Новини',
    'Методичні рекомендації',
    'Нетипові уроки інформатики',
  ]);
  assert.deepEqual(titles(byTitle.Розклад.sublinks), [
    'Розклад уроків',
    'Розклад дзвінків',
    'Розклад факультативів',
  ]);
  assert.equal(byTitle['Про вчителя'].url, '/about');
  assert.equal(byTitle.Контакти.url, '/pages/kontakti');
});
