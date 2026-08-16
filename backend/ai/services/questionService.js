// AI question generator. Produces structured questions for a subject using a
// deterministic topic bank keyed to subject names. Generated questions are
// saved as 'draft' and always require review before use.

const pool = require('../../config/db');

const TOPIC_BANK = [
  { kw: ['programming', 'c'], topics: ['variables and data types', 'loops and conditionals', 'functions', 'arrays and pointers', 'structs'] },
  { kw: ['data structure'], topics: ['arrays', 'linked lists', 'stacks and queues', 'binary search trees', 'sorting algorithms'] },
  { kw: ['algorithm'], topics: ['time complexity', 'divide and conquer', 'dynamic programming', 'greedy methods', 'graph traversal'] },
  { kw: ['database'], topics: ['normalization', 'SQL queries', 'transactions', 'indexes', 'ER modelling'] },
  { kw: ['operating'], topics: ['process scheduling', 'deadlocks', 'memory management', 'file systems', 'threads'] },
  { kw: ['network'], topics: ['OSI model', 'TCP/IP', 'routing', 'subnetting', 'network security'] },
  { kw: ['computer organiz'], topics: ['CPU architecture', 'memory hierarchy', 'pipelines', 'cache design', 'instruction sets'] },
  { kw: ['machine learning'], topics: ['supervised learning', 'model evaluation', 'feature engineering', 'overfitting', 'neural networks'] },
  { kw: ['cloud'], topics: ['IaaS/PaaS/SaaS', 'virtualization', 'scalability', 'service models', 'serverless'] },
  { kw: ['crypto'], topics: ['symmetric encryption', 'public key cryptography', 'hashing', 'digital signatures', 'key exchange'] },
  { kw: ['web'], topics: ['HTTP methods', 'REST APIs', 'state management', 'rendering strategies', 'web security'] },
  { kw: ['circuit'], topics: ['Ohm\'s law', 'Kirchhoff\'s laws', 'node and mesh analysis', 'thevenin theorem', 'RLC circuits'] },
  { kw: ['electronics', 'electronic'], topics: ['diodes', 'transistors', 'amplifiers', 'rectifiers', 'op-amps'] },
  { kw: ['signal'], topics: ['Fourier transforms', 'convolution', 'sampling', 'modulation', 'filters'] },
  { kw: ['embedded'], topics: ['microcontrollers', 'interrupts', 'GPIO', 'real-time systems', 'sensors'] },
  { kw: ['microprocessor'], topics: ['addressing modes', 'instruction set', 'pipelining', 'I/O interfacing', 'memory mapping'] },
  { kw: ['control'], topics: ['transfer functions', 'stability', 'PID control', 'state space', 'root locus'] },
  { kw: ['communication'], topics: ['AM and FM', 'digital modulation', 'channel capacity', 'error detection', 'multiplexing'] },
  { kw: ['thermodynam'], topics: ['laws of thermodynamics', 'enthalpy and entropy', 'heat engines', 'refrigeration cycles', 'gas laws'] },
  { kw: ['mechanics', 'mechanical'], topics: ['free body diagrams', 'kinematics', 'equilibrium', 'work and energy', 'moment of inertia'] },
  { kw: ['fluid'], topics: ['Bernoulli\'s principle', 'viscosity', 'laminar and turbulent flow', 'pressure measurement', 'flow rate'] },
  { kw: ['strength of material'], topics: ['stress and strain', 'bending', 'torsion', 'deflection', 'elasticity'] },
  { kw: ['machine draw'], topics: ['orthographic projection', 'isometric views', 'sectioning', 'dimensioning', 'tolerances'] },
  { kw: ['robot'], topics: ['degrees of freedom', 'kinematics', 'actuators', 'sensors', 'control architectures'] },
  { kw: ['finite element'], topics: ['meshing', 'boundary conditions', 'shape functions', 'element types', 'convergence'] },
  { kw: ['power plant'], topics: ['thermal power', 'hydro power', 'nuclear power', 'renewable sources', 'energy efficiency'] },
  { kw: ['structural'], topics: ['determinacy', 'truss analysis', 'bending moments', 'shear force diagrams', 'deflection'] },
  { kw: ['concrete'], topics: ['mix design', 'curing', 'compressive strength', 'admixtures', 'durability'] },
  { kw: ['transportation'], topics: ['road classification', 'traffic flow', 'pavement design', 'intersections', 'sight distance'] },
  { kw: ['earthquake'], topics: ['seismic waves', 'base isolation', 'lateral loads', 'ductility', 'response spectra'] },
  { kw: ['construction manag'], topics: ['CPM and PERT', 'cost estimation', 'scheduling', 'resource allocation', 'safety'] },
  { kw: ['bridge'], topics: ['loads on bridges', 'bridge types', 'bearing design', 'pier and abutment', 'inspection'] },
  { kw: ['math'], topics: ['differentiation', 'integration', 'linear algebra', 'differential equations', 'probability'] },
  { kw: ['engineering draw'], topics: ['orthographic projection', 'isometric drawing', 'sectional views', 'scales', 'symbols'] },
  { kw: ['environment'], topics: ['pollution types', 'ecosystems', 'waste management', 'sustainability', 'environmental laws'] },
  { kw: ['physics'], topics: ['Newton\'s laws', 'electromagnetic waves', 'optics', 'thermodynamics', 'semiconductors'] },
  { kw: ['communication skill'], topics: ['active listening', 'presentation skills', 'written communication', 'interview skills', 'body language'] },
  { kw: ['discrete'], topics: ['set theory', 'graph theory', 'relations', 'proof techniques', 'combinatorics'] },
  { kw: ['digital logic'], topics: ['boolean algebra', 'logic gates', 'combinational circuits', 'sequential circuits', 'flip-flops'] },
  { kw: ['workshop'], topics: ['measuring tools', 'fitting', 'safety practices', 'metal joining', 'materials'] },
  { kw: ['basic'], topics: ['fundamentals', 'core concepts', 'applications', 'principles', 'design considerations'] },
];

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (rand, arr) => arr[Math.floor(rand() * arr.length)];

