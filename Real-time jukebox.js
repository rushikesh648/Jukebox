## 1. Real-Time Movie Jukebox (HTML/JS/Firestore)This is the original collaborative Jukebox application that uses Firebase Firestore for real-time data persistence.File: index.html
import { initializeApp } from "https://www.google.com/search?q=https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged }  from "https://www.google.com/search?q=https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot, addDoc, serverTimestamp, query }  from "https://www.google.com/search?q=https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";// Global variables provided by the environment
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
let db;
let auth;
let userId = 'unknown';
document.addEventListener('DOMContentLoaded', () => {const jukeboxList = document.getElementById('jukebox-list');
    const statusDisplay = document.getElementById('status-display');
    const submitButton = document.getElementById('submit-button');
    const movieInput = document.getElementById('movie-input');
    const songInput = document.getElementById('song-input');
    const form = document.getElementById('add-form');
    const updateStatus = (message, color = 'text-gray-400') => {
   
    statusDisplay.className = `text-sm mt-4 p-2 rounded-lg ${color}`;
    statusDisplay.textContent = message;
};

const initFirebase = async () => {
    try {
        if (Object.keys(firebaseConfig).length === 0) {
             throw new Error("Firebase configuration is missing.");
        }
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        
        updateStatus('Authenticating...', 'bg-blue-900/50');
        
        // 1. Handle Authentication
        if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
        } else {
            await signInAnonymously(auth);
        }
        
        // 2. Get User ID after sign-in
        onAuthStateChanged(auth, (user) => {
            if (user) {
                userId = user.uid;
                document.getElementById('user-id-display').textContent = `User ID: ${userId.substring(0, 10)}...`;
                submitButton.disabled = false; // Enable form submission
                updateStatus('Connected to Database. Start adding entries!', 'bg-green-900/50');
                setupDataListener(); // Start listening for data changes
            } else {
                updateStatus('Authentication failed. Signing in anonymously.', 'bg-red-900/50');
            }
        });

    } catch (error) {
        console.error("Firebase Initialization Error:", error);
        updateStatus(`Error: ${error.message}. Check console.`, 'bg-red-900/50');
        submitButton.disabled = true;
    }
};

const renderJukeboxList = (data) => {
    if (data.length === 0) {
        jukeboxList.innerHTML = '<li class="text-center text-gray-400 p-4">The collaborative jukebox is currently empty. Add the first movie!</li>';
        return;
    }

    // Sort data by creation timestamp (newest first)
    data.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

    jukeboxList.innerHTML = '';
    data.forEach(item => {
        const li = document.createElement('li');
        li.className = 'bg-gray-700 p-4 rounded-lg shadow-md transition duration-200 hover:bg-gray-600 cursor-pointer';
        li.innerHTML = `
            <div class="font-bold text-xl text-yellow-400">${item.movie}</div>
            <div class="text-white">Iconic Song: <span class="text-lg font-semibold">${item.song}</span></div>
            <div class="text-xs text-gray-400 mt-1">Added by: ${item.addedBy.substring(0, 10)}...</div>
        `;
        // Optional: Add a click listener if we wanted to visually "play" the song
        li.addEventListener('click', () => {
            updateStatus(`Playing: "${item.song}" from "${item.movie}"`, 'bg-emerald-800/70');
        });
        jukeboxList.appendChild(li);
    });
};

const setupDataListener = () => {
    const dataPath = `artifacts/${appId}/public/data/movie_jukebox`;
    const q = query(collection(db, dataPath));

    onSnapshot(q, (snapshot) => {
        const items = [];
        snapshot.forEach(doc => {
            items.push({ id: doc.id, ...doc.data() });
        });
        renderJukeboxList(items);
    }, (error) => {
        console.error("Error fetching data:", error);
        updateStatus('Error loading data from Firestore.', 'bg-red-900/50');
    });
};

const addJukeboxEntry = async (e) => {
    e.preventDefault();
    const movie = movieInput.value.trim();
    const song = songInput.value.trim();

    if (!movie || !song) {
        updateStatus('Please enter both a movie and a song.', 'bg-yellow-900/50');
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Adding...';
    updateStatus('Adding entry to database...', 'bg-blue-900/50');

    try {
        const dataPath = `artifacts/${appId}/public/data/movie_jukebox`;
        await addDoc(collection(db, dataPath), {
            movie: movie,
            song: song,
            addedBy: userId,
            createdAt: serverTimestamp()
        });

        movieInput.value = '';
        songInput.value = '';
        updateStatus('Entry added successfully!', 'bg-green-900/50');
    } catch (error) {
        console.error("Error adding document:", error);
        updateStatus('Failed to add entry. Check console.', 'bg-red-900/50');
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Add Movie/Song';
    }
};

form.addEventListener('submit', addJukeboxEntry);
initFirebase();
});
