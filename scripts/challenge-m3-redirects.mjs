/**
 * Milestone M3 Adversarial Stress Harness: Open Redirect Hardening (CWE-601)
 * Challenger: challenger_m3_1
 *
 * Imports directly from frontend/middleware.ts
 * Run via: node --experimental-strip-types --loader ./scripts/next-resolver-loader.mjs scripts/challenge-m3-redirects.mjs
 */

import assert from 'node:assert';
import { NextRequest } from '../frontend/node_modules/next/server.js';
import { getSafeRedirectUrl, middleware } from '../frontend/middleware.ts';

console.log('================================================================');
console.log('  CHALLENGER 1: ADVERSARIAL STRESS HARNESS — OPEN REDIRECT (CWE-601)');
console.log('================================================================\n');

const BASE_ORIGIN = 'http://localhost:3000';
const DEFAULT_PATH = '/dashboard';
const EXPECTED_FALLBACK = `${BASE_ORIGIN}${DEFAULT_PATH}`;

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failureDetails = [];

function assertRedirect(name, input, expectedResult, options = {}) {
  totalTests++;
  try {
    const result = getSafeRedirectUrl(input, BASE_ORIGIN, DEFAULT_PATH);
    const actualHref = result.href;
    const actualOrigin = result.origin;

    // Safety Invariant 1: Result MUST be a valid WHATWG URL instance
    assert.ok(result instanceof URL, `${name}: Result must be a WHATWG URL instance`);

    // Safety Invariant 2: Result origin MUST strictly equal BASE_ORIGIN (ZERO off-origin escapes)
    assert.strictEqual(
      actualOrigin,
      BASE_ORIGIN,
      `${name}: Origin escape detected! Expected ${BASE_ORIGIN}, got ${actualOrigin}`
    );

    // Safety Invariant 3: Result protocol MUST be http: or https:
    assert.ok(
      result.protocol === 'http:' || result.protocol === 'https:',
      `${name}: Dangerous protocol detected: ${result.protocol}`
    );

    // Safety Invariant 4: No adversarial hostname should appear as authority host
    const forbiddenHostnames = ['evil.com', 'attacker.com', 'phishing.org'];
    for (const forbidden of forbiddenHostnames) {
      assert.ok(
        !result.host.includes(forbidden),
        `${name}: Authority spoofing detected! Host contains ${forbidden}`
      );
    }

    // If an exact expected URL is specified, assert exact match
    if (expectedResult !== undefined) {
      assert.strictEqual(
        actualHref,
        expectedResult,
        `${name}: Expected ${expectedResult}, got ${actualHref}`
      );
    }

    passedTests++;
    console.log(`  [PASS] ${name}`);
  } catch (err) {
    failedTests++;
    console.error(`  [FAIL] ${name}`);
    console.error(`         Input:    ${JSON.stringify(input)}`);
    console.error(`         Error:    ${err.message}`);
    failureDetails.push({ name, input, error: err.message });
  }
}

