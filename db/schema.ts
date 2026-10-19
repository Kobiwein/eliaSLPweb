import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
export const documents = sqliteTable('cms_documents', {
 id:text('id').primaryKey(), title:text('title').notNull(), kind:text('kind').notNull(),
 draft:text('draft').notNull(), published:text('published'), version:integer('version').notNull().default(1),
 updatedAt:text('updated_at').notNull(), updatedBy:text('updated_by').notNull(),
});
export const revisions = sqliteTable('cms_revisions', {
 id:text('id').primaryKey(), documentId:text('document_id').notNull(), version:integer('version').notNull(),
 payload:text('payload').notNull(), action:text('action').notNull(), createdAt:text('created_at').notNull(), actor:text('actor').notNull(),
},t=>[uniqueIndex('revision_document_version').on(t.documentId,t.version)]);
