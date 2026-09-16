export interface StoredMaterial {
  fileContent?: string;
  fileType?: 'pdf' | 'pptx' | 'docx' | 'text';
  fileName?: string;
  slideImages?: string[][];
  fileData?: string;
  slideCount?: number;
  // One full-page rendered image per page (currently populated for PDF uploads) — lets the
  // Room's slide viewer show the real page instead of falling back to text extracted per page.
  pageImages?: string[];
}

const DATABASE_NAME = 'presentai-materials';
const STORE_NAME = 'materials';
const DATABASE_VERSION = 1;

function openMaterialDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open material storage'));
  });
}

export async function saveMaterial(id: string, material: StoredMaterial): Promise<void> {
  const database = await openMaterialDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(material, id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not save material'));
  });
  database.close();
}

export async function getMaterial(id: string): Promise<StoredMaterial | null> {
  const database = await openMaterialDatabase();
  const material = await new Promise<StoredMaterial | null>((resolve, reject) => {
    const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(id);
    request.onsuccess = () => resolve((request.result as StoredMaterial | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error('Could not read material'));
  });
  database.close();
  return material;
}
