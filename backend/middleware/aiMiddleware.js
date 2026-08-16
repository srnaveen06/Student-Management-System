// AI middleware — feature gating + role-based access for AI endpoints.
// Depends on the standard auth middleware having populated req.user.

const settings = require('../ai/settings');

// Feature gate: checks global ai_enabled and the per-feature flag.
function requireFeature(feature) {
  return async (req, res, next) => {
    try {
      const s = await settings.getSettings();
      if (s.ai_enabled === false) return res.status(403).json({ error: 'AI features are disabled by the administrator.' });
      const flag = `ai_${feature}_enabled`;
      if (s[flag] === false) return res.status(403).json({ error: `The "${feature}" feature is disabled by the administrator.` });
      next();
    } catch (err) {
      next(err);
    }
  };
}

// Role gate: the user's role must be in the ai_roles setting.
async function requireAIRole(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const s = await settings.getSettings();
    const allowed = String(s.ai_roles || 'super_admin,admin,teacher,accountant').split(',').map(r => r.trim());
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ error: 'Your role is not enabled for AI features.' });
    }
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireFeature, requireAIRole };
