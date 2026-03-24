#!/usr/bin/env node

const fs = require('fs');
const readline = require('readline');
const chalk = require('chalk');

const colors = {
  timestamp: chalk.gray,
  host: chalk.yellow,
  type: chalk.magenta,
  statusCode: (code) => {
    if (code >= 200 && code < 300) return chalk.green(code);
    if (code >= 300 && code < 400) return chalk.yellow(code);
    if (code >= 400 && code < 500) return chalk.red(code);
    return chalk.red.bold(code);
  },
  method: chalk.blue,
  url: chalk.white,
  user: chalk.cyan,
  message: chalk.white,
  path: chalk.yellow,
  elapsed: (time) => {
    const t = parseFloat(time) || 0;
    if (t < 100) return chalk.green(t.toFixed(2));
    if (t < 500) return chalk.yellow(t.toFixed(2));
    return chalk.red(t.toFixed(2));
  }
};

function formatAccessRow(row) {
  const ts = colors.timestamp(row.timestamp || '');
  const method = colors.method((row.method || '----').padEnd(6));
  const status = row.statusCode ? colors.statusCode(String(row.statusCode).padEnd(5)) : chalk.gray('---- '.padEnd(5));
  const host = colors.host((row.host || 'unknown').padEnd(15));
  const user = colors.user((row.user || '----').padEnd(15));
  const url = colors.url(row.url || '');
  
  return `${chalk.cyan('[ACCESS] ')} ${ts} ${method} ${status} ${host} ${user} ${url}`;
}

function formatErrorRow(row) {
  const ts = colors.timestamp(row.timestamp || '');
  const message = colors.message(row.message || '');
  
  return `${chalk.red('[ERROR]  ')} ${ts} ${message}`;
}

function formatRequestRow(row) {
  const ts = colors.timestamp(row.timestamp || '');
  const elapsed = parseFloat(row.elapsedTime) || 0;
  const elapsedStr = colors.elapsed(elapsed).padStart(10);
  const user = colors.user((row.user || 'anonymous').padEnd(15));
  const path = colors.path(`${row.pathPart1 || ''}/${row.pathPart2 || ''}`);
  
  return `${chalk.green('[REQUEST]')} ${ts} ${elapsedStr} ${user} ${path}`;
}

function showProgress(count) {
  if (count % 1000 === 0) {
    process.stderr.write(`\r${chalk.gray(`Reading... ${count.toLocaleString()} rows`)}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const showAll = args.includes('--all');
  
  let limit = 500;
  const limitIdx = args.findIndex(arg => arg === '--limit' || arg === '-n');
  if (limitIdx !== -1 && args[limitIdx + 1]) {
    limit = parseInt(args[limitIdx + 1], 10) || 500;
  }
  
  const inputFile = args.find(arg => !arg.startsWith('--') && !arg.startsWith('-') && !/^\d+$/.test(arg));
  
  const inputStream = inputFile 
    ? fs.createReadStream(inputFile)
    : process.stdin;

  if (!inputFile && process.stdin.isTTY) {
    console.log(chalk.yellow('Usage: cat file.jsonl | node scripts/pretty-view.js'));
    console.log(chalk.yellow('   or: node scripts/pretty-view.js file.jsonl'));
    console.log(chalk.yellow('   or: node scripts/pretty-view.js --all file.jsonl'));
    console.log(chalk.yellow('   or: node scripts/pretty-view.js --limit 1000 file.jsonl'));
    process.exit(1);
  }

  const rl = readline.createInterface({
    input: inputStream,
    crlfDelay: Infinity
  });

  const rows = [];
  let count = 0;
  
  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const data = JSON.parse(line);
      if (data.table && data.row) {
        rows.push(data);
        count++;
        if (!showAll && count <= limit) {
          showProgress(count);
        }
      }
    } catch (e) {
      // Skip invalid lines
    }
  }

  process.stderr.write('\r' + ' '.repeat(50) + '\r');

  if (rows.length === 0) {
    console.log(chalk.yellow('No valid JSONL rows found'));
    process.exit(0);
  }

  const displayRows = showAll ? rows : rows.slice(0, limit);
  const totalRows = rows.length;

  console.log(chalk.bold('\n📊 Log Stream (chronological view)\n'));
  
  displayRows.forEach(({ table, row }) => {
    if (table === 'logs') {
      if (row.type === 'error') {
        console.log(formatErrorRow(row));
      } else {
        console.log(formatAccessRow(row));
      }
    } else if (table === 'requests') {
      console.log(formatRequestRow(row));
    }
  });
    
  if (!showAll && totalRows > limit) {
    console.log(chalk.yellow(`\n⚠️  Showing ${limit} of ${totalRows.toLocaleString()} rows. Use --all to see everything.`));
  }

  console.log(chalk.gray(`\nTotal: ${totalRows.toLocaleString()} rows\n`));
}

main().catch(err => {
  console.error(chalk.red('Error:'), err.message);
  process.exit(1);
});
