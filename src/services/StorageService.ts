import { openDB, type IDBPDatabase } from 'idb';
import type { Document, DocumentPage, ListOptions, SearchResult, StorageUsage } from '@/types';

const DB_NAME = 'doc-scanner-db';
const DB_VERSION = 1;
const DOCUMENTS_STORE = 'documents';
const PAGES_STORE = 'pages';

export class StorageService {
  private db: IDBPDatabase | null = null;

  /**
   * Initialize the database
   */
  async initialize(): Promise<void> {
    if (this.db) return;

    this.db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Create documents store
        if (!db.objectStoreNames.contains(DOCUMENTS_STORE)) {
          const documentsStore = db.createObjectStore(DOCUMENTS_STORE, {
            keyPath: 'id',
          });
          documentsStore.createIndex('by-created', 'createdAt');
          documentsStore.createIndex('by-updated', 'updatedAt');
          documentsStore.createIndex('by-name', 'name');
        }

        // Create pages store
        if (!db.objectStoreNames.contains(PAGES_STORE)) {
          const pagesStore = db.createObjectStore(PAGES_STORE, {
            keyPath: 'id',
          });
          pagesStore.createIndex('by-document', 'documentId');
        }
      },
    });
  }

  /**
   * Create a new document
   */
  async createDocument(document: Document): Promise<Document> {
    if (!this.db) throw new Error('Database not initialized');

    const tx = this.db.transaction([DOCUMENTS_STORE, PAGES_STORE], 'readwrite');

    // Store document
    await tx.objectStore(DOCUMENTS_STORE).add(document);

    // Store pages
    const pagesStore = tx.objectStore(PAGES_STORE);
    for (const page of document.pages) {
      await pagesStore.add({ ...page, documentId: document.id });
    }

    await tx.done;
    return document;
  }

  /**
   * Get a document by ID
   */
  async getDocument(id: string): Promise<Document | null> {
    if (!this.db) throw new Error('Database not initialized');

    const document = await this.db.get(DOCUMENTS_STORE, id);
    if (!document) return null;

    // Get pages for this document
    const pages = await this.db.getAllFromIndex(PAGES_STORE, 'by-document', id);
    document.pages = pages.sort((a, b) => a.pageNumber - b.pageNumber);

    return document;
  }

  /**
   * Update a document
   */
  async updateDocument(document: Document): Promise<Document> {
    if (!this.db) throw new Error('Database not initialized');

    document.updatedAt = new Date();

    const tx = this.db.transaction([DOCUMENTS_STORE, PAGES_STORE], 'readwrite');

    // Update document
    await tx.objectStore(DOCUMENTS_STORE).put(document);

    // Update pages
    const pagesStore = tx.objectStore(PAGES_STORE);

    // Delete existing pages
    const existingPages = await pagesStore.index('by-document').getAllKeys(document.id);
    for (const key of existingPages) {
      await pagesStore.delete(key);
    }

    // Add updated pages
    for (const page of document.pages) {
      await pagesStore.add({ ...page, documentId: document.id });
    }

    await tx.done;
    return document;
  }

  /**
   * Delete a document
   */
  async deleteDocument(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const tx = this.db.transaction([DOCUMENTS_STORE, PAGES_STORE], 'readwrite');

    // Delete document
    await tx.objectStore(DOCUMENTS_STORE).delete(id);

    // Delete pages
    const pagesStore = tx.objectStore(PAGES_STORE);
    const pageKeys = await pagesStore.index('by-document').getAllKeys(id);
    for (const key of pageKeys) {
      await pagesStore.delete(key);
    }

    await tx.done;
  }

  /**
   * List all documents
   */
  async listDocuments(options?: ListOptions): Promise<Document[]> {
    if (!this.db) throw new Error('Database not initialized');

    const sortBy = options?.sortBy || 'updatedAt';
    const sortOrder = options?.sortOrder || 'desc';
    const limit = options?.limit;
    const offset = options?.offset || 0;

    let documents: Document[];

    if (sortBy === 'name') {
      documents = await this.db.getAllFromIndex(DOCUMENTS_STORE, 'by-name');
    } else if (sortBy === 'createdAt') {
      documents = await this.db.getAllFromIndex(DOCUMENTS_STORE, 'by-created');
    } else {
      documents = await this.db.getAllFromIndex(DOCUMENTS_STORE, 'by-updated');
    }

    // Sort
    if (sortOrder === 'desc') {
      documents.reverse();
    }

    // Get pages for each document
    for (const doc of documents) {
      const pages = await this.db.getAllFromIndex(PAGES_STORE, 'by-document', doc.id);
      doc.pages = pages.sort((a, b) => a.pageNumber - b.pageNumber);
    }

    // Apply pagination
    if (limit !== undefined) {
      documents = documents.slice(offset, offset + limit);
    } else if (offset > 0) {
      documents = documents.slice(offset);
    }

    return documents;
  }

  /**
   * Search documents by text
   */
  async searchDocuments(query: string): Promise<SearchResult[]> {
    if (!this.db) throw new Error('Database not initialized');

    const documents = await this.listDocuments();
    const results: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    for (const doc of documents) {
      for (const page of doc.pages) {
        if (page.ocrResult) {
          const matches: SearchResult['matches'] = [];
          const text = page.ocrResult.text.toLowerCase();
          let position = text.indexOf(lowerQuery);

          while (position !== -1) {
            matches.push({
              text: page.ocrResult.text.substr(position, query.length),
              position,
            });
            position = text.indexOf(lowerQuery, position + 1);
          }

          if (matches.length > 0) {
            results.push({
              documentId: doc.id,
              pageId: page.id,
              matches,
            });
          }
        }
      }
    }

    return results;
  }

  /**
   * Get storage usage information
   */
  async getStorageUsage(): Promise<StorageUsage> {
    if (!navigator.storage || !navigator.storage.estimate) {
      return {
        used: 0,
        quota: 0,
        percentage: 0,
      };
    }

    const estimate = await navigator.storage.estimate();
    const used = estimate.usage || 0;
    const quota = estimate.quota || 0;
    const percentage = quota > 0 ? (used / quota) * 100 : 0;

    return {
      used,
      quota,
      percentage,
    };
  }

  /**
   * Clear all data
   */
  async clearAll(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const tx = this.db.transaction([DOCUMENTS_STORE, PAGES_STORE], 'readwrite');
    await tx.objectStore(DOCUMENTS_STORE).clear();
    await tx.objectStore(PAGES_STORE).clear();
    await tx.done;
  }

  /**
   * Add a page to a document
   */
  async addPage(documentId: string, page: DocumentPage): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const document = await this.getDocument(documentId);
    if (!document) throw new Error('Document not found');

    document.pages.push(page);
    document.metadata.totalPages = document.pages.length;
    await this.updateDocument(document);
  }

  /**
   * Remove a page from a document
   */
  async removePage(documentId: string, pageId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const document = await this.getDocument(documentId);
    if (!document) throw new Error('Document not found');

    document.pages = document.pages.filter((p) => p.id !== pageId);

    // Renumber pages
    document.pages.forEach((p, index) => {
      p.pageNumber = index + 1;
    });

    document.metadata.totalPages = document.pages.length;
    await this.updateDocument(document);
  }

  /**
   * Reorder pages in a document
   */
  async reorderPages(documentId: string, pageIds: string[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const document = await this.getDocument(documentId);
    if (!document) throw new Error('Document not found');

    const pageMap = new Map(document.pages.map((p) => [p.id, p]));
    document.pages = pageIds.map((id) => pageMap.get(id)!).filter(Boolean);

    // Renumber pages
    document.pages.forEach((p, index) => {
      p.pageNumber = index + 1;
    });

    await this.updateDocument(document);
  }

  /**
   * Export a document's data for sharing
   */
  async exportDocument(documentId: string): Promise<Blob> {
    if (!this.db) throw new Error('Database not initialized');

    const document = await this.getDocument(documentId);
    if (!document) throw new Error('Document not found');

    const json = JSON.stringify(document, null, 2);
    return new Blob([json], { type: 'application/json' });
  }

  /**
   * Import a document from exported data
   */
  async importDocument(data: Blob): Promise<Document> {
    if (!this.db) throw new Error('Database not initialized');

    const text = await data.text();
    const document: Document = JSON.parse(text);

    // Convert date strings back to Date objects
    document.createdAt = new Date(document.createdAt);
    document.updatedAt = new Date(document.updatedAt);

    await this.createDocument(document);
    return document;
  }
}

// Singleton instance
let storageServiceInstance: StorageService | null = null;

export async function getStorageService(): Promise<StorageService> {
  if (!storageServiceInstance) {
    storageServiceInstance = new StorageService();
    await storageServiceInstance.initialize();
  }
  return storageServiceInstance;
}
