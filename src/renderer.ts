export {};

declare global {
  interface Window {
    electronAPI: {
      closeWindow: () => void;
      minimizeWindow: () => void;
      savePlaylist: (data: any) => void;
      loadPlaylist: () => Promise<any>;
      onMediaPlayPause: (callback: () => void) => void;
      onMediaNext: (callback: () => void) => void;
      onMediaPrev: (callback: () => void) => void;
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
const playIcon = document.getElementById('play-icon') as HTMLElement; // Alterado para elemento geral
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
const volumeSlider = document.getElementById('volume-slider') as HTMLInputElement;

const lyricsBtn = document.getElementById('lyrics-btn') as HTMLButtonElement;
const lyricsBox = document.getElementById('lyrics-box') as HTMLDivElement;
const lyricsText = document.getElementById('lyrics-text') as HTMLDivElement;

const canvas = document.getElementById('visualizer') as HTMLCanvasElement;
const canvasCtx = canvas.getContext('2d');

const modalOverlay = document.getElementById('modal-overlay') as HTMLDivElement;
const modalTitle = document.getElementById('modal-title') as HTMLSpanElement;
const modalInput = document.getElementById('modal-input') as HTMLInputElement;
const modalCancel = document.getElementById('modal-cancel') as HTMLButtonElement;
const modalSave = document.getElementById('modal-save') as HTMLButtonElement;

const importBtn = document.querySelector('.import-btn') as HTMLButtonElement;
const importContent = document.querySelector('.import-content') as HTMLDivElement;

interface Track { name: string; path: string; }
interface AppData { playlists: Record<string, Track[]>; active: string; }

let appData: AppData = { playlists: { 'Default': [] }, active: 'Default' };
let currentIndex = 0;
let isShuffle = false;
let isLyricsView = false;
let modalCallback: ((value: string) => void) | null = null;
let currentLyricRequest = 0;

let audioCtx: AudioContext;
let analyser: AnalyserNode;

// Função utilitária para mudar o ícone de forma segura
function updatePlayIcon(isPlaying: boolean) {
  const path = isPlaying ? 'M6 19h4V5H6v14zm8-14v14h4V5h-4z' : 'M8 5v14l11-7z';
  playIcon.innerHTML = `<path d="${path}"/>`;
}

importBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  importContent.classList.toggle('show-menu');
});

document.addEventListener('click', (e) => {
  if (!importContent.contains(e.target as Node)) {
    importContent.classList.remove('show-menu');
  }
});

importContent.addEventListener('click', () => {
  importContent.classList.remove('show-menu');
});

function initVisualizer() {
  if (!audioCtx) {
    audioCtx = new window.AudioContext();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 128;
    const source = audioCtx.createMediaElementSource(audioEngine);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    drawVisualizer();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function drawVisualizer() {
  requestAnimationFrame(drawVisualizer);
  if (!canvasCtx) return;
  
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(dataArray);

  canvasCtx.shadowBlur = 0;
  canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
  
  const barCount = 32; 
  const barWidth = (canvas.width / barCount) - 2;
  let x = 0;

  canvasCtx.shadowBlur = 6;
  canvasCtx.shadowColor = '#bb9af7';
  canvasCtx.fillStyle = '#bb9af7';

  for (let i = 0; i < barCount; i++) {
    const barHeight = (dataArray[i] / 255) * (canvas.height * 0.8); 
    const minHeight = 2;
    const height = Math.max(barHeight, minHeight);
    
    if (canvasCtx.roundRect) {
      canvasCtx.beginPath();
      canvasCtx.roundRect(x, canvas.height - height, barWidth, height, 3);
      canvasCtx.fill();
    } else {
      canvasCtx.fillRect(x, canvas.height - height, barWidth, height);
    }
    x += barWidth + 2;
  }
}

volumeSlider.addEventListener('input', (e) => {
  audioEngine.volume = parseFloat((e.target as HTMLInputElement).value);
});

shuffleBtn.addEventListener('click', () => {
  isShuffle = !isShuffle;
  isShuffle ? shuffleBtn.classList.add('shuffle-active') : shuffleBtn.classList.remove('shuffle-active');
});

lyricsBtn.addEventListener('click', () => {
  isLyricsView = !isLyricsView;
  if (isLyricsView) {
    lyricsBtn.classList.add('lyrics-active');
    playlistBox.style.display = 'none';
    lyricsBox.style.display = 'block';
  } else {
    lyricsBtn.classList.remove('lyrics-active');
    lyricsBox.style.display = 'none';
    playlistBox.style.display = 'block';
  }
});

function cleanString(str: string) {
  if (!str) return '';
  let cleaned = str.replace(/\([^)]*\)/g, '')
                   .replace(/\[[^\]]*\]/g, '')
                   .replace(/\{[^}]*\}/g, '')
                   .replace(/\.mp3/gi, '')
                   .trim();
  cleaned = cleaned.replace(/\s+/g, ' ');
  return cleaned || str.replace(/\.mp3/gi, '').trim(); 
}

