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

use moodle_url;

/**
 * Class main
 *
 * @package    local_ivh5pupload
 * @copyright  2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class main extends \ivplugin_richtext\main {
    /**
     * Get the property.
     */
    public function get_property() {
        global $CFG;
        $customcss = '';
        $config = get_config('local_ivh5pupload', 'customcss');
        if ($config) {
            $fs = get_file_storage();
            $file = $fs->get_area_files(1, 'local_ivh5pupload', 'customcss', 0, 'filesize DESC', false);
            $file = reset($file);
            if ($file) {
                $url = moodle_url::make_pluginfile_url(
                    $file->get_contextid(),
                    $file->get_component(),
                    $file->get_filearea(),
                    $file->get_itemid(),
                    $file->get_filepath(),
                    $file->get_filename()
                );
                $customcss = $url->out();
            }
        }

        return [
            'name' => 'h5pupload',
            'icon' => 'bi bi-file-zip',
            'title' => get_string('h5puploadcontent', 'local_ivh5pupload'),
            'amdmodule' => 'local_ivh5pupload/main',
            'class' => 'local_ivh5pupload\\main',
            'form' => 'local_ivh5pupload\\form',
            'hascompletion' => true,
            'hastimestamp' => true,
            'hasreport' => true,
            'description' => get_string('h5puploaddescription', 'local_ivh5pupload'),
            'author' => 'tsmakara',
            'authorlink' => 'mailto:sokunthearithmakara@gmail.com',
            'tutorial' => get_string('tutorialurl', 'local_ivh5pupload'),
            'customcss' => $customcss,
            'preloadstrings' => false,
            'flexbook' => true,
            'fbdescription' => get_string('h5puploaddescription', 'local_ivh5pupload'),
            'fbamdmodule' => 'local_ivh5pupload/fbmain',
            'fbform' => 'local_ivh5pupload\\fbform',
            'dndextensions' => ['h5p', 'html'],
            'component' => 'local_ivh5pupload',
        ];
    }

    /**
     * Create a new interaction instance.
     *
     * @param array $data The data for the new instance.
     * @return \stdClass The newly created interaction record.
     */
    public function create_instance($data) {
        global $DB;
        $data = (object) $data;
        $draftitemid = $data->draftitemid;
        unset($data->draftitemid);

        // Form default advanced settings if empty.
        if (empty($data->advanced)) {
            $data->advanced = $this->flexbook_advanced();
            $data->advanced = json_encode($data->advanced);
            $data->completiontracking = 'complete';
            $data->hascompletion = 1;
            $data->xp = 1;
        }

        $data->id = $DB->insert_record('flexbook_items', $data);

        // Save files from draft area.
        if ($draftitemid) {
            $fromform = new \stdClass();
            $fromform->id = $data->id;
            $fromform->contextid = $data->contextid;
            $fromform->content = $draftitemid;

            \local_ivh5pupload\helper::save_h5pupload_data($fromform, 'mod_flexbook');
        }

        return \mod_flexbook\util::get_item($data->id, $data->contextid);
    }

    /**
     * Get the content.
     *
     * @param array $arg The arguments.
     * @return string The content.
     */
    public function get_content($arg) {
        $component = 'mod_' . (isset($arg['plugin']) ? $arg['plugin'] : 'interactivevideo');
        $fs = get_file_storage();
        $files = $fs->get_area_files($arg["contextid"], $component, 'content', $arg["id"], 'id DESC', false);
        $file = reset($files);
        if ($file) {
            $url = \moodle_url::make_pluginfile_url(
                $file->get_contextid(),
                $file->get_component(),
                $file->get_filearea(),
                $file->get_itemid(),
                $file->get_filepath(),
                $file->get_filename()
            );

            // Fetch translation files from text2 file area.
            $translationdata = '';
            $filestrans = $fs->get_area_files($arg['contextid'], $component, 'itext2', $arg['id'], 'id DESC', false);
            $translations = [];
            foreach ($filestrans as $tfile) {
                if ($tfile->is_directory()) {
                    continue;
                }
                $tfilename = $tfile->get_filename();
                $textension = pathinfo($tfilename, PATHINFO_EXTENSION);
                if ($textension === 'json') {
                    $tlang = pathinfo($tfilename, PATHINFO_FILENAME);
                    $tcontent = $tfile->get_content();
                    $tdecoded = json_decode($tcontent, true);
                    if (is_array($tdecoded)) {
                        $translations[$tlang] = $tdecoded;
                    }
                }
            }

            if (!empty($translations)) {
                $lang = current_language();
                $matchedlang = null;
                if (isset($translations[$lang])) {
                    $matchedlang = $lang;
                } else {
                    $langpart = explode('_', $lang)[0];
                    if (isset($translations[$langpart])) {
                        $matchedlang = $langpart;
                    }
                }
                if ($matchedlang) {
                    $translationdata = json_encode($translations[$matchedlang], JSON_UNESCAPED_UNICODE);
                }
            }

            $translationattr = !empty($translationdata) ? ' data-translation="' . s($translationdata) . '"' : '';

            // Get the file extension.
            $ext = pathinfo($file->get_filename(), PATHINFO_EXTENSION);
            if ($ext == 'h5p') {
                return '<div class="loader w-100 position-absolute" style="top: 50%; left: 0;"></div>
                <div class="w-100 h5p"' . $translationattr . '>'
                    . \core_h5p\player::display($url, new \stdClass(), true, $component)
                    . '</div>';
            } else {
                return '<div class="loader w-100 position-absolute" style="top: 50%; left: 0;"></div>
                <iframe id="iframe" class="h5p-player"' . $translationattr . ' src="'
                    . $url->out()
                    . '" style="width: 100%; height: 100%" frameborder="0" allow="autoplay" class="iv-rounded-0"></iframe>'
                    . '<script src="' . new moodle_url('/local/ivh5pupload/h5p-resizer.js')
                    . '"></script>';
            }
        }
        return 'No content found';
    }
}
