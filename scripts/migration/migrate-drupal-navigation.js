'use strict';

const { footerLinks, headerLinks } = require('./drupal-navigation-config');

const apply = process.argv.includes('--apply');

const contactBody = `## Наша адреса

м. Луцьк, вул. Львівська, 28

## Контактна інформація

- Телефон: [+38 (0332) 26-14-41](tel:+380332261441)
- Електронна пошта: [zosh2luck@ukrpost.ua](mailto:zosh2luck@ukrpost.ua)`;

const feedbackBody = `## Напишіть нам

Для зворотного зв’язку скористайтеся електронною поштою [zosh2luck@ukrpost.ua](mailto:zosh2luck@ukrpost.ua) або зателефонуйте за номером [+38 (0332) 26-14-41](tel:+380332261441).`;

const contactMap = {
  mapEmbedUrl:
    'https://www.google.com/maps?q=%D0%9B%D1%83%D1%86%D1%8C%D0%BA%2C%20%D0%B2%D1%83%D0%BB.%20%D0%9B%D1%8C%D0%B2%D1%96%D0%B2%D1%81%D1%8C%D0%BA%D0%B0%2C%2028&output=embed',
  mapLinkUrl:
    'https://www.google.com/maps/search/?api=1&query=%D0%9B%D1%83%D1%86%D1%8C%D0%BA%2C%20%D0%B2%D1%83%D0%BB.%20%D0%9B%D1%8C%D0%B2%D1%96%D0%B2%D1%81%D1%8C%D0%BA%D0%B0%2C%2028',
};

async function createApplication() {
  const { createStrapi, compileStrapi } = require('@strapi/strapi');
  const appContext = await compileStrapi();
  return createStrapi(appContext).load();
}

async function publishedSingle(app, uid) {
  return app.db.query(uid).findOne({ where: { publishedAt: { $notNull: true } } });
}

async function updateAndPublish(app, uid, documentId, data) {
  await app.documents(uid).update({ documentId, data });
  await app.documents(uid).publish({ documentId });
}

async function main() {
  const app = await createApplication();
  app.log.level = 'error';

  try {
    const [header, footer, contact, feedback] = await Promise.all([
      publishedSingle(app, 'api::header-menu.header-menu'),
      publishedSingle(app, 'api::footer-menu.footer-menu'),
      app.db.query('api::page.page').findOne({ where: { legacyNid: 36 } }),
      app.db.query('api::page.page').findOne({ where: { legacyNid: 21 } }),
    ]);

    const preview = {
      mode: apply ? 'apply' : 'dry-run',
      header: headerLinks.map(({ title, sublinks }) => ({
        title,
        children: sublinks?.length || 0,
      })),
      footer: footerLinks.map(({ title }) => title),
      contact: contact?.documentId || null,
      feedback: feedback?.documentId || null,
    };
    console.log(JSON.stringify(preview, null, 2));

    if (!apply) {
      console.log('\nRun with --apply to publish the migrated navigation.');
      return;
    }

    if (!header || !footer || !contact) {
      throw new Error('Header menu, footer menu, or contact page was not found.');
    }

    await updateAndPublish(
      app,
      'api::header-menu.header-menu',
      header.documentId,
      { links: headerLinks }
    );
    await updateAndPublish(
      app,
      'api::footer-menu.footer-menu',
      footer.documentId,
      {
        text: 'Жанна Бондарчук. Усі права захищено.',
        links: footerLinks,
      }
    );
    await updateAndPublish(app, 'api::page.page', contact.documentId, {
      description: 'Адреса та контактна інформація Луцької школи № 2.',
      blocks: [{ __component: 'shared.rich-text', body: contactBody }],
      ...contactMap,
    });

    if (feedback) {
      await updateAndPublish(app, 'api::page.page', feedback.documentId, {
        title: 'Зворотний зв’язок',
        description: 'Контактні дані для звернень до школи.',
        blocks: [{ __component: 'shared.rich-text', body: feedbackBody }],
      });
    }

    console.log('\nNavigation, footer, contact details, and map were published.');
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
