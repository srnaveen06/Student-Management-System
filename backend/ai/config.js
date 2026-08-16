// Central AI configuration, read from backend .env.
const aiConfig = {
  provider: process.env.AI_PROVIDER || 'local',
  enabled: process.env.AI_ENABLED !== 'false',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  maxPromptLength: parseInt(process.env.AI_MAX_PROMPT_LENGTH, 10) || 2000,
  maxResponseLength: parseInt(process.env.AI_MAX_RESPONSE_LENGTH, 10) || 6000,
  rateLimitRequests: parseInt(process.env.AI_RATE_LIMIT_REQUESTS, 10) || 30,
  rateLimitWindow: parseInt(process.env.AI_RATE_LIMIT_WINDOW, 10) || 60,
  cacheSize: parseInt(process.env.AI_CACHE_SIZE, 10) || 20,
};

module.exports = aiConfig;
