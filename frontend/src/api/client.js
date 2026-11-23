import axios from 'axios'

const client = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('farmpilot_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('farmpilot_token')
      localStorage.removeItem('farmpilot_user')
      window.location.href = '/signin'
    }
    return Promise.reject(err)
  }
)

export default client
