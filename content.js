function isAd(post) {
    const hasSponsoredLink = post.querySelector('a[aria-label="Sponsored"], a[href*="/ad_preferences/"]');
    const textContent = post.innerText || "";

    if (hasSponsoredLink) return true;

    const useTags = post.querySelectorAll('use');
    for (let use of useTags) {
        if (use.getAttribute('href') && use.getAttribute('href').includes('Sponsored')) {
            return true;
        }
    }
    return false;
}

function hasValidImage(post) {
    const images = post.querySelectorAll('img');
    for (let img of images) {
        if (img.src && !img.src.includes('emoji') && (img.width > 100 || img.height > 100 || !img.width)) {
            return true;
        }
    }
    return false;
}

function createWidget(post) {
    const container = document.createElement('div');
    container.className = 'phc-collector-widget';

    // State 1: Analyze
    const analyzeBtn = document.createElement('button');
    analyzeBtn.className = 'phc-btn phc-btn-primary';
    analyzeBtn.innerText = 'Analyze';

    // State 2: Consent
    const consentContainer = document.createElement('div');
    consentContainer.style.display = 'none';
    consentContainer.style.alignItems = 'center';
    consentContainer.style.gap = '8px';

    const consentText = document.createElement('span');
    consentText.className = 'phc-consent-text';
    consentText.innerText = 'Do you consent this post to send to analyzer server?';

    const acceptBtn = document.createElement('button');
    acceptBtn.className = 'phc-btn phc-btn-accept';
    acceptBtn.innerText = 'Accept';

    const rejectBtn = document.createElement('button');
    rejectBtn.className = 'phc-btn phc-btn-reject';
    rejectBtn.innerText = 'Reject';

    consentContainer.append(consentText, acceptBtn, rejectBtn);

    // State 3: Result
    const resultContainer = document.createElement('div');
    resultContainer.style.display = 'none';
    resultContainer.style.alignItems = 'center';
    resultContainer.style.gap = '4px';

    const resultText = document.createElement('span');
    resultText.className = 'phc-result-text';

    const dropdownBtn = document.createElement('button');
    dropdownBtn.className = 'phc-dropdown-btn';
    dropdownBtn.innerHTML = '▼';

    const dropdownMenu = document.createElement('div');
    dropdownMenu.className = 'phc-dropdown-menu';
    const analyzeAgainBtn = document.createElement('button');
    analyzeAgainBtn.className = 'phc-dropdown-item';
    analyzeAgainBtn.innerText = 'Analyze again';
    dropdownMenu.appendChild(analyzeAgainBtn);

    resultContainer.append(resultText, dropdownBtn, dropdownMenu);

    container.append(analyzeBtn, consentContainer, resultContainer);

    // --- Event Listeners --- //

    const setState = (state) => {
        analyzeBtn.style.display = 'none';
        consentContainer.style.display = 'none';
        resultContainer.style.display = 'none';
        dropdownMenu.classList.remove('active');

        if (state === 'analyze') analyzeBtn.style.display = 'block';
        if (state === 'consent') consentContainer.style.display = 'flex';
        if (state === 'result') resultContainer.style.display = 'flex';
    };

    analyzeBtn.onclick = (e) => {
        e.preventDefault(); e.stopPropagation();
        setState('consent');
    };

    rejectBtn.onclick = (e) => {
        e.preventDefault(); e.stopPropagation();
        setState('analyze');
    };

    acceptBtn.onclick = (e) => {
        e.preventDefault(); e.stopPropagation();

        consentContainer.style.display = 'none';
        resultContainer.style.display = 'flex';
        resultText.innerText = 'Sending...';
        resultText.className = 'phc-result-text';
        dropdownBtn.style.display = 'none';

        extractAndSendData(post, (response) => {
            dropdownBtn.style.display = 'flex';

            if (response && response.status === 'error') {
                resultText.innerText = 'Error';
                resultText.className = 'phc-result-text phc-result-alert';
                console.error("API Error:", response.error);
                return;
            }

            if (response && response.status === 'success' && response.json && response.json.analysis) {
                const analysisStatus = response.json.analysis.status;

                if (analysisStatus === 'alert') {
                    resultText.innerText = 'Alert';
                    resultText.className = 'phc-result-text phc-result-alert';
                } else if (analysisStatus === 'ok') {
                    resultText.innerText = 'OK';
                    resultText.className = 'phc-result-text phc-result-ok';
                } else if (analysisStatus === 'nothing_to_detect') {
                    resultText.innerText = 'Nothing to analyze';
                    resultText.className = 'phc-result-text phc-result-na';
                } else if (analysisStatus === 'low_confidence') {
                    resultText.innerText = 'Low Confidence';
                    resultText.className = 'phc-result-text phc-result-alert';
                } else {
                    resultText.innerText = 'Unknown Status';
                    resultText.className = 'phc-result-text phc-result-na';
                }
            } else {
                resultText.innerText = 'Invalid Response';
                resultText.className = 'phc-result-text phc-result-alert';
            }
        });
    };

    dropdownBtn.onclick = (e) => {
        e.preventDefault(); e.stopPropagation();
        dropdownMenu.classList.toggle('active');
    };

    analyzeAgainBtn.onclick = (e) => {
        e.preventDefault(); e.stopPropagation();
        setState('analyze');
    };

    document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) {
            dropdownMenu.classList.remove('active');
        }
    });

    return container;
}


