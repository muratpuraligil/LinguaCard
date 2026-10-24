const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const allSentencesPath = path.join(rootDir, 'src/data/json/all_sentences.json');
const libraryDataPath = path.join(rootDir, 'src/data/libraryData.ts');

const groups = [
  path.join(__dirname, 'agent_tasks/corrections_group1.json'),
  path.join(__dirname, 'agent_tasks/corrections_group2.json'),
  path.join(__dirname, 'agent_tasks/corrections_group3.json'),
  path.join(__dirname, 'agent_tasks/corrections_group4.json'),
];

const allSentences = JSON.parse(fs.readFileSync(allSentencesPath, 'utf8'));

let totalLoaded = 0;
const groupStats = [];

for (let i = 0; i < groups.length; i++) {
  const gPath = groups[i];
  if (!fs.existsSync(gPath)) {
    console.error(`Missing group file: ${gPath}`);
    continue;
  }
  const gData = JSON.parse(fs.readFileSync(gPath, 'utf8'));
  const corrections = gData.corrections || [];
  groupStats.push({ group: i + 1, count: corrections.length });
  totalLoaded += corrections.length;

  for (const c of corrections) {
    const setKey = c.set;
    const sid = c.id;
    const newTr = c.new_turkish;
    const en = c.english;

    if (!allSentences[setKey]) {
      allSentences[setKey] = [];
    }

    const sList = allSentences[setKey];
    const existing = sList.find(s => s.id === sid);

    if (existing) {
      existing.turkish = newTr;
      if (en && en !== existing.english) {
        existing.english = en;
      }
    } else {
      // If it doesn't exist (like aux-11 s59), insert it in the correct position
      console.log(`Inserting missing sentence ${setKey}:${sid}`);
      const numMatch = sid.match(/\d+/);
      const sNum = numMatch ? parseInt(numMatch[0], 10) : 0;
      let inserted = false;
      for (let j = 0; j < sList.length; j++) {
        const curNumMatch = sList[j].id.match(/\d+/);
        const curNum = curNumMatch ? parseInt(curNumMatch[0], 10) : 0;
        if (curNum > sNum) {
          sList.splice(j, 0, { id: sid, turkish: newTr, english: en || '' });
          inserted = true;
          break;
        }
      }
      if (!inserted) {
        sList.push({ id: sid, turkish: newTr, english: en || '' });
      }
    }
  }
}

console.log('Group stats:', groupStats);
console.log('Total corrections processed:', totalLoaded);

// Save updated all_sentences.json
fs.writeFileSync(allSentencesPath, JSON.stringify(allSentences, null, 2), 'utf8');
console.log('Successfully saved src/data/json/all_sentences.json');

// Update libraryData.ts
let tsContent = fs.readFileSync(libraryDataPath, 'utf8');
let setsUpdatedInTs = 0;

for (const setKey of Object.keys(allSentences)) {
  const sentences = allSentences[setKey];
  const formattedSentences = sentences
    .map(s => `          { id: "${s.id}", turkish: ${JSON.stringify(s.turkish)}, english: ${JSON.stringify(s.english)} }`)
    .join(',\n');

  const pattern = new RegExp(`(id:\\s*"${setKey}"[\\s\\S]*?sentences:\\s*\\[)[\\s\\S]*?(\\]\\s*\\})`);

  if (pattern.test(tsContent)) {
    tsContent = tsContent.replace(pattern, (match, p1, p2) => `${p1}\n${formattedSentences}\n        ${p2}`);
    setsUpdatedInTs++;
  } else {
    console.warn(`Could not match set ${setKey} in libraryData.ts!`);
  }
}

fs.writeFileSync(libraryDataPath, tsContent, 'utf8');
console.log(`Successfully updated ${setsUpdatedInTs} sets in src/data/libraryData.ts`);