function topicsFor(subjectName) {
  const name = String(subjectName || '').toLowerCase();
  for (const entry of TOPIC_BANK) {
    if (entry.kw.some(k => name.includes(k))) return entry.topics;
  }
  return ['core concepts', 'key principles', 'applications', 'methodologies', 'analysis techniques'];
}

function buildMCQ(topic, difficulty, rand) {
  const stems = {
    Easy: [
      `Which of the following best defines ${topic}?`,
      `In the context of ${topic}, which statement is correct?`,
    ],
    Medium: [
      `Which option correctly describes ${topic}?`,
      `Which of the following is a key characteristic of ${topic}?`,
    ],
    Hard: [
      `Which of the following best represents the application of ${topic} in practice?`,
      `Which option correctly explains the behaviour of ${topic}?`,
    ],
  };
  const q = pick(rand, stems[difficulty]);
  const options = [`A standard definition of ${topic}.`, `An accurate property of ${topic}.`, `A typical misconception about ${topic}.`, `An unrelated statement.`];
  const correct = Math.floor(rand() * 4);
  return {
    question_type: 'MCQ',
    difficulty,
    question: q,
    options: options.map((o, i) => ({ option: String.fromCharCode(65 + i), text: o })),
    answer: String.fromCharCode(65 + correct),
    explanation: `Option ${String.fromCharCode(65 + correct)} is correct because it accurately describes ${topic}.`,
    marks: difficulty === 'Hard' ? 2 : 1,
  };
}

