'use strict';

const { footerLinks, headerLinks } = require('./drupal-navigation-config');

const apply = process.argv.includes('--apply');

function shorten(value, maximum = 185) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= maximum) return text;
  return `${text.slice(0, maximum - 1).trimEnd()}…`;
}

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
    const [homepages, slidePages, articles, courses, headerMenus, footerMenus] =
      await Promise.all([
        findPublished(app, 'api::homepage.homepage'),
        findPublished(app, 'api::page.page', {
          where: { pageType: 'slide' },
          orderBy: { legacyNid: 'asc' },
          populate: { cover: true },
        }),
        findPublished(app, 'api::article.article', {
          where: { legacyNid: { $notNull: true } },
          orderBy: { sourceUpdatedAt: 'desc' },
          limit: 3,
        }),
        findPublished(app, 'api::course.course', {
          orderBy: { id: 'asc' },
          limit: 3,
        }),
        findPublished(app, 'api::header-menu.header-menu'),
        findPublished(app, 'api::footer-menu.footer-menu'),
      ]);

    const homepage = homepages[0];
    const headerMenu = headerMenus[0];
    const footerMenu = footerMenus[0];

    if (!homepage) throw new Error('Published homepage was not found.');
    if (slidePages.length === 0) throw new Error('No migrated slide pages found.');

    const articleLinks = articles.map((article) => ({
      title: article.title,
      url: `/articles/${article.slug}`,
      description: shorten(article.description, 95),
    }));

    const blocks = [
      {
        __component: 'shared.hero-banner',
        banner: {
          title: 'Сайт учителя інформатики',
          subtitle:
            'Освітній простір Жанни Бондарчук для учнів, батьків і колег: навчальні матеріали, методичні розробки, новини та інтерактивні завдання.',
          buttons: [
            {
              title: 'Навчальні матеріали',
              URL: '/pages/metodichni-rekomendaciyi',
              primary: true,
            },
            {
              title: 'Інтерактивні вправи',
              URL: '/quizzes',
              primary: false,
            },
          ],
        },
        slider: {
          slides: slidePages.map((page) => ({
            title: page.title,
            subtitle: shorten(page.description),
            url: `/pages/${page.slug}`,
            image: page.cover?.id || null,
          })),
        },
      },
      {
        __component: 'sections.features-section',
        title: 'Матеріали для навчання й розвитку',
        subtitle:
          'На сайті зібрані матеріали з інформатики, практичні завдання та досвід шкільних проєктів.',
        features: [
          {
            title: 'Навчальні матеріали',
            subtitle:
              'Методичні рекомендації, розробки уроків і матеріали для самостійної роботи.',
            icon: 'BookOpen',
          },
          {
            title: 'Програмування',
            subtitle:
              'Алгоритми, Scratch, веброзробка та завдання для розвитку обчислювального мислення.',
            icon: 'Code',
          },
          {
            title: 'Інтерактивні вправи',
            subtitle:
              'Тести й практичні активності, що допомагають одразу перевірити знання.',
            icon: 'Puzzle',
          },
        ],
      },
      {
        __component: 'sections.courses-section',
        title: 'Навчальні курси',
        subtitle:
          'Послідовні програми для опанування програмування та сучасних вебтехнологій.',
        courses: courses.map((course) => course.id),
      },
      {
        __component: 'sections.articles-section',
        title: 'Останні новини та матеріали',
        subtitle:
          'Події, конкурси й корисні матеріали, перенесені зі старого сайту.',
        articles: articles.map((article) => article.id),
      },
    ];

    const preview = {
      mode: apply ? 'apply' : 'dry-run',
      homepage: {
        documentId: homepage.documentId,
        slides: slidePages.map(({ title, slug }) => ({ title, slug })),
        articles: articles.map(({ title, slug }) => ({ title, slug })),
        courses: courses.map(({ title }) => title),
      },
      header: headerMenu
        ? { documentId: headerMenu.documentId, articleLinks }
        : null,
      footer: footerMenu ? { documentId: footerMenu.documentId } : null,
    };

    console.log(JSON.stringify(preview, null, 2));

    if (!apply) {
      console.log('\nRun with --apply to update and publish the content.');
      return;
    }

    await updateAndPublish(
      app,
      'api::homepage.homepage',
      homepage.documentId,
      { blocks }
    );

    if (headerMenu) {
      await updateAndPublish(
        app,
        'api::header-menu.header-menu',
        headerMenu.documentId,
        {
          links: headerLinks,
        }
      );
    }

    if (footerMenu) {
      await updateAndPublish(
        app,
        'api::footer-menu.footer-menu',
        footerMenu.documentId,
        {
          links: footerLinks,
        }
      );
    }

    console.log('\nHomepage, header menu, and footer links were updated and published.');
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
