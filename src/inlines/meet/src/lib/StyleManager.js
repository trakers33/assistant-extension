export default class StyleManager {
    constructor() {
        this.videoTrackIdToSSRC = new Map();
        this.videoElementToCaptureCanvasElements = new Map();
        this.captureCanvasVisible = true; // Track visibility state
        this.mainElement = null;
        this.misMatchTracker = new Map();

        this.audioContext = null;
        this.audioTracks = [];
        this.silenceThreshold = 0.0;
        this.silenceCheckInterval = null;
        this.memoryUsageCheckInterval = null;
    }

    addAudioTrack(audioTrack) {
        this.audioTracks.push(audioTrack);
    }

    checkAudioActivity() {
        // Get audio data
        this.analyser.getByteTimeDomainData(this.audioDataArray);

        // Calculate deviation from the center value (128)
        let sumDeviation = 0;
        for (let i = 0; i < this.audioDataArray.length; i++) {
            // Calculate how much each sample deviates from the center (128)
            sumDeviation += Math.abs(this.audioDataArray[i] - 128);
        }

        const averageDeviation = sumDeviation / this.audioDataArray.length;

        // If average deviation is above threshold, we have audio activity
        console.log('averageDeviation', averageDeviation);
        if (averageDeviation > this.silenceThreshold) {
            window.ws.sendJson({
                type: 'SilenceStatus',
                isSilent: false,
            });
        }
    }

    checkMemoryUsage() {
        // Useful for debugging memory usage
        window.ws.sendJson({
            type: 'MemoryUsage',
            memoryUsage: {
                jsHeapSizeLimit: performance.memory?.jsHeapSizeLimit,
                totalJSHeapSize: performance.memory?.totalJSHeapSize,
                usedJSHeapSize: performance.memory?.usedJSHeapSize,
            },
        });
    }

    startSilenceDetection() {
        // Set up audio context and processing as before
        this.audioContext = new AudioContext();

        this.audioSources = this.audioTracks.map(track => {
            const mediaStream = new MediaStream([track]);
            return this.audioContext.createMediaStreamSource(mediaStream);
        });

        // Create a destination node
        const destination = this.audioContext.createMediaStreamDestination();

        // Connect all sources to the destination
        this.audioSources.forEach(source => {
            source.connect(destination);
        });

        // Create analyzer and connect it to the destination
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        const bufferLength = this.analyser.frequencyBinCount;
        this.audioDataArray = new Uint8Array(bufferLength);

        // Create a source from the destination's stream and connect it to the analyzer
        const mixedSource = this.audioContext.createMediaStreamSource(destination.stream);
        mixedSource.connect(this.analyser);

        this.mixedAudioTrack = destination.stream.getAudioTracks()[0];

        // Clear any existing interval
        if (this.silenceCheckInterval) {
            clearInterval(this.silenceCheckInterval);
        }

        if (this.memoryUsageCheckInterval) {
            clearInterval(this.memoryUsageCheckInterval);
        }

        // Check for audio activity every second
        this.silenceCheckInterval = setInterval(() => {
            this.checkAudioActivity();
        }, 1000);

        // Check for memory usage every 60 seconds
        this.memoryUsageCheckInterval = setInterval(() => {
            this.checkMemoryUsage();
        }, 60000);
    }

    stop() {
        this.toggleCaptureCanvasVisibility();
    }

    start() {
        this.startSilenceDetection();

        console.log('Started StyleManager');
    }

    makeSureElementsAreInSync(frameLayout) {
        frameLayout.forEach(({ element, ssrc, videoWidth }) => {
            let captureCanvasElements = this.videoElementToCaptureCanvasElements.get(element);
            if (!captureCanvasElements) {
                return;
            }

            let misMatch = false;
            if (ssrc && ssrc !== this.getSSRCFromVideoElement(element)) {
                misMatch = true;
            }
            if (videoWidth && videoWidth !== element.videoWidth) {
                misMatch = true;
            }
            if (!element.checkVisibility()) {
                misMatch = true;
            }
            if (misMatch) {
                if (captureCanvasElements.captureCanvasVideoElement.style.display !== 'none') {
                    // use getclientrects to get the width and height of the container and the canvas
                    const containerRect = captureCanvasElements.captureCanvasContainerElement.getBoundingClientRect();
                    const canvasRect = captureCanvasElements.captureCanvasCanvasElement.getBoundingClientRect();

                    // Set canvas dimensions to match container
                    captureCanvasElements.captureCanvasCanvasElement.width = containerRect.width;
                    captureCanvasElements.captureCanvasCanvasElement.height = containerRect.height;

                    const ctx = captureCanvasElements.captureCanvasCanvasElement.getContext('2d');

                    // Calculate dimensions to maintain aspect ratio (objectFit: 'contain')
                    const videoElement = captureCanvasElements.captureCanvasVideoElement;
                    const videoAspect = videoElement.videoWidth / videoElement.videoHeight;
                    const containerAspect = containerRect.width / containerRect.height;

                    let drawWidth, drawHeight, drawX, drawY;

                    if (videoAspect > containerAspect) {
                        // Video is wider - fit to width
                        drawWidth = containerRect.width;
                        drawHeight = containerRect.width / videoAspect;
                        drawX = 0;
                        drawY = (containerRect.height - drawHeight) / 2;
                    } else {
                        // Video is taller - fit to height
                        drawHeight = containerRect.height;
                        drawWidth = containerRect.height * videoAspect;
                        drawX = (containerRect.width - drawWidth) / 2;
                        drawY = 0;
                    }

                    // Clear canvas and draw with proper dimensions
                    ctx.fillStyle = 'black';
                    ctx.fillRect(0, 0, containerRect.width, containerRect.height);
                    ctx.drawImage(videoElement, drawX, drawY, drawWidth, drawHeight);

                    captureCanvasElements.captureCanvasCanvasElement.style.display = '';
                }
                captureCanvasElements.captureCanvasVideoElement.style.display = 'none';
            } else {
                if (captureCanvasElements.captureCanvasVideoElement.style.display !== '') {
                    captureCanvasElements.captureCanvasCanvasElement.style.display = 'none';
                }
                captureCanvasElements.captureCanvasVideoElement.style.display = '';
            }
        });
    }

    handleKeyDown(event) {
        // Toggle canvas visibility when 's' key is pressed
        if (event.key === 's') {
            this.toggleCaptureCanvasVisibility();
        }
    }

    toggleCaptureCanvasVisibility() {
        if (this.captureCanvasVisible) {
            this.showAllNonCaptureCanvasElementsAndHideCaptureCanvas();
            this.captureCanvasVisible = false;
            console.log('Capture canvas hidden');
        } else {
            try {
                this.hideAllNonCaptureCanvasElements();
                this.captureCanvasVisible = true;
                console.log('Capture canvas shown');
            } catch (error) {
                console.error('Error showing capture canvas', error);
            }
        }
    }

    syncCaptureCanvasElements(frameLayout) {
        frameLayout.forEach(({ element, dst_rect, label }) => {
            let captureCanvasElements = this.videoElementToCaptureCanvasElements.get(element);
            if (!captureCanvasElements) {
                let captureCanvasContainerElement = document.createElement('div');
                captureCanvasContainerElement.style.position = 'absolute';
                captureCanvasContainerElement.style.padding = '0';
                captureCanvasContainerElement.style.margin = '0';
                captureCanvasContainerElement.style.border = 'none';
                captureCanvasContainerElement.style.outline = 'none';
                captureCanvasContainerElement.style.boxShadow = 'none';
                captureCanvasContainerElement.style.background = 'none';

                let captureCanvasVideoElement = document.createElement('video');
                captureCanvasVideoElement.srcObject = element.srcObject;
                captureCanvasVideoElement.autoplay = true;
                captureCanvasVideoElement.style.width = '100%';
                captureCanvasVideoElement.style.height = '100%';
                captureCanvasVideoElement.style.objectFit = 'contain';
                captureCanvasVideoElement.style.position = 'absolute';
                captureCanvasVideoElement.style.top = '0';
                captureCanvasVideoElement.style.left = '0';

                captureCanvasContainerElement.appendChild(captureCanvasVideoElement);

                let captureCanvasLabelElement = document.createElement('div');
                captureCanvasLabelElement.style.backgroundColor = 'rgba(0, 0, 0, 0.35)';
                captureCanvasLabelElement.style.color = 'white';
                captureCanvasLabelElement.style.fontSize = '14px';
                captureCanvasLabelElement.style.textAlign = 'left';
                captureCanvasLabelElement.style.lineHeight = '1.2';
                captureCanvasLabelElement.style.padding = '3px 5px';
                captureCanvasLabelElement.style.display = 'inline-block';
                captureCanvasLabelElement.style.position = 'absolute';
                captureCanvasLabelElement.style.bottom = '3px';
                captureCanvasLabelElement.style.left = '5px';
                captureCanvasLabelElement.style.zIndex = '10'; // Add this line to ensure label is above other elements
                captureCanvasLabelElement.textContent = label;
                captureCanvasContainerElement.appendChild(captureCanvasLabelElement);

                let captureCanvasCanvasElement = document.createElement('canvas');
                captureCanvasCanvasElement.style.width = '100%';
                captureCanvasCanvasElement.style.height = '100%';
                captureCanvasCanvasElement.style.position = 'absolute';
                captureCanvasCanvasElement.style.top = '0';
                captureCanvasCanvasElement.style.left = '0';
                captureCanvasCanvasElement.style.border = 'none';
                captureCanvasCanvasElement.style.display = 'none';
                captureCanvasContainerElement.appendChild(captureCanvasCanvasElement);

                this.captureCanvas.appendChild(captureCanvasContainerElement);
                captureCanvasElements = {
                    captureCanvasVideoElement,
                    captureCanvasLabelElement,
                    captureCanvasContainerElement,
                    captureCanvasCanvasElement,
                };
                this.videoElementToCaptureCanvasElements.set(element, captureCanvasElements);
            }

            if (captureCanvasElements.captureCanvasVideoElement.srcObject !== element.srcObject) {
                captureCanvasElements.captureCanvasVideoElement.srcObject = element.srcObject;
            }

            captureCanvasElements.captureCanvasContainerElement.style.left = `${Math.round(dst_rect.left)}px`;
            captureCanvasElements.captureCanvasContainerElement.style.top = `${Math.round(dst_rect.top)}px`;
            captureCanvasElements.captureCanvasContainerElement.style.width = `${Math.round(dst_rect.width)}px`;
            captureCanvasElements.captureCanvasContainerElement.style.height = `${Math.round(dst_rect.height)}px`;
        });

        // For each element in videoElementToCaptureCanvasElements that was not in the frameLayout, remove it
        this.videoElementToCaptureCanvasElements.forEach((captureCanvasElements, videoElement) => {
            if (!frameLayout.some(frameLayoutElement => frameLayoutElement.element === videoElement)) {
                // remove after a 16 ms timeout to eliminate flicker
                setTimeout(() => {
                    this.captureCanvas.removeChild(captureCanvasElements.captureCanvasContainerElement);
                    this.videoElementToCaptureCanvasElements.delete(videoElement);
                }, 16);
            }
        });
    }

    addVideoTrack(trackEvent) {
        const firstStreamId = trackEvent.streams[0]?.id;
        const trackId = trackEvent.track?.id;

        this.videoTrackIdToSSRC.set(trackId, firstStreamId);
    }

    createCaptureCanvas() {
        const canvas = document.createElement('div');
        canvas.classList.add('captureCanvas');
        canvas.style.width = '1920px';
        canvas.style.height = '1080px';
        canvas.style.backgroundColor = 'black';
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        //canvas.style.zIndex = '9999';
        document.body.appendChild(canvas);
        return canvas;
    }

    hideAllNonCaptureCanvasElements() {
        if (this.captureCanvas) {
            this.captureCanvas.style.visibility = 'visible';
        }

        const style = document.createElement('style');
        style.textContent = `
        /* First, hide everything */
        body * {
          visibility: hidden !important;
        }
        
        /* Then, show only elements with captureCanvas class */
        body .captureCanvas,
        body .captureCanvas * {
          visibility: visible !important;
        }
        
        /* Make sure parent containers of captureCanvas elements are visible too */
        body .captureCanvas,
        body .captureCanvas *,
        body .captureCanvas:hover,
        body .captureCanvas:focus {
          visibility: visible !important;
          opacity: 1 !important;
        }
        `;
        document.head.appendChild(style);
        this.currentStyleElement = style;
    }

    showAllNonCaptureCanvasElementsAndHideCaptureCanvas() {
        if (this.currentStyleElement) {
            document.head.removeChild(this.currentStyleElement);
        }

        // Hide the capture canvas
        this.captureCanvas.style.visibility = 'hidden';
    }

    getActiveSpeakerElementsWithInfo(mainElement) {
        const activeSpeakerElements = mainElement.querySelectorAll('div.tC2Wod.kssMZb');

        return Array.from(activeSpeakerElements)
            .map(element => {
                const participantElement = element.closest('[data-participant-id]');
                const participantId = participantElement
                    ? participantElement.getAttribute('data-participant-id')
                    : null;

                return {
                    element: element,
                    bounding_rect: element.getBoundingClientRect(),
                    participant_id: participantId,
                };
            })
            .filter(
                element =>
                    element.bounding_rect.width > 0 && element.bounding_rect.height > 0 && element.participant_id,
            );
    }

    getSSRCFromVideoElement(videoElement) {
        const track_id = videoElement.srcObject?.getTracks().find(track => track.kind === 'video')?.id;
        return this.videoTrackIdToSSRC.get(track_id);
    }

    getVideoElementsWithInfo(mainElement, activeSpeakerElementsWithInfo) {
        const videoElements = mainElement.querySelectorAll('video');
        const results = Array.from(videoElements)
            .map(video => {
                // Get the parent element to extract SSRC
                const containerElement = video.closest('.LBDzPb');
                const bounding_rect = video.getBoundingClientRect();
                const container_bounding_rect = containerElement.getBoundingClientRect();
                const clip_rect = {
                    top: container_bounding_rect.top - bounding_rect.top,
                    left: container_bounding_rect.left - bounding_rect.left,
                    right: container_bounding_rect.right - bounding_rect.top,
                    bottom: container_bounding_rect.bottom - bounding_rect.left,
                    width: container_bounding_rect.width,
                    height: container_bounding_rect.height,
                };
                const ssrc = this.getSSRCFromVideoElement(video);
                const user = window.userManager.getUserByStreamId(ssrc);
                return {
                    element: video,
                    bounding_rect: bounding_rect,
                    container_bounding_rect: container_bounding_rect,
                    clip_rect: clip_rect,
                    ssrc: ssrc,
                    user: user,
                    is_screen_share: Boolean(user?.parentDeviceId),
                    is_active_speaker: activeSpeakerElementsWithInfo?.[0]?.participant_id === user?.deviceId,
                };
            })
            .filter(
                video =>
                    video.ssrc &&
                    video.user &&
                    !video.paused &&
                    video.bounding_rect.width > 0 &&
                    video.bounding_rect.height > 0,
            );
        const largestContainerBoundingRectArea = results.reduce((max, video) => {
            return Math.max(max, video.container_bounding_rect.width * video.container_bounding_rect.height);
        }, 0);
        return results.map(video => {
            return {
                ...video,
                is_largest:
                    video.container_bounding_rect.width * video.container_bounding_rect.height ===
                    largestContainerBoundingRectArea,
            };
        });
    }

    computeFrameLayout(mainElement) {
        const activeSpeakerElementsWithInfo = this.getActiveSpeakerElementsWithInfo(mainElement);
        const videoElementsWithInfo = this.getVideoElementsWithInfo(mainElement, activeSpeakerElementsWithInfo);

        const layoutElements = [];

        if (window.initialData.recordingView === 'speaker_view') {
            const screenShareVideo = videoElementsWithInfo.find(video => video.is_screen_share);
            if (screenShareVideo) {
                layoutElements.push({
                    element: screenShareVideo.element,
                    dst_rect: screenShareVideo.bounding_rect,
                    ssrc: screenShareVideo.ssrc,
                });
                const activeSpeakerVideo = videoElementsWithInfo.find(video => video.is_active_speaker);
                if (activeSpeakerVideo) {
                    // Calculate position in upper right corner of screen share
                    const x = screenShareVideo.bounding_rect.right - activeSpeakerVideo.bounding_rect.width;
                    const y = screenShareVideo.bounding_rect.top;

                    layoutElements.push({
                        element: activeSpeakerVideo.element,
                        dst_rect: {
                            left: x,
                            top: y,
                            width: activeSpeakerVideo.bounding_rect.width,
                            height: activeSpeakerVideo.bounding_rect.height,
                        },
                        label: activeSpeakerVideo.user?.fullName || activeSpeakerVideo.user?.displayName,
                        ssrc: activeSpeakerVideo.ssrc,
                    });
                }
            } else {
                const mainParticipantVideo =
                    videoElementsWithInfo.find(video => video.is_largest) || videoElementsWithInfo[0];
                this.lastMainParticipantVideoSsrc = mainParticipantVideo?.ssrc;
                if (mainParticipantVideo) {
                    layoutElements.push({
                        element: mainParticipantVideo.element,
                        dst_rect: mainParticipantVideo.bounding_rect,
                        label: mainParticipantVideo.user?.fullName || mainParticipantVideo.user?.displayName,
                        ssrc: mainParticipantVideo.ssrc,
                    });
                }
            }

            return this.scaleLayoutToCanvasWithLetterBoxing(layoutElements);
        }

        if (window.initialData.recordingView === 'gallery_view') {
            const videoElementsFiltered = videoElementsWithInfo.filter(video => !video.is_screen_share);

            const ssrcsInCurrentFrame = videoElementsFiltered.map(video => video.ssrc);
            const ssrcsInCurrentFrameSet = new Set(ssrcsInCurrentFrame);
            this.ssrcsInLastFrame = this.ssrcsInLastFrame || [];
            this.ssrcsOrder = this.ssrcsOrder || [];

            // Remove ssrcs that are not in the current frame
            this.ssrcsOrder = this.ssrcsOrder.filter(ssrc => ssrcsInCurrentFrameSet.has(ssrc));
            // Add ssrcs that are in the current frame but are not in ssrcsOrder
            const ssrcsOrderSet = new Set(this.ssrcsOrder);
            this.ssrcsOrder.push(...ssrcsInCurrentFrame.filter(ssrc => !ssrcsOrderSet.has(ssrc)));

            const numCols = Math.ceil(Math.sqrt(this.ssrcsOrder.length));
            const cellWidth = 1920 / numCols;
            const cellHeight = 1080 / numCols;

            const ssrcToVideoElement = new Map(videoElementsFiltered.map(video => [video.ssrc, video]));

            let galleryLayoutElements = [];
            this.ssrcsOrder.forEach((ssrc, index) => {
                const video = ssrcToVideoElement.get(ssrc);
                if (!video) {
                    console.error('Video element not found for ssrc', ssrc);
                    return;
                }

                const videoWidth = video.element.videoWidth;
                const videoHeight = video.element.videoHeight;
                const videoAspect = videoWidth / videoHeight;
                const cellAspect = (cellWidth - 10) / (cellHeight - 10);

                let cropX, cropY, cropWidth, cropHeight;

                // Determine crop dimensions to match cell aspect ratio
                if (videoAspect > cellAspect) {
                    // Video is wider than cell - crop width
                    cropHeight = videoHeight;
                    cropWidth = videoHeight * cellAspect;
                } else {
                    // Video is taller than cell - crop height
                    cropWidth = videoWidth;
                    cropHeight = videoWidth / cellAspect;
                }

                cropX = (videoWidth - cropWidth) / 2;
                cropY = (videoHeight - cropHeight) / 2;

                galleryLayoutElements.push({
                    element: video.element,
                    src_rect: {
                        left: cropX,
                        top: cropY,
                        width: cropWidth,
                        height: cropHeight,
                    },
                    dst_rect: {
                        left: (index % numCols) * cellWidth + 5,
                        top: Math.floor(index / numCols) * cellHeight + 5,
                        width: cellWidth - 10,
                        height: cellHeight - 10,
                    },
                    label: video.user?.fullName || video.user?.displayName,
                    videoWidth: videoWidth,
                    ssrc: video.ssrc,
                });
            });

            this.ssrcsInLastFrame = ssrcsInCurrentFrame;

            return this.scaleLayoutToCanvasWithLetterBoxing(galleryLayoutElements);
        }

        return layoutElements;
    }

    scaleLayoutToCanvasWithLetterBoxing(layoutElements) {
        if (layoutElements.length === 0) {
            return layoutElements;
        }

        const canvasWidth = 1920;
        const canvasHeight = 1080;
        let minX = Infinity;
        let minY = Infinity;
        let maxX = 0;
        let maxY = 0;

        // Find active videos and determine the bounding box
        layoutElements.forEach(({ element, dst_rect }) => {
            if (element.videoWidth > 0 && element.videoHeight > 0) {
                minX = Math.min(minX, dst_rect.left);
                minY = Math.min(minY, dst_rect.top);
                maxX = Math.max(maxX, dst_rect.left + dst_rect.width);
                maxY = Math.max(maxY, dst_rect.top + dst_rect.height);
            }
        });

        const boundingWidth = maxX - minX;
        const boundingHeight = maxY - minY;

        // Calculate aspect ratios
        const inputAspect = boundingWidth / boundingHeight;
        const outputAspect = canvasWidth / canvasHeight;
        let scaledWidth, scaledHeight, offsetX, offsetY;

        if (Math.abs(inputAspect - outputAspect) < 1e-2) {
            // Same aspect ratio, use full canvas
            scaledWidth = canvasWidth;
            scaledHeight = canvasHeight;
            offsetX = 0;
            offsetY = 0;
        } else if (inputAspect > outputAspect) {
            // Input is wider, fit to width with letterboxing
            scaledWidth = canvasWidth;
            scaledHeight = canvasWidth / inputAspect;
            offsetX = 0;
            offsetY = (canvasHeight - scaledHeight) / 2;
        } else {
            // Input is taller, fit to height with pillarboxing
            scaledHeight = canvasHeight;
            scaledWidth = canvasHeight * inputAspect;
            offsetX = (canvasWidth - scaledWidth) / 2;
            offsetY = 0;
        }

        return layoutElements.map(layoutElement => {
            const dst_rect = layoutElement.dst_rect;
            const relativeX = (dst_rect.left - minX) / boundingWidth;
            const relativeY = (dst_rect.top - minY) / boundingHeight;
            const relativeWidth = dst_rect.width / boundingWidth;
            const relativeHeight = dst_rect.height / boundingHeight;

            const dst_rect_transformed = {
                left: offsetX + relativeX * scaledWidth,
                top: offsetY + relativeY * scaledHeight,
                width: relativeWidth * scaledWidth,
                height: relativeHeight * scaledHeight,
            };

            return {
                ...layoutElement,
                dst_rect: dst_rect_transformed,
            };
        });
    }
}
