/**
 * Chinese UI dictionary for the admin app.
 *
 * The key is the exact English source string used in the code (`t('...')`),
 * so untranslated entries automatically fall back to English. Keep entries
 * grouped by module and sorted roughly by where they appear on screen.
 */
export const UI_ZH: Record<string, string> = {
  // common
  Save: '保存',
  'Saving...': '保存中…',
  Cancel: '取消',
  Saved: '已保存',

  // settings page
  Settings: '设置',
  'Manage {name} settings': '管理{name}设置',
  'Settings have been saved successfully.': '设置已成功保存。',
  'Failed to save': '保存失败',
  'Invalid JSON format': 'JSON 格式无效',
  'Select an option': '请选择',
  'Send Test Email': '发送测试邮件',
  'Test email sent': '测试邮件已发送',
  'The test email has been successfully sent.': '测试邮件已成功发送。',
  'Failed to send test email': '测试邮件发送失败',

  // settings group names (KNOWN_CONFIG_GROUPS + upperFirst(module) fallbacks)
  Server: '服务器',
  Auth: '认证',
  Notification: '通知',
  Storage: '存储',
  OAuth: 'OAuth 登录',
  AI: 'AI',
  Crypto: '加密',
  Job: '后台任务',
  Throttle: '限流',
  Doc: '文档',
  Permission: '权限',
  Websocket: 'WebSocket',
  Flags: '功能开关',
  DocService: '文档服务',
  Client: '客户端',
  Calendar: '日历',
  Indexer: '索引',
  Worker: 'Worker',
  Payment: '支付',
  Captcha: '人机验证',
  Telemetry: '遥测',
  Metrics: '指标',
};
