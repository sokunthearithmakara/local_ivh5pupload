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

/**
 * Settings for the interactivevideo module
 *
 * @package    local_ivh5pupload
 * @copyright  2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
defined('MOODLE_INTERNAL') || die;

if ($hassiteconfig) {
    $pluginname = get_string('pluginname', 'local_ivh5pupload');

    $ivsettings = new admin_settingpage('local_ivh5pupload_settings', $pluginname);
    $ADMIN->add('modivcontenttype', $ivsettings);

    // CSS upload settings.
    $config = new admin_setting_configstoredfile(
        'local_ivh5pupload/customcss',
        get_string('customcss', 'local_ivh5pupload'),
        get_string('customcssdesc', 'local_ivh5pupload'),
        'customcss',
        0,
        ['maxfiles' => 1, 'accepted_types' => 'text/css']
    );

    $ivsettings->add($config);
}
