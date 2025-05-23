// 网络请求工具模块
const BASE_URL = 'http://8.134.168.88:8000/api'

// 将对象转换为URL查询参数
const objectToQueryString = (obj) => {
  if (!obj) return '';
  return Object.keys(obj)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(obj[key])}`)
    .join('&');
}

/**
 * 核心请求方法
 * 1. 处理URL格式
 * 2. 处理GET请求参数
 * 3. 发起请求并处理响应
 * 4. 统一错误处理
 */
const request = (url, method, data) => {
  // 确保url以/开头
  const requestUrl = url.startsWith('/') ? url : `/${url}`
  
  // 处理 GET 请求的数据
  let finalUrl = `${BASE_URL}${requestUrl}`;
  let requestData = data;
  
  // GET请求将参数拼接到URL中
  if (method === 'GET' && data) {
    const queryString = objectToQueryString(data);
    finalUrl = `${finalUrl}${finalUrl.includes('?') ? '&' : '?'}${queryString}`;
    requestData = undefined; // GET 请求不需要请求体
  }
  
  return new Promise((resolve, reject) => {
    console.log('发送请求:', {
      url: finalUrl,
      method,
      data: requestData
    })

    wx.request({
      url: finalUrl,
      method,
      data: method === 'GET' ? undefined : requestData, // GET 请求不发送请求体
      header: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      success: (res) => {
        console.log('请求响应:', res)
        
        // 处理成功响应
        if (res.statusCode === 200) {
          resolve(res.data)
        } else {
          // 处理错误响应
          let errorMsg = '请求失败'
          try {
            // 处理不同类型的错误
            if (typeof res.data === 'string' && res.data.includes('<!DOCTYPE html>')) {
              // 如果是HTML响应，可能是服务器错误页面
              console.error('服务器返回了HTML错误页面:', res.data)
              errorMsg = '服务器内部错误，请联系管理员'
            } else if (res.data && typeof res.data === 'object') {
              errorMsg = res.data.message || res.data.error || res.data.detail || '请求失败'
            }
          } catch (e) {
            console.error('解析错误信息失败:', e)
          }

          // 构造错误对象
          const error = {
            statusCode: res.statusCode,
            message: errorMsg || '请求失败',
            data: res.data,
            url: finalUrl,
            requestData: data
          }
          
          console.error('请求失败:', error)
          // 特殊处理认证错误
          if (res.statusCode === 401 || res.statusCode === 403) {
            error.message = '密码错误，请重试'
          }
          reject(error)
        }
      },
      fail: (err) => {
        // 处理网络请求失败
        console.error('网络请求失败:', err)
        reject({
          statusCode: err.statusCode || 500,
          message: err.message || err.errMsg || '网络错误',
          data: err.data
        })
      }
    })
  })
}

// HTTP方法封装
const http = {
  get: (url, data) => request(url, 'GET', data),
  post: (url, data) => request(url, 'POST', data),
  put: (url, data) => request(url, 'PUT', data),
  delete: (url, data) => request(url, 'DELETE', data)
}

module.exports = {
  http,
  request
} 