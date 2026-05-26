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
 * Main class for the H5P Upload plugin in Flexbook.
 *
 * @module     local_ivh5pupload/fbmain
 * @copyright  2026 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import $ from 'jquery';
import Base from 'mod_flexbook/type/base';
import Notification from 'core/notification';
import {get_string as getString} from 'core/str';
import state from 'mod_flexbook/state';
import {safeParse} from 'mod_flexbook/utils';
import utils from 'local_ivh5pupload/utils';

export default class H5pUpload extends Base {
    /**
     * Creates an instance of the class.
     * @param {Array} annotations The annotations object
     * @param {Object} properties Properties of the interaction type
     */
    constructor(annotations, properties) {
        super(annotations, properties);
        $(document).on('interactionrun', (e) => {
            const annotation = e.originalEvent.detail.annotation;
            if (annotation.type === 'h5pupload') {
                setTimeout(() => {
                    window.dispatchEvent(new Event('resize'));
                    const iframe = document.querySelector(`#message[data-id='${annotation.id}'] iframe`);
                    if (iframe && iframe.contentWindow) {
                        iframe.contentWindow.dispatchEvent(new Event('resize'));
                    }
                }, 1000);
            }
        });
    }

    /**
     * Called when the edit form is loaded.
     * @param {Object} form The form object
     * @param {Event} event The event object
     * @return {void}
     */
    onEditFormLoaded(form, event) {
        return {form, event};
    }

    /** @override */
    async postContentRender(annotation, $message, callback) {
        $message.addClass('hascontentbank');
        return utils.postContentRender(this, annotation, $message, callback);
    }

    /**
     * Resizes the iframe.
     * @param {Object} annotation - The annotation object containing the id.
     */
    resizeIframe(annotation) {
        utils.resizeIframe(annotation);
    }

