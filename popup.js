document.addEventListener('DOMContentLoaded', async () => {
  const libraryDiv = document.getElementById('library');
  const searchInput = document.getElementById('search');
  const modal = document.getElementById('modal');
  const modalImage = document.getElementById('modal-image');
  const modalPrompt = document.getElementById('modal-prompt');
  const modalClose = document.getElementById('modal-close');
  const modalRegenerate = document.getElementById('modal-regenerate');
  const modalShare = document.getElementById('modal-share');
  const clearLibraryBtn = document.getElementById('clearLibrary');
  const exportLibraryBtn = document.getElementById('exportLibrary');

  let currentHistory = [];
  let currentIndex = -1;

  async function loadLibrary(filter = '') {
    const data = await chrome.storage.local.get('promptHistory');
    currentHistory = data.promptHistory || [];

    const filtered = currentHistory.filter(item => 
      item.prompt.toLowerCase().includes(filter.toLowerCase())
    );

    if (filtered.length === 0) {
      libraryDiv.innerHTML = `<div class="empty">No matching prompts found.</div>`;
      return;
    }

    libraryDiv.innerHTML = filtered.map((item, index) => `
      <div class="item" data-index="${currentHistory.indexOf(item)}">
        <img src="${item.thumbnail || 'https://via.placeholder.com/120x120/1a1a1a/666?text=No+Image'}" 
             alt="" onerror="this.src='https://via.placeholder.com/120x120/1a1a1a/666?text=No+Image'">
        <div class="prompt">${item.prompt.substring(0, 70)}${item.prompt.length > 70 ? '...' : ''}</div>
      </div>
    `).join('');
  }

  loadLibrary();

  searchInput.addEventListener('input', (e) => loadLibrary(e.target.value));

  modalClose.addEventListener('click', () => modal.style.display = 'none');

  modalRegenerate.addEventListener('click', () => {
    if (currentIndex === -1) return;
    const item = currentHistory[currentIndex];
    navigator.clipboard.writeText(item.prompt);
    alert('Prompt copied!\n\nOpening Grok Imagine...');
    chrome.tabs.create({ url: 'https://grok.com/imagine' });
    modal.style.display = 'none';
  });

  modalShare.addEventListener('click', () => {
    if (currentIndex === -1) return;
    const item = currentHistory[currentIndex];
    navigator.clipboard.writeText(item.prompt);
    alert('✅ Prompt copied to clipboard!');
  });

  libraryDiv.addEventListener('click', (event) => {
    const card = event.target.closest('.item');
    if (!card) return;

    const index = parseInt(card.dataset.index);
    const item = currentHistory[index];
    currentIndex = index;

    modalImage.src = item.thumbnail || '';
    modalPrompt.textContent = item.prompt;
    modal.style.display = 'flex';
  });

  clearLibraryBtn.addEventListener('click', async () => {
    if (!confirm('⚠️ This will permanently delete ALL saved prompts.\n\nAre you sure?')) return;
    await chrome.storage.local.remove('promptHistory');
    currentHistory = [];
    loadLibrary();
    alert('✅ Prompt Library cleared.');
  });

  // Export Library - fixed alert (no emoji)
  exportLibraryBtn.addEventListener('click', async () => {
    const data = await chrome.storage.local.get('promptHistory');
    const history = data.promptHistory || [];

    if (history.length === 0) {
      alert('Nothing to export yet.');
      return;
    }

    const jsonString = JSON.stringify(history, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `prompt-library-export-${new Date().toISOString().slice(0,10)}.json`;
    a.click();

    URL.revokeObjectURL(url);
    alert(`Exported ${history.length} prompts!`);
  });
});
