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

                // Function to format the date
                const formatDate = (timestamp) => {
                    // If it's a Firestore Timestamp, convert it to a JavaScript Date object
                    const date = timestamp instanceof firebase.firestore.Timestamp ? timestamp.toDate() : new Date(timestamp);
                    return date.toLocaleDateString(); // This will format the date (e.g., "12/6/2024")
                };

                // Get the display date (prioritize updatedAt, fallback to createdAt)
                const displayDate = formatDate(storyData.updatedAt || storyData.createdAt);

                // Set the innerHTML with formatted date
                storyItem.innerHTML = `
                    <div class="pro">
                        <h4>${storyData.title}</h4>
                        <div><button onclick="viewStory('${doc.id}')"><i class="fas fa-eye"></i></button>
                        <button onclick="editStory('${doc.id}', '${storyData.title}')"><i class="fas fa-edit"></i></button>
                        <button onclick="deleteStory('${doc.id}')"><i class="fas fa-trash-alt"></i></button></div>
                    </div>
                    ${storyData.coverImageUrl ? `<img src="${storyData.coverImageUrl}" alt="Cover Image">` : ""}
                    <p class="pro">Published on: ${displayDate}</p> <!-- Display the formatted date -->
                `;

                storyList.appendChild(storyItem);
            });
        })
        .catch(error => {
            console.error("Error loading stories:", error);
            showAlert('Error','check your connection and try again')
        });
}


// Like a story

async function likeStory(storyId, event) {
    const userId = firebase.auth().currentUser.uid;
    const heartIcon = event.target;

    try {
        const storyRef = db.collection("stories").doc(storyId);
        const storyDoc = await storyRef.get();
        let likes = storyDoc.data().likes || {};

        if (likes[userId]) {
            delete likes[userId]; // Unlike if already liked
            heartIcon.classList.remove("liked"); // Change heart color to white
        } else {
            likes[userId] = true; // Like the story
            heartIcon.classList.add("liked"); // Change heart color to red
        }

        await storyRef.update({ likes });
        heartIcon.nextElementSibling.textContent = Object.keys(likes).length; // Update like count
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

    if (!text) return showAlert("Error","Comment cannot be empty!");

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
        showAlert("Error","Error adding comment!try again.");
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
                showAlert("Error","Story not found.");
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
            showAlert("Error","Try again later.")
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


    function viewStory(storyId) {
        window.location.href = `story.html?id=${storyId}`;
    }

    function editStory(storyId) {
// Redirect to write.html with the story ID as a URL parameter
window.location.href = `write.html?storyId=${storyId}`;
let submit=document.getElementById('submit');
submit.style.display="none";
}


    function deleteStory(storyId) {
        // if (confirm("Are you sure you want to delete this story?")) {
        if(showAlert('Are you sure you want to Delete','once deleted story can not be retrive again')){
            db.collection("stories").doc(storyId).delete()
                .then(() => {
                    showAlert("status","Story deleted successfully")
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
            showAlert("Error","Error logging out. Please try again.");
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
              showAlert("Error","Failed to generate!try again later.");
            throw new Error(`Failed to generate story: ${response.status}`);
          }
          const result = await response.json();
          console.log(result);
          let story=document.getElementById('story-content');
        
          story.textContent=result.result;
          return result.result;
        } catch (error) {
            console.error('Error:', error.message);
            showAlert("Error","can not Generate right now!try again later.")
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