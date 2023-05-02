import { Log } from '$lib/core/services/logging';
import type {
  ConversationDTO,
  NewConversationDTO
} from '$lib/models/types/conversation.type';
import { v4 as uuidv4 } from 'uuid';

// create a new indexedDB database
let db: IDBDatabase | null = null;

async function openConnection(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (db) {
      return resolve(db);
    }

    if (typeof window === 'undefined') return reject('No window object');
    if (!window.indexedDB) return reject('No indexedDB object');

    const request = window.indexedDB.open('conversations', 3);

    request.onupgradeneeded = (event) => {
      const db = event.target!.result as IDBDatabase;
      // create the object store
      const objectStore = db.createObjectStore('conversations', {
        keyPath: 'id'
      });
    };

    request.onsuccess = (event) => {
      Log.DEBUG('Opened indexedDB database', event);

      db = event.target!.result as IDBDatabase;
      resolve(db);
    };

    request.onerror = (event) => {
      Log.ERROR('Error opening indexedDB database', event);
      reject(event);
    };
  });
}

export async function updateConversation(
  conversation: ConversationDTO
): Promise<boolean> {
  const db = await openConnection();
  const tx = db.transaction('conversations', 'readwrite');
  const store = tx.objectStore('conversations');
  const query = store.put(conversation);

  return new Promise((resolve) => {
    query.onsuccess = () => {
      resolve(true);
    };
    query.onerror = () => {
      resolve(false);
    };
  });
}

export async function addConversation(
  conversation: NewConversationDTO
): Promise<ConversationDTO | null> {
  const toAdd: ConversationDTO = {
    id: uuidv4(),
    ...conversation,
    messages: []
  };

  const db = await openConnection();
  const tx = db.transaction('conversations', 'readwrite');
  const store = tx.objectStore('conversations');
  const query = store.add(toAdd);

  return new Promise((resolve) => {
    query.onsuccess = () => {
      resolve(toAdd);
    };
    query.onerror = () => {
      resolve(null);
    };
  });
}

export async function deleteConversation(id: string): Promise<boolean> {
  const db = await openConnection();
  const tx = db.transaction('conversations', 'readwrite');
  const store = tx.objectStore('conversations');
  const query = store.delete(id);

  return new Promise((resolve) => {
    query.onsuccess = () => {
      resolve(true);
    };
    query.onerror = () => {
      resolve(false);
    };
  });
}

export async function getAllConversations(): Promise<ConversationDTO[]> {
  const db = await openConnection();
  const tx = db.transaction('conversations', 'readonly');
  const store = tx.objectStore('conversations');

  return new Promise((resolve) => {
    const conversations: ConversationDTO[] = [];

    store.openCursor().onsuccess = (event) => {
      const cursor = event.target!.result as IDBCursorWithValue | null;
      if (cursor) {
        const conversation = cursor.value as ConversationDTO;
        conversations.push(conversation);
        // continue next record
        cursor.continue();
      } else {
        resolve(conversations);
      }
    };
  });
}
