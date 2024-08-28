const fs = require('fs');

// assign variable following --log-file to logFilePath
const logFilePath = process.argv[process.argv.indexOf('--log-file') + 1];
const logFileFlatPath = process.argv[process.argv.indexOf('--log-file-flat') + 1]; 

const readFileStream = fs.createReadStream(logFilePath, 'utf8');
let newContent = '';
let multilineMessage = '';

readFileStream.on('data', function(chunk) {
    const lines = chunk.split('\n');
    lines.forEach((line) => {
        if (line.includes('Info:+')) {
            // Remove 'Info:+ ' and concatenate.
            multilineMessage += ' ' + line.replace('Info:+ ', '');
        } else {
            if (multilineMessage) {
                newContent += multilineMessage + '\n';
                multilineMessage = '';
            }
            newContent += line + '\n';
        }
    });
});

readFileStream.on('end', function() {
    if (multilineMessage) {
        newContent += multilineMessage + '\n';
    }
    fs.writeFile(logFileFlatPath, newContent, (err) => {
        if (err) throw err;
    });
});

readFileStream.on('error', function(error) {
    console.log('Error reading file:', error);
});
