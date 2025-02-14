<?php
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

namespace local_ivh5pupload;

/**
 * Class form
 *
 * @package    local_ivh5pupload
 * @copyright  2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class form extends \mod_interactivevideo\form\base_form {
    /**
     * Sets data for dynamic submission
     * @return void
     */
    public function set_data_for_dynamic_submission(): void {
        global $CFG;

        $data = $this->set_data_default();

        $conditionaltime = json_decode($data->text1, true);
        $data->gotoonpassing = $conditionaltime['gotoonpassing'];
        $data->forceonpassing = $conditionaltime['forceonpassing'];
        $data->timeonpassing = date('H:i:s', strtotime('TODAY') + $conditionaltime['timeonpassing']);
        $data->gotoonfailed = $conditionaltime['gotoonfailed'];
        $data->forceonfailed = $conditionaltime['forceonfailed'];
        $data->timeonfailed = date('H:i:s', strtotime('TODAY') + $conditionaltime['timeonfailed']);
        $data->showtextonpassing = $conditionaltime['showtextonpassing'];
        $data->textonpassing = $conditionaltime['textonpassing'];
        $data->showtextonfailed = $conditionaltime['showtextonfailed'];
        $data->textonfailed = $conditionaltime['textonfailed'];

        require_once($CFG->libdir . '/filelib.php');

        // Load the file in the draft area. mod_interactive, content.
        $draftitemid = file_get_submitted_draft_itemid('content');
        file_prepare_draft_area($draftitemid, $data->contextid, 'mod_interactivevideo', 'content', $data->id);

        $data->content = $draftitemid;

        $this->set_data($data);
    }

    /**
     * Pre-processes the form data
     *
     * @param mixed $data
     * @return mixed
     */
    public function pre_processing_data($data) {
        $data = parent::pre_processing_data($data);
        // If the completion tracking is set to none, manual, or view, then the partial points should be 0.
        if (in_array($data->completiontracking, ['none', 'manual', 'view'])) {
            $data->char1 = 0;
            $data->text1 = '';
        } else {
            $data->text1 = [
                'gotoonpassing' => $data->gotoonpassing,
                'forceonpassing' => $data->gotoonpassing == 1 && $data->forceonpassing == 1 ? 1 : 0,
                'timeonpassing' => $data->gotoonpassing == 1 ? $data->timeonpassing : '00:00:00',
                'showtextonpassing' => $data->showtextonpassing,
                'textonpassing' => $data->textonpassing,
                'gotoonfailed' => $data->gotoonfailed,
                'forceonfailed' => $data->gotoonfailed == 1 && $data->forceonfailed == 1 ? 1 : 0,
                'timeonfailed' => $data->gotoonfailed == 1 ? $data->timeonfailed : '00:00:00',
                'showtextonfailed' => $data->showtextonfailed,
                'textonfailed' => $data->textonfailed,
            ];

            // Convert timestamp to seconds.
            $data->text1['timeonpassing'] = strtotime($data->text1['timeonpassing']) - strtotime('TODAY');
            $data->text1['timeonfailed'] = strtotime($data->text1['timeonfailed']) - strtotime('TODAY');

            $data->text1 = json_encode($data->text1);
        }
        return $data;
    }

    /**
     * Form definition
     *
     * @return void
     */
    public function definition() {
        $mform = &$this->_form;

        $this->standard_elements();

        $mform->addElement('text', 'title', '<i class="bi bi-quote mr-2"></i>' . get_string('title', 'mod_interactivevideo'));
        $mform->setType('title', PARAM_TEXT);
        $mform->setDefault('title', get_string('defaulttitle', 'mod_interactivevideo'));
        $mform->addRule('title', get_string('required'), 'required', null, 'client');

        // H5P upload.
        $filemanageroptions = [
            'maxbytes'       => 0,
            'subdirs'        => 0,
            'maxfiles'       => 1,
            'accepted_types' => ['.html', '.h5p'],
        ];

        $mform->addElement(
            'filemanager',
            'content',
            '<i class="bi bi-file-zip mr-2"></i>' . get_string('h5ppackage', 'local_ivh5pupload'),
            null,
            $filemanageroptions
        );
        $mform->addRule('content', get_string('required'), 'required', null, 'client');

        // Option to use custom CSS.
        $mform->addElement('advcheckbox', 'char2', '', get_string('usecustomcss', 'local_ivh5pupload'), null, [0, 1]);
        $mform->setDefault('char2', 1);
        $mform->addHelpButton('char2', 'usecustomcss', 'local_ivh5pupload');

        $this->completion_tracking_field('complete', [
            'none' => get_string('completionnone', 'mod_interactivevideo'),
            'manual' => get_string('completionmanual', 'mod_interactivevideo'),
            'view' => get_string('completiononview', 'mod_interactivevideo'),
            'complete' => get_string('completiononcomplete', 'mod_interactivevideo'),
            'completepass' => get_string('completiononcompletepass', 'mod_interactivevideo'),
            'completefull' => get_string('completiononcompletefull', 'mod_interactivevideo'),
        ]);
        $this->xp_form_field();
        $mform->hideIf('xp', 'completiontracking', 'eq', 'none');
        $mform->addElement(
            'advcheckbox',
            'char1',
            '',
            get_string('awardpartialpoints', 'local_ivh5pupload'),
            ['group' => 1],
            [0, 1]
        );
        $mform->hideIf('char1', 'completiontracking', 'in', ['none', 'manual', 'view']);
        $mform->disabledIf('char1', 'xp', 'eq', 0);
        $mform->addHelpButton('char1', 'awardpartialpoints', 'local_ivh5pupload');

        $this->display_options_field();
        $this->advanced_form_fields([
            'hascompletion' => true,
        ]);

        // Go to segment when passed/failed.
        // Handle passing grade.
        $mform->addElement('hidden', 'text1', null);
        $mform->setType('text1', PARAM_RAW);
        $elements = [];
        $elements[] = $mform->createElement(
            'advcheckbox',
            'gotoonpassing',
            '',
            get_string('gototimestamp', 'ivplugin_contentbank'),
            null,
            [0, 1]
        );
        $elements[] = $mform->createElement(
            'advcheckbox',
            'forceonpassing',
            '',
            get_string('force', 'ivplugin_contentbank'),
            null,
            [0, 1]
        );
        $elements[] = $mform->createElement(
            'static',
            'gotosegment_desc',
            '',
            '<span class="text-muted small w-100 d-block">'
                . get_string('gotosegmentpassing_desc', 'ivplugin_contentbank') . '</span>'
        );
        $mform->addGroup(
            $elements,
            'gotosegmentpassing',
            get_string('onpassinggrade', 'ivplugin_contentbank'),
            '',
            false
        );
        $mform->disabledIf('forceonpassing', 'gotoonpassing', 'eq', 0);

        $elements = [];
        $elements[] = $mform->createElement(
            'text',
            'timeonpassing',
            '<i class="bi bi-clock mr-2"></i>' . get_string('timeonpassing', 'ivplugin_contentbank'),
            [
                'size' => 25,
                'class' => 'timestamp-input',
                'readonly' => 'readonly',
                'placeholder' => '00:00:00',
            ]
        );
        $mform->setType('timeonpassing', PARAM_TEXT);
        $elements[] = $mform->createElement('button', 'timeonpassingbutton', '<i class="bi bi-stopwatch"></i>', [
            'class' => 'pickatime',
            'title' => get_string('pickatime', 'ivplugin_contentbank'),
            'data-field' => 'timeonpassing',
        ]);
        $elements[] = $mform->createElement('button', 'resettimepass', '<i class="bi bi-trash3 text-danger"></i>', [
            'class' => 'resettime',
            'title' => get_string('resettime', 'ivplugin_contentbank'),
            'data-field' => 'timeonpassing',
        ]);
        $mform->addGroup($elements, 'timeonpassinggroup', get_string('timeonpassing', 'ivplugin_contentbank'), '', false);
        // Text to display when passing.
        $element = [];
        $element[] = $mform->createElement(
            'advcheckbox',
            'showtextonpassing',
            '',
            get_string('showtextonpassing', 'ivplugin_contentbank'),
            null,
            [0, 1]
        );
        $element[] = $mform->createElement(
            'editor',
            'textonpassing',
        );
        $mform->setType('textonpassing', PARAM_RAW);
        $mform->addGroup($element, 'textonpassinggroup', '', '', false);

        $mform->hideIf('gotosegmentpassing', 'completiontracking', 'in', ['none', 'manual', 'view']);
        $mform->hideIf('timeonpassinggroup', 'completiontracking', 'in', ['none', 'manual', 'view']);
        $mform->hideIf('textonpassinggroup', 'completiontracking', 'in', ['none', 'manual', 'view']);
        $mform->hideIf('timeonpassinggroup', 'gotoonpassing', 'eq', 0);
        $mform->hideIf('textonpassing', 'showtextonpassing', 'eq', 0);

        // Handle failing grade.
        $elements = [];
        $elements[] = $mform->createElement(
            'advcheckbox',
            'gotoonfailed',
            '',
            get_string('gototimestamp', 'ivplugin_contentbank'),
            null,
            [0, 1]
        );
        $elements[] = $mform->createElement(
            'advcheckbox',
            'forceonfailed',
            '',
            get_string('force', 'ivplugin_contentbank'),
            null,
            [0, 1]
        );
        $elements[] = $mform->createElement(
            'static',
            'gotosegment_desc',
            '',
            '<span class="text-muted small w-100 d-block">' . get_string('gotosegment_desc', 'ivplugin_contentbank') . '</span>'
        );
        $mform->addGroup($elements, 'gotosegment', get_string('onfailedgrade', 'ivplugin_contentbank'), '', false);
        $mform->disabledIf('forceonfailed', 'gotoonfailed', 'eq', 0);

        $elements = [];
        $elements[] = $mform->createElement(
            'text',
            'timeonfailed',
            '<i class="bi bi-clock mr-2"></i>' . get_string('timeonfailed', 'ivplugin_contentbank'),
            [
                'size' => 25,
                'class' => 'timestamp-input',
                'readonly' => 'readonly',
                'placeholder' => '00:00:00',
            ]
        );
        $mform->setType('timeonfailed', PARAM_TEXT);
        $elements[] = $mform->createElement('button', 'timeonfailedbutton', '<i class="bi bi-stopwatch"></i>', [
            'class' => 'pickatime',
            'title' => get_string('pickatime', 'ivplugin_contentbank'),
            'data-field' => 'timeonfailed',
        ]);
        $elements[] = $mform->createElement('button', 'resettimefail', '<i class="bi bi-trash3 text-danger"></i>', [
            'class' => 'resettime',
            'title' => get_string('resettime', 'ivplugin_contentbank'),
            'data-field' => 'timeonfailed',
        ]);
        $mform->addGroup($elements, 'timeonfailedgroup', get_string('timeonfailed', 'ivplugin_contentbank'), '', false);

        // Text to display when failed.
        $element = [];
        $element[] = $mform->createElement(
            'advcheckbox',
            'showtextonfailed',
            '',
            get_string('showtextonfailed', 'ivplugin_contentbank'),
            null,
            [0, 1]
        );
        $element[] = $mform->createElement(
            'editor',
            'textonfailed',
        );
        $mform->setType('textonfailed', PARAM_RAW);
        $mform->addGroup($element, 'textonfailedgroup', '', '', false);

        $mform->hideIf('gotosegment', 'completiontracking', 'in', ['none', 'manual', 'view']);
        $mform->hideIf('timeonfailedgroup', 'completiontracking', 'in', ['none', 'manual', 'view']);
        $mform->hideIf('textonfailedgroup', 'completiontracking', 'in', ['none', 'manual', 'view']);
        $mform->hideIf('timeonfailedgroup', 'gotoonfailed', 'eq', 0);
        $mform->hideIf('textonfailed', 'showtextonfailed', 'eq', 0);

        $this->close_form();
    }

    /**
     * Process dynamic submission
     *
     * @return void
     */
    public function process_dynamic_submission() {
        $fromform = parent::process_dynamic_submission();
        $draftitemid = $fromform->content;
        file_save_draft_area_files(
            $draftitemid,
            $fromform->contextid,
            'mod_interactivevideo',
            'content',
            $fromform->id,
        );

        // Get file content, edit its H5PIntegration object, and save it back if the file is html.
        $fs = get_file_storage();
        $file = $fs->get_area_files($fromform->contextid, 'mod_interactivevideo', 'content', $fromform->id, 'id DESC', false);
        $file = reset($file);
        if ($file) {
            $mimetype = $file->get_mimetype();
            if ($mimetype !== 'text/html') {
                return $fromform;
            }
            $content = $file->get_content();
            $content = str_replace('H5PIntegration = {"ajax"', 'H5PIntegration = {"reportingIsEnabled": true, "ajax"', $content);

            // Save the file back.
            $fileinfo = [
                'contextid' => $fromform->contextid,
                'component' => 'mod_interactivevideo',
                'filearea' => 'content',
                'itemid' => $fromform->id,
                'filepath' => '/',
                'filename' => $file->get_filename(),
            ];

            $file->delete();
            $file = $fs->create_file_from_string($fileinfo, $content);
        }

        return $fromform;
    }
}
