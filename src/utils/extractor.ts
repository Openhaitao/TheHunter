export const getPageContent = () => {
  // This function will be executed in the context of the web page
  const title = document.title;
  const url = window.location.href;
  
  // Try to extract key information from common selectors (LinkedIn, etc.)
  let keyInfo = '';
  
  // LinkedIn specific selectors - 优先提取关键信息
  try {
    // Try to find name - 多种选择器尝试
    const nameSelectors = [
      'h1.text-heading-xlarge',
      'h1[data-anonymize="person-name"]',
      '.pv-text-details__left-panel h1',
      'h1.top-card-layout__title',
      'main h1',
      'h1.break-words'
    ];
    for (const selector of nameSelectors) {
      const nameEl = document.querySelector(selector);
      if (nameEl && nameEl.textContent && nameEl.textContent.trim().length > 0) {
        const nameText = nameEl.textContent.trim();
        // 过滤掉明显不是姓名的内容
        if (nameText.length < 100 && !nameText.includes('{') && !nameText.includes('urn:')) {
          keyInfo += `姓名: ${nameText}\n`;
          break;
        }
      }
    }
    
    // Try to find headline/title
    const headlineSelectors = [
      '.text-body-medium.break-words',
      '.pv-text-details__left-panel .text-body-medium',
      '.top-card-layout__headline',
      '[data-generated-suggestion-target]',
      '.ph5.pb5 h2'
    ];
    for (const selector of headlineSelectors) {
      const headlineEl = document.querySelector(selector);
      if (headlineEl && headlineEl.textContent) {
        const headlineText = headlineEl.textContent.trim();
        if (headlineText.length > 0 && headlineText.length < 500 && !headlineText.includes('urn:')) {
          keyInfo += `职位: ${headlineText}\n`;
          break;
        }
      }
    }
    
    // Try to find about section
    const aboutSelectors = [
      '#about ~ .pvs-list__outer-container',
      '.pv-about-section .pv-about__summary-text',
      '[data-section="summary"] .pv-about__summary-text',
      'section[data-section="summary"]',
      '#about ~ section'
    ];
    for (const selector of aboutSelectors) {
      const aboutEl = document.querySelector(selector);
      if (aboutEl) {
        const aboutText = aboutEl.textContent?.trim() || '';
        if (aboutText.length > 0 && aboutText.length < 2000 && !aboutText.includes('urn:')) {
          keyInfo += `简介: ${aboutText}\n`;
          break;
        }
      }
    }
    
    // Try to find experience section
    const expSelectors = [
      '#experience ~ .pvs-list__outer-container',
      '[data-section="experience"]',
      'section[data-section="experience"]',
      '#experience ~ section'
    ];
    for (const selector of expSelectors) {
      const expEl = document.querySelector(selector);
      if (expEl) {
        const expText = expEl.textContent?.trim() || '';
        if (expText.length > 0 && expText.length < 3000 && !expText.includes('urn:')) {
          keyInfo += `工作经历: ${expText.substring(0, 2000)}\n`;
          break;
        }
      }
    }
    
    // Try to find education section
    const eduSelectors = [
      '#education ~ .pvs-list__outer-container',
      '[data-section="education"]',
      'section[data-section="education"]',
      '#education ~ section'
    ];
    for (const selector of eduSelectors) {
      const eduEl = document.querySelector(selector);
      if (eduEl) {
        const eduText = eduEl.textContent?.trim() || '';
        if (eduText.length > 0 && eduText.length < 1500 && !eduText.includes('urn:')) {
          keyInfo += `教育背景: ${eduText.substring(0, 1000)}\n`;
          break;
        }
      }
    }
  } catch (e) {
    console.log('Error extracting key info:', e);
  }
  
  // 获取页面可见文本内容
  let visibleText = '';
  try {
    // 尝试从 main 元素获取内容
    const mainEl = document.querySelector('main');
    if (mainEl) {
      visibleText = mainEl.innerText || mainEl.textContent || '';
    } else {
      // 如果没有 main，从 body 获取
      const clone = document.body.cloneNode(true) as HTMLElement;
      
      // Remove scripts, styles, and hidden elements
      const scripts = clone.getElementsByTagName('script');
      const styles = clone.getElementsByTagName('style');
      const noscripts = clone.getElementsByTagName('noscript');
      
      const toRemove = [
        ...Array.from(scripts), 
        ...Array.from(styles), 
        ...Array.from(noscripts)
      ];
      
      toRemove.forEach(el => el.parentNode?.removeChild(el));
      
      visibleText = clone.innerText || clone.textContent || '';
    }
    
    // 清理文本：移除 JSON 数据、过滤掉包含特殊标记的内容
    visibleText = visibleText
      .split('\n')
      .filter(line => {
        const trimmed = line.trim();
        // 过滤掉 JSON 数据、LinkedIn 内部数据
        return trimmed.length > 0 && 
               !trimmed.includes('urn:li:') && 
               !trimmed.includes('$type') &&
               !trimmed.includes('lixTracking') &&
               !trimmed.includes('entityUrn') &&
               !trimmed.startsWith('{') &&
               !trimmed.startsWith('[') &&
               trimmed.length < 500; // 过滤掉超长行（可能是 JSON）
      })
      .join('\n');
    
    // Replace multiple newlines/spaces with single ones
    visibleText = visibleText.replace(/\s+/g, ' ').trim();
  } catch (e) {
    console.log('Error extracting visible text:', e);
  }
  
  // 组合关键信息和可见文本
  let finalContent = '';
  if (keyInfo) {
    finalContent = keyInfo + '\n\n完整页面内容:\n' + visibleText;
  } else {
    finalContent = visibleText;
  }
  
  // 限制长度
  if (finalContent.length > 20000) {
    finalContent = finalContent.substring(0, 20000) + '\n...(内容已截断)';
  }

  return {
    title,
    url,
    content: finalContent
  };
};

