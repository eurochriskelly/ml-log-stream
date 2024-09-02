#!/usr/bin/env node

const fs = require('fs');

const { readFileSync, writeFileSync } = fs;
const props = {}

console.log('Doin it')
const data = readFileSync('./urls.txt', 'utf8')

const lines = data.split('\n')
console.log('Number of lines is ', lines.length);

lines.forEach((line) => {
  const rest = line.split('?').pop();
  parts = rest.split('&');
  parts.forEach((part) => {
    const [key, value] = part.split('=');
    if (props[key]) {
      props[key].push(value);
    } else {
      props[key] = [value];
    }
  });
})

console.log(Object.keys(props))
