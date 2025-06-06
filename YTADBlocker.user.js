// ==UserScript==
// @name         YouTube AdBlocker
// @namespace    http://tampermonkey.net/
// @version      1.1.7
// @description  Removes Adblock Thing
// @author       mstudio45
// @match        https://www.youtube.com/*
// @match        http://www.youtube.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @updateURL    https://github.com/mstudio45/YoutubeAdBlocker/raw/main/YTADBlocker.user.js
// @downloadURL  https://github.com/mstudio45/YoutubeAdBlocker/raw/main/YTADBlocker.user.js
// @grant        none
// ==/UserScript==


(function() {
    /* Info:
        This script code originated from TheRealJoelmatic's Remove Adblock Thing: https://github.com/TheRealJoelmatic/RemoveAdblockThing
        Go give him a star on his repository!

        This AdBlocker keeps playing the video and ads in the background.
            - That means it will save the videos you watch into your history (sometimes the video ended or is 2-3 minutes late due to ADs)
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
        removePopUps: true
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

    // Static Variables //
    const qualityList = ["Auto", "144p", "240p", "360p", "480p", "720p", "1080p", "1440p", "2160p"];

    // Update Variables //
    let hasUpdated = false;
    let hasIgnoredUpdate = false;
    let updateInterval = undefined;

    // Main Variables //
    let currentUrl = window.location.href;
    let videoElement;
    let playerElement;

    // Video Variables //
    let isStream = false;
    let qualitySet = false;

    let customPlayer = undefined;
    let customVideoInserted = false;

    let adBlockInterval = undefined;
    let muteInterval = undefined;

    // Intervals //
    let dataInterval = undefined;


    ///////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////

    function updateAlert(scriptUrl, githubVersion, currentVersion) {
        const result = window.confirm("Remove Adblock Thing: A new version is available! Do you want to update the script? Latest: " + githubVersion + " | Currently installed: " + currentVersion);
        if (result) { window.open(scriptUrl, "_blank"); } else {
            hasIgnoredUpdate = true;
            clearInterval(updateInterval);
        }
    }

    function updateChecker() {
        if (!SETTINGS.updateCheck || hasIgnoredUpdate) return;

        const scriptUrl = "https://raw.githubusercontent.com/mstudio45/YoutubeAdBlocker/main/YTADBlocker.user.js";
        if (updateInterval) clearInterval(updateInterval);

        const checkVersion = () => {
            log("Checking version...")
            fetch(scriptUrl + "?random" + (Math.random() + 1).toString(36).substring(7) + "=" + (Math.random() + 1).toString(36).substring(7)).then(response => response.text()).then(data => {
                if (hasIgnoredUpdate) { clearInterval(updateInterval); return; }

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
        updateInterval = setInterval(checkVersion, 120_000) // 120 seconds for update checks.
    }

    ///////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////

    // Functions //
    function clearAllPlayers(fakeVideoOnly) {
        if (isShortsPage()) fakeVideoOnly = true;

        const popups = [document.querySelectorAll("#customiframeplayer"), fakeVideoOnly === true ? [] : document.querySelectorAll("video")]
        popups.forEach((elements) => {
            try {
                if (elements && elements.length > 0) {
                    elements.forEach((element) => element.remove());
                }
            } catch (e) { log("Error:", "error", elements, e) }
        })
    }
    function getYouTubeLinkData(urlString) {
        const DATA = {
            ID: "",
            params: "?autoplay=1&modestbranding=1&rel=0",
            timestamp: 0,
            playlist: false,
        }
        if (!urlString) return DATA;

        // Get video details //
        const url = new URL(urlString);
        const urlParams = url.searchParams;

        // Get Video ID //
        if (urlParams.has("v")) { DATA.ID = urlParams.get("v"); } else {
            const paths = url.pathname.split("/");
            const liveIndex = paths.indexOf("live")

            if (liveIndex !== -1 && liveIndex + 1 < paths.length) DATA.ID = paths[liveIndex + 1];
        }
        if (DATA.ID == "") return DATA;

        // Fetch data //
        if (urlParams.has("list")) {
            DATA.playlist = true;
            // DATA.params = DATA.params + "&listType=playlist&list=" + urlParams.get("list");
        }

        if (urlParams.has("t") || urlParams.has("start")) {
            DATA.timestamp = parseInt((urlParams.get("t") || urlParams.get("start")).replace("s", ""));
            DATA.params = DATA.params + "&start=" + DATA.timestamp.toString();
        }

        return DATA;
    }

    function isShortsPage() { return window.location.href.includes("/shorts/") }
    function isVideoPage() { return window.location.href.includes("watch?v=") || window.location.href.includes("/clip"); }
    function isAdPlaying() {
        const isAdText = document.querySelector(".ytp-ad-text");
        const skipAdBtn = document.querySelector(".ytp-ad-skip-button");
        if (isAdText || skipAdBtn) return true;
        return false;
    }

    // PopUp Remover //
    let popUpInterval = undefined;
    let isPopupBeingProcessed = false;

    function removeFakeErrorScreen() { // "Ad blockers violate YouTube's Terms of Service" safari modal
        const errorScreen = document.querySelector("#error-screen");
        if (errorScreen) errorScreen.remove();
    }

    function popupRemover() {
        if (popUpInterval) clearInterval(popUpInterval);
        popUpInterval = setInterval(() => {
            if (SETTINGS.removePopUps !== true || isPopupBeingProcessed) return;
            isPopupBeingProcessed = true;

            // Ad Block PopUp //
            const bodyStyle = document.body.style;
            bodyStyle.setProperty('overflow-y', 'auto', 'important');

            // Error Screen //
            const errorScreen = document.querySelector("#error-screen");
            if (errorScreen) {
                errorScreen.remove();
                log("Error modal removed.", "success");
            }

            // Modal //
            const modalOverlay = document.querySelector("tp-yt-iron-overlay-backdrop");
            if (modalOverlay) {
                modalOverlay.removeAttribute("opened");
                modalOverlay.remove();
                log("Modal has been removed.", "success");
            }

            // ToS PopUp //
            const popup = document.querySelector(".style-scope ytd-enforcement-message-view-model");
            if (popup && videoElement) {
                const popupButton = document.getElementById("dismiss-button");

                if (popupButton) popupButton.click();
                popup.remove();

                // Unpause video
                videoElement.play();
                setTimeout(() => { if (videoElement.paused) videoElement.play(); }, 1000);

                log("Popup has been removed.", "success");
            }

            // PopUp Ads //
            const popupAd = document.querySelector("style-scope, .yt-about-this-ad-renderer");
            if (popupAd) {
                popupAd.parentElement.parentElement.remove();
                log("Popup ad center has been removed.", "success");
            }

            isPopupBeingProcessed = false;
        }, 1000);
    }

    // Page AD Remover //
    function removePageAds() {
        if (SETTINGS.removePageAds !== true) return;

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
ytd-engagement-panel-section-list-renderer,
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

    // Video Ad Block //
    function runDataInterval() {
        if (dataInterval) clearInterval(dataInterval);
        dataInterval = setInterval(() => {
            if (!videoElement) videoElement = document.querySelector("video");
            if (!playerElement) {
                let tempPlayerElement = document.querySelector("#player");
                if (tempPlayerElement.className.indexOf("skeleton") === -1) playerElement = tempPlayerElement;
            }
        }, 100);
    }

    function setToLowestQuality() {
        if (isAdPlaying()) return;

        // Select lowest video quality //
        const settingsButton = document.querySelector("button.ytp-settings-button");
        if (!settingsButton) { log("Failed to fetch settings button.", "error"); return; }
        settingsButton.click();

        const menuItemLabels = Array.from(document.querySelectorAll(".ytp-menuitem-content"));
        const menuBtns = menuItemLabels.filter(btn => qualityList.some(quality => btn.innerHTML.includes(quality)))
        if (!menuBtns[0]) { log("Failed to fetch quality settings element.", "error"); return; }

        const qualityButton = menuBtns[0].parentElement;
        if (!qualityButton) { log("Failed to fetch quality settings button.", "error"); return; }
        qualityButton.click();

        const qualityMenu = document.querySelector(".ytp-quality-menu > .ytp-panel-menu");
        const qualityOptions = Array.from(qualityMenu.querySelectorAll(".ytp-menuitem"));
        const lowestQuality = qualityOptions.find(item => item.textContent.trim().includes("144p")) || qualityOptions.find(item => item.textContent.trim().includes("240p")) || qualityOptions.find(item => item.textContent.trim().includes("360p"));
        if (!lowestQuality) return;

        lowestQuality.click();
        log("The main video quality is now set to " + lowestQuality.textContent.trim() + ".", "success");

        return true;
    }

    function muteMainVideo() {
        if (SETTINGS.adBlocker !== true) return;
        if (muteInterval) clearInterval(muteInterval);

        const muteVideo = () => {
            if (!videoElement) return;

            // display //
            videoElement.parentElement.style.display = "none";

            // audio and time //
            videoElement.volume = 0; videoElement.muted = true;
            if (videoElement.paused) videoElement.play();

            // quality //
            if (qualitySet !== true) qualitySet = setToLowestQuality();
        };
        setTimeout(muteVideo, 1);
        muteInterval = setInterval(muteVideo, 500);
    }

    function videoAdBlocker() {
        if (SETTINGS.adBlocker !== true) return;
        currentUrl = window.location.href;

        muteMainVideo();
        if (adBlockInterval) clearInterval(adBlockInterval);

        adBlockInterval = setInterval(() => {
            if (!isVideoPage() || isShortsPage() || customVideoInserted === true) return;
            if (!videoElement || !playerElement) return;

            // Reset players //
            log("Clearing duplicate players and muting main player...");
            clearAllPlayers(true);

            // Get video details //
            const videoData = getYouTubeLinkData(window.location.href)
            if (videoData.ID == "") { log("Failed to fetch video ID.", "error"); return; }

            // Load //
            log("Video ID: " + videoData.ID);
            customVideoInserted = true;

            if (customPlayer) customPlayer.remove();
            customPlayer = document.createElement("iframe");
            customPlayer.id = "customiframeplayer";

            customPlayer.setAttribute('src', "https://www.youtube-nocookie.com/embed/" + videoData.ID + videoData.params);
            customPlayer.setAttribute('frameborder', '0');
            customPlayer.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
            customPlayer.setAttribute('allowfullscreen', true);
            customPlayer.setAttribute('mozallowfullscreen', "mozallowfullscreen");
            customPlayer.setAttribute('msallowfullscreen', "msallowfullscreen");
            customPlayer.setAttribute('oallowfullscreen', "oallowfullscreen");
            customPlayer.setAttribute('webkitallowfullscreen', "webkitallowfullscreen");

            customPlayer.style.width = '100%'; customPlayer.style.height = '100%';
            customPlayer.style.position = 'absolute';
            customPlayer.style.top = '0';
            customPlayer.style.left = '0';
            customPlayer.style.zIndex = '1000';
            customPlayer.style.pointerEvents = 'all';

            // Get saved timestamp //
            if (videoElement && videoElement.currentTime >= 10 && videoData.params.indexOf("&start=") === -1) { // only works with 10 seconds or more
                videoElement.volume = 0;

                videoData.timestamp = parseInt(videoElement.currentTime.toString().split(".")[0]);
                videoData.params = videoData.params + "&start=" + videoData.timestamp.toString();
                customPlayer.setAttribute('src', "https://www.youtube-nocookie.com/embed/" + videoData.ID + videoData.params);

                log("Set start time to the saved timestamp.")
            }

            log("Inserting IFrame...");
            playerElement.appendChild(customPlayer);
        }, 1500);
    }

    // Timestamp fixer //
    function timestampFixer() {
        document.addEventListener('click', function(event) {
            if (!customPlayer) return;

            const target = event.target;
            if (!(target.tagName === 'A' && target.href)) return;
            if (!target.href.includes("/watch?v=")) return;

            const VideoData = getYouTubeLinkData(target.href)
            if (VideoData.ID == "") { log("Failed to fetch video ID.", "error"); return; }

            log("Seeking to timestamp...", "", VideoData.timestamp);
            customPlayer.setAttribute('src', "https://www.youtube-nocookie.com/embed/" + VideoData.ID + VideoData.params);
        });
    }

    log("Starting script...", "success");

    if (!isShortsPage()) {
        runDataInterval(); // Video Data

        setTimeout(popupRemover, 1);
        setTimeout(removePageAds, 1);

        timestampFixer(); // Comment timestamp fix
        videoAdBlocker(); // Main AdBlock
    }

    updateChecker();
    log("Script started!", "success");

    // Update loop //
    setInterval(() => {
        if (window.location.href !== currentUrl) {
            log("________________________")
            currentUrl = window.location.href;
            customVideoInserted = false; qualitySet = false;

            popupRemover();
            removePageAds();
            clearAllPlayers(true);
        }
    }, 100);
})();
