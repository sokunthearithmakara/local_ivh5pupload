/* eslint-disable max-depth */
/* eslint-disable complexity */
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * H5P Upload utility functions
 *
 * @module     local_ivh5pupload/utils
 * @copyright  2026 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import $ from 'jquery';
import {get_string as getString} from 'core/str';

/**
 * Shared method to check for H5P loaded iframe, inject custom css stylesheet link,
 * detect current text direction, and display completion information tooltips.
 *
 * @param {Object} instance - The player instance.
 * @param {Object} annotation - The annotation config.
 * @param {jQuery} $message - The message container.
 * @param {Function} callback - The callback function if manual completion is required.
 * @returns {Promise<boolean|Function>} Returns true or the callback.
 */
export const postContentRender = async(instance, annotation, $message, callback) => {
    let prop = {};
    try {
        prop = JSON.parse(annotation.prop || '{}');
    } catch (e) {
        prop = {};
    }
    let customcss = prop.customcss;
    let checkIframe = () => {
        const iframe = $message.find('iframe')[0];
        if (iframe) {
            iframe.style.background = 'none';
            let contentDocument = iframe.contentDocument;
            if (contentDocument) {
                let h5p = contentDocument.querySelector('.h5p-initialized');
                if (h5p) {
                    $message.removeClass('overflow-hidden').find('.loader').remove();
                    let html = contentDocument.querySelector('html');
                    if (html) {
                        html.style.height = 'unset';
                    }
                    let firstdiv = contentDocument.querySelector('body > div');
                    if (firstdiv) {
                        firstdiv.style.margin = '0';
                    }

                    // Add Download Strings button if in edit/preview mode!
                    if (instance.isEditMode()) {
                        const H5PIntegration = iframe.contentWindow.H5PIntegration;
                        if (H5PIntegration && H5PIntegration.contents) {
                            const contentId = Object.keys(H5PIntegration.contents)[0];
                            const contentData = H5PIntegration.contents[contentId];
                            const jsonContentStr = contentData ? contentData.jsonContent : null;

                            if (jsonContentStr) {
                                $message.find('#title .btns .download-h5p-json').remove();

                                const appendBtn = async() => {
                                    const downloadBtnHtml = `
                                        <button class="btn btn-secondary btn-sm download-h5p-json iv-mr-2"
                                                type="button"
                                                title="${await getString('downloadstringsjsontitle', 'local_ivh5pupload')}">
                                            <i class="bi bi-download iv-mr-2"></i>
                                            ${await getString('downloadstringsjson', 'local_ivh5pupload')}
                                        </button>
                                    `;
                                    $message.find('#title .btns').prepend(downloadBtnHtml);
                                };
                                appendBtn();

                                $message.find('#title .btns')
                                    .off('click', '.download-h5p-json')
                                    .on('click', '.download-h5p-json', function(e) {
                                        e.preventDefault();

                                        try {
                                            const params = JSON.parse(jsonContentStr);
                                            const extractedStrings = {};

                                            const extract = (obj, path = '') => {
                                                if (obj === null || obj === undefined) {
                                                    return;
                                                }
                                                if (typeof obj === 'string') {
                                                    const isUrl = obj.startsWith('http://')
                                                        || obj.startsWith('https://')
                                                        || obj.startsWith('/');
                                                    const isMime = /^[a-zA-Z0-9!#$&^_-]+\/[a-zA-Z0-9!#$&^_+.-]+$/.test(obj.trim());
                                                     const isFilePath =
                                                         /\.(png|jpe?g|gif|svg|mp4|mp3|wav|ogg|webm|pdf|zip|json|html|css|js)$/i
                                                         .test(obj.trim());
                                                    if (obj.trim() !== '' && !isUrl && !isMime && !isFilePath
                                                        && isNaN(Number(obj)) && obj !== 'true' && obj !== 'false') {
                                                        extractedStrings[path] = obj;
                                                    }
                                                } else if (Array.isArray(obj)) {
                                                    obj.forEach((item, index) => {
                                                        extract(item, path ? `${path}[${index}]` : `${index}`);
                                                    });
                                                } else if (typeof obj === 'object') {
                                                    for (const key in obj) {
                                                        if (obj.hasOwnProperty(key)) {
                                                            if (key === 'media') {
                                                                continue;
                                                            }
                                                            extract(obj[key], path ? `${path}.${key}` : key);
                                                        }
                                                    }
                                                }
                                            };

                                            extract(params);
                                            const dataToDownload = JSON.stringify(extractedStrings, null, 4);

                                            // Trigger download
                                            const blob = new Blob([dataToDownload], {type: 'application/json'});
                                            const url = URL.createObjectURL(blob);
                                            const a = document.createElement('a');
                                            a.href = url;
                                            a.download = `h5p-strings-${annotation.id}.json`;
                                            document.body.appendChild(a);
                                            a.click();
                                            document.body.removeChild(a);
                                            URL.revokeObjectURL(url);
                                        } catch (err) {
                                            window.console.error('Error downloading strings: ', err);
                                        }
                                    });
                            }
                        }
                    }
                    if (customcss && annotation.char2 == '1') {
                        let iframeurl = iframe.src;
                        let fileextension = iframeurl.split('.').pop();
                        let link, node;
                        if (fileextension == 'html') {
                            link = contentDocument.createElement('link');
                            node = contentDocument.head;
                        } else {
                            let h5piframe = contentDocument.querySelector(`#${h5p.id}`);
                            if (h5piframe) {
                                let h5piframecontent = h5piframe.contentDocument;
                                if (h5piframecontent) {
                                    link = h5piframecontent.createElement('link');
                                    node = h5piframecontent.head;
                                }
                            }
                        }
                        let dir = $('html').attr('dir');
                        let advanced = {};
                        try {
                            advanced = JSON.parse(annotation.advanced || '{}');
                        } catch (e) {
                            advanced = {};
                        }
                        let setDir = advanced.dir;
                        if (setDir && setDir !== '') {
                            dir = setDir;
                        }
                        if (dir && dir !== '' && node) {
                            let htmltag = node.parentNode;
                            if (htmltag) {
                                htmltag.setAttribute('dir', dir);
                            }
                        }
                        if (link && node) {
                            link.rel = 'stylesheet';
                            link.type = 'text/css';
                            link.href = customcss;
                            node.appendChild(link);
                        }
                    }
                } else {
                    requestAnimationFrame(checkIframe);
                }
            } else {
                requestAnimationFrame(checkIframe);
            }
        } else {
            requestAnimationFrame(checkIframe);
        }
    };
    requestAnimationFrame(checkIframe);

    if (annotation.completiontracking !== 'view') {
        const tooltipAttr = instance.isBS5 ? 'data-bs' : 'data';
        let todo = await getString('todo', 'mod_interactivevideo') + ': ';
        todo += await getString('completionon' + annotation.completiontracking, 'mod_interactivevideo');
        $message.find('#title .info').remove();
        $message.find('#completiontoggle').before(
            `<i class="bi bi-info-circle-fill iv-mr-2 info"
                ${tooltipAttr}-toggle="tooltip"
                ${tooltipAttr}-container="#message"
                ${tooltipAttr}-trigger="hover"
                title="${todo}">
            </i>`
        );

        if (!annotation.completed) {
            const tooltip = $message.find(`#title .info[${tooltipAttr}-toggle="tooltip"]`);
            setTimeout(() => tooltip.tooltip('show'), 1000);
            setTimeout(() => tooltip.tooltip('hide'), 3000);
        }
    }

    if (annotation.hascompletion == 1 && annotation.completiontracking == 'manual'
        && !annotation.completed && annotation.completiontracking != 'view') {
        return callback;
    }
    return true;
};

/**
 * Initializes H5P Integration and hooks user xAPI statements.
 *
 * @param {Object} instance - The player instance.
 * @param {Object} annotation - The annotation config.
 * @param {jQuery} $message - The message container.
 * @param {string|Object} log - The existing state log.
 * @param {number} saveState - Whether state saving is enabled.
 * @param {Object} stateObj - The global state module.
 * @param {Function} onStatement - Callback for handling xAPI statements.
 */
export const initH5PIntegration = (instance, annotation, $message, log, saveState, stateObj, onStatement) => {
    const annoid = annotation.id;
    const detectH5P = async() => {
        let H5P;
        const iframe = document.querySelector(`#message[data-id='${annoid}'] iframe`);
        try {
            H5P = iframe.contentWindow.H5P;
        } catch (e) {
            H5P = null;
        }

        if (typeof H5P !== 'undefined' && H5P !== null) {
            if (H5P.externalDispatcher === undefined || iframe.contentWindow.H5PIntegration === undefined) {
                requestAnimationFrame(detectH5P);
                return;
            }

            if (instance.isEditMode()) {
                $message.find(`#title .btns .xapi`).remove();
                $message.find(`#title .btns`)
                    .prepend(`<div class="xapi alert-secondary px-2
             iv-rounded-pill">${await getString('xapicheck', 'local_ivh5pupload')}</div>`);
            }

            const H5PIntegration = iframe.contentWindow.H5PIntegration;
            H5PIntegration.saveFreq = 1;
            const content = H5PIntegration.contents;
            const id = Object.keys(content)[0];

            const contents = H5PIntegration.contents;
            if (contents[id]) {
                if (!contents[id].contentUserData) {
                    contents[id].contentUserData = [{}];
                } else if (typeof contents[id].contentUserData === 'string') {
                    contents[id].contentUserData = [{}];
                } else if (!contents[id].contentUserData[0]) {
                    contents[id].contentUserData[0] = {};
                }
                H5PIntegration.contents[id].contentUserData[0].state = log;
            }
            window.H5P = H5P;

            try {
                const initializedAt = Date.now();
                H5P.externalDispatcher.off('xAPI');
                H5P.externalDispatcher.on('xAPI', async function(event) {
                    const statement = event.data.statement;
                    if (instance.isEditMode() && (Date.now() - initializedAt < 1500)) {
                        return;
                    }
                    if (onStatement) {
                        onStatement(statement, H5PIntegration, id);
                    }
                });
            } catch (e) {
                requestAnimationFrame(detectH5P);
            }
        } else {
            requestAnimationFrame(detectH5P);
        }
    };
    requestAnimationFrame(detectH5P);
};

/**
 * Shared logic for resizing H5P container iframes dynamically using ResizeObserver.
 *
 * @param {Object} annotation - The annotation config.
 */
export const resizeIframe = (annotation) => {
    const modalbody = document.querySelector(`#message[data-id='${annotation.id}'] .modal-body`);
    if (!modalbody) {
        return;
    }
    let resizeTimeout;
    const resizeObserver = new ResizeObserver(() => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            const iframe = modalbody.querySelector('iframe.h5p-player');
            if (iframe) {
                const height = iframe.scrollHeight;
                modalbody.style.height = `${height + 2000}px`;
            }
        }, 100);
    });

    resizeObserver.observe(modalbody);
};

