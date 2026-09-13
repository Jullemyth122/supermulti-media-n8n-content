/**
 * ScatterFlow Studio - Professional Multi-Media Social Dispatcher
 * Native SVG icons, clean light-mode telemetry, and robust n8n multipart/form-data upload.
 */

(function () {
  'use strict';

  // --- Global State ---
  const state = {
    webhookUrl: localStorage.getItem('n8n_social_webhook_url') || '',
    selectedPlatforms: ['tiktok', 'instagram', 'youtube'],
    postType: 'video', // 'video', 'image', 'carousel', 'text'
    files: [], // Array of { file, previewUrl, type, name, sizeFormatted }
    tags: ['automation', 'contentcreation', 'workflows', 'productivity'],
    scheduleType: 'now', // 'now', 'scheduled'
    lastResponse: null,
    history: JSON.parse(localStorage.getItem('n8n_social_history') || '[]')
  };

  // --- SVG Icons Map ---
  const ICONS = {
    check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    alert: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`,
    close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
    send: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>`,
    spinner: `<svg style="animation: spin 1s linear infinite; width:18px; height:18px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="12"></circle></svg>`,
    video: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>`,
    file: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>`
  };

  // --- DOM Elements ---
  const webhookToggleBtn = document.getElementById('webhookToggleBtn');
  const webhookBody = document.getElementById('webhookBody');
  const webhookUrlInput = document.getElementById('webhookUrlInput');
  const saveWebhookBtn = document.getElementById('saveWebhookBtn');
  const testWebhookBtn = document.getElementById('testWebhookBtn');
  const webhookPreviewText = document.getElementById('webhookPreviewText');
  const statusLabel = document.getElementById('statusLabel');
  const connectionStatus = document.getElementById('connectionStatus');

  const platformChips = document.querySelectorAll('.platform-chip');
  const selectAllPlatformsBtn = document.getElementById('selectAllPlatformsBtn');
  const clearAllPlatformsBtn = document.getElementById('clearAllPlatformsBtn');

  const formatButtons = document.querySelectorAll('.format-btn');
  const postTitleInput = document.getElementById('postTitleInput');
  const postDescInput = document.getElementById('postDescInput');
  const charCountEl = document.getElementById('charCount');
  const ctaLinkInput = document.getElementById('ctaLinkInput');
  const scheduleTypeSelect = document.getElementById('scheduleTypeSelect');
  const scheduleDatetimeGroup = document.getElementById('scheduleDatetimeGroup');
  const scheduleDatetimeInput = document.getElementById('scheduleDatetimeInput');
  const n8nPromptInput = document.getElementById('n8nPromptInput');

  const tagsContainer = document.getElementById('tagsContainer');
  const tagInputField = document.getElementById('tagInputField');

  const dropzone = document.getElementById('dropzone');
  const dropzoneTitle = document.getElementById('dropzoneTitle');
  const dropzoneDesc = document.getElementById('dropzoneDesc');
  const formatMismatchWarning = document.getElementById('formatMismatchWarning');
  const fileInput = document.getElementById('fileInput');
  const mediaPreviewGrid = document.getElementById('mediaPreviewGrid');

  const uploadProgressContainer = document.getElementById('uploadProgressContainer');
  const progressText = document.getElementById('progressText');
  const progressPercent = document.getElementById('progressPercent');
  const progressBarFill = document.getElementById('progressBarFill');

  const dispatchForm = document.getElementById('dispatchForm');
  const submitBtn = document.getElementById('submitBtn');

  // Sidebar Preview Elements
  const mockupPlatformTag = document.getElementById('mockupPlatformTag');
  const mockupMediaViewport = document.getElementById('mockupMediaViewport');
  const mockupTitle = document.getElementById('mockupTitle');
  const mockupDesc = document.getElementById('mockupDesc');
  const mockupTags = document.getElementById('mockupTags');

  // Sidebar Tabs & Inspector
  const tabMockupBtn = document.getElementById('tabMockupBtn');
  const tabPayloadBtn = document.getElementById('tabPayloadBtn');
  const tabHistoryBtn = document.getElementById('tabHistoryBtn');
  const previewTabContent = document.getElementById('previewTabContent');
  const payloadTabContent = document.getElementById('payloadTabContent');
  const historyTabContent = document.getElementById('historyTabContent');
  const jsonPayloadViewer = document.getElementById('jsonPayloadViewer');
  const jsonResponseViewer = document.getElementById('jsonResponseViewer');
  const historyList = document.getElementById('historyList');

  // Toast
  const toastNotification = document.getElementById('toastNotification');
  const toastIcon = document.getElementById('toastIcon');
  const toastMessage = document.getElementById('toastMessage');

  // Inject spinner keyframe style into DOM
  const styleEl = document.createElement('style');
  styleEl.textContent = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
  document.head.appendChild(styleEl);

  // --- Initial Setup ---
  function init() {
    if (state.webhookUrl) {
      webhookUrlInput.value = state.webhookUrl;
      webhookPreviewText.textContent = state.webhookUrl;
      updateConnectionStatus(true);
    } else {
      webhookPreviewText.textContent = 'Not configured yet';
      updateConnectionStatus(false);
    }

    renderTags();
    updatePlatformChipsUI();
    renderHistory();

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    scheduleDatetimeInput.value = tomorrow.toISOString().slice(0, 16);

    updateLivePreview();
    updatePayloadPreview();
    setPostFormat(state.postType);
    bindEvents();
    startCallbackPolling();
  }

  // --- Event Bindings ---
  function bindEvents() {
    webhookToggleBtn.addEventListener('click', () => {
      webhookBody.classList.toggle('hidden');
    });

    const webhookBarHeader = document.querySelector('.webhook-bar-header');
    if (webhookBarHeader) {
      webhookBarHeader.addEventListener('click', (e) => {
        if (!e.target.closest('input') && !e.target.closest('button')) {
          webhookBody.classList.toggle('hidden');
        }
      });
    }

    webhookUrlInput.addEventListener('input', () => {
      const url = webhookUrlInput.value.trim();
      state.webhookUrl = url;
      localStorage.setItem('n8n_social_webhook_url', url);
      webhookPreviewText.textContent = url || 'Not configured yet';
      updateConnectionStatus(!!url);
    });

    saveWebhookBtn.addEventListener('click', () => {
      const url = webhookUrlInput.value.trim();
      state.webhookUrl = url;
      localStorage.setItem('n8n_social_webhook_url', url);
      webhookPreviewText.textContent = url || 'Not configured yet';
      updateConnectionStatus(!!url);
      showToast('n8n Webhook Endpoint saved.', 'success');
      webhookBody.classList.add('hidden');
    });

    testWebhookBtn.addEventListener('click', testWebhookPing);

    platformChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const platform = chip.dataset.platform;
        if (state.selectedPlatforms.includes(platform)) {
          state.selectedPlatforms = state.selectedPlatforms.filter((p) => p !== platform);
        } else {
          state.selectedPlatforms.push(platform);
        }
        updatePlatformChipsUI();
        updateLivePreview();
        updatePayloadPreview();
      });
    });

    selectAllPlatformsBtn.addEventListener('click', () => {
      state.selectedPlatforms = Array.from(platformChips).map((c) => c.dataset.platform);
      updatePlatformChipsUI();
      updateLivePreview();
      updatePayloadPreview();
    });

    clearAllPlatformsBtn.addEventListener('click', () => {
      state.selectedPlatforms = [];
      updatePlatformChipsUI();
      updateLivePreview();
      updatePayloadPreview();
    });

    formatButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        setPostFormat(btn.dataset.format);
      });
    });

    postTitleInput.addEventListener('input', () => {
      updateLivePreview();
      updatePayloadPreview();
    });

    postDescInput.addEventListener('input', () => {
      charCountEl.textContent = `${postDescInput.value.length} chars`;
      updateLivePreview();
      updatePayloadPreview();
    });

    ctaLinkInput.addEventListener('input', updatePayloadPreview);
    n8nPromptInput.addEventListener('input', updatePayloadPreview);

    scheduleTypeSelect.addEventListener('change', () => {
      state.scheduleType = scheduleTypeSelect.value;
      scheduleDatetimeGroup.style.display = state.scheduleType === 'scheduled' ? 'block' : 'none';
      updatePayloadPreview();
    });

    scheduleDatetimeInput.addEventListener('change', updatePayloadPreview);

    tagInputField.addEventListener('keydown', handleTagInputKeydown);
    tagsContainer.addEventListener('click', () => tagInputField.focus());

    // Dropzone
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('drag-over');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('drag-over');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('drag-over');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFilesSelected(e.dataTransfer.files);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFilesSelected(e.target.files);
      }
    });

    // Sidebar navigation
    tabMockupBtn.addEventListener('click', () => switchSidebarTab('mockup'));
    tabPayloadBtn.addEventListener('click', () => switchSidebarTab('payload'));
    tabHistoryBtn.addEventListener('click', () => switchSidebarTab('history'));

    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    if (clearHistoryBtn) {
      clearHistoryBtn.addEventListener('click', handleClearHistory);
    }

    dispatchForm.addEventListener('submit', handleFormSubmit);
  }

  // --- Platform Chips UI ---
  function updatePlatformChipsUI() {
    platformChips.forEach((chip) => {
      const p = chip.dataset.platform;
      if (state.selectedPlatforms.includes(p)) {
        chip.classList.add('selected');
      } else {
        chip.classList.remove('selected');
      }
    });
  }

  // --- Tags Management ---
  function renderTags() {
    const existing = tagsContainer.querySelectorAll('.tag-badge');
    existing.forEach((el) => el.remove());

    state.tags.forEach((tag, idx) => {
      const badge = document.createElement('span');
      badge.className = 'tag-badge';
      badge.innerHTML = `
        <span>#${escapeHtml(tag)}</span>
        <span class="btn-remove-tag" data-index="${idx}">${ICONS.close}</span>
      `;
      badge.querySelector('.btn-remove-tag').addEventListener('click', (e) => {
        e.stopPropagation();
        removeTag(idx);
      });
      tagsContainer.insertBefore(badge, tagInputField);
    });
  }

  function handleTagInputKeydown(e) {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      const val = tagInputField.value.trim().replace(/^#/, '');
      if (val && !state.tags.includes(val)) {
        state.tags.push(val);
        tagInputField.value = '';
        renderTags();
        updateLivePreview();
        updatePayloadPreview();
      }
    } else if (e.key === 'Backspace' && tagInputField.value === '' && state.tags.length > 0) {
      state.tags.pop();
      renderTags();
      updateLivePreview();
      updatePayloadPreview();
    }
  }

  function removeTag(index) {
    state.tags.splice(index, 1);
    renderTags();
    updateLivePreview();
    updatePayloadPreview();
  }

  // --- Format & Attachment Synchronization Engine ---
  function setPostFormat(format, autoSwitched = false) {
    state.postType = format;
    formatButtons.forEach((b) => {
      if (b.dataset.format === format) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });

    // Update Dropzone hints and input filtering dynamically
    if (format === 'video') {
      fileInput.accept = 'video/mp4,video/quicktime,video/webm,video/*';
      fileInput.multiple = false;
      if (dropzoneTitle) dropzoneTitle.textContent = 'Upload Video / Reel / Short';
      if (dropzoneDesc) dropzoneDesc.textContent = 'Drag & drop 1 video file here (.mp4, .mov, .webm) or click to browse. Max 1 clip.';
      dropzone.style.opacity = '1';
      dropzone.style.pointerEvents = 'auto';
    } else if (format === 'image') {
      fileInput.accept = 'image/png,image/jpeg,image/webp,image/*';
      fileInput.multiple = false;
      if (dropzoneTitle) dropzoneTitle.textContent = 'Upload Single Photo';
      if (dropzoneDesc) dropzoneDesc.textContent = 'Drag & drop 1 photo here (.png, .jpg, .webp) or click to browse.';
      dropzone.style.opacity = '1';
      dropzone.style.pointerEvents = 'auto';
    } else if (format === 'carousel') {
      fileInput.accept = 'image/*,video/*';
      fileInput.multiple = true;
      if (dropzoneTitle) dropzoneTitle.textContent = 'Upload Carousel / Album Assets';
      if (dropzoneDesc) dropzoneDesc.textContent = 'Drag & drop multiple photos or video clips (2 to 10 files) for multi-slide posts.';
      dropzone.style.opacity = '1';
      dropzone.style.pointerEvents = 'auto';
    } else if (format === 'text') {
      fileInput.accept = '';
      if (dropzoneTitle) dropzoneTitle.textContent = 'Text / Thread Format Selected';
      if (dropzoneDesc) dropzoneDesc.textContent = 'Text posts do not require media attachments.';
    }

    checkFormatVsAttachments();
    updateLivePreview();
    updatePayloadPreview();
  }

  // --- Real-Time Format vs Attachment Checker ---
  function checkFormatVsAttachments() {
    if (!formatMismatchWarning) return;

    if (state.files.length === 0) {
      formatMismatchWarning.style.display = 'none';
      return;
    }

    const videos = state.files.filter((f) => f.type === 'video');
    const images = state.files.filter((f) => f.type === 'image');

    // Case 1: Selected 'Video', but uploaded photos
    if (state.postType === 'video' && images.length > 0 && videos.length === 0) {
      formatMismatchWarning.style.display = 'flex';
      const targetFormat = images.length > 1 ? 'carousel' : 'image';
      const targetLabel = images.length > 1 ? 'Carousel / Album' : 'Single Photo';
      formatMismatchWarning.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px; height:16px; flex-shrink:0;">
            <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span><strong>Format Mismatch:</strong> Selected format is <em>Video</em>, but ${images.length} photo(s) are attached (${images.map(i => i.name).slice(0, 2).join(', ')}).</span>
        </div>
        <button type="button" class="btn-fix-format" id="btnAutoFixFormat">Switch to ${targetLabel}</button>
      `;
      document.getElementById('btnAutoFixFormat')?.addEventListener('click', () => {
        setPostFormat(targetFormat);
      });
      return;
    }

    // Case 2: Selected 'Single Photo', but uploaded a video
    if (state.postType === 'image' && videos.length > 0) {
      formatMismatchWarning.style.display = 'flex';
      formatMismatchWarning.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px; height:16px; flex-shrink:0;">
            <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span><strong>Format Mismatch:</strong> Selected format is <em>Single Photo</em>, but a video is attached (${videos[0].name}).</span>
        </div>
        <button type="button" class="btn-fix-format" id="btnAutoFixFormat">Switch to Video</button>
      `;
      document.getElementById('btnAutoFixFormat')?.addEventListener('click', () => {
        setPostFormat('video');
      });
      return;
    }

    // Case 3: Selected 'Single Photo', but uploaded multiple images
    if (state.postType === 'image' && images.length > 1) {
      formatMismatchWarning.style.display = 'flex';
      formatMismatchWarning.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px; height:16px; flex-shrink:0;">
            <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span><strong>Format Notice:</strong> You uploaded ${images.length} photos. Single Photo will only dispatch 1 image.</span>
        </div>
        <button type="button" class="btn-fix-format" id="btnAutoFixFormat">Switch to Carousel</button>
      `;
      document.getElementById('btnAutoFixFormat')?.addEventListener('click', () => {
        setPostFormat('carousel');
      });
      return;
    }

    // Case 4: Selected 'Carousel', but only 1 asset attached
    if (state.postType === 'carousel' && state.files.length === 1) {
      formatMismatchWarning.style.display = 'flex';
      formatMismatchWarning.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px; height:16px; flex-shrink:0;">
            <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span><strong>Carousel Notice:</strong> Carousels require at least 2 assets. Upload another file or switch format.</span>
        </div>
        <button type="button" class="btn-fix-format" id="btnAutoFixFormat">Switch to Single Photo</button>
      `;
      document.getElementById('btnAutoFixFormat')?.addEventListener('click', () => {
        setPostFormat(state.files[0].type === 'video' ? 'video' : 'image');
      });
      return;
    }

    // Case 5: Selected 'Text', but files are attached
    if (state.postType === 'text' && state.files.length > 0) {
      formatMismatchWarning.style.display = 'flex';
      formatMismatchWarning.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px; height:16px; flex-shrink:0;">
            <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span><strong>Format Notice:</strong> Text format does not dispatch media files. Attachments will be omitted.</span>
        </div>
        <button type="button" class="btn-fix-format" id="btnAutoFixFormat">Switch to Media Format</button>
      `;
      document.getElementById('btnAutoFixFormat')?.addEventListener('click', () => {
        setPostFormat(state.files.length > 1 ? 'carousel' : (state.files[0].type === 'video' ? 'video' : 'image'));
      });
      return;
    }

    formatMismatchWarning.style.display = 'none';
  }

  // --- Files & Media Ingestion with Intelligent Auto-Detection ---
  function handleFilesSelected(fileList) {
    const incomingFiles = Array.from(fileList);
    if (incomingFiles.length === 0) return;

    const allVideos = incomingFiles.every((f) => f.type.startsWith('video/'));
    const allImages = incomingFiles.every((f) => f.type.startsWith('image/'));

    // Intelligent auto-detection of format from dropped file(s)
    if (incomingFiles.length === 1 && allVideos && state.postType !== 'video') {
      setPostFormat('video', true);
      showToast('Detected video file: switched format to Video / Reel / Short.', 'info');
    } else if (incomingFiles.length === 1 && allImages && (state.postType === 'video' || state.postType === 'text')) {
      setPostFormat('image', true);
      showToast('Detected photo file: switched format to Single Photo.', 'info');
    } else if (incomingFiles.length > 1 && (state.postType === 'video' || state.postType === 'image' || state.postType === 'text')) {
      setPostFormat('carousel', true);
      showToast(`Detected ${incomingFiles.length} files: switched format to Carousel / Album.`, 'info');
    }

    // For single-item modes ('video' or 'image'), replace previous upload with the new one
    if (state.postType === 'video' || state.postType === 'image') {
      state.files.forEach((f) => {
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
      });
      state.files = [];
    }

    incomingFiles.forEach((file) => {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      const previewUrl = URL.createObjectURL(file);

      state.files.push({
        file: file,
        previewUrl: previewUrl,
        type: isVideo ? 'video' : isImage ? 'image' : 'file',
        name: file.name,
        sizeFormatted: formatFileSize(file.size)
      });
    });

    renderMediaPreviews();
    checkFormatVsAttachments();
    updateLivePreview();
    updatePayloadPreview();
  }

  function renderMediaPreviews() {
    mediaPreviewGrid.innerHTML = '';
    state.files.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'media-item';

      let mediaHtml = '';
      if (item.type === 'image') {
        mediaHtml = `<img src="${item.previewUrl}" alt="${escapeHtml(item.name)}" />`;
      } else if (item.type === 'video') {
        mediaHtml = `<video src="${item.previewUrl}" muted playsinline></video>`;
      } else {
        mediaHtml = `<div style="color: #94a3b8; display:flex; align-items:center; justify-content:center;">${ICONS.file}</div>`;
      }

      card.innerHTML = `
        ${mediaHtml}
        <span class="media-type-badge">${item.type}</span>
        <span class="media-size-badge">${item.sizeFormatted}</span>
        <button type="button" class="media-delete-btn" title="Remove asset" data-index="${index}">${ICONS.close}</button>
      `;

      card.querySelector('.media-delete-btn').addEventListener('click', () => {
        removeFile(index);
      });

      mediaPreviewGrid.appendChild(card);
    });
  }

  function removeFile(index) {
    const item = state.files[index];
    if (item && item.previewUrl) {
      URL.revokeObjectURL(item.previewUrl);
    }
    state.files.splice(index, 1);
    renderMediaPreviews();
    checkFormatVsAttachments();
    updateLivePreview();
    updatePayloadPreview();
  }

  // --- Live Mockup Synchronization ---
  function updateLivePreview() {
    const titleVal = postTitleInput.value.trim() || 'Your Headline / Hook Here';
    const descVal = postDescInput.value.trim() || 'Enter your caption or post body. Your n8n workflow will scatter this across all selected channels.';

    mockupTitle.textContent = titleVal;
    mockupDesc.textContent = descVal;

    if (state.selectedPlatforms.length > 0) {
      const labels = state.selectedPlatforms.map((p) => p.charAt(0).toUpperCase() + p.slice(1));
      mockupPlatformTag.textContent = labels.join(', ');
    } else {
      mockupPlatformTag.textContent = 'No channels selected';
    }

    if (state.tags.length > 0) {
      mockupTags.innerHTML = state.tags.map((t) => `<span>#${escapeHtml(t)}</span>`).join(' ');
    } else {
      mockupTags.innerHTML = '';
    }

    if (state.files.length > 0) {
      const first = state.files[0];
      if (first.type === 'video') {
        mockupMediaViewport.innerHTML = `
          <video src="${first.previewUrl}" controls autoplay loop muted playsinline style="width:100%; height:100%; object-fit:contain;"></video>
        `;
      } else if (first.type === 'image') {
        mockupMediaViewport.innerHTML = `
          <img src="${first.previewUrl}" alt="Media Preview" style="width:100%; height:100%; object-fit:contain;" />
        `;
      } else {
        mockupMediaViewport.innerHTML = `
          <div class="viewport-empty-placeholder">
            ${ICONS.file}
            <span>${escapeHtml(first.name)}</span>
          </div>
        `;
      }
    } else {
      mockupMediaViewport.innerHTML = `
        <div class="viewport-empty-placeholder">
          ${ICONS.video}
          <span>Drop a video or image to preview</span>
        </div>
      `;
    }
  }

  // --- Live Payload Preview ---
  function updatePayloadPreview() {
    const payload = buildSubmissionMetadata();
    jsonPayloadViewer.textContent = JSON.stringify(payload, null, 2);
  }

  function buildSubmissionMetadata() {
    return {
      action: 'social_media_scatter',
      postType: state.postType,
      platforms: state.selectedPlatforms,
      title: postTitleInput.value.trim(),
      description: postDescInput.value.trim(),
      tags: state.tags.map((t) => t.replace(/^#/, '').trim()),
      ctaLink: ctaLinkInput.value.trim() || null,
      schedule: {
        type: state.scheduleType,
        datetime: state.scheduleType === 'scheduled' ? scheduleDatetimeInput.value : null
      },
      n8nAiPrompt: n8nPromptInput.value.trim() || null,
      filesSummary: state.files.map((f) => ({
        filename: f.name,
        type: f.type,
        size: f.sizeFormatted
      })),
      submittedAt: new Date().toISOString()
    };
  }

  // --- Tab Navigation ---
  function switchSidebarTab(tabName) {
    [tabMockupBtn, tabPayloadBtn, tabHistoryBtn].forEach((btn) => btn.classList.remove('active'));
    [previewTabContent, payloadTabContent, historyTabContent].forEach((c) => (c.style.display = 'none'));

    if (tabName === 'mockup') {
      tabMockupBtn.classList.add('active');
      previewTabContent.style.display = 'block';
    } else if (tabName === 'payload') {
      tabPayloadBtn.classList.add('active');
      payloadTabContent.style.display = 'block';
      updatePayloadPreview();
    } else if (tabName === 'history') {
      tabHistoryBtn.classList.add('active');
      historyTabContent.style.display = 'block';
      renderHistory();
    }
  }

  // --- Form Submission via HTTPS ---
  async function handleFormSubmit(e) {
    e.preventDefault();

    // If no direct webhook is configured, we will queue the post locally in server.js
    // so n8n's Schedule Trigger -> HTTP Request (GET) will pull this post.
    const isWebhookMode = Boolean(state.webhookUrl);

    if (state.selectedPlatforms.length === 0) {
      showToast('Select at least one destination platform.', 'error');
      return;
    }

    const title = postTitleInput.value.trim();
    const desc = postDescInput.value.trim();

    if (!title && !desc && state.files.length === 0) {
      showToast('Provide a title, description, or media asset.', 'error');
      return;
    }

    // --- Strict Format vs Attachment Validation Checker ---
    const videos = state.files.filter((f) => f.type === 'video');
    const images = state.files.filter((f) => f.type === 'image');

    if (state.postType === 'video') {
      if (state.files.length === 0) {
        showToast('Format is set to Video, but no video file is attached. Please upload an .mp4 or .mov file.', 'error');
        checkFormatVsAttachments();
        return;
      }
      if (videos.length === 0 && images.length > 0) {
        showToast(`Format is set to Video, but you attached ${images.length} photo(s). Please switch to Single Photo or Carousel.`, 'error');
        checkFormatVsAttachments();
        return;
      }
      if (videos.length > 1) {
        showToast('Video / Reel / Short format supports 1 video clip. Switch to Carousel for multiple clips.', 'error');
        checkFormatVsAttachments();
        return;
      }
    } else if (state.postType === 'image') {
      if (state.files.length === 0) {
        showToast('Format is set to Single Photo, but no photo was uploaded. Please attach an image (.png, .jpg).', 'error');
        checkFormatVsAttachments();
        return;
      }
      if (videos.length > 0 && images.length === 0) {
        showToast('Format is set to Single Photo, but a video was attached. Please switch format to Video.', 'error');
        checkFormatVsAttachments();
        return;
      }
      if (state.files.length > 1) {
        showToast(`Single Photo format only supports 1 image (you attached ${state.files.length}). Switch to Carousel / Album.`, 'error');
        checkFormatVsAttachments();
        return;
      }
    } else if (state.postType === 'carousel') {
      if (state.files.length < 2) {
        showToast('Carousel / Album format requires at least 2 photos or videos. Please add more files or switch to Single Photo.', 'error');
        checkFormatVsAttachments();
        return;
      }
    } else if (state.postType === 'text') {
      if (state.files.length > 0) {
        showToast('Text / Thread format does not accept media attachments. Remove files or switch to Photo/Video.', 'error');
        checkFormatVsAttachments();
        return;
      }
    }

    const formData = new FormData();
    const metadata = buildSubmissionMetadata();

    formData.append('metadata', JSON.stringify(metadata));
    formData.append('title', metadata.title);
    formData.append('description', metadata.description);

    // Append tags as individual array items for n8n .map() compatibility
    state.tags.forEach((tag) => {
      const cleanTag = tag.replace(/^#/, '').trim();
      formData.append('tags', cleanTag);
      formData.append('tags[]', cleanTag);
    });
    // Also provide ready-formatted string and JSON versions
    formData.append('tags_string', state.tags.map((t) => '#' + t.replace(/^#/, '')).join(' '));
    formData.append('tags_json', JSON.stringify(state.tags.map((t) => t.replace(/^#/, ''))));

    // Append platforms as individual array items and JSON
    state.selectedPlatforms.forEach((platform) => {
      formData.append('platforms', platform);
      formData.append('platforms[]', platform);
    });
    formData.append('platforms_json', JSON.stringify(state.selectedPlatforms));

    formData.append('postType', metadata.postType);
    if (metadata.ctaLink) formData.append('ctaLink', metadata.ctaLink);
    formData.append('scheduleType', metadata.schedule.type);
    if (metadata.schedule.datetime) formData.append('scheduleDatetime', metadata.schedule.datetime);
    if (metadata.n8nAiPrompt) formData.append('n8nAiPrompt', metadata.n8nAiPrompt);

    state.files.forEach((item, index) => {
      // 'data' is the universal default binary property name expected by n8n nodes (AI, Gemini, Drive, S3, Social)
      if (index === 0) {
        formData.append('data', item.file, item.file.name);
        formData.append('file', item.file, item.file.name);
      }
      formData.append(`file_${index}`, item.file, item.file.name);
      formData.append('files[]', item.file, item.file.name);
    });

    // Convert files to base64 so local backend can persist and serve them via /uploads
    const mediaPayload = await Promise.all(
      state.files.map((item) => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            resolve({
              name: item.file.name,
              type: item.file.type,
              size: item.file.size,
              base64: reader.result
            });
          };
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(item.file);
        });
      })
    );

    // 1. Sync post into local Express queue (/api/posts) so n8n Schedule Trigger GET gets full data + mediaUrl
    fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: metadata.title,
        description: metadata.description,
        platforms: state.selectedPlatforms,
        tags: state.tags.map((t) => t.replace(/^#/, '').trim()),
        postType: metadata.postType,
        ctaLink: metadata.ctaLink,
        schedule: metadata.schedule,
        media: mediaPayload.filter(Boolean)
      })
    })
      .then((res) => res.json())
      .then((data) => {
        console.log('[Local Queue Synced]:', data);
      })
      .catch((err) => {
        console.warn('[Queue Sync Notice]:', err);
      });

    // 2. If direct Webhook URL is provided, stream multipart/form-data to it
    if (isWebhookMode) {
      startUpload(formData, metadata);
    } else {
      // Direct Webhook URL not set: post is now armed in local server queue for n8n scheduled fetch!
      showToast('Post armed in local backend! When n8n Schedule Trigger fires, it will pull this post.', 'success');
      saveSubmissionToHistory(metadata, 200, 'Queued for n8n');
      if (jsonResponseViewer) {
        jsonResponseViewer.textContent = JSON.stringify({
          status: 'queued',
          message: 'Post successfully enqueued in local server. When n8n executes GET /, it will receive this payload.',
          enqueuedPost: metadata
        }, null, 2);
        jsonResponseViewer.style.color = '#6ee7b7';
      }
      switchSidebarTab('payload');
    }
  }

  function startUpload(formData, metadata) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `${ICONS.spinner} <span>Dispatching to n8n...</span>`;
    uploadProgressContainer.style.display = 'block';
    progressPercent.textContent = '0%';
    progressBarFill.style.width = '0%';
    progressText.textContent = state.files.length > 0 ? 'Streaming media payload to n8n...' : 'Sending request...';

    const xhr = new XMLHttpRequest();
    xhr.open('POST', state.webhookUrl, true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        progressPercent.textContent = `${percent}%`;
        progressBarFill.style.width = `${percent}%`;
        progressText.textContent = `Transmitted ${formatFileSize(event.loaded)} of ${formatFileSize(event.total)}`;
      }
    };

    xhr.onload = () => {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `${ICONS.send} <span>Dispatch Across Platforms</span>`;
      uploadProgressContainer.style.display = 'none';

      if (xhr.status >= 200 && xhr.status < 300) {
        showToast('Dispatched successfully to n8n workflow.', 'success');

        let parsedResponse = xhr.responseText;
        try {
          parsedResponse = JSON.parse(xhr.responseText);
        } catch (_) { }

        state.lastResponse = {
          statusCode: xhr.status,
          statusText: xhr.statusText,
          response: parsedResponse,
          timestamp: new Date().toLocaleTimeString()
        };

        jsonResponseViewer.textContent = JSON.stringify(state.lastResponse, null, 2);
        saveSubmissionToHistory(metadata, xhr.status);
        switchSidebarTab('payload');
      } else {
        let errMsg = `Endpoint responded with HTTP ${xhr.status}: ${xhr.statusText || 'Error'}`;
        if (xhr.status === 404) {
          errMsg = `HTTP 404: In n8n, click 'Listen for test event' or activate your workflow!`;
        } else if (xhr.status === 405) {
          errMsg = `HTTP 405: Change n8n Webhook node HTTP Method from GET to POST!`;
        }
        showToast(errMsg, 'error');
        jsonResponseViewer.textContent = JSON.stringify({
          error: true,
          status: xhr.status,
          statusText: xhr.statusText,
          response: xhr.responseText,
          hint: xhr.status === 404 ? "If using /webhook-test, n8n only listens when you click 'Listen for test event'." : (xhr.status === 405 ? "Your n8n Webhook node is set to GET. Switch it to POST." : undefined)
        }, null, 2);
        switchSidebarTab('payload');
      }
    };

    xhr.onerror = () => {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `${ICONS.send} <span>Dispatch Across Platforms</span>`;
      uploadProgressContainer.style.display = 'none';

      const errText = `Network failure communicating with ${state.webhookUrl}. Verify endpoint and CORS policy.`;
      showToast(errText, 'error');
      jsonResponseViewer.textContent = JSON.stringify({
        error: true,
        message: errText
      }, null, 2);
      switchSidebarTab('payload');
    };

    xhr.send(formData);
  }

  // --- Webhook Ping Test ---
  function testWebhookPing() {
    const url = webhookUrlInput.value.trim() || state.webhookUrl;
    if (!url) {
      showToast('Specify a Webhook URL first.', 'error');
      return;
    }

    testWebhookBtn.disabled = true;
    testWebhookBtn.innerHTML = `${ICONS.spinner} <span>Pinging...</span>`;

    const pingData = new FormData();
    pingData.append('test', 'true');
    pingData.append('event', 'ping_check');
    pingData.append('timestamp', new Date().toISOString());

    fetch(url, {
      method: 'POST',
      body: pingData
    })
      .then((res) => {
        testWebhookBtn.disabled = false;
        testWebhookBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg> <span>Test Ping</span>`;
        if (res.ok) {
          showToast(`Webhook connected (HTTP ${res.status})!`, 'success');
          updateConnectionStatus(true);
        } else if (res.status === 404) {
          showToast(`HTTP 404: In n8n, click 'Listen for test event' or activate workflow!`, 'error');
        } else if (res.status === 405) {
          showToast(`HTTP 405 Method Not Allowed: Change n8n Webhook to POST!`, 'error');
        } else {
          showToast(`Webhook returned HTTP ${res.status}. Check n8n node config.`, 'error');
        }
      })
      .catch((err) => {
        testWebhookBtn.disabled = false;
        testWebhookBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg> <span>Test Ping</span>`;
        showToast(`Cannot reach webhook: ${err.message}. Ensure Cloudflare tunnel is running and Webhook is set to POST.`, 'error');
      });
  }

  // --- History Management ---
  function saveSubmissionToHistory(metadata, statusCode, customLabel = null) {
    const item = {
      id: Date.now(),
      title: metadata.title || 'Untitled Dispatch',
      platforms: metadata.platforms || [],
      postType: metadata.postType || 'content',
      time: new Date().toLocaleTimeString(),
      date: new Date().toLocaleDateString(),
      filesCount: metadata.filesSummary ? metadata.filesSummary.length : 0,
      statusCode: statusCode,
      statusLabel: customLabel || (statusCode >= 200 && statusCode < 300 ? 'Dispatched' : 'Error')
    };

    state.history.unshift(item);
    if (state.history.length > 20) state.history.pop();
    localStorage.setItem('n8n_social_history', JSON.stringify(state.history));
  }

  function renderHistory() {
    if (state.history.length === 0) {
      historyList.innerHTML = `<div style="color: var(--text-muted); text-align:center; padding: 24px; font-size: 0.82rem;">No previous dispatches recorded.</div>`;
      return;
    }

    historyList.innerHTML = '';
    state.history.forEach((h) => {
      const isErr = h.statusCode >= 400 || h.isError || h.statusLabel?.includes('Failed');
      const card = document.createElement('div');
      card.className = 'history-card';
      card.innerHTML = `
        <div>
          <div class="history-main-title">${escapeHtml(h.title)}</div>
          <div class="history-sub">${(h.platforms || []).join(', ') || 'Global'} • ${h.filesCount || 0} asset(s)</div>
          ${h.errorMessage ? `<div style="color: var(--danger); font-size: 0.74rem; margin-top: 3px; font-weight: 500;">${escapeHtml(h.errorMessage)}</div>` : ''}
        </div>
        <div style="text-align: right;">
          <span class="badge-status-code ${isErr ? 'error' : ''}">${escapeHtml(h.statusLabel || `HTTP ${h.statusCode}`)}</span>
          <div class="history-sub" style="margin-top: 2px;">${h.time}</div>
        </div>
      `;
      historyList.appendChild(card);
    });
  }

  async function handleClearHistory() {
    state.history = [];
    localStorage.removeItem('n8n_social_history');
    renderHistory();

    try {
      await fetch('/api/posts', { method: 'DELETE' });
      await fetch('/api/callbacks', { method: 'DELETE' });
    } catch (_) { }

    showToast('Dispatch history and queue cleared.', 'info');
  }

  // --- Real-Time n8n Telemetry & Error Polling ---
  let lastCallbackId = null;
  function startCallbackPolling() {
    setInterval(async () => {
      try {
        const res = await fetch('/api/callbacks');
        if (!res.ok) return;
        const data = await res.json();
        if (!data || !data.latest) return;

        const cb = data.latest;
        if (cb.id && cb.id !== lastCallbackId) {
          lastCallbackId = cb.id;

          // Populate the Payload Inspector with the latest received response from n8n
          if (jsonResponseViewer) {
            jsonResponseViewer.textContent = JSON.stringify(cb.payload, null, 2);
            jsonResponseViewer.style.color = cb.isError ? '#f87171' : '#6ee7b7';
          }

          if (cb.isError) {
            const errorMsg = cb.reason || cb.error || 'Validation failed in n8n';
            showToast(`n8n Error Callback: ${errorMsg}`, 'error');

            // Record into History tab so user has a permanent log of cloud errors
            const errorHistoryItem = {
              id: Date.now(),
              title: cb.payload?.data?.title || 'n8n Validation Error',
              platforms: cb.payload?.data?.platforms || [],
              postType: cb.payload?.data?.postType || 'validation',
              time: new Date().toLocaleTimeString(),
              date: new Date().toLocaleDateString(),
              filesCount: 0,
              statusCode: 422,
              isError: true,
              statusLabel: 'Failed in n8n',
              errorMessage: errorMsg
            };
            state.history.unshift(errorHistoryItem);
            if (state.history.length > 25) state.history.pop();
            localStorage.setItem('n8n_social_history', JSON.stringify(state.history));
            renderHistory();
          } else {
            showToast(`n8n Workflow Callback: Status "${cb.status}" acknowledged`, 'success');
            renderHistory();
          }
        }
      } catch (_) {
        // Quiet fail if running purely offline
      }
    }, 3000);
  }

  // --- Helpers ---
  function updateConnectionStatus(isConnected) {
    if (isConnected) {
      statusLabel.textContent = 'n8n Endpoint Linked';
      connectionStatus.style.background = 'var(--success-subtle)';
      connectionStatus.style.color = '#065f46';
      connectionStatus.style.borderColor = 'var(--success-border)';
      connectionStatus.querySelector('.status-indicator').style.background = 'var(--success)';
    } else {
      statusLabel.textContent = 'Endpoint Not Set';
      connectionStatus.style.background = 'var(--danger-subtle)';
      connectionStatus.style.color = '#991b1b';
      connectionStatus.style.borderColor = 'var(--danger-border)';
      connectionStatus.querySelector('.status-indicator').style.background = 'var(--danger)';
    }
  }

  function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  let toastTimer = null;
  function showToast(message, type = 'info') {
    toastMessage.textContent = message;
    toastNotification.className = `toast-bar show ${type}`;

    if (type === 'success') {
      toastIcon.innerHTML = `<polyline points="20 6 9 17 4 12"></polyline>`;
      toastIcon.style.color = 'var(--success)';
    } else if (type === 'error') {
      toastIcon.innerHTML = `<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>`;
      toastIcon.style.color = 'var(--danger)';
    }

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastNotification.classList.remove('show');
    }, 4500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
