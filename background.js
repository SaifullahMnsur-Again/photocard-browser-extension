chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "sendPostData") {

        (async () => {
            try {
                const data = request.data;
                const formData = new FormData();

                formData.append("profileName", data.profileName);
                formData.append("profileUrl", data.profileUrl);
                formData.append("postUrl", data.postUrl);
                formData.append("privacyType", data.privacyType);
                formData.append("postDatetime", data.postDatetime);

                if (data.imageUrl) {
                    try {
                        const imgResponse = await fetch(data.imageUrl);
                        if (imgResponse.ok) {
                            const imgBlob = await imgResponse.blob();
                            formData.append("image", imgBlob, "image.jpg");
                        }
                    } catch (e) {
                        console.error("Failed to fetch image blob:", e);
                    }
                }

                const response = await fetch("https://photocards.saifullahmnsur.dev/api/v1/posts/analyze", {
                    method: "POST",
                    body: formData
                });

                const text = await response.text();
                let json = null;
                try {
                    json = JSON.parse(text);
                } catch (e) {
                    // Ignore
                }

                console.log("Server Success:", text);
                sendResponse({ status: "success", body: text, json: json });

            } catch (error) {
                console.error("Server Error:", error);
                sendResponse({ status: "error", error: error.toString() });
            }
        })();

        return true; // Keeps the message channel open for async sendResponse
    }
});