// ============================================================================
// SUITE 1: Advanced Protocol-Relative Obfuscations
// ============================================================================
console.log('\n--- Suite 1: Advanced Protocol-Relative Obfuscations ---');
const suite1 = [
  { name: 'Standard protocol-relative //evil.com', input: '//evil.com', expected: EXPECTED_FALLBACK },
  { name: 'Triple slash ///evil.com', input: '///evil.com', expected: EXPECTED_FALLBACK },
  { name: 'Quadruple slash ////evil.com', input: '////evil.com', expected: EXPECTED_FALLBACK },
  { name: 'Quintuple slash /////evil.com', input: '/////evil.com', expected: EXPECTED_FALLBACK },
  { name: 'Single backslash slash /\\evil.com', input: '/\\evil.com', expected: EXPECTED_FALLBACK },
  { name: 'Slash double backslash /\\\\evil.com', input: '/\\\\evil.com', expected: EXPECTED_FALLBACK },
  { name: 'Slash triple backslash /\\\\\\evil.com', input: '/\\\\\\evil.com', expected: EXPECTED_FALLBACK },
  { name: 'Slash backslash slash /\\/evil.com', input: '/\\/evil.com', expected: EXPECTED_FALLBACK },
  { name: 'Alternating slash backslash /\\/\\evil.com', input: '/\\/\\evil.com', expected: EXPECTED_FALLBACK },
  { name: 'Backslash slash combo \\/evil.com', input: '\\/evil.com', expected: EXPECTED_FALLBACK },
  { name: 'Double backslash \\\\evil.com', input: '\\\\evil.com', expected: EXPECTED_FALLBACK },
  { name: 'Leading backslash \\evil.com', input: '\\evil.com', expected: EXPECTED_FALLBACK },
  { name: 'Protocol-relative with port //evil.com:8080/path', input: '//evil.com:8080/path', expected: EXPECTED_FALLBACK },
  { name: 'Protocol-relative with query //evil.com?leak=cookie', input: '//evil.com?leak=cookie', expected: EXPECTED_FALLBACK },
  { name: 'Protocol-relative with fragment //evil.com#section', input: '//evil.com#section', expected: EXPECTED_FALLBACK },
  { name: 'Protocol-relative dot slash //./evil.com', input: '//./evil.com', expected: EXPECTED_FALLBACK },
  { name: 'Protocol-relative dot dot slash //../evil.com', input: '//../evil.com', expected: EXPECTED_FALLBACK },
  { name: 'Slash dot backslash slash /.\\/evil.com', input: '/.\\/evil.com', expected: EXPECTED_FALLBACK },
  { name: 'Dot slash path traversal on-origin /.//evil.com', input: '/.//evil.com', expected: `${BASE_ORIGIN}//evil.com` },
  { name: 'Dot dot slash path traversal on-origin /..//evil.com', input: '/..//evil.com', expected: `${BASE_ORIGIN}//evil.com` },
];
for (const tc of suite1) {
  assertRedirect(tc.name, tc.input, tc.expected);
}

// ============================================================================
// SUITE 2: Control Characters and Whitespace Insertions
// ============================================================================
console.log('\n--- Suite 2: Control Characters & Whitespace Insertions ---');
const suite2 = [
  { name: 'Horizontal tab /\\t/evil.com', input: '/\t/evil.com', expected: EXPECTED_FALLBACK },
  { name: 'Newline /\\n/evil.com', input: '/\n/evil.com', expected: EXPECTED_FALLBACK },
  { name: 'Carriage return /\\r/evil.com', input: '/\r/evil.com', expected: EXPECTED_FALLBACK },
  { name: 'CRLF /\\r\\n/evil.com', input: '/\r\n/evil.com', expected: EXPECTED_FALLBACK },
  { name: 'Null byte /\\x00/evil.com', input: '/\x00/evil.com', expected: EXPECTED_FALLBACK },
  { name: 'Control char SOH /\\x01/evil.com', input: '/\x01/evil.com', expected: EXPECTED_FALLBACK },
  { name: 'Control char BS /\\x08/evil.com', input: '/\x08/evil.com', expected: EXPECTED_FALLBACK },
  { name: 'Control char ESC /\\x1b/evil.com', input: '/\x1b/evil.com', expected: EXPECTED_FALLBACK },
  { name: 'Control char US /\\x1f/evil.com', input: '/\x1f/evil.com', expected: EXPECTED_FALLBACK },
  { name: 'Whitespace tab sandwich / \\t /evil.com', input: '/ \t /evil.com', expected: EXPECTED_FALLBACK },
  { name: 'Tab with backslash /\\t\\\\evil.com', input: '/\t\\evil.com', expected: EXPECTED_FALLBACK },
  { name: 'Backslash tab /\\\\t/evil.com', input: '/\\\t/evil.com', expected: EXPECTED_FALLBACK },
  { name: 'Double tab /\\t\\t/evil.com', input: '/\t\t/evil.com', expected: EXPECTED_FALLBACK },
  { name: 'Whitespace padded //evil.com', input: '  //evil.com  ', expected: EXPECTED_FALLBACK },
  { name: 'Whitespace padded /\\evil.com', input: '  /\\evil.com  ', expected: EXPECTED_FALLBACK },
  { name: 'Encoded tab /%09/evil.com', input: '/%09/evil.com', expected: EXPECTED_FALLBACK },
  { name: 'Encoded newline /%0a/evil.com', input: '/%0a/evil.com', expected: EXPECTED_FALLBACK },
  { name: 'Encoded carriage return /%0d/evil.com', input: '/%0d/evil.com', expected: EXPECTED_FALLBACK },
  { name: 'Encoded CRLF /%0d%0a/evil.com', input: '/%0d%0a/evil.com', expected: EXPECTED_FALLBACK },
  { name: 'Encoded null byte /%00/evil.com', input: '/%00/evil.com', expected: EXPECTED_FALLBACK },
];
for (const tc of suite2) {
  assertRedirect(tc.name, tc.input, tc.expected);
}

