import type { ThemeConfig } from 'antd'

const theme: ThemeConfig = {
  token: {
    fontFamily: 'Fraunces, sans-serif',
    colorPrimary: '#947B62',
    colorBgBase: '#ffffff',
    colorTextBase: '#000000',
  },
  components: {
    Button: {
      colorPrimary: '#947B62',
      algorithm: true,
    },
    Card: {
      colorBgContainer: '#F5F0EA',
    },
  },
}

export default theme
