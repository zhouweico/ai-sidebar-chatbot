// 后台服务脚本 - 固定侧边栏版本

// 验证Dify API密钥的函数
async function validateDifyApiKey(endpoint, apiKey) {
  try {
    // 标准化endpoint格式
    let cleanEndpoint = endpoint.trim();

    // 确保endpoint以正确的格式结尾
    if (!cleanEndpoint.endsWith('/v1')) {
      if (cleanEndpoint.endsWith('/')) {
        cleanEndpoint = cleanEndpoint + 'v1';
      } else {
        cleanEndpoint = cleanEndpoint + '/v1';
      }
    }

    // 首先尝试简单的GET请求到applications端点
    let apiUrl = `${cleanEndpoint}/applications`;
    console.log('验证应用:', apiUrl);

    let response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      return { valid: true, message: 'API 密钥有效' };
    }

    // 如果applications端点失败，尝试chat-messages端点
    if (response.status === 404 || response.status === 405) {
      console.log('应用端点失败，尝试chat-messages端点');
      apiUrl = `${cleanEndpoint}/chat-messages`;
      console.log('验证应用:', apiUrl);

      const requestBody = {
        inputs: {},
        query: "Hello, this is a test message from AI Sidebar Chatbot",
        response_mode: "blocking",
        conversation_id: "",
        user: "ai-sidebar-chatbot"
      };

      console.log('请求体:', requestBody);

      response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
    }

    if (response.ok) {
      return { valid: true, message: 'API 密钥有效' };
    } else {
      const responseText = await response.text();
      console.log('应用响应错误:', response.status, responseText);

      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { error: responseText || 'Unknown error' };
      }

      const msg = (errorData.message || errorData.error || '').toString();

      if (response.status === 400 && /status code 402/.test(msg)) {
        return { valid: true, message: 'API 密钥有效，但模型额度不足或参数超限' };
      }

      let errorMessage = '应用验证失败';

      switch (response.status) {
        case 400:
          errorMessage = '请求格式错误，请检查 API 地址和参数。响应: ' + (errorData.message || errorData.error || '格式错误');
          break;
        case 401:
          errorMessage = 'API 密钥无效或已过期';
          break;
        case 403:
          errorMessage = 'API 密钥权限不足';
          break;
        case 404:
          errorMessage = 'API 端点不存在，请检查地址';
          break;
        case 405:
          errorMessage = 'HTTP 方法不允许，请检查 API 地址';
          break;
        case 500:
          errorMessage = '服务器内部错误';
          break;
        default:
          errorMessage = errorData.error || errorData.message || `HTTP ${response.status} 错误`;
      }

      return { valid: false, message: errorMessage };
    }
  } catch (error) {
    console.error('应用验证错误:', error);
    return { valid: false, message: '网络连接失败，请检查 API 地址: ' + error.message };
  }
}



chrome.runtime.onInstalled.addListener(() => {
  console.log('AI Sidebar Chatbot 已安装');

  // 创建右键菜单
  if (chrome.contextMenus) {
    try {
      chrome.contextMenus.create({
        id: 'ai-summary',
        title: '页面总结',
        contexts: ['page']
      });

      chrome.contextMenus.create({
        id: 'ai-chat-selection',
        title: '对话选中内容',
        contexts: ['selection']
      });
    } catch (error) {
      console.log('创建右键菜单失败:', error);
    }
  }

  // 初始化默认设置
  chrome.storage.sync.set({
    apiConfigs: [{
      id: 'default',
      name: '默认应用',
      endpoint: 'https://api.dify.ai/v1',
      apiKey: '',
      isActive: true
    }],
    settings: {
      enableTextSelection: true,
      currentApiId: 'default',
      theme: 'light',
      sidePanelOpen: false
    }
  });

  // 设置侧边栏行为（如果API可用）
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    try {
      chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
    } catch (error) {
      console.log('侧边栏行为设置失败:', error);
    }
  }
});

// 确保后台脚本保持活跃
chrome.runtime.onStartup.addListener(() => {
  console.log('AI Sidebar Chatbot 已启动');
});

