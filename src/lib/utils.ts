import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface ParsedEmail {
  name: string;
  email: string;
}

/**
 * Parses email addresses and extracts name and email separately
 * Handles formats like:
 * - "Name" <email@domain.com>
 * - email@domain.com
 * - Name <email@domain.com>
 * - Multiple emails separated by commas
 */
export function parseEmailAddresses(emailString: string): ParsedEmail[] {
  const emailRegex = /([^<,]+<[^>]+>|[^,\s]+@[^,\s]+)/g;
  const matches = emailString.match(emailRegex) || [];
  
  return matches.map(match => {
    const nameMatch = match.match(/^([^<]+)<([^>]+)>$/);
    if (nameMatch) {
      return {
        name: nameMatch[1].trim(),
        email: nameMatch[2].trim()
      };
    } else {
      return {
        name: '',
        email: match.trim()
      };
    }
  });
}

/**
 * Formats a single email address for display
 */
export function formatEmailDisplay(parsedEmail: ParsedEmail): string {
  if (parsedEmail.name && parsedEmail.email) {
    return `${parsedEmail.name} <${parsedEmail.email}>`;
  } else if (parsedEmail.email) {
    return parsedEmail.email;
  } else if (parsedEmail.name) {
    return parsedEmail.name;
  }
  return '';
}

/**
 * Formats multiple email addresses for display
 */
export function formatEmailList(emails: ParsedEmail[]): string {
  return emails.map(formatEmailDisplay).join(', ');
}

// Convert HTML to plain text
export function htmlToPlainText(html: string): string {
  if (!html) return '';
  
  // Create a temporary div to parse HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // Get text content and normalize whitespace
  let text = tempDiv.textContent || tempDiv.innerText || '';
  
  // Clean up the text
  text = text
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/\n\s*\n/g, '\n\n') // Replace multiple newlines with double newlines
    .trim();
  
  return text;
}

// Check if content is HTML
export function isHtmlContent(content: string): boolean {
  if (!content) return false;
  
  // Simple check for HTML tags
  const htmlRegex = /<[^>]*>/;
  return htmlRegex.test(content);
}

// Safely render HTML content with fallback to plain text
export function renderEmailContent(content: string, preferPlainText: boolean = false): string {
  if (!content) return '';
  
  if (preferPlainText || !isHtmlContent(content)) {
    return htmlToPlainText(content);
  }
  
  return content;
}
