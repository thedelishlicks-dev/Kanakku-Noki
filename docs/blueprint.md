# **App Name**: AuthFlow

## Core Features:

- Login: Allow users to log in with their email and password using Firebase Authentication (signInWithEmailAndPassword).
- Sign Up: Enable users to create a new account using their email and password using Firebase Authentication (createUserWithEmailAndPassword).
- Dashboard: Display a welcome message and a 'Sign Out' button upon successful login.
- Sign Out: Implement the sign-out functionality using Firebase Authentication (signOut).
- Authentication State Persistence: Use onAuthStateChanged hook to persist user sessions.
- Route transitions: Implement a simple link based navigation between the login page and the signup page.

## Style Guidelines:

- Primary color: Indigo (#4B0082) for a sense of security and trust.
- Background color: Very light lavender (#F0F8FF), close in hue to the primary, for a calm, uncluttered feel.
- Accent color: Violet (#8F00FF), brighter than the primary, to draw attention to calls to action and interactive elements.
- Body and headline font: 'Inter', sans-serif.
- Clean, centered layout with clear separation of elements.
- Subtle fade-in animations on component mount for a smooth user experience.