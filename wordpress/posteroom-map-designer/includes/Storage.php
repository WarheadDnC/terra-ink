<?php
namespace Posteroom\Maps;
defined('ABSPATH') || exit;

final class Storage {
    public static function root(): string {
        $settings = Plugin::settings();
        $candidate = rtrim($settings['storage'], '/\\');
        if (!$candidate || !str_starts_with($candidate, '/') || str_contains($candidate, '://')) {
            throw new \RuntimeException('Configure an absolute private artwork directory in WooCommerce → Posteroom Maps.');
        }
        $parent = realpath(dirname($candidate));
        if (!$parent || basename($candidate) === '.' || basename($candidate) === '..') {
            throw new \RuntimeException('The parent of the artwork directory must exist.');
        }
        $resolved = realpath($candidate) ?: $parent . '/' . basename($candidate);
        foreach (array_filter([realpath(ABSPATH), realpath(WP_CONTENT_DIR), realpath($_SERVER['DOCUMENT_ROOT'] ?? ABSPATH)]) as $public) {
            if ($resolved === $public || str_starts_with($resolved . '/', rtrim($public, '/') . '/')) {
                throw new \RuntimeException('The artwork directory must be outside the public web root.');
            }
        }
        if (!is_dir($resolved) && !wp_mkdir_p($resolved)) {
            throw new \RuntimeException('The private artwork directory could not be created.');
        }
        if (!is_writable($resolved)) throw new \RuntimeException('The artwork directory is not writable.');
        return $resolved;
    }

    public static function path(string $id, string $suffix): string {
        if (!preg_match('/^[a-f0-9]{32}$/D', $id) || !in_array($suffix, ['png', 'jpg', 'json', 'lock'], true)) {
            throw new \RuntimeException('Invalid artwork reference.');
        }
        return self::root() . '/' . $id . '.' . $suffix;
    }

    public static function manifest(string $id): array {
        $file = self::path($id, 'json');
        return is_file($file) ? (json_decode(file_get_contents($file), true) ?: []) : [];
    }

    public static function write_manifest(string $id, array $data): void {
        $path = self::path($id, 'json');
        $temp = $path . '.tmp-' . bin2hex(random_bytes(4));
        if (file_put_contents($temp, wp_json_encode($data), LOCK_EX) === false || !rename($temp, $path)) {
            @unlink($temp);
            throw new \RuntimeException('Artwork details could not be saved.');
        }
        @chmod($path, 0600);
    }

    public static function save(string $id, array $upload, array $design, string $fingerprint): void {
        require_once ABSPATH . 'wp-admin/includes/image.php';
        $editor = wp_get_image_editor($upload['tmp_name']);
        if (is_wp_error($editor)) throw new \RuntimeException('The server could not read this PNG.');
        $resized = $editor->resize(480, 480, false);
        if (is_wp_error($resized)) throw new \RuntimeException('The preview could not be created.');
        $editor->set_quality(80);
        $preview = $editor->save(self::path($id, 'jpg'), 'image/jpeg');
        if (is_wp_error($preview)) throw new \RuntimeException('The preview could not be saved.');
        if (!move_uploaded_file($upload['tmp_name'], self::path($id, 'png'))) {
            self::remove($id);
            throw new \RuntimeException('The print file could not be saved.');
        }
        @chmod(self::path($id, 'png'), 0600);
        @chmod(self::path($id, 'jpg'), 0600);
        try {
            self::write_manifest($id, ['created' => time(), 'ordered' => false,
                'fingerprint' => $fingerprint, 'design' => $design]);
        } catch (\Throwable $e) { self::remove($id); throw $e; }
    }

    public static function remove(string $id): void {
        foreach (['png', 'jpg', 'json'] as $suffix) {
            $path = self::path($id, $suffix);
            if (is_file($path)) @unlink($path);
        }
    }

    public static function preview_url(string $id): string {
        $sig = hash_hmac('sha256', 'preview:' . $id, wp_salt('auth'));
        return add_query_arg(['action' => 'posteroom_map_preview', 'artwork' => $id, 'sig' => $sig], admin_url('admin-ajax.php'));
    }

    public static function cleanup(): void {
        try {
            foreach (glob(self::root() . '/*.json') ?: [] as $path) {
                $id = basename($path, '.json');
                if (!preg_match('/^[a-f0-9]{32}$/D', $id)) continue;
                $data = self::manifest($id);
                if (empty($data['ordered']) && ($data['created'] ?? filemtime($path)) < time() - 7 * DAY_IN_SECONDS) {
                    global $wpdb;
                    $ordered = $wpdb->get_var($wpdb->prepare("SELECT meta_id FROM {$wpdb->prefix}woocommerce_order_itemmeta WHERE meta_key = '_posteroom_artwork' AND meta_value = %s LIMIT 1", $id));
                    if (!$ordered) self::remove($id);
                }
            }
        } catch (\Throwable $error) {
            // A missing/unmounted storage volume must never trigger cleanup elsewhere.
        }
    }
}
