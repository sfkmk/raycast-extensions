import { LanguageConfig } from "./types";

/**
 * Language configurations for multilingual date parsing
 *
 * Each configuration includes patterns for detecting past/future references,
 * month name mappings, and integration with chrono-node parsing library.
 */

// English language configuration
const englishConfig: LanguageConfig = {
  code: "en",
  name: "English",
  chronoSupport: true,
  pastReferences: {
    pastWords: ["last", "previous", "past", "ago", "yesterday", "earlier", "before"],
    pastTimePatterns: [
      /\b(last|previous)\s+(week|month|year|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
      /\b(yesterday|last\s+night)\b/i,
      /\b\d+\s+(days?|weeks?|months?|years?)\s+ago\b/i,
    ],
    generalPastPatterns: [/\b(last|previous|past|ago|yesterday|earlier)\s/i],
  },
  futureReferences: {
    futureWords: ["next", "coming", "upcoming", "tomorrow", "later", "future", "following"],
    futureTimePatterns: [
      /\b(next|coming|upcoming)\s+(week|month|year|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
      /\b(tomorrow|next\s+week)\b/i,
      /\bin\s+\d+\s+(days?|weeks?|months?|years?)\b/i,
    ],
    generalFuturePatterns: [/\b(next|coming|upcoming|tomorrow|later|future)\s/i],
  },
  months: {
    fullNames: {
      january: 0,
      february: 1,
      march: 2,
      april: 3,
      may: 4,
      june: 5,
      july: 6,
      august: 7,
      september: 8,
      october: 9,
      november: 10,
      december: 11,
    },
    abbreviations: {
      jan: 0,
      feb: 1,
      mar: 2,
      apr: 3,
      may: 4,
      jun: 5,
      jul: 6,
      aug: 7,
      sep: 8,
      oct: 9,
      nov: 10,
      dec: 11,
    },
  },
};

// German language configuration
const germanConfig: LanguageConfig = {
  code: "de",
  name: "German",
  chronoSupport: true,
  chronoLocale: "de",
  pastReferences: {
    pastWords: [
      "letzten",
      "letzter",
      "letzte",
      "vorigen",
      "voriger",
      "vorige",
      "vergangenen",
      "vergangener",
      "vergangene",
      "gestern",
      "früher",
    ],
    pastTimePatterns: [
      /\b(letzten?|vorige[nrs]?|vergangene[nrs]?)\s+(woche|monat|jahr|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)\b/i,
      /\b(gestern|letzte\s+nacht)\b/i,
      /\bvor\s+\d+\s+(tagen?|wochen?|monaten?|jahren?)\b/i,
    ],
    generalPastPatterns: [/\b(letzten?|vorige[nrs]?|vergangene[nrs]?|gestern|früher)\s/i],
  },
  futureReferences: {
    futureWords: [
      "nächsten",
      "nächster",
      "nächste",
      "kommenden",
      "kommender",
      "kommende",
      "morgen",
      "später",
      "zukünftig",
    ],
    futureTimePatterns: [
      /\b(nächsten?|kommende[nrs]?)\s+(woche|monat|jahr|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)\b/i,
      /\b(morgen|nächste\s+woche)\b/i,
      /\bin\s+\d+\s+(tagen?|wochen?|monaten?|jahren?)\b/i,
    ],
    generalFuturePatterns: [/\b(nächsten?|kommende[nrs]?|morgen|später|zukünftig)\s/i],
  },
  months: {
    fullNames: {
      januar: 0,
      februar: 1,
      märz: 2,
      april: 3,
      mai: 4,
      juni: 5,
      juli: 6,
      august: 7,
      september: 8,
      oktober: 9,
      november: 10,
      dezember: 11,
    },
    abbreviations: {
      jan: 0,
      feb: 1,
      mär: 2,
      apr: 3,
      mai: 4,
      jun: 5,
      jul: 6,
      aug: 7,
      sep: 8,
      okt: 9,
      nov: 10,
      dez: 11,
    },
  },
};

// French language configuration
const frenchConfig: LanguageConfig = {
  code: "fr",
  name: "French",
  chronoSupport: true,
  chronoLocale: "fr",
  pastReferences: {
    pastWords: ["dernier", "dernière", "passé", "passée", "hier", "précédent", "précédente", "avant"],
    pastTimePatterns: [
      /\b(dernier|dernière|passé|passée|précédent|précédente)\s+(semaine|mois|année|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b/i,
      /\b(hier|dernière\s+nuit)\b/i,
      /\bil\s+y\s+a\s+\d+\s+(jours?|semaines?|mois|années?)\b/i,
    ],
    generalPastPatterns: [/\b(dernier|dernière|passé|passée|hier|précédent|précédente)\s/i],
  },
  futureReferences: {
    futureWords: ["prochain", "prochaine", "suivant", "suivante", "demain", "futur", "future"],
    futureTimePatterns: [
      /\b(prochain|prochaine|suivant|suivante)\s+(semaine|mois|année|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b/i,
      /\b(demain|prochaine\s+semaine)\b/i,
      /\bdans\s+\d+\s+(jours?|semaines?|mois|années?)\b/i,
    ],
    generalFuturePatterns: [/\b(prochain|prochaine|suivant|suivante|demain|futur|future)\s/i],
  },
  months: {
    fullNames: {
      janvier: 0,
      février: 1,
      mars: 2,
      avril: 3,
      mai: 4,
      juin: 5,
      juillet: 6,
      août: 7,
      septembre: 8,
      octobre: 9,
      novembre: 10,
      décembre: 11,
    },
    abbreviations: {
      jan: 0,
      fév: 1,
      mar: 2,
      avr: 3,
      mai: 4,
      jun: 5,
      jul: 6,
      aoû: 7,
      sep: 8,
      oct: 9,
      nov: 10,
      déc: 11,
    },
  },
};

// Spanish language configuration
const spanishConfig: LanguageConfig = {
  code: "es",
  name: "Spanish",
  chronoSupport: true,
  chronoLocale: "es",
  pastReferences: {
    pastWords: ["pasado", "pasada", "anterior", "ayer", "último", "última", "antes"],
    pastTimePatterns: [
      /\b(pasado|pasada|último|última|anterior)\s+(semana|mes|año|lunes|martes|miércoles|jueves|viernes|sábado|domingo)\b/i,
      /\b(ayer|anoche)\b/i,
      /\bhace\s+\d+\s+(días?|semanas?|meses|años?)\b/i,
    ],
    generalPastPatterns: [/\b(pasado|pasada|anterior|ayer|último|última)\s/i],
  },
  futureReferences: {
    futureWords: ["próximo", "próxima", "siguiente", "mañana", "futuro", "futura"],
    futureTimePatterns: [
      /\b(próximo|próxima|siguiente)\s+(semana|mes|año|lunes|martes|miércoles|jueves|viernes|sábado|domingo)\b/i,
      /\b(mañana|próxima\s+semana)\b/i,
      /\ben\s+\d+\s+(días?|semanas?|meses|años?)\b/i,
    ],
    generalFuturePatterns: [/\b(próximo|próxima|siguiente|mañana|futuro|futura)\s/i],
  },
  months: {
    fullNames: {
      enero: 0,
      febrero: 1,
      marzo: 2,
      abril: 3,
      mayo: 4,
      junio: 5,
      julio: 6,
      agosto: 7,
      septiembre: 8,
      octubre: 9,
      noviembre: 10,
      diciembre: 11,
    },
    abbreviations: {
      ene: 0,
      feb: 1,
      mar: 2,
      abr: 3,
      may: 4,
      jun: 5,
      jul: 6,
      ago: 7,
      sep: 8,
      oct: 9,
      nov: 10,
      dic: 11,
    },
  },
};

// Italian language configuration
const italianConfig: LanguageConfig = {
  code: "it",
  name: "Italian",
  chronoSupport: true,
  chronoLocale: "it",
  pastReferences: {
    pastWords: ["scorso", "scorsa", "passato", "passata", "ieri", "precedente"],
    pastTimePatterns: [
      /\b(scorso|scorsa|passato|passata|precedente)\s+(settimana|mese|anno|lunedì|martedì|mercoledì|giovedì|venerdì|sabato|domenica)\b/i,
      /\b(ieri|ieri\s+sera)\b/i,
      /\b\d+\s+(giorni?|settimane?|mesi|anni?)\s+fa\b/i,
    ],
    generalPastPatterns: [/\b(scorso|scorsa|passato|passata|ieri|precedente)\s/i],
  },
  futureReferences: {
    futureWords: ["prossimo", "prossima", "seguente", "domani", "futuro", "futura"],
    futureTimePatterns: [
      /\b(prossimo|prossima|seguente)\s+(settimana|mese|anno|lunedì|martedì|mercoledì|giovedì|venerdì|sabato|domenica)\b/i,
      /\b(domani|prossima\s+settimana)\b/i,
      /\btra\s+\d+\s+(giorni?|settimane?|mesi|anni?)\b/i,
    ],
    generalFuturePatterns: [/\b(prossimo|prossima|seguente|domani|futuro|futura)\s/i],
  },
  months: {
    fullNames: {
      gennaio: 0,
      febbraio: 1,
      marzo: 2,
      aprile: 3,
      maggio: 4,
      giugno: 5,
      luglio: 6,
      agosto: 7,
      settembre: 8,
      ottobre: 9,
      novembre: 10,
      dicembre: 11,
    },
    abbreviations: {
      gen: 0,
      feb: 1,
      mar: 2,
      apr: 3,
      mag: 4,
      giu: 5,
      lug: 6,
      ago: 7,
      set: 8,
      ott: 9,
      nov: 10,
      dic: 11,
    },
  },
};

// Portuguese language configuration
const portugueseConfig: LanguageConfig = {
  code: "pt",
  name: "Portuguese",
  chronoSupport: true,
  chronoLocale: "pt",
  pastReferences: {
    pastWords: ["passado", "passada", "último", "última", "ontem", "anterior"],
    pastTimePatterns: [
      /\b(passado|passada|último|última|anterior)\s+(semana|mês|ano|segunda|terça|quarta|quinta|sexta|sábado|domingo)\b/i,
      /\b(ontem|ontem\s+à\s+noite)\b/i,
      /\bhá\s+\d+\s+(dias?|semanas?|meses|anos?)\b/i,
    ],
    generalPastPatterns: [/\b(passado|passada|último|última|ontem|anterior)\s/i],
  },
  futureReferences: {
    futureWords: ["próximo", "próxima", "seguinte", "amanhã", "futuro", "futura"],
    futureTimePatterns: [
      /\b(próximo|próxima|seguinte)\s+(semana|mês|ano|segunda|terça|quarta|quinta|sexta|sábado|domingo)\b/i,
      /\b(amanhã|próxima\s+semana)\b/i,
      /\bem\s+\d+\s+(dias?|semanas?|meses|anos?)\b/i,
    ],
    generalFuturePatterns: [/\b(próximo|próxima|seguinte|amanhã|futuro|futura)\s/i],
  },
  months: {
    fullNames: {
      janeiro: 0,
      fevereiro: 1,
      março: 2,
      abril: 3,
      maio: 4,
      junho: 5,
      julho: 6,
      agosto: 7,
      setembro: 8,
      outubro: 9,
      novembro: 10,
      dezembro: 11,
    },
    abbreviations: {
      jan: 0,
      fev: 1,
      mar: 2,
      abr: 3,
      mai: 4,
      jun: 5,
      jul: 6,
      ago: 7,
      set: 8,
      out: 9,
      nov: 10,
      dez: 11,
    },
  },
};

// Dutch language configuration
const dutchConfig: LanguageConfig = {
  code: "nl",
  name: "Dutch",
  chronoSupport: true,
  chronoLocale: "nl",
  pastReferences: {
    pastWords: ["vorige", "laatste", "afgelopen", "gisteren", "eerder"],
    pastTimePatterns: [
      /\b(vorige|laatste|afgelopen)\s+(week|maand|jaar|maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag)\b/i,
      /\b(gisteren|gisteravond)\b/i,
      /\b\d+\s+(dagen?|weken?|maanden?|jaren?)\s+geleden\b/i,
    ],
    generalPastPatterns: [/\b(vorige|laatste|afgelopen|gisteren|eerder)\s/i],
  },
  futureReferences: {
    futureWords: ["volgende", "komende", "morgen", "later", "toekomst"],
    futureTimePatterns: [
      /\b(volgende|komende)\s+(week|maand|jaar|maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag)\b/i,
      /\b(morgen|volgende\s+week)\b/i,
      /\bover\s+\d+\s+(dagen?|weken?|maanden?|jaren?)\b/i,
    ],
    generalFuturePatterns: [/\b(volgende|komende|morgen|later|toekomst)\s/i],
  },
  months: {
    fullNames: {
      januari: 0,
      februari: 1,
      maart: 2,
      april: 3,
      mei: 4,
      juni: 5,
      juli: 6,
      augustus: 7,
      september: 8,
      oktober: 9,
      november: 10,
      december: 11,
    },
    abbreviations: {
      jan: 0,
      feb: 1,
      mrt: 2,
      apr: 3,
      mei: 4,
      jun: 5,
      jul: 6,
      aug: 7,
      sep: 8,
      okt: 9,
      nov: 10,
      dec: 11,
    },
  },
};

// Russian language configuration
const russianConfig: LanguageConfig = {
  code: "ru",
  name: "Russian",
  chronoSupport: true,
  chronoLocale: "ru",
  pastReferences: {
    pastWords: ["прошлый", "прошлая", "прошлое", "последний", "последняя", "вчера", "ранее"],
    pastTimePatterns: [
      /\b(прошлый|прошлая|прошлое|последний|последняя)\s+(неделя|месяц|год|понедельник|вторник|среда|четверг|пятница|суббота|воскресенье)\b/i,
      /\b(вчера|вчера\s+вечером)\b/i,
      /\b\d+\s+(дней?|недель?|месяцев?|лет?)\s+назад\b/i,
    ],
    generalPastPatterns: [/\b(прошлый|прошлая|прошлое|последний|последняя|вчера|ранее)\s/i],
  },
  futureReferences: {
    futureWords: ["следующий", "следующая", "следующее", "завтра", "будущий", "будущая"],
    futureTimePatterns: [
      /\b(следующий|следующая|следующее|будущий|будущая)\s+(неделя|месяц|год|понедельник|вторник|среда|четверг|пятница|суббота|воскресенье)\b/i,
      /\b(завтра|следующая\s+неделя)\b/i,
      /\bчерез\s+\d+\s+(дней?|недель?|месяцев?|лет?)\b/i,
    ],
    generalFuturePatterns: [/\b(следующий|следующая|следующее|завтра|будущий|будущая)\s/i],
  },
  months: {
    fullNames: {
      январь: 0,
      февраль: 1,
      март: 2,
      апрель: 3,
      май: 4,
      июнь: 5,
      июль: 6,
      август: 7,
      сентябрь: 8,
      октябрь: 9,
      ноябрь: 10,
      декабрь: 11,
    },
    abbreviations: {
      янв: 0,
      фев: 1,
      мар: 2,
      апр: 3,
      май: 4,
      июн: 5,
      июл: 6,
      авг: 7,
      сен: 8,
      окт: 9,
      ноя: 10,
      дек: 11,
    },
  },
};

// Japanese language configuration
const japaneseConfig: LanguageConfig = {
  code: "ja",
  name: "Japanese",
  chronoSupport: true,
  chronoLocale: "ja",
  pastReferences: {
    pastWords: ["先", "昨", "前", "去年", "昨日", "以前"],
    pastTimePatterns: [
      /\b(先|昨|前|去年)\s*(週|月|年|月曜|火曜|水曜|木曜|金曜|土曜|日曜)\b/i,
      /\b(昨日|昨夜)\b/i,
      /\b\d+\s*(日|週間|ヶ月|年)\s*前\b/i,
    ],
    generalPastPatterns: [/\b(先|昨|前|去年|昨日|以前)\s/i],
  },
  futureReferences: {
    futureWords: ["来", "次", "明日", "今度", "将来"],
    futureTimePatterns: [
      /\b(来|次|今度)\s*(週|月|年|月曜|火曜|水曜|木曜|金曜|土曜|日曜)\b/i,
      /\b(明日|来週)\b/i,
      /\b\d+\s*(日|週間|ヶ月|年)\s*後\b/i,
    ],
    generalFuturePatterns: [/\b(来|次|明日|今度|将来)\s/i],
  },
  months: {
    fullNames: {
      一月: 0,
      二月: 1,
      三月: 2,
      四月: 3,
      五月: 4,
      六月: 5,
      七月: 6,
      八月: 7,
      九月: 8,
      十月: 9,
      十一月: 10,
      十二月: 11,
    },
    abbreviations: {
      "1月": 0,
      "2月": 1,
      "3月": 2,
      "4月": 3,
      "5月": 4,
      "6月": 5,
      "7月": 6,
      "8月": 7,
      "9月": 8,
      "10月": 9,
      "11月": 10,
      "12月": 11,
    },
  },
};

// Korean language configuration
const koreanConfig: LanguageConfig = {
  code: "ko",
  name: "Korean",
  chronoSupport: true,
  chronoLocale: "ko",
  pastReferences: {
    pastWords: ["지난", "작년", "어제", "이전"],
    pastTimePatterns: [
      /\b(지난|작년|이전)\s*(주|달|년|월요일|화요일|수요일|목요일|금요일|토요일|일요일)\b/i,
      /\b(어제|어젯밤)\b/i,
      /\b\d+\s*(일|주|달|년)\s*전\b/i,
    ],
    generalPastPatterns: [/\b(지난|작년|어제|이전)\s/i],
  },
  futureReferences: {
    futureWords: ["다음", "내년", "내일", "앞으로", "미래"],
    futureTimePatterns: [
      /\b(다음|내년|앞으로)\s*(주|달|년|월요일|화요일|수요일|목요일|금요일|토요일|일요일)\b/i,
      /\b(내일|다음주)\b/i,
      /\b\d+\s*(일|주|달|년)\s*후\b/i,
    ],
    generalFuturePatterns: [/\b(다음|내년|내일|앞으로|미래)\s/i],
  },
  months: {
    fullNames: {
      일월: 0,
      이월: 1,
      삼월: 2,
      사월: 3,
      오월: 4,
      유월: 5,
      칠월: 6,
      팔월: 7,
      구월: 8,
      시월: 9,
      십일월: 10,
      십이월: 11,
    },
    abbreviations: {
      "1월": 0,
      "2월": 1,
      "3월": 2,
      "4월": 3,
      "5월": 4,
      "6월": 5,
      "7월": 6,
      "8월": 7,
      "9월": 8,
      "10월": 9,
      "11월": 10,
      "12월": 11,
    },
  },
};

// Chinese language configuration
const chineseConfig: LanguageConfig = {
  code: "zh",
  name: "Chinese",
  chronoSupport: true,
  chronoLocale: "zh",
  pastReferences: {
    pastWords: ["上", "去年", "昨天", "以前", "之前"],
    pastTimePatterns: [
      /\b(上|去年|以前)\s*(周|月|年|星期一|星期二|星期三|星期四|星期五|星期六|星期日)\b/i,
      /\b(昨天|昨晚)\b/i,
      /\b\d+\s*(天|周|月|年)\s*前\b/i,
    ],
    generalPastPatterns: [/\b(上|去年|昨天|以前|之前)\s/i],
  },
  futureReferences: {
    futureWords: ["下", "明年", "明天", "以后", "将来"],
    futureTimePatterns: [
      /\b(下|明年|以后)\s*(周|月|年|星期一|星期二|星期三|星期四|星期五|星期六|星期日)\b/i,
      /\b(明天|下周)\b/i,
      /\b\d+\s*(天|周|月|年)\s*后\b/i,
    ],
    generalFuturePatterns: [/\b(下|明年|明天|以后|将来)\s/i],
  },
  months: {
    fullNames: {
      一月: 0,
      二月: 1,
      三月: 2,
      四月: 3,
      五月: 4,
      六月: 5,
      七月: 6,
      八月: 7,
      九月: 8,
      十月: 9,
      十一月: 10,
      十二月: 11,
    },
    abbreviations: {
      "1月": 0,
      "2月": 1,
      "3月": 2,
      "4月": 3,
      "5月": 4,
      "6月": 5,
      "7月": 6,
      "8月": 7,
      "9月": 8,
      "10月": 9,
      "11月": 10,
      "12月": 11,
    },
  },
};

// Basic configurations for languages with limited chrono support
const createBasicConfig = (code: string, name: string, chronoSupport = false): LanguageConfig => ({
  code,
  name,
  chronoSupport,
  pastReferences: {
    pastWords: [],
    pastTimePatterns: [],
    generalPastPatterns: [],
  },
  futureReferences: {
    futureWords: [],
    futureTimePatterns: [],
    generalFuturePatterns: [],
  },
  months: {
    fullNames: {},
    abbreviations: {},
  },
});

// Export all language configurations
export const LANGUAGE_CONFIGS: Record<string, LanguageConfig> = {
  en: englishConfig,
  de: germanConfig,
  fr: frenchConfig,
  es: spanishConfig,
  it: italianConfig,
  pt: portugueseConfig,
  nl: dutchConfig,
  ru: russianConfig,
  ja: japaneseConfig,
  ko: koreanConfig,
  zh: chineseConfig,

  // Basic configurations for additional languages
  bn: createBasicConfig("bn", "Bengali"),
  cs: createBasicConfig("cs", "Czech"),
  da: createBasicConfig("da", "Danish"),
  el: createBasicConfig("el", "Greek"),
  fi: createBasicConfig("fi", "Finnish"),
  hi: createBasicConfig("hi", "Hindi"),
  hu: createBasicConfig("hu", "Hungarian"),
  id: createBasicConfig("id", "Indonesian"),
  no: createBasicConfig("no", "Norwegian"),
  pl: createBasicConfig("pl", "Polish"),
  ro: createBasicConfig("ro", "Romanian"),
  sk: createBasicConfig("sk", "Slovak"),
  sv: createBasicConfig("sv", "Swedish"),
  ta: createBasicConfig("ta", "Tamil"),
  th: createBasicConfig("th", "Thai"),
  tr: createBasicConfig("tr", "Turkish"),
};

// Combine all month mappings for fallback parsing
export const ALL_MONTH_MAPPINGS: Record<string, number> = Object.values(LANGUAGE_CONFIGS).reduce((acc, config) => {
  return {
    ...acc,
    ...config.months.fullNames,
    ...config.months.abbreviations,
  };
}, {});

/**
 * Get language configuration by language code
 */
export function getLanguageConfig(languageCode: string): LanguageConfig | null {
  return LANGUAGE_CONFIGS[languageCode] || null;
}

/**
 * Get all supported language codes
 */
export function getSupportedLanguages(): string[] {
  return Object.keys(LANGUAGE_CONFIGS);
}

/**
 * Check if a language has chrono-node support
 */
export function hasChronoSupport(languageCode: string): boolean {
  const config = getLanguageConfig(languageCode);
  return config?.chronoSupport || false;
}
