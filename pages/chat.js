import { useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase'; // Firebase config
import { collection, doc, onSnapshot } from 'firebase/firestore'; // Ensure collection and doc are imported
import { onAuthStateChanged } from 'firebase/auth';
import Layout from '../components/Layout'; // Import Layout
import { useRouter } from 'next/router';

export default function Chat() {
  const [user, setUser] = useState(null);
  const [friends, setFriends] = useState([]);
  const [users, setUsers] = useState([]);
  const router = useRouter();

  // Check for authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Fetch the current user's friends
  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      const userData = doc.data();
      setFriends(userData.friends || []); // Assuming friends is an array of UIDs
    });

    return () => unsubscribe();
  }, [user]);

  // Fetch users for chat (those who are not the logged-in user)
  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersArray = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Avoid duplicating the current user
        if (doc.id !== user.uid) {
          usersArray.push({ uid: doc.id, ...data });
        }
      });
      setUsers(usersArray);
    });

    return () => unsubscribe();
  }, [user]);

  const selectUser = (selectedUser) => {
    if (!user) return;

    router.push(`/chat/${selectedUser.uid}`); // Navigate to chat room
  };

  if (!user) return <p className="text-center text-xl">Loading...</p>;

  // Filter users to show only friends
  const friendsToShow = users.filter((userItem) =>
    friends.includes(userItem.uid) // Check if the user's UID is in the friends array
  );

  return (
    <Layout>
      <header className="p-2 flex items-center justify-between m-2">
        <h1 className="text-2xl font-bold text-white">Messages</h1>
      </header>
      <hr className="border-t border-gray-300 mb-6 w-full" />

      <div className="space-y-2 p-2">
        {friendsToShow.length === 0 ? (
          <p className="text-center text-gray-500">No friends added yet.</p>
        ) : (
          friendsToShow.map((friend) => (
            <div
              key={friend.uid}
              className={`p-3 bg-white rounded-2xl flex items-center shadow-md hover:bg-black hover:text-white cursor-pointer transition duration-200`}
              onClick={() => selectUser(friend)}
            >
              <img src={friend.photoURL || '/default-avatar.png'} alt="Avatar" className="w-10 h-10 rounded-full mr-2" />
              <span className="ml-5">{friend.displayName}</span>
            </div>
          ))
        )}
      </div>
    </Layout>
  );
}
