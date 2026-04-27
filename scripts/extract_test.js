import fs from 'fs';
import { PDFParse } from 'pdf-parse';

async function extract() {
    const dataBuffer = fs.readFileSync('./PratikYap/TÜRKÇE YARDIMCI FİİL ANTREMANLARI/1. AM _ IS _ ARE.pdf');
    const parser = new PDFParse({ data: dataBuffer });
    const result = await parser.getText();
    console.log('--- START TEXT ---');
    console.log(result.text);
    console.log('--- END TEXT ---');
    await parser.destroy();
}

extract().catch(console.error);
