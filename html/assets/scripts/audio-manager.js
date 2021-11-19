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

  exports.AudioManager = class AudioManager {
    #audioCtx = new AudioContext();

    #bgmAudioElem;
    #rainBufferSource;
    #rainGain;
    #volumeLavel = 0;
    #rainMuted = false;

    #bgmAvailablePromise;
    #rainAvailablePromise;

    constructor() {
      this.#load();
    }

    #load() {
      this.#setBGMAvailablePromise();
      this.#setRainAvailablePromise();
    }

    getAudioAvailablePromise() {
      return Promise.all[
        (this.#bgmAvailablePromise, this.#rainAvailablePromise)
      ];
    }

    #setBGMAvailablePromise() {
      this.#bgmAudioElem = new Audio();

      this.#bgmAvailablePromise = new Promise((resolve, reject) => {
        this.#bgmAudioElem.addEventListener(
          'canplaythrough',
          () => {
            resolve();
          },
          { once: true }
        );

        this.#bgmAudioElem.addEventListener(
          'error',
          (evt) => {
            reject(evt.error);
          },
          { once: true }
        );

        this.#bgmAudioElem.loop = true;
        this.#bgmAudioElem.src = BGM_FILENAME;
      });
    }

    #setRainAvailablePromise() {
      this.#rainGain = this.#audioCtx.createGain();
      this.#rainGain.connect(this.#audioCtx.destination);

      this.#rainBufferSource = this.#audioCtx.createBufferSource();
      this.#rainBufferSource.connect(this.#rainGain);
      this.#rainBufferSource.loop = true;

      this.#rainAvailablePromise = fetch(RAIN_FILENAME)
        .then((resp) => resp.arrayBuffer())
        .then(
          (arrayBuffer) =>
            new Promise((resolve, reject) => {
              this.#audioCtx.decodeAudioData(
                arrayBuffer,
                (audioBuffer) => {
                  this.#rainBufferSource.buffer = audioBuffer;
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
        this.#bgmAudioElem.pause();
      } catch (e) {
        console.error(e);
      }

      try {
        this.#bgmAudioElem.currentTime = 0;
      } catch (e) {
        console.error(e);
      }

      this.#volumeLavel = 0;
      this.#setRainVolume();
    }

    playAndSetVolume(volumeLevelStr) {
      this.#bgmAudioElem.play();

      try {
        this.#rainBufferSource.start();
      } catch (e) {
        console.error(e);
      }

      const volumeLevel = VOL_LEVEL.get(volumeLevelStr);
      this.#volumeLavel = volumeLevel;

      this.#bgmAudioElem.volume = volumeLevel;
      this.#setRainVolume();
    }

    muteRain() {
      this.#rainMuted = true;
      this.#setRainVolume();
    }

    unmuteRain() {
      this.#rainMuted = false;
      this.#setRainVolume();
    }

    #setRainVolume() {
      this.#rainGain.gain.value = this.#rainMuted
        ? 0
        : this.#volumeLavel * RAIN_VOL_MULTIPLIER;
    }
  };
})(window);
