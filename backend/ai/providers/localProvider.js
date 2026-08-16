// LOCAL provider — a deterministic engine that parses natural language into a
// validated plan, executes only whitelisted safe tools, and renders answers
// from the real results. Works fully offline; never fabricates numbers.

const { parseQuery } = require('../services/intentParser');
const { render } = require('../services/responseFormatter');
const { canUse } = require('../tools');
const aiConfig = require('../config');

async function complete(user, message, ctx = {}) {
  const start = Date.now();
  const { intent, filters, toolCalls } = parseQuery(message);
  const results = [];
  const executed = [];
  const dataSources = [];

  for (const call of toolCalls) {
    const gate = canUse(user, call.name);
    if (!gate.ok) {
      executed.push({ name: call.name, status: 'blocked', summary: gate.error });
      dataSources.push({ tool: call.name, params: call.params, status: 'blocked' });
      continue;
    }
    try {
      const result = await gate.tool.handler({ user }, call.params);
      results.push(result);
      const rowCount = Array.isArray(result.students) ? result.students.length
        : Array.isArray(result.subjects) ? result.subjects.length
        : Array.isArray(result.branches) ? result.branches.length
        : Array.isArray(result.anomalies) ? result.anomalies.length
        : Array.isArray(result.insights) ? result.insights.length
        : null;
      executed.push({ name: call.name, status: 'success', summary: call.summary });
      dataSources.push({ tool: call.name, params: call.params, rows: rowCount });
    } catch (err) {
      executed.push({ name: call.name, status: 'error', summary: err.message });
      dataSources.push({ tool: call.name, params: call.params, status: 'error' });
    }
  }

  const content = render(intent, results, message);
  return {
    content,
    intent,
    toolCalls: executed,
    dataSources,
    model: 'local',
    status: 'success',
    latencyMs: Date.now() - start,
    filters,
  };
}

module.exports = { complete, providerName: 'local' };
