export type LinkedInProfileData = {
  name: string;
  headline: string;
  company: string;
  experience: string;
  education: string;
};

export function collectLinkedInDebugSnapshot() {
  const clean = (value: string | null | undefined) =>
    (value ?? '').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').trim();
  const describe = (selector: string, root: ParentNode = document, limit = 6) =>
    Array.from(root.querySelectorAll(selector)).slice(0, limit).map((element) => ({
      tag: element.tagName.toLowerCase(),
      class: clean(element.getAttribute('class')).slice(0, 300),
      href: element instanceof HTMLAnchorElement ? element.href : '',
      text: clean((element as HTMLElement).innerText || element.textContent).slice(0, 600),
    }));

  const nameElement = document.querySelector(
    'h1.text-heading-xlarge, h1[data-anonymize="person-name"], .pv-text-details__left-panel h1, h1.top-card-layout__title, h1.break-words, main h1',
  );
  const intro =
    nameElement?.closest('section') ??
    nameElement?.closest('.artdeco-card') ??
    nameElement?.parentElement?.parentElement ??
    null;
  const experience = document.getElementById('experience')?.closest('section') ?? null;
  const semanticMarkers = (labels: string[], detailsPath: string) => {
    const seeds = [
      ...Array.from(document.querySelectorAll<HTMLElement>(`a[href*="${detailsPath}"]`)),
      ...Array.from(document.querySelectorAll<HTMLElement>('main *')).filter((element) => {
        if (element.children.length > 0) return false;
        const text = clean(element.innerText || element.textContent).toLowerCase();
        return labels.some((label) => text === label.toLowerCase());
      }),
    ].slice(0, 4);

    return seeds.map((seed) => {
      const ancestry = [];
      let node: HTMLElement | null = seed;
      for (let depth = 0; node && depth < 8; depth += 1, node = node.parentElement) {
        ancestry.push({
          tag: node.tagName.toLowerCase(),
          class: clean(node.className).slice(0, 220),
          href: node instanceof HTMLAnchorElement ? node.href : '',
          text: clean(node.innerText || node.textContent).slice(0, 1800),
        });
      }
      return ancestry;
    });
  };

  return JSON.stringify({
    capturedAt: new Date().toISOString(),
    url: location.href,
    title: document.title,
    nameCandidates: describe('h1'),
    headlineCandidates: describe(
      '.text-body-medium.break-words, .pv-text-details__left-panel .text-body-medium, .top-card-layout__headline, [data-generated-suggestion-target]',
      intro ?? document,
    ),
    companyCandidates: describe(
      'a[href*="/company/"], .pv-text-details__right-panel-item-text, .pv-text-details__right-panel-item',
      intro ?? document,
      24,
    ),
    introText: clean((intro as HTMLElement | null)?.innerText).slice(0, 3000),
    experienceText: clean((experience as HTMLElement | null)?.innerText).slice(0, 3000),
    experienceLinks: describe('a', experience ?? document).filter((item) => item.href),
    experienceStructure: semanticMarkers(['工作经历', 'Experience'], '/details/experience/'),
    educationStructure: semanticMarkers(
      ['教育经历', '教育背景', 'Education'],
      '/details/education/',
    ),
    contactLinks: [
      ...describe('a[href*="/overlay/contact-info/"]'),
      ...describe('button, [role="button"], a').filter((item) =>
        /^(联系方式|contact info)$/i.test(item.text),
      ),
    ],
    dialogs: describe('[role="dialog"]'),
  }, null, 2);
}

