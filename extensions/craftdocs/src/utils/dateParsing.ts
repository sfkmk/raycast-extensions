import * as chrono from "chrono-node";
import { de, es, fr } from "chrono-node";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const CRAFT_DATE_RE = /^\d{4}\.\d{2}\.\d{2}$/;
const DATE_SIGNAL_RE =
  /\b(today|tomorrow|yesterday|tonight|next|last|this|monday|tuesday|wednesday|thursday|friday|saturday|sunday|jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december|heute|morgen|gestern|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|januar|februar|maerz|märz|mai|juni|juli|oktober|dezember|aujourd|demain|hier|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|janvier|fevrier|février|mars|avril|juin|juillet|aout|août|septembre|octobre|novembre|decembre|décembre|hoy|manana|mañana|ayer|lunes|martes|miercoles|miércoles|jueves|viernes|sabado|sábado|domingo|enero|febrero|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/i;
const NUMERIC_DATE_RE = /\d{1,4}[./-]\d{1,2}([./-]\d{1,4})?/;

type DateParsingOptions = {
  supportedLanguages?: string[];
  referenceDate?: Date;
  forwardDate?: boolean;
};

type ChronoParser = {
  parse: typeof chrono.parse;
};

const parseKnownDateFormats = (text: string): Date | undefined => {
  if (ISO_DATE_RE.test(text)) {
    const [year, month, day] = text.split("-").map(Number);
    const parsed = new Date(year, month - 1, day);

    return isSameDateParts(parsed, year, month, day) ? parsed : undefined;
  }

  if (CRAFT_DATE_RE.test(text)) {
    const [year, month, day] = text.split(".").map(Number);
    const parsed = new Date(year, month - 1, day);

    return isSameDateParts(parsed, year, month, day) ? parsed : undefined;
  }

  const mmddyyyy = /^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$/;
  if (mmddyyyy.test(text)) {
    const parsed = new Date(text);

    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  return undefined;
};

export const parseNaturalDateInput = (text: string, options: DateParsingOptions = {}): Date | undefined => {
  const trimmed = text.trim();

  if (!trimmed) {
    return undefined;
  }

  const knownDate = parseKnownDateFormats(trimmed);
  if (knownDate) {
    return knownDate;
  }

  if (!DATE_SIGNAL_RE.test(trimmed) && !NUMERIC_DATE_RE.test(trimmed)) {
    return undefined;
  }

  const results = parseWithSupportedLanguages(trimmed, {
    referenceDate: options.referenceDate ?? new Date(),
    forwardDate: options.forwardDate ?? false,
    supportedLanguages: options.supportedLanguages ?? ["en"],
  });
  const exactEnoughResult = results.find((result) => result.index === 0 && result.text.length >= trimmed.length * 0.6);
  const chronoDate = exactEnoughResult?.start.date();

  return chronoDate && !Number.isNaN(chronoDate.getTime()) ? chronoDate : undefined;
};

export const isDateParseable = (text: string): boolean => parseNaturalDateInput(text) !== undefined;

const isSameDateParts = (date: Date, year: number, month: number, day: number) =>
  !Number.isNaN(date.getTime()) &&
  date.getFullYear() === year &&
  date.getMonth() === month - 1 &&
  date.getDate() === day;

const parseWithSupportedLanguages = (
  text: string,
  {
    supportedLanguages,
    referenceDate,
    forwardDate,
  }: Required<Pick<DateParsingOptions, "supportedLanguages" | "referenceDate" | "forwardDate">>,
): chrono.ParsedResult[] => {
  const languages = normalizeSupportedLanguages(supportedLanguages);
  const parserByLanguage: Record<string, ChronoParser> = { en: chrono, de, fr, es };

  for (const language of languages) {
    const parser = parserByLanguage[language] || chrono;
    const results = parser.parse(text, referenceDate, { forwardDate });

    if (results.length > 0) {
      return results;
    }
  }

  return [];
};

export const normalizeSupportedLanguages = (value: string[] | string | undefined): string[] => {
  const languages = (Array.isArray(value) ? value : (value || "en").split(","))
    .map((language) => language.trim().toLowerCase())
    .filter(Boolean)
    .map((language) => language.split("-")[0]);

  return [...new Set(["en", ...languages])];
};