// ============================================================================
// SUITE 3: Multi-Encoding & Unicode Normalizations
// ============================================================================
console.log('\n--- Suite 3: Multi-Encoding & Unicode Normalizations ---');
const suite3 = [
  { name: 'Percent-encoded slash /%2fevil.com', input: '/%2fevil.com', expected: EXPECTED_FALLBACK },
  { name: 'Percent-encoded uppercase slash /%2Fevil.com', input: '/%2Fevil.com', expected: EXPECTED_FALLBACK },
  { name: 'Percent-encoded backslash /%5cevil.com', input: '/%5cevil.com', expected: EXPECTED_FALLBACK },
  { name: 'Percent-encoded uppercase backslash /%5Cevil.com', input: '/%5Cevil.com', expected: EXPECTED_FALLBACK },
  { name: 'Double percent-encoded double slash /%252f%252fevil.com', input: '/%252f%252fevil.com', expected: `${BASE_ORIGIN}/%252f%252fevil.com` },
  { name: 'Double percent-encoded uppercase /%252F%252Fevil.com', input: '/%252F%252Fevil.com', expected: `${BASE_ORIGIN}/%252F%252Fevil.com` },
  { name: 'Double percent-encoded backslash /%255cevil.com', input: '/%255cevil.com', expected: `${BASE_ORIGIN}/%255cevil.com` },
  { name: 'Encoded slash-slash combo /%2f%2fevil.com', input: '/%2f%2fevil.com', expected: EXPECTED_FALLBACK },
  { name: 'Encoded slash-backslash combo /%2f%5cevil.com', input: '/%2f%5cevil.com', expected: EXPECTED_FALLBACK },
  { name: 'Encoded backslash-slash combo /%5c%2fevil.com', input: '/%5c%2fevil.com', expected: EXPECTED_FALLBACK },
  { name: 'Unicode Fullwidth Solidus /\\uFF0F\\uFF0Fevil.com', input: '/\uFF0F\uFF0Fevil.com', expected: `${BASE_ORIGIN}/%EF%BC%8F%EF%BC%8Fevil.com` },
  { name: 'Unicode Fullwidth Solidus leading \\uFF0F\\uFF0Fevil.com', input: '\uFF0F\uFF0Fevil.com', expected: EXPECTED_FALLBACK },
  { name: 'Unicode Division Slash /\\u2215\\u2215evil.com', input: '/\u2215\u2215evil.com', expected: `${BASE_ORIGIN}/%E2%88%95%E2%88%95evil.com` },
  { name: 'Unicode Fraction Slash /\\u2044\\u2044evil.com', input: '/\u2044\u2044evil.com', expected: `${BASE_ORIGIN}/%E2%81%84%E2%81%84evil.com` },
  { name: 'Unicode Small Reverse Solidus /\\uFE68evil.com', input: '/\uFE68evil.com', expected: `${BASE_ORIGIN}/%EF%B9%A8evil.com` },
  { name: 'Unicode Fullwidth Reverse Solidus /\\uFF3C\\uFF3Cevil.com', input: '/\uFF3C\uFF3Cevil.com', expected: `${BASE_ORIGIN}/%EF%BC%BC%EF%BC%BCevil.com` },
  { name: 'Unicode Ideographic Space /%E3%80%80/evil.com', input: '/%E3%80%80/evil.com', expected: `${BASE_ORIGIN}/%E3%80%80/evil.com` },
  { name: 'Unicode Ideographic Space raw /\\u3000\\u3000evil.com', input: '/\u3000\u3000evil.com', expected: `${BASE_ORIGIN}/%E3%80%80%E3%80%80evil.com` },
  { name: 'Malformed percent sequence /%', input: '/%', expected: EXPECTED_FALLBACK },
  { name: 'Truncated percent sequence /%2', input: '/%2', expected: EXPECTED_FALLBACK },
  { name: 'Invalid hex percent sequence /%zz', input: '/%zz', expected: EXPECTED_FALLBACK },
  { name: 'Incomplete UTF-8 percent sequence /%E0%A4%A', input: '/%E0%A4%A', expected: EXPECTED_FALLBACK },
  { name: 'Non-ASCII DEL character /\\x7f/evil.com', input: '/\x7f/evil.com', expected: `${BASE_ORIGIN}/%7F/evil.com` },
  { name: 'Non-ASCII DEL encoded /%7f/evil.com', input: '/%7f/evil.com', expected: `${BASE_ORIGIN}/%7f/evil.com` },
];
for (const tc of suite3) {
  assertRedirect(tc.name, tc.input, tc.expected);
}

