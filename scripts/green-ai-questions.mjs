// Human-readable acceptance catalog. Each case states the action GrünAI must choose locally.
const themes = [
  ['trees', ['Zeige Bäume', 'Bäume auf der Karte', 'Blende Bäume ein']],
  ['parks', ['Zeige Parks', 'Parks auf der Karte', 'Blende Grünflächen ein']],
  ['play', ['Zeige Spielplätze', 'Spielplätze auf der Karte', 'Blende Spielplätze ein']],
  ['dogs', ['Zeige Hundeauslauf', 'Hundeorte auf der Karte', 'Blende Hundeauslauf ein']],
  ['gardens', ['Zeige Gärten', 'Gärten auf der Karte', 'Blende Naturorte ein']],
  ['cemeteries', ['Zeige Friedhöfe', 'Friedhöfe auf der Karte', 'Blende Friedhöfe ein']],
  ['botanical', ['Zeige Botanischer Garten', 'Botanische Orte auf der Karte', 'Blende botanische Gärten ein']],
  ['water', ['Zeige Brunnen', 'Brunnen auf der Karte', 'Blende Wasser ein']],
];
export const questions = [
  ...themes.flatMap(([theme, prompts]) => prompts.map((text) => ({ text, type: 'show_theme', theme }))),
  ...[
    ['Wie viele Bäume sehe ich?', 'trees'], ['Wie viele Parks sehe ich?', 'parks'],
    ['Wie viele Spielplätze sehe ich?', 'play'], ['Wie viele Brunnen sehe ich?', 'water'],
    ['Wie viele Gärten sehe ich?', 'gardens'], ['Wie viele Friedhöfe sehe ich?', 'cemeteries'],
    ['Wie viele Hundeorte sehe ich?', 'dogs'], ['Wie viele Bäume gibt es im Datensatz?', 'trees'],
  ].map(([text, theme]) => ({ text, type: 'count_features', theme })),
  ...[
    ['Welche Bäume sehe ich?', 'trees'], ['Welche Parks sehe ich?', 'parks'],
    ['Welche Spielplätze sehe ich?', 'play'], ['Welche Brunnen sehe ich?', 'water'],
    ['Welche Gärten sehe ich?', 'gardens'], ['Welche Friedhöfe sehe ich?', 'cemeteries'],
    ['Liste Bäume auf', 'trees'], ['Nenne Spielplätze', 'play'],
  ].map(([text, theme]) => ({ text, type: 'list_features', theme })),
  ...[
    ['Die ältesten Bäume hier', 'planting_year'], ['Zeige die ältesten Bäume', 'planting_year'],
    ['Die größten Bäume hier', 'height'], ['Zeige die höchsten Bäume', 'height'],
    ['Die dicksten Bäume hier', 'trunk'], ['Bäume mit der größten Krone', 'crown'],
  ].map(([text, metric]) => ({ text, type: 'rank_trees', metric })),
  ...[
    ['Spielplätze in Ehrenfeld', 'play'], ['Zeige Parks in Ehrenfeld', 'parks'],
    ['Wie viele Bäume in Ehrenfeld?', 'trees'], ['Welche Brunnen in Ehrenfeld?', 'water'],
    ['Gärten in Nippes', 'gardens'], ['Friedhöfe in Mülheim', 'cemeteries'],
  ].map(([text, theme]) => ({ text, theme, district: true })),
  { text: 'Welcher Stadtteil hat die meisten Bäume?', type: 'rank_districts' },
  { text: 'Welche Stadtteile haben die meisten Bäume?', type: 'rank_districts' },
  { text: 'Brunnen in der Nähe vom Melatenfriedhof', type: 'find_nearby', origin: 'object' },
  { text: 'Welche Spielplätze sind in meiner Nähe?', type: 'find_nearby', origin: 'user' },
  { text: 'Brunnen 500 Meter von diesem Punkt entfernt', type: 'find_nearby', origin: 'selected' },
  { text: 'Zeige Bäume und Meldungen', types: ['show_theme', 'show_reports'] },
  { text: 'Blende Meldungen und Bäume ein', types: ['show_theme', 'show_reports'] },
];
