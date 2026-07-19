export type LinkedInProfileData = {
  name: string;
  headline: string;
  company: string;
  experience: string;
  education: string;
};

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

  await waitForElement('main h1');

  const main = document.querySelector('main') ?? document;
  const nameElement = main.querySelector('h1');
  const intro = nameElement?.closest('section') ?? nameElement?.parentElement?.parentElement ?? main;

  const name = firstText(main, [
    'h1.text-heading-xlarge',
    'h1[data-anonymize="person-name"]',
    '.pv-text-details__left-panel h1',
    'h1.top-card-layout__title',
    'h1.break-words',
    'h1',
  ]);

  const headline = firstText(intro, [
    '.text-body-medium.break-words',
    '.pv-text-details__left-panel .text-body-medium',
    '.top-card-layout__headline',
    '[data-generated-suggestion-target]',
  ]);

  const experienceSection = findSection('experience', ['工作经历', 'Experience']);
  const educationSection = findSection('education', ['教育经历', '教育背景', 'Education']);
  const experienceData = extractSectionItems(experienceSection, ['工作经历', 'Experience']);
  const educationData = extractSectionItems(educationSection, ['教育经历', '教育背景', 'Education']);

  const companyFromIntro = firstText(intro, [
    'a[href*="/company/"] span[aria-hidden="true"]',
    'a[href*="/company/"]',
  ]);

  const companyFallback = experienceData.firstItemLines.find((line, index) => {
    if (index === 0) return false;
    const lower = line.toLowerCase();
    return (
      !/\b(?:19|20)\d{2}\b/.test(line) &&
      !lower.includes('个月') &&
      !lower.includes('年') &&
      !lower.includes('month') &&
      !lower.includes('year') &&
      !lower.includes('·')
    );
  }) ?? experienceData.firstItemLines[1] ?? '';

  const company = cleanText((companyFromIntro || companyFallback).split('·')[0]);
  const fallbackHeadline = experienceData.firstItemLines[0] ?? '';

  return {
    name,
    headline: headline || fallbackHeadline,
    company,
    experience: experienceData.text,
    education: educationData.text,
  };
}
