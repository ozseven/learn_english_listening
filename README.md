# 🎧 LearnEnglish
> Dynamic YouTube dictation and listening application.

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)]()
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)]()


## What it is
LearnEnglish is a language learning application that automatically extracts subtitles from any YouTube video and splits them into logical sentences. It creates an interactive dictation test where you reorder scrambled words to form correct sentences.

## Why use it
It solves the problem of finding suitable listening materials for language practice. You can use any YouTube video to instantly generate custom, interactive dictation tests instead of relying on pre-made static courses.

## How to install
You need Docker and Docker Compose installed on your system.

```bash
# Clone the repository
git clone https://github.com/username/learn_english_listening.git

# Navigate to the project directory
cd learn_english_listening

# Build and run the containers
docker-compose up -d --build
```

You can now access the frontend at `http://localhost:1212` and the backend at `http://localhost:5000`.

## How to use
Once the application is running, start a test by entering a YouTube URL into the main search box.

```text
https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

1. Enter the YouTube link and click "Start".
2. Listen to the video as it plays the specific sentence segment.
3. Drag and drop the scrambled word cards to form the correct English sentence.
4. The system validates your placement instantly. 

## Contributing
You can contribute by creating a Pull Request. Fork the repository, create a feature branch, commit your changes, and open a PR against the `main` branch.

## License
This project is licensed under the MIT License.