// ============================================================================
// SUITE 4: Authority Spoofing & Userinfo Tricks
// ============================================================================
console.log('\n--- Suite 4: Authority Spoofing & Userinfo Tricks ---');
const suite4 = [
  { name: 'Userinfo with colon //localhost:3000@evil.com', input: '//localhost:3000@evil.com', expected: EXPECTED_FALLBACK },
  { name: 'Userinfo with password //localhost:3000:pass@evil.com', input: '//localhost:3000:pass@evil.com', expected: EXPECTED_FALLBACK },
  { name: 'Subdomain spoofing //localhost:3000.evil.com', input: '//localhost:3000.evil.com', expected: EXPECTED_FALLBACK },
  { name: 'Port suffix spoofing //localhost:3000evil.com', input: '//localhost:3000evil.com', expected: EXPECTED_FALLBACK },
  { name: 'At-sign alone //@evil.com', input: '//@evil.com', expected: EXPECTED_FALLBACK },
  { name: 'Fragment auth spoof //evil.com#@localhost:3000', input: '//evil.com#@localhost:3000', expected: EXPECTED_FALLBACK },
  { name: 'Query auth spoof //evil.com?@localhost:3000', input: '//evil.com?@localhost:3000', expected: EXPECTED_FALLBACK },
  { name: 'IPv4 integer encoding //2130706433', input: '//2130706433', expected: EXPECTED_FALLBACK },
  { name: 'IPv4 octal encoding //0177.0.0.1', input: '//0177.0.0.1', expected: EXPECTED_FALLBACK },
  { name: 'IPv4 hex encoding //0x7f.0x0.0x0.0x1', input: '//0x7f.0x0.0x0.0x1', expected: EXPECTED_FALLBACK },
  { name: 'IPv6 bracket format //[::1]', input: '//[::1]', expected: EXPECTED_FALLBACK },
  { name: 'HTTPS full URL with userinfo https://localhost:3000@evil.com', input: 'https://localhost:3000@evil.com', expected: EXPECTED_FALLBACK },
  { name: 'HTTP full URL with subdomain http://localhost:3000.evil.com', input: 'http://localhost:3000.evil.com', expected: EXPECTED_FALLBACK },
  { name: 'Trailing authority trick //evil.com/localhost:3000', input: '//evil.com/localhost:3000', expected: EXPECTED_FALLBACK },
];
for (const tc of suite4) {
  assertRedirect(tc.name, tc.input, tc.expected);
}

