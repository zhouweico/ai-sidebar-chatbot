// 内容脚本 - 固定侧边栏版本
import './content.css';

// 插件状态管理
let pluginState = {
  selectionToolbar: null,
  isTextSelectionEnabled: true,
  selectionListenersAdded: false,
  selectionTimeout: null,
  onMouseUpHandler: null,
  onDocClickHandler: null,
  onKeyDownHandler: null,
  onSelectionChangeHandler: null,
  onScrollHandler: null
};

// 初始化插件
function initPlugin() {
  loadSettings();
  setupTextSelection();
  setupMessageListener();
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'sync' && changes.settings) {
      const s = changes.settings.newValue || {};
      pluginState.isTextSelectionEnabled = !!s.enableTextSelection;
      pluginState.isSidebarEnabled = !!s.enableSidebar;
      applySettings();
    }
  });
}

// 加载设置
function loadSettings() {
  chrome.runtime.sendMessage({ action: 'getSettings' }, (settings) => {
    if (settings) {
      pluginState.isTextSelectionEnabled = settings.enableTextSelection;

      applySettings();
    }
  });
}

// 设置文本选择功能
function setupTextSelection() {
  if (!pluginState.selectionToolbar) {
    createSelectionToolbar();
  }
  if (pluginState.isTextSelectionEnabled) {
    addSelectionListeners();
  }
}

function addSelectionListeners() {
  if (pluginState.selectionListenersAdded) return;
  pluginState.onMouseUpHandler = (e) => {
    if (!pluginState.isTextSelectionEnabled) return;
    // 检查是否点击在工具栏上，如果是则不隐藏工具栏
    if (e.target && e.target.closest && e.target.closest('#ai-selection-toolbar')) {
      return;
    }
    clearTimeout(pluginState.selectionTimeout);
    pluginState.selectionTimeout = setTimeout(() => {
      const selection = window.getSelection();
      const selectedText = selection.toString().trim();
      if (!pluginState.isTextSelectionEnabled) return;
      if (selectedText.length > 0) {
        showSelectionToolbar(e, selectedText);
      } else {
        hideSelectionToolbar();
      }
    }, 100);
  };
  pluginState.onDocClickHandler = (e) => {
    if (!e.target.closest('#ai-selection-toolbar')) {
      hideSelectionToolbar();
    }
  };
  document.addEventListener('mouseup', pluginState.onMouseUpHandler);
  document.addEventListener('click', pluginState.onDocClickHandler);
  pluginState.onKeyDownHandler = (ev) => {
    if (ev.key === 'Escape') hideSelectionToolbar();
  };
  pluginState.onSelectionChangeHandler = () => {
    const s = window.getSelection();
    if (!s || !s.toString().trim()) hideSelectionToolbar();
  };
  pluginState.onScrollHandler = () => hideSelectionToolbar();
  document.addEventListener('keydown', pluginState.onKeyDownHandler);
  document.addEventListener('selectionchange', pluginState.onSelectionChangeHandler);
  window.addEventListener('scroll', pluginState.onScrollHandler, { passive: true });
  pluginState.selectionListenersAdded = true;
}

function removeSelectionListeners() {
  if (!pluginState.selectionListenersAdded) return;
  if (pluginState.onMouseUpHandler) {
    document.removeEventListener('mouseup', pluginState.onMouseUpHandler);
  }
  if (pluginState.onDocClickHandler) {
    document.removeEventListener('click', pluginState.onDocClickHandler);
  }
  if (pluginState.onKeyDownHandler) {
    document.removeEventListener('keydown', pluginState.onKeyDownHandler);
  }
  if (pluginState.onSelectionChangeHandler) {
    document.removeEventListener('selectionchange', pluginState.onSelectionChangeHandler);
  }
  if (pluginState.onScrollHandler) {
    window.removeEventListener('scroll', pluginState.onScrollHandler);
  }
  pluginState.selectionListenersAdded = false;
  hideSelectionToolbar();
}

function applySettings() {
  if (pluginState.isTextSelectionEnabled) {
    addSelectionListeners();
  } else {
    removeSelectionListeners();
  }
}

