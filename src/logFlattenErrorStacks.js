const fs = require('fs');

// assign variable following --log-file to logFilePath
const logFilePath = process.argv[process.argv.indexOf('--log-file') + 1];
const logFileFlatPath = process.argv[process.argv.indexOf('--log-file-flat') + 1]; 

const readFileStream = fs.createReadStream(logFilePath, 'utf8');
const writeFileStream = fs.createWriteStream(logFileFlatPath);

let buffer = '';
let multilineMessage = '';

readFileStream.on('data', function(chunk) {
    buffer += chunk;
    let lines = buffer.split('\n');
    // Keep the last incomplete line in buffer
    buffer = lines.pop();
    
    lines.forEach((line) => {
        if (line.includes('Info:+')) {
            // Remove 'Info:+ ' and concatenate.
            multilineMessage += ' ' + line.replace('Info:+ ', '');
        } else {
            if (multilineMessage) {
                writeFileStream.write(multilineMessage + '\n');
                multilineMessage = '';
            }
            writeFileStream.write(line + '\n');
        }
    });
});

readFileStream.on('end', function() {
    // Process any remaining buffered content
    if (buffer) {
        if (buffer.includes('Info:+')) {
            multilineMessage += ' ' + buffer.replace('Info:+ ', '');
        } else {
            if (multilineMessage) {
                writeFileStream.write(multilineMessage + '\n');
                multilineMessage = '';
            }
            writeFileStream.write(buffer + '\n');
        }
    }
    
    if (multilineMessage) {
        writeFileStream.write(multilineMessage + '\n');
    }
    
    writeFileStream.end();
});

readFileStream.on('error', function(error) {
    console.log('Error reading file:', error);
    writeFileStream.destroy();
});

writeFileStream.on('error', function(error) {
    console.log('Error writing file:', error);
});
