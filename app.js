
function loadUserProfile(uid) {
    const userRef = db.collection("users").doc(uid);
    userRef.get()
        .then(doc => {
            if (doc.exists) {
                const userData = doc.data();
                const profileImg = document.getElementById("profile-img");
                profileImg.src = userData.profileImageUrl;
                document.getElementById("username").textContent = userData.username;
                document.getElementById("pen-name").textContent = userData.penName;
                
            } else {
                console.log("No user profile found for the given UID.");
            }
        })
        .catch(error => {
            console.error("Error loading user profile:", error);
            showAlert('Error', 'Check your connection and try again.');
        });
}





async function loadUserStories() {
    const userId = auth.currentUser.uid; // Get current user's ID
    try {
        const snapshot = await db.collection("stories")
            .where("userId", "==", userId)
            .orderBy("createdAt", "desc")
            .get();

        const storyList = document.querySelector(".story-container");
        storyList.innerHTML = "";

        const formatDate = (timestamp) => {
            if (!timestamp) return "Unknown Date";
            const date = timestamp instanceof firebase.firestore.Timestamp ? timestamp.toDate() : new Date(timestamp);
            return date.toLocaleDateString();
        };

        for (const doc of snapshot.docs) {
            const storyData = doc.data();
            const storyItem = document.createElement("div");
            storyItem.classList.add("story-card");

            // Get display date
            const displayDate = formatDate(storyData.updatedAt || storyData.createdAt);

            // Check if the current user liked the story
            const isLiked = storyData.likes && storyData.likes[userId];
            const likeCount = storyData.likes ? Object.keys(storyData.likes).length : 0;

            // Fetch comment count asynchronously
            const commentsSnapshot = await db.collection("stories").doc(doc.id).collection("comments").get();
            const commentCount = commentsSnapshot.size;

            storyItem.innerHTML = `
                <div class="pro">
                    <h4>${storyData.title}</h4>
                    <div>
                        <button onclick="viewStory('${doc.id}')"><i class="fas fa-eye"></i></button>
                        <button onclick="editStory('${doc.id}', '${storyData.title}')"><i class="fas fa-edit"></i></button>
                        <button onclick="deleteStory('${doc.id}')"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </div>
                ${storyData.coverImageUrl ? `<img src="${storyData.coverImageUrl}" alt="Cover Image">` : ""}
                <div class="story-actioni">
                <div class="one">
                <button class="like-btn" onclick="likeStory('${doc.id}', event)">
                <i class="fa fa-heart ${isLiked ? "liked" : ""}"></i>
                <span>${likeCount}</span>
                </button>
                <button class="comment-btn">
                <i class="fa fa-comment"></i>
                <span>${commentCount}</span>
                </button></div>
                <div class="two">
                <h4>Published on ${displayDate}</h4></div>
                </div>
            `;

            storyList.appendChild(storyItem);
        }
    } catch (error) {
        console.error("Error loading stories:", error);
        showAlert('Error', 'Check your connection and try again');
    }
}


// function loadUserStories() {
//     const userId = auth.currentUser.uid;
//     db.collection("stories").where("userId", "==", userId)
//         .orderBy("createdAt", "desc")
//         .get()
//         .then(snapshot => {
//             const storyList = document.querySelector(".story-container");
//             storyList.innerHTML = "";

//             snapshot.forEach(doc => {
//                 const storyData = doc.data();
//                 const storyItem = document.createElement("div");
//                 storyItem.classList.add("story-card");

//                 // Function to format the date
//                 const formatDate = (timestamp) => {
//                     // If it's a Firestore Timestamp, convert it to a JavaScript Date object
//                     const date = timestamp instanceof firebase.firestore.Timestamp ? timestamp.toDate() : new Date(timestamp);
//                     return date.toLocaleDateString(); // This will format the date (e.g., "12/6/2024")
//                 };

//                 // Get the display date (prioritize updatedAt, fallback to createdAt)
//                 const displayDate = formatDate(storyData.updatedAt || storyData.createdAt);

//                 // Set the innerHTML with formatted date
//                 storyItem.innerHTML = `
//                     <div class="pro">
//                         <h4>${storyData.title}</h4>
//                         <div><button onclick="viewStory('${doc.id}')"><i class="fas fa-eye"></i></button>
//                         <button onclick="editStory('${doc.id}', '${storyData.title}')"><i class="fas fa-edit"></i></button>
//                         <button onclick="deleteStory('${doc.id}')"><i class="fas fa-trash-alt"></i></button></div>
//                     </div>
//                     ${storyData.coverImageUrl ? `<img src="${storyData.coverImageUrl}" alt="Cover Image">` : ""}
//                     <h4 class="pro">Published on ${displayDate}</h4> <!-- Display the formatted date -->
//                 `;