/**
 * Common logic for rendering the report view summary.
 *
 * @param {Object} annotation - The annotation.
 * @param {Object} details - Completion details.
 * @param {Object} data - Context row data.
 * @param {Function} superMethod - Fallback method.
 * @returns {string} The report markup.
 */
export const renderReportView = (annotation, details, data, superMethod) => {
    if (!details.reportView.startsWith('##')) {
        return superMethod(annotation, details, data);
    }
    let rdata = details.reportView.split('|');
    rdata[0] = rdata[0].replace('##', '');
    let bsAffix = window.M && window.M.version > 405 ? '-bs' : '';
    let reportview = `<span data${bsAffix}-toggle="tooltip" data${bsAffix}-html="true"
                    data${bsAffix}-title='<span class="d-flex flex-column align-items-start">
                    <span><i class="bi bi-calendar iv-mr-2"></i>${rdata[0]}</span>
                    <span><i class="bi bi-stopwatch iv-mr-2"></i>${rdata[1]}</span>
                    <span><i class="bi bi-list-check iv-mr-2"></i>${rdata[2]}</span>
                    </span>'>
                    <i class="${rdata[3]}"></i>
                    <br><span>${rdata[4]}</span>
                    </span>`;
    let res = `<span class="completion-detail ${details.hasDetails ? 'cursor-pointer' : ''}"` +
        ` data-id="${data.itemid}" data-userid="${data.row.id}" data-type="${data.ctype}">${reportview}</span>`;
    if (data.access.canedit == 1) {
        res += `<i class="bi bi-trash3 fs-unset text-danger cursor-pointer position-absolute delete-cell"
                                title="${M.util.get_string('delete', 'mod_interactivevideo')}"></i>`;
    }
    return res;
};

