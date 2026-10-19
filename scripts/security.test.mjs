import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import {authorized,sameOrigin,escapeHtml,validSlug,validateValues} from '../lib/cms/policy.ts';
test('admin access fails closed and requires exact configured identity',()=>{
 assert.equal(authorized(undefined,'owner@example.com'),false);assert.equal(authorized('owner@example.com',undefined),false);
 assert.equal(authorized('visitor@example.com','owner@example.com'),false);assert.equal(authorized('OWNER@example.com','owner@example.com'),true);
});
test('cross-origin and missing-origin writes are rejected',()=>{
 assert.equal(sameOrigin(new Request('https://site.example/api/admin')),false);
 assert.equal(sameOrigin(new Request('https://site.example/api/admin',{headers:{origin:'https://attacker.example'}})),false);
 assert.equal(sameOrigin(new Request('https://site.example/api/admin',{headers:{origin:'https://site.example'}})),true);
});
test('editable text is escaped, slugs and content are constrained',()=>{
 assert.equal(escapeHtml('<script>"&\'</script>'),'&lt;script&gt;&quot;&amp;&#39;&lt;/script&gt;');
 for(const bad of ['../admin','constructor','article-x/../','article-<script>','article-'])assert.equal(validSlug(bad),false);
 assert.equal(validSlug('article-language-play'),true);
 assert.throws(()=>validateValues({title:'x',code:'script'},['title']));assert.throws(()=>validateValues({title:'x'.repeat(30001)},['title']));
 assert.deepEqual(validateValues({title:'שלום'},['title']),{title:'שלום'});
});
test('schema preserves draft/publication separation and detects stale writes',()=>{
 const db=new DatabaseSync(':memory:');db.exec(fs.readFileSync('drizzle/0000_silent_excalibur.sql','utf8'));
 db.prepare('INSERT INTO cms_documents VALUES (?,?,?,?,?,?,?,?)').run('article-test','Test','article','draft one','published one',0,'now','owner');
 const update=db.prepare('UPDATE cms_documents SET draft=?,version=version+1 WHERE id=? AND version=?');
 assert.equal(update.run('draft two','article-test',0).changes,1);assert.equal(update.run('stale','article-test',0).changes,0);
 const row=db.prepare('SELECT draft,published FROM cms_documents').get();assert.equal(row?.draft,'draft two');assert.equal(row?.published,'published one');
 db.prepare('INSERT INTO cms_revisions VALUES (?,?,?,?,?,?,?)').run('r1','article-test',0,'draft one','save','now','owner');
 assert.throws(()=>db.prepare('INSERT INTO cms_revisions VALUES (?,?,?,?,?,?,?)').run('r2','article-test',0,'stale','save','now','owner'));
 db.close();
});
