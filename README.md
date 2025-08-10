# 🥁 KidBeat - Friendly Drum Machine

A fun, kid-friendly drum machine built with React and Web Audio API, optimized for iPad use.

## Features

- **16-step sequencer** with 4 drum tracks (Kick, Snare, Hi-Hat, Clap)
- **Real-time playback** with visual step indicator
- **Tempo control** (60-160 BPM) with swing timing
- **Per-track volume controls**
- **Pattern save/load** with localStorage
- **WAV export** for sharing beats
- **iPad optimized** with touch-friendly controls
- **PWA support** - install on home screen
- **Offline capable** - works without internet

## Technical Highlights

- Uses Web Audio API for low-latency, high-quality sound synthesis
- Optimized noise buffer reuse for better performance
- iOS audio context unlock for mobile compatibility
- Responsive grid layout that works on all screen sizes
- Dark mode support based on system preference

## Getting Started

### Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view in browser.

### Production Build

```bash
npm run build
npm start
```

### Static Export for Vercel

```bash
npm run build
```

The `out/` directory contains the static files ready for deployment.

## Deployment on Vercel

1. Push this repository to GitHub
2. Import the project on [Vercel](https://vercel.com)
3. Vercel will automatically detect Next.js and deploy
4. The app will be available at your Vercel domain

## iPad Usage Tips

- **Install as PWA**: In Safari, tap Share → Add to Home Screen
- **Landscape mode**: Optimized for landscape orientation
- **Touch targets**: All buttons are sized for comfortable touch interaction
- **Audio unlock**: Tap Play once to enable audio on iOS

## Browser Support

- **Chrome/Edge**: Full support
- **Safari**: Full support (including iOS)
- **Firefox**: Full support
- **Mobile browsers**: Optimized for touch interaction

## File Structure

```
├── pages/
│   ├── _app.js          # Next.js app wrapper
│   └── index.js         # Main page
├── src/
│   └── App.js           # Main React component
├── styles/
│   └── globals.css      # Global styles (iPad optimized)
├── public/
│   ├── manifest.json    # PWA manifest
│   ├── icon-192x192.png # App icon (add your own)
│   └── icon-512x512.png # App icon (add your own)
├── package.json
├── next.config.js       # Next.js configuration
└── README.md
```

## Customization

### Adding New Drum Sounds

Edit the `TRACKS` array in `src/App.js`:

```javascript
const TRACKS = [
  { id: 'kick',  label: 'Kick',  color: '#fecdd3', type: 'kick'  },
  { id: 'snare', label: 'Snare', color: '#bae6fd', type: 'snare' },
  // Add new tracks here
]
```

Then implement the sound synthesis function in the `scheduleHit` function.

### Styling Changes

All styles are in `styles/globals.css`. The CSS uses CSS custom properties and is fully responsive.

### Pattern Length

Change `STEPS` constant in `src/App.js` to modify the pattern length (default: 16).

## Performance Notes

- Uses memoized noise buffers to reduce CPU usage
- Optimized for 60fps on mobile devices  
- Minimal re-renders with proper React state management
- Efficient audio scheduling with lookahead

## License

MIT License - feel free to use this project as a starting point for your own drum machine!

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test on multiple devices (especially iPad)
5. Submit a pull request

## Known Issues

- Some older browsers may not support all Web Audio API features
- Audio latency varies by device and browser
- Export feature requires modern browser with Blob support

## Future Enhancements

- [ ] More drum sounds and synthesis options
- [ ] Pattern chaining for longer compositions
- [ ] MIDI support for external controllers
- [ ] Collaborative real-time editing
- [ ] Built-in effects (reverb, filter, etc.)

---

**Have fun making beats! 🎵**