'use strict';

const { footerLinks, headerLinks } = require('./drupal-navigation-config');

const apply = process.argv.includes('--apply');

const courseTranslations = {
  'Introduction to Programming': {
    title: 'Вступ до програмування',
    description:
      'Основи програмування мовою Python: змінні, цикли, функції та базові структури даних.',
    grade: '9–10 класи',
  },
  'Advanced Programming': {
    title: 'Поглиблене програмування',
    description:
      'Об’єктно-орієнтоване програмування, алгоритми та структури даних мовами Java і C++.',
    grade: '11–12 класи',
  },
  'Web Development': {
    title: 'Веброзробка',
    description:
      'Створення сучасних сайтів за допомогою HTML, CSS, JavaScript і React.',
    grade: '10–12 класи',
  },
  'Computer Science Olympiad': {
    title: 'Олімпіадне програмування',
    description:
      'Підготовка до конкурсів та олімпіад: складні алгоритми й техніки розв’язування задач.',
    grade: 'Усі класи',
  },
};

const demoArticleTitles = new Set([
  'Our Students Win Regional Programming Competition',
  'New Web Development Module Added to Curriculum',
  'Tech Industry Guest Speaker',
  'A bug is becoming a meme on the internet',
  'Beautiful picture',
  'This shrimp is awesome',
  "What's inside a Black Hole",
  "The internet's Own boy",
]);

async function createApplication() {
  const { createStrapi, compileStrapi } = require('@strapi/strapi');
  const appContext = await compileStrapi();
  return createStrapi(appContext).load();
}

async function findPublished(app, uid, options = {}) {
  return app.db.query(uid).findMany({
    ...options,
    where: {
      ...(options.where || {}),
      publishedAt: { $notNull: true },
    },
  });
}

async function updateAndPublish(app, uid, documentId, data) {
  await app.documents(uid).update({ documentId, data });
  await app.documents(uid).publish({ documentId });
}

async function main() {
  const app = await createApplication();
  app.log.level = 'error';

  try {
    const [globals, headers, footers, courses, articles, pages, h5pItems] =
      await Promise.all([
        app.db.query('api::global.global').findMany(),
        findPublished(app, 'api::header-menu.header-menu'),
        findPublished(app, 'api::footer-menu.footer-menu'),
        findPublished(app, 'api::course.course'),
        findPublished(app, 'api::article.article'),
        findPublished(app, 'api::page.page', {
          where: { legacyNid: { $notNull: true } },
        }),
        app.db.query('api::h5p-content.h5p-content').findMany({
          where: { legacyNid: { $notNull: true } },
        }),
      ]);

    const migratedArticles = articles.filter((article) => article.legacyNid);
    const demoArticles = articles.filter((article) =>
      demoArticleTitles.has(article.title)
    );
    const globalSettings = globals[0];
    const header = headers[0];
    const footer = footers[0];

    const summary = {
      mode: apply ? 'apply' : 'dry-run',
      locale: 'uk',
      translatedCourses: courses
        .filter((course) => courseTranslations[course.title])
        .map((course) => course.title),
      normalizedMigratedRecords:
        migratedArticles.length + pages.length + h5pItems.length,
      demoArticlesToUnpublish: demoArticles.map((article) => article.title),
    };
    console.log(JSON.stringify(summary, null, 2));

    if (!apply) {
      console.log('\nRun with --apply to save the Ukrainian localization.');
      return;
    }

    const localeService = app.plugin('i18n').service('locales');
    let ukrainianLocale = await localeService.findByCode('uk');
    if (!ukrainianLocale) {
      ukrainianLocale = await localeService.create({
        code: 'uk',
        name: 'Ukrainian (uk)',
      });
    }
    await localeService.setDefaultLocale(ukrainianLocale);

    if (globalSettings) {
      await app.documents('api::global.global').update({
        documentId: globalSettings.documentId,
        data: {
          siteName: 'Сайт учителя інформатики',
          siteDescription:
            'Навчальні матеріали, новини та інтерактивні завдання з інформатики.',
          defaultLocale: 'uk',
          defaultSeo: {
            metaTitle: 'Сайт учителя інформатики',
            metaDescription:
              'Матеріали з інформатики, програмування та цифрової грамотності.',
          },
        },
      });
    }

    const author = await app.db.query('api::author.author').findOne({
      where: { name: 'Janna Bondarchuk' },
    });
    if (author) {
      await app.documents('api::author.author').update({
        documentId: author.documentId,
        data: { name: 'Жанна Бондарчук' },
      });
    }

    const newsCategory = await app.db.query('api::category.category').findOne({
      where: { slug: 'news' },
    });
    if (newsCategory) {
      await app.documents('api::category.category').update({
        documentId: newsCategory.documentId,
        data: { name: 'Новини' },
      });
    }

    for (const course of courses) {
      const translation = courseTranslations[course.title];
      if (translation) {
        await updateAndPublish(
          app,
          'api::course.course',
          course.documentId,
          translation
        );
      }
    }

    for (const article of migratedArticles) {
      await updateAndPublish(
        app,
        'api::article.article',
        article.documentId,
        { sourceLocale: 'uk' }
      );
    }
    for (const page of pages) {
      await updateAndPublish(app, 'api::page.page', page.documentId, {
        sourceLocale: 'uk',
      });
    }
    for (const item of h5pItems) {
      await app.documents('api::h5p-content.h5p-content').update({
        documentId: item.documentId,
        data: { sourceLocale: 'uk' },
      });
    }

    for (const article of demoArticles) {
      await app.documents('api::article.article').unpublish({
        documentId: article.documentId,
      });
    }

    if (header) {
      await updateAndPublish(
        app,
        'api::header-menu.header-menu',
        header.documentId,
        {
          links: headerLinks,
        }
      );
    }

    if (footer) {
      await updateAndPublish(
        app,
        'api::footer-menu.footer-menu',
        footer.documentId,
        {
          text: 'Жанна Бондарчук. Усі права захищено.',
          links: footerLinks,
        }
      );
    }

    const about = await app.db.query('api::about.about').findOne();
    if (about) {
      await app.documents('api::about.about').update({
        documentId: about.documentId,
        data: {
          title: 'Про вчителя',
          blocks: [
            {
              __component: 'shared.rich-text',
              body:
                'Жанна Бондарчук — учителька інформатики. На сайті зібрані навчальні матеріали, методичні напрацювання, новини та інтерактивні вправи для учнів і колег.',
            },
          ],
        },
      });
    }

    console.log('\nUkrainian locale and content defaults were saved.');
  } finally {
    await app.destroy();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