//                 storyList.appendChild(storyItem);
//             });
//         })
//         .catch(error => {
//             console.error("Error loading stories:", error);
//             showAlert('Error', 'check your connection and try again')
//         });
// }


function getStylishHeading(genre) {
    const headings = {
        Romance: `<i class="fa fa-heart"></i> Romantic Tales You'll Adore <i class="fa fa-heart"></i>`,
        Thriller: `<i class="fa fa-bolt"></i> Edge-of-Your-Seat Thrillers <i class="fa fa-bolt"></i>`,
        Fantasy: `<i class="fa fa-magic"></i> Escape Into Fantasy Worlds <i class="fa fa-magic"></i>`,
        Mystery: `<i class="fa fa-search"></i> Solve Intriguing Mysteries <i class="fa fa-search"></i>`,
        SciFi: `<i class="fa fa-rocket"></i> Sci-Fi Adventures Await <i class="fa fa-rocket"></i>`,
        Adventure: `<i class="fa fa-map"></i> Explore Epic Journeys <i class="fa fa-map"></i>`,
        Comedy: `<i class="fa fa-laugh"></i> Stories to Make You Laugh <i class="fa fa-laugh"></i>`,
        Horror: `<i class="fa fa-ghost"></i> Tales to Haunt Your Dreams <i class="fa fa-ghost"></i>`,
        default: `<i class="fa fa-book"></i> Discover Stories You'll Love <i class="fa fa-book"></i>`,
    };

    return headings[genre] || headings.default;
}


// Like a story
async function likeStory(storyId, event) {
    const user = firebase.auth().currentUser;
    if (!user) {
        showAlert("LOG-IN", "Please log in to like this story.");
        return;
    }

    const userId = user.uid;
    const heartIcon = event.target;

    try {
        const storyRef = db.collection("stories").doc(storyId);
        const storyDoc = await storyRef.get();
        let likes = storyDoc.data().likes || {};

        if (likes[userId]) {
            delete likes[userId];
            heartIcon.classList.remove("liked");
        } else {
            likes[userId] = true;
            heartIcon.classList.add("liked");
        }

        await storyRef.update({ likes });
        heartIcon.nextElementSibling.textContent = Object.keys(likes).length;
    } catch (error) {
        console.error("Error updating likes:", error);
    }
}

// Toggle comments section visibility
function toggleComments(storyId) {
    const commentSection = document.getElementById(`comment-section-${storyId}`);
    const isHidden = commentSection.style.display === "none";

    if (isHidden) {
        commentSection.style.display = "block";
        loadComments(storyId); // Load comments when toggling on
    } else {
        commentSection.style.display = "none";
    }
}



// Load comments for a story
async function loadComments(storyId) {
    const commentsList = document.getElementById(`comments-list-${storyId}`);
    commentsList.innerHTML = `  <div class="spinner-div"> <span class="spinner"></span></div> `;

    try {
        const commentsSnapshot = await db
            .collection("stories")
            .doc(storyId)
            .collection("comments")
            .orderBy("createdAt", "asc")
            .get();

        commentsList.innerHTML = "";
        commentsSnapshot.forEach((doc) => {
            const comment = doc.data();
            const commentElement = document.createElement("div");
            commentElement.innerHTML = `<div class="coms">
            <div class="userimg"><img src=${comment.profileImageUrl}></div>
            <div class="com">
            <div class="commenter">${comment.username}</div>
            <div class="comment-content"> ${comment.text}</div></div></div><hr>`;
            commentsList.appendChild(commentElement);
        });
    } catch (error) {
        console.error("Error loading comments:", error);
        commentsList.innerHTML = "Failed to load comments.";
    }
}



