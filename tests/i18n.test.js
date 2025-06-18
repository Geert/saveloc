const path = require('path');
const { JSDOM } = require('jsdom');
const { pathToFileURL } = require('url');

let i18n;

beforeAll(async () => {
  const modPath = pathToFileURL(path.join(__dirname, '..', 'docs', 'i18n.mjs')).href;
  i18n = await import(modPath);
});

test('all languages contain same translation keys', () => {
  const keys = Object.keys(i18n.translations.en);
  for (const lang of ['nl', 'de']) {
    const langKeys = Object.keys(i18n.translations[lang]);
    keys.forEach(k => expect(langKeys).toContain(k));
  }
});

test('getUserLanguage picks supported language', () => {
  const originalNav = global.navigator;
  Object.defineProperty(global, 'navigator', { value: { languages: ['nl-NL', 'en-US'] }, configurable: true, writable: true });
  expect(i18n.getUserLanguage()).toBe('nl');
  Object.defineProperty(global, 'navigator', { value: { languages: ['de-DE'] }, configurable: true, writable: true });
  expect(i18n.getUserLanguage()).toBe('de');
  Object.defineProperty(global, 'navigator', { value: { languages: ['fr-FR'] }, configurable: true, writable: true });
  expect(i18n.getUserLanguage()).toBe('en');
  if (originalNav === undefined) delete global.navigator; else global.navigator = originalNav;
});

test('t returns translated text with variables', () => {
  const originalNav = global.navigator;
  Object.defineProperty(global, 'navigator', { value: { languages: ['de-DE'] }, configurable: true, writable: true });
  i18n.applyTranslations();
  expect(i18n.t('add_location')).toBe(i18n.translations.de.add_location);
  expect(i18n.t('error_getting_current', { error: 'foo' })).toBe(
    i18n.translations.de.error_getting_current.replace('{error}', 'foo')
  );
  if (originalNav === undefined) delete global.navigator; else global.navigator = originalNav;
});