// 处理右键菜单点击
if (chrome.contextMenus && chrome.contextMenus.onClicked) {
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    switch (info.menuItemId) {
      case 'ai-summary':
        // 打开侧边栏并通过background script处理页面总结
        if (chrome.sidePanel && chrome.sidePanel.open) {
          chrome.sidePanel.open({ tabId: tab.id });
          setTimeout(() => {
            chrome.runtime.sendMessage({
              action: 'processPageSummary',
              tabId: tab.id
            });
          }, 500);
        }
        break;
      case 'ai-chat-selection':
        // 打开侧边栏并发送选中文本
        if (chrome.sidePanel && chrome.sidePanel.open) {
          chrome.sidePanel.open({ tabId: tab.id });
          setTimeout(() => {
            chrome.runtime.sendMessage({
              action: 'processSelectedText',
              data: { type: 'chat', text: info.selectionText }
            });
          }, 500);
        }
        break;
    }
  });
}

// 处理来自内容脚本和侧边栏的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'openSidePanel':
      if (chrome.sidePanel && chrome.sidePanel.open) {
        chrome.sidePanel.open({ tabId: sender.tab.id });
      }
      break;
    case 'processPageSummary':
      // 通用页面总结处理
      handlePageSummary(request.tabId, sendResponse);
      return true; // 保持消息通道开放
      break;
    case 'getSettings':
      chrome.storage.sync.get(['settings'], (result) => {
        sendResponse(result.settings);
      });
      return true;
    case 'updateSettings':
      chrome.storage.sync.get(['settings'], (result) => {
        const newSettings = { ...result.settings, ...request.settings };
        chrome.storage.sync.set({ settings: newSettings }, () => {
          sendResponse({ success: true });
        });
      });
      return true;
    case 'getApiConfigs':
      chrome.storage.sync.get(['apiConfigs'], (result) => {
        sendResponse(result.apiConfigs);
      });
      return true;
    case 'addApiConfig':
      chrome.storage.sync.get(['apiConfigs'], (result) => {
        const configs = result.apiConfigs || [];
        configs.push(request.config);
        chrome.storage.sync.set({ apiConfigs: configs }, () => {
          sendResponse({ success: true });
        });
      });
      return true;
    case 'updateApiConfig':
      chrome.storage.sync.get(['apiConfigs'], (result) => {
        const configs = result.apiConfigs || [];
        const index = configs.findIndex(config => config.id === request.config.id);
        if (index !== -1) {
          configs[index] = request.config;
          chrome.storage.sync.set({ apiConfigs: configs }, () => {
            sendResponse({ success: true });
          });
        }
      });
      return true;
    case 'deleteApiConfig':
      chrome.storage.sync.get(['apiConfigs'], (result) => {
        const configs = result.apiConfigs || [];
        const filteredConfigs = configs.filter(config => config.id !== request.configId);
        chrome.storage.sync.set({ apiConfigs: filteredConfigs }, () => {
          sendResponse({ success: true });
        });
      });
      return true;
    case 'validateApiKey':
      // 异步验证API密钥
      validateDifyApiKey(request.endpoint, request.apiKey).then(result => {
        sendResponse(result);
      }).catch(error => {
        console.error('应用验证失败:', error);
        sendResponse({ valid: false, message: '验证过程中发生错误' });
      });
      return true;
    case 'callDifyAPI':
      callDifyChat(request.endpoint, request.apiKey, request.message).then(result => {
        sendResponse(result);
      }).catch(error => {
        sendResponse({ success: false, status: 0, message: error?.message || '未知错误' });
      });
      return true;
    case 'callDifyAPIStream':
      startDifyChatStream(request.endpoint, request.apiKey, request.message, request.streamId).then(() => {
        sendResponse({ success: true });
      }).catch(error => {
        sendResponse({ success: false, status: 0, message: error?.message || '未知错误' });
      });
      return true;
    case 'cancelStream':
      cancelDifyChatStream(request.streamId);
      sendResponse({ success: true });
      return true;
    case 'toggleSidePanel':
      chrome.storage.sync.get(['settings'], (result) => {
        const settings = result.settings || {};
        const newState = !settings.sidePanelOpen;
        const newSettings = { ...settings, sidePanelOpen: newState };
        if (chrome.sidePanel && chrome.sidePanel.open && chrome.sidePanel.close) {
          chrome.storage.sync.set({ settings: newSettings }, () => {
            if (newState) {
              chrome.sidePanel.open({ tabId: sender.tab.id });
            } else {
              chrome.sidePanel.close({ tabId: sender.tab.id }, () => {
                if (chrome.runtime.lastError) {
                  console.error('关闭侧边栏失败:', chrome.runtime.lastError)
                }
              });
            }
            sendResponse({ success: true, newState });
          });
        } else {
          sendResponse({ success: false, error: '侧边栏API不可用' });
        }
      });
      return true;
  }
});

