// db.js - Maneja el almacenamiento locla (IndexedDB) de los albaranes
const DB_NAME = 'AlbaranesDB';
const DB_VERSION = 1;
const STORE_NAME = 'albaranes';

let db = null;

// Abrir o crear la base de datos
function abrirDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const dbActual = event.target.result;
            if (!dbActual.objectStoreNames.contains(STORE_NAME)) {
                // Crear almacén con clave auto-incremental
                const store = dbActual.createObjectStore(STORE_NAME, {
                    keyPath: 'id',
                    autoIncrement: true
                });
                // Indices para buscar por matrícula o fecha
                store.createIndex('fecha', 'fecha', { unique: false});
                store.createIndex('matricula', 'matricula', { unique: false });
            }
        };
    });
}

// Guardar un albarán (recibe objeto con matrícula, peso, fotoBase64, fecha)
async function guardarAlbaran(albaran) {
    await abrirDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.add(albaran);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Obener todos los albaranes ordenados por fecha descendente
async function obtenerAlbaranes() {
    await abrirDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('fecha');
        const request = index.openCursor(null, 'prev'); // orden descendente
        const resultados = [];
        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                resultados.push(cursor.value);
                cursor.continue();
            } else {
                resolve(resultados)
            }
        };
        request.onerror = () => reject(request.error);
    });
}

// Borrar un albarán por id
async function borrarAlbaran(id) {
    await abrirDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

