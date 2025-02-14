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
        ];
    }

    /**
     * Get the content.
     *
     * @param array $arg The arguments.
     * @return string The content.
     */
    public function get_content($arg) {
        global $CFG;
        $fs = get_file_storage();
        $files = $fs->get_area_files($arg["contextid"], 'mod_interactivevideo', 'content', $arg["id"], 'id DESC', false);
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
            // Get the file extension.
            $ext = pathinfo($file->get_filename(), PATHINFO_EXTENSION);
            if ($ext == 'h5p') {
                return '<div class="loader w-100 position-absolute" style="top: 50%; left: 0;"></div>
                <div class="w-100 h5p">'
                    . \core_h5p\player::display($url, new \stdClass, true, 'mod_interactivevideo') . '</div>';
            } else {
                return '<div class="loader w-100 position-absolute" style="top: 50%; left: 0;"></div>
                <iframe id="iframe" class="h5p-player" src="'
                    . $url->out()
                    . '" style="width: 100%; height: 100%" frameborder="0" allow="autoplay" class="rounded-0"></iframe>'
                    . '<script src="' . new moodle_url('/local/ivh5pupload/h5p-resizer.js') . '"></script>';
            }
        }
        return 'No content found';
    }
}
