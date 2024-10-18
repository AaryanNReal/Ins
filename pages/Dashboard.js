import { useEffect, useState } from 'react';
import { auth } from '../lib/firebase';
import { useRouter } from 'next/router';
import { collection, getDocs, doc, getDoc, query, orderBy, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../lib/firebase';
import Layout from '@/components/Layout';
import Navbar from '../components/Navbar';

export default function UserDashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [activities, setActivities] = useState([]);
    const [friendRequests, setFriendRequests] = useState([]);
    const [friends, setFriends] = useState([]);
    const [showFriends, setShowFriends] = useState(false); // State for toggling friends list

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (!user) {
                router.push('/login');
            } else {
                setLoading(false);
                fetchUserData(user.uid);
                fetchUserActivities(user.uid);
                fetchFriendRequests(user.uid);
                fetchFriends(user.uid);
            }
        });
        return () => unsubscribe();
    }, [router]);

    const fetchUserData = async (userId) => {
        try {
            const userDoc = await getDoc(doc(db, 'users', userId));
            if (userDoc.exists()) {
                setUser(userDoc.data());
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
        }
    };

    const fetchUserActivities = async (userId) => {
        try {
            const theoriesCollection = collection(db, 'theories');
            const theoriesQuery = query(theoriesCollection, orderBy('createdAt', 'desc'));
            const theoriesSnapshot = await getDocs(theoriesQuery);

            const userActivities = theoriesSnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(theory => theory.userId === userId);

            setActivities(userActivities);
        } catch (error) {
            console.error("Error fetching user activities:", error);
        }
    };

    const fetchFriendRequests = async (userId) => {
        try {
            const userDoc = await getDoc(doc(db, 'users', userId));
            if (userDoc.exists()) {
                const data = userDoc.data();
                const requests = data.friendRequests || [];
                
                // Fetch display names for the friend requests
                const displayNames = await Promise.all(requests.map(async (requestId) => {
                    const requestUserDoc = await getDoc(doc(db, 'users', requestId));
                    return { id: requestId, displayName: requestUserDoc.data()?.displayName || 'Unknown' };
                }));
                
                setFriendRequests(displayNames);
            }
        } catch (error) {
            console.error("Error fetching friend requests:", error);
        }
    };

    const fetchFriends = async (userId) => {
        try {
            const userDoc = await getDoc(doc(db, 'users', userId));
            if (userDoc.exists()) {
                const data = userDoc.data();
                const friendsList = data.friends || [];
                
                // Fetch display names for the friends
                const displayNames = await Promise.all(friendsList.map(async (friendId) => {
                    const friendUserDoc = await getDoc(doc(db, 'users', friendId));
                    return { id: friendId, displayName: friendUserDoc.data()?.displayName || 'Unknown' };
                }));
                
                setFriends(displayNames);
            }
        } catch (error) {
            console.error("Error fetching friends:", error);
        }
    };

    const handleEditProfile = () => {
        router.push('/Edit-Profile');
    };

    const handleShareProfile = () => {
        const profileLink = `${window.location.origin}/profile/${auth.currentUser.uid}`;
        navigator.clipboard.writeText(profileLink);
        alert('Profile link copied!');
    };

    const addPost = () => {
        router.push('/theory-form');
    };

    const acceptFriendRequest = async (requestId) => {
        const currentUser = auth.currentUser;

        if (!currentUser) return;

        try {
            // Accept the friend request
            await updateDoc(doc(db, 'users', currentUser.uid), {
                friends: arrayUnion(requestId), // Add to friends
                friendRequests: arrayRemove(requestId) // Remove from friend requests
            });

            // Optionally: Update the other user's friend list
            await updateDoc(doc(db, 'users', requestId), {
                friends: arrayUnion(currentUser.uid)
            });

            // Refresh the friend requests and friends list
            fetchFriendRequests(currentUser.uid);
            fetchFriends(currentUser.uid);
        } catch (error) {
            console.error("Error accepting friend request:", error);
        }
    };

    const rejectFriendRequest = async (requestId) => {
        const currentUser = auth.currentUser;

        if (!currentUser) return;

        try {
            // Reject the friend request
            await updateDoc(doc(db, 'users', currentUser.uid), {
                friendRequests: arrayRemove(requestId) // Remove from friend requests
            });

            fetchFriendRequests(currentUser.uid); // Refresh friend requests
        } catch (error) {
            console.error("Error rejecting friend request:", error);
        }
    };

    const removeFriend = async (friendId) => {
        const currentUser = auth.currentUser;

        if (!currentUser) return;

        try {
            // Remove the friend
            await updateDoc(doc(db, 'users', currentUser.uid), {
                friends: arrayRemove(friendId) // Remove from friends
            });

            // Optionally: Update the other user's friend list
            await updateDoc(doc(db, 'users', friendId), {
                friends: arrayRemove(currentUser.uid)
            });

            // Refresh the friends list
            fetchFriends(currentUser.uid);
        } catch (error) {
            console.error("Error removing friend:", error);
        }
    };

    const toggleFriendsList = () => {
        setShowFriends(!showFriends);
    };

    if (loading) {
        return <div>Loading...</div>; // Loading state
    }

    return (
        <Layout>
            <Navbar />
            <div className="max-w-3xl mx-auto p-4 text-white">
                {/* User Profile Section */}
                <div className="flex items-center space-x-6 mb-4">
                    <img
                        src={user?.photoURL || '/default-avatar.png'}
                        alt={user?.displayName || 'User'}
                        referrerPolicy="no-referrer"
                        className="w-24 h-24 p-2 rounded-full"
                    />
                    <div className="flex flex-col">
                        <h2 className="text-2xl font-semibold">{user?.displayName}</h2>
                        <p className="text-red-200 mb-2">{user?.bio || 'No bio available'}</p>
                        <div className="flex space-x-4">
                            <button
                                onClick={handleEditProfile}
                                className="bg-blue-500 text-white font-semibold px-4 py-2 rounded-md hover:bg-blue-600 transition duration-200"
                            >
                                Edit Profile
                            </button>
                            <button
                                onClick={handleShareProfile}
                                className="bg-gray-100 text-gray-700 font-semibold px-4 py-2 rounded-md hover:bg-gray-200 transition duration-200"
                            >
                                Share Profile
                            </button>
                            <button
    onClick={toggleFriendsList}
    className="bg-blue-500 text-white rounded-md px-2 py-1 text-sm flex items-center" // Adjusted padding and font size
>
    {showFriends ? (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1"> {/* Reduced icon size */}
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
        </svg>
    ) : (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1"> {/* Reduced icon size */}
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
        </svg>
    )}
    <span className="text-xs">{showFriends ? 'Hide Friends' : 'Show Friends'}</span> {/* Adjusted font size */}
</button>
{showFriends && (
    <div className="space-y-4 text-black">
        {friends.length === 0 ? (
            <p className="text-red-500">No friends added yet.</p>
        ) : (
            friends.map(friend => (
                <div key={friend.id} className="p-2  bg-gray-100 rounded-lg shadow flex justify-between"> {/* Adjusted padding */}
                    <h3 className="font-semibold mr-2">{friend.displayName}</h3>
                    <button
                        onClick={() => removeFriend(friend.id)}
                        className="bg-red-500 text-white px-2 py-1 rounded-md text-sm" // Adjusted padding and font size
                    >
                        Remove
                    </button>
                </div>
            ))
        )}
    </div>
)}

                        </div>
                    </div>
                </div>

                {/* Friend Requests Section */}
                <h2 className="text-lg font-bold mb-2">Friend Requests</h2>
                <div className="space-y-4 text-black">
                    {friendRequests.length === 0 ? (
                        <p className="text-red-500">No friend requests.</p>
                    ) : (
                        friendRequests.map(request => (
                            <div key={request.id} className="p-4 bg-gray-100 rounded-lg shadow">
                                <h3 className="font-semibold">{request.displayName}</h3>
                                <div className="flex space-x-4 mt-2">
                                    <button
                                        onClick={() => acceptFriendRequest(request.id)}
                                        className="bg-green-500 text-white px-3 py-1 rounded-md"
                                    >
                                        Accept
                                    </button>
                                    <button
                                        onClick={() => rejectFriendRequest(request.id)}
                                        className="bg-red-500 text-white px-3 py-1 rounded-md"
                                    >
                                        Reject
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                <h2 className="text-lg font-bold mb-2">Theories</h2>
                <div className="space-y-4 text-black">
                    {activities.length === 0 ? (
                        <p className="text-red-500">No theories found.</p>
                    ) : (
                        activities.map(activity => (
                            <div key={activity.id} className="p-4 bg-gray-100 rounded-lg shadow">
                                <h3 className="font-semibold">{activity.title}</h3>
                                <p>{activity.description}</p>
                                {activity.mediaUrl && (
                                    <img src={activity.mediaUrl} alt="Activity Media" className="mt-2 w-full h-auto rounded-lg" />
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Friends List Section */}
                
                    
            </div>
        </Layout>
    );
}