async function addComment(storyId) {
    const commentInput = document.getElementById(`comment-input-${storyId}`);
    const commentButton = document.querySelector(`.comment-btn[onclick*="${storyId}"]`);

    const text = commentInput.value.trim();
    const userId = auth.currentUser.uid; // Assuming auth is initialized globally

    // Validate if comment text is provided
    if (!text) {
        showAlert("Error", "Comment cannot be empty!");
        return;
    }

    // Disable the button and show loading state
    commentButton.disabled = true;
    commentButton.innerHTML = `<div class="spinner-div"><span class="spinner"></span></div>`;

    try {
        // Fetch user details
        const userDoc = await db.collection("users").doc(userId).get();
        if (!userDoc.exists) {
            throw new Error("User profile not found.");
        }
        const { username, profileImageUrl } = userDoc.data();

        // Add the comment to Firestore
        await db
            .collection("stories")
            .doc(storyId)
            .collection("comments")
            .add({
                username,
                text,
                profileImageUrl,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            });

        // Clear input and reload comments
        commentInput.value = "";
        loadComments(storyId);
        showAlert("Success", "Comment added successfully!");
    } catch (error) {
        console.error("Error adding comment:", error);
        showAlert("Error", "Failed to add comment. Please try again.");
    } finally {
        // Restore the button state
        commentButton.disabled = false;
        commentButton.innerHTML = "Post Comment"; // Restore original button text
    }
}



// Text-to-Speech API Configuration
const API_URL = "https://api-inference.huggingface.co/models/espnet/kan-bayashi_ljspeech_vits";
const API_TOKEN = textspeechkey;

// Function to read the story aloud
async function readStory(storyId) {
    const audioPlayer = document.getElementById("audio-player");
    const generateButton = document.getElementById("generate");

    // Disable the button and show the spinner
    generateButton.disabled = true;
    generateButton.innerHTML = `
            <div class="spinner-div"> <span class="spinner"></span></div>
        `;

    try {
        // Fetch story details from Firebase
        const storyDoc = await db.collection("stories").doc(storyId).get();
        if (!storyDoc.exists) {
            showAlert("Error", "Story not found.");
            return;
        }
        const story = storyDoc.data();
        const textToRead = `${story.title}. ${story.content}`.slice(0, 1500);

        // Send text to Hugging Face API
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ inputs: textToRead }),
        });

        if (!response.ok) throw new Error("Failed to generate speech. Check your API key or model.");

        // Generate and play audio
        const audioBlob = await response.blob();
        const audioURL = URL.createObjectURL(audioBlob);
        audioPlayer.src = audioURL;
        audioPlayer.style.display = "block"; // Show audio player
        audioPlayer.play();
    } catch (error) {
        console.error("Error generating speech:", error);
        showAlert("Error", "Try again later.")
    }
   finally {

        generateButton.disabled = false;
        generateButton.innerHTML = 'listen<i class="fa fa-volume-up"></i>';
    }
}


// Function to search stories by title or username

function searchStories() {
    const searchQuery = document.getElementById('search-input').value.toLowerCase();

    // Filter stories to include partial matches in the title
    const filteredStories = allStories.filter(story =>
        story.title.toLowerCase().includes(searchQuery) ||
        story.content.toLowerCase().includes(searchQuery) ||
        story.genre.toLowerCase().includes(searchQuery)
    );

    if (searchQuery === "") {
        // If the search query is empty, display all stories
        displayStories(allStories);
    } else if (filteredStories.length === 0) {
        // If no stories match the search query
        showAlert("No Stories Found", "Try a different search query");
        displayStories(allStories); // Optionally show all stories as fallback
    } else {
        // Display the filtered stories
        displayStories(filteredStories);
    }
}


function viewStory(storyId) {
    window.location.href = `story.html?id=${storyId}`;
}

function editStory(storyId) {
    // Redirect to write.html with the story ID as a URL parameter
    window.location.href = `write.html?storyId=${storyId}`;
    let submit = document.getElementById('submit');
    submit.style.display = "none";
}

async function deleteStory(storyId) {
    try {
        // Wait for the user's confirmation response
        const isConfirmed = await showConfirm('Are you sure you want to delete this story?');

        if (isConfirmed) {
            // Proceed with deletion if the user confirmed
            await db.collection("stories").doc(storyId).delete();
            showAlert("Status", "Story deleted successfully");
            loadUserStories(); // Reload the user's stories after deletion
        } else {
            // If the user canceled, log or handle accordingly
            console.log("Story deletion was canceled.");
        }
    } catch (error) {
        // Handle any errors that occur during the deletion process
        console.error("Error deleting story:", error);
        showAlert("Error", "Failed to delete the story. Please try again.");
    }
}