function buildShort(topic, difficulty, rand) {
  const stems = {
    Easy: `Define ${topic} in your own words and give one example.`,
    Medium: `Explain ${topic} and discuss its significance.`,
    Hard: `Analyse ${topic}, including its strengths and limitations.`,
  };
  return {
    question_type: 'Short Answer',
    difficulty,
    question: stems[difficulty],
    answer: `A correct answer covers the definition, key features and one relevant example of ${topic}.`,
    explanation: `Answers are assessed for accuracy, structure and relevant examples.`,
    marks: difficulty === 'Easy' ? 2 : 3,
  };
}

function buildLong(topic, difficulty, rand) {
  const stems = {
    Easy: `Write a short essay describing ${topic}.`,
    Medium: `Explain ${topic} in detail, supported by examples or a labelled diagram.`,
    Hard: `Critically evaluate ${topic}, comparing it with related alternatives where applicable.`,
  };
  return {
    question_type: 'Long Answer',
    difficulty,
    question: stems[difficulty],
    answer: `A complete answer explains ${topic} with structure, examples and a conclusion.`,
    explanation: `Award marks for completeness, accuracy, use of examples and clarity.`,
    marks: difficulty === 'Easy' ? 5 : 10,
  };
}

function buildTF(topic, rand) {
  const statements = [
    `${capitalize(topic)} is a foundational topic in this subject.`,
    `${capitalize(topic)} has no practical applications in industry.`,
    `Understanding ${topic} requires prior knowledge of related concepts.`,
  ];
  const idx = Math.floor(rand() * statements.length);
  const answer = idx === 1 ? 'False' : 'True';
  return {
    question_type: 'True/False',
    difficulty: 'Easy',
    question: `True or False: ${statements[idx]}`,
    answer,
    explanation: answer === 'True'
      ? `${capitalize(topic)} is a foundational topic with practical applications.`
      : `This statement is false — ${topic} does have practical applications.`,
    marks: 1,
  };
}

function capitalize(s) {
  return String(s).replace(/^./, c => c.toUpperCase());
}

async function generateQuestions({ subjectId, examName, count, difficulty, types, userId }) {
  const n = Math.max(1, Math.min(Number(count) || 5, 20));
  const diffs = ['Easy', 'Medium', 'Hard'];
  const typeList = Array.isArray(types) && types.length
    ? types.filter(t => ['MCQ', 'Short Answer', 'Long Answer', 'True/False'].includes(t))
    : ['MCQ', 'Short Answer', 'True/False'];
  const forcedDiff = diffs.includes(difficulty) ? difficulty : null;

  let subject = null;
  let subjectName = null;
  if (subjectId) {
    const [rows] = await pool.query('SELECT id, subject_name FROM subjects WHERE id = ?', [subjectId]);
    subject = rows[0] || null;
  }
  subjectName = subject ? subject.subject_name : 'General Subject';
  const topics = topicsFor(subjectName);
  const rand = mulberry32((subjectId || 1) * 7919 + n * 104729);

  const questions = [];
  for (let i = 0; i < n; i++) {
    const topic = pick(rand, topics);
    const diff = forcedDiff || pick(rand, diffs);
    const type = typeList[i % typeList.length];
    let q;
    if (type === 'MCQ') q = buildMCQ(topic, diff, rand);
    else if (type === 'Short Answer') q = buildShort(topic, diff, rand);
    else if (type === 'Long Answer') q = buildLong(topic, diff, rand);
    else q = buildTF(topic, rand);

    const [r] = await pool.query(
      `INSERT INTO ai_generated_questions
        (user_id, subject_id, exam_name, question_type, difficulty, question, options, answer, explanation, marks, status)
       VALUES (?,?,?,?,?,?,?,?,?,?, 'draft')`,
      [userId, subject ? subject.id : null, examName || null, q.question_type, q.difficulty,
       q.question, q.options ? JSON.stringify(q.options) : null, q.answer, q.explanation, q.marks]
    );
    questions.push({ id: r.insertId, subject: subjectName, ...q });
  }
  return { count: questions.length, subject: subjectName, questions };
}

module.exports = { generateQuestions, topicsFor };
