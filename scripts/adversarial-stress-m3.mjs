/**
 * Adversarial Stress Harness for Milestone M3 Stored XSS Sanitization
 *
 * This test suite ruthlessly attacks frontend/lib/sanitize.ts and verifies:
 * 1. Obfuscated script tags
 * 2. Event handlers across unusual elements
 * 3. Pseudo-protocol mutations
 * 4. Mutation XSS (mXSS) vectors
 * 5. Iframe/embed/object injections
 * 6. Safe formatting preservation (legitimate Markdown typography)
 * 7. SSR runtime stability and boundary inputs
 *
 * Run with: node --experimental-strip-types scripts/adversarial-stress-m3.mjs
 */

import assert from 'node:assert';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Direct import of production sanitizer module
const sanitizeModule = await import('../frontend/lib/sanitize.ts');
const { sanitizeHtml, SANITIZE_CONFIG } = sanitizeModule;

console.log('======================================================================');
console.log('  CHALLENGER 2: ADVERSARIAL STORED XSS STRESS HARNESS (MILESTONE M3)  ');
console.log('======================================================================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

const failures = [];

function runTest(category, name, input, validator) {
  totalTests++;
  try {
    const output = sanitizeHtml(input);
    const result = validator(output, input);
    if (result === true || (result && result.pass)) {
      passedTests++;
      console.log(`  [PASS] [${category}] ${name}`);
    } else {
      failedTests++;
      const reason = (result && result.reason) || 'Validator returned false';
      console.error(`  [FAIL] [${category}] ${name}`);
      console.error(`         Reason: ${reason}`);
      console.error(`         Input:  ${input}`);
      console.error(`         Output: ${output}`);
      failures.push({ category, name, input, output, reason });
    }
  } catch (err) {
    failedTests++;
    console.error(`  [CRASH] [${category}] ${name}`);
    console.error(`          Exception: ${err.message}`);
    failures.push({ category, name, input, error: err.message });
  }
}

// ============================================================================
// 1. OBFUSCATED SCRIPT TAGS
// ============================================================================
console.log('--- CATEGORY 1: Obfuscated Script Tags ---');

const obfuscatedScriptCases = [
  {
    name: 'Case-mixed script tag: <sCrIpt>',
    input: '<sCrIpt>alert(1)</ScRipt>',
  },
  {
    name: 'Slash separator without whitespace: <script/x>',
    input: '<script/x>alert(1)</script>',
  },
  {
    name: 'Script with slash before src: <script/src=...>',
    input: '<script/src="http://evil.com/xss.js"></script>',
  },
  {
    name: 'Hex encoded space in type attribute',
    input: '<script\x20type="text/javascript">alert(1)</script>',
  },
  {
    name: 'Nested / malformed angle brackets <<SCRIPT>',
    input: '<<SCRIPT>alert("XSS");//<</SCRIPT>',
  },
  {
    name: 'Data URI source script',
    input: '<script src=data:text/javascript,alert(1)></script>',
  },
  {
    name: 'Deferred script execution tag',
    input: '<script defer>alert(1)</script>',
  },
  {
    name: 'Uppercase script with space/slash attributes',
    input: '<SCRIPT/XSS SRC="http://evil.com/xss.js"></SCRIPT>',
  },
  {
    name: 'Split nested script tags',
    input: '<scr<script>ipt>alert(1)</scr</script>ipt>',
  },
  {
    name: 'Multiline script with embedded newlines',
    input: '<script\n>alert(1)\n</script>',
  },
  {
    name: 'Protocol-relative async external script',
    input: '<script src="//evil.com/poc.js" async></script>',
  },
  {
    name: 'Null byte injection within script tag name',
    input: '<scr\x00ipt>alert(1)</scr\x00ipt>',
  },
  {
    name: 'Crossorigin script injection',
    input: '<script crossorigin="anonymous">alert(1)</script>',
  },
];

for (const tc of obfuscatedScriptCases) {
  runTest('CAT-1: Scripts', tc.name, tc.input, (output) => {
    if (/<script/i.test(output)) return { pass: false, reason: 'Contains unneutralized <script tag' };
    if (/alert\(1\)/i.test(output) && !output.includes('&lt;') && !output.includes('&gt;')) {
      // If it contains executable code without being escaped text inside body
      if (/<.*alert/.test(output)) return { pass: false, reason: 'Executable alert in markup' };
    }
    return true;
  });
}

// ============================================================================
// 2. EVENT HANDLERS ACROSS UNUSUAL ELEMENTS
// ============================================================================
console.log('\n--- CATEGORY 2: Event Handlers Across Unusual Elements ---');

const eventHandlerCases = [
  {
    name: 'Audio element onerror',
    input: '<audio src="x" onerror="alert(1)"></audio>',
  },
  {
    name: 'Video element onerror',
    input: '<video src="x" onerror="alert(1)"></video>',
  },
  {
    name: 'Video source child onerror',
    input: '<video><source src="x" onerror="alert(1)"></video>',
  },
  {
    name: 'Marquee element onstart',
    input: '<marquee onstart="alert(1)">Scrolling text</marquee>',
  },
  {
    name: 'Marquee loop with onfinish',
    input: '<marquee loop="1" onfinish="alert(1)">Finish</marquee>',
  },
  {
    name: 'Body tag onload injection',
    input: '<body onload="alert(1)">Body Content</body>',
  },
  {
    name: 'SVG animation with keyframes onanimationstart',
    input: '<svg><style>@keyframes x{}</style><path style="animation-name:x" onanimationstart="alert(1)"/></svg>',
  },
  {
    name: 'SVG onload event handler',
    input: '<svg onload="alert(1)"></svg>',
  },
  {
    name: 'SVG set tag onbegin event',
    input: '<svg><set onbegin="alert(1)"/></svg>',
  },
  {
    name: 'SVG animate tag onbegin event',
    input: '<svg><animate onbegin="alert(1)"/></svg>',
  },
  {
    name: 'Autofocus input onfocus handler',
    input: '<input onfocus="alert(1)" autofocus>',
  },
  {
    name: 'Autofocus select onfocus handler',
    input: '<select onfocus="alert(1)" autofocus><option>1</option></select>',
  },
  {
    name: 'Autofocus textarea onfocus handler',
    input: '<textarea onfocus="alert(1)" autofocus></textarea>',
  },
  {
    name: 'Details element ontoggle handler (details allowed, ontoggle forbidden)',
    input: '<details ontoggle="alert(1)" open><summary>Summary</summary>Details</details>',
  },
  {
    name: 'Div mouse event handlers (mouseenter, mouseleave, onclick)',
    input: '<div onmouseenter="alert(1)" onmouseleave="alert(2)" onclick="alert(3)">Div Text</div>',
  },
  {
    name: 'Span pointer event handler (onpointerover)',
    input: '<span onpointerover="alert(1)">Hover Span</span>',
  },
  {
    name: 'Img tag onload and onerror combo',
    input: '<img src="valid.png" onload="alert(1)" onerror="alert(2)">',
  },
  {
    name: 'Summary onclick handler',
    input: '<summary onclick="alert(1)">Clickable summary</summary>',
  },
  {
    name: 'Paragraph clipboard events (oncopy, oncut)',
    input: '<p oncopy="alert(1)" oncut="alert(2)">Copyable paragraph</p>',
  },
  {
    name: 'Table onmouseover event handler',
    input: '<table onmouseover="alert(1)"><tr><td>Cell</td></tr></table>',
  },
  {
    name: 'Wheel event handler (onwheel)',
    input: '<div onwheel="alert(1)">Scrollable</div>',
  },
  {
    name: 'Button onclick handler',
    input: '<button onclick="alert(1)">Click Me</button>',
  },
];

for (const tc of eventHandlerCases) {
  runTest('CAT-2: Event Handlers', tc.name, tc.input, (output) => {
    // Assert that NO on* attribute exists in any tag
    if (/\son[a-z]+\s*=/i.test(output)) {
      return { pass: false, reason: `Found unstripped event handler attribute in output: ${output}` };
    }
    // Disallowed tag checks (audio, video, marquee, svg, input, select, textarea, button)
    if (/<(?:audio|video|marquee|svg|input|select|textarea|button)/i.test(output)) {
      return { pass: false, reason: `Found unallowed dangerous element tag in output: ${output}` };
    }
    return true;
  });
}

// ============================================================================
// 3. PSEUDO-PROTOCOL MUTATIONS
// ============================================================================
console.log('\n--- CATEGORY 3: Pseudo-Protocol Mutations ---');

const pseudoProtocolCases = [
  {
    name: 'Standard javascript: URI in anchor',
    input: '<a href="javascript:alert(1)">Payload</a>',
  },
  {
    name: 'Tab-obfuscated javascript: URI (jav&#x09;ascript:)',
    input: '<a href="jav&#x09;ascript:alert(1)">Payload</a>',
  },
  {
    name: 'Newline-obfuscated javascript: URI (jav&#x0A;ascript:)',
    input: '<a href="jav&#x0A;ascript:alert(1)">Payload</a>',
  },
  {
    name: 'Carriage-return-obfuscated javascript: URI (jav&#x0D;ascript:)',
    input: '<a href="jav&#x0D;ascript:alert(1)">Payload</a>',
  },
  {
    name: 'Null-byte in javascript: URI (java\\0script:)',
    input: '<a href="java\0script:alert(1)">Payload</a>',
  },
  {
    name: 'Mixed-case JaVaScRiPt: scheme',
    input: '<a href="JaVaScRiPt:alert(1)">Payload</a>',
  },
  {
    name: 'HTML entity colon (javascript&colon;)',
    input: '<a href="javascript&colon;alert(1)">Payload</a>',
  },
  {
    name: 'VBScript URI (vbscript:)',
    input: '<a href="vbscript:msgbox(1)">Payload</a>',
  },
  {
    name: 'Short VBS scheme (vbs:)',
    input: '<a href="vbs:msgbox(1)">Payload</a>',
  },
  {
    name: 'Data URI HTML with base64 script in anchor (Blocked)',
    input: '<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">Payload</a>',
  },
  {
    name: 'Data URI SVG with onload in anchor href (Blocked)',
    input: '<a href="data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+PC9zdmc+">Payload</a>',
  },
  {
    name: 'Data URI raster image in img src (Allowed by DOMPurify DATA_URI_TAGS)',
    input: '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=" alt="Pixel">',
  },
  {
    name: 'Data URI SVG image in img src (isolated image context, no script execution)',
    input: '<img src="data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+PC9zdmc+">',
  },
  {
    name: 'Feed pseudo-protocol wrapping javascript',
    input: '<a href="feed:javascript:alert(1)">Payload</a>',
  },
  {
    name: 'Blob URI',
    input: '<a href="blob:https://evil.com/uuid-string">Payload</a>',
  },
  {
    name: 'File protocol URI (file:///etc/passwd)',
    input: '<a href="file:///etc/passwd">Payload</a>',
  },
  {
    name: 'Complex polyglot javascript URI closing comment',
    input: '<a href="javascript:/*--></title></style></textarea></noscript>*/<script>alert(1)</script>">Payload</a>',
  },
];

for (const tc of pseudoProtocolCases) {
  runTest('CAT-3: Pseudo-Protocols', tc.name, tc.input, (output) => {
    // Assert href does NOT contain dangerous pseudo protocols (including all data: URIs)
    if (/href\s*=\s*["']?(?:javascript|vbscript|vbs|data|feed|file|blob):/i.test(output)) {
      return { pass: false, reason: `Dangerous URI pseudo-protocol survived in href: ${output}` };
    }
    // Assert src does NOT contain executable script pseudo protocols
    if (/src\s*=\s*["']?(?:javascript|vbscript|vbs|feed|file|blob):/i.test(output)) {
      return { pass: false, reason: `Dangerous script URI pseudo-protocol survived in src: ${output}` };
    }
    return true;
  });
}

// ============================================================================
// 4. MUTATION XSS (mXSS) VECTORS
// ============================================================================
console.log('\n--- CATEGORY 4: Mutation XSS (mXSS) Vectors ---');

const mxssCases = [
  {
    name: 'mXSS: noscript title boundary breakout',
    input: '<div><noscript><p title="</noscript><img src=x onerror=alert(1)>">',
  },
  {
    name: 'mXSS: listing tag entity decode',
    input: '<listing>&lt;img src=1 onerror=alert(1)&gt;</listing>',
  },
  {
    name: 'mXSS: math mtext table style comment breakout',
    input: '<math><mtext><table><mglyph><style><!--</style><img src=1 onerror=alert(1)>',
  },
  {
    name: 'mXSS: svg style font-family breakout',
    input: '<svg><style>{font-family:"</style><img src=x onerror=alert(1)>"}</svg>',
  },
  {
    name: 'mXSS: svg desc style nesting',
    input: '<svg><desc><style><img src=1 onerror=alert(1)></style></desc></svg>',
  },
  {
    name: 'mXSS: math/svg mglyph path namespace confusion',
    input: '<form><math><mtext></form><form><mglyph><svg><mtext><style><path id="</style><img onerror=alert(1) src=1>">',
  },
  {
    name: 'mXSS: annotation-xml comment breakout',
    input: '<annotation-xml encoding="text/html"><svg><style><!--</style><img src=1 onerror=alert(1)></annotation-xml>',
  },
  {
    name: 'Form hijacking with formaction javascript',
    input: '<form id="test"></form><button form="test" formaction="javascript:alert(1)">Click</button>',
  },
  {
    name: 'Namespace confusion td / math / svg mutation',
    input: '<div><math><mtext></td><form><mglyph><svg><mtext><style><path id="</style><img onerror=alert(1) src=1>"></div>',
  },
  {
    name: 'Foreign object SVG anchor style confusion',
    input: '<svg><p><style><a id="</style><img src=1 onerror=alert(1)>">',
  },
];

for (const tc of mxssCases) {
  runTest('CAT-4: mXSS', tc.name, tc.input, (output) => {
    // Check if an actual HTML element has an active event handler attribute
    if (/<[a-z0-9]+[^>]*\son[a-z]+\s*=/i.test(output)) {
      return { pass: false, reason: `Live event handler attribute found on element: ${output}` };
    }
    // Check if prohibited namespace or dangerous tags survived
    if (/<(?:script|style|form|button|math|svg|noscript|listing|annotation-xml)/i.test(output)) {
      return { pass: false, reason: `Prohibited dangerous/namespace tag survived: ${output}` };
    }
    return true;
  });
}

// ============================================================================
// 5. IFRAME / EMBED / OBJECT INJECTIONS
// ============================================================================
console.log('\n--- CATEGORY 5: Iframe / Embed / Object Injections ---');

const frameEmbedCases = [
  {
    name: 'Iframe with srcdoc containing script',
    input: '<iframe srcdoc="<script>alert(1)</script>"></iframe>',
  },
  {
    name: 'Iframe with javascript URI src',
    input: '<iframe src="javascript:alert(1)"></iframe>',
  },
  {
    name: 'Iframe with data URI html src',
    input: '<iframe src="data:text/html,<script>alert(1)</script>"></iframe>',
  },
  {
    name: 'Object element with javascript URI data',
    input: '<object data="javascript:alert(1)"></object>',
  },
  {
    name: 'Object element with base64 data URI',
    input: '<object data="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=="></object>',
  },
  {
    name: 'Embed element with javascript URI src',
    input: '<embed src="javascript:alert(1)">',
  },
  {
    name: 'Embed element with data SVG src',
    input: '<embed src="data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+PC9zdmc+">',
  },
  {
    name: 'Applet element injection',
    input: '<applet code="evil.class"></applet>',
  },
  {
    name: 'Frameset and frame injection',
    input: '<frameset><frame src="javascript:alert(1)"></frameset>',
  },
  {
    name: 'Portal element injection',
    input: '<portal src="http://evil.com"></portal>',
  },
  {
    name: 'Base tag hijacking base href',
    input: '<base href="http://evil.com/">',
  },
  {
    name: 'Meta refresh redirect to javascript URI',
    input: '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">',
  },
];

for (const tc of frameEmbedCases) {
  runTest('CAT-5: Frame/Embed/Object', tc.name, tc.input, (output) => {
    if (/<(?:iframe|object|embed|applet|frameset|frame|portal|base|meta)/i.test(output)) {
      return { pass: false, reason: `Embedded frame/object/base/meta survived sanitization: ${output}` };
    }
    return true;
  });
}

// ============================================================================
// 6. SAFE FORMATTING PRESERVATION (Legitimate Markdown Typography)
// ============================================================================
console.log('\n--- CATEGORY 6: Safe Formatting Preservation ---');

const safeFormattingCases = [
  {
    name: 'Headings h1 to h6 hierarchy',
    input: '<h1>Title 1</h1><h2>Title 2</h2><h3>Title 3</h3><h4>Title 4</h4><h5>Title 5</h5><h6>Title 6</h6>',
    validator: (output) => {
      for (let i = 1; i <= 6; i++) {
        if (!output.includes(`<h${i}>Title ${i}</h${i}>`)) {
          return { pass: false, reason: `Missing heading h${i}` };
        }
      }
      return true;
    },
  },
  {
    name: 'Text emphasis tags (strong, b, em, i, u, del, s, strike, mark, small)',
    input: '<p><strong>Bold1</strong> <b>Bold2</b> <em>Italic1</em> <i>Italic2</i> <u>Under</u> <del>Del</del> <s>S</s> <strike>Strike</strike> <mark>Mark</mark> <small>Small</small></p>',
    validator: (output) => {
      const tags = ['strong', 'b', 'em', 'i', 'u', 'del', 's', 'strike', 'mark', 'small'];
      for (const t of tags) {
        if (!output.includes(`<${t}>`)) {
          return { pass: false, reason: `Missing or stripped tag <${t}>` };
        }
      }
      return true;
    },
  },
  {
    name: 'Preformatted code block with language class and inline code',
    input: '<pre><code class="language-typescript">const answer: number = 42;</code></pre><p>Run <code>npm test</code> to verify.</p>',
    validator: (output) => {
      if (!output.includes('<pre><code class="language-typescript">const answer: number = 42;</code></pre>')) {
        return { pass: false, reason: 'Code block syntax altered' };
      }
      if (!output.includes('<code>npm test</code>')) {
        return { pass: false, reason: 'Inline code altered' };
      }
      return true;
    },
  },
  {
    name: 'Blockquote with paragraph',
    input: '<blockquote><p>Hardware testing is paramount for high reliability.</p></blockquote>',
    validator: (output) => {
      return output.includes('<blockquote><p>Hardware testing is paramount for high reliability.</p></blockquote>');
    },
  },
  {
    name: 'Unordered and Ordered lists with nested items',
    input: '<ul><li>Alpha</li><li>Beta<ul><li>Sub-Beta</li></ul></li></ul><ol><li>First</li><li>Second</li></ol>',
    validator: (output) => {
      return output.includes('<ul><li>Alpha</li><li>Beta<ul><li>Sub-Beta</li></ul></li></ul>') &&
             output.includes('<ol><li>First</li><li>Second</li></ol>');
    },
  },
  {
    name: 'Definition list (dl, dt, dd)',
    input: '<dl><dt>CPU</dt><dd>Central Processing Unit</dd></dl>',
    validator: (output) => {
      return output.includes('<dl><dt>CPU</dt><dd>Central Processing Unit</dd></dl>');
    },
  },
  {
    name: 'Data Table with thead, tbody, th scope, colspan, rowspan',
    input: '<table class="min-w-full"><thead><tr><th scope="col" colspan="2">Metric</th></tr></thead><tbody><tr><td rowspan="1">Latency</td><td>14ms</td></tr></tbody></table>',
    validator: (output) => {
      return output.includes('<table class="min-w-full">') &&
             output.includes('<th scope="col" colspan="2">Metric</th>') &&
             output.includes('rowspan="1"') &&
             output.includes('<td rowspan="1">Latency</td><td>14ms</td>');
    },
  },
  {
    name: 'External link with target="_blank" must enforce rel="noopener noreferrer"',
    input: '<a href="https://kernel.org" target="_blank">Linux Kernel Source</a>',
    validator: (output) => {
      if (!output.includes('href="https://kernel.org"')) return { pass: false, reason: 'href was lost' };
      if (!output.includes('target="_blank"')) return { pass: false, reason: 'target was lost' };
      if (!output.includes('rel="noopener noreferrer"')) return { pass: false, reason: 'Missing rel="noopener noreferrer" enforcement' };
      return true;
    },
  },
  {
    name: 'Internal relative link preservation',
    input: '<a href="/articles/hardware-deep-dive" class="font-bold">Read article</a>',
    validator: (output) => {
      return output.includes('href="/articles/hardware-deep-dive"') && output.includes('class="font-bold"');
    },
  },
  {
    name: 'Mailto and Tel schemes preservation',
    input: '<p><a href="mailto:security@graviblog.local">Security Team</a> or call <a href="tel:+18005550199">Hotline</a></p>',
    validator: (output) => {
      return output.includes('href="mailto:security@graviblog.local"') && output.includes('href="tel:+18005550199"');
    },
  },
  {
    name: 'Image tag with alt, title, dimensions, loading lazy and decoding async',
    input: '<img src="https://images.unsplash.com/photo-1518770660439-4636190af475" alt="Motherboard PCB" title="Microarchitecture" width="800" height="400" loading="lazy" decoding="async">',
    validator: (output) => {
      return output.includes('src="https://images.unsplash.com/photo-1518770660439-4636190af475"') &&
             output.includes('alt="Motherboard PCB"') &&
             output.includes('title="Microarchitecture"') &&
             output.includes('width="800"') &&
             output.includes('height="400"') &&
             output.includes('loading="lazy"') &&
             output.includes('decoding="async"');
    },
  },
  {
    name: 'Details and summary collapsible widget',
    input: '<details class="border"><summary class="cursor-pointer">Diagnostic Intel</summary><p>Status OK</p></details>',
    validator: (output) => {
      return output.includes('<details class="border">') &&
             output.includes('<summary class="cursor-pointer">Diagnostic Intel</summary>') &&
             output.includes('<p>Status OK</p>');
    },
  },
  {
    name: 'Semantic article and section elements with figure/figcaption',
    input: '<article><section><figure><img src="https://example.com/arch.png" alt="Arch"><figcaption>Figure 1: Pipeline</figcaption></figure></section></article>',
    validator: (output) => {
      return output.includes('<article><section><figure><img src="https://example.com/arch.png" alt="Arch"><figcaption>Figure 1: Pipeline</figcaption></figure></section></article>');
    },
  },
  {
    name: 'Horizontal rule and line break',
    input: '<p>Before</p><hr><p>After<br>Next line</p>',
    validator: (output) => {
      return output.includes('<p>Before</p><hr><p>After<br>Next line</p>');
    },
  },
  {
    name: 'Persian / RTL content with HTML markup',
    input: '<p dir="rtl">بررسی معماری سیستم و <strong>عملکرد پردازنده</strong> در شرایط <code>بار پردازشی بالا</code>.</p>',
    validator: (output) => {
      return output.includes('بررسی معماری سیستم') &&
             output.includes('<strong>عملکرد پردازنده</strong>') &&
             output.includes('<code>بار پردازشی بالا</code>');
    },
  },
];

for (const tc of safeFormattingCases) {
  runTest('CAT-6: Safe Formatting', tc.name, tc.input, tc.validator);
}

// ============================================================================
// 7. SSR RUNTIME STABILITY & BOUNDARY INPUTS
// ============================================================================
console.log('\n--- CATEGORY 7: SSR Runtime Stability & Boundary Inputs ---');

const ssrBoundaryCases = [
  {
    name: 'Null input safety',
    input: null,
    validator: (output) => output === '',
  },
  {
    name: 'Undefined input safety',
    input: undefined,
    validator: (output) => output === '',
  },
  {
    name: 'Empty string input safety',
    input: '',
    validator: (output) => output === '',
  },
  {
    name: 'Whitespace-only string input',
    input: '    \n\t   ',
    validator: (output) => typeof output === 'string',
  },
  {
    name: 'Number input coercion safety',
    input: 123456,
    validator: (output) => output === '',
  },
  {
    name: 'Object input coercion safety',
    input: { malicious: 'payload' },
    validator: (output) => output === '',
  },
  {
    name: 'Array input coercion safety',
    input: ['<script>alert(1)</script>'],
    validator: (output) => output === '',
  },
  {
    name: 'Boolean input coercion safety',
    input: true,
    validator: (output) => output === '',
  },
  {
    name: 'Deeply nested tags (100 levels)',
    input: '<div>'.repeat(100) + 'Deep Content' + '</div>'.repeat(100),
    validator: (output) => {
      return output.includes('Deep Content') && !/<script/i.test(output);
    },
  },
  {
    name: 'High volume mixed payload (100KB repeating markdown HTML)',
    input: '<p>Lorem ipsum dolor sit amet <strong>consectetur</strong> <a href="https://example.com">link</a></p>'.repeat(1200),
    validator: (output) => {
      return output.length > 50000 && output.includes('Lorem ipsum');
    },
  },
];

for (const tc of ssrBoundaryCases) {
  runTest('CAT-7: SSR & Boundary', tc.name, tc.input, tc.validator);
}

// ============================================================================
// SUMMARY & VERDICT
// ============================================================================
console.log('\n======================================================================');
console.log(`TOTAL TESTS:   ${totalTests}`);
console.log(`PASSED:        ${passedTests}`);
console.log(`FAILED:        ${failedTests}`);
console.log('======================================================================');

if (failedTests > 0) {
  console.error('\nVERDICT: VULNERABILITY_FOUND / INTEGRITY_COMPROMISED');
  console.error('Failed test details:');
  console.error(JSON.stringify(failures, null, 2));
  process.exit(1);
} else {
  console.log('\nVERDICT: CONFIRMED_SECURE');
  console.log('All adversarial stored XSS vectors neutralized.');
  console.log('Legitimate Markdown typography preserved.');
  console.log('SSR environment execution validated without window reference errors.\n');
  process.exit(0);
}
