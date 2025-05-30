/**
 * H5P iframe Resizer: forked from https://github.com/moodle/moodle/blob/main/h5p/h5plib/v127/joubel/core/js/h5p-resizer.js
 *
 * @auhor      2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @copyright  Joubel
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

(function() {
    if (window.h5pResizerInitialized) {
        return; // Already initialized
    }
    if (!window.postMessage || !window.addEventListener || window.forkedh5pResizerInitialized) {
        return; // Not supported
    }
    window.forkedh5pResizerInitialized = true;

    // Map actions to handlers
    var actionHandlers = {};

    /**
     * Prepare iframe resize.
     *
     * @private
     * @param {Object} iframe Element
     * @param {Object} data Payload
     * @param {Function} respond Send a response to the iframe
     */
    actionHandlers.hello = function(iframe, data, respond) {
        // Make iframe responsive
        iframe.style.width = '100%';

        // Bugfix for Chrome: Force update of iframe width. If this is not done the
        // document size may not be updated before the content resizes.
        iframe.getBoundingClientRect();

        // Tell iframe that it needs to resize when our window resizes
        var resize = function() {
            if (iframe.contentWindow) {
                // Limit resize calls to avoid flickering
                respond('resize');
            }
            else {
                // Frame is gone, unregister.
                window.removeEventListener('resize', resize);
            }
        };
        window.addEventListener('resize', resize, false);

        // Respond to let the iframe know we can resize it
        respond('hello');
    };

    /**
     * Prepare iframe resize.
     *
     * @private
     * @param {Object} iframe Element
     * @param {Object} data Payload
     * @param {Function} respond Send a response to the iframe
     */
    actionHandlers.prepareResize = function(iframe, data, respond) {
        if (window.h5pResizerInitialized) {
            return; // Already initialized
        }
        // Do not resize unless page and scrolling differs
        if (iframe.clientHeight !== data.scrollHeight ||
            data.scrollHeight !== data.clientHeight) {

            // Reset iframe height, in case content has shrinked.
            iframe.style.height = (data.scrollHeight) + 'px';
            respond('resizePrepared');
        }
    };

    /**
     * Resize parent and iframe to desired height.
     *
     * @private
     * @param {Object} iframe Element
     * @param {Object} data Payload
     * @param {Function} respond Send a response to the iframe
     */
    actionHandlers.resize = function(iframe, data) {
        // Resize iframe so all content is visible. Use scrollHeight to make sure we get everything
        if (window.h5pResizerInitialized) {
            return;
        }
        iframe.style.height = (data.scrollHeight) + 'px';
    };

    // Listen for messages from iframes
    window.addEventListener('message', function receiveMessage(event) {
        if (event.data.context !== 'h5p') {
            return; // Only handle h5p requests.
        }

        // Find out who sent the message
        var iframe;
        var iframes = document.querySelectorAll('#message iframe.h5p-player');
        for (var i = 0; i < iframes.length; i++) {
            if (iframes[i].contentWindow === event.source) {
                iframe = iframes[i];
                break;
            }
        }

        if (!iframe) {
            return; // Cannot find sender
        }

        // Find action handler handler
        if (actionHandlers[event.data.action]) {
            actionHandlers[event.data.action](iframe, event.data, function respond(action, data) {
                if (data === undefined) {
                    data = {};
                }
                data.action = action;
                data.context = 'h5p';
                event.source.postMessage(data, event.origin);
            });
        }
    }, false);

    // Let h5p iframes know we're ready!
    var iframes = document.querySelectorAll('#message iframe.h5p-player');
    var ready = {
        context: 'h5p',
        action: 'ready'
    };
    for (var i = 0; i < iframes.length; i++) {
        if (iframes[i].src.indexOf('html') !== -1) {
            iframes[i].contentWindow.postMessage(ready, '*');
        }
    }
})();
