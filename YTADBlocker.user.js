// ==UserScript==
// @name         YouTube AdBlocker
// @namespace    http://tampermonkey.net/
// @version      2.0.3
// @description  YouTube AdBlocker made by mstudio45 that was inspired by TheRealJoelmatic's Remove Adblock Thing
// @author       mstudio45
// @match        https://www.youtube.com/*
// @match        http://www.youtube.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @updateURL    https://github.com/mstudio45/YoutubeAdBlocker/raw/main/YTADBlocker.user.js
// @downloadURL  https://github.com/mstudio45/YoutubeAdBlocker/raw/main/YTADBlocker.user.js
// @grant        none
// @noframes
// ==/UserScript==


(function() {
    /* Info:
        This script code originated from TheRealJoelmatic's Remove Adblock Thing: https://github.com/TheRealJoelmatic/RemoveAdblockThing
        Go give him a star on his repository!

        This AdBlocker keeps playing the video and ads in the background.
            - That means it will save the videos you watch into your history (sometimes the video ended or is 2-3 minutes late due to ADs)
            - and also give them money for the ADs to the YouTuber :D

        Thank you for using my AdBlocker.

        Changelogs: https://github.com/mstudio45/YoutubeAdBlocker/CHANGLOGS.md
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

        const prefix = "[YouTube AdBlocker]";
        switch (level) {
            case "error":
                console.warn(`${prefix} ❌`, log, ...args);
                break;
            case "success":
                console.log(`${prefix} ✅`, log, ...args);
                break;
            case "warning":
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

    let apiPlayer = undefined;
    let customPlayer = undefined;

    let customVideoInserted = false;
    let apiScriptInserted = false;
    let videoLoaded = false;

    let adBlockInterval = undefined;
    let muteInterval = undefined;

    // Intervals //
    let dataInterval = undefined;

    function resetEverything() {
        // Update Variables //
        hasUpdated = false;
        hasIgnoredUpdate = false;
        if (updateInterval) clearInterval(updateInterval); updateInterval = undefined;

        // Video Variables //
        isStream = false;
        qualitySet = false;

        apiPlayer = undefined;
        customPlayer = undefined;

        customVideoInserted = false;
        apiScriptInserted = false;
        videoLoaded = false;

        if (adBlockInterval) clearInterval(adBlockInterval); adBlockInterval = undefined;
        if (muteInterval) clearInterval(muteInterval); muteInterval = undefined;

        // Intervals //
        if (dataInterval) clearInterval(dataInterval); dataInterval = undefined;
    }

    ///////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////

    function updateAlert(scriptUrl, githubVersion, currentVersion) {
        if (hasIgnoredUpdate === true) return;

        const result = window.confirm("YouTube AdBlocker: A new version is available! Do you want to update the script? Latest: " + githubVersion + " | Currently installed: " + currentVersion);
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

                log("YouTube AdBlocker: A new version is available. Please update your script. Latest: " + githubVersion + " | Currently installed: " + currentVersion, "warn");
                updateAlert(scriptUrl + "?random" + (Math.random() + 1).toString(36).substring(7) + "=" + (Math.random() + 1).toString(36).substring(7), githubVersion, currentVersion);
            }).catch(error => {
                hasIgnoredUpdate = true;
                log("Error checking for updates:", "error", error)
            });
        }

        checkVersion();
        updateInterval = setInterval(checkVersion, 120_000) // 120 seconds for update checks. //
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
            // playlist: false,
            params: {
                start: 0,

                controls: 1, rel: 0,
                autoplay: 0, loop: 0
            }
        }
        if (!urlString) return DATA;

        // Get video details //
        const url = new URL(urlString);
        const urlParams = url.searchParams;

        // Get Video ID //
        if (urlParams.has("v")) {
            DATA.ID = urlParams.get("v");
        } else {
            const paths = url.pathname.split("/");
            const liveIndex = paths.indexOf("live")

            if (liveIndex !== -1 && liveIndex + 1 < paths.length) DATA.ID = paths[liveIndex + 1];
        }
        if (DATA.ID == "") return DATA;

        // Handle Start time //
        if (urlParams.has("t") || urlParams.has("start")) {
            DATA.params.start = parseInt((urlParams.get("t") || urlParams.get("start")).replace("s", "")) || 0;
        } else {
            DATA.params.start = 0;
        }

        return DATA;
    }

    function isShortsPage() { return window.location.href.includes("/shorts/") }
    function isVideoPage() { return window.location.href.includes("watch?v=") || window.location.href.includes("/clip"); }
    function isAdPlaying() {
        if (document.querySelector("div.ad-showing")) return true;
        return false;
    }

    // PopUp Remover //
    let popUpInterval = undefined;
    let isPopupBeingProcessed = false;

    function removeFakeErrorScreen() { // "Ad blockers violate YouTube's Terms of Service" safari modal //
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
            bodyStyle.setProperty("overflow-y", "auto", "important");

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

                // Unpause video //
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
            const style = document.createElement("style");
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
                                element.style.display = "none";
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

        const findVideo = () => {
            let tempVideoElement = document.querySelector("video");
            if (tempVideoElement && (tempVideoElement.src || tempVideoElement.className.indexOf("stream") !== -1)) videoElement = tempVideoElement;

            let tempPlayerElement = document.querySelector("#player");
            if (tempPlayerElement && tempPlayerElement.className.indexOf("skeleton") === -1) playerElement = tempPlayerElement;
        };
        setTimeout(findVideo, 1);
        dataInterval = setInterval(findVideo, 100);
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
            if (videoElement.parentElement) {
                videoElement.parentElement.style.display = "none";
            } else {
                videoElement.style.display = "none";
            }

            // audio //
            videoElement.volume = 0; videoElement.muted = true;

            // time //
            if (videoLoaded === true && apiPlayer && apiPlayer.getPlayerState && isAdPlaying() !== true) {
                const state = apiPlayer.getPlayerState()
                if (state == window.YT.PlayerState.PLAYING) {
                    videoElement.currentTime = apiPlayer.getCurrentTime();
                    if (videoElement.paused) videoElement.play();

                } else if (state == window.YT.PlayerState.PAUSED) {
                    if (!videoElement.paused) videoElement.pause();

                } else if (state == window.YT.PlayerState.ENDED) {
                    // handle playing new videos since autoplay is disabled due to playlist fixes //
                    if (videoElement.paused) videoElement.play();
                }
            }

            // quality //
            if (qualitySet !== true) qualitySet = setToLowestQuality();
        };
        setTimeout(muteVideo, 1);
        muteInterval = setInterval(muteVideo, 500);
    }

    function videoAdBlocker(waitAMoment) {
        if (SETTINGS.adBlocker !== true) return;
        if (isShortsPage()) { log("Shorts found, ad block skipped..."); return; }
        if (!isVideoPage()) { log("Video page not found, ad block skipped..."); return; }

        currentUrl = window.location.href;
        log("Starting video ad block...");

        // Mute Main Video //
        if (adBlockInterval) clearInterval(adBlockInterval);
        log("Running mute handler..."); muteMainVideo();

        // Create API Script //
        if (apiScriptInserted !== true) {
            log("Inserting API..."); const tag = document.createElement("script"); tag.src = "https://www.youtube.com/iframe_api"; document.head.appendChild(tag);
            apiScriptInserted = true;
        }

        // Keybinds for IFrame //
        log("Creating keybind listener..."); document.addEventListener("keydown", (event) => {
            if (event.isComposing || event.keyCode === 229) return;
            if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA" || event.target.isContentEditable) return; // ignore input fields //

            // ignore keys when loading the player //
            const key = event.key.toLowerCase();
            if (key === "f") { event.preventDefault(); }; if (!customPlayer && (videoLoaded === true || customVideoInserted === true)) { event.preventDefault(); return; }

            // https://support.google.com/youtube/answer/7631406?hl=en //
            // You can load and unload captions only once so the "c" shortcut is not possible //
            // Certain stuff is ignored because it's not avalaible in the iframe //
            switch (key) {
                case "f":
                    event.preventDefault();
                    if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {
                        if (customPlayer.requestFullscreen) {
                            customPlayer.requestFullscreen();
                        } else if (customPlayer.webkitRequestFullscreen) {
                            customPlayer.webkitRequestFullscreen();
                        } else if (customPlayer.msRequestFullscreen) {
                            customPlayer.msRequestFullscreen();
                        }
                    } else {
                        if (document.exitFullscreen) {
                            document.exitFullscreen();
                        } else if (document.webkitExitFullscreen) {
                            document.webkitExitFullscreen();
                        } else if (document.msExitFullscreen) {
                            document.msExitFullscreen();
                        }
                    }
                    break;

                    // Play/Pause //
                case " ": case "k":
                    event.preventDefault();
                    apiPlayer.getPlayerState() === 1 ? apiPlayer.pauseVideo() : apiPlayer.playVideo();
                    break;

                    // Mute/unmute the video //
                case "m":
                    event.preventDefault();
                    apiPlayer.isMuted() ? apiPlayer.unMute() : apiPlayer.mute();
                    break;

                    // Seek backward/forward 5 seconds //
                case "arrowright":
                    event.preventDefault();
                    apiPlayer.seekTo(apiPlayer.getCurrentTime() + 5, true);
                    break;
                case "arrowleft":
                    event.preventDefault();
                    apiPlayer.seekTo(apiPlayer.getCurrentTime() - 5, true);
                    break;

                    // Increase/Decrease volume 5% //
                case "arrowup":
                    event.preventDefault();
                    apiPlayer.setVolume(apiPlayer.getVolume() + 5, true);
                    break;
                case "arrowdown":
                    event.preventDefault();
                    apiPlayer.setVolume(apiPlayer.getVolume() - 5, true);
                    break;

                    // Seek backward/forward 10 seconds //
                case "l":
                    event.preventDefault();
                    apiPlayer.seekTo(apiPlayer.getCurrentTime() + 10, true);
                    break;
                case "j":
                    event.preventDefault();
                    apiPlayer.seekTo(apiPlayer.getCurrentTime() - 10, true);
                    break;

                    // Seek to next/previous frame (60 fps) //
                case ".":
                    event.preventDefault();
                    apiPlayer.seekTo(apiPlayer.getCurrentTime() + (1 / 60));
                    break;
                case ",":
                    event.preventDefault();
                    apiPlayer.seekTo(apiPlayer.getCurrentTime() - (1 / 60));
                    break;

                    // Seek to 0% to 90% of the video //
                case "0": case "1": case "2": case "3": case "4": case "5": case "6": case "7": case "8": case "9":
                    event.preventDefault();
                    apiPlayer.seekTo(
                        ((parseInt(event.key) * 10) / 100) * apiPlayer.getDuration(), true
                    );
                    break;
            }
        });

        // Main Handler //
        log("Starting AD Block...");
        const createPlayerFunc = () => {
            if (customVideoInserted === true) return; // inserted //
            if (!videoElement || !playerElement) return; // invalid page //
            if (!window.YT) return; // missing API //

            // Reset players //
            log("Clearing duplicate players and muting main player...");
            clearAllPlayers(true);
            if (customPlayer) customPlayer.remove();
            if (apiPlayer) { apiPlayer.destroy(); apiPlayer = undefined; };

            // Get video details //
            const videoData = getYouTubeLinkData(window.location.href)
            if (videoData.ID == "") { log("Failed to fetch video ID.", "error"); return; }

            // Get saved timestamp //
            if (videoElement && videoElement.currentTime >= 10 && videoData.params.start === 0) { // 10+ seconds //
                videoData.params.start = parseInt(videoElement.currentTime.toString().split(".")[0]);
                log("Start time was set to the saved timestamp.", "success");
            }

            // Load //
            log("Video ID: " + videoData.ID);
            customVideoInserted = true;

            customPlayer = document.createElement("div"); // this will turn into an iframe //
            customPlayer.id = "customiframeplayer";
            customPlayer.style.width = "100%";
            customPlayer.style.height = "100%";
            customPlayer.style.position = "absolute";
            customPlayer.style.top = "0";
            customPlayer.style.left = "0";
            customPlayer.style.zIndex = "1000";
            customPlayer.style.pointerEvents = "all";

            try {
                log("Inserting Player...");
                playerElement.appendChild(customPlayer);
                apiPlayer = new window.YT.Player("customiframeplayer", {
                    host: "https://www.youtube-nocookie.com",

                    videoId: videoData.ID,
                    playerVars: videoData.params,

                    events: {
                        onReady: function(event) {
                            event.target.playVideo();
                            log("AdBlock player successfully loaded!", "success");
                            videoLoaded = true;

                            customPlayer = document.querySelector("#customiframeplayer");
                            customPlayer.allowFullscreen = true; // works for some browsers //
                            customPlayer.setAttribute('allowfullscreen', ''); // important for others //
                        }
                    }
                });

                // Change the interval time //
                clearInterval(adBlockInterval);
                adBlockInterval = setInterval(createPlayerFunc, 1500);
            } catch (error) {
                videoLoaded = true;

                const p = document.createElement("p");
                p.id = "errorcode";
                p.style.position = "relative";
                p.style.color = "white";
                p.style.fontSize = "large";
                p.style.textAlign = "center";
                p.style.zIndex = "9999";
                p.innerText = "Failed to load the video player, refreshing the page in 5 seconds...\n" + error.toString();

                playerElement.parentElement.parentElement.insertBefore(p, playerElement.parentElement.parentElement.firstChild);
                clearInterval(adBlockInterval);
                setTimeout(function() { window.location.reload(); }, 5000);
            }
        };
        adBlockInterval = setInterval(createPlayerFunc, waitAMoment === true ? 75 : 10);
    }

    // Timestamp fixer //
    function timestampFixer() {
        document.addEventListener("click", function(event) {
            if (!apiPlayer) return;

            const target = event.target;
            if (!(target.tagName === "A" && target.href)) return;
            if (!target.href.includes("/watch?v=")) return;

            const videoData = getYouTubeLinkData(target.href)
            if (videoData.ID == "") { log("Failed to fetch video ID.", "error"); return; }

            log("Seeking to timestamp...", "", videoData.params.start);
            apiPlayer.pauseVideo();
            apiPlayer.seekTo(videoData.params.start);
            apiPlayer.playVideo();
        });
    }

    log("Starting script...", "success");

    function startMain(waitAMoment) {
        if (isShortsPage()) return;

        runDataInterval(); // Video Data handler //

        setTimeout(popupRemover, 1);
        setTimeout(removePageAds, 1);

        timestampFixer(); // Comment timestamp fix //
        videoAdBlocker(waitAMoment); // Main AdBlock //
    }

    startMain();
    updateChecker();

    // URL update handler //
    let isHandlingChange = false;
    function handleUrlChange() {
        if (window.location.href === currentUrl || isHandlingChange) return;

        isHandlingChange = true;
        log("________________________")

        // reset all variables and intervals (and set currentUrl) //
        resetEverything();

        // restart all functions //
        clearAllPlayers(true);
        startMain(true);
        setTimeout(function() { isHandlingChange = false; }, 25);
    }

    // detect URL changes //
    const observer = new MutationObserver(handleUrlChange);
    observer.observe(document, { subtree: true, childList: true });
})();