function logoutUser() {
    auth.signOut().then(() => {
        window.location.href = "index.html";
    }).catch(error => {
        console.error("Error logging out:", error);
        showAlert("Error", "Error logging out. Please try again.");
    });
}

function openStory(storyId) {
    window.location.href = `story.html?id=${storyId}`;
}



async function generateStory(genre, description) {
    const url = 'https://open-ai21.p.rapidapi.com/chatgpt';
    const options = {
        method: 'POST',
        headers: {
            'x-rapidapi-key': storygeneratekey,
            'x-rapidapi-host': 'open-ai21.p.rapidapi.com',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            messages: [
                {
                    role: 'user',
                    content: `Write a small ${genre} story. Here is the description: ${description}`,
                },
            ],
            web_access: false,
        }),
    };

    const generateButton = document.getElementById("generate");

    // Disable the button and show the spinner
    generateButton.disabled = true;
    generateButton.innerHTML = `
            <div class="spinner-div"> <span class="spinner"></span></div>
        `;

    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            showAlert("Error", "Failed to generate! Try again later.");
            throw new Error(`Failed to generate story: ${response.status}`);
        }
        const result = await response.json();
        console.log(result);
        let story = document.getElementById('story-content');
        story.textContent = result.result;

        return result.result;
    } catch (error) {
        console.error('Error:', error.message);
        showAlert("Error", "Cannot generate right now! Try again later.");
    } finally {

        generateButton.disabled = false;
        generateButton.innerHTML = 'Generate Story';
    }
}



window.addEventListener('load', () => {
    const savedPosition = sessionStorage.getItem('scrollPosition');
    if (savedPosition !== null) {
        window.scrollTo(0, parseInt(savedPosition));
        sessionStorage.removeItem('scrollPosition');
    }
});

// Function to display loader
function showLoader() {
    document.getElementById("loader").style.display = "flex";
}

// Function to hide loader
function hideLoader() {
    document.getElementById("loader").style.display = "none";
}

function showAlert(title, message) {
    // Set the alert title and message
    document.getElementById('alertTitle').innerText = title;
    document.getElementById('alertMessage').innerText = message;

    // Show the alert box
    document.getElementById('customAlert').style.display = 'flex';
}

function closeAlert() {
    // Hide the alert box
    document.getElementById('customAlert').style.display = 'none';
}

function showConfirm(message) {
    // Create the confirm box
    const confirmBox = document.createElement('div');
    confirmBox.style.position = 'fixed';
    confirmBox.style.top = '0';
    confirmBox.style.left = '0';
    confirmBox.style.width = '100%';
    confirmBox.style.height = '100%';
    confirmBox.style.display = 'flex';
    confirmBox.style.alignItems = 'center';
    confirmBox.style.justifyContent = 'center';
    confirmBox.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    confirmBox.style.zIndex = '1000';

    // Inner content
    confirmBox.innerHTML = `
        <div style="
            background-color: #343A40; 
            color: #ccaa82; 
            padding: 20px; 
            border-radius: 10px; 
            text-align: center; 
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        ">
            <p>${message}</p>
            <div style="margin-top: 20px; display: flex; justify-content: space-around;">
                <button style="
                    background-color: #ccaa82; 
                    color: #343A40; 
                    border: none; 
                    padding: 10px 20px; 
                    border-radius: 5px; 
                    font-weight: bold;
                    cursor: pointer;
                ">Yes</button>
                <button style="
                    background-color: #ccaa82; 
                    color: #343A40; 
                    border: none; 
                    padding: 10px 20px; 
                    border-radius: 5px; 
                    font-weight: bold;
                    cursor: pointer;
                ">No</button>
            </div>
        </div>
    `;

    // Add to the body
    document.body.appendChild(confirmBox);

    return new Promise((resolve) => {
        confirmBox.querySelector('button:nth-child(1)').onclick = () => {
            document.body.removeChild(confirmBox);
            resolve(true);
        };

        confirmBox.querySelector('button:nth-child(2)').onclick = () => {
            document.body.removeChild(confirmBox);
            resolve(false);
        };
    });
}


const genres = ["Horror", "Fantasy", "Romance", "Adventure"];
const sectionsContainer = document.getElementById("sections");


