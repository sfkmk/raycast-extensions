import { formatTime } from "./dateTimeFormatter";

/**
 * Options for formatting content with timestamps, prefixes, and suffixes
 */
export interface ContentFormattingOptions {
  addTimestamp?: boolean;
  timeFormat?: string;
  contentPrefix?: string;
  contentSuffix?: string;
  timestampDate?: Date;
}

/**
 * Result of content formatting operation
 */
export interface FormattedContentResult {
  content: string;
  hasTimestamp: boolean;
  hasPrefix: boolean;
  hasSuffix: boolean;
}

/**
 * Content formatting utility class for consistent content processing
 * across the Craft extension
 */
export class ContentFormatter {
  /**
   * Format content with optional timestamp, prefix, and suffix
   *
   * @param baseContent - The original content to format
   * @param options - Formatting options
   * @returns Formatted content result with metadata
   */
  static format(baseContent: string, options: ContentFormattingOptions = {}): FormattedContentResult {
    const {
      addTimestamp = false,
      timeFormat = "HH:mm:",
      contentPrefix = "",
      contentSuffix = "",
      timestampDate = new Date(),
    } = options;

    if (!baseContent && baseContent !== "") {
      throw new Error("ContentFormatter.format: baseContent cannot be null or undefined");
    }

    let formattedContent = baseContent;
    let hasTimestamp = false;
    let hasPrefix = false;
    let hasSuffix = false;

    // Add timestamp if requested
    if (addTimestamp) {
      const timeString = formatTime(timestampDate, timeFormat);
      formattedContent = `**${timeString}** ${formattedContent}`;
      hasTimestamp = true;
    }

    // Add prefix (after timestamp if present, or at the beginning)
    if (contentPrefix) {
      if (hasTimestamp) {
        // If we have a timestamp, the format is: **timestamp** content
        // We want: **timestamp** prefixcontent
        formattedContent = formattedContent.replace(/(\*\*[^*]+\*\*\s)(.*)/, `$1${contentPrefix}$2`);
      } else {
        formattedContent = `${contentPrefix}${formattedContent}`;
      }
      hasPrefix = true;
    }

    // Add suffix
    if (contentSuffix) {
      formattedContent = `${formattedContent}${contentSuffix}`;
      hasSuffix = true;
    }

    return {
      content: formattedContent,
      hasTimestamp,
      hasPrefix,
      hasSuffix,
    };
  }

  /**
   * Simple content formatting for cases where you only need the formatted string
   *
   * @param baseContent - The original content to format
   * @param options - Formatting options
   * @returns Formatted content string
   */
  static formatSimple(baseContent: string, options: ContentFormattingOptions = {}): string {
    return ContentFormatter.format(baseContent, options).content;
  }

  /**
   * Validate formatting options before processing
   *
   * @param options - Options to validate
   * @returns Validation result with error message if invalid
   */
  static validateOptions(options: ContentFormattingOptions): { isValid: boolean; error?: string } {
    if (options.timeFormat && typeof options.timeFormat !== "string") {
      return { isValid: false, error: "timeFormat must be a string" };
    }

    if (options.contentPrefix && typeof options.contentPrefix !== "string") {
      return { isValid: false, error: "contentPrefix must be a string" };
    }

    if (options.contentSuffix && typeof options.contentSuffix !== "string") {
      return { isValid: false, error: "contentSuffix must be a string" };
    }

    if (options.timestampDate && !(options.timestampDate instanceof Date)) {
      return { isValid: false, error: "timestampDate must be a Date object" };
    }

    if (options.timestampDate && isNaN(options.timestampDate.getTime())) {
      return { isValid: false, error: "timestampDate must be a valid Date" };
    }

    return { isValid: true };
  }

  /**
   * Create formatting options from form values or preferences
   *
   * @param formValues - Form values containing formatting preferences
   * @returns ContentFormattingOptions object
   */
  static createOptionsFromFormValues(formValues: {
    addTimestamp?: boolean;
    timeFormat?: string;
    contentPrefix?: string;
    contentSuffix?: string;
  }): ContentFormattingOptions {
    return {
      addTimestamp: formValues.addTimestamp ?? false,
      timeFormat: formValues.timeFormat || "HH:mm:",
      contentPrefix: formValues.contentPrefix || "",
      contentSuffix: formValues.contentSuffix || "",
      timestampDate: new Date(),
    };
  }
}
