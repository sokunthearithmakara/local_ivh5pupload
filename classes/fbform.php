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
 * Class fbform
 *
 * @package    local_ivh5pupload
 * @copyright  2026 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class fbform extends \mod_flexbook\form\base_form {
    /**
     * Sets data for dynamic submission
     * @return void
     */
    public function set_data_for_dynamic_submission(): void {
        $data = $this->set_data_default();
        $data = \local_ivh5pupload\helper::prepare_h5pupload_data($data, 'mod_flexbook');
        $this->set_data($data);
    }

    /**
     * Process dynamic submission
     *
     * @return void
     */
    public function process_dynamic_submission() {
        $fromform = parent::process_dynamic_submission();
        \local_ivh5pupload\helper::save_h5pupload_data($fromform, 'mod_flexbook');
        return $fromform;
    }

    /**
     * Form definition
     *
     * @return void
     */
    public function definition() {
        $mform = &$this->_form;

        $this->standard_elements();

        $mform->addElement('text', 'title', '<i class="bi bi-quote iv-mr-2"></i>' . get_string('title', 'mod_interactivevideo'));
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
            '<i class="bi bi-file-zip iv-mr-2"></i>' . get_string('h5ppackage', 'local_ivh5pupload'),
            null,
            $filemanageroptions
        );
        $mform->addRule('content', get_string('required'), 'required', null, 'client');

        // Translation files.
        $translationoptions = [
            'maxbytes'       => 0,
            'subdirs'        => 0,
            'maxfiles'       => 20,
            'accepted_types' => ['.json'],
        ];

        $mform->addElement(
            'filemanager',
            'text2',
            '<i class="bi bi-translate iv-mr-2"></i>' . get_string('translationfiles', 'local_ivh5pupload'),
            null,
            $translationoptions
        );
        $mform->addHelpButton('text2', 'translationfiles', 'local_ivh5pupload');

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

        $this->advanced_form_fields([
            'hascompletion' => true,
        ]);

        // Text direction.
        $group = [];
        $group[] = $mform->createElement(
            'select',
            'dir',
            '',
            [
                '' => get_string('sitedefault', 'local_ivh5pupload'),
                'content' => get_string('contentdefault', 'local_ivh5pupload'),
                'ltr' => get_string('lefttoright', 'local_ivh5pupload'),
                'rtl' => get_string('righttoleft', 'local_ivh5pupload'),
            ]
        );
        $group[] = $mform->createElement(
            'static',
            'textdirectiondesc',
            '',
            '<span class="text-muted small w-100 d-block">'
                . get_string('textdirectiondesc', 'local_ivh5pupload') . '</span>'
        );
        $mform->addGroup($group, '', get_string('textdirection', 'local_ivh5pupload'), null, false);

        // Save state.
        $groups = [];
        $groups[] = $mform->createElement(
            'advcheckbox',
            'savecurrentstate',
            '',
            get_string('yes'),
            ['group' => 1],
            [0, 1]
        );
        $groups[] = $mform->createElement(
            'static',
            'savecurrentstatedesc',
            '',
            '<span class="text-muted small w-100 d-block">'
                . get_string('savecurrentstatedesc', 'ivplugin_contentbank') . '</span>'
        );
        $mform->addGroup($groups, '', get_string('savecurrentstate', 'ivplugin_contentbank'), null, false);

        $this->jump_section_fields(true, true);

        $this->close_form();
    }

    /**
     * Process advanced settings
     *
     * @param \stdClass $data
     * @return string
     */
    public function process_advanced_settings($data) {
        $adv = parent::process_advanced_settings($data);
        $adv = json_decode($adv);
        $adv->savecurrentstate = $data->savecurrentstate;
        $adv->dir = $data->dir;
        return json_encode($adv);
    }

    /**
     * Pre-processes the form data
     *
     * @param mixed $data
     * @return mixed
     */
    public function pre_processing_data($data) {
        $data = parent::pre_processing_data($data);
        if (in_array($data->completiontracking, ['none', 'manual', 'view'])) {
            $data->char1 = 0;
        }
        return $data;
    }
}
