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
 * Main class for the H5P Upload plugin.
 *
 * @module     local_ivh5pupload/main
 * @copyright  2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import $ from 'jquery';
import Base from 'mod_interactivevideo/type/base';
import {notifyFilterContentUpdated as notifyFilter} from 'core_filters/events';
import Notification from 'core/notification';

export default class H5pUpload extends Base {
    /**
     * Render the container for the annotation
     * @param {Object} annotation The annotation object
     * @returns {void}
     */
    renderContainer(annotation) {
        let self = this;
        let $message = $(`#message[data-id='${annotation.id}']`);
        super.renderContainer(annotation);
        if (annotation.completiontracking !== 'view') {
            let $completiontoggle = $message.find('#completiontoggle');
            $message.find('#title .info').remove();
            $completiontoggle.before(`<i class="bi bi-info-circle-fill iv-mr-2 info" data${self.isBS5 ? '-bs' : ''}-toggle="tooltip"
            data${self.isBS5 ? '-bs' : ''}-container="#wrapper" data${self.isBS5 ? '-bs' : ''}-trigger="hover"
            title="${M.util.get_string("completionon" + annotation.completiontracking, "mod_interactivevideo")}"></i>`);
            if (annotation.completed) {
                return;
            }
            setTimeout(function() {
                $message.find(`[data${self.isBS5 ? '-bs' : ''}-toggle="tooltip"]`).tooltip('show');
            }, 1000);
            setTimeout(function() {
                $message.find(`[data${self.isBS5 ? '-bs' : ''}-toggle="tooltip"]`).tooltip('hide');
            }, 3000);
        }
    }

    /**
     * Handles the rendering of content after an annotation is posted.
     *
     * This function adds a class to the message element, sets an interval to check for an iframe,
     * and modifies the iframe's background and height properties. It also handles completion tracking.
     *
     * @param {Object} annotation - The annotation object containing details about the annotation.
     * @param {Function} callback - The callback function to be executed if certain conditions are met.
     * @returns {boolean|Function} - Returns true if the annotation does not require manual completion tracking,
     *                               otherwise returns the callback function.
     */
    postContentRender(annotation, callback) {
        $(`#message[data-id='${annotation.id}']`).addClass('hascontentbank overflow-hidden');
        // Get customcss link from the annotation prop.
        let prop = JSON.parse(annotation.prop);
        let customcss = prop.customcss;
        let checkIframe = () => {
            const iframe = document.querySelector(`#message[data-id='${annotation.id}'] iframe`);
            if (iframe) {
                iframe.style.background = 'none';
                let contentDocument = iframe.contentDocument;
                let h5p = contentDocument.querySelector('.h5p-initialized');
                if (h5p) {
                    $(`#message[data-id='${annotation.id}']`).removeClass('overflow-hidden').find('.loader').remove();
                    let html = contentDocument.querySelector('html');
                    html.style.height = 'unset';
                    // Get the first div element after html body.
                    let firstdiv = contentDocument.querySelector('body > div');
                    if (firstdiv) {
                        firstdiv.style.margin = '0';
                    }
                    if (customcss && annotation.char2 == '1') {
                        let iframeurl = iframe.src;
                        let fileextension = iframeurl.split('.').pop();
                        // Inject stylesheet url to iframe head.
                        let link, node;
                        if (fileextension == 'html') { // HTML iframe.
                            link = contentDocument.createElement('link');
                            node = contentDocument.head;
                        } else { // H5P iframe.
                            let h5piframe = contentDocument.querySelector(`#${h5p.id}`);
                            let h5piframecontent = h5piframe.contentDocument;
                            link = h5piframecontent.createElement('link');
                            node = h5piframecontent.head;
                        }
                        // Get the html tag as node's parent and add dir="rtl" to it.
                        let dir = $('html').attr('dir');
                        let setDir = JSON.parse(annotation.advanced).dir;
                        if (setDir && setDir != '') {
                            dir = setDir;
                        } else if (setDir && setDir == '') {
                            dir = $('html').attr('dir');
                        } else {
                            dir = '';
                        }
                        if (dir != '') {
                            let htmltag = node.parentNode;
                            if (htmltag) {
                                htmltag.setAttribute('dir', dir);
                            }
                        }
                        link.rel = 'stylesheet';
                        link.type = 'text/css';
                        link.href = customcss;
                        node.appendChild(link);
                    }
                } else {
                    requestAnimationFrame(checkIframe);
                }
            } else {
                requestAnimationFrame(checkIframe);
            }
        };
        requestAnimationFrame(checkIframe);
        if (annotation.hascompletion == 1 && annotation.completiontracking == 'manual'
            && !annotation.completed && annotation.completiontracking != 'view') {
            return callback;
        }
        return true;
    }