export async function extractLinkedInProfileFromPage(): Promise<LinkedInProfileData> {
  const waitForElement = (selector: string, timeoutMs = 5000) =>
    new Promise<Element | null>((resolve) => {
      const existing = document.querySelector(selector);
      if (existing) {
        resolve(existing);
        return;
      }

      const observer = new MutationObserver(() => {
        const element = document.querySelector(selector);
        if (!element) return;
        observer.disconnect();
        window.clearTimeout(timeout);
        resolve(element);
      });

      const timeout = window.setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeoutMs);

      observer.observe(document.documentElement, { childList: true, subtree: true });
    });

  const cleanText = (value: string | null | undefined) =>
    (value ?? '').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').trim();

  const cleanLines = (element: Element | null, excluded: string[] = []) => {
    if (!element) return [];

    const excludedSet = new Set(excluded.map((item) => item.toLowerCase()));
    const lines = (element as HTMLElement).innerText
      .split('\n')
      .map(cleanText)
      .filter((line) => {
        const lower = line.toLowerCase();
        return (
          line.length > 0 &&
          line.length < 500 &&
          !excludedSet.has(lower) &&
          !lower.startsWith('显示全部') &&
          !lower.startsWith('show all') &&
          !line.includes('urn:li:')
        );
      });

    return lines.filter((line, index) => line !== lines[index - 1]);
  };

  const firstText = (root: ParentNode, selectors: string[]) => {
    for (const selector of selectors) {
      const element = root.querySelector(selector);
      const value = cleanText(element?.textContent);
      if (value && value.length < 300 && !value.includes('urn:')) return value;
    }
    return '';
  };

  const findSection = (anchorId: string, labels: string[]) => {
    const anchor = document.getElementById(anchorId);
    const anchoredSection = anchor?.closest('section');
    if (anchoredSection) return anchoredSection;

    const siblingContainer = document.querySelector(`#${anchorId} ~ .pvs-list__outer-container`);
    if (siblingContainer) return siblingContainer;

    return Array.from(document.querySelectorAll('main section')).find((section) => {
      const heading = cleanText(section.querySelector('h2')?.textContent).toLowerCase();
      return labels.some((label) => heading === label.toLowerCase());
    }) ?? null;
  };

  const extractSectionItems = (section: Element | null, labels: string[]) => {
    if (!section) return { text: '', firstItemLines: [] as string[] };

    const listItems = Array.from(section.querySelectorAll('li')).filter(
      (item) => !item.parentElement?.closest('li'),
    );

    const itemLines = listItems
      .map((item) => cleanLines(item, labels))
      .filter((lines) => lines.length > 0)
      .slice(0, 20);

    if (itemLines.length > 0) {
      return {
        text: itemLines.map((lines) => lines.join('\n')).join('\n\n').slice(0, 6000),
        firstItemLines: itemLines[0],
      };
    }

    const fallbackLines = cleanLines(section, labels);
    return {
      text: fallbackLines.join('\n').slice(0, 6000),
      firstItemLines: fallbackLines,
    };
  };

  const titleName = cleanText(document.title)
    .replace(/^\(\d+\)\s*/, '')
    .replace(/\s*[|｜]\s*LinkedIn.*$/i, '')
    .split(/\s+[–—-]\s+/)[0]
    .trim();

  await waitForElement('main');

  const main = document.querySelector('main') ?? document.documentElement;
  const profilePath = location.pathname.replace(/\/overlay\/contact-info\/?$/, '/');
  const identityAnchor = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]')).find(
    (anchor) => {
      try {
        const url = new URL(anchor.href, location.href);
        return url.hostname.endsWith('linkedin.com') &&
          url.pathname.replace(/\/$/, '') === profilePath.replace(/\/$/, '') &&
          cleanLines(anchor).length >= 2;
      } catch {
        return false;
      }
    },
  );
  const identityLines = cleanLines(identityAnchor ?? null);
  const isDateLine = (line: string) => /(?:19|20)\d{2}|\bpresent\b|至今/i.test(line);
  const hasDateOrDuration = (line: string) =>
    isDateLine(line) || /个月|\bmonths?\b|\byears?\b/i.test(line);
  const findSemanticContainer = (labels: string[], detailsPath: string) => {
    const detailsLink = document.querySelector<HTMLElement>(`a[href*="${detailsPath}"]`);
    const labelElement = Array.from(document.querySelectorAll<HTMLElement>('main *')).find(
      (element) => {
        if (element.children.length > 0) return false;
        const text = cleanText(element.innerText || element.textContent).toLowerCase();
        return labels.some((label) => text === label.toLowerCase());
      },
    );

    for (const seed of [detailsLink, labelElement]) {
      let node = seed;
      while (node && node !== main) {
        const lines = cleanLines(node, labels);
        if (lines.length >= 3 && lines.some(hasDateOrDuration)) return node;
        node = node.parentElement;
      }
    }
    return null;
  };

  let semanticExperienceContainer = findSemanticContainer(
    ['工作经历', 'Experience'],
    '/details/experience/',
  );
  let semanticEducationContainer = findSemanticContainer(
    ['教育经历', '教育背景', 'Education'],
    '/details/education/',
  );

  if (!semanticExperienceContainer || !semanticEducationContainer) {
    const originalScrollY = window.scrollY;
    const scrollHeight = document.documentElement.scrollHeight;
    for (const ratio of [0.35, 0.65, 1]) {
      window.scrollTo({ top: scrollHeight * ratio, behavior: 'auto' });
      await new Promise((resolve) => window.setTimeout(resolve, 180));
      semanticExperienceContainer ??= findSemanticContainer(
        ['工作经历', 'Experience'],
        '/details/experience/',
      );
      semanticEducationContainer ??= findSemanticContainer(
        ['教育经历', '教育背景', 'Education'],
        '/details/education/',
      );
      if (semanticExperienceContainer && semanticEducationContainer) break;
    }
    window.scrollTo({ top: originalScrollY, behavior: 'auto' });
  }

  const semanticExperienceLines = cleanLines(semanticExperienceContainer, [
    '工作经历',
    'Experience',
  ]);
  const latestJob = (() => {
    if (!semanticExperienceContainer) return null;

    for (const companyLink of semanticExperienceContainer.querySelectorAll<HTMLAnchorElement>(
      'a[href*="/company/"]',
    )) {
      const linkLines = cleanLines(companyLink);
      if (linkLines.length === 0) continue;

      let jobBlock: Element | null = companyLink;
      while (jobBlock && jobBlock !== semanticExperienceContainer) {
        const blockLines = cleanLines(jobBlock);
        if (blockLines.length >= 3 && blockLines.some(hasDateOrDuration)) break;
        jobBlock = jobBlock.parentElement;
      }

      const lines = cleanLines(jobBlock ?? companyLink);
      const companyAndType = lines.find((line, index) => {
        if (index === 0 || !line.includes('·')) return false;
        return !hasDateOrDuration(line);
      });
      const company = companyAndType
        ? cleanText(companyAndType.split('·')[0])
        : linkLines.find((line) => !hasDateOrDuration(line) && !line.includes('·')) ?? '';
      const firstDateIndex = lines.findIndex(isDateLine);
      const beforeDate = firstDateIndex > 0 ? lines.slice(0, firstDateIndex) : lines;
      const title = [...beforeDate].reverse().find((line) => {
        if (line === company || line === companyAndType || hasDateOrDuration(line)) return false;
        return !/^(全职|兼职|实习|合同|自雇|full[- ]time|part[- ]time|internship|contract)$/i.test(line);
      }) ?? '';

      if (title && company && lines.some(hasDateOrDuration)) return { title, company };
    }
    return null;
  })();
  const name = firstText(document, [
    'h1.text-heading-xlarge',
    'h1[data-anonymize="person-name"]',
    '.pv-text-details__left-panel h1',
    'h1.top-card-layout__title',
    'h1.break-words',
    'main h1',
  ]) || identityLines[0] || titleName;
  const headline = latestJob?.title ?? '';

  const experienceSection = findSection('experience', ['工作经历', 'Experience']);
  const educationSection = findSection('education', ['教育经历', '教育背景', 'Education']);
  const experienceData = extractSectionItems(experienceSection, ['工作经历', 'Experience']);
  const educationData = extractSectionItems(educationSection, ['教育经历', '教育背景', 'Education']);

  const company = latestJob?.company ?? '';
  const semanticExperience = semanticExperienceLines.join('\n').slice(0, 6000);
  const semanticEducation = cleanLines(semanticEducationContainer, [
    '教育经历',
    '教育背景',
    'Education',
  ]).join('\n').slice(0, 6000);

  return {
    name,
    headline,
    company,
    experience: semanticExperience || experienceData.text,
    education: semanticEducation || educationData.text,
  };
}
