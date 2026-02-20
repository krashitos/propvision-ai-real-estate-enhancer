document.addEventListener('DOMContentLoaded', () => {
    // === Element References ===
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');
    const imagePreview = document.getElementById('image-preview');
    const previewImg = document.getElementById('preview-img');
    const removeBtn = document.getElementById('remove-btn');
    const enhanceActions = document.getElementById('enhance-actions');
    const analyzeBtn = document.getElementById('analyze-btn');
    const analyzeSpinner = document.getElementById('analyze-spinner');
    const analysisResults = document.getElementById('analysis-results');
    const qualityBadge = document.getElementById('quality-badge');
    const issuesList = document.getElementById('issues-list');
    const suggestionLighting = document.getElementById('suggestion-lighting');
    const suggestionRemoval = document.getElementById('suggestion-removal');
    const suggestionStaging = document.getElementById('suggestion-staging');
    const generateEnhancedBtn = document.getElementById('generate-enhanced-btn');
    const enhanceSpinner = document.getElementById('enhance-spinner');
    const enhancedResult = document.getElementById('enhanced-result');
    const beforeImage = document.getElementById('before-image');
    const afterImage = document.getElementById('after-image');
    const afterClip = document.getElementById('after-clip');
    const comparisonSlider = document.getElementById('comparison-slider');
    const comparisonContainer = document.getElementById('comparison-container');
    const downloadBtn = document.getElementById('download-btn');
    const roomType = document.getElementById('room-type');
    const designStyle = document.getElementById('design-style');
    const stageBtn = document.getElementById('stage-btn');
    const stageSpinner = document.getElementById('stage-spinner');
    const stagingResult = document.getElementById('staging-result');
    const stagedImage = document.getElementById('staged-image');
    const stagedMeta = document.getElementById('staged-meta');
    const downloadStagedBtn = document.getElementById('download-staged-btn');
    const regenerateBtn = document.getElementById('regenerate-btn');

    let currentFile = null;
    let analysisData = null;

    // === Tab Navigation ===
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.tab;
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`content-${target}`).classList.add('active');
        });
    });

    // === File Upload ===
    uploadZone.addEventListener('click', () => fileInput.click());

    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('drag-over');
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('drag-over');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type.startsWith('image/')) {
            handleFile(files[0]);
        }
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            handleFile(fileInput.files[0]);
        }
    });

    function handleFile(file) {
        currentFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            previewImg.src = e.target.result;
            uploadZone.style.display = 'none';
            imagePreview.style.display = 'block';
            enhanceActions.style.display = 'flex';
            // Reset previous results
            analysisResults.style.display = 'none';
            enhancedResult.style.display = 'none';
            analysisData = null;
        };
        reader.readAsDataURL(file);
    }

    removeBtn.addEventListener('click', () => {
        currentFile = null;
        fileInput.value = '';
        uploadZone.style.display = 'flex';
        imagePreview.style.display = 'none';
        enhanceActions.style.display = 'none';
        analysisResults.style.display = 'none';
        enhancedResult.style.display = 'none';
        analysisData = null;
    });

    // === Analyze Image ===
    function setButtonLoading(button, spinner, loading) {
        button.disabled = loading;
        const btnText = button.querySelector('.btn-text');
        spinner.style.display = loading ? 'block' : 'none';
        if (btnText) btnText.style.display = loading ? 'none' : 'inline-flex';
    }

    function showLoadingOverlay(message) {
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.id = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-ring"></div>
            <p>${message}</p>
        `;
        document.body.appendChild(overlay);
    }

    function hideLoadingOverlay() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.remove();
    }

    analyzeBtn.addEventListener('click', async () => {
        if (!currentFile) return;

        setButtonLoading(analyzeBtn, analyzeSpinner, true);
        showLoadingOverlay('Analyzing your property image with AI...');

        try {
            const formData = new FormData();
            formData.append('image', currentFile);

            const response = await fetch('/api/analyze', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (response.ok) {
                analysisData = data;
                displayAnalysis(data);
            } else {
                throw new Error(data.detail || 'Analysis failed');
            }
        } catch (error) {
            console.error('Analysis error:', error);
            alert('Error analyzing image: ' + error.message);
        } finally {
            setButtonLoading(analyzeBtn, analyzeSpinner, false);
            hideLoadingOverlay();
        }
    });

    function displayAnalysis(data) {
        // Quality score
        const score = data.quality_score || 50;
        qualityBadge.textContent = `Quality: ${score}/100`;
        qualityBadge.className = 'quality-badge';
        if (score < 40) qualityBadge.classList.add('low');
        else if (score < 70) qualityBadge.classList.add('medium');

        // Issues
        issuesList.innerHTML = '';
        (data.issues || []).forEach(issue => {
            const li = document.createElement('li');
            li.textContent = issue;
            issuesList.appendChild(li);
        });

        // Suggestions
        const suggestions = data.suggestions || {};
        suggestionLighting.textContent = suggestions.lighting || 'No specific recommendation';
        suggestionRemoval.textContent = suggestions.removal || 'No specific recommendation';
        suggestionStaging.textContent = suggestions.staging || 'No specific recommendation';

        analysisResults.style.display = 'block';
        analysisResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // === Generate Enhanced Image ===
    generateEnhancedBtn.addEventListener('click', async () => {
        if (!analysisData || !analysisData.enhance_prompt) {
            alert('Please analyze the image first');
            return;
        }

        setButtonLoading(generateEnhancedBtn, enhanceSpinner, true);
        showLoadingOverlay('Generating enhanced property image...');

        try {
            const response = await fetch('/api/enhance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: analysisData.enhance_prompt,
                    width: 1024,
                    height: 768,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                // Set before/after images
                beforeImage.src = previewImg.src;
                afterImage.src = data.image_url;

                // Wait for after image to load
                afterImage.onload = () => {
                    hideLoadingOverlay();
                    enhancedResult.style.display = 'block';
                    downloadBtn.href = data.image_url;
                    enhancedResult.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    initComparisonSlider();
                };

                afterImage.onerror = () => {
                    hideLoadingOverlay();
                    alert('Failed to load the enhanced image. Please try again.');
                    setButtonLoading(generateEnhancedBtn, enhanceSpinner, false);
                };
            } else {
                throw new Error(data.detail || 'Enhancement failed');
            }
        } catch (error) {
            console.error('Enhance error:', error);
            hideLoadingOverlay();
            alert('Error generating enhanced image: ' + error.message);
        } finally {
            setButtonLoading(generateEnhancedBtn, enhanceSpinner, false);
        }
    });

    // === Comparison Slider ===
    function initComparisonSlider() {
        const wrapper = document.querySelector('.comparison-wrapper');
        if (!wrapper) return;

        let isDragging = false;

        function updateSlider(x) {
            const rect = wrapper.getBoundingClientRect();
            let pos = (x - rect.left) / rect.width;
            pos = Math.max(0.05, Math.min(0.95, pos));
            const pct = pos * 100;
            afterClip.style.clipPath = `inset(0 0 0 ${pct}%)`;
            comparisonSlider.style.left = `${pct}%`;
        }

        wrapper.addEventListener('mousedown', (e) => {
            isDragging = true;
            updateSlider(e.clientX);
        });

        window.addEventListener('mousemove', (e) => {
            if (isDragging) updateSlider(e.clientX);
        });

        window.addEventListener('mouseup', () => {
            isDragging = false;
        });

        // Touch support
        wrapper.addEventListener('touchstart', (e) => {
            isDragging = true;
            updateSlider(e.touches[0].clientX);
        });

        wrapper.addEventListener('touchmove', (e) => {
            if (isDragging) {
                e.preventDefault();
                updateSlider(e.touches[0].clientX);
            }
        });

        wrapper.addEventListener('touchend', () => {
            isDragging = false;
        });
    }

    // === Virtual Staging ===
    stageBtn.addEventListener('click', async () => {
        setButtonLoading(stageBtn, stageSpinner, true);
        showLoadingOverlay('Generating virtually staged room...');

        try {
            const response = await fetch('/api/stage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    room_type: roomType.value,
                    style: designStyle.value,
                    width: 1024,
                    height: 768,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                stagedImage.src = data.image_url;

                stagedImage.onload = () => {
                    hideLoadingOverlay();
                    stagedMeta.textContent = `${data.room_type} \u00b7 ${data.style} style`;
                    stagingResult.style.display = 'block';
                    downloadStagedBtn.href = data.image_url;
                    stagingResult.scrollIntoView({ behavior: 'smooth', block: 'start' });
                };

                stagedImage.onerror = () => {
                    hideLoadingOverlay();
                    alert('Failed to load the staged image. Please try again.');
                    setButtonLoading(stageBtn, stageSpinner, false);
                };
            } else {
                throw new Error(data.detail || 'Staging failed');
            }
        } catch (error) {
            console.error('Staging error:', error);
            hideLoadingOverlay();
            alert('Error generating staged room: ' + error.message);
        } finally {
            setButtonLoading(stageBtn, stageSpinner, false);
        }
    });

    regenerateBtn.addEventListener('click', () => {
        stagingResult.style.display = 'none';
        stageBtn.click();
    });
});
