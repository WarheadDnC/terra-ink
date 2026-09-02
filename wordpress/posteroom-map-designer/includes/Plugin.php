<?php
namespace Posteroom\Maps;
defined('ABSPATH') || exit;

final class Plugin {
    public static function settings(): array {
        return wp_parse_args(get_option('posteroom_maps', []), [
            'enabled' => 0, 'a3' => 4249, 'a4' => 4250,
            'storage' => dirname(rtrim(ABSPATH, '/')) . '/posteroom-artwork',
        ]);
    }

    public function boot(): void {
        add_shortcode('posteroom_map_designer', [$this, 'shortcode']);
        add_action('admin_menu', [$this, 'admin_menu']);
        add_action('admin_init', [$this, 'register_settings']);
        add_filter('option_page_capability_posteroom_maps', static fn() => 'manage_woocommerce');
        foreach (['posteroom_bootstrap' => 'bootstrap', 'posteroom_add_to_cart' => 'add_to_cart', 'posteroom_map_preview' => 'preview'] as $action => $method) {
            add_action('wp_ajax_' . $action, [$this, $method]);
            add_action('wp_ajax_nopriv_' . $action, [$this, $method]);
        }
        add_action('admin_post_posteroom_map_download', [$this, 'download']);
        add_action('posteroom_maps_cleanup', [Storage::class, 'cleanup']);
        add_filter('woocommerce_get_item_data', [$this, 'item_data'], 20, 2);
        add_filter('woocommerce_cart_item_name', [$this, 'cart_name'], 20, 2);
        add_filter('woocommerce_add_cart_item', [$this, 'name_product'], 20);
        add_filter('woocommerce_get_cart_item_from_session', [$this, 'name_product'], 20);
        add_filter('woocommerce_cart_item_thumbnail', [$this, 'cart_thumbnail'], 20, 2);
        add_filter('woocommerce_store_api_cart_item_images', [$this, 'block_images'], 20, 2);
        add_action('woocommerce_checkout_create_order_line_item', [$this, 'order_item'], 20, 4);
        add_action('woocommerce_new_order_item', [$this, 'retain_artwork'], 20, 3);
        add_action('woocommerce_check_cart_items', [$this, 'check_artwork']);
        add_filter('woocommerce_admin_order_item_thumbnail', [$this, 'admin_thumbnail'], 20, 3);
        add_action('woocommerce_after_order_itemmeta', [$this, 'admin_download'], 20, 3);
        add_action('woocommerce_order_item_meta_start', [$this, 'order_preview'], 20, 4);
    }

