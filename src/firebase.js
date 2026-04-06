import { initializeApp } from 'firebase/app'
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore'
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth'

// ============================================================
// IMPORTANT: Replace these values with your Firebase project config.
// Go to: Firebase Console → Project Settings → Your apps → Web app
// ============================================================
const firebaseConfig = {
  apiKey:            "AIzaSyDAElE-FpvcLrKG48sfm_KnMWW4EjRZX8U",
  authDomain:        "enough-retirement.firebaseapp.com",
  projectId:         "enough-retirement",
  storageBucket:     "enough-retirement.firebasestorage.app",
  messagingSenderId: "273103532968",
  appId:             "1:273103532968:web:4c3292bc4540f05c2a639d",
}

const app = initializeApp(firebaseConfig)
export const db   = getFirestore(app)
export const auth = getAuth(app)

// Enable offline persistence
enableIndexedDbPersistence(db).catch(err => {
  if (err.code === 'failed-precondition') {
    console.warn('Firestore persistence: multiple tabs open')
  } else if (err.code === 'unimplemented') {
    console.warn('Firestore persistence: browser not supported')
  }
})

// Anonymous auth – ensures only this device can write
export function ensureAuth() {
  return new Promise(resolve => {
    onAuthStateChanged(auth, user => {
      if (user) {
        resolve(user)
      } else {
        signInAnonymously(auth).then(cred => resolve(cred.user))
      }
    })
  })
}