    /** @override */
    async applyContent(annotation, $message = null, existingstate = null) {
        let self = this;
        if (!$message) {
            $message = $(`#message[data-id='${annotation.id}']`);
        }

        // Remove .modal-dialog-centered class to avoid flickering when H5P content resizes.
        $message.removeClass('modal-dialog-centered');

        let annoid = annotation.id;

        const advanced = safeParse(annotation.advanced, {});
        const saveState = advanced.savecurrentstate == 1 ? 1 : 0;

        const afterLog = async(log) => {
            const xAPICheck = (annotation) => {
                utils.initH5PIntegration(self, annotation, $message, log, saveState, state,
                    async(statement, H5PIntegration, id) => {
                    if (!self.isEditMode() && state.isMascotActive
                        && statement.verb.id == 'http://adlnet.gov/expapi/verbs/answered') {
                        // Get the score result
                        let result = statement.result;
                        if (result && result.success === true) {
                            self.dispatchEvent('iv:correct');
                        } else if (result && result.success === false) {
                            self.dispatchEvent('iv:incorrect');
                        }
                    }
                    if (annotation.completed) {
                        return;
                    }
                    if ((statement.verb.id == 'http://adlnet.gov/expapi/verbs/completed'
                        || statement.verb.id == 'http://adlnet.gov/expapi/verbs/answered')
                        && statement.object.id.indexOf('subContentId') < 0
                        && !statement.context.contextActivities.parent) {
                        if (self.isEditMode()) {
                            $(`#message[data-id='${annotation.id}'] #title .btns .xapi`).remove();
                            $(`#message[data-id='${annotation.id}'] #title .btns`)
                                .prepend(`<div class="xapi alert-success d-inline px-2 iv-rounded-pill">
                                        <i class="fa fa-check iv-mr-2"></i>
                                        ${await getString('xapieventdetected', 'local_ivh5pupload')}
                                        </div>`);
                            if (state.audio && state.audio.pop) {
                                state.audio.pop.play();
                            }
                            return;
                        }
                        let complete = false;
                        let textclass = '';
                        let result = statement.result;
                        if (annotation.completiontracking == 'completepass'
                            && result && result.score.scaled >= 0.5) {
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
                            details.xp = annotation.xp;
                            if (annotation.char1 == '1') { // Partial points.
                                details.xp = (result.score.scaled * annotation.xp).toFixed(2);
                            }
                            details.percent = details.xp / annotation.xp;
                            details.duration = state.getTimespent ? await state.getTimespent(annotation.id) : 0;
                            details.timecompleted = completeTime.getTime();
                            const completiontime = completeTime.toLocaleString();
                            let duration = await self.formatTime(details.duration / 1000);
                            details.reportView = '##' + completiontime + "|"
                                + duration + "|"
                                + result.score.raw + "/" + result.score.max + "|"
                                + textclass + "|"
                                + Number(details.xp);
                            const hasState = saveState == 1
                                && H5PIntegration.contents[id]
                                && H5PIntegration.contents[id].contentUserData
                                && H5PIntegration.contents[id].contentUserData[0];
                            details.details = hasState ? H5PIntegration.contents[id].contentUserData[0].state : '';
                            // Must wait 1.5 seconds or so to let the saveState finish.
                            // Otherwise, the completion will be incomplete.
                            setTimeout(function() {
                                self.toggleCompletion(annoid, 'mark-done', 'automatic', details);
                            }, 1500);
                        }

                        const advancedAction = safeParse(annotation.advanced, {});
                        if (result.score.scaled < 0.5) {
                            if (advancedAction.jumptofail) {
                                setTimeout(function() {
                                    state.navigateToAnnotation(advancedAction.jumptofail, true);
                                }, 1000);
                            }
                        } else {
                            if (advancedAction.jumptopass) {
                                setTimeout(function() {
                                    state.navigateToAnnotation(advancedAction.jumptopass, true);
                                }, 1000);
                            }
                        }
                    }
                });
            };

            // We don't need to run the render method every time the content is applied. We can cache the content.
            if (!self.cache[annotation.id] || self.isEditMode()) {
                self.cache[annotation.id] = await self.render(annotation);
            }
            const data = self.cache[annotation.id];

            $message.find(`.modal-body`).html(data).attr('id', 'content').fadeIn(300);

            const iframe = $message.find('iframe')[0];
            if (iframe && iframe.contentWindow) {
                const translationAttr = iframe.getAttribute('data-translation')
                    || iframe.closest('[data-translation]')?.getAttribute('data-translation');
                let translation = null;
                if (translationAttr) {
                    try {
                        translation = JSON.parse(translationAttr);
                    } catch (e) {
                        translation = null;
                    }
                }

                let _h5pIntegration;
                Object.defineProperty(iframe.contentWindow, 'H5PIntegration', {
                    configurable: true,
                    enumerable: true,
                    get: function() {
                        return _h5pIntegration;
                    },
                    set: function(val) {
                        _h5pIntegration = val;
                        if (val && val.contents) {
                            const id = Object.keys(val.contents)[0];
                            if (id && val.contents[id]) {
                                if (log !== '' && log !== null) {
                                    if (!val.contents[id].contentUserData) {
                                        val.contents[id].contentUserData = [{}];
                                    } else if (typeof val.contents[id].contentUserData === 'string') {
                                        val.contents[id].contentUserData = [{}];
                                    } else if (!val.contents[id].contentUserData[0]) {
                                        val.contents[id].contentUserData[0] = {};
                                    }
                                    val.contents[id].contentUserData[0].state = log;
                                }

                                if (translation && val.contents[id].jsonContent) {
                                    try {
                                        const originalParams = JSON.parse(val.contents[id].jsonContent);
                                        const translatedParams = utils.mergeTranslation(originalParams, translation);
                                        val.contents[id].jsonContent = JSON.stringify(translatedParams);
                                    } catch (e) {
                                        window.console.error('[H5P Translation] Error merging translations: ', e);
                                    }
                                }
                            }
                        }
                    }
                });
            }

            self.postContentRender(annotation, $message, xAPICheck(annotation));

            if (existingstate !== null && existingstate !== undefined) {
                return;
            }

            if (self.isEditMode()) {
                return;
            }

            // If annotation is incomplete, we want to save the state when the interaction is closed.
            if (!annotation.completed && saveState == 1) {
                let namespace = annotation.id;
                let eventName = `interactionclose.${namespace} interactionrefresh.${namespace}`; // Use a unique namespace.
                $(document).off(eventName).on(eventName, async function(e) {
                    if (e.detail.annotation.id == annotation.id) {
                        try {
                            const iframe = document.querySelector(`#message[data-id='${annotation.id}'] iframe`);
                            const H5PIntegration = iframe ? iframe.contentWindow.H5PIntegration : window.H5PIntegration;
                            if (H5PIntegration) {
                                let content = H5PIntegration.contents;
                                let id = Object.keys(content)[0];
                                let contentuserData = H5PIntegration.contents[id].contentUserData[0];
                                let cstate = contentuserData.state;
                                await self.saveLog(annotation, {
                                    text1: JSON.stringify(cstate),
                                    char1: annotation.type,
                                }, self.userid, true);
                            }
                        } catch (e) {
                            //
                        }
                    }
                });
            }
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
            try {
                log = JSON.parse(logs[0].text1);
            } catch (e) {
                log = '';
            }

            // Show a confirmation message if the state is not empty.
            if (log !== '' && log !== null) {
                Notification.saveCancel(
                    await getString('resume', 'local_ivh5pupload'),
                    await getString('resumeconfirm', 'local_ivh5pupload'),
                    await getString('resume', 'local_ivh5pupload'),
                    function() {
                        afterLog(log);
                    },
                    function() {
                        afterLog('');
                    }
                );
            } else {
                afterLog(log);
            }
        }
    }

    /** @override */
    async getCompletionData(annotation, userid) {
        let logs = await this.getLogs(annotation, [userid]);
        let log = '';
        if (logs.length > 0) {
            try {
                log = JSON.parse(logs[0].text1);
            } catch (e) {
                log = '';
            }
        }
        annotation.displayoptions = 'popup';
        annotation.hascompletion = 0;
        annotation.completed = true;
        this.previewInteraction(annotation, log);
        return log;
    }

    /** @override */
    renderReportView(annotation, details, data) {
        return utils.renderReportView(annotation, details, data, super.renderReportView.bind(this));
    }
}