async function loadStoriesByGenre() {
   
    
  
    for (const genre of genres) {
        // Fetch stories by genre
        const storiesSnapshot = await db.collection("stories")
            .where("genre", "==", genre)
            .limit(4)
            .get();
  
        const stories = [];
        for (const doc of storiesSnapshot.docs) {
            const storyData = doc.data();
            const likeCount = storyData.likes ? Object.keys(storyData.likes).length : 0;
            
            // Query the comments subcollection to get the comment count
            const commentsSnapshot = await db.collection("stories").doc(doc.id).collection("comments").get();
            const commentCount = commentsSnapshot.size; // This gives the number of comment documents

            stories.push({
                id: doc.id,
                ...storyData,
                likeCount,
                commentCount,
            });
        }
  
        // Skip section if no stories found
        if (stories.length === 0) continue;
  
        // Create section
        const section = document.createElement("div");
        section.className = "story-section";
  
        section.innerHTML = `
 <h2 class="section-heading">${ getStylishHeading(genre)}</h2>
            <div class="story-container">
                ${stories.map(story => {
                    const user = firebase.auth().currentUser; // Check user authentication status
                    const userId = user ? user.uid : null;
                    const isLiked = user && story.likes && story.likes[userId]; // Example of user-specific like logic
                    return `
                        <div class="story-card">
                            <img src="${story.coverImageUrl}" alt="${story.title}" onclick="openStory('${story.id}')">
                            <div class="info">
                                <div class="box">
                                    <div class="story-title">${story.title}</div>
                                   <div class="story-author"><p>By <a href="targetprofile.html?targetUserId=${story.userId}">${story.username}</a></p></div>
                                </div>
                                <div class="story-actions">
                                    <button class="like-btn">
                                        <i class="fa fa-heart ${isLiked ? "liked" : ""}" 
                                           onclick="likeStory('${story.id}', event)"></i>
                                        <span>${story.likeCount}</span>
                                    </button>
                                    <button class="comment-btn">
                                        <i class="fa fa-comment"></i>
                                        <span>${story.commentCount}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
  
       
        sectionsContainer.appendChild(section);
    }
}



async function loadMostLikedStories() {
   

    try {
        // Fetch all stories from Firestore
        const storiesSnapshot = await db.collection("stories").get();

        const stories = [];

        // Process each story
        for (const doc of storiesSnapshot.docs) {
            const storyData = doc.data();
            const likeCount = storyData.likes ? Object.keys(storyData.likes).length : 0;

            // Query the comments subcollection to get the comment count
            const commentsSnapshot = await db.collection("stories").doc(doc.id).collection("comments").get();
            const commentCount = commentsSnapshot.size; // This gives the number of comment documents

            stories.push({
                id: doc.id,
                ...storyData,
                likeCount,
                commentCount,
            });
        }

        // Sort stories by like count in descending order
        stories.sort((a, b) => b.likeCount - a.likeCount);

        // Get the top 5 stories
        const top5Stories = stories.slice(0, 4);

        // Create a section to display the top 5 stories
        const mostLikedSection = document.createElement("div");
        mostLikedSection.className = "story-section";

        mostLikedSection.innerHTML = `
            <h2 class="section-heading">Most Loved Tales of MimiBook</h2>
            <div class="story-container">
                ${top5Stories.map(story => {
                    const user = firebase.auth().currentUser; // Check user authentication status
                    const userId = user ? user.uid : null;
                    const isLiked = user && story.likes && story.likes[userId];
                    return `
                        <div class="story-card">
                            <img src="${story.coverImageUrl}" alt="${story.title}" onclick="openStory('${story.id}')">
                            <div class="info">
                                <div class="box">
                                    <div class="story-title">${story.title}</div>
                                  
    <div class="story-author"><p>By <a href="targetprofile.html?targetUserId=${story.userId}">${story.username}</a></p></div>
    
    </button>
    

                                </div>
                                <div class="story-actions">
                                    <button class="like-btn">
                                        <i class="fa fa-heart ${isLiked ? "liked" : ""}" 
                                           onclick="likeStory('${story.id}', event)"></i>
                                        <span>${story.likeCount}</span>
                                    </button>
                                    <button class="comment-btn">
                                        <i class="fa fa-comment"></i>
                                        <span>${story.commentCount}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        if (stories.length === 0) {
            showAlert("No Stories Found", "No stories are available to display.");
        }
        hideLoader();
        // Append the section to the container
        sectionsContainer.appendChild(mostLikedSection);
    } catch (error) {
        console.error("Error loading most liked stories:", error);
        showAlert("Error", "Failed to load most liked stories. Please try again.");
    } 
}

