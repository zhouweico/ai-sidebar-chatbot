import React from 'react'
import ReactDOM from 'react-dom/client'
import { Plus, Settings, Trash2, Check, X, Globe, Key, Edit3, Save, Loader2, AlertCircle, CheckCircle, Info } from 'lucide-react'
import './options.css'

interface ApiConfig {
  id: string
  name: string
  endpoint: string
  apiKey: string
  isActive: boolean
}

interface Settings {
  enableTextSelection: boolean
  currentApiId: string
  theme: string
}

function Options() {
  const [apiConfigs, setApiConfigs] = React.useState<ApiConfig[]>([])
  const [settings, setSettings] = React.useState<Settings | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [showAddForm, setShowAddForm] = React.useState(false)
  const [editingConfig, setEditingConfig] = React.useState<ApiConfig | null>(null)
  const [iconError, setIconError] = React.useState(false)
  const DEFAULT_ENDPOINT = 'https://api.dify.ai/v1'
  const DEFAULT_API_KEY = 'app-LOPkrIbTzwniRIJ2QFqoXe5B'
  const [formData, setFormData] = React.useState({
    name: '',
    endpoint: DEFAULT_ENDPOINT,
    apiKey: DEFAULT_API_KEY
  })
  const [isValidating, setIsValidating] = React.useState(false)
  const [validationResult, setValidationResult] = React.useState<{valid: boolean, message: string} | null>(null)

  React.useEffect(() => {
    loadData()
  }, [])

  const validateApiKey = async (endpoint: string, apiKey: string) => {
    setIsValidating(true)
    setValidationResult(null)
    
    try {
      const result = await chrome.runtime.sendMessage({ 
        action: 'validateApiKey', 
        endpoint, 
        apiKey 
      })
      
      setValidationResult(result)
      return result.valid
    } catch (error) {
      console.error('应用 API 验证失败:', error)
      setValidationResult({ valid: false, message: '验证过程中发生错误' })
      return false
    } finally {
      setIsValidating(false)
    }
  }

  const loadData = async () => {
    try {
      const [apiResponse, settingsResponse] = await Promise.all([
        chrome.runtime.sendMessage({ action: 'getApiConfigs' }),
        chrome.runtime.sendMessage({ action: 'getSettings' })
      ])
      
      setApiConfigs(apiResponse || [])
      setSettings(settingsResponse)
    } catch (error) {
      console.error('加载数据失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddApi = async () => {
    if (!formData.name || !formData.endpoint || !formData.apiKey) {
      alert('请填写所有必填字段')
      return
    }

    // 验证API密钥
    const isValid = await validateApiKey(formData.endpoint, formData.apiKey)
    if (!isValid) {
      return // 验证失败，错误信息已在validateApiKey中设置
    }

    const newConfig: ApiConfig = {
      id: Date.now().toString(),
      name: formData.name,
      endpoint: formData.endpoint,
      apiKey: formData.apiKey,
      isActive: false
    }

    try {
      await chrome.runtime.sendMessage({ 
        action: 'addApiConfig', 
        config: newConfig 
      })
      
      setApiConfigs([...apiConfigs, newConfig])
      setFormData({ name: '', endpoint: DEFAULT_ENDPOINT, apiKey: DEFAULT_API_KEY })
      setShowAddForm(false)
      setValidationResult(null) // 清除验证结果
    } catch (error) {
      console.error('添加应用配置失败:', error)
      alert('添加应用配置失败')
    }
  }

  const handleUpdateApi = async () => {
    if (!editingConfig) return

    // 验证API密钥（如果endpoint或apiKey被修改）
    const isValid = await validateApiKey(editingConfig.endpoint, editingConfig.apiKey)
    if (!isValid) {
      return // 验证失败，错误信息已在validateApiKey中设置
    }

    try {
      await chrome.runtime.sendMessage({ 
        action: 'updateApiConfig', 
        config: editingConfig 
      })
      
      setApiConfigs(apiConfigs.map(config => 
        config.id === editingConfig.id ? editingConfig : config
      ))
      setEditingConfig(null)
      setValidationResult(null) // 清除验证结果
    } catch (error) {
      console.error('更新应用配置失败:', error)
      alert('更新应用配置失败')
    }
  }

  const handleDeleteApi = async (configId: string) => {
    if (!confirm('确定要删除这个应用配置吗？')) return

    try {
      await chrome.runtime.sendMessage({ 
        action: 'deleteApiConfig', 
        configId 
      })
      
      setApiConfigs(apiConfigs.filter(config => config.id !== configId))
    } catch (error) {
      console.error('删除应用配置失败:', error)
      alert('删除应用配置失败')
    }
  }

  const handleSwitchApi = async (configId: string) => {
    if (!settings) return

    const newSettings = {
      ...settings,
      currentApiId: configId
    }

    try {
      await chrome.runtime.sendMessage({ 
        action: 'updateSettings', 
        settings: newSettings 
      })
      
      setSettings(newSettings)
      setApiConfigs(apiConfigs.map(config => ({
        ...config,
        isActive: config.id === configId
      })))
    } catch (error) {
      console.error('切换应用配置失败:', error)
      alert('切换应用配置失败')
    }
  }

  const handleSettingChange = async (key: keyof Settings, value: boolean) => {
    if (!settings) return

    const newSettings = {
      ...settings,
      [key]: value
    }

    try {
      await chrome.runtime.sendMessage({ 
        action: 'updateSettings', 
        settings: newSettings 
      })
      
      setSettings(newSettings)
    } catch (error) {
      console.error('更新设置失败:', error)
      alert('更新设置失败')
    }
  }

  if (isLoading) {
    return (
      <div className="options-container">
        <div className="loading">加载中...</div>
      </div>
    )
  }

  // 验证状态组件
  const ValidationStatus = () => {
    if (isValidating) {
      return (
        <div className="validation-status validating">
          <Loader2 size={16} className="spinning" />
          <span>正在验证应用 API 密钥...</span>
        </div>
      )
    }
    
    if (validationResult) {
      return (
        <div className={`validation-status ${validationResult.valid ? 'success' : 'error'}`}>
          {validationResult.valid ? (
            <CheckCircle size={16} />
          ) : (
            <AlertCircle size={16} />
          )}
          <span>{validationResult.message}</span>
          {!validationResult.valid && (
            <div className="validation-help">
              <small>提示：请确保应用 API 地址格式正确，例如：https://api.dify.ai/v1</small>
            </div>
          )}
        </div>
      )
    }
    
    return null
  }

  return (
    <div className="options-container">
      <div className="options-header">
        <div className="header-content">
          <div className="header-icon">
            {iconError ? (
              <Settings size={20} />
            ) : (
              <img 
                src={chrome.runtime.getURL('icons/48.png')} 
                width={32} 
                height={32} 
                alt="设置" 
                onError={() => setIconError(true)}
              />
            )}
          </div>
          <div>
            <h1 className="header-title">设置</h1>
            <p className="header-subtitle">配置插件功能和应用设置</p>
          </div>
        </div>
      </div>

      <div className="options-content">
        {/* API配置管理 */}
        <div className="settings-section">
          <div className="section-header">
            <h2 className="section-title">
              <span className="title-icon"><Globe size={18} /></span>
              应用配置
            </h2>
            <button 
              className="add-btn"
              onClick={() => setShowAddForm(true)}
            >
              <Plus size={16} />
              添加应用
            </button>
          </div>

          {showAddForm && (
            <div className="api-form">
              <div className="form-group">
                <label>应用名称</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="例如：AI助手"
                />
              </div>
              <div className="form-group">
                <label>API 地址</label>
                <input
                  type="text"
                  value={formData.endpoint}
                  onChange={(e) => setFormData({...formData, endpoint: e.target.value})}
                  placeholder="https://api.dify.ai/v1"
                />
                <small className="form-help">请输入完整的 API 地址，包括 /v1 路径</small>
              </div>
              <div className="form-group">
                <label>API 密钥</label>
                <input
                  type="password"
                  value={formData.apiKey}
                  onChange={(e) => setFormData({...formData, apiKey: e.target.value})}
                  placeholder="your-api-key"
                />
                <div className="api-test-actions">
                  <button 
                    className="btn btn-outline" 
                    onClick={() => validateApiKey(formData.endpoint, formData.apiKey)}
                    disabled={!formData.endpoint || !formData.apiKey || isValidating}
                    type="button"
                  >
                    {isValidating ? (
                      <Loader2 size={14} className="spinning" />
                    ) : (
                      <CheckCircle size={14} />
                    )}
                    测试连接
                  </button>
                </div>
              </div>
              <ValidationStatus />
              <div className="form-actions">
                <button className="btn btn-primary" onClick={handleAddApi}>
                  <Save size={16} />
                  保存
                </button>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setShowAddForm(false)
                    setFormData({ name: '', endpoint: DEFAULT_ENDPOINT, apiKey: DEFAULT_API_KEY })
                  }}
                >
                  <X size={16} />
                  取消
                </button>
              </div>
            </div>
          )}

          <div className="api-list">
            {apiConfigs.map((config) => (
              <div key={config.id} className="api-item">
                {editingConfig?.id === config.id ? (
                  <div className="api-edit-form">
                    <div className="form-group">
                      <label>应用名称</label>
                      <input
                        type="text"
                        value={editingConfig.name}
                        onChange={(e) => setEditingConfig({
                          ...editingConfig,
                          name: e.target.value
                        })}
                      />
                    </div>
                    <div className="form-group">
                      <label>API 地址</label>
                      <input
                        type="text"
                        value={editingConfig.endpoint}
                        onChange={(e) => setEditingConfig({
                          ...editingConfig,
                          endpoint: e.target.value
                        })}
                      />
                      <small className="form-help">请输入完整的 API 地址，包括 /v1 路径</small>
                    </div>
                    <div className="form-group">
                      <label>API 密钥</label>
                      <input
                        type="password"
                        value={editingConfig.apiKey}
                        onChange={(e) => setEditingConfig({
                          ...editingConfig,
                          apiKey: e.target.value
                        })}
                      />
                      <div className="api-test-actions">
                        <button 
                          className="btn btn-outline" 
                          onClick={() => validateApiKey(editingConfig.endpoint, editingConfig.apiKey)}
                          disabled={!editingConfig.endpoint || !editingConfig.apiKey || isValidating}
                          type="button"
                        >
                          {isValidating ? (
                            <Loader2 size={14} className="spinning" />
                          ) : (
                            <CheckCircle size={14} />
                          )}
                          测试连接
                        </button>
                      </div>
                    </div>
                    <ValidationStatus />
                    <div className="form-actions">
                      <button className="btn btn-primary" onClick={handleUpdateApi}>
                        <Save size={16} />
                        保存
                      </button>
                      <button 
                        className="btn btn-secondary" 
                        onClick={() => setEditingConfig(null)}
                      >
                        <X size={16} />
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="api-info">
                      <div className="api-name">
                        {config.name}
                        {config.isActive && <span className="active-badge">当前使用</span>}
                      </div>
                      <div className="api-endpoint">{config.endpoint}</div>
                    </div>
                    <div className="api-actions">
                      {!config.isActive && (
                        <button
                          className="action-btn primary"
                          onClick={() => handleSwitchApi(config.id)}
                          title="切换到此应用"
                        >
                          <Check size={16} />
                        </button>
                      )}
                      <button
                        className="action-btn secondary"
                        onClick={() => setEditingConfig(config)}
                        title="编辑"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        className="action-btn danger"
                        onClick={() => handleDeleteApi(config.id)}
                        title="删除"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {apiConfigs.length === 0 && (
              <div className="empty-state">
                <Globe size={48} />
                <p>暂无应用配置</p>
                <span>点击上方按钮添加您的第一个应用</span>
              </div>
            )}
          </div>
        </div>

        {/* 功能设置 */}
        <div className="settings-section">
          <div className="section-header">
            <h2 className="section-title">
              <span className="title-icon"><Settings size={18} /></span>
              功能设置
            </h2>
          </div>
          <div className="settings-list">
            <div className="setting-item">
              <div className="setting-info">
                <h3>划词工具栏</h3>
                <p>选中文本时显示快捷操作工具栏</p>
              </div>
              <div className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings?.enableTextSelection}
                  onChange={(e) => handleSettingChange('enableTextSelection', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </div>
            </div>
            
          </div>
        </div>

        {/* 使用说明 */}
        <div className="settings-section">
          <div className="section-header">
            <h2 className="section-title">
              <span className="title-icon"><Info size={18} /></span>
              使用说明
            </h2>
          </div>
          <div className="help-content">
            <div className="help-item">
              <h4>如何获取 Dify API 密钥？</h4>
              <p>1. 访问 <a href="https://dify.ai" target="_blank" rel="noopener noreferrer">Dify 官网</a></p>
              <p>2. 注册并登录您的账户</p>
              <p>3. 在控制台中创建新的应用</p>
              <p>4. 在应用设置中找到 API 密钥</p>
            </div>
            <div className="help-item">
              <h4>功能说明</h4>
              <p><strong>划词工具栏：</strong>选中文本后自动弹出，支持总结、对话、翻译</p>
              <p><strong>页面总结：</strong>快速提取当前页面的关键信息</p>
              <p><strong>AI对话：</strong>与AI进行多轮对话，支持上下文理解</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(<Options />)