// 显示选中文本工具栏
function showSelectionToolbar(evt, text) {
  if (!pluginState.isTextSelectionEnabled) return;

  if (!pluginState.selectionToolbar) {
    createSelectionToolbar();
  }

  const toolbar = pluginState.selectionToolbar;
  let left = 0;
  let top = 0;
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    let rect = null;
    try {
      const { focusNode, focusOffset } = sel;
      if (focusNode) {
        const r = document.createRange();
        const maxOffset = (focusNode.nodeType === Node.TEXT_NODE)
          ? (focusNode.textContent ? focusNode.textContent.length : 0)
          : (focusNode.childNodes ? focusNode.childNodes.length : 0);
        const safeOffset = Math.min(Math.max(focusOffset || 0, 0), maxOffset);
        r.setStart(focusNode, safeOffset);
        r.collapse(true);
        rect = r.getBoundingClientRect();
      }
    } catch (e) {
      rect = null;
    }

    if (!rect || (!rect.width && !rect.height)) {
      try { rect = sel.getRangeAt(sel.rangeCount - 1).getBoundingClientRect(); } catch { rect = null; }
    }
    const activeEl = document.activeElement;
    const isInput = activeEl && (activeEl.tagName === 'TEXTAREA' || (activeEl.tagName === 'INPUT' && (!activeEl.type || ['text', 'search', 'url', 'tel', 'email', 'password'].includes(activeEl.type))));
    if ((!rect || (!rect.width && !rect.height)) && isInput) {
      try {
        const el = activeEl;
        const mirror = document.createElement('div');
        const cs = window.getComputedStyle(el);
        const copy = ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'letterSpacing', 'lineHeight', 'textTransform', 'textIndent', 'wordSpacing', 'boxSizing', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth'];
        copy.forEach(p => { mirror.style[p] = cs[p]; });
        mirror.style.whiteSpace = el.tagName === 'TEXTAREA' ? 'pre-wrap' : 'pre';
        mirror.style.wordWrap = 'break-word';
        mirror.style.position = 'absolute';
        mirror.style.visibility = 'hidden';
        mirror.style.left = '0';
        mirror.style.top = '0';
        mirror.style.width = el.clientWidth + 'px';
        const end = el.selectionEnd || 0;
        const textForMeasure = (el.value || '').slice(0, end);
        mirror.textContent = textForMeasure;
        const span = document.createElement('span');
        span.textContent = '\u200b';
        mirror.appendChild(span);
        document.body.appendChild(mirror);
        const caretLeft = span.offsetLeft;
        const caretTop = span.offsetTop;
        document.body.removeChild(mirror);
        const elRect = el.getBoundingClientRect();
        const l = elRect.left + caretLeft - (el.scrollLeft || 0);
        const t = elRect.top + caretTop - (el.scrollTop || 0);
        rect = { left: l, top: t, right: l, bottom: t, width: 0, height: 0 };
      } catch { }
    }

    const margin = 8;
    toolbar.style.left = `-9999px`;
    toolbar.style.top = `-9999px`;
    toolbar.style.display = 'block';
    toolbar.style.visibility = 'hidden';
    const tbw = toolbar.offsetWidth || 120;
    const tbh = toolbar.offsetHeight || 36;
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    if (rect) {
      left = rect.left;
      // 输入框内使用元素边界作为锚点，避免覆盖输入区域
      const activeEl = document.activeElement;
      const isInput = activeEl && (activeEl.tagName === 'TEXTAREA' || (activeEl.tagName === 'INPUT' && (!activeEl.type || ['text', 'search', 'url', 'tel', 'email', 'password'].includes(activeEl.type))));
      const elRect = isInput ? activeEl.getBoundingClientRect() : null;
      const anchorBottom = isInput && elRect ? elRect.bottom : rect.bottom;
      const anchorTop = isInput && elRect ? elRect.top : rect.top;
      const below = anchorBottom + margin;
      const above = anchorTop - tbh - margin;
      top = (below + tbh + margin <= vh) ? below : Math.max(margin, above);

      if (left + tbw + margin > vw) left = Math.max(margin, vw - tbw - margin);
      if (left < margin) left = margin;
      if (top + tbh + margin > vh) top = Math.max(margin, vh - tbh - margin);
    } else {
      left = evt.clientX;
      top = Math.max(8, evt.clientY - 50);
    }
  } else {
    left = evt.clientX;
    top = Math.max(8, evt.clientY - 50);
  }
  toolbar.style.left = `${left}px`;
  toolbar.style.top = `${top}px`;
  toolbar.style.display = 'block';
  toolbar.style.visibility = 'visible';
  toolbar.dataset.selectedText = text;
}

// 隐藏选中文本工具栏
function hideSelectionToolbar() {
  if (pluginState.selectionToolbar) {
    pluginState.selectionToolbar.style.display = 'none';
  }
}

