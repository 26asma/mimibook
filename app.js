// Like a story
async function likeStory(storyId) {
    const userId = firebase.auth().currentUser.uid;

    try {
        const storyRef = db.collection("stories").doc(storyId);
        const storyDoc = await storyRef.get();
        let likes = storyDoc.data().likes || {};

        if (likes[userId]) {
            delete likes[userId]; // Unlike if already liked
        } else {
            likes[userId] = true; // Like the story
        }

        await storyRef.update({ likes });

refreshPage();

      
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
    commentsList.innerHTML = "Loading comments...";

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
            commentElement.innerHTML = `<div class="com"><div class="commenter">${comment.username}</div><div class="comment-content"> ${comment.text}</div></div><hr>`;
            commentsList.appendChild(commentElement);
        });
    } catch (error) {
        console.error("Error loading comments:", error);
        commentsList.innerHTML = "Failed to load comments.";
    }
}

// Add a new comment
async function addComment(storyId) {
    const commentInput = document.getElementById(`comment-input-${storyId}`);
    const text = commentInput.value.trim();
    const userId = firebase.auth().currentUser.uid;

    if (!text) return alert("Comment cannot be empty!");

    try {
        const userDoc = await db.collection("users").doc(userId).get();
        const username = userDoc.data().username;

        await db
            .collection("stories")
            .doc(storyId)
            .collection("comments")
            .add({
                username,
                text,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            });

        commentInput.value = ""; 
        loadComments(storyId); 
    } catch (error) {
        console.error("Error adding comment:", error);
        alert("Failed to post comment.");
    }
}




    // Text-to-Speech API Configuration
    const API_URL = "https://api-inference.huggingface.co/models/espnet/kan-bayashi_ljspeech_vits";
    const API_TOKEN = textspeechkey; 

    // Function to read the story aloud
    async function readStory(storyId) {
        const audioPlayer = document.getElementById("audio-player");

        try {
            // Fetch story details from Firebase
            const storyDoc = await db.collection("stories").doc(storyId).get();
            if (!storyDoc.exists) {
                alert("Story not found.");
                return;
            }
            const story = storyDoc.data();
            const textToRead = `${story.title}. ${story.content}`.slice(0, 500); 

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
            alert(`Error: ${error.message}`);
        }
    }


    // Function to search stories by title or username
    async function searchStories() {
        const searchQuery = document.getElementById('search-input').value.toLowerCase();
        try {
            const storiesSnapshot = await db.collection('stories')
          
                .where("title", ">=", searchQuery)
                .where("title", "<=", searchQuery + "\uf8ff")  // To get results for partial matching
                .get();

            const storiesContainer = document.getElementById('story-cards-container');
            storiesContainer.innerHTML = ''; // Clear previous results

            storiesSnapshot.forEach(doc => {
                const story = doc.data();
                const storyCard = document.createElement('div');
                storyCard.classList.add('story-card');
                storyCard.innerHTML = `
                    <img src="${story.coverImageUrl}" alt="Cover Image">
                    <div class="content">
                        <div class="title">${story.title}</div>
                        <div class="author">By ${story.username}</div>
                        <div class="description">${story.content.substring(0, 150)}...</div>
                        <button class="read-button" onclick="redirectToStory('${doc.id}')">Read Story</button>
                    </div>
                `;
                storiesContainer.appendChild(storyCard);
            });

            if (storiesSnapshot.empty) {
                const noResultsMessage = document.createElement('div');
                noResultsMessage.textContent = 'No stories found.';
                storiesContainer.appendChild(noResultsMessage);
            }

        } catch (error) {
            console.error("Error searching stories:", error);
        }
    }
    function loadUserProfile(uid) {
        const userRef = db.collection("users").doc(uid);
        userRef.get().then(doc => {
            if (doc.exists) {
                const userData = doc.data();
                profileimg=document.getElementById("profile-img")
                profileimg.src=userData.profileImageUrl;
                document.getElementById("username").textContent = userData.username;
                document.getElementById("pen-name").textContent = userData.penName;
              
            }
        });
    }

    function loadUserStories() {
        const userId = auth.currentUser.uid;
        db.collection("stories").where("userId", "==", userId)
            .orderBy("createdAt", "desc")
            .get()
            .then(snapshot => {
                const storyList = document.querySelector(".story-container");
                storyList.innerHTML = "";

                snapshot.forEach(doc => {
                    const storyData = doc.data();
                    const storyItem = document.createElement("div");
                    storyItem.classList.add("story-card");
                    storyItem.innerHTML = `
                        <h3>${storyData.title}</h3>
                        ${storyData.coverImageUrl ? `<img src="${storyData.coverImageUrl}" alt="Cover Image">` : ""}
                        <button onclick="viewStory('${doc.id}')">View</button>
                        <button onclick="editStory('${doc.id}', '${storyData.title}')">Edit</button>
                        <button onclick="deleteStory('${doc.id}')">Delete</button>
                    `;
                    storyList.appendChild(storyItem);
                });
            })
            .catch(error => {
                console.error("Error loading stories:", error);
            });
    }

    function viewStory(storyId) {
        window.location.href = `story.html?id=${storyId}`;
    }

    function editStory(storyId) {
// Redirect to write.html with the story ID as a URL parameter
window.location.href = `write.html?storyId=${storyId}`;
}


    function deleteStory(storyId) {
        if (confirm("Are you sure you want to delete this story?")) {
            db.collection("stories").doc(storyId).delete()
                .then(() => {
                    alert("Story deleted successfully!");
                    loadUserStories();
                })
                .catch(error => {
                    console.error("Error deleting story:", error);
                });
        }
    }

   

    function logoutUser() {
        auth.signOut().then(() => {
            window.location.href = "index.html";
        }).catch(error => {
            console.error("Error logging out:", error);
            alert("Error logging out. Please try again.");
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
      
        try {
          const response = await fetch(url, options);
          if (!response.ok) {
            throw new Error(`Failed to generate story: ${response.status}`);
          }
          const result = await response.json();
          console.log(result);
          let story=document.getElementById('story-content');
        
          story.textContent=result.result;
          return result.result;
        } catch (error) {
            console.error('Error:', error.message);
        }
    }
      
    function refreshPage() {
        
        sessionStorage.setItem('scrollPosition', window.scrollY);
    
       
        location.reload();
    }
    
    
    window.addEventListener('load', () => {
        const savedPosition = sessionStorage.getItem('scrollPosition');
        if (savedPosition !== null) {
            window.scrollTo(0, parseInt(savedPosition)); 
            sessionStorage.removeItem('scrollPosition'); 
        }
    });
    
    
      
      
      
   
      
