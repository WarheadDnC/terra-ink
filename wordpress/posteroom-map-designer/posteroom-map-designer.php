<?php
/**
 * Plugin Name: Posteroom Map Designer
 * Description: Map poster designer with A3/A4 WooCommerce variations, artwork uploads and order files.
 * Version: 0.1.0
 * Author: Reckoning Web
 * License: AGPL-3.0-only
 * Requires at least: 6.5
 * Requires PHP: 8.1
 * Requires Plugins: woocommerce
 * Text Domain: posteroom-maps
 */
namespace Posteroom\Maps;
defined('ABSPATH') || exit;
const VERSION = '0.1.0';
const FILE = __FILE__;
require_once __DIR__ . '/includes/Storage.php';
require_once __DIR__ . '/includes/Plugin.php';

add_action('before_woocommerce_init', static function () {
    if (class_exists('Automattic\\WooCommerce\\Utilities\\FeaturesUtil')) {
        \Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility('custom_order_tables', FILE, true);
    }
});
add_action('plugins_loaded', static function () { (new Plugin())->boot(); });
register_activation_hook(FILE, static function () {
    if (!wp_next_scheduled('posteroom_maps_cleanup')) {
        wp_schedule_event(time() + DAY_IN_SECONDS, 'daily', 'posteroom_maps_cleanup');
    }
});
register_deactivation_hook(FILE, static function () { wp_clear_scheduled_hook('posteroom_maps_cleanup'); });