function injectButtons() {
    const posts = document.querySelectorAll('[role="article"]');

    posts.forEach(post => {
        let existingWidget = post.querySelector('.phc-collector-widget');
        if (existingWidget) {
            if (existingWidget.offsetParent === null) {
                existingWidget.remove();
            } else {
                return;
            }
        }

        if (post.parentElement && post.parentElement.closest('[role="article"]')) return;
        if (post.closest('[aria-label="Stories"]')) return;

        const timeLinks = Array.from(post.querySelectorAll('a[href*="/posts/"], a[href*="/permalink/"], a[href*="fbid="]'));
        if (timeLinks.length === 0) return; // Skips "People You May Know" and other non-post cards

        const heading = post.querySelector('h2, h3, h4');
        if (heading && heading.innerText.includes('Reels and short videos')) return;

        const hasReelLink = post.querySelector('a[href*="/reel/"]');
        if (hasReelLink) return;

        if (isAd(post)) return;

        if (!hasValidImage(post)) return;

        const menuBtn = post.querySelector('[aria-haspopup="menu"]');
        const widget = createWidget(post);

        if (menuBtn && menuBtn.parentElement) {
            const parent = menuBtn.parentElement;
            if (window.getComputedStyle(parent).position === 'static') {
                parent.style.position = 'relative';
            }
            parent.insertBefore(widget, menuBtn);
        } else {
            // Fallback for different Chrome A/B layouts
            const headerElement = heading ? heading.parentElement : null;
            if (headerElement) {
                if (window.getComputedStyle(headerElement).position === 'static') {
                    headerElement.style.position = 'relative';
                }
                headerElement.appendChild(widget);
            } else {
                post.style.position = 'relative';
                post.appendChild(widget);
            }
        }
    });
}

