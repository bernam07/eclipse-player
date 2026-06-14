export {};

declare global {
  interface Window {
    electronAPI: {
      closeWindow: () => void;
      minimizeWindow: () => void;
    };
    jsmediatags: any;
  }
}

const jsmediatags = window.jsmediatags;

const audioEngine = document.getElementById('audio-engine') as HTMLAudioElement;
const fileUpload = document.getElementById('file-upload') as HTMLInputElement;
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
const folderUpload = document.getElementById('folder-upload') as HTMLInputElement;

let playlist: File[] = [];
let currentIndex = 0;

minimizeBtn.addEventListener('click', () => {
  window.electronAPI.minimizeWindow();
});

closeBtn.addEventListener('click', () => {
  window.electronAPI.closeWindow();
});

fileUpload.addEventListener('change', (e) => {
  const target = e.target as HTMLInputElement;
  
  if (target.files && target.files.length > 0) {
    const newFiles = Array.from(target.files);
    const wasEmpty = playlist.length === 0;
    
    playlist.push(...newFiles);
    updatePlaylistUI();
    
    if (wasEmpty) {
      currentIndex = 0;
      loadTrack(currentIndex);
      playTrack();
    }
    
    target.value = '';
  }
});

function updatePlaylistUI() {
  playlistBox.innerHTML = '';
  playlist.forEach((file, index) => {
    const item = document.createElement('div');
    item.classList.add('playlist-item');
    if (index === currentIndex) item.classList.add('active');
    
    item.textContent = `${index + 1}. ${file.name.replace('.mp3', '')}`;
    
    item.addEventListener('click', () => {
      currentIndex = index;
      loadTrack(currentIndex);
      playTrack();
    });
    
    playlistBox.appendChild(item);
  });
}

folderUpload.addEventListener('change', (e) => {
  const target = e.target as HTMLInputElement;
  
  if (target.files && target.files.length > 0) {
    const allFiles = Array.from(target.files);
    
    const audioFiles = allFiles.filter(file => 
      file.type.startsWith('audio/') || file.name.toLowerCase().endsWith('.mp3')
    );

    if (audioFiles.length > 0) {
      const wasEmpty = playlist.length === 0;
      
      playlist.push(...audioFiles);
      updatePlaylistUI();
      
      if (wasEmpty) {
        currentIndex = 0;
        loadTrack(currentIndex);
        playTrack();
      }
    }
    
    target.value = '';
  }
});

function loadTrack(index: number) {
  if (playlist.length === 0) return;
  const file = playlist[index];
  
  audioEngine.pause();
  const fileURL = URL.createObjectURL(file);
  audioEngine.src = fileURL;
  audioEngine.load();
  
  updatePlaylistUI();

  jsmediatags.read(file, {
    onSuccess: function(tag: any) {
      const tags = tag.tags;
      trackTitle.textContent = tags.title || file.name.replace('.mp3', '');
      trackArtist.textContent = tags.artist || 'Local Track';

      if (tags.picture) {
        const byteArray = new Uint8Array(tags.picture.data);
        const blob = new Blob([byteArray], { type: tags.picture.format });
        coverArt.src = URL.createObjectURL(blob);
      } else {
        coverArt.removeAttribute('src');
      }
    },
    onError: function() {
      const cleanName = file.name.replace('.mp3', '');
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
  });
}

function playTrack() {
  audioEngine.play().then(() => {
    vinylDisc.classList.add('playing');
    playIcon.setAttribute('d', 'M6 19h4V5H6v14zm8-14v14h4V5h-4z');
  }).catch(() => {
    alert("O sistema bloqueou a reprodução. Tenta clicar no botão PLAY manualmente.");
  });
}

function pauseTrack() {
  audioEngine.pause();
  vinylDisc.classList.remove('playing');
  playIcon.setAttribute('d', 'M8 5v14l11-7z');
}

playBtn.addEventListener('click', () => {
  if (playlist.length === 0) return;
  if (audioEngine.paused) {
    playTrack();
  } else {
    pauseTrack();
  }
});

prevBtn.addEventListener('click', () => {
  if (playlist.length === 0) return;
  currentIndex = (currentIndex - 1 + playlist.length) % playlist.length;
  loadTrack(currentIndex);
  playTrack();
});

nextBtn.addEventListener('click', () => {
  if (playlist.length === 0) return;
  currentIndex = (currentIndex + 1) % playlist.length;
  loadTrack(currentIndex);
  playTrack();
});

audioEngine.addEventListener('timeupdate', () => {
  const current = audioEngine.currentTime;
  const duration = audioEngine.duration;
  if (duration > 0) {
    const percentage = (current / duration) * 100;
    progressBar.style.width = `${percentage}%`;
  }
});

audioEngine.addEventListener('ended', () => {
  currentIndex = (currentIndex + 1) % playlist.length;
  loadTrack(currentIndex);
  playTrack();
});

progressContainer.addEventListener('click', (e) => {
  if (playlist.length === 0) return;
  const rect = progressContainer.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const width = rect.width;
  const percentage = clickX / width;
  audioEngine.currentTime = percentage * audioEngine.duration;
});