/**
 * Merges a flat key-value translation object back into the deep H5P params object.
 *
 * @param {Object|Array} obj The original params object or array
 * @param {Object} translation The flat path-keyed translation object
 * @param {string} path The current traversal path
 * @param {Object|null} transNode The current node in the nested translation structure
 * @returns {Object|Array} The merged object/array
 */
export const mergeTranslation = (obj, translation, path = '', transNode = null) => {
    if (obj === null || obj === undefined) {
        return obj;
    }

    // Initialize the root node of the nested translation if first call
    if (path === '') {
        transNode = translation;
    }

    if (typeof obj === 'string') {
        // Direct flat path match
        if (translation && typeof translation === 'object' && translation.hasOwnProperty(path)) {
            return translation[path];
        }
        // Direct nested node match (if transNode is a string)
        if (typeof transNode === 'string') {
            return transNode;
        }
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map((item, index) => {
            const currentPath = path ? `${path}[${index}]` : `${index}`;
            // Get next node in nested translation
            let nextTransNode = null;
            if (Array.isArray(transNode) && transNode[index] !== undefined) {
                nextTransNode = transNode[index];
            } else if (transNode && typeof transNode === 'object' && transNode[index] !== undefined) {
                nextTransNode = transNode[index];
            }
            return mergeTranslation(item, translation, currentPath, nextTransNode);
        });
    }

    if (typeof obj === 'object') {
        const result = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const currentPath = path ? `${path}.${key}` : key;
                let nextTransNode = null;
                if (transNode && typeof transNode === 'object' && transNode[key] !== undefined) {
                    nextTransNode = transNode[key];
                }
                result[key] = mergeTranslation(obj[key], translation, currentPath, nextTransNode);
            }
        }
        return result;
    }

    // For numbers, booleans, etc., if there's a flat path match or nested node match, return it, otherwise return original
    if (translation && typeof translation === 'object' && translation.hasOwnProperty(path)) {
        return translation[path];
    }
    if (transNode !== null && transNode !== undefined && typeof transNode !== 'object') {
        return transNode;
    }

    return obj;
};

export default {
    postContentRender,
    initH5PIntegration,
    resizeIframe,
    renderReportView,
    mergeTranslation
};
