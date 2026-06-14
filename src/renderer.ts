export {};

declare global {
  interface Window {
    electronAPI: {
      closeWindow: () => void;
      minimizeWindow: () => void;
      savePlaylist: (data: any) => void;
      loadPlaylist: () => Promise<any>;
    };
    jsmediatags: any;
  }
}

const jsmediatags = window.jsmediatags;

const audioEngine = document.getElementById('audio-engine') as HTMLAudioElement;
const fileUpload = document.getElementById('file-upload') as HTMLInputElement;
const folderUpload = document.getElementById('folder-upload') as HTMLInputElement;
const trackTitle = document.getElementById('track-title') as HTMLDivElement;
const trackArtist = document.getElementById('track-artist') as HTMLDivElement;
const playBtn = document.getElementById('play-btn') as HTMLButtonElement;
const playIcon = document.getElementById('play-icon') as unknown as SVGPathElement;
const prevBtn = document.getElementById('prev-btn') as HTMLButtonElement;
const nextBtn = document.getElementById('next-btn') as HTMLButtonElement;
const progressBar = document.getElementById('progress-bar') as HTMLDivElement;
const progressContainer = document.getElementById('progress-container') as HTMLDivElement;
const vinylDisc = document.getElementById('vinyl-disc') as HTMLDivElement;
const playlistBox = document.getElementById('playlist-box') as HTMLDivElement;
const minimizeBtn = document.getElementById('minimize-btn') as HTMLButtonElement;
const closeBtn = document.getElementById('close-btn') as HTMLButtonElement;
const coverArt = document.getElementById('cover-art') as HTMLImageElement;
const playlistSelector = document.getElementById('playlist-selector') as HTMLSelectElement;
const newPlaylistBtn = document.getElementById('new-playlist-btn') as HTMLButtonElement;
const clearPlaylistBtn = document.getElementById('clear-playlist-btn') as HTMLButtonElement;
const renamePlaylistBtn = document.getElementById('rename-playlist-btn') as HTMLButtonElement;
const shuffleBtn = document.getElementById('shuffle-btn') as HTMLButtonElement;

const modalOverlay = document.getElementById('modal-overlay') as HTMLDivElement;
const modalTitle = document.getElementById('modal-title') as HTMLSpanElement;
const modalInput = document.getElementById('modal-input') as HTMLInputElement;
const modalCancel = document.getElementById('modal-cancel') as HTMLButtonElement;
const modalSave = document.getElementById('modal-save') as HTMLButtonElement;

interface Track { name: string; path: string; }
interface AppData {
  playlists: Record<string, Track[]>;
  active: string;
}

let appData: AppData = { playlists: { 'Default': [] }, active: 'Default' };
let currentIndex = 0;
let isShuffle = false;
let modalCallback: ((value: string) => void) | null = null;

shuffleBtn.addEventListener('click', () => {
  isShuffle = !isShuffle;
  if (isShuffle) {
    shuffleBtn.classList.add('shuffle-active');
  } else {
    shuffleBtn.classList.remove('shuffle-active');
  }
});

function openModal(title: string, defaultValue: string, callback: (value: string) => void) {
  modalTitle.textContent = title;
  modalInput.value = defaultValue;
  modalCallback = callback;
  modalOverlay.style.display = 'flex';
  modalInput.focus();
}

function closeModal() {
  modalOverlay.style.display = 'none';
  modalCallback = null;
}

modalCancel.addEventListener('click', closeModal);
modalSave.addEventListener('click', () => {
  if (modalCallback && modalInput.value.trim() !== '') {
    modalCallback(modalInput.value.trim());
  }
  closeModal();
});

minimizeBtn.addEventListener('click', () => window.electronAPI.minimizeWindow());
closeBtn.addEventListener('click', () => window.electronAPI.closeWindow());

window.electronAPI.loadPlaylist().then((savedData) => {
  if (savedData && !Array.isArray(savedData) && savedData.playlists) {
    appData = savedData;
  } else if (Array.isArray(savedData) && savedData.length > 0) {
    appData.playlists['Default'] = savedData;
  }
  
  updateSelectorUI();
  updatePlaylistUI();
  
  if (appData.playlists[appData.active].length > 0) {
    currentIndex = 0;
    loadTrack(currentIndex);
  }
});

