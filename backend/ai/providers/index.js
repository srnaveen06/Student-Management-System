// Provider selection. The local provider is the default; OpenAI activates only
// when an API key is present. Both expose complete(user, message, ctx).

const aiConfig = require('../config');
const localProvider = require('./localProvider');
const openaiProvider = require('./openaiProvider');

function getProvider() {
  if (aiConfig.enabled !== true) return null;
  if (aiConfig.provider === 'openai' && aiConfig.openaiApiKey) return openaiProvider;
  return localProvider;
}

async function complete(user, message, ctx = {}) {
  const provider = getProvider();
  if (!provider) return { content: 'AI features are disabled.', status: 'error', model: null, intent: null, toolCalls: [], dataSources: [] };
  try {
    return await provider.complete(user, message, ctx);
  } catch (err) {
    // Fall back to local when the remote provider fails.
    if (provider !== localProvider) {
      try {
        return await localProvider.complete(user, message, ctx);
      } catch (e) {
        return { content: 'I could not process that request. Please try again.', status: 'error', model: null, intent: null, toolCalls: [], dataSources: [] };
      }
    }
    return { content: 'I could not process that request. Please try again.', status: 'error', model: null, intent: null, toolCalls: [], dataSources: [] };
  }
}

module.exports = { complete, getProvider };
