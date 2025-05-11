document.addEventListener("DOMContentLoaded", () => {
  const roomIdInput = document.getElementById("roomId")
  const videoTitleInput = document.getElementById("videoTitle")
  const videoUrlInput = document.getElementById("videoUrl")
  const sendButton = document.getElementById("sendButton")
  const statusDiv = document.getElementById("status")
  const videoListDiv = document.getElementById("videoList")

  // Load saved room ID if available
  chrome.storage.local.get(["roomId"], (result) => {
    if (result.roomId) {
      roomIdInput.value = result.roomId
    }
  })

  // Get detected videos from background script
  chrome.runtime.sendMessage({ action: "getVideos" }, (response) => {
    if (response) {
      updateVideoList(response.videos || [])
    } else {
      console.error("No response from background script")
    }
  })

  // Listen for new videos from background script
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "newVideo") {
      chrome.runtime.sendMessage({ action: "getVideos" }, (response) => {
        if (response) {
          updateVideoList(response.videos || [])
        }
      })
    }
    return true // Keep the message channel open for sendResponse
  })

  // Update the video list in the popup
  function updateVideoList(videos) {
    if (videos.length === 0) {
      videoListDiv.innerHTML = '<div class="no-videos">No videos detected yet. Browse a page with videos.</div>'
      return
    }

    videoListDiv.innerHTML = ""
    videos.forEach((url) => {
      const videoItem = document.createElement("div")
      videoItem.className = "video-item"
      videoItem.textContent = url
      videoItem.addEventListener("click", () => {
        videoUrlInput.value = url
        updateSendButtonState()
      })
      videoListDiv.appendChild(videoItem)
    })

    // Select the first video by default if none is selected
    if (!videoUrlInput.value && videos.length > 0) {
      videoUrlInput.value = videos[0]
      updateSendButtonState()
    }
  }

  // Enable/disable send button based on inputs
  function updateSendButtonState() {
    sendButton.disabled = !roomIdInput.value || !videoUrlInput.value
  }

  // Input event listeners
  roomIdInput.addEventListener("input", updateSendButtonState)
  videoUrlInput.addEventListener("input", updateSendButtonState)

  // Save room ID when changed
  roomIdInput.addEventListener("change", () => {
    chrome.storage.local.set({ roomId: roomIdInput.value })
  })

  // Send video to room
  sendButton.addEventListener("click", () => {
    const roomId = roomIdInput.value
    const videoUrl = videoUrlInput.value
    const videoTitle = videoTitleInput.value || "Video from extension"

    // Save room ID
    chrome.storage.local.set({ roomId: roomId })

    // Show loading state
    sendButton.disabled = true
    sendButton.textContent = "Sending..."
    statusDiv.style.display = "none"

    // Send to server
    fetch(`http://localhost:3000/api/video`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        roomId,
        videoUrl,
        videoTitle,
      }),
    })
      .then((response) => {
        if (!response.ok) {
          return response.json().then((data) => {
            throw new Error(data.message || "Failed to send video")
          })
        }
        return response.json()
      })
      .then((data) => {
        // Show success message
        statusDiv.className = "status success"
        statusDiv.textContent = "Video sent successfully!"
        statusDiv.style.display = "block"

        // Reset button
        sendButton.textContent = "Send Video to Room"
        sendButton.disabled = false

        // Open the room in a new tab
        chrome.tabs.create({ url: `http://localhost:3000/room/${roomId}` })
      })
      .catch((error) => {
        // Show error message
        statusDiv.className = "status error"
        statusDiv.textContent = `Error: ${error.message}`
        statusDiv.style.display = "block"

        // Reset button
        sendButton.textContent = "Send Video to Room"
        sendButton.disabled = false
      })
  })

  // Initial button state
  updateSendButtonState()
})
