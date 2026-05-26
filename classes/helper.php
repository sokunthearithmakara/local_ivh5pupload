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
 * Helper class for H5P Upload plugin.
 *
 * @package    local_ivh5pupload
 * @copyright  2026 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class helper {
    /**
     * Prepares data for dynamic form submission.
     *
     * @param \stdClass $data The form data.
     * @param string $component The Moodle component name.
     * @return \stdClass The prepared data.
     */
    public static function prepare_h5pupload_data(\stdClass $data, string $component = 'mod_interactivevideo'): \stdClass {
        global $CFG;
        require_once($CFG->libdir . '/filelib.php');

        $conditionaltime = json_decode($data->text1 ?? '', true);
        if ($conditionaltime) {
            $data->gotoonpassing = $conditionaltime['gotoonpassing'] ?? 0;
            $data->forceonpassing = $conditionaltime['forceonpassing'] ?? 0;
            $data->timeonpassing = date('H:i:s', strtotime('TODAY') + ($conditionaltime['timeonpassing'] ?? 0));
            $data->gotoonfailed = $conditionaltime['gotoonfailed'] ?? 0;
            $data->forceonfailed = $conditionaltime['forceonfailed'] ?? 0;
            $data->timeonfailed = date('H:i:s', strtotime('TODAY') + ($conditionaltime['timeonfailed'] ?? 0));
            $data->showtextonpassing = $conditionaltime['showtextonpassing'] ?? 0;
            $data->textonpassing = $conditionaltime['textonpassing'] ?? '';
            $data->showtextonfailed = $conditionaltime['showtextonfailed'] ?? 0;
            $data->textonfailed = $conditionaltime['textonfailed'] ?? '';
        }

        // Load the file in the draft area.
        $draftitemid = file_get_submitted_draft_itemid('content');
        file_prepare_draft_area($draftitemid, $data->contextid, $component, 'content', $data->id);
        $data->content = $draftitemid;

        // Prepare translation files in draft area from text2 file area.
        $draftitemidtrans = file_get_submitted_draft_itemid('text2');
        file_prepare_draft_area($draftitemidtrans, $data->contextid, $component, 'text2', $data->id);
        $data->text2 = $draftitemidtrans;

        return $data;
    }

    /**
     * Saves the draft file area.
     *
     * @param \stdClass $fromform The submitted form data.
     * @param string $component The Moodle component name.
     * @return void
     */
    public static function save_h5pupload_data(\stdClass $fromform, string $component = 'mod_interactivevideo'): void {
        global $CFG;
        require_once($CFG->libdir . '/filelib.php');

        $draftitemid = $fromform->content;
        file_save_draft_area_files(
            $draftitemid,
            $fromform->contextid,
            $component,
            'content',
            $fromform->id
        );

        // Save translation files from draft area to text2 file area.
        $draftitemidtrans = $fromform->text2 ?? null;
        if ($draftitemidtrans) {
            file_save_draft_area_files(
                $draftitemidtrans,
                $fromform->contextid,
                $component,
                'text2',
                $fromform->id
            );
        }

        // Get file content, edit its H5PIntegration object, and save it back if the file is html.
        $fs = get_file_storage();
        $files = $fs->get_area_files($fromform->contextid, $component, 'content', $fromform->id, 'id DESC', false);
        $file = reset($files);
        if ($file) {
            $mimetype = $file->get_mimetype();
            if ($mimetype !== 'text/html') {
                return;
            }
            $content = $file->get_content();
            $content = str_replace('H5PIntegration = {"ajax"', 'H5PIntegration = {"reportingIsEnabled": true, "ajax"', $content);

            // Save the file back.
            $fileinfo = [
                'contextid' => $fromform->contextid,
                'component' => $component,
                'filearea' => 'content',
                'itemid' => $fromform->id,
                'filepath' => '/',
                'filename' => $file->get_filename(),
            ];

            $file->delete();
            $fs->create_file_from_string($fileinfo, $content);
        }
    }
}
