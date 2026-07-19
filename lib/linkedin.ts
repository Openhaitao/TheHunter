export type LinkedInProfileData = {
  name: string;
  headline: string;
  company: string;
  experience: string;
  education: string;
  contact: string;
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

  const titleName = cleanText(document.title)
    .replace(/^\(\d+\)\s*/, '')
    .replace(/\s*[|｜]\s*LinkedIn.*$/i, '')
    .split(/\s+[–—-]\s+/)[0]
    .trim();

  const extractContact = async () => {
    const findContactDialog = () =>
      Array.from(document.querySelectorAll('[role="dialog"]')).find((dialog) => {
        const text = cleanText(dialog.querySelector('h2')?.textContent ?? dialog.textContent).toLowerCase();
        return text.includes('联系方式') || text.includes('contact info');
      }) ?? null;

    let dialog = findContactDialog();
    let openedByExtractor = false;

    if (!dialog) {
      const contactLink = document.querySelector<HTMLAnchorElement>(
        'a[href*="/overlay/contact-info/"]',
      );
      if (contactLink) {
        contactLink.click();
        openedByExtractor = true;
        await waitForElement('[role="dialog"]', 3500);
        dialog = findContactDialog();
      }
    }

    if (!dialog) return '';

    const unique = (values: string[]) => Array.from(new Set(values.filter(Boolean)));
    const emails = unique(
      Array.from(dialog.querySelectorAll<HTMLAnchorElement>('a[href^="mailto:"]')).map((link) =>
        cleanText(decodeURIComponent(link.href.replace(/^mailto:/i, '').split('?')[0])),
      ),
    );
    const phones = unique(
      Array.from(dialog.querySelectorAll<HTMLAnchorElement>('a[href^="tel:"]')).map((link) =>
        cleanText(decodeURIComponent(link.href.replace(/^tel:/i, ''))),
      ),
    );
    const websites = unique(
      Array.from(dialog.querySelectorAll<HTMLAnchorElement>('a[href^="http"]'))
        .map((link) => link.href)
        .filter((href) => !href.includes('linkedin.com/in/')),
    );

    if (openedByExtractor) {
      const dismiss = dialog.querySelector<HTMLElement>(
        'button[aria-label*="关闭"], button[aria-label*="Dismiss"], .artdeco-modal__dismiss',
      );
      dismiss?.click();
    }

    return [
      ...emails.map((value) => `邮箱: ${value}`),
      ...phones.map((value) => `电话: ${value}`),
      ...websites.map((value) => `网站: ${value}`),
    ].join('\n');
  };

  await waitForElement('main');

  const main = document.querySelector('main') ?? document.documentElement;
  const nameElement = document.querySelector('h1.text-heading-xlarge, h1[data-anonymize="person-name"], main h1');
  const intro =
    nameElement?.closest('section') ??
    document.querySelector('a[href*="/overlay/contact-info/"]')?.closest('section') ??
    main.querySelector('section') ??
    main;

  const name = firstText(document, [
    'h1.text-heading-xlarge',
    'h1[data-anonymize="person-name"]',
    '.pv-text-details__left-panel h1',
    'h1.top-card-layout__title',
    'h1.break-words',
    'main h1',
  ]) || titleName;

  let headline = firstText(intro, [
    '.text-body-medium.break-words',
    '.pv-text-details__left-panel .text-body-medium',
    '.top-card-layout__headline',
    '[data-generated-suggestion-target]',
  ]);

  if (!headline) {
    const introLines = cleanLines(intro, [name, '联系方式', 'Contact info']);
    const nameIndex = introLines.findIndex((line) => line === name);
    const candidates = nameIndex >= 0 ? introLines.slice(nameIndex + 1) : introLines;
    headline = candidates.find((line) => {
      const lower = line.toLowerCase();
      return (
        line.length > 2 &&
        line.length < 220 &&
        !lower.includes('位好友') &&
        !lower.includes('connections') &&
        !lower.includes('followers') &&
        !lower.includes('共同好友') &&
        !lower.includes('contact info') &&
        line !== '联系方式'
      );
    }) ?? '';
  }

  const experienceSection = findSection('experience', ['工作经历', 'Experience']);
  const educationSection = findSection('education', ['教育经历', '教育背景', 'Education']);
  const experienceData = extractSectionItems(experienceSection, ['工作经历', 'Experience']);
  const educationData = extractSectionItems(educationSection, ['教育经历', '教育背景', 'Education']);

  const companyFromIntro = firstText(intro, [
    'a[href*="/company/"] span[aria-hidden="true"]',
    'a[href*="/company/"]',
  ]);
  const firstExperienceItem = experienceSection?.querySelector('li') ?? null;
  const companyFromExperience = firstExperienceItem
    ? firstText(firstExperienceItem, [
        'a[href*="/company/"] span[aria-hidden="true"]',
        'a[href*="/company/"]',
        '.t-14.t-normal:not(.t-black--light) span[aria-hidden="true"]',
      ])
    : '';

  const company = cleanText((companyFromIntro || companyFromExperience).split('·')[0]);
  const contact = await extractContact();

  return {
    name,
    headline,
    company,
    experience: experienceData.text,
    education: educationData.text,
    contact,
  };
}