async function callDifyChat(endpoint, apiKey, message) {
  let cleanEndpoint = endpoint.trim();
  if (!cleanEndpoint.endsWith('/v1')) {
    cleanEndpoint = cleanEndpoint.endsWith('/') ? cleanEndpoint + 'v1' : cleanEndpoint + '/v1';
  }
  const apiUrl = `${cleanEndpoint}/chat-messages`;
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      inputs: {},
      query: message,
      response_mode: 'blocking',
      user: 'ai-sidebar-chatbot'
    })
  });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = {}; }
  if (response.ok) {
    return { success: true, answer: data.answer || data.text || '' };
  }
  const msg = (data.message || data.error || text || '').toString();
  if (/status code 402/.test(msg)) {
    return { success: false, status: 402, message: '模型额度不足或参数超限' };
  }
  return { success: false, status: response.status, message: msg || '请求失败' };
}

// Store stream information for cancellation
const streamInfo = new Map(); // streamId -> { controller, taskId, endpoint, apiKey }

async function startDifyChatStream(endpoint, apiKey, message, streamId) {
  let cleanEndpoint = endpoint.trim();
  if (!cleanEndpoint.endsWith('/v1')) {
    cleanEndpoint = cleanEndpoint.endsWith('/') ? cleanEndpoint + 'v1' : cleanEndpoint + '/v1';
  }
  const apiUrl = `${cleanEndpoint}/chat-messages`;
  const controller = new AbortController();
  const user = 'ai-sidebar-chatbot';

  // Store stream info for later cancellation
  streamInfo.set(streamId, { controller, endpoint: cleanEndpoint, apiKey, user });

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: {},
        query: message,
        response_mode: 'streaming',
        user: user
      }),
      signal: controller.signal
    });

    // Update stream info with task ID if present in headers
    if (response.headers.has('X-Task-Id')) {
      const taskId = response.headers.get('X-Task-Id');
      const info = streamInfo.get(streamId);
      if (info) {
        streamInfo.set(streamId, { ...info, taskId });
      }
    }

    if (!response.body) {
      chrome.runtime.sendMessage({ action: 'streamError', streamId, message: '响应体不可读' });
      streamInfo.delete(streamId);
      return;
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let reading = true;
    while (reading) {
      try {
        const { value, done } = await reader.read();
        if (done) { reading = false; break; }
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n');
        buffer = parts.pop() || '';
        for (const line of parts) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data:')) {
            const jsonStr = trimmed.slice(5).trim();
            if (jsonStr === '[DONE]') {
              chrome.runtime.sendMessage({ action: 'streamDone', streamId });
              continue;
            }
            let obj;
            try { obj = JSON.parse(jsonStr); } catch { obj = null; }
            if (obj) {
              // Update stream info with task ID if present in response
              if (obj.task_id) {
                const info = streamInfo.get(streamId);
                if (info) {
                  streamInfo.set(streamId, { ...info, taskId: obj.task_id });
                }
              }

              const textPiece = obj.answer || obj.text || (obj.data && (obj.data.answer || obj.data.text)) || '';
              if (textPiece) {
                chrome.runtime.sendMessage({ action: 'streamChunk', streamId, text: textPiece });
              }
              if (obj.event === 'message_end' || obj.event === 'completed') {
                chrome.runtime.sendMessage({ action: 'streamDone', streamId });
              }
            }
          }
        }
      } catch (error) {
        // Check if the error is due to aborting
        if (error.name === 'AbortError') {
          console.log('Stream was aborted for streamId:', streamId);
          chrome.runtime.sendMessage({ action: 'streamError', streamId, message: '请求已取消' });
          streamInfo.delete(streamId);
          return;
        }
        throw error;
      }
    }
    if (buffer.trim().length > 0) {
      const line = buffer.trim();
      if (line.startsWith('data:')) {
        const jsonStr = line.slice(5).trim();
        if (jsonStr !== '[DONE]') {
          let obj;
          try { obj = JSON.parse(jsonStr); } catch { obj = null; }
          if (obj) {
            const textPiece = obj.answer || obj.text || (obj.data && (obj.data.answer || obj.data.text)) || '';
            if (textPiece) {
              chrome.runtime.sendMessage({ action: 'streamChunk', streamId, text: textPiece });
            }
          }
        }
      }
    }
    chrome.runtime.sendMessage({ action: 'streamDone', streamId });
    streamInfo.delete(streamId);
  } catch (error) {
    // Check if the error is due to aborting
    if (error.name === 'AbortError') {
      console.log('Stream was aborted for streamId:', streamId);
      chrome.runtime.sendMessage({ action: 'streamError', streamId, message: '请求已取消' });
    } else {
      console.error('Stream error for streamId:', streamId, error);
      chrome.runtime.sendMessage({ action: 'streamError', streamId, message: error?.message || '未知错误' });
    }
    streamInfo.delete(streamId);
  }
}

