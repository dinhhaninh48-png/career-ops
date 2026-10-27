import test from 'node:test';
import assert from 'node:assert/strict';
import { isSlbListing, normalizeCoveoResults, readSlbCoveoResults } from '../slb-coveo-adapter.mjs';

const url = 'https://careers.slb.com/jobdescription.aspx?id=EF15562-en_US%201';
test('detects only SLB HTTPS listing', () => {
  assert.equal(isSlbListing('https://careers.slb.com/job-listing#cq=x'), true);
  assert.equal(isSlbListing('http://careers.slb.com/job-listing'), false);
  assert.equal(isSlbListing('https://evil.example/job-listing'), false);
  assert.equal(isSlbListing('https://careers.slb.com/'), false);
});
test('fixture: title, URL, dedup and cap', () => {
  const records = [
    {title:' Subsurface   Manager ',clickUri:url},
    {title:'Duplicate',clickUri:url},
    {title:'Maintenance Engineer',clickUri:'https://careers.slb.com/jobdescription.aspx?id=MAINT-Eng'},
  ];
  assert.deepEqual(normalizeCoveoResults(records), [
    {title:'Subsurface Manager',url},
    {title:'Maintenance Engineer',url:'https://careers.slb.com/jobdescription.aspx?id=MAINT-Eng'}
  ]);
  assert.equal(normalizeCoveoResults(records,1).length,1);
  assert.deepEqual(normalizeCoveoResults(records,0),[]);
});
test('fixture: empty/missing/bad and off-domain URLs are rejected', () => {
  assert.deepEqual(normalizeCoveoResults([
    null,{}, {title:'',clickUri:url},{title:'Good Role',clickUri:'javascript:alert(1)'},
    {title:'Good Role',clickUri:'https://evil.example/jobdescription.aspx?id=1'},
    {title:'Good Role',clickUri:'http://careers.slb.com/jobdescription.aspx?id=1'},
    {title:'Good Role',clickUri:'https://careers.slb.com/about'},
  ]),[]);
});
test('fixture: reads structured result objects through locator, not anchors', async () => {
  const page = {locator: () => ({
    first: () => ({waitFor: async () => {}}),
    evaluateAll: async fn => fn([{result:{title:'Subsurface Manager',clickUri:url}}])
  })};
  assert.deepEqual(await readSlbCoveoResults(page),[{title:'Subsurface Manager',url}]);
});
test('fixture: missing Coveo results safely returns []', async () => {
  const page={locator:()=>({first:()=>({waitFor:async()=>{throw Error('timeout')}})})};
  assert.deepEqual(await readSlbCoveoResults(page),[]);
});