function saveData() {
  window.electronAPI.savePlaylist(appData);
}

function updateSelectorUI() {
  playlistSelector.innerHTML = '';
  Object.keys(appData.playlists).forEach(name => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    if (name === appData.active) option.selected = true;
    playlistSelector.appendChild(option);
  });
}

playlistSelector.addEventListener('change', (e) => {
  const target = e.target as HTMLSelectElement;
  appData.active = target.value;
  currentIndex = 0;
  
  resetPlayerUI();
  updatePlaylistUI();
  saveData();
  
  if (appData.playlists[appData.active].length > 0) {
    loadTrack(currentIndex);
  }
});

newPlaylistBtn.addEventListener('click', () => {
  openModal('Nome da Playlist:', '', (name) => {
    if (!appData.playlists[name]) {
      appData.playlists[name] = [];
      appData.active = name;
      currentIndex = 0;
      
      resetPlayerUI();
      updateSelectorUI();
      updatePlaylistUI();
      saveData();
    } else {
      alert('Já existe uma playlist com esse nome!');
    }
  });
});

renamePlaylistBtn.addEventListener('click', () => {
  if (appData.active === 'Default') {
    alert('Não podes mudar o nome da playlist Default.');
    return;
  }
  
  openModal('Renomear Playlist:', appData.active, (newName) => {
    if (newName === appData.active) return;
    if (appData.playlists[newName]) {
      alert('Já existe uma playlist com esse nome!');
      return;
    }
    
    appData.playlists[newName] = appData.playlists[appData.active];
    delete appData.playlists[appData.active];
    appData.active = newName;
    
    updateSelectorUI();
    saveData();
  });
});

clearPlaylistBtn.addEventListener('click', () => {
  if (confirm(`Limpar a playlist "${appData.active}"?`)) {
    appData.playlists[appData.active] = [];
    currentIndex = 0;
    
    resetPlayerUI();
    updatePlaylistUI();
    saveData();
  }
});

function resetPlayerUI() {
  audioEngine.pause();
  coverArt.removeAttribute('src');
  trackTitle.textContent = 'No Track Loaded';
  trackArtist.textContent = 'Local MP3 Player';
  vinylDisc.classList.remove('playing');
  playIcon.setAttribute('d', 'M8 5v14l11-7z');
  progressBar.style.width = '0%';
}

function handleFilesAdded(files: File[]) {
  const audioFiles = files.filter(file => file.type.startsWith('audio/') || file.name.toLowerCase().endsWith('.mp3'));
  
  if (audioFiles.length > 0) {
    const activeList = appData.playlists[appData.active];
    const wasEmpty = activeList.length === 0;
    
    const newTracks = audioFiles.map(f => ({ name: f.name, path: f.path }));
    activeList.push(...newTracks);
    
    updatePlaylistUI();
    saveData();
    
    if (wasEmpty) {
      currentIndex = 0;
      loadTrack(currentIndex);
      playTrack();
    }
  }
}

fileUpload.addEventListener('change', (e) => {
  const target = e.target as HTMLInputElement;
  if (target.files) handleFilesAdded(Array.from(target.files));
  target.value = '';
});

folderUpload.addEventListener('change', (e) => {
  const target = e.target as HTMLInputElement;
  if (target.files) handleFilesAdded(Array.from(target.files));
  target.value = '';
});

function updatePlaylistUI() {
  playlistBox.innerHTML = '';
  const activeList = appData.playlists[appData.active];
  
  activeList.forEach((track, index) => {
    const item = document.createElement('div');
    item.classList.add('playlist-item');
    if (index === currentIndex) item.classList.add('active');
    
    item.textContent = `${index + 1}. ${track.name.replace('.mp3', '')}`;
    
    item.addEventListener('click', () => {
      currentIndex = index;
      loadTrack(currentIndex);
      playTrack();
    });
    
    playlistBox.appendChild(item);
  });
}

