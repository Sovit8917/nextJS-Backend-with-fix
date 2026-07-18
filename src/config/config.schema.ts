import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),

  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').default(''),

  TWILIO_ACCOUNT_SID: Joi.string().required(),
  TWILIO_AUTH_TOKEN: Joi.string().required(),
  // Used by Twilio Verify (OTP send/check).
  TWILIO_VERIFY_SERVICE_SID: Joi.string().required(),
  // No longer used now that OTP goes through Twilio Verify instead of raw SMS.
  TWILIO_PHONE_NUMBER: Joi.string().allow('').optional(),

  RAZORPAY_KEY_ID: Joi.string().required(),
  RAZORPAY_KEY_SECRET: Joi.string().required(),

  AWS_ACCESS_KEY_ID: Joi.string().required(),
  AWS_SECRET_ACCESS_KEY: Joi.string().required(),
  AWS_REGION: Joi.string().default('ap-south-1'),
  AWS_S3_BUCKET: Joi.string().required(),

  PORT: Joi.number().default(3000),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  FRONTEND_URL: Joi.string().default('http://localhost:3001'),

  DEFAULT_COMMISSION_PERCENT: Joi.number().default(20),
  OTP_EXPIRY_MINUTES: Joi.number().default(10),
  OTP_BYPASS: Joi.string().allow('').optional(),

  FIREBASE_PROJECT_ID: Joi.string().allow('').optional(),
  FIREBASE_CLIENT_EMAIL: Joi.string().allow('').optional(),
  FIREBASE_PRIVATE_KEY: Joi.string().allow('').optional(),

  GEMINI_API_KEY: Joi.string().allow('').optional(),
  // gemini-2.5-flash was retired for new API keys — gemini-flash-latest
  // auto-tracks Google's current recommended Flash model.
  GEMINI_MODEL: Joi.string().default('gemini-flash-latest'),
});