    public function admin_menu(): void {
        add_submenu_page('woocommerce', 'Posteroom Maps', 'Posteroom Maps', 'manage_woocommerce', 'posteroom-maps', [$this, 'settings_page']);
    }
    public function register_settings(): void {
        register_setting('posteroom_maps', 'posteroom_maps', ['sanitize_callback' => static function ($input) {
            $old = self::settings();
            return ['enabled' => empty($input['enabled']) ? 0 : 1,
                'a3' => absint($input['a3'] ?? $old['a3']), 'a4' => absint($input['a4'] ?? $old['a4']),
                'storage' => sanitize_text_field($input['storage'] ?? $old['storage'])];
        }]);
    }
    public function settings_page(): void {
        if (!current_user_can('manage_woocommerce')) return;
        $s = self::settings();
        echo '<div class="wrap"><h1>Posteroom Map Designer</h1><p>Place <code>[posteroom_map_designer]</code> in an Elementor Shortcode widget. Use a full-width page.</p>';
        if (!function_exists('WC')) echo '<div class="notice notice-error"><p>Activate WooCommerce first.</p></div>';
        try { Storage::root(); } catch (\Throwable $e) { echo '<div class="notice notice-warning"><p>' . esc_html($e->getMessage()) . '</p></div>'; }
        echo '<form method="post" action="options.php">';
        settings_fields('posteroom_maps');
        echo '<table class="form-table"><tr><th>Ordering</th><td><label><input type="checkbox" name="posteroom_maps[enabled]" value="1" ' . checked($s['enabled'], 1, false) . '> Enable map orders</label></td></tr>';
        foreach (['a3' => 'A3', 'a4' => 'A4'] as $key => $label) {
            echo '<tr><th><label for="prm-' . esc_attr($key) . '">' . esc_html($label) . ' variation ID</label></th><td><input type="number" min="1" id="prm-' . esc_attr($key) . '" name="posteroom_maps[' . esc_attr($key) . ']" value="' . esc_attr($s[$key]) . '">';
            if (function_exists('wc_get_product')) {
                $p = wc_get_product($s[$key]);
                echo '<p class="description">' . ($p && $p->is_type('variation') ? esc_html($p->get_name()) . ' — ' . wp_kses_post($p->get_price_html()) : 'Valid WooCommerce variation required.') . '</p>';
            }
            echo '</td></tr>';
        }
        echo '<tr><th><label for="prm-storage">Private artwork directory</label></th><td><input class="large-text" id="prm-storage" name="posteroom_maps[storage]" value="' . esc_attr($s['storage']) . '"><p class="description">Absolute writable directory outside public_html / the web root. Original files are available only to shop managers. Keep this directory backed up; copy existing files before changing it.</p></td></tr></table>';
        submit_button();
        echo '</form><p>Requires PNG support in GD or Imagick; allow at least 32 MB uploads and 256 MB PHP memory. Unordered artwork is removed after seven days; order artwork is retained. The existing AI generator snippets can remain enabled.</p><p><a href="' . esc_url(plugins_url('source/terra-ink-source.zip', FILE)) . '">Source code</a> | <a href="' . esc_url(plugins_url('build/legal/index.html', FILE)) . '">License notices</a></p></div>';
    }