async function displayFollowStats(userId) {
    try {
        const userDoc = await db.collection("users").doc(userId).get();
        const userData = userDoc.data();

        const followersCount = userData.followers?.length || 0;
        const followingCount = userData.following?.length || 0;

        document.querySelector("followers-count").innerText = `${followersCount} Followers`;
        document.querySelector("following-count").innerText = `${followingCount} Following`;
    } catch (error) {
        console.error("Error fetching follow stats:", error);
    }
}
async function fetchAndDisplayFollowers(targetUserId) {
    try {
        // Get target user's followers array
        const targetUserDoc = await db.collection("users").doc(targetUserId).get();

        if (!targetUserDoc.exists) {
            alert("User not found!");
            return;
        }

        const followers = targetUserDoc.data().followers || [];

        const followersList = document.getElementById("followers-list");
        followersList.innerHTML = ""; // Clear previous content

        if (followers.length === 0) {
            followersList.innerHTML = "<p>No followers yet.</p>";
            return;
        }

        // Render followers list by fetching profile img and name from the 'users' collection
        for (const followerId of followers) {
            const followerDoc = await db.collection("users").doc(followerId).get();

            if (followerDoc.exists) {
                const followerData = followerDoc.data();
                const listItem = document.createElement("li");

                listItem.innerHTML = `
                  
                    <a href="targetprofile.html?targetUserId=${followerId}">  <img src="${followerData.profileImageUrl || 'default-profile.png'}" alt="${followerData.name}" /></a>
                    <span>${followerData.username || 'Anonymous'}</span>
                `;

                followersList.appendChild(listItem);
            }
        }
    } catch (error) {
        console.error("Error fetching followers:", error);
    }
}

// Event Listener for Followers Button
document.addEventListener("DOMContentLoaded", () => {
    const followersBtn = document.getElementById("followers-btn");
    const followersModal = document.getElementById("followers-modal");
    const closeModal = document.getElementById("close-modal");

    if (followersBtn && followersModal && closeModal) {
        followersBtn.addEventListener("click", () => {
            followersModal.style.display = "flex";
            fetchAndDisplayFollowers(targetUserId)
        });

        closeModal.addEventListener("click", () => {
            followersModal.style.display = "none";
        });

        window.addEventListener("click", (event) => {
            if (event.target === followersModal) {
                followersModal.style.display = "none";
            }
        });
    }
});

document.addEventListener("DOMContentLoaded", () => {
    const followingBtn = document.getElementById("following-btn");
    const followingModal = document.getElementById("following-modal");
    const closeFollowingModal = document.getElementById("close-following-modal");
    const followingList = document.getElementById("following-list");
    const targetUserId = new URLSearchParams(window.location.search).get("targetUserId");

    if (followingBtn && followingModal && closeFollowingModal && followingList) {
        // Open Following Modal
        followingBtn.addEventListener("click", async () => {
            followingModal.style.display = "flex";

            // Clear previous content
            followingList.innerHTML = "";

            try {
                // Fetch following data
                const targetUserDoc = await db.collection("users").doc(targetUserId).get();
                const following = targetUserDoc.data().following || [];

                if (following.length === 0) {
                    followingList.innerHTML = "<li>No following to display</li>";
                } else {
                    // Fetch profile data for each followed user
                    const followingPromises = following.map((userId) =>
                        db.collection("users").doc(userId).get()
                    );

                    const followingDocs = await Promise.all(followingPromises);

                    followingDocs.forEach((doc) => {
                        const userData = doc.data();
                        const listItem = document.createElement("li");
                        listItem.innerHTML = `
                            <a href="targetprofile.html?targetUserId=${doc.id}">  <img src="${userData.profileImageUrl || 'default-profile.png'}" alt="${userData.username}" /></a>
                            <span>${userData.username || "Unknown User"}</span>
                        `;
                        followingList.appendChild(listItem);
                    });
                }
            } catch (error) {
                console.error("Error fetching following data:", error);
                followingList.innerHTML = "<li>Failed to load following list</li>";
            }
        });

        // Close Following Modal
        closeFollowingModal.addEventListener("click", () => {
            followingModal.style.display = "none";
        });

        // Close modal when clicking outside of it
        window.addEventListener("click", (event) => {
            if (event.target === followingModal) {
                followingModal.style.display = "none";
            }
        });
    }
});

