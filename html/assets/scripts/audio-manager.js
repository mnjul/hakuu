// This is part of Hakuu, a web site, and is licensed under AGPLv3.
// Copyright (C) 2018-2021 Min-Zhong Lu

'use strict';

(function (exports) {
  const VOL_LEVEL = new Map([
    ['silent', 0],
    ['low', 0.2],
    ['medium', 0.6],
    ['loud', 1],
  ]);

  const RAIN_FILENAME = 'assets/bgm/rain.wav';
  const BGM_FILENAME = 'assets/bgm/bgm.mp3';

  const RAIN_VOL_MULTIPLIER = 1.1; // instead of having another GainNode

  const AudioContext = window.AudioContext || window.webkitAudioContext;

  let _;

  class AudioManager {
    constructor() {
      _(this)._audioCtx = new AudioContext();

      _(this)._bgmAudioElem = undefined;
      _(this)._rainBufferSource = undefined;
      _(this)._rainGain = undefined;
      _(this)._volumeLavel = 0;
      _(this)._rainMuted = false;

      _(this)._bgmAvailablePromise = undefined;
      _(this)._rainAvailablePromise = undefined;
      _(this)._load();
    }

    _load() {
      _(this)._setBGMAvailablePromise();
      _(this)._setRainAvailablePromise();
    }

    getAudioAvailablePromise() {
      return Promise.all[
        (_(this)._bgmAvailablePromise, _(this)._rainAvailablePromise)
      ];
    }

    _setBGMAvailablePromise() {
      _(this)._bgmAudioElem = new Audio();

      _(this)._bgmAvailablePromise = new Promise((resolve, reject) => {
        _(this)._bgmAudioElem.addEventListener(
          'canplaythrough',
          () => {
            resolve();
          },
          { once: true }
        );

        _(this)._bgmAudioElem.addEventListener(
          'error',
          (evt) => {
            reject(evt.error);
          },
          { once: true }
        );

        _(this)._bgmAudioElem.loop = true;
        _(this)._bgmAudioElem.src = BGM_FILENAME;
      });
    }

    _setRainAvailablePromise() {
      _(this)._rainGain = _(this)._audioCtx.createGain();
      _(this)._rainGain.connect(_(this)._audioCtx.destination);

      _(this)._rainBufferSource = _(this)._audioCtx.createBufferSource();
      _(this)._rainBufferSource.connect(_(this)._rainGain);
      _(this)._rainBufferSource.loop = true;

      _(this)._rainAvailablePromise = fetch(RAIN_FILENAME)
        .then((resp) => resp.arrayBuffer())
        .then(
          (arrayBuffer) =>
            new Promise((resolve, reject) => {
              _(this)._audioCtx.decodeAudioData(
                arrayBuffer,
                (audioBuffer) => {
                  _(this)._rainBufferSource.buffer = audioBuffer;
                  resolve();
                },
                (error) => {
                  reject(error);
                }
              );
            })
        );
    }

    // We can't really stop an AudioBufferSourceNode, but since it's just playing
    // looped rain sound, the hack is to mute it (and disregarding exception when
    // we call start() again.
    stop() {
      try {
        _(this)._bgmAudioElem.pause();
      } catch (e) {
        console.error(e);
      }

      try {
        _(this)._bgmAudioElem.currentTime = 0;
      } catch (e) {
        console.error(e);
      }

      _(this)._volumeLavel = 0;
      _(this)._setRainVolume();
    }

    playAndSetVolume(volumeLevelStr) {
      _(this)._bgmAudioElem.play();

      try {
        _(this)._rainBufferSource.start();
      } catch (e) {
        console.error(e);
      }

      const volumeLevel = VOL_LEVEL.get(volumeLevelStr);
      _(this)._volumeLavel = volumeLevel;

      _(this)._bgmAudioElem.volume = volumeLevel;
      _(this)._setRainVolume();
    }

    muteRain() {
      _(this)._rainMuted = true;
      _(this)._setRainVolume();
    }

    unmuteRain() {
      _(this)._rainMuted = false;
      _(this)._setRainVolume();
    }

    _setRainVolume() {
      _(this)._rainGain.gain.value = _(this)._rainMuted
        ? 0
        : _(this)._volumeLavel * RAIN_VOL_MULTIPLIER;
    }
  }

  _ = window.createInternalFunction(AudioManager);
  if (window.DEBUG) window.internalFunctions[AudioManager] = _;

  exports.AudioManager = AudioManager;
})(window);