    public function shortcode(): string {
        static $rendered = false;
        if ($rendered) return ''; // One map editor per page.
        $rendered = true;
        $manifest_path = dirname(FILE) . '/build/.vite/manifest.json';
        $manifest = is_file($manifest_path) ? json_decode(file_get_contents($manifest_path), true) : [];
        $entry = $manifest['src/wordpress.tsx']['file'] ?? '';
        if (!$entry) return '<p>The map designer files are missing. Install the complete plugin ZIP.</p>';
        $base = plugins_url('build/', FILE);
        wp_enqueue_script('posteroom-map-designer', $base . $entry, [], VERSION, true);
        add_filter('script_loader_tag', static function ($tag, $handle) {
            if ($handle !== 'posteroom-map-designer') return $tag;
            $tag = preg_replace('/\s+type=[\x22\x27][^\x22\x27]*[\x22\x27]/', '', $tag);
            return str_replace('<script ', '<script type="module" ', $tag);
        }, 10, 2);
        // Document font registration is required for canvas export and Shadow DOM.
        wp_enqueue_style('posteroom-map-fonts', 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Instrument+Sans:wght@400;500;600;700&family=Spline+Sans+Mono:wght@400;500&display=swap', [], null);
        if (function_exists('WC')) wp_enqueue_script('wc-cart-fragments');
        return '<div data-posteroom-designer data-endpoint="' . esc_url(admin_url('admin-ajax.php')) . '" data-assets="' . esc_url($base) . '" data-source="' . esc_url(plugins_url('source/terra-ink-source.zip', FILE)) . '"><p>Loading map designer…</p></div><noscript>Enable JavaScript to create your map poster.</noscript>';
    }

    private function session(): void {
        if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST' || ($_SERVER['HTTP_X_POSTEROOM_REQUEST'] ?? '') !== '1') {
            throw new \RuntimeException('Invalid shop request.', 403);
        }
        if (isset($_SERVER['HTTP_SEC_FETCH_SITE']) && !in_array($_SERVER['HTTP_SEC_FETCH_SITE'], ['same-origin', 'none'], true)) {
            throw new \RuntimeException('Open the designer on the shop website.', 403);
        }
        if (!function_exists('WC') || !function_exists('wc_load_cart')) throw new \RuntimeException('WooCommerce is unavailable.', 503);
        if (!WC()->cart) wc_load_cart();
        WC()->session->set_customer_session_cookie(true);
        nocache_headers();
    }
    private function product(string $size): \WC_Product_Variation {
        $s = self::settings();
        $p = wc_get_product($s[strtolower($size)] ?? 0);
        if (!$p || !$p->is_type('variation') || !$p->get_parent_id() || !$p->is_purchasable() || !$p->is_in_stock()) {
            throw new \RuntimeException('This poster size is currently unavailable.', 409);
        }
        foreach ($p->get_variation_attributes() as $value) {
            if ($value === '') throw new \RuntimeException('The poster variation needs fixed attributes.', 409);
        }
        return $p;
    }
    private function fail(\Throwable $e): void {
        $status = in_array($e->getCode(), [400, 403, 409, 413, 429, 503], true) ? $e->getCode() : 400;
        // Only our controlled RuntimeException messages are customer-facing.
        $message = $e instanceof \RuntimeException ? $e->getMessage() : 'The shop could not process the poster. Please try again.';
        wp_send_json_error(['message' => $message], $status);
    }
    public function bootstrap(): void {
        try {
            $this->session();
            $token = WC()->session->get('posteroom_map_token');
            if (!$token) { $token = bin2hex(random_bytes(32)); WC()->session->set('posteroom_map_token', $token); WC()->session->save_data(); }
            $ready = (bool) self::settings()['enabled'];
            if ($ready) { try { Storage::root(); } catch (\Throwable $e) { $ready = false; } }
            $offers = [];
            foreach (['A3', 'A4'] as $size) {
                $offer = ['available' => false, 'label' => 'Ordering unavailable'];
                if ($ready) {
                    try {
                        $p = $this->product($size);
                        $label = wc_price(wc_get_price_to_display($p)) . $p->get_price_suffix();
                        $offer = ['available' => true, 'label' => html_entity_decode(wp_strip_all_tags($label), ENT_QUOTES, 'UTF-8')];
                    } catch (\Throwable $e) { /* Unavailable option stays disabled. */ }
                }
                foreach (['portrait', 'landscape'] as $orientation) $offers['print_' . strtolower($size) . '_' . $orientation] = $offer;
            }
            wp_send_json_success(['token' => $token, 'offers' => $offers]);
        } catch (\Throwable $e) { $this->fail($e); }
    }

    public static function validate_design($d): array {
        if (!is_array($d) || ($d['schemaVersion'] ?? null) !== 1 || ($d['dpi'] ?? null) !== 300 ||
            !in_array($d['paperSize'] ?? '', ['A3', 'A4'], true) || !in_array($d['orientation'] ?? '', ['portrait', 'landscape'], true)) {
            throw new \RuntimeException('Choose an A3 or A4 poster size.', 400);
        }
        [$w, $h] = $d['paperSize'] === 'A3' ? [29.7, 42] : [21, 29.7];
        if ($d['orientation'] === 'landscape') [$w, $h] = [$h, $w];
        foreach (['widthCm' => $w, 'heightCm' => $h] as $key => $expected) {
            if (!isset($d[$key]) || !is_numeric($d[$key]) || !is_finite((float) $d[$key]) || abs((float) $d[$key] - $expected) > 0.001) {
                throw new \RuntimeException('The poster dimensions do not match the selected paper.', 400);
            }
        }
        foreach (['latitude' => 90, 'longitude' => 180] as $key => $limit) {
            if (!isset($d[$key]) || !is_numeric($d[$key]) || !is_finite((float) $d[$key]) || abs((float) $d[$key]) > $limit) throw new \RuntimeException('Invalid map coordinates.', 400);
        }
        $clean = ['schemaVersion' => 1, 'paperSize' => $d['paperSize'], 'orientation' => $d['orientation'], 'dpi' => 300,
            'widthCm' => $w, 'heightCm' => $h, 'latitude' => (float) $d['latitude'], 'longitude' => (float) $d['longitude']];
        foreach (['title', 'subtitle', 'theme'] as $key) {
            if (!is_string($d[$key] ?? null) || strlen($d[$key]) > 500) throw new \RuntimeException('Invalid poster text.', 400);
            $clean[$key] = sanitize_text_field($d[$key]);
        }
        return $clean;
    }