function applyFallbackMetadata(track: Track) {
  const cleanName = track.name.replace('.mp3', '');
  const parts = cleanName.split('-');
  if (parts.length > 1) {
    trackArtist.textContent = parts[0].trim();
    trackTitle.textContent = parts.slice(1).join('-').trim();
  } else {
    trackArtist.textContent = 'Local Track';
    trackTitle.textContent = cleanName;
  }
  coverArt.removeAttribute('src');
}

function loadTrack(index: number) {
  const activeList = appData.playlists[appData.active];
  if (activeList.length === 0) return;
  
  const track = activeList[index];
  audioEngine.pause();
  
  const fileURL = `local-media://${encodeURIComponent(track.path)}`;
  audioEngine.src = fileURL;
  
  updatePlaylistUI();

  fetch(fileURL)
    .then(response => response.blob())
    .then(blob => {
      jsmediatags.read(blob, {
        onSuccess: function(tag: any) {
          const tags = tag.tags;
          trackTitle.textContent = tags.title || track.name.replace('.mp3', '');
          trackArtist.textContent = tags.artist || 'Local Track';

          if (tags.picture) {
            let base64String = "";
            for (let i = 0; i < tags.picture.data.length; i++) {
              base64String += String.fromCharCode(tags.picture.data[i]);
            }
            coverArt.src = `data:${tags.picture.format};base64,${window.btoa(base64String)}`;
          } else {
            coverArt.removeAttribute('src');
          }
        },
        onError: function() { applyFallbackMetadata(track); }
      });
    })
    .catch(() => applyFallbackMetadata(track));
}

function playTrack() {
  audioEngine.play().then(() => {
    vinylDisc.classList.add('playing');
    playIcon.setAttribute('d', 'M6 19h4V5H6v14zm8-14v14h4V5h-4z');
  }).catch((erro) => {
    console.error(erro);
    alert(`Erro ao tocar: ${erro.message || 'Bloqueado pelo sistema'}`);
  });
}

function pauseTrack() {
  audioEngine.pause();
  vinylDisc.classList.remove('playing');
  playIcon.setAttribute('d', 'M8 5v14l11-7z');
}

function playNextTrack() {
  const activeList = appData.playlists[appData.active];
  if (activeList.length === 0) return;
  
  if (isShuffle && activeList.length > 1) {
    let newIndex;
    do {
      newIndex = Math.floor(Math.random() * activeList.length);
    } while (newIndex === currentIndex);
    currentIndex = newIndex;
  } else {
    currentIndex = (currentIndex + 1) % activeList.length;
  }
  
  loadTrack(currentIndex);
  playTrack();
}

function playPrevTrack() {
  const activeList = appData.playlists[appData.active];
  if (activeList.length === 0) return;
  
  if (isShuffle && activeList.length > 1) {
    let newIndex;
    do {
      newIndex = Math.floor(Math.random() * activeList.length);
    } while (newIndex === currentIndex);
    currentIndex = newIndex;
  } else {
    currentIndex = (currentIndex - 1 + activeList.length) % activeList.length;
  }
  
  loadTrack(currentIndex);
  playTrack();
}

playBtn.addEventListener('click', () => {
  if (appData.playlists[appData.active].length === 0) return;
  audioEngine.paused ? playTrack() : pauseTrack();
});

prevBtn.addEventListener('click', playPrevTrack);
nextBtn.addEventListener('click', playNextTrack);
audioEngine.addEventListener('ended', playNextTrack);

audioEngine.addEventListener('timeupdate', () => {
  if (audioEngine.duration > 0) {
    progressBar.style.width = `${(audioEngine.currentTime / audioEngine.duration) * 100}%`;
  }
});

progressContainer.addEventListener('click', (e) => {
  if (appData.playlists[appData.active].length === 0 || !audioEngine.duration) return;
  const rect = progressContainer.getBoundingClientRect();
  audioEngine.currentTime = (e.clientX - rect.left) / rect.width * audioEngine.duration;
});