// This is part of Hakuu, a web site, and is licensed under AGPLv3.
// Copyright (C) 2018-2021 Min-Zhong Lu

'use strict';

(function (exports) {
  const PREHENSION_KEYBOARD_ACTIONS = new Map([
    ['ArrowUp', 'prev'],
    ['ArrowLeft', 'prev'],
    ['ArrowDown', 'next'],
    ['ArrowRight', 'next'],
  ]);

  function getPaperBackgroundSVGURL() {
    return 〆.svgXMLToDataURL($('#paper-background').outerHTML);
  }

  function cubicBézier(t, p0, p1, p2, p3) {
    return (
      (1 - t) ** 3 * p0 +
      3 * (1 - t) ** 2 * t * p1 +
      3 * (1 - t) * t ** 2 * p2 +
      t ** 3 * p3
    );
  }

  const INIT_RAINING = true;

  // TODO: Streamline state transitions
  exports.SiteController = class SiteController {
    #initPageName;

    #canvasController;
    #contentManager;
    #audioManager;

    #smallViewSideBarToggleRequestAnimationDirection;
    #smallViewSideBarToggleRequestAnimationId;
    #smallViewSideBarToggleBase = $('#small-view-sidebar-toggle-base');
    #smallViewSideBarToggleFold = $('#small-view-sidebar-toggle-fold');
    #smallViewSideBarToggleBoxSize = parseInt(
      $('#small-view-sidebar-toggle > svg')
        .getAttribute('viewBox')
        .split(' ')[2]
    );
    #smallViewSideBarToggleAnimationStart = 0;

    constructor(initPageName, contentManager, canvasController, audioManager) {
      this.#initPageName = initPageName;

      this.#canvasController = canvasController;
      this.#canvasController.onLoadingState = (state) => {
        this.#loading = state;
      };
      this.#canvasController.getPaperBackgroundSVGURL = () => {
        this.#updateBackgroundDimension();
        return getPaperBackgroundSVGURL();
      };

      this.#contentManager = contentManager;
      this.#audioManager = audioManager;

      this.#renderSmallViewSidebarToggle(0);
    }

    get #raining() {
      return $('#rain-control').dataset.raining === 'true';
    }
    set #raining(raining) {
      $('#rain-control').dataset.raining = raining;
      if (raining) {
        this.#audioManager.unmuteRain();
      } else {
        this.#audioManager.muteRain();
      }
    }

    get #volumeLevel() {
      return $('#volume-control').dataset.level;
    }
    set #volumeLevel(volumeLevel) {
      $('#volume-control').dataset.level = volumeLevel;
    }

    set #loading(loading) {
      $('body').classList.toggle('loading', loading);
    }

    set #audioAvailable(audioAvailable) {
      $('body').classList.toggle('audio-available', audioAvailable);
    }

    set #currentPage(currentPage) {
      $('body').dataset.currentPage = currentPage;
      $('#small-view-header-page-title').textContent = $(
        `#main-menu li[data-page="${currentPage}"]`
      ).textContent;
    }

    #initEventListeners() {
      // requestAnimationFrame: sometimes Chrome doesn't have proper
      // getBoundingRect just at DOMContentLoaded
      document.addEventListener('DOMContentLoaded', async () => {
        // waiting for $indexStyleSheet such that $isSmallView is usable
        await Promise.all([〆.frame(), 〆.indexStyleSheet]);
        this.#onReady();
      });

      this.#setupDevicePixelRatioListener();

      window.addEventListener('resize', this.#onResize);
      window.addEventListener('keydown', this.#onKeydown);

      $('#main-menu').addEventListener('click', this.#onMainMenuClick);

      $('#rain-control').addEventListener('click', this.#onRainMenuClick);

      $('#volume-control').addEventListener('click', this.#onVolumeMenuClick);

      $$('.prehension-control').forEach((parent) =>
        parent.addEventListener('click', this.#onPrehensionMenuClick)
      );

      $('#small-view-sidebar-toggle').addEventListener(
        'click',
        this.#onSmallViewSidebarToggleClick
      );

      // hack to trigger mobile safari's :active status
      $('#sidebar').addEventListener('touchstart', () => undefined);

      $('#sidebar').addEventListener('click', this.#onSidebarClick);

      // disallow scrolling on sidebar and small header
      $$('#sidebar, #small-view-header').forEach((elem) => {
        elem.addEventListener('touchmove', (evt) => {
          evt.preventDefault();
        });
      });
    }

    #setupDevicePixelRatioListener() {
      const generateNewQuery = () => {
        matchMedia(
          `(resolution: ${window.devicePixelRatio}dppx)`
        ).addEventListener(
          'change',
          () => {
            this.#onResize();
            generateNewQuery();
          },
          { once: true }
        );
      };
      generateNewQuery();
    }

    #onReady() {
      this.#raining = INIT_RAINING;

      this.#initBackgroundPaperParams();
      this.#updateBackgroundDimension();

      this.#canvasController.ready();

      this.#canvasController.start();

      this.#switchPage(this.#initPageName);
    }

    #onResize = () => {
      this.#canvasController.onResize();

      this.#updateBackgroundDimension();
    };

    #onKeydown = (evt) => {
      if (evt.shiftKey || evt.altKey || evt.ctrlKey || evt.isComposing) return;

      const action = PREHENSION_KEYBOARD_ACTIONS.get(evt.key);
      if (!action) return;

      this.#canvasController.inPageSwitchView(action);
      evt.preventDefault();
      evt.stopPropagation();
    };

    #onMainMenuClick = (evt) => {
      if (!(evt.target instanceof HTMLLIElement)) {
        return;
      }

      evt.stopPropagation();

      this.#switchPage(evt.target.dataset.page);
      this.#toggleSmallViewSidebar(false);
    };

    #onRainMenuClick = (evt) => {
      evt.stopPropagation();

      if (!(evt.target instanceof HTMLSpanElement)) {
        return;
      }

      if (evt.target.id.endsWith('stop') && this.#raining) {
        this.#raining = false;
        this.#canvasController.raining = false;
        this.#canvasController.restartRainEngine();
      } else if (evt.target.id.endsWith('start') && !this.#raining) {
        this.#raining = true;
        this.#canvasController.raining = true;
        this.#canvasController.restartRainEngine();
      }
    };

    #onVolumeMenuClick = (evt) => {
      evt.stopPropagation();

      if (!(evt.target instanceof HTMLSpanElement)) {
        return;
      }

      const { level } = evt.target.dataset;

      this.#volumeLevel = level;

      if (level === 'silent') {
        this.#audioManager.stop();
      } else {
        this.#audioManager.playAndSetVolume(level);
      }
    };

    #onPrehensionMenuClick = (evt) => {
      evt.stopPropagation();

      if (!(evt.target instanceof HTMLSpanElement)) {
        return;
      }

      const { action } = evt.target.dataset;

      this.#canvasController.inPageSwitchView(action);
    };

    #onSidebarClick = () => {
      this.#toggleSmallViewSidebar(false);
    };

    #onSmallViewSidebarToggleClick = () => {
      this.#toggleSmallViewSidebar();
    };

    #toggleSmallViewSidebar(state) {
      $('body').classList.toggle('small-view-sidebar-visible', state);
      cancelAnimationFrame(this.#smallViewSideBarToggleRequestAnimationId);

      this.#smallViewSideBarToggleRequestAnimationDirection = $(
        'body'
      ).classList.contains('small-view-sidebar-visible')
        ? 'forward'
        : 'backward';

      this.#smallViewSideBarToggleAnimationStart = performance.now();
      this.#smallViewSideBarToggleRequestAnimationId = requestAnimationFrame(
        this.animateSmallViewSidebarToggle
      );
    }

    animateSmallViewSidebarToggle = () => {
      const elapsed =
        performance.now() - this.#smallViewSideBarToggleAnimationStart;
      const totalTime =
        〆.computedStyle(
          'html',
          '--small-view-sidebar-transition-duration',
          parseFloat
        ) * 1000;

      const phase = cubicBézier(
        Math.min(elapsed / totalTime, 1),
        0,
        0.8,
        0.8,
        1
      );

      const actualPhase =
        this.#smallViewSideBarToggleRequestAnimationDirection === 'forward'
          ? phase
          : 1 - phase;
      this.#renderSmallViewSidebarToggle(actualPhase);

      if (phase < 1) {
        this.#smallViewSideBarToggleRequestAnimationId = requestAnimationFrame(
          this.animateSmallViewSidebarToggle
        );
      }
    };

    #renderSmallViewSidebarToggle(phase) {
      const SIDE = this.#smallViewSideBarToggleBoxSize;

      const BORDER_RADIUS_FACTOR = 0.1;
      const FOLDING_FACTOR = 2.5;
      const FOLDING_OFFSET_FACTOR = 0.1;

      const BORDER_RADIUS = SIDE * BORDER_RADIUS_FACTOR;
      const FOLDING_OFFSET = SIDE * FOLDING_OFFSET_FACTOR;

      const foldingXInterpolated =
        SIDE -
        BORDER_RADIUS +
        (BORDER_RADIUS * FOLDING_FACTOR - (SIDE - BORDER_RADIUS * 0.5)) * phase;
      const foldingYInterpolated =
        BORDER_RADIUS +
        (SIDE - BORDER_RADIUS * FOLDING_FACTOR - BORDER_RADIUS) * phase;

      this.#smallViewSideBarToggleBase.setAttribute(
        'd',
        `
          M 0 ${BORDER_RADIUS}
          A ${BORDER_RADIUS} ${BORDER_RADIUS} 0 0 1 ${BORDER_RADIUS} 0
          H ${foldingXInterpolated}
          L ${SIDE}, ${foldingYInterpolated}
          V ${SIDE - BORDER_RADIUS}
          A ${BORDER_RADIUS} ${BORDER_RADIUS} 0 0 1 ${
          SIDE - BORDER_RADIUS
        } ${SIDE}
          H ${BORDER_RADIUS}
          A ${BORDER_RADIUS} ${BORDER_RADIUS} 0 0 1 0 ${SIDE - BORDER_RADIUS}
          z
        `
      );

      this.#smallViewSideBarToggleFold.setAttribute(
        'd',
        `
          M ${foldingXInterpolated}, 0
          L ${foldingXInterpolated + FOLDING_OFFSET}, ${
          foldingYInterpolated + FOLDING_OFFSET
        }
          L ${SIDE}, ${foldingYInterpolated}
          z
          `
      );
    }

    // paper background inspired by https://tympanus.net/codrops/2019/02/19/svg-filter-effects-creating-texture-with-feturbulence/
    #initBackgroundPaperParams() {
      const lightingAzimuth = ~~(Math.random() * 360);

      const lightingColor = `hsl(${〆.computedStyle(
        '#site-root',
        '--background-hue'
      )},${〆.computedStyle(
        '#site-root',
        '--background-saturation'
      )},${〆.computedStyle('#site-root', '--background-lightness')})`;

      // chrome needs a fill for the svg to work as img.src (probably due to optimization)
      const fillColor = 〆.computedStyle('#site-root', 'background-color');

      $('#paper-background feDiffuseLighting').setAttribute(
        'lighting-color',
        lightingColor
      );

      $('#paper-background feDistantLight').setAttribute(
        'azimuth',
        lightingAzimuth
      );

      $('#paper-background rect').setAttribute('fill', fillColor);
    }

    #updateBackgroundDimension() {
      $('#paper-background').setAttribute('width', window.innerWidth);
      $('#paper-background').setAttribute('height', window.innerHeight);
    }

    // eslint-disable-next-line class-methods-use-this
    #handleFontBlobPromises(fontBlobPromises) {
      fontBlobPromises.forEach((promise, fontName) => {
        promise.then((blob) => {
          const styleElem = $e('style');

          const url = URL.createObjectURL(blob);

          styleElem.textContent = `
          @font-face {
            font-family: 'MIH ${fontName.toUpperCase()}';
            font-weight: ${〆.computedStyle('body', 'font-weight')};
            src: url('${url}') format('woff2');
            font-display: block;
          }
        `;

          $('head').appendChild(styleElem);
        });
      });
    }

    async #handleAudioAvailablePromise(audioAvailablePromise) {
      await audioAvailablePromise;

      this.#audioAvailable = true;

      $('#volume-control > span[data-level="silent"]').click();
    }

    async #switchPage(pageName) {
      this.#loading = true;

      await this.#canvasController.stopPage();

      this.#currentPage = pageName;

      const pageSourcePromise =
        this.#contentManager.getPageSourcePromise(pageName);

      this.#canvasController.pageSourcePromise = pageSourcePromise;

      this.#canvasController.startPage();
    }

    init() {
      this.#loading = true;

      const fontBlobPromises = this.#contentManager.getFontBlobPromises();
      this.#canvasController.fontBlobPromises = fontBlobPromises;

      this.#canvasController.pagesStyleSheetPromise =
        this.#contentManager.getPagesStyleSheetPromise();

      this.#initEventListeners();

      this.#handleFontBlobPromises(fontBlobPromises);

      this.#handleAudioAvailablePromise(
        this.#audioManager.getAudioAvailablePromise()
      );
    }
  };
})(window);
