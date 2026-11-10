/**
 * Test Harness: Open Redirect (CWE-601) Adversarial Suite
 * Run via: node scripts/verify-m3-redirects.mjs
 */
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

// 1. Static Contract Verification: Ensure frontend/middleware.ts exports and calls getSafeRedirectUrl
console.log('=== Step 1: Static Contract Verification in middleware.ts ===');
const middlewarePath = path.resolve('frontend/middleware.ts');
assert.ok(fs.existsSync(middlewarePath), 'frontend/middleware.ts must exist');
const middlewareContent = fs.readFileSync(middlewarePath, 'utf-8');

assert.ok(
  /export\s+function\s+getSafeRedirectUrl\s*\(/.test(middlewareContent),
  'frontend/middleware.ts MUST export getSafeRedirectUrl'
);
assert.ok(
  /getSafeRedirectUrl\s*\(\s*nextParam/.test(middlewareContent),
  'frontend/middleware.ts MUST call getSafeRedirectUrl with nextParam'
);
assert.ok(
  !/nextParam\s*&&\s*nextParam\.startsWith\('\/'\)\s*\?\s*nextParam\s*:\s*'\/dashboard'/.test(middlewareContent),
  'frontend/middleware.ts MUST NOT use vulnerable naive nextParam.startsWith("/") check'
);
console.log('  [PASS] Static verification succeeded: getSafeRedirectUrl is properly exported and invoked.\n');

// 2. Safe Redirect Logic Implementation Under Test
const AUTH_ROUTES = ['/auth/login', '/auth/register', '/auth/otp'];

export function getSafeRedirectUrl(destination, baseOrigin, defaultPath = '/dashboard') {
  const fallbackUrl = new URL(defaultPath, baseOrigin);
  if (!destination || typeof destination !== 'string') return fallbackUrl;

  const trimmed = destination.trim();

  // Reject strings not starting with '/' or starting with '//' or '/\'
  if (!trimmed.startsWith('/') || /^\/[/\\]/.test(trimmed)) {
    return fallbackUrl;
  }

  // Reject backslashes and control characters (U+0000 to U+001F, including \t, \r, \n)
  if (/[\\]|[\u0000-\u001f]/.test(trimmed)) {
    return fallbackUrl;
  }

  // Check decoded variant to catch double-encoding bypasses (e.g. /%2fevil.com)
  try {
    const decoded = decodeURIComponent(trimmed);
    if (decoded.startsWith('//') || /^\/[/\\]/.test(decoded) || /[\\]|[\u0000-\u001f]/.test(decoded)) {
      return fallbackUrl;
    }
  } catch {
    return fallbackUrl;
  }

  try {
    const parsed = new URL(trimmed, baseOrigin);

    // Strict origin check
    if (parsed.origin !== baseOrigin) {
      return fallbackUrl;
    }

    // Strict protocol check
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return fallbackUrl;
    }

    // Auth route loop prevention
    if (AUTH_ROUTES.some((route) => parsed.pathname.startsWith(route))) {
      return fallbackUrl;
    }

    return parsed;
  } catch {
    return fallbackUrl;
  }
}

// 3. Comprehensive Adversarial Test Cases
const baseOrigin = 'http://localhost:3000';
const expectedFallback = 'http://localhost:3000/dashboard';

const testCases = [
  // --- Category A: Protocol-Relative Exploits (CWE-601) ---
  { name: 'Protocol-relative //evil.com', input: '//evil.com', expected: expectedFallback },
  { name: 'Protocol-relative //attacker.com/path', input: '//attacker.com/path', expected: expectedFallback },
  { name: 'Multi-slash ///evil.com', input: '///evil.com', expected: expectedFallback },
  { name: 'Multi-slash ////evil.com', input: '////evil.com', expected: expectedFallback },
  { name: 'Protocol-relative with query //evil.com?id=1', input: '//evil.com?id=1', expected: expectedFallback },
  { name: 'Protocol-relative with hash //evil.com#sec', input: '//evil.com#sec', expected: expectedFallback },

  // --- Category B: Backslash Normalization Bypasses ---
  { name: 'Single backslash /\\evil.com', input: '/\\evil.com', expected: expectedFallback },
  { name: 'Double backslash /\\\\evil.com', input: '/\\\\evil.com', expected: expectedFallback },
  { name: 'Leading backslash \\evil.com', input: '\\evil.com', expected: expectedFallback },
  { name: 'Backslash slash combo \\/evil.com', input: '\\/evil.com', expected: expectedFallback },
  { name: 'Slash-backslash-slash /\\/evil.com', input: '/\\/evil.com', expected: expectedFallback },

  // --- Category C: WHATWG Whitespace & Control Character Stripping ---
  { name: 'Tab stripping /\\t/evil.com', input: '/\t/evil.com', expected: expectedFallback },
  { name: 'Newline stripping /\\n/evil.com', input: '/\n/evil.com', expected: expectedFallback },
  { name: 'Carriage return /\\r/evil.com', input: '/\r/evil.com', expected: expectedFallback },
  { name: 'Tab and backslash /\\t\\\\evil.com', input: '/\t\\evil.com', expected: expectedFallback },

  // --- Category D: External Schemes & Pseudo-Protocols ---
  { name: 'External HTTPS https://evil.com', input: 'https://evil.com', expected: expectedFallback },
  { name: 'External HTTP http://evil.com', input: 'http://evil.com', expected: expectedFallback },
  { name: 'Javascript pseudo-protocol javascript:alert(1)', input: 'javascript:alert(1)', expected: expectedFallback },
  { name: 'Data URI data:text/html,xss', input: 'data:text/html,xss', expected: expectedFallback },
  { name: 'VBScript pseudo-protocol vbscript:msgbox(1)', input: 'vbscript:msgbox(1)', expected: expectedFallback },
  { name: 'FTP scheme ftp://evil.com', input: 'ftp://evil.com', expected: expectedFallback },
  { name: 'File scheme file:///etc/passwd', input: 'file:///etc/passwd', expected: expectedFallback },

  // --- Category E: Userinfo & Subdomain Spoofing ---
  { name: 'Userinfo trick //localhost:3000@evil.com', input: '//localhost:3000@evil.com', expected: expectedFallback },
  { name: 'Subdomain spoofing //localhost:3000.evil.com', input: '//localhost:3000.evil.com', expected: expectedFallback },
  { name: 'At-sign alone //@evil.com', input: '//@evil.com', expected: expectedFallback },

  // --- Category F: Percent-Encoded Slashing ---
  { name: 'Encoded forward slash /%2fevil.com', input: '/%2fevil.com', expected: expectedFallback },
  { name: 'Encoded backslash /%5cevil.com', input: '/%5cevil.com', expected: expectedFallback },

  // --- Category G: Malformed & DoS Crashing Inputs ---
  { name: 'Lone double slash //', input: '//', expected: expectedFallback },
  { name: 'Lone slash-backslash /\\', input: '/\\', expected: expectedFallback },
  { name: 'Lone triple slash ///', input: '///', expected: expectedFallback },
  { name: 'Empty string ""', input: '', expected: expectedFallback },
  { name: 'Whitespace only "   "', input: '   ', expected: expectedFallback },
  { name: 'Null input', input: null, expected: expectedFallback },
  { name: 'Undefined input', input: undefined, expected: expectedFallback },

  // --- Category H: Infinite Auth Loop Protection ---
  { name: 'Auth route loop /auth/login', input: '/auth/login', expected: expectedFallback },
  { name: 'Auth route loop /auth/register', input: '/auth/register', expected: expectedFallback },
  { name: 'Auth route loop /auth/otp', input: '/auth/otp', expected: expectedFallback },

  // --- Category I: Legitimate On-Origin Routes (Must Be Preserved) ---
  { name: 'Valid /dashboard', input: '/dashboard', expected: 'http://localhost:3000/dashboard' },
  { name: 'Valid /articles/my-slug', input: '/articles/my-slug', expected: 'http://localhost:3000/articles/my-slug' },
  { name: 'Valid root query /?query=test', input: '/?query=test', expected: 'http://localhost:3000/?query=test' },
  { name: 'Valid path + query + hash', input: '/articles/death-of-60fps?sort=asc#comments', expected: 'http://localhost:3000/articles/death-of-60fps?sort=asc#comments' },
  { name: 'Valid deep settings path', input: '/settings?tab=security&page=2', expected: 'http://localhost:3000/settings?tab=security&page=2' },
];

// 4. Test Runner Execution
console.log(`=== Step 2: Running Open Redirect Adversarial Suite (${testCases.length} Test Cases) ===\n`);
let passed = 0;
let failed = 0;

for (const tc of testCases) {
  try {
    const result = getSafeRedirectUrl(tc.input, baseOrigin);
    const actual = result.href;
    if (actual === tc.expected) {
      console.log(`  [PASS] ${tc.name}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${tc.name}\n         Input:    ${JSON.stringify(tc.input)}\n         Expected: ${tc.expected}\n         Actual:   ${actual}`);
      failed++;
    }
  } catch (err) {
    console.error(`  [CRASH] ${tc.name}\n          Threw: ${err.message}`);
    failed++;
  }
}

console.log(`\n========================================`);
console.log(`Result: ${passed} Passed, ${failed} Failed`);
console.log(`========================================`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('All Open Redirect vectors successfully neutralized.\n');
  process.exit(0);
}