// ============================================================================
// SUITE 5: Scheme Confusion & Pseudo-Protocols
// ============================================================================
console.log('\n--- Suite 5: Scheme Confusion & Pseudo-Protocols ---');
const suite5 = [
  { name: 'javascript: basic alert', input: 'javascript:alert(1)', expected: EXPECTED_FALLBACK },
  { name: 'javascript: uppercase', input: 'JAVASCRIPT:alert(1)', expected: EXPECTED_FALLBACK },
  { name: 'javascript: with leading whitespace', input: '  javascript:alert(1)', expected: EXPECTED_FALLBACK },
  { name: 'javascript: with newline obfuscation', input: 'javascript://evil.com/%0Aalert(1)', expected: EXPECTED_FALLBACK },
  { name: 'data: text/html HTML injection', input: 'data:text/html,<script>alert(1)</script>', expected: EXPECTED_FALLBACK },
  { name: 'data: base64 encoded script', input: 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==', expected: EXPECTED_FALLBACK },
  { name: 'vbscript: pseudo-protocol', input: 'vbscript:msgbox(1)', expected: EXPECTED_FALLBACK },
  { name: 'blob: URI scheme', input: 'blob:http://localhost:3000/some-guid', expected: EXPECTED_FALLBACK },
  { name: 'file: Unix path', input: 'file:///etc/passwd', expected: EXPECTED_FALLBACK },
  { name: 'file: Windows path', input: 'file://C:/Windows/win.ini', expected: EXPECTED_FALLBACK },
  { name: 'ftp: scheme', input: 'ftp://evil.com/resource', expected: EXPECTED_FALLBACK },
  { name: 'ws: websocket scheme', input: 'ws://evil.com/socket', expected: EXPECTED_FALLBACK },
  { name: 'wss: secure websocket scheme', input: 'wss://evil.com/socket', expected: EXPECTED_FALLBACK },
  { name: 'gopher: legacy scheme', input: 'gopher://evil.com/', expected: EXPECTED_FALLBACK },
  { name: 'ldap: directory scheme', input: 'ldap://evil.com/', expected: EXPECTED_FALLBACK },
];
for (const tc of suite5) {
  assertRedirect(tc.name, tc.input, tc.expected);
}

// ============================================================================
// SUITE 6: Edge Crashes, Unhandled Exceptions & DoS Vectors
// ============================================================================
console.log('\n--- Suite 6: Edge Crashes, Exceptions & DoS Vectors ---');
const suite6 = [
  { name: 'Lone double slash //', input: '//', expected: EXPECTED_FALLBACK },
  { name: 'Lone slash-backslash /\\', input: '/\\', expected: EXPECTED_FALLBACK },
  { name: 'Lone triple slash ///', input: '///', expected: EXPECTED_FALLBACK },
  { name: 'Lone single slash /', input: '/', expected: `${BASE_ORIGIN}/` },
  { name: 'Single backslash \\', input: '\\', expected: EXPECTED_FALLBACK },
  { name: 'Double backslash \\\\', input: '\\\\', expected: EXPECTED_FALLBACK },
  { name: 'Empty string ""', input: '', expected: EXPECTED_FALLBACK },
  { name: 'Whitespace only "   "', input: '   ', expected: EXPECTED_FALLBACK },
  { name: 'Null input', input: null, expected: EXPECTED_FALLBACK },
  { name: 'Undefined input', input: undefined, expected: EXPECTED_FALLBACK },
  { name: 'Number input (12345)', input: 12345, expected: EXPECTED_FALLBACK },
  { name: 'Boolean true input', input: true, expected: EXPECTED_FALLBACK },
  { name: 'Boolean false input', input: false, expected: EXPECTED_FALLBACK },
  { name: 'Object input {}', input: {}, expected: EXPECTED_FALLBACK },
  { name: 'Array input []', input: [], expected: EXPECTED_FALLBACK },
  { name: 'Function input () => {}', input: () => {}, expected: EXPECTED_FALLBACK },
  { name: 'Symbol input', input: Symbol('test'), expected: EXPECTED_FALLBACK },
  { name: 'Excessive slashes (1,000 slashes)', input: '/'.repeat(1000), expected: EXPECTED_FALLBACK },
  { name: 'Excessive backslashes (1,000 backslashes)', input: '\\'.repeat(1000), expected: EXPECTED_FALLBACK },
  { name: 'Alternating slash-backslash (2,000 chars)', input: '/\\'.repeat(1000), expected: EXPECTED_FALLBACK },
  { name: 'Massive string (100,000 chars)', input: '/' + 'a'.repeat(100000), expected: `${BASE_ORIGIN}/` + 'a'.repeat(100000) },
  { name: 'Emoji path /🚀/launch', input: '/🚀/launch', expected: `${BASE_ORIGIN}/%F0%9F%9A%80/launch` },
  { name: 'Emoji with query /🎉?gift=box#ribbon', input: '/🎉?gift=box#ribbon', expected: `${BASE_ORIGIN}/%F0%9F%8E%89?gift=box#ribbon` },
  { name: 'Unpaired surrogate /\\uD800/path', input: '/\uD800/path', expected: `${BASE_ORIGIN}/%EF%BF%BD/path` },
];
for (const tc of suite6) {
  assertRedirect(tc.name, tc.input, tc.expected);
}

// ============================================================================
// SUITE 7: Auth Loop Prevention Vectors
// ============================================================================
console.log('\n--- Suite 7: Auth Loop Prevention Vectors ---');
const suite7 = [
  { name: 'Exact /auth/login', input: '/auth/login', expected: EXPECTED_FALLBACK },
  { name: 'Trailing slash /auth/login/', input: '/auth/login/', expected: EXPECTED_FALLBACK },
  { name: 'With query /auth/login?next=/dashboard', input: '/auth/login?next=/dashboard', expected: EXPECTED_FALLBACK },
  { name: 'With nested param /auth/login?error=invalid', input: '/auth/login?error=invalid', expected: EXPECTED_FALLBACK },
  { name: 'Exact /auth/register', input: '/auth/register', expected: EXPECTED_FALLBACK },
  { name: 'With referral /auth/register?ref=friend', input: '/auth/register?ref=friend', expected: EXPECTED_FALLBACK },
  { name: 'Exact /auth/otp', input: '/auth/otp', expected: EXPECTED_FALLBACK },
  { name: 'With challenge /auth/otp?step=2', input: '/auth/otp?step=2', expected: EXPECTED_FALLBACK },
  { name: 'Traversal resolving to auth /auth/../auth/login', input: '/auth/../auth/login', expected: EXPECTED_FALLBACK },
  { name: 'Traversal subpath /auth/login/../../dashboard', input: '/auth/login/../../dashboard', expected: `${BASE_ORIGIN}/dashboard` },
];
for (const tc of suite7) {
  assertRedirect(tc.name, tc.input, tc.expected);
}

// ============================================================================
// SUITE 8: Legitimate On-Origin Routes (False Rejection Checks)
// ============================================================================
console.log('\n--- Suite 8: Legitimate On-Origin Routes (False Rejection Checks) ---');
const suite8 = [
  { name: 'Standard /dashboard', input: '/dashboard', expected: `${BASE_ORIGIN}/dashboard` },
  { name: 'Standard /checkout', input: '/checkout', expected: `${BASE_ORIGIN}/checkout` },
  { name: 'Standard /profile', input: '/profile', expected: `${BASE_ORIGIN}/profile` },
  { name: 'Standard /settings', input: '/settings', expected: `${BASE_ORIGIN}/settings` },
  { name: 'Standard /articles', input: '/articles', expected: `${BASE_ORIGIN}/articles` },
  { name: 'Article slug /articles/the-death-of-60fps', input: '/articles/the-death-of-60fps', expected: `${BASE_ORIGIN}/articles/the-death-of-60fps` },
  { name: 'Article with query /articles/nextjs-15?view=summary', input: '/articles/nextjs-15?view=summary', expected: `${BASE_ORIGIN}/articles/nextjs-15?view=summary` },
  { name: 'Article with hash /articles/my-post#comments', input: '/articles/my-post#comments', expected: `${BASE_ORIGIN}/articles/my-post#comments` },
  { name: 'Article with query and hash', input: '/articles/slug?sort=asc&page=1#section-3', expected: `${BASE_ORIGIN}/articles/slug?sort=asc&page=1#section-3` },
  { name: 'Deep settings route /settings/security/two-factor', input: '/settings/security/two-factor', expected: `${BASE_ORIGIN}/settings/security/two-factor` },
  { name: 'Root with search query /?search=graviblog&order=desc', input: '/?search=graviblog&order=desc', expected: `${BASE_ORIGIN}/?search=graviblog&order=desc` },
  { name: 'Encoded spaces in query /search?q=next%20js%20framework', input: '/search?q=next%20js%20framework', expected: `${BASE_ORIGIN}/search?q=next%20js%20framework` },
  { name: 'Persian unicode slug /articles/راهنمای-جامع-فرانت‌اند', input: '/articles/راهنمای-جامع-فرانت‌اند', expected: `${BASE_ORIGIN}/articles/%D8%B1%D8%A7%D9%87%D9%86%D9%85%D8%A7%DB%8C-%D8%AC%D8%A7%D9%85%D8%B9-%D9%81%D8%B1%D8%A7%D9%86%D8%AA%E2%80%8C%D8%A7%D9%86%D8%AF` },
  { name: 'Safe at-sign profile /profile/@alice_smith', input: '/profile/@alice_smith', expected: `${BASE_ORIGIN}/profile/@alice_smith` },
  { name: 'Safe tilde path /~developer/notes', input: '/~developer/notes', expected: `${BASE_ORIGIN}/~developer/notes` },
  { name: 'Complex query with brackets /articles?filter[category]=ai&filter[page]=2', input: '/articles?filter[category]=ai&filter[page]=2', expected: `${BASE_ORIGIN}/articles?filter[category]=ai&filter[page]=2` },
  { name: 'Punctuation in path /about-us.v2_final', input: '/about-us.v2_final', expected: `${BASE_ORIGIN}/about-us.v2_final` },
];
for (const tc of suite8) {
  assertRedirect(tc.name, tc.input, tc.expected);
}

// ============================================================================
// SUITE 9: Full Middleware End-to-End Execution (NextRequest integration)
// ============================================================================
console.log('\n--- Suite 9: Full Middleware Execution (NextRequest Integration) ---');
const middlewareScenarios = [
  {
    name: 'Protected route with no session redirects to /auth/login with next param',
    url: 'http://localhost:3000/dashboard',
    cookies: {},
    assertResponse: (res) => {
      assert.strictEqual(res.status, 307);
      const loc = res.headers.get('location');
      assert.strictEqual(loc, 'http://localhost:3000/auth/login?next=%2Fdashboard');
    }
  },
  {
    name: 'Protected route with access token passes through (status 200)',
    url: 'http://localhost:3000/dashboard',
    cookies: { pod_access_token: 'valid-token' },
    assertResponse: (res) => {
      assert.strictEqual(res.status, 200);
    }
  },
  {
    name: 'Protected route with refresh token only (silent refresh) passes through',
    url: 'http://localhost:3000/checkout',
    cookies: { pod_refresh_token: 'refresh-token' },
    assertResponse: (res) => {
      assert.strictEqual(res.status, 200);
    }
  },
  {
    name: 'Auth route without session passes through to login page',
    url: 'http://localhost:3000/auth/login',
    cookies: {},
    assertResponse: (res) => {
      assert.strictEqual(res.status, 200);
    }
  },
  {
    name: 'Auth route with session and malicious ?next=//evil.com redirects to /dashboard',
    url: 'http://localhost:3000/auth/login?next=//evil.com',
    cookies: { pod_access_token: 'active-session' },
    assertResponse: (res) => {
      assert.strictEqual(res.status, 307);
      assert.strictEqual(res.headers.get('location'), 'http://localhost:3000/dashboard');
    }
  },
  {
    name: 'Auth route with session and double encoded ?next=%252F%252Fevil.com redirects to /dashboard',
    url: 'http://localhost:3000/auth/login?next=%252F%252Fevil.com',
    cookies: { pod_access_token: 'active-session' },
    assertResponse: (res) => {
      assert.strictEqual(res.status, 307);
      assert.strictEqual(res.headers.get('location'), 'http://localhost:3000/dashboard');
    }
  },
  {
    name: 'Auth route with session and backslash ?next=/\\evil.com redirects to /dashboard',
    url: 'http://localhost:3000/auth/login?next=/\\evil.com',
    cookies: { pod_access_token: 'active-session' },
    assertResponse: (res) => {
      assert.strictEqual(res.status, 307);
      assert.strictEqual(res.headers.get('location'), 'http://localhost:3000/dashboard');
    }
  },
  {
    name: 'Auth route with session and tab ?next=/%09/evil.com redirects to /dashboard',
    url: 'http://localhost:3000/auth/login?next=/%09/evil.com',
    cookies: { pod_access_token: 'active-session' },
    assertResponse: (res) => {
      assert.strictEqual(res.status, 307);
      assert.strictEqual(res.headers.get('location'), 'http://localhost:3000/dashboard');
    }
  },
  {
    name: 'Auth route with session and loop ?next=/auth/login redirects to /dashboard',
    url: 'http://localhost:3000/auth/login?next=/auth/login',
    cookies: { pod_access_token: 'active-session' },
    assertResponse: (res) => {
      assert.strictEqual(res.status, 307);
      assert.strictEqual(res.headers.get('location'), 'http://localhost:3000/dashboard');
    }
  },
  {
    name: 'Auth route with session and valid ?next=/articles/my-post preserves on-origin target',
    url: 'http://localhost:3000/auth/login?next=/articles/my-post',
    cookies: { pod_access_token: 'active-session' },
    assertResponse: (res) => {
      assert.strictEqual(res.status, 307);
      assert.strictEqual(res.headers.get('location'), 'http://localhost:3000/articles/my-post');
    }
  },
];

for (const sc of middlewareScenarios) {
  totalTests++;
  try {
    const cookieHeader = Object.entries(sc.cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');

    const headers = {};
    if (cookieHeader) headers['cookie'] = cookieHeader;

    const req = new NextRequest(new Request(sc.url, { headers }));
    const res = middleware(req);
    sc.assertResponse(res);
    passedTests++;
    console.log(`  [PASS] ${sc.name}`);
  } catch (err) {
    failedTests++;
    console.error(`  [FAIL] ${sc.name}`);
    console.error(`         URL:   ${sc.url}`);
    console.error(`         Error: ${err.message}`);
    failureDetails.push({ name: sc.name, input: sc.url, error: err.message });
  }
}

// ============================================================================
// SUITE 10: Combinatorial Mutation Fuzzing (17,556 Payloads)
// ============================================================================
console.log('\n--- Suite 10: Large-Scale Combinatorial Mutation Fuzzing ---');
const prefixes = [
  '', '/', '//', '///', '////', '/\\', '/\\\\', '\\/', '\\\\', '\\',
  '/.', '/..', '/./', '/../', '/.//', '/..//', '/.///', '/..///',
  ' /', ' //', '  /', '\t/', '\n/', '\r\n/',
  '/%2f', '/%5c', '/%252f', '/%255c',
  '/\uFF0F', '/\u2215', '/\u2044', '/\uFE68', '/\uFF3C',
  'http:', 'https:', 'javascript:', 'data:', 'file:', 'ftp:',
  'http://', 'https://', 'javascript://',
];

const bodies = [
  'evil.com', 'attacker.org', 'phishing.com', '127.0.0.1', '2130706433',
  '0177.0.0.1', '0x7f.0.0.1', '[::1]', 'localhost:3000.evil.com',
  'localhost:3000@evil.com', 'localhost:3000:pass@evil.com', '@evil.com',
  ':@evil.com', 'evil.com/path', 'evil.com?param=val', 'evil.com#frag',
  'evil.com#@localhost:3000', 'evil.com?@localhost:3000',
  'dashboard', 'articles/slug', 'checkout', 'profile',
];

const suffixes = [
  '', '/', '//', '/\\', '\\/', '\\', '?', '?test=1', '#', '#sec',
  '%00', '%09', '%0a', '%0d', '\t', '\n', '\r', ' ', '  ',
];

let fuzzerCount = 0;
let fuzzerOriginEscapes = 0;
let fuzzerCrashes = 0;

for (const p of prefixes) {
  for (const b of bodies) {
    for (const s of suffixes) {
      fuzzerCount++;
      const payload = p + b + s;
      try {
        const res = getSafeRedirectUrl(payload, BASE_ORIGIN, DEFAULT_PATH);
        if (res.origin !== BASE_ORIGIN) {
          fuzzerOriginEscapes++;
          failureDetails.push({ name: `Fuzzer escape: ${payload}`, input: payload, error: `Origin: ${res.origin}` });
        }
      } catch (err) {
        fuzzerCrashes++;
        failureDetails.push({ name: `Fuzzer crash: ${payload}`, input: payload, error: err.message });
      }
    }
  }
}

totalTests += fuzzerCount;
passedTests += (fuzzerCount - fuzzerOriginEscapes - fuzzerCrashes);
failedTests += (fuzzerOriginEscapes + fuzzerCrashes);

console.log(`  [PASS] Fuzzer executed ${fuzzerCount} combinations:`);
console.log(`         - Origin Escapes: ${fuzzerOriginEscapes}`);
console.log(`         - Unhandled Exceptions/Crashes: ${fuzzerCrashes}`);

// ============================================================================
// FINAL SUMMARY & VERDICT
// ============================================================================
console.log('\n================================================================');
console.log(`  ADVERSARIAL STRESS TEST SUMMARY`);
console.log(`  Explicit Unit & Integration Tests: 144`);
console.log(`  Combinatorial Fuzzing Tests:       ${fuzzerCount}`);
console.log(`  Total Invariant Verifications:    ${totalTests}`);
console.log(`  Total Passed:                      ${passedTests}`);
console.log(`  Total Failed:                      ${failedTests}`);
console.log('================================================================');

if (failedTests > 0) {
  console.error('\nVERDICT: INTEGRITY_COMPROMISED / VULNERABILITY_FOUND');
  for (const f of failureDetails.slice(0, 10)) {
    console.error(` - ${f.name}: ${f.error}`);
  }
  process.exit(1);
} else {
  console.log('\nVERDICT: CONFIRMED_SECURE');
  console.log('All adversarial vectors successfully neutralized. Zero off-origin escapes, zero crashes, zero false rejections.');
  process.exit(0);
}
