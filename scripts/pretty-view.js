#!/usr/bin/env node

const fs = require('fs');
const readline = require('readline');
const Table = require('cli-table3');
const chalk = require('chalk');

// Color schemes for different table types
const colors = {
  logs: {
    header: chalk.cyan.bold,
    border: chalk.cyan,
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
    header: chalk.green.bold,
    border: chalk.green,
    timestamp: chalk.gray,
    url: chalk.white,
    pathPart1: chalk.yellow,
    pathPart2: chalk.yellow,
    user: chalk.cyan,
    elapsedTime: (time) => {
      if (time < 100) return chalk.green(time.toFixed(2));
      if (time < 500) return chalk.yellow(time.toFixed(2));
      return chalk.red(time.toFixed(2));
    },
    cacheHits: chalk.blue,
    cacheMisses: chalk.magenta
  }
};

function formatLogsTable(rows) {
  const table = new Table({
    head: [
      colors.logs.header('Timestamp'),
      colors.logs.header('Host'),
      colors.logs.header('Type'),
      colors.logs.header('Status'),
      colors.logs.header('Method'),
      colors.logs.header('URL'),
      colors.logs.header('User'),
      colors.logs.header('Message')
    ],
    colWidths: [24, 15, 10, 8, 8, 40, 15, 30],
    style: {
      border: ['gray'],
      head: []
    },
    wordWrap: true,
    truncate: '…'
  });

  rows.forEach(({ row }) => {
    const status = row.statusCode || '';
    const url = (row.url || '').length > 37 ? (row.url || '').substring(0, 37) + '…' : (row.url || '');
    const message = (row.message || '').length > 27 ? (row.message || '').substring(0, 27) + '…' : (row.message || '');
    
    table.push([
      colors.logs.timestamp(row.timestamp || ''),
      colors.logs.host(row.host || ''),
      colors.logs.type(row.type || ''),
      status ? colors.logs.statusCode(status) : '',
      colors.logs.method(row.method || ''),
      colors.logs.url(url),
      colors.logs.user(row.user || ''),
      colors.logs.message(message)
    ]);
  });

  return table.toString();
}

function formatRequestsTable(rows) {
  const table = new Table({
    head: [
      colors.requests.header('Timestamp'),
      colors.requests.header('Path'),
      colors.requests.header('User'),
      colors.requests.header('Elapsed'),
      colors.requests.header('Hits'),
      colors.requests.header('Misses')
    ],
    colWidths: [24, 50, 15, 12, 10, 10],
    style: {
      border: ['gray'],
      head: []
    },
    wordWrap: true,
    truncate: '…'
  });

  rows.forEach(({ row }) => {
    const path = `${row.pathPart1 || ''}/${row.pathPart2 || ''}`;
    const displayPath = path.length > 47 ? path.substring(0, 47) + '…' : path;
    const elapsed = parseFloat(row.elapsedTime) || 0;
    
    // Sum up various cache hits and misses
    const hits = (
      (row.compressedTreeCacheHits || 0) +
      (row.dbLibraryModuleCacheHits || 0) +
      (row.dbMainModuleSequenceCacheHits || 0) +
      (row.dbProgramCacheHits || 0) +
      (row.envProgramCacheHits || 0) +
      (row.fsProgramCacheHits || 0) +
      (row.expandedTreeCacheHits || 0) +
      (row.valueCacheHits || 0) +
      (row.listCacheHits || 0)
    );
    
    const misses = (
      (row.compressedTreeCacheMisses || 0) +
      (row.dbLibraryModuleCacheMisses || 0) +
      (row.dbMainModuleSequenceCacheMisses || 0) +
      (row.dbProgramCacheMisses || 0) +
      (row.envProgramCacheMisses || 0) +
      (row.fsProgramCacheMisses || 0) +
      (row.expandedTreeCacheMisses || 0) +
      (row.valueCacheMisses || 0) +
      (row.listCacheMisses || 0)
    );

    table.push([
      colors.requests.timestamp(row.timestamp || ''),
      colors.requests.pathPart1(displayPath),
      colors.requests.user(row.user || ''),
      colors.requests.elapsedTime(elapsed),
      colors.requests.cacheHits(hits.toString()),
      colors.requests.cacheMisses(misses.toString())
    ]);
  });

  return table.toString();
}

function printChronologicalView(rows) {
  console.log(chalk.bold('\n📊 Log Stream (chronological view)\n'));
  
  rows.forEach(({ table, timestamp, row }) => {
    const timeStr = chalk.gray(timestamp);
    
    if (table === 'logs') {
      const status = row.statusCode || '';
      const statusStr = status ? colors.logs.statusCode(status) : chalk.gray('----');
      const method = colors.logs.method(row.method || '----');
      const url = colors.logs.url((row.url || '').substring(0, 60));
      const host = colors.logs.host(row.host || 'unknown');
      const type = colors.logs.type(row.type || 'unknown');
      
      console.log(`${timeStr} ${chalk.cyan('[LOG]')} ${host} ${type} ${statusStr} ${method} ${url}`);
      
      if (row.message) {
        const msg = row.message.length > 80 ? row.message.substring(0, 80) + '…' : row.message;
        console.log(`                   ${chalk.gray(msg)}`);
      }
    } else if (table === 'requests') {
      const path = `${row.pathPart1 || ''}/${row.pathPart2 || ''}`;
      const elapsed = parseFloat(row.elapsedTime) || 0;
      const elapsedStr = colors.requests.elapsedTime(`${elapsed.toFixed(2)}ms`);
      const pathStr = colors.requests.pathPart1(path);
      const user = colors.requests.user(row.user || 'anonymous');
      
      console.log(`${timeStr} ${chalk.green('[REQ]')} ${pathStr} ${user} ${elapsedStr}`);
    }
  });
}

async function main() {
  const args = process.argv.slice(2);
  const useTables = args.includes('--tables');
  const inputFile = args.find(arg => !arg.startsWith('--'));
  
  const inputStream = inputFile 
    ? fs.createReadStream(inputFile)
    : process.stdin;

  if (!inputFile && process.stdin.isTTY) {
    console.log(chalk.yellow('Usage: cat file.jsonl | node scripts/pretty-view.js'));
    console.log(chalk.yellow('   or: node scripts/pretty-view.js file.jsonl'));
    console.log(chalk.yellow('   or: node scripts/pretty-view.js --tables file.jsonl  (for table view)'));
    process.exit(1);
  }

  const rl = readline.createInterface({
    input: inputStream,
    crlfDelay: Infinity
  });

  const rows = [];
  
  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const data = JSON.parse(line);
      if (data.table && data.row) {
        rows.push(data);
      }
    } catch (e) {
      // Skip invalid lines
    }
  }

  if (rows.length === 0) {
    console.log(chalk.yellow('No valid JSONL rows found'));
    process.exit(0);
  }

  if (useTables) {
    // Group by table type
    const logs = rows.filter(r => r.table === 'logs');
    const requests = rows.filter(r => r.table === 'requests');

    if (logs.length > 0) {
      console.log(chalk.bold(`\n📋 Access/Error Logs (${logs.length} rows)\n`));
      console.log(formatLogsTable(logs));
    }

    if (requests.length > 0) {
      console.log(chalk.bold(`\n📈 Request Logs (${requests.length} rows)\n`));
      console.log(formatRequestsTable(requests));
    }
  } else {
    // Chronological stream view (default)
    printChronologicalView(rows);
  }

  console.log(chalk.gray(`\nTotal: ${rows.length} rows\n`));
}

main().catch(err => {
  console.error(chalk.red('Error:'), err.message);
  process.exit(1);
});
