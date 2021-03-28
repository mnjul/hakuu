// This is part of Hakuu, a web site, and is licensed under AGPLv3.
// Copyright (C) 2018-2021 Min-Zhong Lu

'use strict';

(function (exports) {
  const PAPER_BACKGROUND_BASE_ELEVATION = 54;
  // firefox's distantlight is darker than other browsers.
  const PAPER_BACKGROUND_FIREFOX_ELEVATION_FACTOR = 1.25;

  const paperBackgroundLightingAzimuth = ~~(Math.random() * 360);
  const paperBackgroundLightingElevation =
    PAPER_BACKGROUND_BASE_ELEVATION *
    (〆.$isFirefox ? PAPER_BACKGROUND_FIREFOX_ELEVATION_FACTOR : 1);

  const paperBackgroundLightingColor = `hsl(${〆.$computedStyle(
    'html',
    '--background-hue'
  )},${〆.$computedStyle(
    'html',
    '--background-saturation'
  )},${〆.$computedStyle('html', '--background-lightness')})`;

  const PREHENSION_KEYBOARD_ACTIONS = new Map([
    ['ArrowUp', 'prev'],
    ['ArrowLeft', 'prev'],
    ['ArrowDown', 'next'],
    ['ArrowRight', 'next'],
  ]);

  function getPaperBackgroundSVGURL(width, height) {
    const svgDimension =
      width && height
        ? `width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"`
        : '';

    // inspired by https://tympanus.net/codrops/2019/02/19/svg-filter-effects-creating-texture-with-feturbulence/
    return 〆.$svgXMLToDataURL(`
      <svg xmlns="http://www.w3.org/2000/svg" ${svgDimension}>
        <filter id="paper" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.03" result="noise" numOctaves="20" />
          <feDiffuseLighting in="noise" lighting-color="${paperBackgroundLightingColor}" surfaceScale="1">
            <feDistantLight azimuth="${paperBackgroundLightingAzimuth}" elevation="${paperBackgroundLightingElevation}" />
          </feDiffuseLighting>
        </filter>
        <rect x="0" y="0" width="100%" height="100%" filter="url(#paper)" fill="none" />
      </svg>
    `);
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

  let _;

  // TODO: Streamline state transitions
  class SiteController {
    constructor(initPageName, contentManager, canvasController, audioManager) {
      _(this)._initPageName = initPageName;

      _(this)._canvasController = canvasController;
      _(this)._canvasController.onLoadingState = (state) => {
        _(this)._loading = state;
      };
      _(
        this
      )._canvasController.getPaperBackgroundSVGURL = getPaperBackgroundSVGURL;
      _(this)._contentManager = contentManager;
      _(this)._audioManager = audioManager;

      _(this)._smallViewSideBarToggleRequestAnimationId = undefined;
      _(this)._smallViewSideBarToggleBase = $(
        '#small-view-sidebar-toggle-base'
      );
      _(this)._smallViewSideBarToggleFold = $(
        '#small-view-sidebar-toggle-fold'
      );
      _(this)._smallViewSideBarToggleBoxSize = parseInt(
        $('#small-view-sidebar-toggle > svg')
          .getAttribute('viewBox')
          .split(' ')[2]
      );
      _(this)._renderSmallViewSidebarToggle(0);
      _(this)._smallViewSideBarToggleAnimationStart = 0;

      Object.defineProperty(_(this), '_raining', {
        get() {
          return $('#rain-control').dataset.raining === 'true';
        },
        set(__raining) {
          $('#rain-control').dataset.raining = __raining;
          if (__raining) {
            this._audioManager.unmuteRain();
          } else {
            this._audioManager.muteRain();
          }
        },
      });

      Object.defineProperty(_(this), '_volumeLevel', {
        get() {
          return $('#volume-control').dataset.level;
        },
        set(__volumeLevel) {
          $('#volume-control').dataset.level = __volumeLevel;
        },
      });

      Object.defineProperty(_(this), '_loading', {
        set(__loading) {
          if (__loading) {
            $('body').classList.add('loading');
          } else {
            $('body').classList.remove('loading');
          }
        },
      });

      Object.defineProperty(_(this), '_audioAvailable', {
        set(__audioAvailable) {
          if (__audioAvailable) {
            $('body').classList.add('audio-available');
          } else {
            $('body').classList.remove('audio-available');
          }
        },
      });

      Object.defineProperty(_(this), '_currentPage', {
        set(__currentPage) {
          $('body').dataset.currentPage = __currentPage;
          $('#small-view-header-page-title').textContent = $(
            `#main-menu li[data-page="${__currentPage}"]`
          ).textContent;
        },
      });
    }

    _initEventListeners() {
      // requestAnimationFrame: sometimes Chrome doesn't have proper
      // getBoundingRect just at DOMContentLoaded
      document.addEventListener('DOMContentLoaded', async () => {
        // waiting for $indexStyleSheet such that $isSmallView is usable
        await Promise.all([〆.$frame(), 〆.$indexStyleSheet]);
        _(this)._onReady();
      });

      _(this)._setupDevicePixelRatioListener();

      window.addEventListener('resize', this.onResize);
      window.addEventListener('keydown', this.onKeydown);

      $('#main-menu').addEventListener('click', this.onMainMenuClick);

      $('#rain-control').addEventListener('click', this.onRainMenuClick);

      $('#volume-control').addEventListener('click', this.onVolumeMenuClick);

      $$('.prehension-control').forEach((parent) =>
        parent.addEventListener('click', this.onPrehensionMenuClick)
      );

      $('#small-view-sidebar-toggle').addEventListener(
        'click',
        this.onSmallViewSidebarToggleClick
      );

      // hack to trigger mobile safari's :active status
      $('#sidebar').addEventListener('touchstart', () => undefined);

      $('#sidebar').addEventListener('click', this.onSidebarClick);

      // disallow scrolling on sidebar and small header
      $$('#sidebar, #small-view-header').forEach((elem) => {
        elem.addEventListener('touchmove', (evt) => {
          evt.preventDefault();
        });
      });
    }

    _setupDevicePixelRatioListener() {
      const generateNewQuery = () => {
        matchMedia(
          `(resolution: ${window.devicePixelRatio}dppx)`
        ).addEventListener(
          'change',
          () => {
            this.onResize();
            generateNewQuery();
          },
          { once: true }
        );
      };
      generateNewQuery();
    }

    _onReady() {
      _(this)._raining = INIT_RAINING;

      $(
        '#site-root'
      ).style.backgroundImage = `url('${getPaperBackgroundSVGURL()}')`;

      _(this)._canvasController.ready();

      _(this)._canvasController.start();

      _(this)._switchPage(_(this)._initPageName);
    }

    onResize = () => {
      _(this)._canvasController.onResize();

      // firefox does some caching which makes the old size svg not expanding
      // to new viewport size (if becoming bigger). So adding some tag for that.
      if (〆.$isFirefox) {
        $(
          '#site-root'
        ).style.backgroundImage = `url('${getPaperBackgroundSVGURL()}%3C!--${
          window.innerWidth
        }-${window.innerHeight}--%3E')`;
      }
    };

    onKeydown = (evt) => {
      if (evt.shiftKey || evt.altKey || evt.ctrlKey || evt.isComposing) return;

      const action = PREHENSION_KEYBOARD_ACTIONS.get(evt.key);
      if (!action) return;

      _(this)._canvasController.inPageSwitchView(action);
      evt.preventDefault();
      evt.stopPropagation();
    };

    onMainMenuClick = (evt) => {
      if (!(evt.target instanceof HTMLLIElement)) {
        return;
      }

      evt.stopPropagation();

      _(this)._switchPage(evt.target.dataset.page);
      _(this)._toggleSmallViewSidebar(false);
    };

    onRainMenuClick = (evt) => {
      evt.stopPropagation();

      if (!(evt.target instanceof HTMLSpanElement)) {
        return;
      }

      if (evt.target.id.endsWith('stop') && _(this)._raining) {
        _(this)._raining = false;
        _(this)._canvasController.raining = false;
        _(this)._canvasController.restartRainEngine();
      } else if (evt.target.id.endsWith('start') && !_(this)._raining) {
        _(this)._raining = true;
        _(this)._canvasController.raining = true;
        _(this)._canvasController.restartRainEngine();
      }
    };

    onVolumeMenuClick = (evt) => {
      evt.stopPropagation();

      if (!(evt.target instanceof HTMLSpanElement)) {
        return;
      }

      const { level } = evt.target.dataset;

      _(this)._volumeLevel = level;

      if (level === 'silent') {
        _(this)._audioManager.stop();
      } else {
        _(this)._audioManager.playAndSetVolume(level);
      }
    };

    onPrehensionMenuClick = (evt) => {
      evt.stopPropagation();

      if (!(evt.target instanceof HTMLSpanElement)) {
        return;
      }

      const { action } = evt.target.dataset;

      _(this)._canvasController.inPageSwitchView(action);
    };

    onSidebarClick = () => {
      _(this)._toggleSmallViewSidebar(false);
    };

    onSmallViewSidebarToggleClick = () => {
      _(this)._toggleSmallViewSidebar();
    };

    _toggleSmallViewSidebar(state) {
      $('body').classList.toggle('small-view-sidebar-visible', state);
      cancelAnimationFrame(_(this)._smallViewSideBarToggleRequestAnimationId);

      _(this)._smallViewSideBarToggleRequestAnimationDirection = $(
        'body'
      ).classList.contains('small-view-sidebar-visible')
        ? 'forward'
        : 'backward';

      _(this)._smallViewSideBarToggleAnimationStart = performance.now();
      _(this)._smallViewSideBarToggleRequestAnimationId = requestAnimationFrame(
        this.animateSmallViewSidebarToggle
      );
    }

    animateSmallViewSidebarToggle = () => {
      const elapsed =
        performance.now() - _(this)._smallViewSideBarToggleAnimationStart;
      const totalTime =
        〆.$computedStyle(
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
        _(this)._smallViewSideBarToggleRequestAnimationDirection === 'forward'
          ? phase
          : 1 - phase;
      _(this)._renderSmallViewSidebarToggle(actualPhase);

      if (phase < 1) {
        _(
          this
        )._smallViewSideBarToggleRequestAnimationId = requestAnimationFrame(
          this.animateSmallViewSidebarToggle
        );
      }
    };

    _renderSmallViewSidebarToggle(phase) {
      const SIDE = _(this)._smallViewSideBarToggleBoxSize;

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

      _(this)._smallViewSideBarToggleBase.setAttribute(
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

      _(this)._smallViewSideBarToggleFold.setAttribute(
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

    // eslint-disable-next-line class-methods-use-this
    _handleFontBlobPromises(fontBlobPromises) {
      fontBlobPromises.forEach((promise, fontName) => {
        promise.then((blob) => {
          const styleElem = $e('style');

          const url = URL.createObjectURL(blob);

          styleElem.textContent = `
          @font-face {
            font-family: 'MIH ${fontName.toUpperCase()}';
            font-weight: ${〆.$computedStyle('body', 'font-weight')};
            src: url('${url}') format('woff2');
            font-display: block;
          }
        `;

          $('head').appendChild(styleElem);
        });
      });
    }

    async _handleAudioAvailablePromise(audioAvailablePromise) {
      await audioAvailablePromise;

      _(this)._audioAvailable = true;

      $('#volume-control > span[data-level="silent"]').click();
    }

    async _switchPage(pageName) {
      _(this)._loading = true;

      await _(this)._canvasController.stopPage();

      _(this)._currentPage = pageName;

      const pageSourcePromise = _(this)._contentManager.getPageSourcePromise(
        pageName
      );

      _(this)._canvasController.pageSourcePromise = pageSourcePromise;

      _(this)._canvasController.startPage();
    }

    init() {
      _(this)._loading = true;

      const fontBlobPromises = _(this)._contentManager.getFontBlobPromises();
      _(this)._canvasController.fontBlobPromises = fontBlobPromises;

      _(this)._canvasController.pageStyleSheetPromise = _(
        this
      )._contentManager.getPageStyleSheetPromise();

      _(this)._initEventListeners();

      _(this)._handleFontBlobPromises(fontBlobPromises);

      _(this)._handleAudioAvailablePromise(
        _(this)._audioManager.getAudioAvailablePromise()
      );
    }
  }

  _ = window.createInternalFunction(SiteController);
  if (window.DEBUG) window.internalFunctions[SiteController] = _;

  exports.SiteController = SiteController;
})(window);
