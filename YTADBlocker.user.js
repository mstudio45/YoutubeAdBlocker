// ==UserScript==
// @name         YouTube AdBlocker
// @namespace    http://tampermonkey.net/
// @version      1.0.1
// @description  Removes Adblock Thing
// @author       mstudio45
// @match        https://www.youtube.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @updateURL    https://github.com/mstudio45/YoutubeAdBlocker/raw/main/YTADBlocker.user.js
// @downloadURL  https://github.com/mstudio45/YoutubeAdBlocker/raw/main/YTADBlocker.user.js
// @grant        none
// ==/UserScript==

(function() {
    /* Info:
        This script originated from TheRealJoelmatic's Remove Adblock Thing: https://github.com/TheRealJoelmatic/RemoveAdblockThing
        Go give him a star on his repository!

        This AdBlocker keeps playing the video and ads in the background.
         - That means it will give watch time on all of the videos you watch (since it will sometimes finish the video in the background)
         - and also give them money for the ADs to the YouTuber :D

        Thank you for using my AdBlocker.
    */

    const SETTINGS = {
        // General //
        debugMessages: true,
        updateCheck: true,

        // YouTube //
        adBlocker: true,
        removePageAds: true,
        popUps: {
            adBlock: true
        }
    }

    function log(log, level, ...args) {
        if (!SETTINGS.debugMessages) return;

        const prefix = '[YouTube AdBlocker]';
        switch (level) {
            case 'error':
                console.warn(`${prefix} ❌`, log, ...args);
                break;
            case 'success':
                console.log(`${prefix} ✅`, log, ...args);
                break;
            case 'warning':
                console.warn(`${prefix} ⚠️`, log, ...args);
                break;
            default:
                console.info(`${prefix} ℹ️`, log, ...args);
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////

    if (window.ytadblock) return; window.ytadblock = true;

    // Variables //
    let currentUrl = window.location.href;
    let customPlayerInserted = false;
    let hasIgnoredUpdate = false;
    let updateCheckInterval = undefined;

    // Global Functions //
    function getVideoElement() { return document.querySelector("video"); }

    // Updates //
    let updateAlert; updateAlert = function(scriptUrl, githubVersion, currentVersion) {
        //if (window.top !== window.self) { setTimeout(function() { updateAlert(scriptUrl, githubVersion, currentVersion); }, 1000); return; }

        const result = window.confirm("Remove Adblock Thing: A new version is available! Do you want to update the script? Latest: " + githubVersion + " | Currently installed: " + currentVersion);
        if (result) { window.open(scriptUrl, "_blank"); } else {
            hasIgnoredUpdate = true;
            clearInterval(updateCheckInterval);
        }
    }
    function updateChecker() {
        if (!SETTINGS.updateCheck) return;
        if (hasIgnoredUpdate) return;

        const scriptUrl = "https://raw.githubusercontent.com/mstudio45/YoutubeAdBlocker/main/YTADBlocker.user.js";
        if (updateCheckInterval) clearInterval(updateCheckInterval);

        const checkVersion = () => {
            log("Checking version...")
            fetch(scriptUrl + "?random" + (Math.random() + 1).toString(36).substring(7) + "=" + (Math.random() + 1).toString(36).substring(7)).then(response => response.text()).then(data => {
                if (hasIgnoredUpdate) { clearInterval(updateCheckInterval); return; }

                log("Extracting latest version...")
                // Extract version from the script on GitHub //
                const match = data.match(/@version\s+([\d.]+)/);
                if (!match) {
                    log("Unable to extract version from the GitHub script.", "error")
                    return;
                }

                const githubVersion = match[1];
                const currentVersion = GM_info.script.version;

                if (githubVersion === currentVersion) {
                    log("You have the latest version of the script.", "success", githubVersion, "-", currentVersion);
                    return;
                }

                log("Remove Adblock Thing: A new version is available. Please update your script. Latest: " + githubVersion + " | Currently installed: " + currentVersion, "warn");
                updateAlert(scriptUrl + "?random" + (Math.random() + 1).toString(36).substring(7) + "=" + (Math.random() + 1).toString(36).substring(7), githubVersion, currentVersion);
            }).catch(error => {
                hasIgnoredUpdate = true;
                log("Error checking for updates:", "error", error)
            });
        }

        checkVersion();
        updateCheckInterval = setInterval(checkVersion, 120_000) // 120 seconds for update checks.
    }

    // Popup Remover //
    let isPopupBeingProcessed = false;
    let popupRemoverInterval;

    function removeFakeErrorScreen() {
        // "Ad blockers violate YouTube's Terms of Service" safari modal
        const errorScreen = document.querySelector("#error-screen");
        if (errorScreen) errorScreen.remove();
    }

    function popupRemover() {
        if (popupRemoverInterval) clearInterval(popupRemoverInterval);
        popupRemoverInterval = setInterval(() => {
            if (isPopupBeingProcessed) return;
            isPopupBeingProcessed = true;

            // Ad Block popup //
            if (SETTINGS.popUps.adBlock == true) {
                const bodyStyle = document.body.style;
                bodyStyle.setProperty('overflow-y', 'auto', 'important');

                const modalOverlay = document.querySelector("tp-yt-iron-overlay-backdrop");
                if (modalOverlay) {
                    log("Removing modal...");
                    modalOverlay.removeAttribute("opened");
                    modalOverlay.remove();
                    log("Modal has been removed.", "success");
                }

                const popup = document.querySelector(".style-scope ytd-enforcement-message-view-model");
                if (popup) {
                    log("Removing popup...");
                    const video = getVideoElement();
                    const popupButton = document.getElementById("dismiss-button");

                    if (popupButton) popupButton.click();
                    popup.remove();

                    // Unpause video
                    video.play();
                    setTimeout(() => { if (video.paused) video.play(); }, 1000);

                    log("Popup has been removed.", "success");
                }

                const popupAd = document.querySelector("style-scope, .yt-about-this-ad-renderer");
                if (popupAd) {
                    log("Removing popup ad center...");
                    popupAd.parentElement.parentElement.remove();
                    log("Popup ad center has been removed.", "success");
                }

                removeFakeErrorScreen();
            }

            // Premium bitrate popup //
            /*if (SETTINGS.popUps.premiumBitrate == true) {
                const popups = [document.querySelectorAll("style-scope, .ytd-popup-container"), document.querySelectorAll("style-scope, .ytd-menu-popup-renderer")]
                popups.forEach((elements) => {
                    try {
                        if (elements && elements.length > 0) {
                            elements.forEach((element) => element.remove());
                        }
                    } catch (e) { log("Error:", "error", elements, e) }
                })
            }*/

            isPopupBeingProcessed = false;
        }, 1000);
    }

    // Page ADs remover //
    function removePageAds() {
        if (!SETTINGS.removePageAds) return;

        if (document.querySelector("#remadover") == undefined) {
            const style = document.createElement('style');
            style.id = "remadover"
            style.textContent = `ytd-action-companion-ad-renderer,
ytd-display-ad-renderer,
ytd-video-masthead-ad-advertiser-info-renderer,
ytd-video-masthead-ad-primary-video-renderer,
ytd-in-feed-ad-layout-renderer,
ytd-ad-slot-renderer,
yt-about-this-ad-renderer,
yt-mealbar-promo-renderer,
ytd-statement-banner-renderer,
ytd-ad-slot-renderer,
ytd-in-feed-ad-layout-renderer,
ytd-banner-promo-renderer-background
statement-banner-style-type-compact,
.ytd-video-masthead-ad-v3-renderer,
div#root.style-scope.ytd-display-ad-renderer.yt-simple-endpoint,
div#sparkles-container.style-scope.ytd-promoted-sparkles-web-renderer,
div#main-container.style-scope.ytd-promoted-video-renderer,
div#player-ads.style-scope.ytd-watch-flexy,
ad-slot-renderer,
ytm-promoted-sparkles-web-renderer,
masthead-ad,
tp-yt-iron-overlay-backdrop,
#masthead-ad {
display: none !important;
}`;
            document.head.appendChild(style);
        }

        const sponsor = document.querySelectorAll("div#player-ads.style-scope.ytd-watch-flexy, div#panels.style-scope.ytd-watch-flexy");
        if (sponsor) {
            sponsor.forEach((element) => {
                if (element.getAttribute("id") === "rendering-content") {
                    if (element.childNodes && element.childNodes.length > 0) {
                        element.childNodes.forEach((childElement) => {
                            if (childElement && childElement.data && childElement.data.targetId && childElement.data.targetId !== "engagement-panel-macro-markers-description-chapters") {
                                element.style.display = 'none';
                            }
                        });
                    }
                }
            });
        }

        log("Removed page ads.", "success");
    }

    // Video Ad Blocker //
    function clearAllPlayers(ourOnly) {
        const popups = [document.querySelectorAll("#customiframeplayer"), ourOnly == true ? [] : document.querySelectorAll("video")]
        popups.forEach((elements) => {
            try {
                if (elements && elements.length > 0) {
                    elements.forEach((element) => element.remove());
                }
            } catch (e) { log("Error:", "error", elements, e) }
        })
    }

    let isVideoAdBlockerBeingProcessed = false;
    let videoAdBlockerInterval = undefined;
    function videoAdBlocker() {
        if (!SETTINGS.adBlocker) return;
        currentUrl = window.location.href;

        let video = getVideoElement();
        let isStream = false;
        const forceMuteMainVideo = async function() {
            if (!video) video = getVideoElement();
            if (video) {
                video.volume = 0;
                video.muted = true;
                if (isStream) {
                    video.pause()
                } else {
                    if (video.paused && customPlayerInserted == true) video.play();
                }
            }

            setTimeout(forceMuteMainVideo, 1);
        }
        forceMuteMainVideo();

        if (videoAdBlockerInterval) clearInterval(videoAdBlockerInterval);
        videoAdBlockerInterval = setInterval(() => {
            if (!window.location.href.includes("/watch?v=")) return;
            if (customPlayerInserted) return;

            // Reset players //
            log("Clearing duplicate players and muting main player...");
            removeFakeErrorScreen();
            clearAllPlayers(true);

            // Get player //
            video = getVideoElement();

            // Get video details //
            let VideoID = "";
            let Arguments = "?autoplay=1&modestbranding=1&rel=0";
            const url = new URL(window.location.href);
            const urlParams = url.searchParams;

            // Get Video ID //
            if (urlParams.has("v")) { VideoID = urlParams.get("v"); } else {
                const paths = url.pathname.split("/");
                const liveIndex = paths.indexOf("live")

                if (liveIndex !== -1 && liveIndex + 1 < paths.length) VideoID = paths[liveIndex + 1];
            }
            if (VideoID == "") { log("Failed to fetch video ID.", "error"); return; }

            // Fetch data //
            if (urlParams.has("list")) Arguments = Arguments + "&listType=playlist&list=" + urlParams.get("list");
            if (urlParams.has("t") || urlParams.has("start")) Arguments = Arguments + "&start=" + (urlParams.get("t") || urlParams.get("start")).replace("s", "");

            // Load //
            customPlayerInserted = true;
            log("Video ID: " + VideoID)

            // Load //
            const iframe = document.createElement("iframe");
            const plr = (!video ? document.querySelector('#player') : video.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement) || document.querySelector('#player');
            iframe.id = "customiframeplayer"

            iframe.setAttribute('src', "https://www.youtube-nocookie.com/embed/" + VideoID + Arguments);
            iframe.setAttribute('frameborder', '0');
            iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
            iframe.setAttribute('allowfullscreen', true); iframe.setAttribute('mozallowfullscreen', "mozallowfullscreen"); iframe.setAttribute('msallowfullscreen', "msallowfullscreen"); iframe.setAttribute('oallowfullscreen', "oallowfullscreen"); iframe.setAttribute('webkitallowfullscreen', "webkitallowfullscreen");

            iframe.style.width = '100%'; iframe.style.height = '100%';
            iframe.style.position = 'absolute'; iframe.style.top = '0'; iframe.style.left = '0';
            iframe.style.zIndex = '1000';
            iframe.style.pointerEvents = 'all';

            // Get saved timestamp //
            if (video && (Arguments.indexOf("&start=") === -1 && video.currentTime >= 10)) { // only works with 10 seconds or more
                video.volume = 0;
                Arguments = Arguments + "&start=" + video.currentTime.toString().split(".")[0];
                iframe.setAttribute('src', "https://www.youtube-nocookie.com/embed/" + VideoID + Arguments);

                log("Set start time to the saved timestamp.")
            }

            log("Inserting IFrame...");
            plr.appendChild(iframe);

            log("Custom video player initialized!", "success")
            setTimeout(() => {
                const iframeEl = document.querySelector("#customiframeplayer") || document.querySelector('#player > iframe')
                if (!iframeEl && currentUrl === window.location.href) window.location.reload();
            }, 1500);
            setTimeout(() => { isStream = document.body.innerHTML.indexOf("<yt-live-chat-app") !== 1; }, 15000); // wait for 15s for youtube to save the livestream in the history
        }, 1000)
    }

    log("Starting script...", "success");
    if (!window.location.href.includes("/shorts/")) {
        removePageAds();
        popupRemover();
        videoAdBlocker();
        updateChecker();
    }

    // Update loop //
    setInterval(() => {
        if (window.location.href !== currentUrl && !window.location.href.includes("/shorts/")) {
            log("________________________")
            currentUrl = window.location.href;
            customPlayerInserted = false;

            removePageAds();
            popupRemover();
            clearAllPlayers();
        }
    }, 100);

    log("Script started!", "success");
})();