// Cancel a Dify chat stream using both client-side and server-side methods
async function cancelDifyChatStream(streamId) {
  // Client-side cancellation
  const info = streamInfo.get(streamId);
  if (info && info.controller) {
    info.controller.abort();
  }

  // Server-side cancellation using Dify API
  if (info && info.taskId && info.endpoint && info.apiKey && info.user) {
    try {
      const stopUrl = `${info.endpoint}/chat-messages/${info.taskId}/stop`;
      const response = await fetch(stopUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${info.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user: info.user
        })
      });

      if (response.ok) {
        console.log('Successfully cancelled task on server:', info.taskId);
      } else {
        console.error('Failed to cancel task on server:', response.status, await response.text());
      }
    } catch (error) {
      console.error('Failed to cancel task on server:', error);
    }
  }

  // Clean up
  streamInfo.delete(streamId);
}

// 通用页面总结处理函数
async function handlePageSummary(tabId, sendResponse) {
  try {
    // 检查tab是否存在且可访问
    const tab = await chrome.tabs.get(tabId);

    // 检查是否是受限制的URL
    const url = tab.url || '';
    const isRestrictedUrl = url.startsWith('chrome://') ||
      url.startsWith('chrome-extension://') ||
      url.startsWith('moz-extension://') ||
      url.startsWith('edge://') ||
      url.startsWith('about:') ||
      url.startsWith('file://');

    if (isRestrictedUrl) {
      const basicInfo = {
        title: tab.title || '未知页面',
        url: url,
        content: '无法获取此页面的详细内容。这可能是由于页面安全限制导致的。'
      };
      // 发送基本页面信息
      chrome.runtime.sendMessage({
        action: 'processPageSummary',
        data: basicInfo
      }).then(() => {
        sendResponse({ success: true });
      }).catch((error) => {
        console.error('发送页面摘要失败:', error);
        sendResponse({ success: false, error: error.message });
      });
      return;
    }

    // 尝试向内容脚本发送消息
    chrome.tabs.sendMessage(tabId, { action: 'getPageContent' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('内容脚本通信失败:', chrome.runtime.lastError.message);

        // 发送基本页面信息作为备用方案
        const basicInfo = {
          title: tab.title || '未知页面',
          url: url,
          content: '无法获取页面详细内容。请确保扩展已正确安装并刷新页面。'
        };

        chrome.runtime.sendMessage({
          action: 'processPageSummary',
          data: basicInfo
        }).then(() => {
          sendResponse({ success: false, error: '内容脚本通信失败', usedFallback: true });
        }).catch((error) => {
          console.error('发送备用页面摘要失败:', error);
          sendResponse({ success: false, error: error.message });
        });
      } else {
        // 成功获取页面内容
        chrome.runtime.sendMessage({
          action: 'processPageSummary',
          data: response
        }).then(() => {
          sendResponse({ success: true });
        }).catch((error) => {
          console.error('发送页面摘要失败:', error);
          sendResponse({ success: false, error: error.message });
        });
      }
    });

  } catch (error) {
    console.error('处理页面总结时出错:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// 处理插件图标点击 - 直接打开侧边栏
chrome.action.onClicked.addListener(async (tab) => {
  if (chrome.sidePanel && chrome.sidePanel.open) {
    await chrome.sidePanel.open({ tabId: tab.id });
  } else {
    console.log('侧边栏API不可用');
  }
});

// 监听侧边栏关闭事件（如果API可用）
if (chrome.sidePanel && chrome.sidePanel.onPanelClosed) {
  chrome.sidePanel.onPanelClosed.addListener((windowId) => {
    chrome.storage.sync.get(['settings'], (result) => {
      const settings = result.settings || {};
      chrome.storage.sync.set({
        settings: { ...settings, sidePanelOpen: false }
      });
    });
  });
}