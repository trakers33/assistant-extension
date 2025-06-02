export default class FullCaptureManager {
    constructor() {
        this.videoTrack = null;
        this.audioSources = [];
        this.mixedAudioTrack = null;
        this.canvasStream = null;
        this.finalStream = null;
        this.mediaRecorder = null;
        this.audioContext = null;
        this.observer = null;
        this.audioTracks = [];
        this.layoutUpdateInterval = null;

        this.silenceThreshold = 0.0;
        this.silenceCheckInterval = null;

        this.videoTrackIdToSSRC = new Map();
    }

    addVideoTrack(trackEvent) {
        const firstStreamId = trackEvent.streams[0]?.id;
        const trackId = trackEvent.track?.id;

        this.videoTrackIdToSSRC.set(trackId, firstStreamId);
    }

    addAudioTrack(audioTrack) {
        this.audioTracks.push(audioTrack);
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
        return Array.from(videoElements)
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
                    videoElementsWithInfo.find(video => video.is_active_speaker) ||
                    videoElementsWithInfo.find(video => video.ssrc === this.lastMainParticipantVideoSsrc) ||
                    videoElementsWithInfo[0];
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

    async start() {
        // Find the main element that contains all the video elements
        const mainElement = document.querySelector('main');
        if (!mainElement) {
            console.error('No <main> element found in the DOM');
            return;
        }

        // Create a canvas element with dimensions of rendered frame
        const canvas = document.createElement('canvas');
        canvas.width = 1920;
        canvas.height = 1080;
        document.body.appendChild(canvas);

        const debugCanvas = false;
        if (debugCanvas) {
            canvas.style.position = 'fixed';
            canvas.style.top = '0';
            canvas.style.left = '0';
            canvas.style.zIndex = '9999';
            canvas.style.border = '2px solid red';
            canvas.style.opacity = '1.0';

            // Create toggle button for canvas visibility
            const toggleButton = document.createElement('button');
            toggleButton.textContent = 'Show Canvas';
            toggleButton.style.position = 'fixed';
            toggleButton.style.bottom = '20px';
            toggleButton.style.right = '20px';
            toggleButton.style.zIndex = '10000';
            toggleButton.style.padding = '8px 12px';
            toggleButton.style.backgroundColor = '#4285f4';
            toggleButton.style.color = 'white';
            toggleButton.style.border = 'none';
            toggleButton.style.borderRadius = '4px';
            toggleButton.style.cursor = 'pointer';
            toggleButton.style.fontFamily = 'Arial, sans-serif';

            // Toggle canvas visibility function
            toggleButton.addEventListener('click', () => {
                if (canvas.style.opacity === '0') {
                    canvas.style.opacity = '1.0';
                    toggleButton.textContent = 'Hide Canvas';
                } else {
                    canvas.style.opacity = '0';
                    toggleButton.textContent = 'Show Canvas';
                }
            });

            document.body.appendChild(toggleButton);
            this.toggleButton = toggleButton; // Store reference for cleanup
        }

        // Set up the canvas context for drawing
        const canvasContext = canvas.getContext('2d');

        // Using the contents of the main element, compute the layout of the frame we want to render
        let frameLayout = this.computeFrameLayout(mainElement);

        // Create a MutationObserver to watch for changes to the DOM
        this.observer = new MutationObserver(mutations => {
            // Update the frame layout when DOM changes
            frameLayout = this.computeFrameLayout(mainElement);
        });

        // Commented out mutation observer because we don't need it anymore
        // Just recomputing the layout every 500ms works good
        // Start observing the main element for changes which will trigger a recomputation of the frame layout
        // TODO: This observer fires whenever someone speaks. We should try to see if we can filter those out so it fires less often
        // because the computeFrameLayout is a relatively expensive operation
        /*
        this.observer.observe(mainElement, { 
            childList: true,      // Watch for added/removed nodes
            subtree: true,        // Watch all descendants
            attributes: false,    // Don't need to watch attributes
            characterData: false  // Don't need to watch text content
        });*/

        // Set up a timer to update the frame layout every 100
        this.layoutUpdateInterval = setInterval(() => {
            frameLayout = this.computeFrameLayout(mainElement);
        }, 100);

        // Create a drawing function that runs at 30fps
        const drawFrameLayoutToCanvas = () => {
            try {
                const hasMismatchOrInvisible = frameLayout.some(
                    ({ element, ssrc, videoWidth }) =>
                        (ssrc && ssrc !== this.getSSRCFromVideoElement(element)) ||
                        (videoWidth && videoWidth !== element.videoWidth) ||
                        !element.checkVisibility(),
                );

                if (hasMismatchOrInvisible) {
                    // Schedule the next frame and exit
                    this.animationFrameId = requestAnimationFrame(drawFrameLayoutToCanvas);
                    return;
                }

                // Clear the canvas with black background
                canvasContext.fillStyle = 'black';
                canvasContext.fillRect(0, 0, canvas.width, canvas.height);

                frameLayout.forEach(({ element, dst_rect, src_rect, label }) => {
                    if (src_rect) {
                        canvasContext.drawImage(
                            element,
                            src_rect.left,
                            src_rect.top,
                            src_rect.width,
                            src_rect.height,
                            dst_rect.left,
                            dst_rect.top,
                            dst_rect.width,
                            dst_rect.height,
                        );
                    } else {
                        canvasContext.drawImage(element, dst_rect.left, dst_rect.top, dst_rect.width, dst_rect.height);
                    }

                    if (label) {
                        canvasContext.fillStyle = 'white';
                        canvasContext.font = 'bold 16px Arial';
                        canvasContext.fillText(label, dst_rect.left + 16, dst_rect.top + dst_rect.height - 16);
                    }
                });

                // Schedule the next frame
                this.animationFrameId = requestAnimationFrame(drawFrameLayoutToCanvas);
            } catch (e) {
                console.error('Error drawing frame layout to canvas', e);
            }
        };

        // Start the drawing loop
        drawFrameLayoutToCanvas();

        // Capture the canvas stream at 30 fps
        const canvasStream = canvas.captureStream(30);
        const [videoTrack] = canvasStream.getVideoTracks();
        this.videoTrack = videoTrack;
        this.canvas = canvas; // Store canvas reference for cleanup

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

        this.finalStream = new MediaStream([this.videoTrack, this.mixedAudioTrack]);

        // Initialize MediaRecorder with the final stream
        this.startRecording();

        this.startSilenceDetection();
    }

    startSilenceDetection() {
        // Clear any existing interval
        if (this.silenceCheckInterval) {
            clearInterval(this.silenceCheckInterval);
        }

        // Check for audio activity every second
        this.silenceCheckInterval = setInterval(() => {
            this.checkAudioActivity();
        }, 1000);
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
        if (averageDeviation > this.silenceThreshold) {
            window.ws.sendJson({
                type: 'SilenceStatus',
                isSilent: false,
            });
        }
    }

    startRecording() {
        // Options for better quality
        const options = { mimeType: 'video/mp4' };
        this.mediaRecorder = new MediaRecorder(this.finalStream, options);

        this.mediaRecorder.ondataavailable = event => {
            if (event.data.size > 0) {
                console.log('ondataavailable', event.data.size);
                window.ws.sendEncodedMP4Chunk(event.data);
            }
        };

        this.mediaRecorder.onstop = () => {
            this.saveRecording();
        };

        // Start recording, collect data in chunks every 1 second
        this.mediaRecorder.start(1000);
        console.log('Recording started');
    }

    stopRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
            console.log('Recording stopped');
        }
    }

    stop() {
        this.stopRecording();

        // Clear silence detection interval
        if (this.silenceCheckInterval) {
            clearInterval(this.silenceCheckInterval);
            this.silenceCheckInterval = null;
        }

        // Clear layout update interval
        if (this.layoutUpdateInterval) {
            clearInterval(this.layoutUpdateInterval);
            this.layoutUpdateInterval = null;
        }

        // Cancel animation frame if it exists
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        // Disconnect the MutationObserver
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }

        // Remove canvas element if it exists
        if (this.canvas) {
            document.body.removeChild(this.canvas);
            this.canvas = null;
        }

        // Stop all tracks
        if (this.videoTrack) this.videoTrack.stop();
        if (this.mixedAudioTrack) this.mixedAudioTrack.stop();

        // Clean up
        this.videoTrack = null;
        this.mixedAudioTrack = null;
        this.finalStream = null;
        this.mediaRecorder = null;
    }
}
