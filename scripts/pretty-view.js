#!/usr/bin/env node

const fs = require('fs');
const readline = require('readline');
const chalk = require('chalk');

// Color schemes for different table types
const colors = {
  logs: {
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
    message: chalk.white
  },
  requests: {
    timestamp: chalk.gray,
    pathPart1: chalk.yellow,
    pathPart2: chalk.yellow,
    user: chalk.cyan,
    elapsedTime: (time) => {
      if (time < 100) return chalk.green(time.toFixed(2));
      if (time < 500) return chalk.yellow(time.toFixed(2));
      return chalk.red(time.toFixed(2));
    }
  }
};

function pad(str, len) {
  str = String(str || '');
  return str.length > len ? str.substring(0, len - 1) + '…' : str.padEnd(len);
}

function formatLogsRow({ timestamp, row }) {
  const status = row.statusCode || '';
  const url = (row.url || '').substring(0, 60);
  const msg = (row.message || '').substring(0, 40);
  
  return `${colors.logs.timestamp(pad(timestamp, 24))} ${chalk.cyan('[LOG]')} ${colors.logs.host(pad(row.host, 15))} ${colors.logs.type(pad(row.type, 8))} ${status ? colors.logs.statusCode(pad(status, 6)) : pad('', 6)} ${colors.logs.method(pad(row.method, 7))} ${colors.logs.url(pad(url, 60))} ${colors.logs.user(pad(row.user, 15))} ${colors.logs.message(msg)}`;
}

function formatRequestsRow({ timestamp, row }) {
  const path = `${row.pathPart1 || ''}/${row.pathPart2 || ''}`.substring(0, 50);
  const elapsed = parseFloat(row.elapsedTime) || 0;
  
  return `${colors.requests.timestamp(pad(timestamp, 24))} ${chalk.green('[REQ]')} ${colors.requests.pathPart1(pad(path, 50))} ${colors.requests.user(pad(row.user, 15))} ${colors.requests.elapsedTime(pad(elapsed.toFixed(2) + 'ms', 10))}`;
}

function printLogsHeader() {
  console.log(chalk.bold.cyan(pad('Timestamp', 24)) + ' ' + 
    pad('', 5) + ' ' +
    chalk.bold.cyan(pad('Host', 15)) + ' ' +
    chalk.bold.cyan(pad('Type', 8)) + ' ' +
    chalk.bold.cyan(pad('Status', 6)) + ' ' +
    chalk.bold.cyan(pad('Method', 7)) + ' ' +
    chalk.bold.cyan(pad('URL', 60)) + ' ' +
    chalk.bold.cyan(pad('User', 15)) + ' ' +
    chalk.bold.cyan('Message'));
  console.log('─'.repeat(200));
}

function printRequestsHeader() {
  console.log(chalk.bold.green(pad('Timestamp', 24)) + ' ' + 
    pad('', 5) + ' ' +
    chalk.bold.green(pad('Path', 50)) + ' ' +
    chalk.bold.green(pad('User', 15)) + ' ' +
    chalk.bold.green('Elapsed'));
  console.log('─'.repeat(100));
}

function showProgress(count) {
  if (count % 1000 === 0) {
    process.stderr.write(`\r${chalk.gray(`Reading... ${count.toLocaleString()} rows`)}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const showAll = args.includes('--all');
  
  let limit = 200;
  const limitIdx = args.findIndex(arg => arg === '--limit' || arg === '-n');
  if (limitIdx !== -1 && args[limitIdx + 1]) {
    limit = parseInt(args[limitIdx + 1], 10) || 200;
  }
  
  const inputFile = args.find(arg => !arg.startsWith('--') && !arg.startsWith('-') && !/^\d+$/.test(arg));
  
  const inputStream = inputFile 
    ? fs.createReadStream(inputFile)
    : process.stdin;

  if (!inputFile && process.stdin.isTTY) {
    console.log(chalk.yellow('Usage: cat file.jsonl | node scripts/pretty-view.js'));
    console.log(chalk.yellow('   or: node scripts/pretty-view.js file.jsonl'));
    console.log(chalk.yellow('   or: node scripts/pretty-view.js --all file.jsonl     (show all rows)'));
    console.log(chalk.yellow('   or: node scripts/pretty-view.js --limit 500 file.jsonl (show first 500)'));
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
  
  // Separate by table type
  const logs = displayRows.filter(r => r.table === 'logs');
  const requests = displayRows.filter(r => r.table === 'requests');

  if (logs.length > 0) {
    const totalLogs = rows.filter(r => r.table === 'logs').length;
    const suffix = !showAll && totalLogs > logs.length ? ` (showing ${logs.length})` : '';
    console.log(chalk.bold(`\n📋 Access/Error Logs (${totalLogs.toLocaleString()} rows${suffix})\n`));
    printLogsHeader();
    logs.forEach(row => console.log(formatLogsRow(row)));
  }

  if (requests.length > 0) {
    const totalRequests = rows.filter(r => r.table === 'requests').length;
    const suffix = !showAll && totalRequests > requests.length ? ` (showing ${requests.length})` : '';
    console.log(chalk.bold(`\n📈 Request Logs (${totalRequests.toLocaleString()} rows${suffix})\n`));
    printRequestsHeader();
    requests.forEach(row => console.log(formatRequestsRow(row)));
  }
    
  if (!showAll && totalRows > limit) {
    console.log(chalk.yellow(`\n⚠️  Showing ${limit} of ${totalRows.toLocaleString()} rows. Use --all to see everything, or increase --limit.`));
  }

  console.log(chalk.gray(`\nTotal: ${totalRows.toLocaleString()} rows\n`));
}

main().catch(err => {
  console.error(chalk.red('Error:'), err.message);
  process.exit(1);
});