async function extractAndSendData(post, callback) {
    function isBefore(node1, node2) {
        if (!node1 || !node2) return true;
        return (node1.compareDocumentPosition(node2) & Node.DOCUMENT_POSITION_FOLLOWING) > 0;
    }

    let boundaryNode = post.querySelector('form');
    if (!boundaryNode) {
        const commentInputs = Array.from(post.querySelectorAll('div[aria-label*="comment" i], span')).filter(el => el.innerText && el.innerText.toLowerCase().includes('write a comment'));
        if (commentInputs.length > 0) boundaryNode = commentInputs[0];
    }
    if (!boundaryNode) {
        const actionBars = Array.from(post.querySelectorAll('div[role="button"]')).filter(el => el.innerText === 'Like');
        if (actionBars.length > 0) boundaryNode = actionBars[0];
    }

    function getCanonicalProfileUrl(href) {
        try {
            const url = new URL(href, window.location.origin);
            const params = new URLSearchParams(url.search);
            const id = params.get('id');
            url.search = '';
            if (id) {
                url.searchParams.set('id', id);
            }
            return url.toString();
        } catch (e) {
            return href;
        }
    }

    function isProfileLink(a) {
        const href = a.getAttribute('href');
        if (!href) return false;
        try {
            const url = new URL(href, window.location.origin);
            const path = url.pathname;
            if (
                path.includes('/posts') ||
                path.includes('/photos') ||
                path.includes('/videos') ||
                (path.includes('/groups') && !path.match(/\/(user|member|profile)/)) ||
                path.includes('/permalink.php') ||
                path.includes('/sharer') ||
                path.includes('/l.php') ||
                path.includes('/events') ||
                path.includes('/messages') ||
                path.includes('/pages') ||
                path.includes('/buddylist') ||
                path === '/'
            ) return false;
            return (url.hostname === 'www.facebook.com' || url.hostname === 'facebook.com' || url.hostname === 'm.facebook.com');
        } catch (e) { return false; }
    }

    function isTimestampLink(a) {
        const href = a.getAttribute('href');
        if (!href) return false;
        const isPostUrl = href.includes('/posts/') ||
            href.includes('/permalink') ||
            href.includes('/videos/') ||
            href.includes('/photo/') ||
            href.includes('/watch/') ||
            href.includes('fbid=');
        if (!isPostUrl) return false;
        const text = a.textContent.trim();
        if (!text || text.length > 25) return false;
        return true;
    }

    const allLinks = Array.from(post.querySelectorAll('a'));
    const contentLinks = allLinks.filter(link => !boundaryNode || isBefore(link, boundaryNode));

    const profileLinks = contentLinks.filter(isProfileLink);
    const timestampLinks = contentLinks.filter(isTimestampLink);

    let profileName = "Unknown";
    let profileUrl = "Unknown";
    let postUrl = window.location.href;
    let postDatetime = new Date().toISOString();
    let privacyType = "Unknown";
    let mainTimeLink = null;

    const validProfileLinks = profileLinks.filter(link => {
        const text = link.textContent.trim();
        return text.length > 0 && !text.includes('Reels') && text !== 'Follow';
    });

    if (validProfileLinks.length > 0) {
        // Find unique timestamp links to differentiate between duplicate DOM elements and actual shared posts
        const uniqueTimestamps = [];
        let lastHref = null;
        for (let t of timestampLinks) {
            const cleanUrl = t.href.split('__cft__')[0];
            if (cleanUrl !== lastHref) {
                uniqueTimestamps.push(t);
                lastHref = cleanUrl;
            }
        }

        if (uniqueTimestamps.length >= 2) {
            // Shared post: the original poster is usually the first profile link AFTER the sharer's timestamp
            const firstTimestamp = uniqueTimestamps[0];
            mainTimeLink = uniqueTimestamps[uniqueTimestamps.length - 1]; // Original post's timestamp

            let userBLink = null;
            for (let i = 0; i < validProfileLinks.length; i++) {
                if (isBefore(firstTimestamp, validProfileLinks[i])) {
                    userBLink = validProfileLinks[i];
                    break;
                }
            }

            if (userBLink) {
                profileName = userBLink.textContent.trim();
                profileUrl = getCanonicalProfileUrl(userBLink.getAttribute('href'));
            } else if (validProfileLinks.length > 0) {
                const fallback = validProfileLinks[0];
                profileName = fallback.textContent.trim();
                profileUrl = getCanonicalProfileUrl(fallback.getAttribute('href'));
                mainTimeLink = uniqueTimestamps[0];
            }
        } else {
            // Regular post
            if (validProfileLinks.length > 0) {
                const userALink = validProfileLinks[0];
                profileName = userALink.textContent.trim();
                profileUrl = getCanonicalProfileUrl(userALink.getAttribute('href'));
            }
            if (uniqueTimestamps.length > 0) {
                mainTimeLink = uniqueTimestamps[0];
            }
        }
    }

    if (mainTimeLink) {
        postUrl = mainTimeLink.href;
        postDatetime = mainTimeLink.innerText.trim() || postDatetime;

        if (mainTimeLink.parentElement && mainTimeLink.parentElement.parentElement) {
            const privacySpan = mainTimeLink.parentElement.parentElement.querySelector('span[aria-label^="Shared with"], span[aria-label^="Custom"]');
            if (privacySpan) {
                privacyType = privacySpan.getAttribute('aria-label').replace('Shared with ', '').trim();
            }
        }

        // Simulating hover to get exact datetime from tooltip
        try {
            mainTimeLink.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, cancelable: true }));
            mainTimeLink.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, cancelable: true }));
            mainTimeLink.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, cancelable: true }));

            // Wait 800ms for tooltip to render and caption to expand
            await new Promise(r => setTimeout(r, 800));

            const tooltips = document.querySelectorAll('[role="tooltip"]');
            if (tooltips.length > 0) {
                const tooltipText = tooltips[tooltips.length - 1].innerText.trim();
                if (tooltipText) {
                    let cleanString = tooltipText.replace(/at\s+/i, '');
                    let parsedDate = new Date(cleanString);
                    if (!isNaN(parsedDate.getTime())) {
                        postDatetime = parsedDate.toISOString();
                    } else {
                        postDatetime = tooltipText; // Fallback to raw text
                    }
                }
            }

            mainTimeLink.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, cancelable: true }));
            mainTimeLink.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true, cancelable: true }));
        } catch (e) {
            console.warn('Hover simulation failed', e);
        }
    }

    let imageUrl = null;
    const images = post.querySelectorAll('img');
    for (let img of images) {
        if (img.src && !img.src.includes('emoji') && !img.src.includes('rsrc.php') && (img.width > 100 || img.height > 100 || !img.width)) {
            imageUrl = img.src;
            break;
        }
    }

    const data = {
        profileName,
        profileUrl,
        postUrl,
        privacyType,
        postDatetime,
        imageUrl
    };

    console.log("Extracted Data:", data);

    try {
        chrome.runtime.sendMessage({ action: "sendPostData", data: data }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("Runtime error:", chrome.runtime.lastError);
                if (callback) callback({ status: "error", error: "Please refresh the page (extension updated)." });
                return;
            }
            if (callback) callback(response);
        });
    } catch (err) {
        console.error("Message send failed:", err);
        if (callback) callback({ status: "error", error: "Please refresh the page (extension context invalidated)." });
    }
}

setTimeout(injectButtons, 3000);
setInterval(injectButtons, 2000);

const observer = new MutationObserver((mutations) => {
    let shouldInject = false;
    for (let mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
            shouldInject = true;
            break;
        }
    }
    if (shouldInject) {
        injectButtons();
    }
});

observer.observe(document.body, { childList: true, subtree: true });