    public function add_to_cart(): void {
        $lock = null;
        try {
            $this->session();
            $token = isset($_POST['token']) && is_string($_POST['token']) ? wp_unslash($_POST['token']) : '';
            if (!$token || !hash_equals((string) WC()->session->get('posteroom_map_token', ''), $token)) throw new \RuntimeException('Your shop session expired. Please refresh the page.', 403);
            if (!self::settings()['enabled']) throw new \RuntimeException('Map ordering is not enabled yet.', 503);
            $request = isset($_POST['request_id']) && is_string($_POST['request_id']) ? wp_unslash($_POST['request_id']) : '';
            if (!preg_match('/^[a-f0-9-]{36}$/D', $request)) throw new \RuntimeException('Invalid design request.', 400);
            $raw = isset($_POST['design']) && is_string($_POST['design']) ? wp_unslash($_POST['design']) : '';
            if (strlen($raw) > 8000) throw new \RuntimeException('Poster details are too large.', 413);
            $design = self::validate_design(json_decode($raw, true));
            $upload = $_FILES['poster'] ?? [];
            if (($upload['error'] ?? -1) !== UPLOAD_ERR_OK || empty($upload['tmp_name']) || !is_uploaded_file($upload['tmp_name'])) throw new \RuntimeException('The PNG upload failed. Check the upload limit and try again.', 400);
            if (filesize($upload['tmp_name']) > 32 * MB_IN_BYTES) throw new \RuntimeException('The poster exceeds the 32 MB upload limit.', 413);
            $image = @getimagesize($upload['tmp_name']);
            $expected = [(int) round($design['widthCm'] / 2.54 * 300), (int) round($design['heightCm'] / 2.54 * 300)];
            if (!$image || $image[2] !== IMAGETYPE_PNG || [$image[0], $image[1]] !== $expected) throw new \RuntimeException('Upload a full-resolution PNG matching the selected paper size.', 400);
            $fingerprint = hash('sha256', wp_json_encode($design) . hash_file('sha256', $upload['tmp_name']));
            $customer = (string) WC()->session->get_customer_id();
            $lock_id = substr(hash_hmac('sha256', 'session:' . $customer, wp_salt('auth')), 0, 32);
            $lock = fopen(Storage::path($lock_id, 'lock'), 'c');
            if (!$lock || !flock($lock, LOCK_EX | LOCK_NB)) throw new \RuntimeException('Another poster is being added. Check your cart before retrying.', 409);
            // The cart may have loaded before another request released its lock.
            // Reload public WooCommerce session APIs while holding this lock.
            wp_cache_delete(\WC_Cache_Helper::get_cache_prefix(WC_SESSION_CACHE_GROUP) . $customer, WC_SESSION_CACHE_GROUP);
            $fresh = WC()->session->get_session_data();
            foreach (['cart', 'cart_totals', 'applied_coupons', 'coupon_discount_totals', 'coupon_discount_tax_totals', 'removed_cart_contents'] as $field) {
                WC()->session->set($field, isset($fresh[$field]) ? maybe_unserialize($fresh[$field]) : null);
            }
            (new \WC_Cart_Session(WC()->cart))->get_cart_from_session();
            $id = substr(hash_hmac('sha256', $customer . ':' . $request, wp_salt('auth')), 0, 32);
            $existing = Storage::manifest($id);
            if ($existing && !hash_equals($existing['fingerprint'], $fingerprint)) throw new \RuntimeException('This request belongs to a different design.', 409);
            foreach (WC()->cart->get_cart() as $key => $item) {
                if (($item['posteroom_map']['artwork'] ?? '') === $id) {
                    if (($item['posteroom_map']['fingerprint'] ?? '') !== $fingerprint) throw new \RuntimeException('This request belongs to a different design.', 409);
                    $receipt = ['cartItemKey' => $key, 'cartUrl' => wc_get_cart_url()];
                    flock($lock, LOCK_UN); fclose($lock); $lock = null;
                    wp_send_json_success($receipt);
                }
            }
            if (!empty($existing['cart_key']) || !empty($existing['ordered'])) throw new \RuntimeException('This poster was already submitted. Check your cart or create a new design.', 409);
            $p = $this->product($design['paperSize']);
            $count = count(array_filter(WC()->cart->get_cart(), static fn($item) => !empty($item['posteroom_map'])));
            if ($count >= 10) throw new \RuntimeException('Your cart already contains ten map designs. Complete the order first.', 429);
            if (!$existing) Storage::save($id, $upload, $design, $fingerprint);
            $meta = ['artwork' => $id, 'fingerprint' => $fingerprint, 'design' => $design];
            // Native variation price, stock, tax and quantity validation. No client price is used.
            $attrs = $p->get_variation_attributes();
            if (!apply_filters('woocommerce_add_to_cart_validation', true, $p->get_parent_id(), 1, $p->get_id(), $attrs, ['posteroom_map' => $meta])) throw new \RuntimeException('The shop could not accept this poster.', 409);
            $key = WC()->cart->add_to_cart($p->get_parent_id(), 1, $p->get_id(), $attrs, ['posteroom_map' => $meta]);
            if (!$key) throw new \RuntimeException('The shop could not add this poster. Check availability and try again.', 409);
            WC()->cart->calculate_totals();
            WC()->session->save_data();
            $manifest = Storage::manifest($id);
            $manifest['cart_key'] = $key;
            Storage::write_manifest($id, $manifest);
            $receipt = ['cartItemKey' => $key, 'cartUrl' => wc_get_cart_url()];
        } catch (\Throwable $e) {
            if (is_resource($lock)) { flock($lock, LOCK_UN); fclose($lock); }
            $this->fail($e);
            return;
        }
        if (is_resource($lock)) { flock($lock, LOCK_UN); fclose($lock); }
        wp_send_json_success($receipt);
    }

