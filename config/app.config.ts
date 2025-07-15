export default () => ({
  jwtSecret: process.env.JWT_SECRET,
  jwtAccessTokenExpiresIn: process.env.JWT_EXPIRY || '1h',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRY || '7d',
  adminPasswordHash: process.env.ADMIN_PASSWORD_HASH,
  paymentJwtSecret: process.env.PAYMENT_JWT_SECRET,
  paymentLinkyExpiryMinutes: 7 * 24 * 60, // 7 days, ideally could be coming from a configurable admin dashboard
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  securePaymentBaseUrl:
    process.env.SECURE_PAYMENT_BASE_URL || 'http://payment-gateway/payments',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:8080',
  pinecone: {
    apiKey: process.env.PINECONE_API_KEY,
    environment: process.env.PINECONE_ENVIRONMENT,
    index: process.env.PINECONE_INDEX,
    host: process.env.PINECONE_HOST,
  },

  encryptionKey: process.env.ENCRYPTION_KEY,
});