// 创建选中文本工具栏
function createSelectionToolbar() {
  const toolbar = document.createElement('div');
  toolbar.id = 'ai-selection-toolbar';
  const brandUrl = chrome.runtime.getURL('icons/32.png');
  toolbar.innerHTML = `
    <div class="selection-toolbar">
      <div class="toolbar-brand" title="AI Sidebar Chatbot">
        <img class="brand-icon" src="${brandUrl}" alt="AI" />
        <span class="brand-divider"></span>
      </div>
      <button class="toolbar-btn" data-action="summary">
        <span class="btn-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2l3 7h7l-5.5 4 2.5 7L12 17 5 20l2.5-7L2 9h7z"/>
          </svg>
        </span>
        <span class="btn-label">AI解读</span>
      </button>
      <button class="toolbar-btn" data-action="translate">
        <span class="btn-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12H19"/>
            <path d="M12 5V19"/>
            <path d="M7 7L5 5"/>
            <path d="M17 7L19 5"/>
            <path d="M7 17L5 19"/>
            <path d="M17 17L19 19"/>
          </svg>
        </span>
        <span class="btn-label">翻译</span>
      </button>
      <button class="toolbar-btn" data-action="addToConversation">
        <span class="btn-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H8l-5 5V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            <path d="M12 8v6"/>
            <path d="M9 11h6"/>
          </svg>
        </span>
        <span class="btn-label">添加到对话</span>
      </button>
      <button class="toolbar-btn" data-action="copy">
        <span class="btn-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2"/>
            <rect x="2" y="2" width="13" height="13" rx="2"/>
          </svg>
        </span>
        <span class="btn-label">复制</span>
      </button>
      <button class="toolbar-btn caret" data-action="more">
        <span class="btn-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </span>
      </button>
    </div>
  `;

  toolbar.style.cssText = `
    position: fixed;
    z-index: 999998;
    display: none;
  `;

  // 添加按钮点击事件
  toolbar.addEventListener('click', (e) => {
    e.stopPropagation(); // 阻止事件冒泡到文档级别
    const btn = e.target.closest('.toolbar-btn');
    if (btn) {
      const action = btn.dataset.action;
      const text = toolbar.dataset.selectedText;

      if (action === 'copy') {
        if (text) {
          navigator.clipboard.writeText(text).catch(() => { });
        }
        setTimeout(() => hideSelectionToolbar(), 600);
        return;
      }

      if (action === 'addToConversation') {
        chrome.runtime.sendMessage({ action: 'openSidePanel' });
        setTimeout(() => {
          chrome.runtime.sendMessage({
            action: 'processSelectedText',
            data: { type: 'chat', text: text }
          });
        }, 500);
        hideSelectionToolbar();
        return;
      }

      chrome.runtime.sendMessage({ action: 'openSidePanel' });
      setTimeout(() => {
        chrome.runtime.sendMessage({
          action: 'processSelectedText',
          data: { type: action, text: text }
        });
      }, 500);

      hideSelectionToolbar();
    }
  });

  document.body.appendChild(toolbar);
  pluginState.selectionToolbar = toolbar;
}

// 设置消息监听器
function setupMessageListener() {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
      case 'getPageContent':
        // 立即响应页面内容请求
        sendResponse(getPageContent());
        break;
      case 'summaryPage':
        handlePageSummary();
        break;
      case 'chatWithSelection':
        handleTextChat(request.text);
        break;
      case 'reloadSettings':
        loadSettings();
        break;
    }
    return true; // 保持消息通道开放以进行异步响应
  });
}

// 处理页面总结
function handlePageSummary() {
  const pageContent = getPageContent();

  // 打开侧边栏
  chrome.runtime.sendMessage({ action: 'openSidePanel' });

  // 发送数据到侧边栏
  setTimeout(() => {
    chrome.runtime.sendMessage({
      action: 'processPageSummary',
      data: pageContent
    });
  }, 500);
}

// 处理文本对话
function handleTextChat(text) {
  // 打开侧边栏
  chrome.runtime.sendMessage({ action: 'openSidePanel' });

  // 发送数据到侧边栏
  setTimeout(() => {
    chrome.runtime.sendMessage({
      action: 'processSelectedText',
      data: { type: 'chat', text: text }
    });
  }, 500);
}

// 获取页面内容
function getPageContent() {
  // 移除脚本和样式标签
  const content = document.body.cloneNode(true);
  const scripts = content.querySelectorAll('script, style, nav, footer, aside');
  scripts.forEach(el => el.remove());

  // 获取主要文本内容
  const textContent = content.textContent || '';
  const title = document.title;
  const url = window.location.href;

  return {
    title,
    url,
    content: textContent.trim().substring(0, 5000) // 限制长度
  };
}

// 初始化插件
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPlugin);
} else {
  initPlugin();
}