function getArtistFromFilename(filename: string) {
  const clean = cleanString(filename);
  const parts = clean.split('-');
  return (parts.length > 1 ? parts[0].trim() : clean).toLowerCase();
}

async function fetchLyrics(artist: string, title: string) {
  const requestId = ++currentLyricRequest;
  lyricsText.textContent = "A procurar letras...";
  
  if (!artist || !title || artist === 'Local Track') {
    if (requestId === currentLyricRequest) lyricsText.textContent = "Não foi possível identificar a música.";
    return;
  }

  try {
    const response = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`);
    if (requestId !== currentLyricRequest) return; 

    if (response.ok) {
      const data = await response.json();
      if (data && data.lyrics) {
        lyricsText.textContent = data.lyrics.replace(/\r\n|\r|\n/g, '\n');
      } else {
        lyricsText.textContent = "Letras não encontradas nesta base de dados.";
      }
    } else {
      lyricsText.textContent = "Letras não encontradas nesta base de dados.";
    }
  } catch (error) {
    if (requestId === currentLyricRequest) {
      lyricsText.textContent = "Erro ao carregar as letras. A API pode estar indisponível.";
    }
  }
}

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
  if (modalCallback && modalInput.value.trim() !== '') modalCallback(modalInput.value.trim());
  closeModal();
});

minimizeBtn.addEventListener('click', () => window.electronAPI.minimizeWindow());
closeBtn.addEventListener('click', () => window.electronAPI.closeWindow());

window.electronAPI.loadPlaylist().then((savedData) => {
  if (savedData && !Array.isArray(savedData) && savedData.playlists) appData = savedData;
  else if (Array.isArray(savedData) && savedData.length > 0) appData.playlists['Default'] = savedData;
  
  updateSelectorUI();
  updatePlaylistUI();
  if (appData.playlists[appData.active].length > 0) {
    currentIndex = 0;
    loadTrack(currentIndex);
  }
});

function saveData() { window.electronAPI.savePlaylist(appData); }

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
  appData.active = (e.target as HTMLSelectElement).value;
  currentIndex = 0;
  resetPlayerUI();
  updatePlaylistUI();
  saveData();
  if (appData.playlists[appData.active].length > 0) loadTrack(currentIndex);
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
    } else { alert('Já existe uma playlist com esse nome!'); }
  });
});

renamePlaylistBtn.addEventListener('click', () => {
  if (appData.active === 'Default') return alert('Não podes mudar o nome da playlist Default.');
  openModal('Renomear Playlist:', appData.active, (newName) => {
    if (newName === appData.active) return;
    if (appData.playlists[newName]) return alert('Já existe uma playlist com esse nome!');
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
  progressBar.style.width = '0%';
  lyricsText.textContent = 'Sem letras disponíveis.';
}

function handleFilesAdded(files: File[]) {
  const audioFiles = files.filter(file => file.type.startsWith('audio/') || file.name.toLowerCase().endsWith('.mp3'));
  if (audioFiles.length > 0) {
    const activeList = appData.playlists[appData.active];
    const wasEmpty = activeList.length === 0;
    
    // Memoriza a música atual antes de reordenar
    let currentPlayingPath = activeList.length > 0 ? activeList[currentIndex].path : null;

    activeList.push(...audioFiles.map(f => ({ name: f.name, path: f.path })));
    
    // Ordenar alfabeticamente por Artista
    activeList.sort((a, b) => {
      const artistA = getArtistFromFilename(a.name);
      const artistB = getArtistFromFilename(b.name);
      return artistA.localeCompare(artistB);
    });

    // Atualiza o índice para a música não parar de tocar
    if (currentPlayingPath) {
      currentIndex = activeList.findIndex(t => t.path === currentPlayingPath);
      if (currentIndex === -1) currentIndex = 0;
    }

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
  if ((e.target as HTMLInputElement).files) handleFilesAdded(Array.from((e.target as HTMLInputElement).files!));
  (e.target as HTMLInputElement).value = '';
});

folderUpload.addEventListener('change', (e) => {
  if ((e.target as HTMLInputElement).files) handleFilesAdded(Array.from((e.target as HTMLInputElement).files!));
  (e.target as HTMLInputElement).value = '';
});

function updatePlaylistUI() {
  playlistBox.innerHTML = '';
  appData.playlists[appData.active].forEach((track, index) => {
    const item = document.createElement('div');
    item.classList.add('playlist-item');
    if (index === currentIndex) item.classList.add('active');
    
    const textSpan = document.createElement('span');
    textSpan.textContent = `${index + 1}. ${cleanString(track.name)}`;
    
    const removeBtn = document.createElement('span');
    removeBtn.textContent = '×';
    removeBtn.classList.add('remove-song-btn');
    
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const activeList = appData.playlists[appData.active];
      activeList.splice(index, 1);
      
      if (currentIndex === index) {
        if (activeList.length > 0) {
          currentIndex = currentIndex % activeList.length;
          loadTrack(currentIndex);
          playTrack();
        } else {
          resetPlayerUI();
        }
      } else if (currentIndex > index) {
        currentIndex--;
      }
      
      updatePlaylistUI();
      saveData();
    });
    
    item.addEventListener('click', () => {
      currentIndex = index;
      loadTrack(currentIndex);
      playTrack();
    });
    
    item.appendChild(textSpan);
    item.appendChild(removeBtn);
    playlistBox.appendChild(item);
  });
}

function applyFallbackMetadata(track: Track) {
  const cleanName = cleanString(track.name);
  const parts = cleanName.split('-');
  if (parts.length > 1) {
    trackArtist.textContent = parts[0].trim();
    trackTitle.textContent = parts.slice(1).join('-').trim();
  } else {
    trackArtist.textContent = 'Local Track';
    trackTitle.textContent = cleanName;
  }
  coverArt.removeAttribute('src');
  fetchLyrics(trackArtist.textContent, trackTitle.textContent);
}

function loadTrack(index: number) {
  const activeList = appData.playlists[appData.active];
  if (activeList.length === 0) return;
  const track = activeList[index];
  audioEngine.pause();
  audioEngine.src = `local-media://${encodeURIComponent(track.path)}`;
  updatePlaylistUI();

  fetch(`local-media://${encodeURIComponent(track.path)}`)
    .then(r => r.blob())
    .then(blob => {
      jsmediatags.read(blob, {
        onSuccess: function(tag: any) {
          const tags = tag.tags;
          trackTitle.textContent = cleanString(tags.title || track.name);
          trackArtist.textContent = cleanString(tags.artist || 'Local Track');
          
          if (tags.picture) {
            let base64String = "";
            for (let i = 0; i < tags.picture.data.length; i++) base64String += String.fromCharCode(tags.picture.data[i]);
            coverArt.src = `data:${tags.picture.format};base64,${window.btoa(base64String)}`;
          } else {
            coverArt.removeAttribute('src');
          }
          fetchLyrics(trackArtist.textContent, trackTitle.textContent);
        },
        onError: () => applyFallbackMetadata(track)
      });
    }).catch(() => applyFallbackMetadata(track));
}

function playTrack() {
  initVisualizer();
  audioEngine.play().catch((e) => alert(`Erro: ${e.message}`));
}

function pauseTrack() {
  audioEngine.pause();
}

function togglePlay() {
  if (appData.playlists[appData.active].length === 0) return;
  audioEngine.paused ? playTrack() : pauseTrack();
}

function playNextTrack() {
  const activeList = appData.playlists[appData.active];
  if (activeList.length === 0) return;
  if (isShuffle && activeList.length > 1) {
    let newIndex;
    do { newIndex = Math.floor(Math.random() * activeList.length); } while (newIndex === currentIndex);
    currentIndex = newIndex;
  } else { currentIndex = (currentIndex + 1) % activeList.length; }
  loadTrack(currentIndex);
  playTrack();
}

function playPrevTrack() {
  const activeList = appData.playlists[appData.active];
  if (activeList.length === 0) return;
  if (isShuffle && activeList.length > 1) {
    let newIndex;
    do { newIndex = Math.floor(Math.random() * activeList.length); } while (newIndex === currentIndex);
    currentIndex = newIndex;
  } else { currentIndex = (currentIndex - 1 + activeList.length) % activeList.length; }
  loadTrack(currentIndex);
  playTrack();
}

playBtn.addEventListener('click', togglePlay);
prevBtn.addEventListener('click', playPrevTrack);
nextBtn.addEventListener('click', playNextTrack);
audioEngine.addEventListener('ended', playNextTrack);

audioEngine.addEventListener('timeupdate', () => {
  if (audioEngine.duration > 0) progressBar.style.width = `${(audioEngine.currentTime / audioEngine.duration) * 100}%`;
});

progressContainer.addEventListener('click', (e) => {
  if (appData.playlists[appData.active].length === 0 || !audioEngine.duration) return;
  const rect = progressContainer.getBoundingClientRect();
  audioEngine.currentTime = (e.clientX - rect.left) / rect.width * audioEngine.duration;
});

// Atualiza o interface graficamente sempre que o estado real do audio muda
audioEngine.addEventListener('play', () => {
  vinylDisc.classList.add('playing');
  updatePlayIcon(true);
});

audioEngine.addEventListener('pause', () => {
  vinylDisc.classList.remove('playing');
  updatePlayIcon(false);
});

window.electronAPI.onMediaPlayPause(togglePlay);
window.electronAPI.onMediaNext(playNextTrack);
window.electronAPI.onMediaPrev(playPrevTrack);