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
  if (!emailString || typeof emailString !== 'string') {
    return [];
  }

  // Split by comma and trim whitespace
  const emailParts = emailString.split(',').map(part => part.trim()).filter(Boolean);
  
  return emailParts.map(part => {
    // Pattern to match "Name" <email@domain.com> or Name <email@domain.com>
    const quotedPattern = /^"?([^"<]+)"?\s*<([^>]+)>$/;
    // Pattern to match just email@domain.com
    const emailOnlyPattern = /^([^<>\s]+@[^<>\s]+)$/;
    
    let match = part.match(quotedPattern);
    if (match) {
      return {
        name: match[1].trim(),
        email: match[2].trim()
      };
    }
    
    match = part.match(emailOnlyPattern);
    if (match) {
      return {
        name: '',
        email: match[1].trim()
      };
    }
    
    // Fallback: treat as email if it contains @, otherwise as name
    if (part.includes('@')) {
      return {
        name: '',
        email: part.trim()
      };
    }
    
    return {
      name: part.trim(),
      email: ''
    };
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
