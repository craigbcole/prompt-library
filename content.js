console.log('[Prompt Library] v11 — Click-to-save only');

let selectedImage = null;
let lastCapturedPrompt = '';

// Capture prompt from fetch (for batch consistency)
const originalFetch = window.fetch;
window.fetch = async function (...args) {
  const [resource, init] = args;
  const url = typeof resource === 'string' ? resource : resource?.url || '';

  if (url.includes('/rest/app-chat/conversations') && init?.method === 'POST') {
    if (init.body) {
      try {
        const body = JSON.parse(init.body);
        lastCapturedPrompt = body.message || body.text || '';
        console.log('[Prompt Library] Captured prompt from request');
      } catch (e) {}
    }
  }
  return originalFetch.apply(this, args);
};

// Floating Save button (hidden until image clicked)
let saveBtn = null;
function createSaveButton() {
  if (saveBtn) return;

  saveBtn = document.createElement('button');
  saveBtn.textContent = '💾 Save to Prompt Library';
  saveBtn.style.cssText = `
    position: fixed; bottom: 80px; right: 20px; z-index: 999999;
    background: #1a73e8; color: white; border: none; padding: 10px 16px;
    border-radius: 8px; font-size: 13px; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    display: none; /* hidden until clicked */
  `;
  saveBtn.addEventListener('click', () => {
    if (selectedImage) saveSelectedImage();
  });
  document.body.appendChild(saveBtn);
}

setInterval(createSaveButton, 3000);

// Click handler on images
document.addEventListener('click', (e) => {
  const img = e.target.closest('img');
  if (!img) return;

  // Remove previous selection
  if (selectedImage) selectedImage.style.outline = '';

  // Select this image
  selectedImage = img;
  img.style.outline = '4px solid #1a73e8';
  img.style.outlineOffset = '4px';

  // Show Save button
  if (saveBtn) saveBtn.style.display = 'block';

  console.log('[Prompt Library] Image selected for save');
});

async function saveSelectedImage() {
  if (!selectedImage) return alert('No image selected.');

  console.log('[Prompt Library] Saving selected image');

  // Prompt: prefer captured, fallback to UI
  let prompt = lastCapturedPrompt || '';
  if (!prompt) {
    const lastTurn = selectedImage.closest('.conversation-turn') || document.querySelector('.conversation-turn:last-child');
    if (lastTurn) prompt = lastTurn.textContent.trim().substring(0, 300) || '';
  }
  if (!prompt) {
    const textarea = document.querySelector('textarea, [contenteditable="true"]');
    prompt = textarea ? (textarea.value || textarea.textContent || '').trim() : 'Unknown prompt';
  }

  // Thumbnail from selected image
  let thumbnail = selectedImage.src || selectedImage.poster || '';

  // Data URL fallback
  if (!thumbnail || thumbnail.startsWith('blob:') || thumbnail.includes('revoked')) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = selectedImage.naturalWidth || 512;
      canvas.height = selectedImage.naturalHeight || 512;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(selectedImage, 0, 0);
      thumbnail = canvas.toDataURL('image/png');
    } catch (e) {
      thumbnail = '';
    }
  }

  const entry = {
    id: Date.now(),
    prompt: prompt || 'Unknown prompt',
    thumbnail: thumbnail,
    timestamp: new Date().toISOString()
  };

  const data = await chrome.storage.local.get('promptHistory');
  let history = data.promptHistory || [];
  history.unshift(entry);

  await chrome.storage.local.set({ promptHistory: history.slice(0, 1000) });

  console.log('[Prompt Library] ✅ Saved selected image');
  alert('✅ Saved to Prompt Library!\n\nPrompt: ' + prompt.substring(0, 100));

  // Optional: deselect after save
  selectedImage.style.outline = '';
  selectedImage = null;
  if (saveBtn) saveBtn.style.display = 'none';
}
