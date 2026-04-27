const fs = require('fs');
const path = require('path');

const libPath = path.join(__dirname, '../src/data/libraryData.ts');
const jsonPath = path.join(__dirname, '../src/data/json/all_sentences.json');

let libData = fs.readFileSync(libPath, 'utf8');
let jsonData = fs.readFileSync(jsonPath, 'utf8');

const replacements = [
    { match: /\bCok\b/g, replace: 'Çok' },
    { match: /\bcok\b/gi, replace: 'çok' },
    { match: /\bCunku\b/g, replace: 'Çünkü' },
    { match: /\bCikis\b/g, replace: 'Çıkış' },
];

function fixData(data) {
    return data.replace(/(["']?turkish["']?\s*:\s*["'])(.*?)(["'])/g, (match, prefix, content, suffix) => {
        let text = content;
        
        for (const rule of replacements) {
            text = text.replace(rule.match, rule.replace);
        }
        
        // Capitalize 'Çok' if it's the first word in the sentence
        if (text.startsWith('çok')) {
            text = 'Ç' + text.slice(1);
        }
        
        return prefix + text + suffix;
    });
}

libData = fixData(libData);
jsonData = fixData(jsonData);

fs.writeFileSync(libPath, libData, 'utf8');
fs.writeFileSync(jsonPath, jsonData, 'utf8');

console.log("Fixed Cok -> Çok");
