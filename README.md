# Eclipse Player

A minimalist and elegant local music player built with Electron. Features a side-by-side design, dark/neon theme, metadata reading with a dynamic vinyl record, real-time audio visualization, automatic lyrics fetching, and advanced playlist management.

![Eclipse Player Screenshot](./screenshot.png)

## Features

* **Side-by-Side Interface**: Responsive and resizable layout for maximum visibility of tracks and controls.
* **Metadata Reading (ID3)**: Automatic extraction of track name, artist, and album cover directly from audio files.
* **Dynamic Vinyl & Visualizer**: The album cover is displayed in the center of a vinyl record that spins during playback, accompanied by a real-time glowing audio frequency visualizer.
* **Smart Lyrics Integration**: Automatically fetches and displays lyrics for the currently playing track via an external API (`lyrics.ovh`).
* **Playlist Management**:
  * Create multiple custom playlists.
  * Rename, clear, and delete specific tracks from lists.
  * Auto-sorting: Imported tracks are automatically sorted alphabetically by artist.
  * Data persistence: Playlists and tracks are saved locally and loaded when the app starts.
* **Mass Import Dropdown**: Load individual audio files or entire directories seamlessly through a unified top-bar menu.
* **Global Media Shortcuts**: Control playback (Play/Pause, Next, Previous) using your keyboard's physical media keys, even when the app is minimized.
* **Advanced Audio Engine**: Support for local streaming via a custom protocol (`local-media://`), allowing seamless seeking through the track timeline and precision volume control.
* **Shuffle Mode**: Smart track mixing that ensures the previous track is not repeated.
* **Custom Window**: Native frameless design without standard operating system borders.

## Technologies Used

* [Electron](https://www.electronjs.org/)
* [Vite](https://vitejs.dev/)
* [TypeScript](https://www.typescriptlang.org/)
* [esbuild](https://esbuild.github.io/)
* [electron-builder](https://www.electron.build/)
* [jsmediatags](https://github.com/aadsm/jsmediatags)
* Pure HTML5 & CSS3

## How to Run the Project

git clone https://github.com/bernam07/eclipse-player.git
cd eclipse-player

npm install

**Open 2 terminals and run:**

npm run dev

npm run start

## How to Build

**To package the application and create a standalone Windows installer (.exe), run:**

npm run dist

## License

This project is open-source and available under the [MIT](LICENSE) license.