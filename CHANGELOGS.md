## v2.1.1
   - For 5 seconds on the first AD will only be muted due to YouTube video player being deleted if its hidden or its playback rate is higher than 1

## v2.1.0:
   - Added and option "hideAd" that will show a black screen instead of the AD (good if you don't want to see slop AI brainrot ADs)

## v2.0.9:
   - Removed AdBlocker
   - Added Ad FastForward

## v2.0.8:
   - Fixed some issues with the new initialization system

## v2.0.7:
   - Improved custom video player initialization
   - Added an fallback for muting the main video player

## v2.0.5:
   - Bug fixes

## v2.0.4:
   - The old video current time is not applied anymore to the new video
     
## v2.0.3:
   - Refactored the URL handler

## v2.0.2:
   - Added fullscreen keybind
   - Added an error handler for loading the video
   - customPlayer variable refreshes to the new iframe

## v2.0.1:
   - Fixed saved timestamp getting overwritten by ADs or the new main player handler

## v2.0.0:
   - Faster load time
   - Switched to YouTube IFrame API
   - Added support for keybind shortcuts outside of the iframe focus (most of them)
   - The saved timestamp is more accurate (the video will not show as fully played in your history if you paused the video for a longer time)
   - Better playlist handling
   - Disabled ADBlock in external IFrames outside of youtube.com
