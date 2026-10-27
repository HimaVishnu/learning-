// Static validation only: this command never sends an HTTP request.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const path = require('node:path');
const directory = __dirname;
const read = name => JSON.parse(fs.readFileSync(path.join(directory, name), 'utf8'));
const main = read('restful-booker.postman_collection.json');
const investigation = read('restful-booker-date-filters.investigation.postman_collection.json');
const data = read('booking-data.json');
assert.equal(data.length, 2, 'The data file must supply two iterations');
for (const row of data) {
  for (const key of ['dataFirstName', 'dataLastName', 'dataCheckin', 'dataCheckout', 'dataNeeds']) {
    assert.equal(typeof row[key], 'string', key);
    assert.ok(row[key].trim(), key);
  }
  assert.equal(typeof row.dataPrice, 'number');
  assert.equal(typeof row.dataDepositPaid, 'boolean');
}
function flatten(items) {
  return items.flatMap(item => item.item ? flatten(item.item) : [item]);
}
let scriptCount = 0;
function validateScripts(node) {
  for (const event of node.event || []) {
    assert.ok(['prerequest', 'test'].includes(event.listen));
    new vm.Script(event.script.exec.join('\n'), { filename: node.name || node.info.name });
    scriptCount++;
  }
  for (const item of node.item || []) validateScripts(item);
}
for (const collection of [main, investigation]) {
  validateScripts(collection);
  assert.equal(collection.info.schema, 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json');
  assert.equal(collection.variable.find(v => v.key === 'baseUrl').value, 'https://restful-booker.herokuapp.com');
  for (const variable of collection.variable) {
    if (!['baseUrl', 'username', 'password'].includes(variable.key)) {
      assert.equal(variable.value, '', `Shareable runtime variable ${variable.key} must be empty`);
    }
  }
  for (const item of flatten(collection.item)) {
    if (['PUT', 'PATCH', 'DELETE'].includes(item.request.method) && !item.name.startsWith('PATCH with invalid')) {
      assert.equal(item.request.auth.type, 'basic', item.name);
      assert.ok(item.request.url.raw.includes('{{bookingId}}'));
      assert.ok(item.event.some(e => e.listen === 'prerequest' && e.script.exec.join('\n').includes('pm.execution.skipRequest()')));
      assert.ok(!item.request.header.some(h => /^(cookie|authorization)$/i.test(h.key)), item.name);
    }
    if (item.request.method === 'GET') assert.equal(item.request.body, undefined, item.name);
  }
}
const requests = flatten(main.item);
assert.deepEqual(requests.map(i => i.name), [
  'Health', 'Authenticate', 'Invalid authentication', 'Create Booking', 'Retrieve created booking',
  'Get all booking IDs', 'Filter booking IDs by name', 'PUT Booking', 'Verify PUT persisted',
  'PATCH Booking', 'Verify PATCH persisted', 'PATCH with invalid Basic authentication',
  'Verify invalid Basic PATCH left data unchanged', 'PATCH with invalid token',
  'Verify invalid token PATCH left data unchanged', 'DELETE Booking', 'Verify deleted booking returns 404',
]);
assert.equal(requests.find(i => i.name === 'Get all booking IDs').request.url.raw, '{{baseUrl}}/booking');
assert.equal(requests.find(i => i.name === 'Get all booking IDs').request.url.query, undefined);
const list = main.item.find(i => i.name === '04 Booking ID searches');
assert.ok(list.event.some(e => e.listen === 'test'));
assert.ok(list.item.every(i => !i.event.some(e => e.listen === 'test')), 'List assertions belong at folder level');
for (const name of ['Retrieve created booking', 'Verify PUT persisted', 'Verify PATCH persisted', 'Verify invalid Basic PATCH left data unchanged', 'Verify invalid token PATCH left data unchanged']) {
  const script = requests.find(i => i.name === name).event.find(e => e.listen === 'test').script.exec.join('\n');
  assert.ok(script.includes('expectedBooking'));
  assert.ok(!script.includes('pm.request.body'));
  assert.ok(!script.includes('collectionVariables.set'));
}
const finalGet = requests.at(-1).event.find(e => e.listen === 'test').script.exec.join('\n');
assert.ok(finalGet.includes('status(404)'));

// The backup is local-only. If present, also prove original date checks survived.
const backupPath = path.join(directory, '.backups/restful-booker.original.postman_collection.json');
if (fs.existsSync(backupPath)) {
  const original = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  const originalFolder = original.item.find(i => i.name === 'Booking ID searches');
  const dateFolder = investigation.item.find(i => i.name.startsWith('04 Original date-filter'));
  assert.deepEqual(dateFolder.event, originalFolder.event);
  assert.deepEqual(dateFolder.item.map(i => i.request), originalFolder.item.filter(i => i.name.startsWith('Filter booking IDs by dates')).map(i => i.request));
}
console.log(`Validated two collection JSON files, ${scriptCount} JavaScript scripts, two typed data rows, request order, empty runtime exports, auth, ownership guards, and verification GETs.`);
