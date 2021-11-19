// This is part of Hakuu, a web site, and is licensed under AGPLv3.
// Copyright (C) 2018-2021 Min-Zhong Lu

'use strict';

// Rain-related code heavily modified from http://tympanus.net/codrops/2015/11/04/rain-water-effect-experiments/

(function (exports) {
  const getScale = (dppx) => (〆.isSmallView() ? 0.6 : 0.8) * dppx;

  const isImageBitmapAndWorkerWithOffscreenCanvasSupported =
    window.createImageBitmap &&
    window.Worker &&
    window.OffscreenCanvas &&
    (() => {
      try {
        new OffscreenCanvas(1, 1).getContext('2d');
        return true;
      } catch (e) {
        return false;
      }
    })();

  const dropAlphaBase64 =
    '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';
  const dropColorBase64 =
    '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';

  function getWorkerRunnerShim(runner) {
    // We can't directly use MessageChannel / MessagePort here since it won't be able to clone
    // a non-offscreen canvas, or a image that's actually a canvas (when
    // imagebitmap is not supported).

    class Port extends EventTarget {
      postMessage(message, ignored) {
        this.dispatchEvent(
          new MessageEvent('message', {
            data: message,
          })
        );
      }
    }

    const port1 = new Port();
    const port2 = new Port();

    runner({
      addEventListener: port1.addEventListener.bind(port1),
      removeEventListener: port1.removeEventListener.bind(port1),
      postMessage: port2.postMessage.bind(port2),
    });

    return {
      addEventListener: port2.addEventListener.bind(port2),
      removeEventListener: port2.removeEventListener.bind(port2),
      postMessage: port1.postMessage.bind(port1),
    };
  }

  exports.RainEngineClient = class RainEngineClient {
    static R_BRIGHTNESS = 0.96;
    static R_ALPHAMULTIPLY = 3;

    static rainEngine;

    #worker = isImageBitmapAndWorkerWithOffscreenCanvasSupported
      ? new Worker(
          URL.createObjectURL(
            new Blob(['(' + RainEngineClient.rainEngine.toString() + ')()'], {
              type: 'text/javascript',
            })
          )
        )
      : getWorkerRunnerShim(RainEngineClient.rainEngine);

    #sentDropImages;

    constructor(viewportCanvas) {
      const offscreenCanvas = isImageBitmapAndWorkerWithOffscreenCanvasSupported
        ? viewportCanvas.transferControlToOffscreen()
        : viewportCanvas;

      this.#worker.postMessage(
        {
          type: 'init',
          payload: {
            targetCanvas: offscreenCanvas,
            backgroundColor: 〆.computedStyle('#site-root', 'background-color'),
            rainDropsConfig: {
              minR: 10,
              maxR: 30,
              maxDrops: 400,
              rainChance: 0.3,
              rainLimit: 10,
              dropletsRate: 0.04,
              dropletsSize: [2, 10],
              collisionRadiusIncrease: 0.0002,
              trailRate: 100000,
              spawnArea: [0.05, 1],
              trailScaleRange: [0.2, 0.45],
              collisionRadius: 1,
              dropletsCleaningRadiusMultiplier: 2,
              dropFallMultiplier: 5,
              globalTimeScale: 1.2,
            },
          },
        },
        isImageBitmapAndWorkerWithOffscreenCanvasSupported
          ? [offscreenCanvas]
          : []
      );

      this.#sentDropImages = this.#sendDropImagesToWorker();
    }

    async start(width, height, dppx, raining) {
      const constructedPromise = new Promise((resolve) => {
        const onMessage = ({ data: { type } }) => {
          if (type === 'started') {
            resolve();

            this.#worker.removeEventListener('message', onMessage);
          }
        };

        this.#worker.addEventListener('message', onMessage);
      });

      await this.#sentDropImages;

      this.#worker.postMessage({
        type: 'start',
        payload: {
          width,
          height,
          scale: getScale(dppx),
          raining,
          rendererConfig: {
            brightness: RainEngineClient.R_BRIGHTNESS,
            alphaMultiply: RainEngineClient.R_ALPHAMULTIPLY,
            alphaSubtract: 0,
            minRefraction: 1,
            maxRefraction: 20,
          },
        },
      });

      await constructedPromise;
    }

    destroy() {
      this.#worker.postMessage({ type: 'destroy' });
    }

    updateContent(imageBitmap) {
      this.#worker.postMessage(
        { type: 'contentupdate', payload: imageBitmap },
        [imageBitmap]
      );
    }

    resize(width, height, dppx) {
      this.#worker.postMessage({
        type: 'resize',
        payload: { width, height, scale: getScale(dppx) },
      });
    }

    async #sendDropImagesToWorker() {
      const [dropAlphaImageBitmap, dropColorImageBitmap] = await Promise.all([
        〆.convertImageURLToImageBitmap(
          `data:image/png;base64,${dropAlphaBase64}`,
          〆.convertToImageBitmapIfPossible
        ),
        〆.convertImageURLToImageBitmap(
          `data:image/png;base64,${dropColorBase64}`,
          〆.convertToImageBitmapIfPossible
        ),
      ]);

      this.#worker.postMessage(
        {
          type: 'loadDropImages',
          payload: {
            dropAlphaImageBitmap,
            dropColorImageBitmap,
          },
        },
        [dropAlphaImageBitmap, dropColorImageBitmap]
      );
    }
  };
})(window);
