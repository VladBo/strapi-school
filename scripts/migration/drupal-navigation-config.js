'use strict';

const headerLinks = [
  {
    title: 'Навчання',
    type: 'wrapper',
    description: 'Матеріали для учнів за класами',
    sublinks: [
      {
        title: 'Всеобуч',
        url: '/pages/vseobuch',
      },
      { title: '6 клас', url: '/pages/71' },
      { title: '7 клас', url: '/pages/7-klas' },
      { title: '8 клас', url: '/pages/8-klas' },
      { title: '9 клас', url: '/pages/9-klas' },
      { title: '10 клас', url: '/pages/10-klas' },
      { title: '11 клас', url: '/pages/11-klas' },
      {
        title: 'Факультатив',
        url: '/pages/fakultativ',
        description: 'Основи програмування мовою Python',
      },
    ],
  },
  {
    title: 'Вправи',
    type: 'internal',
    url: '/quizzes',
  },
  {
    title: 'Матеріали',
    type: 'wrapper',
    description: 'Новини та методичні матеріали',
    sublinks: [
      {
        title: 'Новини',
        url: '/articles',
        description: 'Події, конкурси й публікації',
      },
      {
        title: 'Методичні рекомендації',
        url: '/pages/metodichni-rekomendaciyi',
      },
      {
        title: 'Нетипові уроки інформатики',
        url: '/pages/netipovi-uroki-informatiki',
      },
    ],
  },
  {
    title: 'Розклад',
    type: 'wrapper',
    description: 'Архівні розклади школи',
    sublinks: [
      { title: 'Розклад уроків', url: '/pages/rozklad-urokiv' },
      { title: 'Розклад дзвінків', url: '/pages/rozklad-dzvinkiv' },
      {
        title: 'Розклад факультативів',
        url: '/pages/rozklad-fakultativiv',
      },
    ],
  },
  { title: 'Про вчителя', type: 'internal', url: '/about' },
  { title: 'Контакти', type: 'internal', url: '/pages/kontakti' },
];

const footerLinks = [
  { title: 'Головна', url: '/' },
  { title: 'Новини', url: '/articles' },
  { title: 'Інтерактивні вправи', url: '/quizzes' },
  { title: 'Про вчителя', url: '/about' },
  { title: 'Контакти', url: '/pages/kontakti' },
];

module.exports = { footerLinks, headerLinks };