    /**
     * Called when the edit form is loaded.
     * @param {Object} form The form object
     * @param {Event} event The event object
     * @return {void}
     */
    onEditFormLoaded(form, event) {
        let self = this;
        self.timepicker({
            required: true,
        });

        return {form, event};
    }

    /**
     * Apply the content to the annotation
     * @param {Object} annotation The annotation object
     * @param {Object} existingstate The existing state of the annotation
     * @returns {Promise<void>} - Returns a promise that resolves when the content is applied.
     * @override
     */
    async applyContent(annotation, existingstate) {
        let self = this;
        let $message = $(`#message[data-id='${annotation.id}']`);
        // Remove .modal-dialog-centered class to avoid flickering when H5P content resizes.
        $message.removeClass('modal-dialog-centered');

        let annoid = annotation.id;

        const onPassFail = async(passed, time) => {
            let label = passed ? 'continue' : 'rewatch';
            $message.find('#content')
                .append(`<button class="btn btn-${passed ? 'success' : 'danger'} mt-2 btn-rounded"
                        id="passfail" data-timestamp="${time}"><i class="fa fa-${passed ? 'play' : 'redo'} iv-mr-2"></i>
                    ${M.util.get_string(label, 'ivplugin_contentbank')}
                    </button>`);
            $message.find('iframe').addClass('no-pointer-events');
        };

        $(document).off('click', '#passfail').on('click', '#passfail', function(e) {
            e.preventDefault();
            let time = $(this).data('timestamp');
            self.dispatchEvent('interactionclose', {
                annotation: annotation,
            });
            self.player.seek(time);
            self.player.play();
            $(this).remove();
        });

        let saveState = 0;
        let condition = null;
        if (annotation.text1 != '' && annotation.text1 !== null) {
            condition = JSON.parse(annotation.text1);
        }

        if (JSON.parse(annotation.advanced).savecurrentstate == 1) {
            saveState = 1;
        }

        const afterLog = async(log) => {
            const xAPICheck = (annotation) => {
                const detectH5P = () => {
                    let H5P;
                    try { // Try to get the H5P object.
                        H5P = document.querySelector(`#message[data-id='${annoid}'] iframe`).contentWindow.H5P;
                    } catch (e) {
                        H5P = null;
                    }
                    if (typeof H5P !== 'undefined' && H5P !== null) {
                        if (H5P.externalDispatcher === undefined) {
                            requestAnimationFrame(detectH5P);
                            return;
                        }
                        if (document.querySelector(`#message[data-id='${annoid}'] iframe`)
                            .contentWindow.H5PIntegration === undefined) {
                            requestAnimationFrame(detectH5P);
                            return;
                        }

                        if (self.isEditMode()) {
                            $message.find(`#title .btns .xapi`).remove();
                            $message.find(`#title .btns`)
                                .prepend(`<div class="xapi alert-secondary px-2
                             rounded-pill">${M.util.get_string('xapicheck', 'ivplugin_contentbank')}</div>`);
                        }

                        window.H5PIntegration = document.querySelector(`#message[data-id='${annoid}'] iframe`)
                            .contentWindow.H5PIntegration;
                        window.H5PIntegration = window.H5PIntegration || {};
                        window.H5PIntegration.saveFreq = 1;
                        let content = window.H5PIntegration.contents;
                        let id = Object.keys(content)[0];
                        if (existingstate !== null && existingstate !== undefined) {
                            log = existingstate;
                        }
                        window.H5PIntegration.contents[id].contentUserData = {};
                        window.H5PIntegration.contents[id].contentUserData[0] = {};
                        window.H5PIntegration.contents[id].contentUserData[0].state = log;
                        window.H5P = H5P;
                        if (annotation.completed) {
                            return;
                        }
                        try {
                            H5P.externalDispatcher.on('xAPI', async function(event) {
                                let statement = event.data.statement;
                                if ((statement.verb.id == 'http://adlnet.gov/expapi/verbs/completed'
                                    || statement.verb.id == 'http://adlnet.gov/expapi/verbs/answered')
                                    && statement.object.id.indexOf('subContentId') < 0
                                    && !statement.context.contextActivities.parent) {
                                    if (self.isEditMode()) {
                                        $(`#message[data-id='${annotation.id}'] #title .btns .xapi`).remove();
                                        $(`#message[data-id='${annotation.id}'] #title .btns`)
                                            .prepend(`<div class="xapi alert-success d-inline px-2 rounded-pill">
                                                        <i class="fa fa-check iv-mr-2"></i>
                                                        ${M.util.get_string('xapieventdetected', 'ivplugin_contentbank')}
                                                    </div>`);
                                        const audio = new Audio(M.cfg.wwwroot + '/mod/interactivevideo/sounds/pop.mp3');
                                        audio.play();
                                        return;
                                    }
                                    let complete = false;
                                    let textclass = '';
                                    let result = statement.result;
                                    if (annotation.completiontracking == 'completepass' && result && result.score.scaled >= 0.5) {
                                        complete = true;
                                    } else if (annotation.completiontracking == 'completefull'
                                        && result && result.score.scaled == 1) {
                                        complete = true;
                                    } else if (annotation.completiontracking == 'complete') {
                                        complete = true;
                                    }
                                    if (result.score.scaled < 0.5) {
                                        textclass = 'fa fa-check text-danger';
                                    } else if (result.score.scaled < 1) {
                                        textclass = 'fa fa-check text-success';
                                    } else {
                                        textclass = 'bi bi-check2-all text-success';
                                    }
                                    if (complete && !annotation.completed) {
                                        let details = {};
                                        const completeTime = new Date();
                                        let windowAnno = window.ANNOS.find(x => x.id == annotation.id);
                                        details.xp = annotation.xp;
                                        if (annotation.char1 == '1') { // Partial points.
                                            details.xp = (result.score.scaled * annotation.xp).toFixed(2);
                                        }
                                        details.duration = windowAnno.duration + (completeTime.getTime() - windowAnno.newstarttime);
                                        details.timecompleted = completeTime.getTime();
                                        const completiontime = completeTime.toLocaleString();
                                        let duration = self.formatTime(details.duration / 1000);
                                        details.reportView = `<span data-toggle="tooltip"
                                         data-html="true" data-title='<span
                                          class="d-flex flex-column align-items-start"><span><i class="bi bi-calendar iv-mr-2"></i>
                         ${completiontime}</span><span><i class="bi bi-stopwatch iv-mr-2"></i>${duration}</span>
                         <span><i class="bi bi-list-check iv-mr-2"></i>
                         ${result.score.raw}/${result.score.max}</span></span>'>
                         <i class="${textclass}"></i><br><span>${Number(details.xp)}</span></span>`;
                                        details.details = saveState == 1 ?
                                            window.H5PIntegration.contents[id].contentUserData[0].state : '';
                                        // Must wait 1.5 seconds or so to let the saveState finish.
                                        // Otherwise, the completion will be incomplete.
                                        setTimeout(function() {
                                            self.toggleCompletion(annoid, 'mark-done', 'automatic', details);
                                        }, 1500);
                                    }

                                    if (condition !== null) {
                                        if (result.score.scaled < 0.5) {
                                            if (condition.gotoonfailed == 1 && condition.forceonfailed != 1) {
                                                onPassFail(false, condition.timeonfailed);
                                            } else if (condition.gotoonfailed == 1 && condition.forceonfailed == 1) {
                                                setTimeout(function() {
                                                    self.dispatchEvent('interactionclose', {
                                                        annotation: annotation,
                                                    });
                                                    self.player.seek(condition.timeonfailed);
                                                    self.player.play();
                                                }, 1000);
                                            }
                                            if (condition.showtextonfailed == 1 && condition.textonfailed.text != '') {
                                                let textonfailed = await self.formatContent(condition.textonfailed.text);
                                                $message.find('.passfail-message').remove();
                                                $message.find(`#content`)
                                                    .prepend(`<div class="alert bg-secondary mt-2 mx-3 passfail-message">
                                                ${textonfailed}</div>`);
                                                notifyFilter($('.passfail-message'));
                                            }
                                        } else {
                                            if (condition.gotoonpassing == 1 && condition.forceonpassing != 1) {
                                                onPassFail(true, condition.timeonpassing);
                                            } else if (condition.gotoonpassing == 1 && condition.forceonpassing == 1) {
                                                setTimeout(function() {
                                                    self.dispatchEvent('interactionclose', {
                                                        annotation: annotation,
                                                    });
                                                    self.player.seek(condition.timeonpassing);
                                                    self.player.play();
                                                }, 1000);
                                            }
                                            if (condition.showtextonpassing == 1 && condition.textonpassing.text != '') {
                                                let textonpassing = await self.formatContent(condition.textonpassing.text);
                                                $message.find('.passfail-message').remove();
                                                $message.find(`#content`)
                                                    .prepend(`<div class="alert bg-secondary mt-2 mx-3 passfail-message">
                                                ${textonpassing}</div>`);
                                                notifyFilter($('.passfail-message'));
                                            }
                                        }
                                    }
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
            // We don't need to run the render method every time the content is applied. We can cache the content.
            let firstview = false;
            if (!self.cache[annotation.id] || self.isEditMode()) {
                self.cache[annotation.id] = await self.render(annotation);
                firstview = true;
            }
            const data = self.cache[annotation.id];

            $message.find(`.modal-body`).html(data).attr('id', 'content').fadeIn(300);

            self.postContentRender(annotation, xAPICheck(annotation));

            if (existingstate !== null && existingstate !== undefined) {
                return;
            }

            if (self.isEditMode()) {
                return;
            }

            // If annotation is incomplete, we want to save the state when the interaction is closed.
            $(document).on('interactionclose interactionrefresh', async function(e) {
                if (!annotation.completed && firstview && saveState == 1) {
                    if (e.detail.annotation.id == annotation.id) {
                        try {
                            let content = window.H5PIntegration.contents;
                            let id = Object.keys(content)[0];
                            let contentuserData = window.H5PIntegration.contents[id].contentUserData[0];
                            let state = contentuserData.state;
                            await self.saveLog(annotation, {
                                text1: JSON.stringify(state),
                                char1: annotation.type,
                            }, self.userid, true);
                        } catch (e) {
                            window.console.log('Error: ', e);
                        }
                    }
                }
                // Remove window.
            });

            if (annotation.hascompletion != 1) {
                return;
            }
            if (!annotation.completed && annotation.completiontracking == 'view') {
                self.completiononview(annotation);
            }
        };

        if (existingstate !== null && existingstate !== undefined) { // Report view.
            afterLog(existingstate);
            return;
        }

        // Get exiting state.
        if (self.isEditMode()) {
            afterLog('');
            return;
        }
        if (saveState !== 1) {
            afterLog('');
            return;
        }
        let logs = await self.getLogs(annotation, [self.userid]);
        let log = '';
        if (logs.length <= 0) {
            afterLog('');
            return;
        }
        if (logs.length > 0) {
            log = JSON.parse(logs[0].text1);
            // Show a confirmation message if the state is not empty.
            if (log !== '' && log !== null) {
                Notification.saveCancel(
                    M.util.get_string('resume', 'ivplugin_contentbank'),
                    M.util.get_string('resumeconfirm', 'ivplugin_contentbank'),
                    M.util.get_string('resume', 'ivplugin_contentbank'),
                    function() {
                        // Do nothing.
                        afterLog(log);
                    },
                    function() {
                        log = '';
                        afterLog(log);
                    }
                );
            } else {
                afterLog(log);
            }
        }
    }

    async getCompletionData(annotation, userid) {
        let logs = await this.getLogs(annotation, [userid]);
        let log = '';
        if (logs.length > 0) {
            log = JSON.parse(logs[0].text1);
        }
        annotation.displayoptions = 'popup';
        annotation.hascompletion = 0;
        annotation.completed = true;
        await this.renderViewer(annotation);
        this.renderContainer(annotation);
        this.applyContent(annotation, log);
        return log;
    }
}