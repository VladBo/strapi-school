import type { Schema, Struct } from '@strapi/strapi';

export interface SectionsArticlesSection extends Struct.ComponentSchema {
  collectionName: 'components_sections_articles_sections';
  info: {
    displayName: 'Articles section';
  };
  attributes: {
    articles: Schema.Attribute.Relation<'oneToMany', 'api::article.article'>;
    subtitle: Schema.Attribute.Text;
    title: Schema.Attribute.String;
  };
}

export interface SectionsCoursesSection extends Struct.ComponentSchema {
  collectionName: 'components_sections_courses_sections';
  info: {
    displayName: 'Courses section';
  };
  attributes: {
    courses: Schema.Attribute.Relation<'oneToMany', 'api::course.course'>;
    subtitle: Schema.Attribute.String;
    title: Schema.Attribute.String;
  };
}

export interface SectionsFeaturesSection extends Struct.ComponentSchema {
  collectionName: 'components_sections_features_sections';
  info: {
    displayName: 'Features section';
  };
  attributes: {
    features: Schema.Attribute.Component<'shared.feature', true>;
    subtitle: Schema.Attribute.Text;
    title: Schema.Attribute.String;
  };
}

export interface SharedBanner extends Struct.ComponentSchema {
  collectionName: 'components_shared_banners';
  info: {
    displayName: 'Banner';
  };
  attributes: {
    buttons: Schema.Attribute.Component<'shared.cta', true>;
    subtitle: Schema.Attribute.String;
    title: Schema.Attribute.String;
  };
}

export interface SharedCta extends Struct.ComponentSchema {
  collectionName: 'components_shared_ctas';
  info: {
    displayName: 'CTA';
    icon: 'exit';
  };
  attributes: {
    primary: Schema.Attribute.Boolean;
    title: Schema.Attribute.String;
    URL: Schema.Attribute.String;
  };
}

export interface SharedFeature extends Struct.ComponentSchema {
  collectionName: 'components_sections_features';
  info: {
    displayName: 'Feature';
  };
  attributes: {
    icon: Schema.Attribute.Enumeration<
      [
        'BookOpen',
        'Code',
        'Users',
        'Calendar',
        'Award',
        'GraduationCap',
        'Laptop',
        'Lightbulb',
        'Globe',
        'Star',
        'Rocket',
        'Puzzle',
        'Brain',
        'Server',
        'Terminal',
        'Layers',
        'Shield',
        'Heart',
        'MessageCircle',
        'Monitor',
        'PenTool',
      ]
    >;
    subtitle: Schema.Attribute.String;
    title: Schema.Attribute.String;
  };
}

export interface SharedHeroBanner extends Struct.ComponentSchema {
  collectionName: 'components_shared_hero_banners';
  info: {
    displayName: 'Hero banner';
  };
  attributes: {
    banner: Schema.Attribute.Component<'shared.banner', false>;
    slider: Schema.Attribute.Component<'shared.slider', false>;
  };
}

export interface SharedLinks extends Struct.ComponentSchema {
  collectionName: 'components_shared_links';
  info: {
    displayName: 'Links';
    icon: 'link';
  };
  attributes: {
    description: Schema.Attribute.Text;
    sublinks: Schema.Attribute.Component<'shared.sublinks', true>;
    title: Schema.Attribute.String;
    type: Schema.Attribute.Enumeration<['wrapper', 'internal', 'external']>;
    url: Schema.Attribute.String;
  };
}

export interface SharedMedia extends Struct.ComponentSchema {
  collectionName: 'components_shared_media';
  info: {
    displayName: 'Media';
    icon: 'file-video';
  };
  attributes: {
    file: Schema.Attribute.Media<'images' | 'files' | 'videos'>;
  };
}

export interface SharedQuote extends Struct.ComponentSchema {
  collectionName: 'components_shared_quotes';
  info: {
    displayName: 'Quote';
    icon: 'indent';
  };
  attributes: {
    body: Schema.Attribute.Text;
    title: Schema.Attribute.String;
  };
}

export interface SharedRichText extends Struct.ComponentSchema {
  collectionName: 'components_shared_rich_texts';
  info: {
    description: '';
    displayName: 'Rich text';
    icon: 'align-justify';
  };
  attributes: {
    body: Schema.Attribute.RichText;
  };
}

export interface SharedSeo extends Struct.ComponentSchema {
  collectionName: 'components_shared_seos';
  info: {
    description: '';
    displayName: 'Seo';
    icon: 'allergies';
    name: 'Seo';
  };
  attributes: {
    metaDescription: Schema.Attribute.Text & Schema.Attribute.Required;
    metaTitle: Schema.Attribute.String & Schema.Attribute.Required;
    shareImage: Schema.Attribute.Media<'images'>;
  };
}

export interface SharedSlide extends Struct.ComponentSchema {
  collectionName: 'components_shared_slides';
  info: {
    displayName: 'Slide';
    icon: 'slideshow';
  };
  attributes: {
    image: Schema.Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    subtitle: Schema.Attribute.String;
    title: Schema.Attribute.String;
  };
}

export interface SharedSlider extends Struct.ComponentSchema {
  collectionName: 'components_shared_sliders';
  info: {
    description: '';
    displayName: 'Slider';
    icon: 'address-book';
  };
  attributes: {
    slides: Schema.Attribute.Component<'shared.slide', true>;
  };
}

export interface SharedSublinks extends Struct.ComponentSchema {
  collectionName: 'components_shared_sublinks';
  info: {
    displayName: 'Sublinks';
  };
  attributes: {
    description: Schema.Attribute.Text;
    title: Schema.Attribute.String;
    url: Schema.Attribute.String;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'sections.articles-section': SectionsArticlesSection;
      'sections.courses-section': SectionsCoursesSection;
      'sections.features-section': SectionsFeaturesSection;
      'shared.banner': SharedBanner;
      'shared.cta': SharedCta;
      'shared.feature': SharedFeature;
      'shared.hero-banner': SharedHeroBanner;
      'shared.links': SharedLinks;
      'shared.media': SharedMedia;
      'shared.quote': SharedQuote;
      'shared.rich-text': SharedRichText;
      'shared.seo': SharedSeo;
      'shared.slide': SharedSlide;
      'shared.slider': SharedSlider;
      'shared.sublinks': SharedSublinks;
    }
  }
}
