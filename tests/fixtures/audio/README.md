These tiny silent audio fixtures were generated with FFmpeg for playlist codec
validation. Tests use real media and require `ffprobe` on PATH, but do not require
`ffmpeg` to generate fixtures at runtime.

Each command uses the following common input options:

```sh
ffmpeg -f lavfi -i anullsrc=r=44100:cl=stereo -t 0.1 -map_metadata -1 <output options>
```

| Fixture | Output options | Purpose |
| --- | --- | --- |
| `mp3.mp3` | `-c:a libmp3lame -b:a 128k mp3.mp3` | Genuine MP3; accepted unchanged. |
| `aac.mp4` | `-c:a aac -b:a 128k -movflags +frag_keyframe+empty_moov aac.mp4` | AAC in fragmented MP4, reproducing the mislabeled Lo-Fi files. |
| `mp3.mp4` | `-c:a libmp3lame -b:a 128k mp3.mp4` | MP3 codec in the wrong container. |
| `mp2.mp2` | `-c:a mp2 -b:a 128k -f mp2 mp2.mp2` | MPEG Layer II, which ffprobe reports in an MP3 container. |