    public function item_data(array $data, array $item): array {
        $d = $item['posteroom_map']['design'] ?? null;
        if ($d) foreach (['Poster size' => $d['paperSize'], 'Orientation' => ucfirst($d['orientation']), 'Location' => $d['title']] as $name => $value) {
            $data[] = ['name' => $name, 'value' => esc_html($value)];
        }
        return $data;
    }
    public function check_artwork(): void {
        foreach (WC()->cart->get_cart() as $item) {
            $id = $item['posteroom_map']['artwork'] ?? '';
            if (!$id) continue;
            try { $exists = is_file(Storage::path($id, 'png')); } catch (\Throwable $e) { $exists = false; }
            if (!$exists) wc_add_notice('A map poster file has expired or is unavailable. Remove that poster and create it again before checkout.', 'error');
        }
    }
    public function cart_name($name, $item) {
        return empty($item['posteroom_map']) ? $name : esc_html('Map Poster ' . $item['posteroom_map']['design']['paperSize']);
    }
    public function name_product($item) {
        if (!empty($item['posteroom_map']) && isset($item['data'])) {
            // The same variation can also be in an AI poster cart line.
            $item['data'] = clone $item['data'];
            $item['data']->set_name('Map Poster ' . $item['posteroom_map']['design']['paperSize']);
        }
        return $item;
    }
    private function thumb(string $id): string {
        return '<img src="' . esc_url(Storage::preview_url($id)) . '" alt="Map poster" width="70" height="70" style="object-fit:contain">';
    }
    public function cart_thumbnail($html, $item) {
        return empty($item['posteroom_map']['artwork']) ? $html : $this->thumb($item['posteroom_map']['artwork']);
    }
    public function block_images($images, $item) {
        $id = $item['posteroom_map']['artwork'] ?? '';
        if (!$id) return $images;
        $url = Storage::preview_url($id);
        return [(object) ['id' => 0, 'src' => $url, 'thumbnail' => $url, 'srcset' => '', 'sizes' => '', 'name' => 'Map poster', 'alt' => 'Map poster']];
    }
    public function order_item($item, $key, $values, $order): void {
        $m = $values['posteroom_map'] ?? null;
        if (!$m) return;
        $item->set_name('Map Poster ' . $m['design']['paperSize']);
        $item->add_meta_data('_posteroom_artwork', $m['artwork'], true);
        $item->add_meta_data('_posteroom_design', $m['design'], true);
        $item->add_meta_data('Poster Size', $m['design']['paperSize'], true);
        $item->add_meta_data('Orientation', ucfirst($m['design']['orientation']), true);
        $item->add_meta_data('Location', $m['design']['title'], true);
    }
    public function retain_artwork($item_id, $item, $order_id): void {
        if (!($item instanceof \WC_Order_Item)) return;
        $id = $item->get_meta('_posteroom_artwork', true);
        if (!$id) return;
        try {
            $m = Storage::manifest($id);
            $m['ordered'] = true;
            Storage::write_manifest($id, $m);
        } catch (\Throwable $e) {
            // Do not interrupt an order already being saved. Cleanup also checks
            // order-item references before deleting unclaimed artwork.
            wc_get_logger()->error('Could not retain map artwork ' . $id, ['source' => 'posteroom-maps']);
        }
    }
    public function admin_thumbnail($html, $item_id, $item = null) {
        $id = wc_get_order_item_meta($item_id, '_posteroom_artwork', true);
        return $id ? $this->thumb($id) : $html;
    }
    public function order_preview($item_id, $item, $order, $plain_text = false): void {
        $id = $item->get_meta('_posteroom_artwork', true);
        if ($id && !$plain_text) echo $this->thumb($id);
    }
    public function admin_download($item_id, $item, $product): void {
        if (!is_admin() || !current_user_can('manage_woocommerce') || !$item->get_meta('_posteroom_artwork')) return;
        $url = wp_nonce_url(add_query_arg(['action' => 'posteroom_map_download', 'item' => $item_id], admin_url('admin-post.php')), 'posteroom_map_download_' . $item_id);
        echo '<p><a class="button" href="' . esc_url($url) . '">Download print PNG</a></p>';
    }
    public function preview(): void {
        $id = isset($_GET['artwork']) && is_string($_GET['artwork']) ? wp_unslash($_GET['artwork']) : '';
        $sig = isset($_GET['sig']) && is_string($_GET['sig']) ? wp_unslash($_GET['sig']) : '';
        if (!hash_equals(hash_hmac('sha256', 'preview:' . $id, wp_salt('auth')), $sig)) { status_header(403); exit; }
        $this->serve($id, 'jpg', false);
    }
    public function download(): void {
        if (!current_user_can('manage_woocommerce')) wp_die('Access denied.', '', ['response' => 403]);
        $item_id = absint($_GET['item'] ?? 0);
        check_admin_referer('posteroom_map_download_' . $item_id);
        $id = wc_get_order_item_meta($item_id, '_posteroom_artwork', true);
        $this->serve((string) $id, 'png', true);
    }
    private function serve(string $id, string $suffix, bool $download): void {
        try { $path = Storage::path($id, $suffix); } catch (\Throwable $e) { status_header(404); exit; }
        if (!is_file($path)) { status_header(404); exit; }
        nocache_headers();
        header('X-Content-Type-Options: nosniff');
        header('Content-Type: ' . ($suffix === 'png' ? 'image/png' : 'image/jpeg'));
        header('Content-Length: ' . filesize($path));
        if ($download) header('Content-Disposition: attachment; filename="posteroom-' . $id . '.png"');
        readfile($path);
        exit;
    }
}
