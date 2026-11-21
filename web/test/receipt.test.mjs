import { test } from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { requestKey, clearKey } from "../lib/receipt.mjs";

test("unchanged retries reuse a key across reload; changed inputs and completed submissions get a fresh key",async()=>{
  const data=new Map();
  const storage={getItem:key=>data.get(key),setItem:(key,val)=>data.set(key,val),removeItem:key=>data.delete(key)};
  const cache={current:null}, form={customerName:"Fixture",phone:"0000000000",address:"Demo site",requirement:"Solar"};
  const key=await requestKey(form,storage,cache,webcrypto);
  assert.equal(await requestKey(form,storage,{current:null},webcrypto),key);
  assert.doesNotMatch([...data.values()][0],/Fixture|0000000000|Demo site/);
  const amended=await requestKey({...form,address:"Other site"},storage,cache,webcrypto);
  assert.notEqual(amended,key);
  clearKey(storage,cache);
  assert.equal(data.size,0);
  assert.notEqual(await requestKey(form,storage,cache,webcrypto),key);
});
test("in-memory retry remains available when storage access is blocked",async()=>{
  const cache={current:null};
  const key=await requestKey({x:"value"},null,cache,webcrypto);
  assert.equal(await requestKey({x:"value"},null,cache,webcrypto),key);
});
